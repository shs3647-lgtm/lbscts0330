// @ts-nocheck
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

  // ✅ visibleSteps가 배열인지 확인 (안전한 기본값 처리)
  const visibleSteps = Array.isArray(state.visibleSteps) ? state.visibleSteps : [2, 3, 4, 5, 6];
  const isAllTab = state.tab === 'all';

  /**
   * 단계 토글 함수 - 직접 setState 호출
   */
  const toggleStep = useCallback((step: number) => {
    setState(prev => {
      const currentSteps = Array.isArray(prev.visibleSteps) ? prev.visibleSteps : [2, 3, 4, 5, 6];
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
   * 단계 버튼 클릭 핸들러 - 모든 탭에서 토글 동작
   * 6ST 클릭 시 5단계 + 6단계 함께 토글
   */
  const handleStepClick = useCallback((step: number) => {
    console.log(`[StepToggle] ${step}ST 클릭 - tab=${state.tab}, visible=[${visibleSteps.join(',')}]`);
    
    setState(prev => {
      const currentSteps = Array.isArray(prev.visibleSteps) ? prev.visibleSteps : [2, 3, 4, 5, 6];
      let newSteps: number[];
      
      // 6ST 클릭 시 5단계 + 6단계 함께 토글
      if (step === 6) {
        const hasBoth5And6 = currentSteps.includes(5) && currentSteps.includes(6);
        const hasOnly5 = currentSteps.includes(5) && !currentSteps.includes(6);
        const hasOnly6 = !currentSteps.includes(5) && currentSteps.includes(6);
        
        if (hasBoth5And6) {
          // [5, 6]이 모두 있으면 둘 다 제거 (단, 최소 1개는 유지)
          if (currentSteps.length === 2) {
            console.log(`[StepToggle] 최소 1개 필요 - 토글 취소`);
            return prev;
          }
          newSteps = currentSteps.filter(s => s !== 5 && s !== 6);
        } else if (hasOnly5 || hasOnly6) {
          // 5만 있거나 6만 있으면 [5, 6] 추가
          newSteps = [...new Set([...currentSteps, 5, 6])].sort((a, b) => a - b);
        } else {
          // 둘 다 없으면 [5, 6] 추가
          newSteps = [...currentSteps, 5, 6].sort((a, b) => a - b);
        }
        
        console.log(`[StepToggle] 6ST 클릭 → [5, 6] ${hasBoth5And6 ? '숨김' : '표시'} → [${newSteps.join(',')}]`);
      } else {
        // 2ST~5ST는 기존 토글 동작
        const isVisible = currentSteps.includes(step);
        
        // 최소 1개는 선택되어야 함
        if (isVisible && currentSteps.length === 1) {
          console.log(`[StepToggle] 최소 1개 필요 - 토글 취소`);
          return prev;
        }
        
        newSteps = isVisible
          ? currentSteps.filter(s => s !== step)
          : [...currentSteps, step].sort((a, b) => a - b);
        
        console.log(`[StepToggle] ${step}ST ${isVisible ? '숨김' : '표시'} → [${newSteps.join(',')}]`);
      }
      
      // ALL 탭이 아니면 ALL 탭으로 이동
      return { 
        ...prev, 
        tab: 'all', 
        levelView: 'all', 
        visibleSteps: newSteps 
      };
    });
  }, [state.tab, visibleSteps, setState]);

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
                isActive
                  ? STEP_TOGGLE_STYLES.button.active
                  : STEP_TOGGLE_STYLES.button.inactive
              }`}
              title={`${s.step}단계 ${isActive ? '숨기기' : '표시'}`}
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
          visibleSteps.length === 5
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

