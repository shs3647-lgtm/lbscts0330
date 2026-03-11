/**
 * @file fmea-core/hooks/useStepToggle.ts
 * @description 단계별 토글 공용 훅 (2ST~6ST)
 */

import { useCallback } from 'react';
import type { WorksheetState, SetState } from '../types';

export interface UseStepToggleOptions {
  state: WorksheetState;
  setState: SetState<WorksheetState>;
  defaultSteps?: number[];
}

export interface UseStepToggleResult {
  visibleSteps: number[];
  isStepVisible: (step: number) => boolean;
  toggleStep: (step: number) => void;
  showOnly: (step: number) => void;
  showAll: () => void;
}

const DEFAULT_STEPS = [2, 3, 4, 5, 6];

export const useStepToggle = (options: UseStepToggleOptions): UseStepToggleResult => {
  const { state, setState, defaultSteps = DEFAULT_STEPS } = options;
  
  const visibleSteps = state.visibleSteps || defaultSteps;

  const isStepVisible = useCallback((step: number): boolean => {
    return visibleSteps.includes(step);
  }, [visibleSteps]);

  const toggleStep = useCallback((step: number): void => {
    setState((prev) => {
      const currentSteps = prev.visibleSteps || defaultSteps;
      const isVisible = currentSteps.includes(step);
      
      // 최소 1개는 유지
      if (isVisible && currentSteps.length === 1) {
        return prev;
      }
      
      const newSteps = isVisible
        ? currentSteps.filter((s) => s !== step)
        : [...currentSteps, step].sort((a, b) => a - b);
      
      return { ...prev, visibleSteps: newSteps };
    });
  }, [setState, defaultSteps]);

  const showOnly = useCallback((step: number): void => {
    setState((prev) => ({
      ...prev,
      tab: 'all',
      levelView: 'all',
      visibleSteps: [step],
    }));
  }, [setState]);

  const showAll = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      visibleSteps: defaultSteps,
    }));
  }, [setState, defaultSteps]);

  return {
    visibleSteps,
    isStepVisible,
    toggleStep,
    showOnly,
    showAll,
  };
};



