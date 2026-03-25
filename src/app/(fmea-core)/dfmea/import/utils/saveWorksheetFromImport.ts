/**
 * saveWorksheetFromImport.ts
 *
 * ★ 2026-03-25: position-parser 경로로 전환
 *   레거시 buildWorksheetState 완전 제거
 *   이제 position-parser.ts → save-position-import/route.ts 경로만 사용
 *
 * Import 평면 데이터 → position-parser 파싱 → save-position-import API 호출
 *
 * @created 2026-02-17
 * @modified 2026-03-25 — 레거시 파서 제거, position-parser 전환
 */

import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { isValidFmeaId } from '@/lib/security';

export interface SaveFromImportParams {
  fmeaId: string;
  flatData: ImportedFlatData[];
  l1Name?: string;
  failureChains?: MasterFailureChain[];
}

/** BuildResult 호환 stub — 레거시 UI 타입 호환용 */
export interface BuildResult {
  success: boolean;
  state: unknown;
  diagnostics: {
    l2Count: number;
    l3Count: number;
    l1TypeCount: number;
    l2FuncCount: number;
    l3FuncCount: number;
    processCharCount: number;
    productCharCount: number;
    fmCount: number;
    fcCount: number;
    feCount: number;
    warnings: string[];
  };
  flatMap?: unknown;
}

/** FlatToEntityMap 호환 stub */
export interface FlatToEntityMap {
  fm: Map<string, string>;
  fc: Map<string, string>;
  fe: Map<string, string>;
}

export interface SaveFromImportResult {
  success: boolean;
  buildResult: BuildResult;
  error?: string;
}

/**
 * Import 실행 — position-parser 경로로 save-position-import API 호출
 *
 * ★ 2026-03-25: 레거시 buildWorksheetState 제거
 * 이 함수는 flatData를 서버로 전달하고, 서버가 position-parser로 파싱 + DB 저장
 */
export async function saveWorksheetFromImport(
  params: SaveFromImportParams,
): Promise<SaveFromImportResult> {
  const { fmeaId, flatData, l1Name, failureChains } = params;

  const emptyDiag: BuildResult['diagnostics'] = {
    l2Count: 0, l3Count: 0, l1TypeCount: 0, l2FuncCount: 0, l3FuncCount: 0,
    processCharCount: 0, productCharCount: 0, fmCount: 0, fcCount: 0, feCount: 0,
    warnings: [],
  };

  if (!fmeaId || !isValidFmeaId(fmeaId)) {
    return {
      success: false,
      buildResult: { success: false, state: null, diagnostics: { ...emptyDiag, warnings: ['fmeaId 없음'] } },
      error: 'fmeaId가 없거나 유효하지 않습니다',
    };
  }

  try {
    // ★ save-from-import API 호출 (서버에서 position-parser 파싱 + DB 저장)
    const response = await fetch('/api/fmea/save-position-import', {
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
      console.error('[Import→Worksheet] 서버 저장 실패:', errorMsg);
      return {
        success: false,
        buildResult: { success: false, state: null, diagnostics: { ...emptyDiag, warnings: [errorMsg] } },
        error: errorMsg,
      };
    }

    console.info('[Import→Worksheet] 서버 저장 성공:', result.atomicCounts);
    return {
      success: true,
      buildResult: {
        success: true,
        state: null,
        diagnostics: {
          ...emptyDiag,
          ...result.atomicCounts,
        },
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Import→Worksheet] DB 저장 실패:', msg);
    return {
      success: false,
      buildResult: { success: false, state: null, diagnostics: { ...emptyDiag, warnings: [msg] } },
      error: msg,
    };
  }
}
