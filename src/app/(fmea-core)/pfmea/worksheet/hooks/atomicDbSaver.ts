/**
 * @file atomicDbSaver.ts
 * @description Atomic DB 직접 저장기 — UUID 보존, migrateToAtomicDB 제거
 *
 * 비유: 공식 장부에 "직접" 수정사항을 기입하는 것.
 * 번호(UUID)를 새로 매기지 않고, 기존 번호를 그대로 유지.
 *
 * 핵심 원칙: UUID는 Import 시 1회 확정, 이후 절대 재생성하지 않음
 * migrateToAtomicDB() 호출 절대 금지
 */

import type { FMEAWorksheetDB, FailureAnalysis } from '../schema';

// ── 타입 ──

export interface SaveResult {
  success: boolean;
  error?: string;
  linkStats?: {
    fkDropped: number;
    analysisDropped: number;
    riskDropped: number;
    optDropped: number;
    feIdEmpty: number;
    droppedLinkReasons?: string[];
  };
}

// ── 상수 ──

const FETCH_TIMEOUT_MS = 35_000;
const MAX_CONSECUTIVE_FAILURES = 3;

// ── 큐 기반 동시 저장 방지 ──

let _saveInProgress = false;
let _pendingSave: FMEAWorksheetDB | null = null;
let _consecutiveFailures = 0;

// ── 에러 콜백 ──

let _onSaveError: ((message: string) => void) | null = null;

/** 저장 실패 콜백 등록 (워크시트 페이지에서 호출) */
export function registerSaveErrorCallback(cb: (message: string) => void): void {
  _onSaveError = cb;
}

/** 저장 실패 콜백 해제 */
export function unregisterSaveErrorCallback(): void {
  _onSaveError = null;
}

// ── beforeunload 가드 ──

/** 미저장 데이터 존재 여부 */
export function hasPendingSave(): boolean {
  return _saveInProgress || _pendingSave !== null;
}

