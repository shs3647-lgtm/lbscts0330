/**
 * @file import-to-raw/route.ts
 * @description JSON 형태의 PositionBasedJSON (5시트 데이터)를 받아 파싱 + 품질 체크만 (DB 저장 없음)
 *
 * POST /api/fmea/import-to-raw
 * Body: { fmeaId: string, json: PositionBasedJSON }
 * Returns: { success, fmeaId, stats, quality: RawQualityResult }
 *
 * @version 1.0.0
 * @created 2026-03-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { parsePositionBasedJSON } from '@/lib/fmea/position-parser';
import { validateFKChain } from '@/lib/fmea-core/fk-chain-validator';
import { checkRawQuality } from '@/lib/fmea-core/raw-quality-checker';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId, json } = body as { fmeaId: string; json: unknown };

    // 1. fmeaId 검증
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    // 2. json 파라미터 필수 검증
    if (!json || typeof json !== 'object') {
      return NextResponse.json({ success: false, error: 'json parameter required (PositionBasedJSON)' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();

    // 2. parsePositionBasedJSON 호출
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const atomicData = parsePositionBasedJSON(json as any);

    // 3. validateFKChain 호출
    const report = validateFKChain(atomicData);

    // 4. checkRawQuality 호출
    const qualityResult = checkRawQuality(atomicData, report);

    console.log(`[import-to-raw] fmeaId=${normalizedId} quality=${qualityResult.status} FL=${atomicData.failureLinks.length}`);

    // 5. 응답 (atomicData 전체는 크므로 stats만)
    return NextResponse.json({
      success: true,
      fmeaId: normalizedId,
      stats: atomicData.stats,
      quality: qualityResult,
    });

  } catch (err) {
    console.error('[import-to-raw] Error:', err);
    return NextResponse.json({ success: false, error: safeErrorMessage(err) }, { status: 500 });
  }
}
