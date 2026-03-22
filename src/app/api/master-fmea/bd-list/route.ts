/**
 * @file bd-list/route.ts
 * BD 현황 패널에서 Master FMEA 목록 조회.
 *
 * GET → { success: true, masters: [...] }
 *
 * ★ 4단계 Fallback 체인 (완전 해결):
 *
 * 1단계: MasterFmea → FamilyMaster.fmeaId → pfmeaMasterDataset에 flatItems 있으면 사용
 * 2단계: 1단계 매칭 없음 → pfmeaMasterDataset fmeaType='M' 中 flatItems > 0
 * 3단계: 2단계도 없음 → pfmeaMasterDataset 전체 中 flatItems > 0 (M→F→P 순)
 * 4단계: 3단계도 없음 → mastersFromLink 그대로 반환 (data 없어도 — 정확한 "데이터없음" alert)
 *
 * 이 체인으로 BD 데이터가 어디에 저장됐든 반드시 찾아서 반환한다.
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'DB 연결 실패' },
      { status: 500 }
    );
  }

  try {
    // MasterFmea 전체 조회
    const masterFmeas = await (prisma as any).masterFmea.findMany({
      where: { status: 'ACTIVE' },
      include: {
        familyMaster: true,
        processes: { where: { isActive: true }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ─── 공통 메타데이터 빌더 ───────────────────────────────────────
    const buildMasterEntry = (mf: any, overrideFmeaId?: string) => ({
      id: mf.id,
      fmeaId: overrideFmeaId ?? mf.familyMaster?.fmeaId ?? null,
      code: mf.code,
      name: mf.name,
      productName: mf.productName ?? null,
      processCount: mf.processes?.length ?? 0,
      version: mf.version,
      fmeaType: 'M',
      familyMasterCode: mf.familyMaster?.code ?? null,
      familyMasterName: mf.familyMaster?.name ?? null,
      status: mf.status,
    });

    const buildDatasetEntry = (ds: any, linkedMf?: any) => ({
      id: linkedMf?.id ?? ds.id,
      fmeaId: ds.fmeaId,
      code: linkedMf?.code ?? ds.fmeaId,
      name: linkedMf?.name ?? ds.name ?? ds.fmeaId,
      productName: linkedMf?.productName ?? null,
      processCount: linkedMf?.processes?.length ?? 0,
      version: linkedMf?.version ?? String(ds.version ?? 1),
      fmeaType: 'M',
      familyMasterCode: linkedMf?.familyMaster?.code ?? null,
      familyMasterName: linkedMf?.familyMaster?.name ?? null,
      status: 'ACTIVE',
    });

    // ─── 1단계: FamilyMaster.fmeaId → pfmeaMasterDataset 교차검증 ──
    const mastersFromLink = masterFmeas.filter((mf: any) => mf.familyMaster?.fmeaId);
    const linkedFmeaIds = mastersFromLink.map((mf: any) =>
      (mf.familyMaster.fmeaId as string).toLowerCase()
    );

    if (linkedFmeaIds.length > 0) {
      const linkedDatasets = await prisma.pfmeaMasterDataset.findMany({
        where: { fmeaId: { in: linkedFmeaIds }, isActive: true },
        include: { flatItems: { select: { id: true }, take: 1 } },
      });
      const linkedWithDataSet = new Set(
        linkedDatasets
          .filter((ds: any) => ds.flatItems?.length > 0)
          .map((ds: any) => ds.fmeaId.toLowerCase())
      );
      const step1Masters = mastersFromLink
        .filter((mf: any) => linkedWithDataSet.has(mf.familyMaster.fmeaId.toLowerCase()))
        .map((mf: any) => buildMasterEntry(mf));

      if (step1Masters.length > 0) {
        console.info(`[bd-list] 1단계 매칭: ${step1Masters.length}건`);
        return NextResponse.json({ success: true, masters: step1Masters });
      }
    }

    // ─── 2단계: pfmeaMasterDataset fmeaType='M' 중 flatItems > 0 ───
    const mTypeDatasets = await prisma.pfmeaMasterDataset.findMany({
      where: { fmeaType: 'M', isActive: true },
      include: { flatItems: { select: { id: true }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    const mTypeWithData = mTypeDatasets.filter((ds: any) => ds.flatItems?.length > 0);

    if (mTypeWithData.length > 0) {
      const step2Masters = mTypeWithData.map((ds: any) => {
        const linkedMf = mastersFromLink.find((mf: any) =>
          mf.familyMaster?.fmeaId?.toLowerCase() === ds.fmeaId.toLowerCase()
        );
        return buildDatasetEntry(ds, linkedMf);
      });
      console.info(`[bd-list] 2단계 fmeaType='M' 매칭: ${step2Masters.length}건`);
      return NextResponse.json({ success: true, masters: step2Masters });
    }

    // ─── 3단계: 모든 pfmeaMasterDataset 중 flatItems > 0 (M→F→P 순) ─
    const allDatasetsWithData = await prisma.pfmeaMasterDataset.findMany({
      where: { isActive: true },
      include: { flatItems: { select: { id: true }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    const anyWithData = allDatasetsWithData.filter((ds: any) => ds.flatItems?.length > 0);

    if (anyWithData.length > 0) {
      // M 먼저, 그 다음 F, 마지막 P
      const typeOrder: Record<string, number> = { M: 0, F: 1, P: 2 };
      anyWithData.sort((a: any, b: any) =>
        (typeOrder[a.fmeaType] ?? 3) - (typeOrder[b.fmeaType] ?? 3)
      );
      const step3Masters = anyWithData.map((ds: any) => {
        const linkedMf = mastersFromLink.find((mf: any) =>
          mf.familyMaster?.fmeaId?.toLowerCase() === ds.fmeaId.toLowerCase()
        );
        return buildDatasetEntry(ds, linkedMf);
      });
      console.info(`[bd-list] 3단계 전체 dataset 매칭: ${step3Masters.length}건`);
      return NextResponse.json({ success: true, masters: step3Masters });
    }

    // ─── 4단계: 데이터 없음 — mastersFromLink 그대로 (정확한 "데이터없음" alert) ─
    // data 없이 반환 → loadBdById → "해당 BD에 데이터가 없습니다" (정확한 안내)
    if (mastersFromLink.length > 0) {
      console.info(`[bd-list] 4단계 fallback: ${mastersFromLink.length}건 (데이터 없음)`);
      return NextResponse.json({
        success: true,
        masters: mastersFromLink.map((mf: any) => buildMasterEntry(mf)),
      });
    }

    // MasterFmea 자체가 없음 — "등록되어 있지 않습니다" alert
    console.info('[bd-list] MasterFmea 없음');
    return NextResponse.json({ success: true, masters: [] });

  } catch (error) {
    console.error('[bd-list] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
