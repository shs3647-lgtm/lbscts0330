/**
 * @file VerificationDropdown.tsx
 * @description 고장연결검증 모드 선택 드롭다운 (AllTabEmpty 내 인라인 → TabMenu로 이동됨, 미사용)
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { VerificationMode } from './types';

interface VerificationDropdownProps {
  mode: VerificationMode;
  onModeChange: (mode: VerificationMode) => void;
  feCount: number;
  fmCount: number;
  fcCount: number;
}

const MENU_ITEMS: { value: 'FE' | 'FM' | 'FC'; label: string; desc: string; color: string; bg: string }[] = [
  { value: 'FE', label: '1L영향(FE)', desc: '구분→완제품기능→요구사항→FE', color: '#1976d2', bg: '#e3f2fd' },
  { value: 'FM', label: '2L형태(FM)', desc: '공정→설계기능→설계특성→FM', color: '#388e3c', bg: '#e8f5e9' },
  { value: 'FC', label: '3L원인(FC)', desc: '공정→4M+부품(컴포넌트)→기능→FC', color: '#f57c00', bg: '#fff3e0' },
];

export function VerificationDropdown({ mode, onModeChange, feCount, fmCount, fcCount }: VerificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const counts: Record<string, number> = { FE: feCount, FM: fmCount, FC: fcCount };
  const activeItem = MENU_ITEMS.find(m => m.value === mode);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={mode && activeItem ? {
          background: activeItem.color, color: '#fff', border: `2px solid ${activeItem.color}`,
        } : {
          background: '#1e3a5f', color: '#fff', border: '2px solid #1e3a5f',
        }}
        className="px-4 py-1 text-[12px] font-bold rounded transition-colors hover:opacity-90"
      >
        {mode ? `검증: ${activeItem?.label}` : '역전개 검증'} ▼
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white border-2 border-blue-400 rounded-lg shadow-xl z-30 min-w-[240px]">
          {/* 검증 해제 */}
          {mode && (
            <button
              onClick={() => { onModeChange(null); setIsOpen(false); }}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-100 border-b border-gray-200 text-gray-600 font-semibold"
            >
              전체보기 (검증 해제)
            </button>
          )}
          {MENU_ITEMS.map(item => (
            <button
              key={item.value}
              onClick={() => { onModeChange(item.value); setIsOpen(false); }}
              style={mode === item.value ? { background: item.bg, borderLeft: `4px solid ${item.color}` } : { borderLeft: '4px solid transparent' }}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <span style={{ color: item.color, fontWeight: 700 }}>{item.label}</span>
                <div className="text-[10px] text-gray-400 mt-0.5">{item.desc}</div>
              </div>
              <span style={{ color: item.color }} className="font-bold text-[11px]">{counts[item.value]}건</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
