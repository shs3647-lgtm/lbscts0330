/**
 * @file StepToggleButtons.tsx
 * @description 단계별 이동 버튼 (2~6단계 화면 이동)
 * @module step-toggle
 */

'use client';

import React, { useCallback } from 'react';
import { WorksheetState } from '../constants';
import { STEP_TOGGLE_STYLES } from './step-toggle/stepToggleStyles';

interface StepToggleButtonsProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  onAllClick?: () => void;
}

/**
 * 단계별 이동 버튼 메인 컴포넌트
 * - 클릭: 해당 단계 토글 (보이기/숨기기, 최소 1개 유지)
 * - ALL: 전체 단계 표시
 */
export default function StepToggleButtons({ state, setState, onAllClick }: StepToggleButtonsProps) {
  const steps = [
    { step: 2, label: '2ST' },
    { step: 3, label: '3ST' },
    { step: 4, label: '4ST' },
    { step: 5, label: '5ST' },
    { step: 6, label: '6ST' },
  ];

  /** 해당 단계 헤더로 스크롤 이동 */
  const scrollToStep = useCallback((step: number) => {
    requestAnimationFrame(() => {
      const target = document.querySelector(`[data-step-num="${step}"]`) as HTMLElement;
      if (!target) return;
      const container = document.getElementById('all-tab-scroll-wrapper');
      if (!container) return;
      const targetLeft = target.offsetLeft;
      const containerWidth = container.clientWidth;
      const targetWidth = target.offsetWidth;
      container.scrollTo({
        left: Math.max(0, targetLeft - (containerWidth - targetWidth) / 2),
        behavior: 'smooth',
      });
    });
  }, []);

  /**
   * 클릭 → 해당 단계 토글 (보이기/숨기기)
   * - 보이는 단계 클릭 → 숨기기 (최소 1개 유지)
   * - 숨겨진 단계 클릭 → 보이기 + 스크롤 이동
   * 예: 2ST 클릭 → [2] → 4ST 클릭 → [2, 4]
   */
  const handleStepClick = useCallback((step: number) => {
    // 트리뷰 등 패널 리셋 (ALL 탭 진입)
    onAllClick?.();

    setState(prev => {
      const current = Array.isArray(prev.visibleSteps) ? prev.visibleSteps : [2, 3, 4, 5, 6];
      const isAll = current.length === 5; // 전체 표시 상태

      if (isAll) {
        // 전체 표시 중 → 해당 단계만 표시
        return { ...prev, tab: 'all', levelView: 'all', visibleSteps: [step] };
      }

      if (current.includes(step)) {
        // 이미 보이는 단계 → 숨기기 (최소 1개 유지)
        if (current.length <= 1) return prev;
        return { ...prev, tab: 'all', levelView: 'all', visibleSteps: current.filter(s => s !== step) };
      } else {
        // 숨겨진 단계 → 추가
        const next = [...current, step].sort((a, b) => a - b);
        return { ...prev, tab: 'all', levelView: 'all', visibleSteps: next };
      }
    });

    setTimeout(() => scrollToStep(step), 100);
  }, [setState, scrollToStep, onAllClick]);

  /**
   * 전체보기 버튼 → ALL 탭 표시 (이미 ALL이면 전체 단계 리셋)
   * ★★★ 2026-02-22: SA 탭 복귀 토글 제거 — ALL에서 ALL 클릭 시 SA+트리뷰 이동 방지 ★★★
   */
  const handleAllClick = useCallback(() => {
    // activePanelId 리셋 (트리뷰 패널 숨기기)
    onAllClick?.();

    setState(prev => {
      if (prev.tab === 'all') {
        // ★ 이미 ALL 탭 → 전체 단계 표시로 리셋 (SA 탭 복귀 안 함)
        return { ...prev, visibleSteps: [2, 3, 4, 5, 6] };
      }
      // ALL이 아닌 탭에서 ALL 클릭 → ALL 이동
      return { ...prev, tab: 'all', levelView: 'all', visibleSteps: [2, 3, 4, 5, 6] };
    });
    requestAnimationFrame(() => {
      const container = document.getElementById('all-tab-scroll-wrapper');
      if (container) container.scrollTo({ left: 0, behavior: 'smooth' });
    });
  }, [setState, onAllClick]);

  const visibleSteps = Array.isArray(state.visibleSteps) ? state.visibleSteps : [2, 3, 4, 5, 6];
  const isAllVisible = visibleSteps.length === 5;

  return (
    <div className={STEP_TOGGLE_STYLES.container}>
      {/* 2ST~6ST 버튼 */}
      <div className={STEP_TOGGLE_STYLES.buttonGroup}>
        {steps.map(s => {
          const isVisible = visibleSteps.includes(s.step);
          return (
            <button
              key={s.step}
              onClick={() => handleStepClick(s.step)}
              className={`${STEP_TOGGLE_STYLES.button.base} ${
                isVisible && !isAllVisible
                  ? STEP_TOGGLE_STYLES.button.active
                  : STEP_TOGGLE_STYLES.button.inactive
              }`}
              style={!isVisible ? { opacity: 0.4, textDecoration: 'line-through' } : undefined}
              title="클릭: 보이기/숨기기"
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
          isAllVisible
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
