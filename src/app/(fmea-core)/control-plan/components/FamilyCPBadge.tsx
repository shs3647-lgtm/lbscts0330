/**
 * @file FamilyCPBadge.tsx
 * @description Family CP 배지 컴포넌트 — CP 리스트/등록에서 Family 그룹 표시
 * @created 2026-03-02
 */

'use client';

import React from 'react';

interface FamilyCPBadgeProps {
  variantNo: number | null;
  isBaseVariant: boolean;
  variantLabel?: string | null;
  size?: 'sm' | 'md';
}

/**
 * Family CP 배지
 * - Base CP: 파란색 "Base" 배지
 * - Variant CP: 회색 "V.{NN}" 배지 + 라벨
 */
export default function FamilyCPBadge({
  variantNo,
  isBaseVariant,
  variantLabel,
  size = 'sm',
}: FamilyCPBadgeProps) {
  if (variantNo == null) return null;

  const sizeClass = size === 'sm' ? 'text-[10px] px-1 py-0' : 'text-xs px-1.5 py-0.5';

  if (isBaseVariant) {
    return (
      <span
        className={`inline-flex items-center ${sizeClass} font-medium rounded bg-blue-100 text-blue-700 border border-blue-200`}
        title="Base CP (기본 관리계획서)"
      >
        Base
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${sizeClass} font-medium rounded bg-gray-100 text-gray-600 border border-gray-200`}
      title={variantLabel || `Variant ${variantNo}`}
    >
      V.{String(variantNo).padStart(2, '0')}
      {variantLabel && (
        <span className="text-gray-400 ml-0.5 truncate max-w-[60px]">{variantLabel}</span>
      )}
    </span>
  );
}
