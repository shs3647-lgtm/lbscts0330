/**
 * @file reverse-import/verify/route.ts
 * 역설계 Import 검증 API — 멱등성 + 원본↔대상 비교 + FK 무결성
 * 설계서: docs/REVERSE_ENGINEERING_IMPORT_SYSTEM.md §9
 *
 * POST /api/fmea/reverse-import/verify
 * Body: { sourceFmeaId, targetFmeaId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId } from '@/lib/security';
import { assertFmeaId, getIsolatedPrisma } from '@/lib/fmea-core/guards';
import {
  compareAtomicDBCounts,
  compareAtomicDBIds,
  verifyFKIntegrity,
} from '@/lib/fmea-core/compare-atomic';
import { reverseExtract } from '@/lib/fmea-core/reverse-extract';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceFmeaId, targetFmeaId } = body;

    assertFmeaId(sourceFmeaId);
    assertFmeaId(targetFmeaId);

    console.warn(`[reverse-verify] 검증 시작: source=${sourceFmeaId} target=${targetFmeaId}`);

    const sourcePrisma = await getIsolatedPrisma(sourceFmeaId);
    const targetPrisma = await getIsolatedPrisma(targetFmeaId);

    const sourceData = await reverseExtract(sourcePrisma, sourceFmeaId);
    const targetData = await reverseExtract(targetPrisma, targetFmeaId);

    // V04: 원본↔대상 수량 일치
    const counts = compareAtomicDBCounts(sourceData, targetData);

    // UUID 일치 검증
    const ids = compareAtomicDBIds(sourceData, targetData);

    // V02: FK 참조 무결성 (대상)
    const targetFk = verifyFKIntegrity(targetData);

    // V01: fmeaId 일치 검증 (대상의 모든 레코드가 targetFmeaId를 가지는지)
    const fmeaIdCheck = {
      allMatch: true,
      tables: [] as { table: string; total: number; mismatch: number }[],
    };
    const tables: [string, any[]][] = [
      ['L2Structure', targetData.l2Structures],
      ['L3Structure', targetData.l3Structures],
      ['L1Function', targetData.l1Functions],
      ['L2Function', targetData.l2Functions],
      ['L3Function', targetData.l3Functions],
      ['FailureEffect', targetData.failureEffects],
      ['FailureMode', targetData.failureModes],
      ['FailureCause', targetData.failureCauses],
      ['FailureLink', targetData.failureLinks],
      ['RiskAnalysis', targetData.riskAnalyses],
    ];
    for (const [name, records] of tables) {
      const mismatch = records.filter((r: any) => r.fmeaId !== targetFmeaId).length;
      if (mismatch > 0) fmeaIdCheck.allMatch = false;
      fmeaIdCheck.tables.push({ table: name, total: records.length, mismatch });
    }

    // V03: 멱등성 (대상 데이터 2회 로드 비교)
    const targetData2 = await reverseExtract(targetPrisma, targetFmeaId);
    const idempotency = compareAtomicDBCounts(targetData, targetData2);

    const allGreen = counts.allMatch && ids.allMatch && targetFk.allMatch
      && fmeaIdCheck.allMatch && idempotency.allMatch;

    return NextResponse.json({
      success: true,
      allGreen,
      sourceFmeaId,
      targetFmeaId,
      V01_fmeaId: fmeaIdCheck,
      V02_fkIntegrity: targetFk,
      V03_idempotency: idempotency,
      V04_counts: counts,
      V05_ids: ids,
    });
  } catch (e: any) {
    console.error('[reverse-verify] 오류:', e);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(e) },
      { status: 500 }
    );
  }
}
