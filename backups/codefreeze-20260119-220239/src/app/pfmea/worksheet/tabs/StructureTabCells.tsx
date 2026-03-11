// @ts-nocheck
/**
 * @file StructureTabCells.tsx
 * @description 구조분석 탭 - 편집 가능한 셀 컴포넌트
 * @created 2026-01-19 (StructureTab.tsx에서 분리)
 */

'use client';

import React, { useState, useRef } from 'react';
import { WorksheetState } from '../constants';
import { cell } from '@/styles/worksheet';

// 4M 옵션
export const M4_OPTIONS = [
  { value: 'MN', label: 'MN (인)', color: '#e3f2fd' },
  { value: 'MC', label: 'MC (기계)', color: '#fff3e0' },
  { value: 'IM', label: 'IM (재료)', color: '#e8f5e9' },
  { value: 'MT', label: 'MT (방법)', color: '#fce4ec' },
];

// ========== 4M 셀 ==========
interface EditableM4CellProps {
  value: string;
  zebraBg: string;
  weId: string;
  l2Id: string;
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: () => void;
  saveAtomicDB?: (force?: boolean) => Promise<void>;
  isConfirmed?: boolean;
}

export function EditableM4Cell({ 
  value, zebraBg, weId, l2Id, state, setState, setDirty, saveToLocalStorage, saveAtomicDB, isConfirmed 
}: EditableM4CellProps) {
  const handleChange = (newValue: string) => {
    setState(prev => ({
      ...prev,
      l2: prev.l2.map(proc => ({
        ...proc,
        l3: proc.l3.map(we => we.id === weId ? { ...we, m4: newValue } : we)
      }))
    }));
    setDirty(true);
    // ✅ localStorage + DB 저장
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try { await saveAtomicDB(); } catch (e) { console.error('[StructureTab] M4 변경 DB 저장 오류:', e); }
      }
    }, 100);
  };

  const currentOption = M4_OPTIONS.find(opt => opt.value === value);
  const bgColor = currentOption?.color || zebraBg;

  return (
    <td className={`${cell} w-20 max-w-[80px] min-w-[80px] text-center`} style={{ background: bgColor, padding: '2px' }}>
      {isConfirmed ? (
        <span className="font-bold text-blue-800">{value || '-'}</span>
      ) : (
        <select
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-1 py-1 text-xs font-bold text-center border-0 rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
          style={{ background: 'transparent' }}
        >
          <option value="">선택</option>
          {M4_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.value}</option>
          ))}
        </select>
      )}
    </td>
  );
}

// ========== 메인공정(L2) 셀 ==========
interface EditableL2CellProps {
  l2Id: string;
  l2No: string;
  l2Name: string;
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
  handleSelect: (type: 'L1' | 'L2' | 'L3', id: string | null) => void;
  setIsProcessModalOpen: (open: boolean) => void;
  saveToLocalStorage?: () => void;
  saveAtomicDB?: (force?: boolean) => Promise<void>;
  zebraBg: string;
  rowSpan: number;
  isConfirmed?: boolean;
}

export function EditableL2Cell({ 
  l2Id, l2No, l2Name, state, setState, setDirty, handleSelect, setIsProcessModalOpen, saveToLocalStorage, saveAtomicDB, zebraBg, rowSpan, isConfirmed 
}: EditableL2CellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(l2Name);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlaceholder = l2Name.includes('클릭');

  const handleSave = () => {
    if (editValue.trim() && editValue !== l2Name) {
      setState(prev => ({
        ...prev,
        l2: prev.l2.map(p => p.id === l2Id ? { ...p, name: editValue.trim() } : p)
      }));
      setDirty(true);
      // ✅ localStorage + DB 저장
      setTimeout(async () => {
        saveToLocalStorage?.();
        if (saveAtomicDB) {
          try { await saveAtomicDB(); } catch (e) { console.error('[StructureTab] L2 편집 DB 저장 오류:', e); }
        }
      }, 100);
    }
    setIsEditing(false);
  };

  // 클릭 → 모달 열기
  const handleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    clickTimerRef.current = setTimeout(() => {
      // ✅ 확정됨 상태에서 클릭하면 자동으로 수정 모드로 전환
      if (isConfirmed) {
        setState((prev: any) => ({ ...prev, structureConfirmed: false }));
        setDirty(true);
      }
      handleSelect('L2', l2Id);
      setIsProcessModalOpen(true);
      clickTimerRef.current = null;
    }, 200);
  };

  // 더블클릭 → 인라인 수정
  const handleDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    if (!isPlaceholder) {
      setEditValue(l2Name);
      setIsEditing(true);
    }
  };

  if (isEditing) {
    return (
      <td rowSpan={rowSpan} className={`${cell} p-0.5 bg-blue-50`}>
        <input
          type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
          autoFocus className="w-full px-1 border-none outline-2 outline-blue-500 bg-white rounded-sm text-xs"
        />
      </td>
    );
  }

  // 동적 배경
  const bgStyle: React.CSSProperties = isPlaceholder 
    ? { background: `repeating-linear-gradient(45deg, ${zebraBg}, ${zebraBg} 4px, #e3f2fd 4px, #e3f2fd 8px)` }
    : { background: zebraBg };

  return (
    <td 
      rowSpan={rowSpan}
      className="cursor-pointer hover:bg-blue-100 border border-[#ccc] p-0.5 px-1 text-left font-semibold text-xs"
      style={bgStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={isPlaceholder ? '클릭: 공정 선택' : '클릭: 모달 | 더블클릭: 텍스트 수정'}
    >
      {isPlaceholder ? <span className="text-[#e65100] font-semibold">🔍 클릭하여 공정 선택</span> : <span className="font-semibold">{l2No} {l2Name}</span>}
    </td>
  );
}

