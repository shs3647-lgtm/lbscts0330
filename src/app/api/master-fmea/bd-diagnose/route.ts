/**
 * @file bd-diagnose/route.ts
 * @description Master FMEA BD 진단 API — 왜 "해당 BD에 데이터가 없습니다" 나오는지 진단
 *
 * GET /api/master-fmea/bd-diagnose
 * → MasterFmea, FamilyMaster, pfmeaMasterDataset 현황 전체 반환
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: 'DB 연결 실패' }, { status: 500 });

  try {
    // 1. MasterFmea 전체
    const masterFmeas = await (prisma as any).masterFmea.findMany({
      where: { status: 'ACTIVE' },
      include: { familyMaster: true },
      orderBy: { createdAt: 'desc' },
    });

    // 2. pfmeaMasterDataset 전체 (아이템 수 포함)
    const datasets = await prisma.pfmeaMasterDataset.findMany({
      include: { _count: { select: { flatItems: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const report = {
      masterFmeas: masterFmeas.map((mf: any) => ({
        id: mf.id,
        code: mf.code,
        name: mf.name,
        status: mf.status,
        familyMaster: mf.familyMaster ? {
          code: mf.familyMaster.code,
          fmeaId: mf.familyMaster.fmeaId,  // ← BD 조회에 사용되는 fmeaId
        } : null,
      })),
      pfmeaMasterDatasets: (datasets as any[]).map((ds) => ({
        fmeaId: ds.fmeaId,
        fmeaType: ds.fmeaType,
        name: ds.name,
        isActive: ds.isActive,
        version: ds.version,
        flatItemCount: ds._count.flatItems,  // ← 0이면 BD 데이터 없음
      })),
      // 교차 분석
      crossCheck: masterFmeas.map((mf: any) => {
        const fid = mf.familyMaster?.fmeaId;
        const matched = fid
          ? (datasets as any[]).find((ds) => ds.fmeaId.toLowerCase() === fid.toLowerCase())
          : null;
        return {
          masterCode: mf.code,
          masterName: mf.name,
          familyMasterFmeaId: fid ?? '(없음)',
          datasetExists: !!matched,
          datasetItemCount: matched?._count?.flatItems ?? 0,
          canLoad: matched && matched._count.flatItems > 0,
        };
      }),
    };

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('[bd-diagnose] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
