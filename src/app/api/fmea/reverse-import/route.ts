/**
 * @file reverse-import/route.ts
 * 역설계 Import 시스템 — Atomic DB 기반 FMEA 복제
 * 설계서: docs/# 역설계 기반 FMEA Import 시스템 설계서.md
 *
 * 워크시트: Atomic DB → atomicToLegacy() → 렌더링
 * 파이프라인 검증: Legacy(fmea_legacy_data)도 필요 → syncAtomicToLegacy() 포함
 *
 * POST /api/fmea/reverse-import
 * Body: { sourceFmeaId, targetFmeaId, options? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertFmeaId, getIsolatedPrisma } from '@/lib/fmea-core/guards';
import { reverseExtract } from '@/lib/fmea-core/reverse-extract';
import { remapFmeaId } from '@/lib/fmea-core/remap-fmeaid';
import { saveAtomicDBInTransaction, syncAtomicToLegacy } from '@/lib/fmea-core/save-atomic';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceFmeaId, targetFmeaId, options } = body;

    assertFmeaId(sourceFmeaId);
    assertFmeaId(targetFmeaId);

    if (sourceFmeaId === targetFmeaId) {
      return NextResponse.json(
        { ok: false, error: 'sourceFmeaId와 targetFmeaId가 동일합니다' },
        { status: 400 }
      );
    }

    console.info(`[reverse-import] 시작: ${sourceFmeaId} → ${targetFmeaId}`);

    // STEP 1~3: 원본 Atomic DB 전체 로드 + Guard 검증
    const sourcePrisma = await getIsolatedPrisma(sourceFmeaId);
    const sourceData = await reverseExtract(sourcePrisma, sourceFmeaId);

    console.info(`[reverse-import] 원본 로드: L2=${sourceData.l2Structures.length} L3=${sourceData.l3Structures.length} FM=${sourceData.failureModes.length} FC=${sourceData.failureCauses.length} FL=${sourceData.failureLinks.length}`);

    // STEP 4: fmeaId 리매핑 (메모리 내, UUID 보존)
    const targetData = remapFmeaId(sourceData, targetFmeaId);

    // STEP 5: 대상 스키마에 원자적 저장 (DELETE ALL → CREATE ALL)
    const targetPrisma = await getIsolatedPrisma(targetFmeaId);
    const { counts } = await saveAtomicDBInTransaction(
      targetPrisma,
      targetData,
      options || {}
    );

    // STEP 6: Atomic → Legacy 동기화 (pipeline-verify + WS 폴백 호환)
    await syncAtomicToLegacy(targetPrisma, targetFmeaId);
    console.info(`[reverse-import] Legacy 동기화 완료: ${targetFmeaId}`);

    return NextResponse.json({
      ok: true,
      sourceFmeaId,
      targetFmeaId,
      extracted: {
        l1Structure: counts.l1Structure || 0,
        l2Structures: counts.l2Structures || 0,
        l3Structures: counts.l3Structures || 0,
        l1Functions: sourceData.l1Functions.length,
        l2Functions: sourceData.l2Functions.length,
        l3Functions: counts.l3Functions || 0,
        processProductChars: counts.processProductChars || 0,
        failureEffects: counts.failureEffects || 0,
        failureModes: counts.failureModes || 0,
        failureCauses: counts.failureCauses || 0,
        failureLinks: counts.failureLinks || 0,
        riskAnalyses: counts.riskAnalyses || 0,
        optimizations: counts.optimizations || 0,
      },
    });
  } catch (e: unknown) {
    console.error('[reverse-import] 오류:', e);
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(e) },
      { status: 500 }
    );
  }
}
