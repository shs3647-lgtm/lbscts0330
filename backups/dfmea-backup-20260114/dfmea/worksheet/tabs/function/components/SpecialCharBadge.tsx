/**
 * @file SpecialCharBadge.tsx
 * @description 특별특성 배지 컴포넌트
 */

'use client';

import React from 'react';
import { SPECIAL_CHAR_DATA } from '@/components/modals/SpecialCharSelectModal';
import { specialCharButtonStyle } from '../FunctionTabStyles';

interface SpecialCharBadgeProps {
  value: string;
  onClick: () => void;
}

/**
 * 특별특성 배지 컴포넌트
 */
export default function SpecialCharBadge({ value, onClick }: SpecialCharBadgeProps) {
  const charData = SPECIAL_CHAR_DATA.find(d => d.symbol === value);
  
  if (!value) {
    return (
      <button 
        onClick={onClick} 
        className="w-full py-1 px-2 bg-gray-100 border border-dashed border-gray-400 rounded text-xs text-gray-400 font-semibold cursor-pointer"
      >
        - 미지정
      </button>
    );
  }

  const bgColor = charData?.color || '#e0e0e0';
  
  return (
    <button
      onClick={onClick}
      className="py-1 px-1.5 text-white border-none rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
      style={specialCharButtonStyle(bgColor)}
      title={charData?.meaning || value}
    >
      {value}
    </button>
  );
}



