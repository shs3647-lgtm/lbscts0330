/**
 * @file FailureTab.tsx
 * @description FMEA 워크시트 - 고장분석(4단계) 탭
 */

'use client';

import React, { useState } from 'react';
import { WorksheetState, COLORS, FlatRow } from '../constants';
import { 
  failureHeaderStyle, 
  failureDataCell, 
  editableCellContainer, 
  severitySelectStyle, 
  m4BadgeStyle, 
  failureRowStyle, 
  stickyFirstCol,
  failureStickyHeader
} from './FailureTabStyles';

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
      className="cursor-pointer hover:bg-red-100 w-full h-full flex items-center"
      onClick={() => { setEditValue(value); setIsEditing(true); }}
      style={editableCellContainer}
      title="클릭하여 수정"
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
    </div>
  );
}

function SeverityCell({ value, onChange, saveToLocalStorage }: { value: number | undefined; onChange: (val: number | undefined) => void; saveToLocalStorage: () => void; }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => { const newVal = e.target.value ? Number(e.target.value) : undefined; onChange(newVal); saveToLocalStorage(); }}
      className="w-full text-center"
      style={severitySelectStyle}
    >
      <option value="">-</option>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <option key={n} value={n} className={n >= 8 ? 'font-bold text-orange-500' : ''}>
          {n}
        </option>
      ))}
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
        <th colSpan={2} style={failureHeaderStyle(FAIL_COLORS.l1Main, { position: 'sticky', left: 0, zIndex: 15 })}>1. 고장영향(FE) / 심각도(S)</th>
        <th style={failureHeaderStyle(FAIL_COLORS.l2Main)}>2. 고장형태(FM)</th>
        <th colSpan={2} style={failureHeaderStyle(FAIL_COLORS.l3Main)}>3. 고장원인(FC)</th>
      </tr>
      <tr>
        <th style={failureHeaderStyle(FAIL_COLORS.l1Sub, { position: 'sticky', left: 0, zIndex: 15, height: '22px', fontWeight: 700 })}>고장영향(FE)</th>
        <th style={failureHeaderStyle(FAIL_COLORS.l1Sub, { height: '22px', fontWeight: 700 })}>S</th>
        <th style={failureHeaderStyle(FAIL_COLORS.l2Sub, { height: '22px', fontWeight: 700 })}>고장형태(FM)</th>
        <th style={failureHeaderStyle(FAIL_COLORS.l3Sub, { height: '22px', fontWeight: 700 })}>작업요소</th>
        <th style={failureHeaderStyle(FAIL_COLORS.l3Sub, { height: '22px', fontWeight: 700 })}>고장원인(FC)</th>
      </tr>
    </>
  );
}

export function FailureRow({
  row, idx, l1Spans, l2Spans, state, setState, setDirty, handleInputBlur, handleInputKeyDown, saveToLocalStorage,
}: FailureTabProps & { row: FlatRow; idx: number }) {
  return (
    <>
      {l1Spans[idx] > 0 && (
        <td 
          rowSpan={l1Spans[idx]} 
          style={failureDataCell(FAIL_COLORS.l1Cell, { position: 'sticky', left: 0, zIndex: 5, wordBreak: 'break-word' })}
        >
          <EditableCell
            value={row.l1FailureEffect} placeholder="고장영향(FE) 입력" bgColor={FAIL_COLORS.l1Cell}
            onChange={(val) => { setState(prev => ({ ...prev, l1: { ...prev.l1, failureEffect: val } })); setDirty(true); }}
            onBlur={handleInputBlur} onKeyDown={handleInputKeyDown}
          />
        </td>
      )}
      {l1Spans[idx] > 0 && (
        <td rowSpan={l1Spans[idx]} style={failureDataCell(row.l1Severity && Number(row.l1Severity) >= 8 ? '#ffe0b2' : FAIL_COLORS.l1Cell, { textAlign: 'center' })}>
          <SeverityCell value={row.l1Severity ? Number(row.l1Severity) : undefined} onChange={(val) => { setState(prev => ({ ...prev, l1: { ...prev.l1, severity: val } })); setDirty(true); }} saveToLocalStorage={saveToLocalStorage} />
        </td>
      )}
      {l2Spans[idx] > 0 && (
        <td rowSpan={l2Spans[idx]} style={failureDataCell(FAIL_COLORS.l2Cell, { wordBreak: 'break-word' })}>
          <EditableCell
            value={row.l2FailureMode} placeholder={`${row.l2No} ${row.l2Name} 고장형태`} bgColor={FAIL_COLORS.l2Cell}
            onChange={(val) => { setState(prev => ({ ...prev, l2: prev.l2.map(p => p.id === row.l2Id ? { ...p, failureMode: val } : p) })); setDirty(true); }}
            onBlur={handleInputBlur} onKeyDown={handleInputKeyDown}
          />
        </td>
      )}
      <td style={failureDataCell(FAIL_COLORS.l3Cell, { textAlign: 'center', fontSize: '12px' })}>
        <span style={m4BadgeStyle(row.m4)}>[{row.m4}]</span>
        <span className="ml-1">{row.l3Name}</span>
      </td>
      <td style={failureDataCell(FAIL_COLORS.l3Cell, { wordBreak: 'break-word' })}>
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
      <thead style={failureStickyHeader}>
        <FailureHeader />
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={5} className="text-center text-gray-400 py-8">구조분석 탭에서 데이터를 먼저 입력하세요.</td></tr>
        ) : (
          rows.map((row, idx) => (
            <tr key={`${row.l1TypeId}-${row.l2Id}-${row.l3Id}`} style={failureRowStyle(idx % 2 === 1 ? '#ffe0b2' : '#fff3e0')}>
              <FailureRow {...props} row={row} idx={idx} />
            </tr>
          ))
        )}
      </tbody>
    </>
  );
}
