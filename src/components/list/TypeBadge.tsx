/**
 * @file TypeBadge.tsx
 * @description TYPE 배지 공통 컴포넌트 (M/F/P)
 * @version 1.0.0
 * @created 2026-01-24
 */

import React from 'react';

export type ModuleTypeCode = 'M' | 'F' | 'P' | 'D';

interface TypeBadgeProps {
  typeCode: ModuleTypeCode;
  size?: 'sm' | 'md';
}

const TYPE_CONFIG: Record<ModuleTypeCode, { label: string; color: string }> = {
  'M': { label: 'Master', color: 'bg-purple-200 text-purple-700' },
  'F': { label: 'Family', color: 'bg-blue-200 text-blue-700' },
  'P': { label: 'Part', color: 'bg-green-200 text-green-700' },
  'D': { label: 'Design', color: 'bg-amber-200 text-amber-700' },
};

/**
 * ID에서 TYPE 코드 추출
 * pfm26-M001 → M, cp26-F001 → F
 */
export function extractTypeFromId(id: string, prefix: string = 'pfm'): ModuleTypeCode {
  const regex = new RegExp(`${prefix}\\d{2}-([MFPD])`, 'i');
  const match = id?.match(regex);
  return (match ? match[1].toUpperCase() : 'P') as ModuleTypeCode;
}

export default function TypeBadge({ typeCode, size = 'md' }: TypeBadgeProps) {
  const config = TYPE_CONFIG[typeCode] || TYPE_CONFIG['P'];
  const sizeClass = size === 'sm' ? 'px-0.5 py-0 text-[8px]' : 'px-1 py-0 text-[9px]';

  return (
    <span className={`rounded font-bold ${config.color} ${sizeClass}`}>
      {typeCode}
    </span>
  );
}
