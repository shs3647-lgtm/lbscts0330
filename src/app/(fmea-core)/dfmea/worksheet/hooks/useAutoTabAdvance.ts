/**
 * @file useAutoTabAdvance.ts
 * @description 확정 후 자동 다음탭 이동 훅
 * - 확정 상태가 false→true로 변경되면 다음 탭으로 자동 전환
 * - 이전 탭 이동은 제한 없음 (TabMenu 자유 클릭)
 * - CODEFREEZE 파일 수정 없이 중앙화된 감지 방식
 */

import { useRef, useEffect, useCallback } from 'react';
import type { WorksheetState } from '../constants';

/** 확정 키 → 다음 탭 ID 매핑 */
const CONFIRM_TO_NEXT_TAB: Record<string, string> = {
  structureConfirmed: 'function-l1',
  l1Confirmed: 'function-l2',
  l2Confirmed: 'function-l3',
  l3Confirmed: 'failure-l1',
  failureL1Confirmed: 'failure-l2',
  failureL2Confirmed: 'failure-l3',
  failureL3Confirmed: 'failure-link',
  failureLinkConfirmed: 'all',
  riskConfirmed: 'all',
};

const CONFIRM_KEYS = Object.keys(CONFIRM_TO_NEXT_TAB);

/** state에서 확정 키 값을 안전하게 읽기 */
function getConfirmValue(state: WorksheetState, key: string): boolean {
  return !!(state as unknown as Record<string, unknown>)[key];
}

/**
 * 확정 상태 변화 감지 → 자동 다음 탭 이동
 * - 최초 로드 시 이미 확정된 상태는 무시 (불필요한 탭 이동 방지)
 * - false→true 전환만 감지하여 다음 탭으로 이동
 */
export function useAutoTabAdvance(
  state: WorksheetState,
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>,
) {
  const prevRef = useRef<Record<string, boolean> | null>(null);
  /** ★ 안정화 플래그: 마운트 후 2초간 데이터 로드 대기 (탭 이동 억제) */
  const stabilizedRef = useRef(false);

  // 의존성용 개별 확정 값 추출
  const sc = state.structureConfirmed;
  const l1 = state.l1Confirmed;
  const l2 = state.l2Confirmed;
  const l3 = state.l3Confirmed;
  const fl1 = getConfirmValue(state, 'failureL1Confirmed');
  const fl2 = getConfirmValue(state, 'failureL2Confirmed');
  const fl3 = getConfirmValue(state, 'failureL3Confirmed');
  const flk = getConfirmValue(state, 'failureLinkConfirmed');
  const rsk = getConfirmValue(state, 'riskConfirmed');
  const opt = getConfirmValue(state, 'optConfirmed');

  // 마운트 후 2초 안정화 (Import/DB 데이터 로드 완료 대기)
  useEffect(() => {
    const timer = setTimeout(() => {
      // 안정화 시점에서 현재 상태를 기준 스냅샷으로 재설정
      stabilizedRef.current = true;
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const setStateRef = useRef(setState);
  setStateRef.current = setState;

  const handleAdvance = useCallback((nextTab: string) => {
    setTimeout(() => {
      setStateRef.current(p => ({ ...p, tab: nextTab }));
    }, 300);
  }, []);

  useEffect(() => {
    // 최초 실행: 현재 상태 스냅샷만 저장 (탭 이동 안 함)
    if (prevRef.current === null) {
      const snapshot: Record<string, boolean> = {};
      for (const key of CONFIRM_KEYS) {
        snapshot[key] = getConfirmValue(state, key);
      }
      prevRef.current = snapshot;
      return;
    }

    const prev = prevRef.current;

    // ★ 안정화 전: 스냅샷만 갱신 (데이터 로드 중 탭 이동 방지)
    if (!stabilizedRef.current) {
      const snapshot: Record<string, boolean> = {};
      for (const key of CONFIRM_KEYS) {
        snapshot[key] = getConfirmValue(state, key);
      }
      prevRef.current = snapshot;
      return;
    }

    // false→true 전환 감지 (안정화 후에만)
    for (const key of CONFIRM_KEYS) {
      const cur = getConfirmValue(state, key);
      const was = !!prev[key];

      if (cur && !was) {
        const nextTab = CONFIRM_TO_NEXT_TAB[key];
        if (nextTab) {
          handleAdvance(nextTab);
        }
        break;
      }
    }

    // 현재 상태 스냅샷 갱신
    const snapshot: Record<string, boolean> = {};
    for (const key of CONFIRM_KEYS) {
      snapshot[key] = getConfirmValue(state, key);
    }
    prevRef.current = snapshot;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sc, l1, l2, l3, fl1, fl2, fl3, flk, rsk, opt, handleAdvance]);
}