// ========== 작업요소(L3) 셀 ==========
interface EditableL3CellProps {
  value: string;
  l3Id: string;
  l2Id: string;
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
  handleSelect: (type: 'L1' | 'L2' | 'L3', id: string | null) => void;
  setTargetL2Id: (id: string | null) => void;
  setIsWorkElementModalOpen: (open: boolean) => void;
  saveToLocalStorage?: () => void;
  saveAtomicDB?: (force?: boolean) => Promise<void>;
  zebraBg: string;
  isConfirmed?: boolean;
}

export function EditableL3Cell({ 
  value, l3Id, l2Id, state, setState, setDirty, handleSelect, setTargetL2Id, setIsWorkElementModalOpen, saveToLocalStorage, saveAtomicDB, zebraBg, isConfirmed 
}: EditableL3CellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlaceholder = value.includes('추가') || value.includes('클릭') || value.includes('필요');

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      setState(prev => ({
        ...prev,
        l2: prev.l2.map(p => ({
          ...p,
          l3: p.l3.map(w => w.id === l3Id ? { ...w, name: editValue.trim() } : w)
        }))
      }));
      setDirty(true);
      // ✅ localStorage + DB 저장
      setTimeout(async () => {
        saveToLocalStorage?.();
        if (saveAtomicDB) {
          try { await saveAtomicDB(); } catch (e) { console.error('[StructureTab] L3 편집 DB 저장 오류:', e); }
        }
      }, 100);
    }
    setIsEditing(false);
  };

  // 모달 열기
  const openModal = () => {
    // ✅ 확정됨 상태에서 클릭하면 자동으로 수정 모드로 전환
    if (isConfirmed) {
      setState((prev: any) => ({ ...prev, structureConfirmed: false }));
      setDirty(true);
    }
    handleSelect('L3', l3Id);
    setTargetL2Id(l2Id);
    setIsWorkElementModalOpen(true);
  };

  // 클릭 → 모달 열기 (추가/삭제/선택)
  const handleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    clickTimerRef.current = setTimeout(() => {
      openModal();
      clickTimerRef.current = null;
    }, 200);
  };

  // 더블클릭 → 인라인 수정 (빠른 텍스트 편집)
  const handleDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    if (!isPlaceholder) {
      setEditValue(value); 
      setIsEditing(true);
    }
  };

  if (isEditing) {
    return (
      <td className={`${cell} p-0.5 bg-orange-50`}>
        <input
          type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
          autoFocus className="w-full px-1 border-none outline-2 outline-orange-500 bg-white rounded-sm text-xs"
        />
      </td>
    );
  }

  // 동적 배경 (줄무늬 패턴)
  const bgStyle: React.CSSProperties = isPlaceholder 
    ? { background: `repeating-linear-gradient(45deg, ${zebraBg}, ${zebraBg} 4px, #fff3e0 4px, #fff3e0 8px)` }
    : { background: zebraBg };
  
  return (
    <td 
      className="cursor-pointer hover:bg-orange-100 border border-[#ccc] p-0.5 px-1 break-words text-xs"
      style={bgStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={isPlaceholder ? '클릭: 작업요소 추가' : '클릭: 모달 | 더블클릭: 텍스트 수정'}
    >
      {isPlaceholder || !value || value.trim() === '' ? (
        <span className="text-[#e65100] font-semibold">🔍 클릭하여 작업요소 추가</span>
      ) : (
        <span className="font-normal">{value}</span>
      )}
    </td>
  );
}

// ========== Colgroup ==========
export function StructureColgroup() {
  // 완제품 공정명 / 메인 공정명 / 4M / 작업요소
  return (
    <colgroup>
      <col className="w-[30%]" />
      <col className="w-[30%]" />
      <col className="w-[80px] min-w-[80px]" />
      <col />
    </colgroup>
  );
}
