/**
 * @file useWorksheetConfirm.ts
 * @description 워크시트 확정 상태 관리 Hook (PFMEA/DFMEA 공용)
 * @version 1.0.0
 *
 * 담당 기능:
 * - 확정 플래그 정규화 (하위→상위 일관성 유지)
 * - 확정 상태 변경 감지 및 자동 저장 트리거
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: any 타입은 레거시 데이터 구조 호환성을 위해 의도적으로 사용됨

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ConfirmedFlags, WorksheetState } from '@/shared/types/worksheet';

interface UseWorksheetConfirmOptions {
  state: WorksheetState;
  saveToLocalStorage: () => void;
  fmeaType: 'PFMEA' | 'DFMEA';
}

interface UseWorksheetConfirmReturn {
  normalizeConfirmedFlags: (flags: ConfirmedFlags) => ConfirmedFlags;
}

export function useWorksheetConfirm(options: UseWorksheetConfirmOptions): UseWorksheetConfirmReturn {
  const { state, saveToLocalStorage, fmeaType } = options;

  const confirmedStateRef = useRef<string>('');

  /**
   * 확정 플래그 불일치 복구
   * - 하위 단계가 확정이면 상위 단계도 확정이었어야 함
   * - 이전 저장 버그로 플래그만 유실된 케이스 방어
   */
  const normalizeConfirmedFlags = useCallback((flags: ConfirmedFlags): ConfirmedFlags => {
    const out = { ...flags };

    // 고장분석 → 기능분석 연계
    if (out.failureL1Confirmed && !out.l1Confirmed) out.l1Confirmed = true;
    if (out.failureL2Confirmed && !out.l2Confirmed) out.l2Confirmed = true;
    if (out.failureL3Confirmed && !out.l3Confirmed) out.l3Confirmed = true;

    // 기능분석 단계 체인
    if (out.l3Confirmed && !out.l2Confirmed) out.l2Confirmed = true;
    if (out.l2Confirmed && !out.l1Confirmed) out.l1Confirmed = true;
    if (out.l1Confirmed && !out.structureConfirmed) out.structureConfirmed = true;

    return out;
  }, []);

  // 확정 상태 변경 시 즉시 저장
  useEffect(() => {
    const confirmedState = JSON.stringify({
      structureConfirmed: (state as any).structureConfirmed || false,
      l1Confirmed: (state as any).l1Confirmed || false,
      l2Confirmed: (state as any).l2Confirmed || false,
      l3Confirmed: (state as any).l3Confirmed || false,
      failureL1Confirmed: (state as any).failureL1Confirmed || false,
      failureL2Confirmed: (state as any).failureL2Confirmed || false,
      failureL3Confirmed: (state as any).failureL3Confirmed || false,
      failureLinkConfirmed: (state as any).failureLinkConfirmed || false,
    });

    // 초기화 시에는 저장하지 않음
    if (confirmedStateRef.current === '') {
      confirmedStateRef.current = confirmedState;
      return;
    }

    // 확정 상태가 변경되었을 때만 저장
    if (confirmedState !== confirmedStateRef.current) {
      confirmedStateRef.current = confirmedState;

      // 즉시 저장 (100ms 딜레이로 state 업데이트 대기)
      setTimeout(() => {
        saveToLocalStorage();
      }, 100);
    }
  }, [
    (state as any).structureConfirmed,
    (state as any).l1Confirmed,
    (state as any).l2Confirmed,
    (state as any).l3Confirmed,
    (state as any).failureL1Confirmed,
    (state as any).failureL2Confirmed,
    (state as any).failureL3Confirmed,
    (state as any).failureLinkConfirmed,
    saveToLocalStorage,
    fmeaType,
  ]);

  return {
    normalizeConfirmedFlags,
  };
}
