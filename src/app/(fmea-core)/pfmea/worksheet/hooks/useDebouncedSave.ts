/**
 * @file useDebouncedSave.ts
 * @description 컨텍스트 메뉴 액션의 저장 디바운스 + 재진입 방지 (2026-03-07)
 *
 * 비유: 엘리베이터 문. 버튼을 연타해도 문이 닫힌 후 1번만 이동한다.
 * 여러 번 상태 변경이 연속 발생해도 마지막 상태만 1번 저장한다.
 *
 * 해결하는 문제:
 * 1. setTimeout(100ms) 중복 생성 → 5번 클릭 시 5번 저장 → 1번만 저장
 * 2. 컨텍스트 메뉴 액션 연타 시 중간 상태 저장 방지
 *
 * 사용법:
 *   const { debouncedSave, isProcessing } = useDebouncedSave(saveToLocalStorage, saveAtomicDB);
 *   // 핸들러에서:
 *   if (isProcessing()) return; // 재진입 방지
 *   setStateSynced(updateFn);
 *   setDirty(true);
 *   debouncedSave();
 */

import { useRef, useCallback } from 'react';

interface DebouncedSaveOptions {
  /** 디바운스 지연 시간 (ms). 기본 150ms */
  delay?: number;
  /** 재진입 방지 잠금 시간 (ms). 기본 300ms */
  lockDuration?: number;
}

export function useDebouncedSave(
  saveToLocalStorage?: (force?: boolean) => void,
  saveAtomicDB?: (force?: boolean) => Promise<void> | void,
  options: DebouncedSaveOptions = {},
) {
  const { delay = 150, lockDuration = 300 } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef<boolean>(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 디바운스된 저장 실행.
   * 이전 예약된 저장이 있으면 취소하고, 새로 예약한다.
   * 마지막 호출로부터 delay ms 후에 1번만 저장한다.
   */
  const debouncedSave = useCallback(() => {
    // 이전 타이머 취소
    if (timerRef.current) clearTimeout(timerRef.current);

    // 재진입 잠금 설정
    lockRef.current = true;
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => { lockRef.current = false; }, lockDuration);

    // 새 타이머 설정 (마지막 호출만 실행)
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      try {
        saveToLocalStorage?.(true);
        if (saveAtomicDB) await saveAtomicDB(true);
      } catch (e) {
        console.error('[DebouncedSave] 저장 오류:', e);
      }
    }, delay);
  }, [saveToLocalStorage, saveAtomicDB, delay, lockDuration]);

  /**
   * 현재 처리 중인지 확인. true이면 새 액션을 차단해야 한다.
   */
  const isProcessing = useCallback(() => lockRef.current, []);

  return { debouncedSave, isProcessing };
}
