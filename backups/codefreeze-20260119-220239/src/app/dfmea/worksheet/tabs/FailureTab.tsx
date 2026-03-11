// @ts-nocheck
/**
 * @file FailureTab.tsx
 * @description FMEA 워크시트 - 고장분석(4단계) 탭
 */

'use client';

import React, { useState } from 'react';
import { WorksheetState, COLORS, FlatRow } from '../constants';
import { X, cell, cellCenter } from '@/styles/worksheet';

interface FailureTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  rows: FlatRow[];
  l1Spans: number[];
  l2Spans: number[];
  setDirty: (dirty: boolean) => void;
  handleInputBlur: () => void;
  handleInputKeyDown: (e: React.KeyboardEvent) => void;
  saveToLocalStorage: () => void;
}

// 색상 표준
const FAIL_COLORS = {
  l1Main: '#f57c00', l1Sub: '#ffb74d', l1Cell: '#fff3e0',
  l2Main: '#f57c00', l2Sub: '#ffb74d', l2Cell: '#fff3e0',
  l3Main: '#e65100', l3Sub: '#ff9800', l3Cell: '#fff3e0',
};

// 스타일 함수
const BORDER = `1px solid #ccc`;
const cellBase: React.CSSProperties = { border: BORDER, padding: '4px 6px', fontSize: '12px', verticalAlign: 'middle' };
const headerStyle = (bg: string, color = '#fff'): React.CSSProperties => ({ ...cellBase, background: bg, color, fontWeight: 700, textAlign: 'center' });
const stickyFirstColStyle: React.CSSProperties = { position: 'sticky', left: 0, zIndex: 10 };

function EditableCell({
  value, placeholder, bgColor, onChange, onBlur, onKeyDown,
}: {
  value: string; placeholder: string; bgColor: string; onChange: (val: string) => void; onBlur: () => void; onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => { onChange(editValue); onBlur(); setIsEditing(false); };

  if (isEditing) {
    return (
      <input
        type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); onKeyDown(e); }}
        autoFocus className="w-full px-1 border-none outline-2 outline-orange-500 bg-white rounded-sm text-xs h-[22px]"
      />
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-red-100 w-full h-full flex items-center min-h-[22px] text-xs"
      onClick={() => { setEditValue(value); setIsEditing(true); }}
      title="클릭하여 수정"
    >
      {value || <span className="text-[#999] italic">{placeholder}</span>}
    </div>
  );
}

function SeverityCell({ value, onChange, saveToLocalStorage }: { value: number | undefined; onChange: (val: number | undefined) => void; saveToLocalStorage: () => void; }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => { const newVal = e.target.value ? Number(e.target.value) : undefined; onChange(newVal); saveToLocalStorage(); }}
      className="w-full text-center border-0 outline-none bg-transparent text-xs font-bold h-6 cursor-pointer"
    >
      <option value="">-</option>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n} className={n >= 8 ? "font-bold text-orange-500" : ""}>{n}</option>)}
    </select>
  );
}

export function FailureColgroup() {
  return <colgroup><col className="w-[22%]" /><col className="w-[8%]" /><col className="w-[22%]" /><col className="w-[20%]" /><col className="w-[28%]" /></colgroup>;
}

export function FailureHeader() {
  return (
    <>
      <tr>
        <th colSpan={2} className={`sticky left-0 z-[15] ${X.h1} h-6`}>1. 고장영향(FE) / 심각도(S)</th>
        <th className={`${X.h1} h-6`}>2. 고장형태(FM)</th>
        <th colSpan={2} className="bg-[#e65100] text-white border border-[#ccc] p-1 h-6 font-black text-center text-xs">3. 고장원인(FC)</th>
      </tr>
      <tr>
        <th className={`sticky left-0 z-[15] ${X.h3} h-5.5`}>고장영향(FE)</th>
        <th className={`${X.h3} h-5.5 text-center`}>S</th>
        <th className={`${X.h3} h-5.5`}>고장형태(FM)</th>
        <th className="bg-[#ff9800] text-white border border-[#ccc] p-1 h-5.5 font-bold text-xs">작업요소</th>
        <th className="bg-[#ff9800] text-white border border-[#ccc] p-1 h-5.5 font-bold text-xs">고장원인(FC)</th>
      </tr>
    </>
  );
}

