/**
 * @file /api/kr-industry/usage/route.ts
 * @description 산업DB 사용 통계 API — 어떤 산업DB 추천이 실제 선택되었는지 추적
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

// GET: 산업DB 추천 사용 통계
export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'dc' | 'pc' | 'all'

    const result: Record<string, unknown> = { success: true };

    if (type === 'dc' || type === 'all') {
      // DC 산업DB 사용 통계
      const dcUsage = await prisma.riskAnalysis.groupBy({
        by: ['dcSourceId'],
        where: { dcSourceType: 'industry', dcSourceId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 50,
      });

      // sourceId로 산업DB 상세 조회
      const dcIds = dcUsage.map(u => u.dcSourceId).filter((id): id is string => !!id);
      const dcItems = dcIds.length > 0
        ? await prisma.krIndustryDetection.findMany({ where: { id: { in: dcIds } } })
        : [];
      const dcMap = new Map(dcItems.map(d => [d.id, d]));

      result.dcUsage = dcUsage.map(u => ({
        sourceId: u.dcSourceId,
        count: u._count.id,
        item: u.dcSourceId ? dcMap.get(u.dcSourceId) || null : null,
      }));
    }

    if (type === 'pc' || type === 'all') {
      // PC 산업DB 사용 통계
      const pcUsage = await prisma.riskAnalysis.groupBy({
        by: ['pcSourceId'],
        where: { pcSourceType: 'industry', pcSourceId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 50,
      });

      const pcIds = pcUsage.map(u => u.pcSourceId).filter((id): id is string => !!id);
      const pcItems = pcIds.length > 0
        ? await prisma.krIndustryPrevention.findMany({ where: { id: { in: pcIds } } })
        : [];
      const pcMap = new Map(pcItems.map(p => [p.id, p]));

      result.pcUsage = pcUsage.map(u => ({
        sourceId: u.pcSourceId,
        count: u._count.id,
        item: u.pcSourceId ? pcMap.get(u.pcSourceId) || null : null,
      }));
    }

    // 소스 타입별 전체 분포
    const sourceDistribution = await prisma.riskAnalysis.groupBy({
      by: ['dcSourceType'],
      where: { dcSourceType: { not: null } },
      _count: { id: true },
    });

    result.dcSourceDistribution = sourceDistribution.map(s => ({
      sourceType: s.dcSourceType,
      count: s._count.id,
    }));

    const pcSourceDist = await prisma.riskAnalysis.groupBy({
      by: ['pcSourceType'],
      where: { pcSourceType: { not: null } },
      _count: { id: true },
    });

    result.pcSourceDistribution = pcSourceDist.map(s => ({
      sourceType: s.pcSourceType,
      count: s._count.id,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[KrIndustry Usage API] 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
