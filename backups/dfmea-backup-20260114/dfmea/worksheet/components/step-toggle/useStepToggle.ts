/**
 * @file useStepToggle.ts
 * @description 단계별 토글 로직 Hook (공용)
 */

import React from 'react';
import { WorksheetState } from '../../constants';

interface UseStepToggleProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
}

interface UseStepToggleReturn {
  visibleSteps: number[];
  toggleStep: (step: number) => void;
  showAllSteps: () => void;
  isAllVisible: boolean;
}

/**
 * 단계별 토글 로직 Hook
 * @param state - 워크시트 상태
 * @param setState - 상태 업데이트 함수
 * @returns 토글 관련 함수 및 상태
 */
export function useStepToggle({ state, setState }: UseStepToggleProps): UseStepToggleReturn {
  const visibleSteps = state.visibleSteps || [2, 3, 4, 5, 6];
  const isAllVisible = visibleSteps.length === 5;

  /**
   * 단계 토글 함수
   * @param step - 토글할 단계 (2~6)
   */
  const toggleStep = (step: number) => {
    setState(prev => {
      const currentSteps = prev.visibleSteps || [2, 3, 4, 5, 6];
      const isVisible = currentSteps.includes(step);
      
      // 최소 1개는 선택되어야 함
      if (isVisible && currentSteps.length === 1) {
        console.log(`[StepToggle] 최소 1개는 선택되어야 합니다. (현재: ${step}만 선택됨)`);
        return prev;
      }
      
      const newSteps = isVisible
        ? currentSteps.filter(s => s !== step)
        : [...currentSteps, step].sort((a, b) => a - b);
      
      console.log(`[StepToggle] ${step}단계 ${isVisible ? '숨김' : '표시'} → visibleSteps: [${newSteps.join(', ')}]`);
      
      return { ...prev, visibleSteps: newSteps };
    });
  };

  /**
   * 모든 단계 표시 함수
   */
  const showAllSteps = () => {
    setState(prev => ({ ...prev, visibleSteps: [2, 3, 4, 5, 6] }));
  };

  return {
    visibleSteps,
    toggleStep,
    showAllSteps,
    isAllVisible,
  };
}

