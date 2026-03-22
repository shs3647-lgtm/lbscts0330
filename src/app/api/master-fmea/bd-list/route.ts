/**
 * @file bd-list/route.ts
 * BD 현황 패널에서 Master FMEA 목록 조회.
 * MasterFmea + FamilyMaster + MasterFmeaProcess 카운트를 반환.
 *
 * GET → { success: true, masters: [...] }
 *
 * 조회 우선순위:
 *   1순위: MasterFmea → FamilyMaster.fmeaId (체인이 유효한 경우)
 *   2순위: pfmeaMasterDataset fmeaType='M' fallback
 *          (MasterFmea에 FamilyMaster.fmeaId가 없을 때)
 *
 * ★ pfmeaMasterDataset 보유 여부로 필터하지 않음
 *    → fmeaId가 있으면 반환 (BD 없으면 "해당 BD에 데이터가 없습니다" alert이 올바른 안내)
 *    → fmeaId가 null이면 fallback으로 pfmeaMasterDataset fmeaType='M' 검색
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
    const masterFmeas = await (prisma as any).masterFmea.findMany({
      where: { status: 'ACTIVE' },
      include: {
        familyMaster: true,
        processes: {
          where: { isActive: true },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ★ 1순위: FamilyMaster.fmeaId가 있는 Master → fmeaId null 제외만 수행
    //   (pfmeaMasterDataset 보유 여부는 체크하지 않음 — BD 없으면 "데이터 없음" alert이 정확한 안내)
    const mastersFromLink = masterFmeas
      .filter((mf: any) => mf.familyMaster?.fmeaId)
      .map((mf: any) => ({
        id: mf.id,
        fmeaId: mf.familyMaster.fmeaId as string,
        code: mf.code,
        name: mf.name,
        productName: mf.productName ?? null,
        processCount: mf.processes?.length ?? 0,
        version: mf.version,
        fmeaType: 'M',
        familyMasterCode: mf.familyMaster?.code ?? null,
        familyMasterName: mf.familyMaster?.name ?? null,
        status: mf.status,
      }));

    if (mastersFromLink.length > 0) {
      return NextResponse.json({ success: true, masters: mastersFromLink });
    }

    // ★ 2순위 fallback: FamilyMaster 체인이 없는 경우
    //   pfmeaMasterDataset에서 fmeaType='M' 항목 직접 검색
    const mDatasets = await prisma.pfmeaMasterDataset.findMany({
      where: { fmeaType: 'M', isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const mastersFromDataset = mDatasets.map((ds: any) => ({
      id: ds.id,
      fmeaId: ds.fmeaId,
      code: ds.fmeaId,
      name: ds.name || ds.fmeaId,
      productName: null,
      processCount: 0,
      version: String(ds.version ?? 1),
      fmeaType: 'M',
      familyMasterCode: null,
      familyMasterName: null,
      status: 'ACTIVE',
    }));

    return NextResponse.json({ success: true, masters: mastersFromDataset });
  } catch (error) {
    console.error('[bd-list] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
