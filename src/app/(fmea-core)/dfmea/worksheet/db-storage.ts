// CODEFREEZE
/**
 * @file db-storage.ts
 * @description PostgreSQL DB 저장/로드 함수 (DFMEA)
 *
 * ★★★ 근본적인 해결책: 레거시 데이터 = Single Source of Truth ★★★
 * - 저장 시: 원자성 DB + 레거시 데이터 JSON 동시 저장
 * - 로드 시: API가 레거시 데이터 우선 반환 (역변환 없음!)
 * - 이를 통해 원자성 DB ↔ 레거시 변환 과정에서의 데이터 손실 문제 해결
 *
 * ★★★ 2026-02-16: localStorage 폴백 완전 제거 (DB Only 정책) ★★★
 * - DB 저장 실패 시 에러만 로깅 (localStorage 쓰기 금지)
 * - DB 로드 실패 시 null 반환 (localStorage 읽기 금지)
 *
 * ★★★ 2026-03-04: 뮤텍스 → 큐 방식 전환 (저장 유실 방지) ★★★
 * - 이전: _saveInProgress=true면 저장 무음 드롭 → 데이터 손실
 * - 현재: 최신 데이터를 큐에 보관 → 현재 저장 완료 후 자동 재시도
 * - 저장 실패 시 onSaveError 콜백으로 UI 알림 지원
 *
 * ★★★ 2026-03-07: 안전성 강화 ★★★
 * - fmeaId 사전 검증 (잘못된 프로젝트 저장 차단)
 * - fetch timeout (AbortController, 35초)
 * - 연속 실패 시 재시도 제한 (최대 3회 + 지수 백오프)
 * - beforeunload 미저장 데이터 경고
 * - 저장 에러 콜백 미등록 시 콘솔 경고 강화
 */

import type { FMEAWorksheetDB } from './schema';

// ── 상수 ──
const FETCH_TIMEOUT_MS = 35_000;
const MAX_CONSECUTIVE_FAILURES = 3;

// ── 큐 기반 동시 저장 방지 ──
let _saveInProgress = false;
let _pendingSave: { db: FMEAWorksheetDB; legacyData?: any } | null = null;
let _consecutiveFailures = 0;

/** 저장 실패 시 호출되는 콜백 (UI 알림용) */
let _onSaveError: ((message: string) => void) | null = null;

/** 저장 실패 콜백 등록 (워크시트 페이지에서 호출) */
export function registerSaveErrorCallback(cb: (message: string) => void): void {
  _onSaveError = cb;
}

/** 저장 실패 콜백 해제 */
export function unregisterSaveErrorCallback(): void {
  _onSaveError = null;
}

/** 미저장 데이터 존재 여부 */
export function hasPendingSave(): boolean {
  return _saveInProgress || _pendingSave !== null;
}

/** beforeunload 이벤트 핸들러 등록 */
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

/** 에러 알림 */
function _notifyError(message: string): void {
  console.error('[DB 저장]', message);
  if (_onSaveError) {
    _onSaveError(message);
  } else {
    console.warn('[DB 저장] ⚠ saveErrorCallback 미등록 — 사용자에게 알림 불가');
  }
}

/**
 * 실제 저장 실행 (내부용)
 */
async function _doSave(db: FMEAWorksheetDB, legacyData?: any): Promise<void> {
  const requestBody = {
    ...db,
    legacyData: legacyData || null,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch('/api/fmea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const result = await response.json();

    if (!response.ok || result.fallback || !result.success) {
      const errorMsg = result.message || result.error || '알 수 없는 저장 오류';
      _notifyError(`DB 저장 실패: ${errorMsg}`);
      return;
    }

    if (result.preventedOverwrite) {
      _notifyError('저장이 차단되었습니다: 기존 데이터가 더 풍부합니다. 페이지를 새로고침하세요.');
      return;
    }

    // ★ P1: FailureLink 드롭 감지 시 사용자에게 경고 (Silent Drop 가시화)
    if (result.linkStats?.fkDropped > 0) {
      const dropped = result.linkStats.fkDropped;
      console.error(`[db-storage] FailureLink ${dropped}건 FK 검증 실패로 드롭됨`, result.linkStats.droppedLinkReasons);
      _notifyError(`⚠️ 고장연결 ${dropped}건이 FK 불일치로 저장되지 않았습니다. 고장연결 탭에서 확인하세요.`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * PostgreSQL DB에 원자성 DB 저장 (레거시 데이터 포함)
 */
export async function saveWorksheetDB(db: FMEAWorksheetDB, legacyData?: any): Promise<void> {
  if (!db.fmeaId || typeof db.fmeaId !== 'string' || db.fmeaId.trim() === '') {
    _notifyError('fmeaId가 없어 저장할 수 없습니다. 프로젝트를 다시 선택하세요.');
    return;
  }

  if (_saveInProgress) {
    _pendingSave = { db, legacyData };
    return;
  }
  _saveInProgress = true;

  let saveSucceeded = false;
  try {
    await _doSave(db, legacyData);
    saveSucceeded = true;
    _consecutiveFailures = 0;
  } catch (error: any) {
    _consecutiveFailures++;
    const msg = error.name === 'AbortError'
      ? `저장 요청 시간 초과 (${FETCH_TIMEOUT_MS / 1000}초). 네트워크 상태를 확인하세요.`
      : (error.message || String(error));
    _notifyError(`DB 저장 오류: ${msg}`);
  } finally {
    _saveInProgress = false;

    if (_pendingSave) {
      const pending = _pendingSave;
      _pendingSave = null;

      if (_consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        _notifyError(
          `저장 연속 ${MAX_CONSECUTIVE_FAILURES}회 실패. 네트워크 확인 후 페이지를 새로고침하세요.`
        );
        _consecutiveFailures = 0;
        return;
      }

      const delay = saveSucceeded
        ? 0
        : Math.min(1000 * Math.pow(2, _consecutiveFailures - 1), 8000);

      setTimeout(() => {
        saveWorksheetDB(pending.db, pending.legacyData).catch(e =>
          console.error('[DB 저장] 큐 처리 오류:', e)
        );
      }, delay);
    }
  }
}

/**
 * PostgreSQL DB에서 데이터 로드 (폴백 포함)
 */
export async function loadWorksheetDB(fmeaId: string): Promise<FMEAWorksheetDB | null> {
  if (!fmeaId || typeof fmeaId !== 'string' || fmeaId.trim() === '') {
    console.error('[DB 로드] fmeaId 누락');
    return null;
  }

  try {
    const response = await fetch(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);

    if (!response.ok) {
      if (response.status === 404) return null;
      const error = await response.json();
      throw new Error(error.error || 'Failed to load FMEA data');
    }

    const db = await response.json();
    if (!db) return null;
    return db as FMEAWorksheetDB;
  } catch (error: any) {
    console.error('[DB 로드] 오류:', error.message || error);
    return null;
  }
}

/**
 * PostgreSQL DB에서 원자성(Atomic) 데이터를 강제로 로드
 */
export async function loadWorksheetDBAtomic(fmeaId: string): Promise<FMEAWorksheetDB | null> {
  if (!fmeaId || typeof fmeaId !== 'string' || fmeaId.trim() === '') {
    console.error('[DB 로드] fmeaId 누락');
    return null;
  }

  try {
    const response = await fetch(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}&format=atomic`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to load atomic FMEA data');
    }
    const db = await response.json();
    if (!db) return null;
    return db as FMEAWorksheetDB;
  } catch (error: any) {
    console.error('[DB 로드] 오류:', error.message || error);
    return null;
  }
}
