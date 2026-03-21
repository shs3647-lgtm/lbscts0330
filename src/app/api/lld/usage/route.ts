/**
 * @file /api/lld/usage/route.ts
 * @description LLD 사용 현황 조회 API — 어떤 FMEA에서 이 LLD를 사용했는지 역추적
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

// GET: LLD 사용 현황 조회
export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const lldNo = searchParams.get('lldNo');

    if (lldNo) {
      // 특정 LLD의 사용 현황
      const risks = await prisma.riskAnalysis.findMany({
        where: { lldReference: lldNo },
        select: {
          id: true,
          fmeaId: true,
          linkId: true,
          severity: true,
          occurrence: true,
          detection: true,
          preventionControl: true,
          detectionControl: true,
        },
      });

      const lld = await prisma.lLDFilterCode.findUnique({ where: { lldNo } });

      return NextResponse.json({
        success: true,
        lldNo,
        lld: lld ? { id: lld.id, classification: lld.classification, fmeaId: lld.fmeaId, appliedDate: lld.appliedDate } : null,
        usedInRiskAnalyses: risks.length,
        risks,
      });
    }

    // 전체 LLD 사용 통계
    const applied = await prisma.lLDFilterCode.findMany({
      where: { fmeaId: { not: null } },
      select: { lldNo: true, fmeaId: true, appliedDate: true, classification: true },
      orderBy: { appliedDate: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      totalApplied: applied.length,
      items: applied,
    });
  } catch (error) {
    console.error('[LLD Usage API] 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
