/**
 * @file CPStepBadge.tsx
 * @description CP 단계 배지 컴포넌트 (1~5단계)
 * @version 1.0.1
 * @created 2026-01-24
 * 
 * CP 단계:
 * - 1단계: 등록
 * - 2단계: 공정현황
 * - 3단계: 관리항목
 * - 4단계: 관리방법
 * - 5단계: 조치방법
 */

import React from 'react';

export interface CPStepBadgeProps {
  step?: number;
  onClick?: () => void;
  showName?: boolean;
  isApproved?: boolean;  // 결재 승인 완료 여부
}

export const CP_STEPS = [
  { step: 1, name: '등록(Register)', color: 'bg-gray-100 text-gray-600 border-gray-300' },
  { step: 2, name: '공정현황(Process)', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { step: 3, name: '관리항목(Control Item)', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { step: 4, name: '관리방법(Control Method)', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { step: 5, name: '조치방법(Reaction)', color: 'bg-blue-100 text-blue-700 border-blue-300' },
];

// 완료 상태 (승인 후 표시)
export const CP_COMPLETE = { step: 0, name: '완료(Complete)', color: 'bg-green-500 text-white border-green-600' };

export function getStepName(step: number): string {
  const found = CP_STEPS.find(s => s.step === step);
  return found?.name || '등록(Register)';
}

export function getStepColor(step: number): string {
  const found = CP_STEPS.find(s => s.step === step);
  return found?.color || 'bg-gray-100 text-gray-600 border-gray-300';
}

export default function CPStepBadge({ step = 1, onClick, showName = true, isApproved = false }: CPStepBadgeProps) {
  // 5단계 완료 + 승인되면 완료 표시
  if (step >= 5 && isApproved) {
    return (
      <span
        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap ${CP_COMPLETE.color} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={onClick}
        title="결재 승인 완료"
      >
        {showName ? '✓ 완료(Complete)' : '완료(Complete)'}
      </span>
    );
  }

  const stepNum = Math.min(Math.max(step, 1), 5);
  const stepInfo = CP_STEPS.find(s => s.step === stepNum) || CP_STEPS[0];

  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap ${stepInfo.color} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onClick}
      title={`${stepNum}단계: ${stepInfo.name}`}
    >
      {showName ? `${stepNum}. ${stepInfo.name}` : `${stepNum}단계`}
    </span>
  );
}
