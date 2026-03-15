/**
 * @file atomicDbLoader.ts
 * @description Atomic DB 직접 로더 — Legacy 변환 없이 DB에서 직접 로드
 *
 * 비유: 공식 장부를 "그대로" 복사해오는 것.
 * 번역이나 재해석 없이 DB 원본 데이터를 그대로 반환.
 *
 * - loadAtomicDB: FMEAWorksheetDB를 API에서 직접 로드 (atomic format)
 * - loadConfirmedState: 확정 상태 맵 로드
 * - loadRiskData: riskAnalyses에서 linkId 기반 risk 데이터 추출
 */

import type { FMEAWorksheetDB } from '../schema';

// ── 상수 ──
const FETCH_TIMEOUT_MS = 30_000;

/**
 * AbortController 기반 fetch wrapper (타임아웃 포함)
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Atomic DB를 API에서 직접 로드
 *
 * - format=atomic 쿼리로 원자성 데이터만 요청
 * - l2Structures 배열이 존재하면 FMEAWorksheetDB로 반환
 * - legacy 데이터만 존재하면 null 반환 (호출자가 마이그레이션 처리)
 *
 * @param fmeaId - FMEA 프로젝트 ID
 * @returns FMEAWorksheetDB | null
 */
export async function loadAtomicDB(
  fmeaId: string
): Promise<FMEAWorksheetDB | null> {
  if (!fmeaId || typeof fmeaId !== 'string' || fmeaId.trim() === '') {
    console.error('[atomicDbLoader] fmeaId 누락');
    return null;
  }

  const normalizedId = fmeaId.toLowerCase();

  try {
    const response = await fetchWithTimeout(
      `/api/fmea?fmeaId=${encodeURIComponent(normalizedId)}&format=atomic`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      const errorBody = await response.json().catch(() => ({}));
      console.error('[atomicDbLoader] API 오류:', errorBody.error || response.statusText);
      return null;
    }

    const data = await response.json();
    if (!data) return null;

    // legacy 데이터만 반환된 경우 (_isLegacyDirect 플래그)
    if (data._isLegacyDirect) {
      return null;
    }

    // atomic 데이터 존재 확인: l2Structures 배열이 있어야 유효
    const l2Structures = Array.isArray(data.l2Structures) ? data.l2Structures : [];
    if (l2Structures.length === 0 && !data.l1Structure) {
      return null;
    }

    // FMEAWorksheetDB 형태 그대로 반환 (API가 이미 올바른 형태로 응답)
    const db: FMEAWorksheetDB = {
      fmeaId: data.fmeaId || normalizedId,
      savedAt: data.savedAt || new Date().toISOString(),
      l1Structure: data.l1Structure || null,
      l2Structures,
      l3Structures: Array.isArray(data.l3Structures) ? data.l3Structures : [],
      l1Functions: Array.isArray(data.l1Functions) ? data.l1Functions : [],
      l2Functions: Array.isArray(data.l2Functions) ? data.l2Functions : [],
      l3Functions: Array.isArray(data.l3Functions) ? data.l3Functions : [],
      failureEffects: Array.isArray(data.failureEffects) ? data.failureEffects : [],
      failureModes: Array.isArray(data.failureModes) ? data.failureModes : [],
      failureCauses: Array.isArray(data.failureCauses) ? data.failureCauses : [],
      failureLinks: Array.isArray(data.failureLinks) ? data.failureLinks : [],
      failureAnalyses: Array.isArray(data.failureAnalyses) ? data.failureAnalyses : [],
      riskAnalyses: Array.isArray(data.riskAnalyses) ? data.riskAnalyses : [],
      optimizations: Array.isArray(data.optimizations) ? data.optimizations : [],
      confirmed: data.confirmed || {
        structure: false,
        l1Function: false,
        l2Function: false,
        l3Function: false,
        l1Failure: false,
        l2Failure: false,
        l3Failure: false,
        failureLink: false,
        risk: false,
        optimization: false,
      },
    };

    return db;
  } catch (error: unknown) {
    const message = error instanceof Error
      ? (error.name === 'AbortError'
        ? `요청 시간 초과 (${FETCH_TIMEOUT_MS / 1000}초)`
        : error.message)
      : String(error);
    console.error('[atomicDbLoader] 로드 오류:', message);
    return null;
  }
}

/**
 * 확정 상태 로드 (FmeaConfirmedState)
 *
 * @param fmeaId - FMEA 프로젝트 ID
 * @returns 확정 상태 맵 (키: 단계명, 값: boolean)
 */
export async function loadConfirmedState(
  fmeaId: string
): Promise<Record<string, boolean>> {
  const empty: Record<string, boolean> = {
    structure: false,
    l1Function: false,
    l2Function: false,
    l3Function: false,
    l1Failure: false,
    l2Failure: false,
    l3Failure: false,
    failureLink: false,
    risk: false,
    optimization: false,
  };

  if (!fmeaId || typeof fmeaId !== 'string' || fmeaId.trim() === '') {
    return empty;
  }

  try {
    // loadAtomicDB가 confirmed 포함하여 반환하므로 같은 API 사용
    const db = await loadAtomicDB(fmeaId);
    if (!db) return empty;

    return { ...empty, ...db.confirmed };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[atomicDbLoader] 확정상태 로드 오류:', message);
    return empty;
  }
}

/**
 * Risk 데이터 로드 (riskAnalyses → linkId 기반 SOD/AP 맵)
 *
 * riskAnalyses 배열에서 linkId를 키로 하는 평탄화된 맵을 생성.
 * 키 형식: `S-{linkId}`, `O-{linkId}`, `D-{linkId}`, `AP-{linkId}`,
 *          `PC-{linkId}` (preventionControl), `DC-{linkId}` (detectionControl)
 *
 * @param fmeaId - FMEA 프로젝트 ID
 * @returns linkId 기반 risk 데이터 맵
 */
export async function loadRiskData(
  fmeaId: string
): Promise<Record<string, number | string>> {
  const empty: Record<string, number | string> = {};

  if (!fmeaId || typeof fmeaId !== 'string' || fmeaId.trim() === '') {
    return empty;
  }

  try {
    const db = await loadAtomicDB(fmeaId);
    if (!db || !Array.isArray(db.riskAnalyses) || db.riskAnalyses.length === 0) {
      return empty;
    }

    const result: Record<string, number | string> = {};

    for (const risk of db.riskAnalyses) {
      const linkId = risk.linkId;
      if (!linkId) continue;

      result[`S-${linkId}`] = risk.severity;
      result[`O-${linkId}`] = risk.occurrence;
      result[`D-${linkId}`] = risk.detection;
      result[`AP-${linkId}`] = risk.ap;

      if (risk.preventionControl) {
        result[`PC-${linkId}`] = risk.preventionControl;
      }
      if (risk.detectionControl) {
        result[`DC-${linkId}`] = risk.detectionControl;
      }
    }

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[atomicDbLoader] riskData 로드 오류:', message);
    return empty;
  }
}
