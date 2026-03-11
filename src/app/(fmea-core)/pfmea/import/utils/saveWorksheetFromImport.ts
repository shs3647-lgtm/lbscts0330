/**
 * saveWorksheetFromImport.ts
 *
 * 오케스트레이터: Import 평면 데이터 → 서버사이드 저장 API 호출
 *
 * ★ 2026-03-10: 서버사이드 저장으로 전환
 *   기존: 클라이언트에서 buildWorksheetState + migrateToAtomicDB + fetch POST
 *   문제: 클라이언트 모듈 해석/직렬화 이슈로 DB 저장 실패
 *   해결: /api/fmea/save-from-import 서버 API가 전체 파이프라인 일괄 처리
 *
 * ★ 2026-02-17: forceOverwrite=true 추가 — 서버 가드 우회
 *   Import에서 생성한 데이터는 반드시 저장되어야 함 (기존 placeholder 보호 가드 무시)
 */

import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { isValidFmeaId } from '@/lib/security';
import { buildWorksheetState, type BuildResult } from './buildWorksheetState';
import { applyFmGapFeedback, type FmGapFeedbackResult } from './fm-gap-feedback';

export interface SaveFromImportParams {
  fmeaId: string;
  flatData: ImportedFlatData[];
  l1Name?: string;
  failureChains?: MasterFailureChain[];  // ★ 고장사슬 자동 주입
}

export interface SaveFromImportResult {
  success: boolean;
  buildResult: BuildResult;
  /** FM 갭 피드백 결과 (Import ↔ Worksheet 차이) */
  feedback?: FmGapFeedbackResult;
  error?: string;
}

export async function saveWorksheetFromImport(
  params: SaveFromImportParams,
): Promise<SaveFromImportResult> {
  const { fmeaId, flatData, l1Name, failureChains } = params;

  if (!fmeaId || !isValidFmeaId(fmeaId)) {
    const emptyDiag = { l2Count: 0, l3Count: 0, l1TypeCount: 0, l2FuncCount: 0, l3FuncCount: 0, processCharCount: 0, productCharCount: 0, fmCount: 0, fcCount: 0, feCount: 0, warnings: ['fmeaId 없음 또는 유효하지 않음'] };
    return {
      success: false,
      buildResult: { success: false, state: null as unknown as BuildResult['state'], diagnostics: emptyDiag },
      error: 'fmeaId가 없거나 유효하지 않습니다',
    };
  }

  // 1. 클라이언트에서 빌드 + 피드백 (UI 표시용)
  const buildResult = buildWorksheetState(flatData, { fmeaId, l1Name });

  if (!buildResult.success) {
    return { success: false, buildResult, error: '데이터 빌드 실패' };
  }

  const feedback = applyFmGapFeedback(buildResult.state, flatData);
  if (feedback.totalAdded > 0) {
    console.info(`[FM-Feedback] ${feedback.summary}`);
  }

  try {
    // 2. ★★★ 서버사이드 저장 API 호출 ★★★
    //    buildWorksheetState + migrateToAtomicDB + POST /api/fmea 를 서버에서 일괄 처리
    //    클라이언트 모듈 해석/직렬화 이슈 완전 우회
    const response = await fetch('/api/fmea/save-from-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fmeaId,
        flatData,
        l1Name: l1Name || '',
        failureChains: failureChains || [],
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      const errorMsg = result.error || result.message || '워크시트 DB 저장 실패';
      console.error('[Import→Worksheet] 서버 저장 실패:', errorMsg, result);
      return { success: false, buildResult, feedback, error: errorMsg };
    }

    console.info('[Import→Worksheet] 서버 저장 성공:', result.atomicCounts);
    return { success: true, buildResult, feedback };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Import→Worksheet] DB 저장 실패:', msg);
    return { success: false, buildResult, error: msg };
  }
}
