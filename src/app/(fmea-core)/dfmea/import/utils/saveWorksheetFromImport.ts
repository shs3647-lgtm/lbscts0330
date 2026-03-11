/**
 * saveWorksheetFromImport.ts
 *
 * 오케스트레이터: Import 평면 데이터 → WorksheetState 빌드 → DB 저장
 *
 * 동작 순서:
 *   1. buildWorksheetState() — 평면 데이터를 계층 구조로 변환
 *   2. migrateToAtomicDB()  — legacy → atomic 포맷 변환 (CODEFREEZE, 수정 없음)
 *   3. saveWorksheetDB()    — 워크시트 DB에 저장 (CODEFREEZE, 수정 없음)
 *
 * ★ 2026-02-17: forceOverwrite=true 추가 — 서버 가드 우회
 *   Import에서 생성한 데이터는 반드시 저장되어야 함 (기존 placeholder 보호 가드 무시)
 */

import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { isValidFmeaId } from '@/lib/security';
import { buildWorksheetState, type BuildResult } from './buildWorksheetState';
import { injectFailureChains, type FailureLinkEntry } from './failureChainInjector';
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

  // 1. 평면 데이터 → WorksheetState 빌드
  const buildResult = buildWorksheetState(flatData, { fmeaId, l1Name });

  if (!buildResult.success) {
    return { success: false, buildResult, error: '데이터 빌드 실패' };
  }

  // 1-B. ★ FM 갭 피드백: wsState와 flatData 비교 → 추가 항목 감지
  const feedback = applyFmGapFeedback(buildResult.state, flatData);
  if (feedback.totalAdded > 0) {
    console.info(`[FM-Feedback] ${feedback.summary}`);
  }

  // 2-A. 고장사슬 주입 (failureChains → failureLinks + riskData)
  let injectedLinks: FailureLinkEntry[] = [];
  let injectedRisk: Record<string, number | string> = {};
  if (failureChains && failureChains.length > 0) {
    const injection = injectFailureChains(buildResult.state, failureChains);
    injectedLinks = injection.failureLinks;
    injectedRisk = injection.riskData;
  }

  // 2-B. legacy 포맷 구성 (migrateToAtomicDB 입력용)
  const normalizedFmeaId = fmeaId.toLowerCase();
  const legacyData = {
    fmeaId: normalizedFmeaId,
    l1: buildResult.state.l1,
    l2: buildResult.state.l2,
    failureLinks: injectedLinks,
    riskData: injectedRisk,
    forceOverwrite: true, // ★ Import에서 생성 → 서버 가드 우회 필수
    structureConfirmed: false,
    l1Confirmed: false,
    l2Confirmed: false,
    l3Confirmed: false,
    failureL1Confirmed: false,
    failureL2Confirmed: false,
    failureL3Confirmed: false,
    failureLinkConfirmed: injectedLinks.length > 0,  // ★ 링크 주입 성공 시 자동 확정
    riskConfirmed: false,
    optimizationConfirmed: false,
  };

  try {
    // 3. atomic DB 포맷 변환 (기존 CODEFREEZE 함수 재사용)
    //    ★ Deep copy 전달 → migration이 원본 변경 방지
    const { migrateToAtomicDB } = await import('@/app/(fmea-core)/dfmea/worksheet/migration');
    const legacyCopy = JSON.parse(JSON.stringify(legacyData));
    const atomicDB = migrateToAtomicDB(legacyCopy);

    // ★ forceOverwrite를 atomicDB에도 전달 (API 서버 가드 우회, Import 전용)
    Object.assign(atomicDB, { forceOverwrite: true });

    // 4. 워크시트 DB 저장 (기존 CODEFREEZE 함수 재사용)
    const { saveWorksheetDB } = await import('@/app/(fmea-core)/dfmea/worksheet/db-storage');
    await saveWorksheetDB(atomicDB, legacyData);

    return { success: true, buildResult, feedback };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Import→Worksheet] DB 저장 실패:', msg);
    return { success: false, buildResult, error: msg };
  }
}
