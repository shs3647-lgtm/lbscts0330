/**
 * @file ChartCard.tsx
 * @description 차트 카드 컴포넌트 (공통 래퍼)
 */

'use client';

import React from 'react';

interface ChartCardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}

export function ChartCard({ title, icon, children, className = '', accentColor = '#0ea5e9' }: ChartCardProps) {
  return (
    <div 
      className={`
        relative bg-white rounded-lg shadow-md overflow-hidden
        border border-slate-200/50
        transition-all duration-200 hover:shadow-lg
        ${className}
      `}
    >
      {/* 상단 액센트 라인 */}
      <div 
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: accentColor }}
      />
      
      {/* 헤더 - 컴팩트 */}
      <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 border-b border-slate-100">
        {icon && <span className="text-sm">{icon}</span>}
        <h3 className="text-xs font-bold text-slate-600 tracking-tight">
          {title}
        </h3>
      </div>
      
      {/* 차트 영역 - 최대화 */}
      <div className="p-2 h-[calc(100%-32px)]">
        {children}
      </div>
    </div>
  );
}

