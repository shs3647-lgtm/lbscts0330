/**
 * @file StepBadge.tsx
 * @description 단계 배지 공통 컴포넌트
 * @version 2.0.0
 * @updated 2026-04-03 — 6단계 FMEA 워크시트 연동 (confirmed 기반)
 *
 * FMEA 6단계:
 *   1단계: FMEA 등록
 *   2단계: 구조분석 (구조+기능분석 확정)
 *   3단계: 고장사슬분석 (고장분석+고장연결 확정)
 *   4단계: ALL — 위험분석 확정
 *   5단계: ALL — 최적화 확정
 *   6단계: 완료 (전체 확정)
 */

import React from 'react';

interface StepBadgeProps {
  step?: number;
  maxSteps?: 5 | 6 | 7;
}

const STEP_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },
  2: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  3: { bg: '#cffafe', text: '#0e7490', border: '#67e8f9' },
  4: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  5: { bg: '#fed7aa', text: '#c2410c', border: '#fdba74' },
  6: { bg: '#d1fae5', text: '#047857', border: '#6ee7b7' },
  7: { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' },
};

const FMEA_STEP_LABELS: Record<number, string> = {
  1: '등록',
  2: '구조',
  3: '고장',
  4: '위험',
  5: '최적화',
  6: '완료',
};

export default function StepBadge({ step = 1, maxSteps = 6 }: StepBadgeProps) {
  const stepNum = Math.min(Math.max(step, 1), maxSteps);
  const { bg, text, border } = STEP_COLORS[stepNum] || STEP_COLORS[1];
  const label = maxSteps === 6 ? FMEA_STEP_LABELS[stepNum] : undefined;

  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
      style={{ background: bg, color: text, border: `1px solid ${border}` }}
    >
      {stepNum}
      {label && <span className="text-[8px] font-semibold opacity-80">{label}</span>}
    </span>
  );
}
