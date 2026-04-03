/**
 * @file create-with-import/route.ts
 * 프로젝트 등록 + 역설계 Import + Legacy 동기화 + 검증 — 원스텝 API
 *
 * POST /api/fmea/create-with-import
 * Body: {
 *   targetFmeaId: string,       // 신규 프로젝트 fmeaId (예: pfm26-m080)
 *   sourceFmeaId: string,       // 원본 FMEA (예: pfm26-m002)
 *   fmeaType?: 'M'|'F'|'P',
 *   project?: { projectName, customer, productName },
 *   fmeaInfo?: object,
 *   options?: { copyDCPC, copySOD, copyOptimization }
 * }
 *
 * 실행 순서:
 *   1. targetFmeaId 프로젝트 등록 (fmea_projects upsert)
 *   2. sourceFmeaId에서 Atomic DB 전체 추출 (Guard 검증 포함)
 *   3. fmeaId 리매핑 (UUID 보존)
 *   4. 대상 스키마에 원자적 저장 ($transaction)
 *   5. 수량 검증 (V04 counts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertFmeaId, getIsolatedPrisma } from '@/lib/fmea-core/guards';
import { reverseExtract } from '@/lib/fmea-core/reverse-extract';
import { remapFmeaId } from '@/lib/fmea-core/remap-fmeaid';
import { saveAtomicDBInTransaction } from '@/lib/fmea-core/save-atomic';
import { compareAtomicDBCounts } from '@/lib/fmea-core/compare-atomic';
import { createOrUpdateProject } from '@/lib/services/fmea-project-service';
import { safeErrorMessage, isValidFmeaId } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const startMs = Date.now();

  try {
    const body = await req.json();
    const {
      targetFmeaId,
      sourceFmeaId,
      fmeaType = 'P',
      project,
      fmeaInfo,
      options = {},
    } = body;

    // ── Guard ──
    assertFmeaId(sourceFmeaId);
    assertFmeaId(targetFmeaId);

    if (sourceFmeaId === targetFmeaId) {
      return NextResponse.json(
        { success: false, error: 'sourceFmeaId와 targetFmeaId가 동일합니다' },
        { status: 400 }
      );
    }

    console.warn(`[create-with-import] ${sourceFmeaId} → ${targetFmeaId}`);

    // ── STEP 1: 프로젝트 등록 ──
    await createOrUpdateProject({
      fmeaId: targetFmeaId,
      fmeaType,
      project,
      fmeaInfo,
      parentFmeaId: sourceFmeaId,
      parentFmeaType: fmeaType,
    });
    console.warn(`[create-with-import] 프로젝트 등록 완료: ${targetFmeaId}`);

    // ── STEP 2: 원본 Atomic DB 추출 + Guard 검증 ──
    const sourcePrisma = await getIsolatedPrisma(sourceFmeaId);
    const sourceData = await reverseExtract(sourcePrisma, sourceFmeaId);

    // ── STEP 3: fmeaId 리매핑 (UUID 보존) ──
    const targetData = remapFmeaId(sourceData, targetFmeaId);

    // ── STEP 4: 원자적 저장 (DELETE ALL → CREATE ALL) ──
    const targetPrisma = await getIsolatedPrisma(targetFmeaId);
    const { counts } = await saveAtomicDBInTransaction(
      targetPrisma,
      targetData,
      {
        copyDCPC: options.copyDCPC ?? true,
        copySOD: options.copySOD ?? false,
        copyOptimization: options.copyOptimization ?? false,
      }
    );

    // ── STEP 5: 검증 (수량 비교) ──
    const targetDataReload = await reverseExtract(targetPrisma, targetFmeaId);
    const compareResult = compareAtomicDBCounts(sourceData, targetDataReload);

    const elapsedMs = Date.now() - startMs;

    console.warn(`[create-with-import] 완료: ${JSON.stringify(counts)} (${elapsedMs}ms)`);

    return NextResponse.json({
      success: true,
      sourceFmeaId,
      targetFmeaId,
      steps: {
        project: true,
        atomicDB: true,
        verification: compareResult.allMatch,
      },
      counts,
      verification: {
        allMatch: compareResult.allMatch,
        checks: compareResult.checks,
      },
      elapsedMs,
      worksheetUrl: `/pfmea/worksheet?id=${targetFmeaId}`,
    });
  } catch (e: unknown) {
    console.error('[create-with-import] 오류:', e);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(e), elapsedMs: Date.now() - startMs },
      { status: 500 }
    );
  }
}
