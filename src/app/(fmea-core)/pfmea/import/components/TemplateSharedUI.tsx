/**
 * @file TemplateSharedUI.tsx
 * @description TemplateGeneratorPanel 공유 상수 + 유틸 컴포넌트
 * - CSS 클래스 상수, 4M 라벨/배지, NumSelect, TabBtn, EditCell, DataStatusBar
 * @created 2026-02-26
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { ImportedFlatData } from '../types';
import { fmeaIdToBdId } from '../utils/bd-id';

// ─── CSS 클래스 상수 ───

export const SELECT_CLS = 'px-1.5 py-0.5 border border-gray-300 rounded text-[11px] bg-white';
export const LABEL_CLS = 'text-[11px] text-blue-700 font-bold whitespace-nowrap';
export const SECTION_CLS = 'flex items-center gap-1';
export const TH = 'border border-gray-300 px-1 py-0.5 text-[9px] font-semibold text-center bg-blue-50 whitespace-nowrap text-blue-700';
export const TD_NO = 'border border-gray-200 px-0.5 py-0.5 text-[8px] text-center text-gray-400 bg-gray-50/50';
export const TD = 'border border-gray-200 px-1 py-0.5 text-[9px] leading-tight';
export const TD_EDIT = 'border border-blue-200 px-1 py-0.5 text-[9px] leading-tight cursor-text hover:bg-blue-50/40';

export const M4_LABEL: Record<string, string> = {
  MN: 'text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded',
  MC: 'text-blue-700 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded',
  IM: 'text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded',
  EN: 'text-pink-700 bg-pink-100 border border-pink-300 px-1.5 py-0.5 rounded',
};

export const M4_BADGE: Record<string, string> = {
  MN: 'bg-red-50 text-red-600',
  MC: 'bg-blue-50 text-blue-600',
  IM: 'bg-amber-50 text-amber-600',
  EN: 'bg-pink-50 text-pink-600',
};

// ─── 유틸 컴포넌트 ───

export function NumSelect({ value, options, onChange, disabled }: { value: number; options: number[]; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))} disabled={disabled}
      className={`${SELECT_CLS} ${disabled ? 'opacity-40 cursor-not-allowed bg-gray-100' : ''}`}>
      {options.map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

export function TabBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 text-[12px] cursor-pointer transition-colors ${
        active ? 'font-bold text-blue-700 bg-blue-50 border-b-2 border-blue-600' : 'font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-600 hover:bg-white/60'
      }`}>
      {label}
    </button>
  );
}

/** 인라인 편집 셀 */
export function EditCell({ value, itemId, onSave, editing: editMode, onCreateNew }: {
  value: string; itemId?: string; onSave?: (id: string, val: string) => void; editing: boolean;
  onCreateNew?: (val: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);

  const canEdit = editMode && (itemId ? !!onSave : !!onCreateNew);
  if (!canEdit) {
    return <>{value || <span className="text-gray-300">-</span>}</>;
  }
  if (!active) {
    const isMissing = !itemId && !!onCreateNew;
    return (
      <span onClick={() => setActive(true)}
        className={`block min-h-[14px] cursor-text ${isMissing ? 'bg-orange-50/50 border border-dashed border-orange-300 rounded px-0.5' : ''}`}>
        {value || <span className={isMissing ? 'text-orange-400 text-[9px]' : 'text-gray-300'}>
          {isMissing ? '클릭하여 입력' : '-'}
        </span>}
      </span>
    );
  }
  const commit = () => {
    if (itemId && onSave && val !== value) onSave(itemId, val);
    else if (!itemId && onCreateNew && val.trim()) onCreateNew(val);
    setActive(false);
  };
  return (
    <input value={val} onChange={e => setVal(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setActive(false); }}}
      autoFocus className={`w-full px-0.5 py-0 text-[10px] border outline-none ${!itemId ? 'border-orange-400 bg-orange-50/50' : 'border-blue-400 bg-blue-50/50'}`} />
  );
}

// ─── 데이터 현황 바 ───

export function DataStatusBar({ flatData, showApplied, bdFmeaId, bdFmeaName }: {
  flatData: ImportedFlatData[];
  showApplied?: boolean;
  bdFmeaId?: string;
  bdFmeaName?: string;
}) {
  const processCount = new Set(flatData.filter(d => d.category === 'A' && d.processNo && d.processNo !== '00' && d.processNo !== '공통').map(d => d.processNo)).size;
  const sheetCount = new Set(flatData.map(d => d.itemCode)).size;
  const dataCount = flatData.filter(d => d.value?.trim()).length;
  const displayBdId = bdFmeaId ? fmeaIdToBdId(bdFmeaId) : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-2">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px]">
        <b className="text-blue-700">{processCount}</b><span className="text-blue-500">공정</span>
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px]">
        <b className="text-blue-700">{sheetCount}</b><span className="text-blue-500">시트</span>
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px]">
        <b className="text-blue-700">{dataCount}</b><span className="text-blue-500">데이터</span>
      </span>
      {showApplied && (
        <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">편집 가능</span>
      )}
      {displayBdId && (
        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5">
          <span className="font-mono font-bold text-indigo-600">{displayBdId}</span>
          {bdFmeaName && <span className="text-gray-500 truncate max-w-[160px]">({bdFmeaName})</span>}
        </span>
      )}
    </div>
  );
}
