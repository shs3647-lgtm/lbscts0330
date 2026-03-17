/**
 * @file stepConfirmation.ts
 * @description Import 3단계 확정 프로세스 — 순수 상태 관리 유틸 (hook-free)
 * - SA(구조분석) → FC(고장사슬) → FA(통합분석) 순차 확정
 * - React 훅에서 이 유틸을 호출하여 상태 전이 관리
 * @created 2026-02-21
 */

import type { ImportedFlatData } from '../types';
import type { FCComparisonResult } from './fcComparison';

// ─── 타입 ───

/** BuildResult 요약 (buildWorksheetState 결과) */
export interface BuildDiagnostics {
  l2Count: number;
  l3Count: number;
  l1TypeCount: number;
  l2FuncCount: number;
  l3FuncCount: number;
  productCharCount: number;
  processCharCount: number;
  fmCount: number;
  fcCount: number;
  feCount: number;
  warnings: string[];
}

/** 3단계 상태 */
export interface ImportStepState {
  saConfirmed: boolean;
  fcConfirmed: boolean;
  faConfirmed: boolean;
  activeStep: 'SA' | 'FC' | 'FA';
  buildResult: { success: boolean; diagnostics: BuildDiagnostics } | null;
  fcComparison: FCComparisonResult | null;
}

// ─── 초기 상태 ───

export function getInitialStepState(): ImportStepState {
  return {
    saConfirmed: false,
    fcConfirmed: false,
    faConfirmed: false,
    activeStep: 'SA',
    buildResult: null,
    fcComparison: null,
  };
}

// ─── 확정 가능 여부 ───

/** SA 확정 가능 조건: flatData 있음 (저장 여부 무관, 누락은 경고만) */
export function canConfirmSA(params: {
  flatData: ImportedFlatData[];
  isSaved?: boolean;
  missingTotal?: number;
}): boolean {
  return params.flatData.length > 0;
}

/** FC 확정 가능 조건: SA 확정됨 */
export function canConfirmFC(state: ImportStepState): boolean {
  return state.saConfirmed;
}

/** FA 확정 가능 조건: FC 확정됨 */
export function canConfirmFA(state: ImportStepState): boolean {
  return state.fcConfirmed;
}

// ─── 상태 전이 ───

/** SA 확정 → FC 탭으로 이동 */
export function advanceToFC(state: ImportStepState): ImportStepState {
  return {
    ...state,
    saConfirmed: true,
    activeStep: 'FC',
  };
}

/** FC 확정 → FA 탭으로 이동 */
export function advanceToFA(state: ImportStepState): ImportStepState {
  return {
    ...state,
    fcConfirmed: true,
    activeStep: 'FA',
  };
}

/** FA 확정 완료 */
export function markFAConfirmed(state: ImportStepState): ImportStepState {
  return {
    ...state,
    faConfirmed: true,
  };
}

// ─── 리셋 ───

/** 모든 단계 리셋 (flatData 변경 시) */
export function resetAllSteps(state: ImportStepState): ImportStepState {
  return getInitialStepState();
}

/** SA 이후 단계만 리셋 (SA 유지, FC/FA 리셋) */
export function resetAfterSA(state: ImportStepState): ImportStepState {
  return {
    ...state,
    fcConfirmed: false,
    faConfirmed: false,
    activeStep: 'FC',
    fcComparison: null,
  };
}