export function FailureRow({
  row, idx, l1Spans, l2Spans, state, setState, setDirty, handleInputBlur, handleInputKeyDown, saveToLocalStorage,
}: FailureTabProps & { row: FlatRow; idx: number }) {
  // 동적 배경색 (심각도 >= 8)
  const severityBg = row.l1Severity && Number(row.l1Severity) >= 8 ? 'bg-orange-100' : 'bg-orange-50';
  
  return (
    <>
      {l1Spans[idx] > 0 && (
        <td 
          rowSpan={l1Spans[idx]} 
          className="sticky left-0 z-[5] border border-[#ccc] p-0.5 px-1 bg-orange-50 align-middle break-words"
        >
          <EditableCell
            value={row.l1FailureEffect} placeholder="고장영향(FE) 입력" bgColor={FAIL_COLORS.l1Cell}
            onChange={(val) => { setState(prev => ({ ...prev, l1: { ...prev.l1, failureEffect: val } })); setDirty(true); }}
            onBlur={handleInputBlur} onKeyDown={handleInputKeyDown}
          />
        </td>
      )}
      {l1Spans[idx] > 0 && (
        <td rowSpan={l1Spans[idx]} className={`border border-[#ccc] p-0 ${severityBg} align-middle text-center`}>
          <SeverityCell value={row.l1Severity ? Number(row.l1Severity) : undefined} onChange={(val) => { setState(prev => ({ ...prev, l1: { ...prev.l1, severity: val } })); setDirty(true); }} saveToLocalStorage={saveToLocalStorage} />
        </td>
      )}
      {l2Spans[idx] > 0 && (
        <td rowSpan={l2Spans[idx]} className="border border-[#ccc] p-0.5 px-1 bg-orange-50 align-middle break-words">
          <EditableCell
            value={row.l2FailureMode} placeholder={`${row.l2No} ${row.l2Name} 고장형태`} bgColor={FAIL_COLORS.l2Cell}
            onChange={(val) => { setState(prev => ({ ...prev, l2: prev.l2.map(p => p.id === row.l2Id ? { ...p, failureMode: val } : p) })); setDirty(true); }}
            onBlur={handleInputBlur} onKeyDown={handleInputKeyDown}
          />
        </td>
      )}
      <td className="border border-[#ccc] p-0.5 px-1 bg-orange-50 text-xs text-center">
        <span className={`px-1 py-0.5 rounded text-[9px] font-semibold ${row.m4 === "MN" ? "bg-[#e3f2fd]" : row.m4 === "MC" ? "bg-[#fff3e0]" : row.m4 === "IM" ? "bg-[#e8f5e9]" : "bg-[#fce4ec]"}`}>[{row.m4}]</span>
        <span className="ml-1">{row.l3Name}</span>
      </td>
      <td className="border border-[#ccc] p-0.5 px-1 bg-orange-50 break-words">
        <EditableCell
          value={row.l3FailureCause} placeholder="고장원인(FC) 입력" bgColor={FAIL_COLORS.l3Cell}
          onChange={(val) => { setState(prev => ({ ...prev, l2: prev.l2.map(p => ({ ...p, l3: p.l3.map(w => w.id === row.l3Id ? { ...w, failureCause: val } : w) })) })); setDirty(true); }}
          onBlur={handleInputBlur} onKeyDown={handleInputKeyDown}
        />
      </td>
    </>
  );
}

export default function FailureTab(props: FailureTabProps) {
  const { rows } = props;
  return (
    <>
      <FailureColgroup />
      {/* 헤더 - 하단 2px 검은색 구분선 */}
      <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
        <FailureHeader />
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={5} className="text-center text-gray-400 py-8">구조분석 탭에서 데이터를 먼저 입력하세요.</td></tr>
        ) : (
          rows.map((row, idx) => (
            <tr key={`${row.l1TypeId}-${row.l2Id}-${row.l3Id}`} className={`h-7 ${idx % 2 === 1 ? "bg-[#ffe0b2]" : "bg-[#fff3e0]"}`}>
              <FailureRow {...props} row={row} idx={idx} />
            </tr>
          ))
        )}
      </tbody>
    </>
  );
}
