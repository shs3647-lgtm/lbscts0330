// CODEFREEZE
/**
 * @file db-storage.ts
 * @description PostgreSQL DB 저장/로드 함수
 *
 * - 저장 시: Atomic DB만 저장
 * - 로드 시: API가 Atomic DB에서 조립하여 반환
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
const FETCH_TIMEOUT_MS = 35_000; // 서버 트랜잭션 30초 + 여유 5초
const MAX_CONSECUTIVE_FAILURES = 3;

// ── 큐 기반 동시 저장 방지 ──
let _saveInProgress = false;
let _pendingSave: { db: FMEAWorksheetDB } | null = null;
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

/** beforeunload 이벤트 핸들러 등록 — 워크시트 마운트 시 호출, 언마운트 시 반환된 cleanup 호출 */
export function setupBeforeUnloadGuard(): () => void {
  const handler = (e: BeforeUnloadEvent) => {
    if (hasPendingSave()) {
      e.preventDefault();
      // 최신 브라우저는 커스텀 메시지 무시하지만 returnValue 설정 필수
      e.returnValue = '저장되지 않은 변경사항이 있습니다.';
    }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}

/** 에러 알림 (콜백 등록 여부 무관하게 항상 콘솔 출력) */
function _notifyError(message: string): void {
  console.error('[DB 저장]', message);
  if (_onSaveError) {
    _onSaveError(message);
  } else {
    console.warn('[DB 저장] ⚠ saveErrorCallback 미등록 — 사용자에게 알림 불가');
  }
}

/**
 * 실제 저장 실행 (내부용) — Atomic DB만 전송
 */
async function _doSave(db: FMEAWorksheetDB): Promise<void> {
  const requestBody = db;

  // ★ AbortController: 서버 응답 없으면 35초 후 자동 취소
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

    // ★★★ 2026-03-19: 409 Conflict (deadlock) → 300ms 후 1회 재시도 ★★★
    if (response.status === 409 && result.retryable) {
      console.warn('[db-storage] 트랜잭션 충돌, 300ms 후 재시도...');
      await new Promise(r => setTimeout(r, 300));
      const retryResp = await fetch('/api/fmea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const retryResult = await retryResp.json();
      if (retryResp.ok && retryResult.success) return;
    }

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

    // ★ P2: 연쇄 드롭 알림 (고장분석/위험분석/최적화)
    const cascading: string[] = [];
    if (result.linkStats?.analysisDropped > 0)
      cascading.push(`고장분석 ${result.linkStats.analysisDropped}건`);
    if (result.linkStats?.riskDropped > 0)
      cascading.push(`위험분석 ${result.linkStats.riskDropped}건`);
    if (result.linkStats?.optDropped > 0)
      cascading.push(`최적화 ${result.linkStats.optDropped}건`);
    if (cascading.length > 0) {
      _notifyError(`⚠️ 연쇄 삭제: ${cascading.join(', ')}. 고장연결 확인 필요.`);
    }

    // ★ P3: feId 미지정 링크 경고
    if (result.linkStats?.feIdEmpty > 0) {
      console.warn(`[db-storage] ${result.linkStats.feIdEmpty}건 feId 미지정 — DB 미저장`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * PostgreSQL DB에 원자성 DB 저장
 * ★ 2026-03-04: 큐 방식 — 동시 저장 시 최신 데이터 보존
 * ★ 2026-03-07: fmeaId 검증 + 재시도 제한 + 지수 백오프
 * Atomic DB만 저장
 *
 * @param db - 원자성 DB 데이터
 */
export async function saveWorksheetDB(db: FMEAWorksheetDB): Promise<void> {
  // ★ fmeaId 사전 검증 — 잘못된 프로젝트에 저장하는 것을 원천 차단
  if (!db.fmeaId || typeof db.fmeaId !== 'string' || db.fmeaId.trim() === '') {
    _notifyError('fmeaId가 없어 저장할 수 없습니다. 프로젝트를 다시 선택하세요.');
    return;
  }

  // 저장 진행 중이면 큐에 최신 데이터 보관 (이전 pending 덮어쓰기 = 항상 최신만 유지)
  if (_saveInProgress) {
    _pendingSave = { db };
    return;
  }
  _saveInProgress = true;

  let saveSucceeded = false;
  try {
    await _doSave(db);
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

    // 큐에 대기 중인 저장이 있으면 실행
    if (_pendingSave) {
      const pending = _pendingSave;
      _pendingSave = null;

      // ★ 연속 실패 시 재시도 중단 (무한 루프 방지)
      if (_consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        _notifyError(
          `저장 연속 ${MAX_CONSECUTIVE_FAILURES}회 실패. 네트워크 확인 후 페이지를 새로고침하세요.`
        );
        _consecutiveFailures = 0;
        return;
      }

      // 성공 시 즉시 처리, 실패 시 지수 백오프
      const delay = saveSucceeded
        ? 0
        : Math.min(1000 * Math.pow(2, _consecutiveFailures - 1), 8000);

      setTimeout(() => {
        saveWorksheetDB(pending.db).catch(e =>
          console.error('[DB 저장] 큐 처리 오류:', e)
        );
      }, delay);
    }
  }
}

/**
 * PostgreSQL DB에서 원자성(Atomic) 데이터를 강제로 로드
 * - 레거시 DB가 있어도 무조건 원자성 DB를 반환
 * - 복구/검증용
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
