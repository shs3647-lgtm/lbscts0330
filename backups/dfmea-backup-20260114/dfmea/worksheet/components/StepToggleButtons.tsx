/**
 * @file StepToggleButtons.tsx
 * @description 단계별 토글 버튼 (2~6단계 표시/숨김 제어)
 * @module step-toggle
 */

'use client';

import React, { useCallback } from 'react';
import { WorksheetState } from '../constants';
import { STEP_TOGGLE_STYLES } from './step-toggle/stepToggleStyles';

interface StepToggleButtonsProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
}

/**
 * 단계별 토글 버튼 메인 컴포넌트
 * @param state - 워크시트 상태
 * @param setState - 상태 업데이트 함수
 */
export default function StepToggleButtons({ state, setState }: StepToggleButtonsProps) {
  const steps = [
    { step: 2, label: '2ST' },
    { step: 3, label: '3ST' },
    { step: 4, label: '4ST' },
    { step: 5, label: '5ST' },
    { step: 6, label: '6ST' },
  ];

  const visibleSteps = state.visibleSteps || [2, 3, 4, 5, 6];
  const isAllTab = state.tab === 'all';

  /**
   * 단계 토글 함수 - 직접 setState 호출
   */
  const toggleStep = useCallback((step: number) => {
    setState(prev => {
      const currentSteps = prev.visibleSteps || [2, 3, 4, 5, 6];
      const isVisible = currentSteps.includes(step);
      
      // 최소 1개는 선택되어야 함
      if (isVisible && currentSteps.length === 1) {
        console.log(`[StepToggle] 최소 1개 필요 - 토글 취소`);
        return prev;
      }
      
      const newSteps = isVisible
        ? currentSteps.filter(s => s !== step)
        : [...currentSteps, step].sort((a, b) => a - b);
      
      console.log(`[StepToggle] ${step}ST ${isVisible ? '숨김' : '표시'} → [${newSteps.join(',')}]`);
      
      return { ...prev, visibleSteps: newSteps };
    });
  }, [setState]);

  /**
   * 단계 버튼 클릭 핸들러
   */
  const handleStepClick = useCallback((step: number) => {
    console.log(`[StepToggle] ${step}ST 클릭 - tab=${state.tab}, visible=[${visibleSteps.join(',')}]`);
    
    if (!isAllTab) {
      // ALL 탭이 아니면 먼저 ALL 탭으로 이동 + 해당 단계만 표시
      console.log(`[StepToggle] ALL 탭 이동 + ${step}ST만 표시`);
      setState(prev => ({ 
        ...prev, 
        tab: 'all', 
        levelView: 'all', 
        visibleSteps: [step]  // 클릭한 단계만 표시
      }));
    } else {
      // ALL 탭에서는 토글 동작
      toggleStep(step);
    }
  }, [state.tab, isAllTab, visibleSteps, setState, toggleStep]);

  /**
   * 전체보기 버튼 클릭 핸들러
   */
  const handleAllClick = useCallback(() => {
    console.log(`[StepToggle] ALL 클릭 - 전체 표시`);
    setState(prev => ({ 
      ...prev, 
      tab: 'all', 
      levelView: 'all', 
      visibleSteps: [2, 3, 4, 5, 6] 
    }));
  }, [setState]);

  return (
    <div className={STEP_TOGGLE_STYLES.container}>
      {/* 2ST~6ST 버튼 */}
      <div className={STEP_TOGGLE_STYLES.buttonGroup}>
        {steps.map(s => {
          const isActive = visibleSteps.includes(s.step);
          return (
            <button
              key={s.step}
              onClick={() => handleStepClick(s.step)}
              className={`${STEP_TOGGLE_STYLES.button.base} ${
                isAllTab && isActive
                  ? STEP_TOGGLE_STYLES.button.active
                  : STEP_TOGGLE_STYLES.button.inactive
              }`}
              title={isAllTab ? `${s.step}단계 ${isActive ? '숨기기' : '표시'}` : `${s.step}단계만 보기`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      
      {/* 구분선 */}
      <div className={STEP_TOGGLE_STYLES.divider} />

      {/* 전체보기 버튼 */}
      <button
        onClick={handleAllClick}
        className={`${STEP_TOGGLE_STYLES.button.base} ${
          isAllTab && visibleSteps.length === 5
            ? STEP_TOGGLE_STYLES.button.active
            : STEP_TOGGLE_STYLES.button.inactive
        }`}
        title="전체 단계 표시"
      >
        ALL
      </button>
    </div>
  );
}

