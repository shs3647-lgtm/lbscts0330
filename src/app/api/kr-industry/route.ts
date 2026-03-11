/**
 * @file route.ts
 * @description 한국 제조업 산업 공통 DB 조회 API
 * - GET /api/kr-industry?type=detection → KrIndustryDetection 전체
 * - GET /api/kr-industry?type=prevention → KrIndustryPrevention 전체
 * - GET /api/kr-industry?type=all → 둘 다 (기본)
 *
 * 자동추천 훅(useAutoRecommendDC/PC)에서 호출하여
 * 마스터 A6/B5 후보에 한국산업 DB 데이터를 병합
 *
 * @version 1.0.0
 * @created 2026-02-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// 캐시 — 산업 DB는 프로젝트 무관 참조 데이터이므로 1시간 캐시
const CACHE_SECONDS = 3600;

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 실패', detection: [], prevention: [] },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    let detection: any[] = [];
    let prevention: any[] = [];

    if (type === 'detection' || type === 'all') {
      detection = await prisma.krIndustryDetection.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          category: true,
          fmKeyword: true,
          method: true,
          methodType: true,
          description: true,
          sortOrder: true,
        },
      });
    }

    if (type === 'prevention' || type === 'all') {
      prevention = await prisma.krIndustryPrevention.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          category: true,
          fcKeyword: true,
          method: true,
          m4Category: true,
          description: true,
          sortOrder: true,
        },
      });
    }

    const res = NextResponse.json({
      success: true,
      detection,
      prevention,
      count: { detection: detection.length, prevention: prevention.length },
    });

    // 참조 데이터 캐시
    res.headers.set('Cache-Control', `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=60`);

    return res;
  } catch (error) {
    console.error('[kr-industry API] 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '조회 실패', detection: [], prevention: [] },
      { status: 200 }
    );
  }
}
