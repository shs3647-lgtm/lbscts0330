/**
 * @file StepBadge.tsx
 * @description 단계 배지 공통 컴포넌트
 * @version 1.0.0
 * @created 2026-01-24
 */

import React from 'react';

interface StepBadgeProps {
  step?: number;
  maxSteps?: 5 | 7;  // APQP: 5단계, FMEA: 7단계
}

const STEP_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-gray-100', text: 'text-gray-600' },
  2: { bg: 'bg-blue-100', text: 'text-blue-700' },
  3: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  4: { bg: 'bg-amber-100', text: 'text-amber-700' },
  5: { bg: 'bg-orange-100', text: 'text-orange-700' },
  6: { bg: 'bg-green-100', text: 'text-green-700' },
  7: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export default function StepBadge({ step = 1, maxSteps = 7 }: StepBadgeProps) {
  const stepNum = Math.min(Math.max(step, 1), maxSteps);
  const { bg, text } = STEP_COLORS[stepNum] || STEP_COLORS[1];

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${bg} ${text} border border-gray-300 whitespace-nowrap`}>
      {stepNum}단계
    </span>
  );
}
