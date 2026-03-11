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

// 특별특성 데이터 (색상 및 아이콘)
// 제품특별특성: 주황색 계열, 공정특별특성: 파란색 계열
export const SPECIAL_CHAR_DATA = [
  // 제품특별특성 (Product) - 주황색 계열
  { symbol: 'CC', meaning: 'Critical Characteristic (치명 특성)', color: '#d32f2f', icon: '🔴' },
  { symbol: 'SC', meaning: 'Significant Characteristic (중요 특성)', color: '#f57c00', icon: '🟠' },
  { symbol: 'HC', meaning: 'High Characteristic (높은 특성)', color: '#fbc02d', icon: '🟡' },
  // 공정특별특성 (Process) - 파란색 계열
  { symbol: 'PC', meaning: 'Process Characteristic (공정 특성)', color: '#1565c0', icon: '🔵' },
  { symbol: 'IC', meaning: 'Important Characteristic (중요 공정특성)', color: '#f57c00', icon: '🟠' },
  { symbol: 'QC', meaning: 'Quality Characteristic (품질 특성)', color: '#42a5f5', icon: '🔵' },
  // 공통
  { symbol: 'F', meaning: 'Fit (적합)', color: '#388e3c', icon: '🟢' },
  { symbol: 'S', meaning: 'Safety (안전)', color: '#1976d2', icon: '🔵' },
  { symbol: 'R', meaning: 'Regulatory (규제)', color: '#7b1fa2', icon: '🟣' },
  { symbol: 'N/A', meaning: 'Not Applicable', color: '#9e9e9e', icon: '⚪' },
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
export default function SpecialCharBadge({ value, onClick, size = 'md' }: SpecialCharBadgeProps) {
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
        {icon && <span style={{ fontSize: '10px' }}>{icon}</span>}
        {value}
      </span>
    </div>
  );
}