/** beforeunload 이벤트 핸들러 등록 — 마운트 시 호출, cleanup 반환 */
export function setupBeforeUnloadGuard(): () => void {
  const handler = (e: BeforeUnloadEvent) => {
    if (hasPendingSave()) {
      e.preventDefault();
      e.returnValue = '저장되지 않은 변경사항이 있습니다.';
    }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}

// ── 내부 유틸 ──

function _notifyError(message: string): void {
  console.error('[atomicDbSaver]', message);
  if (_onSaveError) {
    _onSaveError(message);
  } else {
    console.warn('[atomicDbSaver] saveErrorCallback 미등록 — 사용자에게 알림 불가');
  }
}

// ── FailureAnalyses 캐시 (구조 변경 없으면 재사용) ──

let _lastStructuralHash = '';
let _cachedAnalyses: FailureAnalysis[] = [];

/**
 * 구조 해시 생성 — link ID 포함하여 migrateToAtomicDB의
 * UUID 재생성 문제 없이 안정적으로 캐시 판단
 */
function _computeStructuralHash(db: FMEAWorksheetDB): string {
  return JSON.stringify({
    fl: db.failureLinks.length,
    fe: db.failureEffects.length,
    fm: db.failureModes.length,
    fc: db.failureCauses.length,
    l2: db.l2Structures.length,
    l3: db.l3Structures.length,
    flc: db.confirmed.failureLink,
    lk0: db.failureLinks[0]?.id || '',
  });
}

/**
 * failureLink 확정 상태이고 링크가 있으면 buildFailureAnalyses 호출.
 * 기존 link ID를 그대로 사용 — UUID 재생성 없음.
 */
async function _resolveFailureAnalyses(db: FMEAWorksheetDB): Promise<FailureAnalysis[]> {
  if (db.failureLinks.length === 0 || !db.confirmed.failureLink) {
    return [];
  }

  const hash = _computeStructuralHash(db);
  if (hash === _lastStructuralHash && _cachedAnalyses.length > 0) {
    return _cachedAnalyses;
  }

  const { buildFailureAnalyses } = await import('../utils/failure-analysis-builder');
  const analyses = buildFailureAnalyses(db);

  _lastStructuralHash = hash;
  _cachedAnalyses = analyses;
  return analyses;
}

// ── 실제 저장 ──

async function _doSave(db: FMEAWorksheetDB): Promise<SaveResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch('/api/fmea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db),
      signal: controller.signal,
    });

    const result = await response.json();

    if (!response.ok || result.fallback || !result.success) {
      const errorMsg = result.message || result.error || '알 수 없는 저장 오류';
      _notifyError(`DB 저장 실패: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    if (result.preventedOverwrite) {
      const msg = '저장이 차단되었습니다: 기존 데이터가 더 풍부합니다. 페이지를 새로고침하세요.';
      _notifyError(msg);
      return { success: false, error: msg };
    }

    // FailureLink 드롭 감지 시 경고
    if (result.linkStats?.fkDropped > 0) {
      _notifyError(
        `고장연결 ${result.linkStats.fkDropped}건이 FK 불일치로 저장되지 않았습니다. 고장연결 탭에서 확인하세요.`
      );
    }

    // 연쇄 드롭 알림
    const cascading: string[] = [];
    if (result.linkStats?.analysisDropped > 0)
      cascading.push(`고장분석 ${result.linkStats.analysisDropped}건`);
    if (result.linkStats?.riskDropped > 0)
      cascading.push(`위험분석 ${result.linkStats.riskDropped}건`);
    if (result.linkStats?.optDropped > 0)
      cascading.push(`최적화 ${result.linkStats.optDropped}건`);
    if (cascading.length > 0) {
      _notifyError(`연쇄 삭제: ${cascading.join(', ')}. 고장연결 확인 필요.`);
    }

    // feId 미지정 링크 경고
    if (result.linkStats?.feIdEmpty > 0) {
      console.warn(
        `[atomicDbSaver] ${result.linkStats.feIdEmpty}건 feId 미지정 — DB 미저장`
      );
    }

    return { success: true, linkStats: result.linkStats };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── 공개 API ──

/**
 * Atomic DB 직접 저장 — UUID 보존, legacyData 불필요
 *
 * 큐 패턴: 동시 저장 시 최신 데이터만 보존
 * 연속 실패 시 최대 3회 재시도 + 지수 백오프
 */
export async function saveAtomicDB(db: FMEAWorksheetDB): Promise<SaveResult> {
  // fmeaId 사전 검증
  if (!db.fmeaId || typeof db.fmeaId !== 'string' || db.fmeaId.trim() === '') {
    const msg = 'fmeaId가 없어 저장할 수 없습니다. 프로젝트를 다시 선택하세요.';
    _notifyError(msg);
    return { success: false, error: msg };
  }

  // 저장 진행 중이면 큐에 최신 데이터 보관
  if (_saveInProgress) {
    _pendingSave = db;
    return { success: true }; // 큐에 등록됨 — 나중에 처리
  }
  _saveInProgress = true;

  let result: SaveResult = { success: false };
  try {
    // failureAnalyses 구축 (기존 link ID 사용 — UUID 재생성 없음)
    const analyses = await _resolveFailureAnalyses(db);
    const dbToSave: FMEAWorksheetDB = {
      ...db,
      failureAnalyses: analyses,
      savedAt: new Date().toISOString(),
    };

    result = await _doSave(dbToSave);
    if (result.success) {
      _consecutiveFailures = 0;
    } else {
      _consecutiveFailures++;
    }
  } catch (error: unknown) {
    _consecutiveFailures++;
    const err = error as { name?: string; message?: string };
    const msg =
      err.name === 'AbortError'
        ? `저장 요청 시간 초과 (${FETCH_TIMEOUT_MS / 1000}초). 네트워크 상태를 확인하세요.`
        : err.message || String(error);
    _notifyError(`DB 저장 오류: ${msg}`);
    result = { success: false, error: msg };
  } finally {
    _saveInProgress = false;

    // 큐에 대기 중인 저장 처리
    if (_pendingSave) {
      const pending = _pendingSave;
      _pendingSave = null;

      if (_consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        _notifyError(
          `저장 연속 ${MAX_CONSECUTIVE_FAILURES}회 실패. 네트워크 확인 후 페이지를 새로고침하세요.`
        );
        _consecutiveFailures = 0;
      } else {
        const delay = result.success
          ? 0
          : Math.min(1000 * Math.pow(2, _consecutiveFailures - 1), 8000);

        setTimeout(() => {
          saveAtomicDB(pending).catch((e) =>
            console.error('[atomicDbSaver] 큐 처리 오류:', e)
          );
        }, delay);
      }
    }
  }

  return result;
}
