/**
 * @file /api/special-char/recommend/route.ts
 * @description 특별특성 추천 API — 이전 프로젝트 사용 이력 기반
 *
 * 비유: 음악 추천 시스템처럼, "이전에 이 제품특성에 SC를 적용한 적이 있다"면
 * 새 프로젝트에서도 동일 특성에 SC를 추천하는 개선 루프.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// GET: 제품특성/공정특성/고장형태 기반 추천
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const productChar = searchParams.get('productChar') || '';
    const processChar = searchParams.get('processChar') || '';
    const failureMode = searchParams.get('failureMode') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // 조건 구성: OR 검색 (하나라도 매칭되면 추천)
    const orConditions: Record<string, unknown>[] = [];
    if (productChar) orConditions.push({ productChar: { contains: productChar, mode: 'insensitive' } });
    if (processChar) orConditions.push({ processChar: { contains: processChar, mode: 'insensitive' } });
    if (failureMode) orConditions.push({ failureMode: { contains: failureMode, mode: 'insensitive' } });

    if (orConditions.length === 0) {
      // 키워드 없으면 가장 많이 사용된 항목 반환
      const topUsed = await prisma.specialCharMasterItem.findMany({
        where: { usageCount: { gt: 0 } },
        orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }],
        take: limit,
      });
      return NextResponse.json({
        success: true,
        data: topUsed,
        type: 'top-used',
        count: topUsed.length,
      });
    }

    const recommendations = await prisma.specialCharMasterItem.findMany({
      where: { OR: orConditions },
      orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }],
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: recommendations,
      type: 'matched',
      count: recommendations.length,
      query: { productChar, processChar, failureMode },
    });
  } catch (error) {
    console.error('[special-char/recommend] GET error:', error);
    return NextResponse.json({ success: false, error: '추천 조회 실패' }, { status: 500 });
  }
}

// POST: 사용 기록 업데이트 (워크시트에서 SC 적용 시 호출)
export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const body = await req.json();
    const { id, productChar, processChar, failureMode, fmeaId } = body;

    if (id) {
      // 기존 항목 사용횟수 증가
      const updated = await prisma.specialCharMasterItem.update({
        where: { id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
          ...(fmeaId && { sourceFmeaId: fmeaId }),
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // ID 없이 특성명으로 매칭 → 사용횟수 증가
    if (productChar || processChar) {
      const where: Record<string, unknown> = {};
      if (productChar) where.productChar = productChar;
      if (processChar) where.processChar = processChar;
      if (failureMode) where.failureMode = failureMode;

      const matched = await prisma.specialCharMasterItem.findFirst({ where });
      if (matched) {
        const updated = await prisma.specialCharMasterItem.update({
          where: { id: matched.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });
        return NextResponse.json({ success: true, data: updated, matched: true });
      }
    }

    return NextResponse.json({ success: true, matched: false, message: '매칭 항목 없음' });
  } catch (error) {
    console.error('[special-char/recommend] POST error:', error);
    return NextResponse.json({ success: false, error: '사용 기록 업데이트 실패' }, { status: 500 });
  }
}
