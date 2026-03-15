/**
 * @file /api/severity-recommend/route.ts
 * @description 심각도 추천 + 사용 기록 API — 개선루프
 *
 * 비유: 의사의 진단 기록처럼, "이전에 비슷한 증상(고장영향)에 이 처방(심각도)을
 * 내렸다"면 새 환자에게도 동일 처방을 추천하는 시스템.
 *
 * GET: FE 텍스트 기반 심각도 추천 (유사 FE → 이전 사용 S값 반환)
 * POST: 사용 기록 저장/업데이트 (워크시트에서 S값 설정 시 호출)
 * PUT: 일괄 기록 (Import 후 전체 FE-S 쌍 일괄 저장)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// GET: FE 텍스트 기반 심각도 추천
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const feText = searchParams.get('feText') || '';
    const processName = searchParams.get('processName') || '';
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    if (!feText && !processName) {
      // 키워드 없으면 가장 많이 사용된 FE-S 쌍 반환
      const topUsed = await prisma.severityUsageRecord.findMany({
        where: { usageCount: { gt: 1 } },
        orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }],
        take: limit,
      });
      return NextResponse.json({ success: true, data: topUsed, type: 'top-used', count: topUsed.length });
    }

    // FE 텍스트 유사 매칭 (contains, case-insensitive)
    const orConditions: Record<string, unknown>[] = [];
    if (feText) {
      orConditions.push({ feText: { contains: feText, mode: 'insensitive' } });
      // 핵심 키워드 분리 매칭 (3글자 이상 토큰)
      const tokens = feText.split(/[\s,./()]+/).filter(t => t.length >= 3);
      for (const token of tokens.slice(0, 5)) {
        orConditions.push({ feText: { contains: token, mode: 'insensitive' } });
      }
    }
    if (processName) {
      orConditions.push({ processName: { contains: processName, mode: 'insensitive' } });
    }

    const recommendations = await prisma.severityUsageRecord.findMany({
      where: { OR: orConditions },
      orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }],
      take: limit,
    });

    // 완전 일치 우선, 부분 일치 후순위 정렬
    const sorted = recommendations.sort((a, b) => {
      const aExact = a.feText.toLowerCase() === feText.toLowerCase() ? 1 : 0;
      const bExact = b.feText.toLowerCase() === feText.toLowerCase() ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return b.usageCount - a.usageCount;
    });

    return NextResponse.json({
      success: true,
      data: sorted,
      type: 'matched',
      count: sorted.length,
      query: { feText, processName },
    });
  } catch (error) {
    console.error('[severity-recommend] GET error:', error);
    return NextResponse.json({ success: false, error: '심각도 추천 조회 실패' }, { status: 500 });
  }
}

// POST: 단일 사용 기록 저장/업데이트
export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const body = await req.json();
    const { feText, severity, feCategory, processName, productChar, fmeaId } = body;

    if (!feText || !severity || severity < 1 || severity > 10) {
      return NextResponse.json({ success: false, error: 'feText + severity(1-10) 필수' }, { status: 400 });
    }

    // upsert: 같은 FE+S 조합이면 usageCount 증가, 없으면 생성
    const record = await prisma.severityUsageRecord.upsert({
      where: { feText_severity: { feText, severity } },
      update: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
        ...(feCategory && { feCategory }),
        ...(processName && { processName }),
        ...(productChar && { productChar }),
        ...(fmeaId && { sourceFmeaId: fmeaId }),
      },
      create: {
        feText,
        severity,
        feCategory: feCategory || '',
        processName: processName || '',
        productChar: productChar || '',
        sourceFmeaId: fmeaId || null,
        usageCount: 1,
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('[severity-recommend] POST error:', error);
    return NextResponse.json({ success: false, error: '심각도 기록 실패' }, { status: 500 });
  }
}

// PUT: 일괄 기록 (Import 후 전체 FE-S 쌍 저장)
export async function PUT(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const body = await req.json();
    const { records, fmeaId } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ success: false, error: 'records 배열 필수' }, { status: 400 });
    }

    let saved = 0;
    let skipped = 0;

    for (const rec of records) {
      const { feText, severity, feCategory, processName, productChar } = rec;
      if (!feText || !severity || severity < 1 || severity > 10) { skipped++; continue; }

      await prisma.severityUsageRecord.upsert({
        where: { feText_severity: { feText, severity } },
        update: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
          ...(feCategory && { feCategory }),
          ...(processName && { processName }),
          ...(productChar && { productChar }),
          ...(fmeaId && { sourceFmeaId: fmeaId }),
        },
        create: {
          feText,
          severity,
          feCategory: feCategory || '',
          processName: processName || '',
          productChar: productChar || '',
          sourceFmeaId: fmeaId || null,
        },
      });
      saved++;
    }

    return NextResponse.json({ success: true, saved, skipped, total: records.length });
  } catch (error) {
    console.error('[severity-recommend] PUT error:', error);
    return NextResponse.json({ success: false, error: '심각도 일괄 기록 실패' }, { status: 500 });
  }
}
