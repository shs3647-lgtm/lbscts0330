/**
 * @file SpecialCharBadge.tsx
 * @description 특별특성 배지 공통 컴포넌트 (2L/3L/고장분석 모든 화면에서 사용)
 * @version 1.0.0
 * 
 * 표준화된 디자인:
 * - 미지정: 주황색 점선 테두리 + 회색 텍스트
 * - 지정됨: 색상 배경 + 흰색 텍스트 + 아이콘 + 그림자
 */

'use client';

import React from 'react';

// 특별특성 데이터 — LBS (LB Semicon) 전용
export const SPECIAL_CHAR_DATA = [
  { symbol: '◇', meaning: 'LBS 공정관리 특별특성 (Process Control)', color: '#00838f', icon: '◇' },
  { symbol: '★', meaning: 'LBS 제품/공정 핵심 특별특성 (Critical)', color: '#e65100', icon: '★' },
  { symbol: '-', meaning: '해당없음 (N/A)', color: '#9e9e9e', icon: '' },
];

export interface SpecialCharBadgeProps {
  value: string;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 특별특성 배지 컴포넌트
 * - 표준화된 디자인으로 2L/3L 모든 화면에서 일관성 있게 사용
 */
const SpecialCharBadge = React.memo(function SpecialCharBadge({ value, onClick, size = 'md' }: SpecialCharBadgeProps) {
  const charData = SPECIAL_CHAR_DATA.find(d => d.symbol === value);
  
  // 크기별 스타일
  const sizeStyles = {
    sm: { fontSize: '10px', padding: '1px 4px', gap: '1px' },
    md: { fontSize: '11px', padding: '2px 6px', gap: '2px' },
    lg: { fontSize: '12px', padding: '3px 8px', gap: '3px' },
  };
  
  const style = sizeStyles[size];
  
  // 미지정 상태 - 빈 칸으로 표시 (클릭하면 선택 가능)
  if (!value) {
    return (
      <div 
        onClick={onClick} 
        className="cursor-pointer flex items-center justify-center h-full hover:bg-gray-100"
        style={{ padding: '4px', minHeight: '24px' }}
        title="클릭하여 특별특성 지정"
      >
        <span style={{ color: '#ccc', fontSize: '10px' }}>-</span>
      </div>
    );
  }
  
  // 지정됨 상태
  const bgColor = charData?.color || '#9e9e9e';
  const icon = charData?.icon || '';
  
  return (
    <div 
      onClick={onClick} 
      className="cursor-pointer flex items-center justify-center h-full"
      style={{ padding: '4px' }}
    >
      <span 
        style={{
          background: bgColor,
          color: 'white',
          padding: style.padding,
          borderRadius: '4px',
          fontSize: style.fontSize,
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: style.gap,
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
          border: `2px solid ${bgColor}`,
        }}
        title={charData?.meaning || value}
      >
        {icon && icon !== value && <span style={{ fontSize: '10px' }}>{icon}</span>}
        {value}
      </span>
    </div>
  );
});
export default SpecialCharBadge;

