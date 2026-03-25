/**
 * @file ImportVerifyBadge.tsx
 * @description Import 데이터 대비 현재 워크시트 카운트 비교 뱃지
 */

'use client';

import React from 'react';

interface ImportVerifyBadgeProps {
  label: string;
  importCount: number;
  currentCount: number;
  /** Import 데이터가 로드되었는지 */
  loaded: boolean;
}

export function ImportVerifyBadge({ label, importCount, currentCount, loaded }: ImportVerifyBadgeProps) {
  // ★ 2026-03-05: 뱃지 숨김 — 정보는 title tooltip으로만 제공
  return null;
  // eslint-disable-next-line no-unreachable
  if (!loaded || importCount === 0) return null;

  const diff = currentCount - importCount;
  const isMatch = diff === 0;

  if (isMatch) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0 rounded bg-emerald-100 text-emerald-700 border border-emerald-300 whitespace-nowrap"
        title={`${label}: Import ${importCount} = 현재 ${currentCount} (일치)`}
      >
        I:{importCount}
      </span>
    );
  }

  const isOver = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0 rounded whitespace-nowrap border ${
        isOver
          ? 'bg-blue-50 text-blue-700 border-blue-300'
          : 'bg-amber-50 text-amber-700 border-amber-300'
      }`}
      title={`${label}: Import ${importCount} → 현재 ${currentCount} (${isOver ? '+' : ''}${diff})`}
    >
      I:{importCount}{isOver ? `+${diff}` : `${diff}`}
    </span>
  );
}

export default ImportVerifyBadge;
