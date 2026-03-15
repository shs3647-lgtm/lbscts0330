/**
 * FMEA 대시보드 통계 API
 * GET /api/fmea/dashboard-stats
 *
 * 홈 화면 FMEA Dashboard 프리뷰에서 사용
 * - 활성 프로젝트 수 (PFMEA M/F/P)
 * - 모듈별 연동 현황 (CP, PFD 등)
 */
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: true, source: 'empty', stats: emptyStats() });
    }

    // 활성 FMEA 프로젝트 조회
    const projects = await prisma.fmeaProject.findMany({
      where: { deletedAt: null },
      select: { fmeaId: true, fmeaType: true, status: true },
    });

    const pfmeaM = projects.filter(p => p.fmeaType === 'M').length;
    const pfmeaF = projects.filter(p => p.fmeaType === 'F').length;
    const pfmeaP = projects.filter(p => p.fmeaType === 'P').length;
    const total = projects.length;

    // BD(기초정보) 데이터셋 수
    let bdCount = 0;
    try {
      bdCount = await prisma.pfmeaMasterDataset.count();
    } catch { /* 테이블 없으면 0 */ }

    // 연동 현황 (CP, PFD)
    let cpCount = 0;
    let pfdCount = 0;
    try {
      const linkages = await prisma.projectLinkage.findMany({
        where: { status: 'active' },
        select: { cpNo: true, pfdNo: true },
      });
      cpCount = linkages.filter(l => l.cpNo).length;
      pfdCount = linkages.filter(l => l.pfdNo).length;
    } catch { /* 테이블 없으면 0 */ }

    return NextResponse.json({
      success: true,
      source: 'db',
      stats: {
        total,
        pfmea: { master: pfmeaM, family: pfmeaF, part: pfmeaP },
        bd: bdCount,
        linked: { cp: cpCount, pfd: pfdCount },
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[dashboard-stats] Error:', msg);
    return NextResponse.json({ success: true, source: 'error', stats: emptyStats() });
  }
}

function emptyStats() {
  return {
    total: 0,
    pfmea: { master: 0, family: 0, part: 0 },
    bd: 0,
    linked: { cp: 0, pfd: 0 },
  };
}
