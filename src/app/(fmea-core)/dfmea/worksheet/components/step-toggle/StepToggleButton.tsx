/**
 * @file StepToggleButton.tsx
 * @description 개별 단계 토글 버튼 컴포넌트 (재사용 가능)
 */

'use client';

import React from 'react';
import { STEP_TOGGLE_STYLES } from './stepToggleStyles';

interface StepToggleButtonProps {
  step: number;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

/**
 * 개별 단계 토글 버튼 컴포넌트
 * @param step - 단계 번호 (2~6)
 * @param label - 버튼 라벨 (예: '2ST')
 * @param isActive - 활성 상태
 * @param onClick - 클릭 핸들러
 */
export default function StepToggleButton({
  step,
  label,
  isActive,
  onClick,
}: StepToggleButtonProps) {
  const buttonClasses = `${STEP_TOGGLE_STYLES.button.base} ${
    isActive
      ? STEP_TOGGLE_STYLES.button.active
      : STEP_TOGGLE_STYLES.button.inactive
  }`;

  return (
    <button
      onClick={onClick}
      className={buttonClasses}
    >
      {label}
    </button>
  );
}

