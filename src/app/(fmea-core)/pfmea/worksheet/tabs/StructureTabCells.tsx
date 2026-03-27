// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file StructureTabCells.tsx
 * @description 구조분석 탭 - 편집 가능한 셀 컴포넌트 (PFMEA 버전)
 * @created 2026-01-22 (DFMEA 버전에서 복사)
 * @CODEFREEZE 2026-02-16
 */

'use client';

import React, { useState, useRef } from 'react';
import { WorksheetState } from '../constants';
import { cell } from '../../../../../styles/worksheet';
import { extractM4FromValue } from '@/lib/constants';
import { emitSave } from '../hooks/useSaveEvent';

// PFMEA 4M 타입 옵션 (MN/MC/IM/EN)
export const M4_OPTIONS = [
  { value: 'MN', label: 'MN', color: '#e3f2fd' },
  { value: 'MC', label: 'MC', color: '#fff3e0' },
  { value: 'IM', label: 'IM', color: '#e8f5e9' },
  { value: 'EN', label: 'EN', color: '#fce4ec' },
];

// ========== 4M 타입 셀 ==========
interface EditableM4CellProps {
  value: string;
  zebraBg: string;
  weId: string;
  l2Id: string;
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
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
    emitSave();
  };

  // ★ 2026-01-25: 4M 셀은 zebraBg(L3 주황색) 사용
  const bgColor = zebraBg;

  return (
    <td data-col="l3" className={`${cell} w-20 max-w-[80px] min-w-[80px] text-center align-middle`} style={{ background: bgColor, padding: '2px' }}>
      {isConfirmed ? (
        <span className="font-normal text-gray-800 text-[11px]">{value || '-'}</span>
      ) : (
        <select
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-1 py-1 text-[11px] font-normal text-center border-0 rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400"
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

// ========== 완제품공정(L1) 셀 ==========
interface EditableL1CellProps {
  value: string;
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => Promise<void>;
  zebraBg: string;
  rowSpan: number;
  isConfirmed?: boolean;
  isRevised?: boolean;
}

export function EditableL1Cell({
  value, state, setState, setDirty, saveToLocalStorage, saveAtomicDB, zebraBg, rowSpan, isConfirmed, isRevised
}: EditableL1CellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  const safeName = value || '';
  const isPlaceholder = safeName.includes('입력') || safeName === '';

  const handleSave = () => {
    if (editValue.trim() !== safeName) {
      setState(prev => ({
        ...prev,
        l1: { ...prev.l1, name: editValue.trim() },
        structureConfirmed: false
      }));
      setDirty(true);
      setTimeout(async () => {
        saveToLocalStorage?.(true);
        if (saveAtomicDB) {
          try { await saveAtomicDB(true); } catch (e) { console.error('[StructureTab] L1 편집 DB 저장 오류:', e); }
        }
      }, 100);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <td rowSpan={rowSpan} className={`${cell} p-0.5 bg-blue-50 text-center align-middle`}>
        <input
          type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
          autoFocus className="w-full px-1 border-none outline-2 outline-blue-500 bg-white rounded-sm text-[11px] text-center font-normal"
        />
      </td>
    );
  }

  return (
    <td
      rowSpan={rowSpan}
      className={`border border-[#ccc] p-0.5 px-1 text-left align-middle break-words text-[11px] font-normal transition-colors hover:bg-blue-100/50 cursor-pointer`}
      style={{ background: zebraBg }}
      onDoubleClick={() => {
        if (isConfirmed) {
          setState((prev: any) => ({ ...prev, structureConfirmed: false }));
          setDirty(true);
        }
        setEditValue(safeName);
        setIsEditing(true);
      }}
      title="더블클릭: 완제품공정명 수동 수정"
    >
      {/* ★★★ "완제품명" + 줄바꿈 + "생산공정" 하드코딩 ★★★ */}
      <span className="font-normal text-[11px]" style={{ color: isRevised ? '#c62828' : '#1f2937' }}>
        {isPlaceholder ? '완제품공정명 입력' : <>{safeName}<br />생산공정</>}
      </span>
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
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => Promise<void>;
  zebraBg: string;
  rowSpan: number;
  isConfirmed?: boolean;
  isRevised?: boolean;
}

export function EditableL2Cell({
  l2Id, l2No, l2Name, state, setState, setDirty, handleSelect, setIsProcessModalOpen, saveToLocalStorage, saveAtomicDB, zebraBg, rowSpan, isConfirmed, isRevised
}: EditableL2CellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(l2Name || '');
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const safeName = l2Name || '';
  const isPlaceholder = !safeName.trim();

  const handleSave = () => {
    if (editValue.trim() && editValue !== safeName) {
      setState(prev => ({
        ...prev,
        l2: prev.l2.map(p => {
          if (p.id !== l2Id) return p;
          const updates: { name: string; no?: string } = { name: editValue.trim() };
          // ★ 공정번호가 없으면 자동 생성 (기존 최대값 + 10)
          if (!p.no) {
            const existingNos = prev.l2
              .map(proc => parseInt(proc.no?.replace(/\D/g, '') || '0', 10))
              .filter(n => !isNaN(n) && n > 0);
            const maxNo = existingNos.length > 0 ? Math.max(...existingNos) : 0;
            updates.no = String(maxNo + 10);
          }
          return { ...p, ...updates };
        })
      }));
      setDirty(true);
      setTimeout(async () => {
        saveToLocalStorage?.(true);
        if (saveAtomicDB) {
          try { await saveAtomicDB(true); } catch (e) { console.error('[StructureTab] L2 편집 DB 저장 오류:', e); }
        }
      }, 100);
    }
    setIsEditing(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.detail === 2) return;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    clickTimerRef.current = setTimeout(() => {
      if (isConfirmed) {
        setState((prev: any) => ({ ...prev, structureConfirmed: false }));
        setDirty(true);
      }
      handleSelect('L2', l2Id);
      setIsProcessModalOpen(true);
      clickTimerRef.current = null;
    }, 250);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    if (isConfirmed) {
      setState((prev: any) => ({ ...prev, structureConfirmed: false }));
      setDirty(true);
    }

    setEditValue(isPlaceholder ? '' : safeName);
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <td rowSpan={rowSpan} data-col="process" className={`${cell} p-0.5 bg-blue-50 align-middle`}>
        <input
          type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
          autoFocus className="w-full px-1 border-none outline-2 outline-green-500 bg-white rounded-sm text-[10px] font-normal"
        />
      </td>
    );
  }

  const bgStyle: React.CSSProperties = isPlaceholder
    ? { background: `repeating-linear-gradient(45deg, ${zebraBg}, ${zebraBg} 4px, #e3f2fd 4px, #e3f2fd 8px)` }
    : { background: zebraBg };

  return (
    <td
      rowSpan={rowSpan}
      data-col="process"
      className="cursor-pointer hover:bg-green-100 border border-[#ccc] p-0.5 px-1 text-left font-normal align-middle"
      style={bgStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title="클릭: 공정 선택 모달 | 더블클릭: 직접 입력"
    >
      {isPlaceholder ? <span className="text-[#e65100] font-semibold italic text-[10px]">🔍 클릭하여 공정 선택</span> : <span className={`font-normal ${adaptiveText(`${l2No} ${safeName}`, 23)}`} style={{ color: isRevised ? '#c62828' : '#1f2937' }}>{l2No} {safeName}</span>}
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
  // ★ 2026-02-20: setStateSynced 추가 (stateRef 즉시 동기화 → DB 저장 안정)
  setStateSynced?: (updater: React.SetStateAction<WorksheetState>) => void;
  setDirty: (dirty: boolean) => void;
  handleSelect: (type: 'L1' | 'L2' | 'L3', id: string | null) => void;
  setTargetL2Id: (id: string | null) => void;
  setIsWorkElementModalOpen: (open: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => Promise<void>;
  zebraBg: string;
  isConfirmed?: boolean;
  isRevised?: boolean;
}

export function EditableL3Cell({
  value, l3Id, l2Id, state, setState, setStateSynced, setDirty, handleSelect, setTargetL2Id, setIsWorkElementModalOpen, saveToLocalStorage, saveAtomicDB, zebraBg, isConfirmed, isRevised
}: EditableL3CellProps) {
  // ★ 2026-02-20: setStateSynced 사용 (stateRef 즉시 동기화 → DB 저장 안정)
  const updateState = setStateSynced || setState;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlaceholder = !value.trim();

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      // ★ 2026-02-20: updateState(=setStateSynced) 사용 → stateRef 즉시 동기화
      updateState(prev => {
        // ★ 부모 공정번호 자동 상속 (DB 형식: "30 용접기")
        const parentProc = prev.l2.find(p => p.id === l2Id);
        const procNo = parentProc?.no || '';
        const rawInput = editValue.trim().replace(/^\d+\s+/, ''); // 중복 접두사 방지

        // ★ 4M 기준변수 분리: MN/MC 등은 value가 아닌 m4 필드로 처리
        const { m4: extractedM4, name: actualName } = extractM4FromValue(rawInput);
        if (!actualName) return prev; // 순수 4M 코드만 입력 → 저장하지 않음

        const finalName = procNo ? `${procNo} ${actualName}` : actualName;
        return {
          ...prev,
          l2: prev.l2.map(p => ({
            ...p,
            l3: p.l3.map(w => w.id === l3Id
              ? { ...w, name: finalName, ...(extractedM4 ? { m4: extractedM4 } : {}) }
              : w)
          }))
        };
      });
      setDirty(true);
      emitSave();
    }
    setIsEditing(false);
  };

  const openModal = () => {
    if (isConfirmed) {
      // ★ 2026-02-20: updateState(=setStateSynced) 사용
      updateState((prev: any) => ({ ...prev, structureConfirmed: false }));
      setDirty(true);
    }
    handleSelect('L3', l3Id);
    setTargetL2Id(l2Id);
    setIsWorkElementModalOpen(true);
  };

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

  const handleDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    if (isConfirmed) {
      // ★ 2026-02-20: updateState(=setStateSynced) 사용
      updateState((prev: any) => ({ ...prev, structureConfirmed: false }));
      setDirty(true);
    }

    // ★ 편집 시 공정번호 접두사 제거 (순수 이름만 편집)
    const rawName = isPlaceholder ? '' : value.replace(/^\d+\s+/, '');
    setEditValue(rawName);
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <td data-col="l3" className={`${cell} p-0.5 bg-orange-50 align-middle`}>
        <input
          type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
          autoFocus className="w-full px-1 border-none outline-2 outline-orange-500 bg-white rounded-sm text-[11px] font-normal"
        />
      </td>
    );
  }

  const bgStyle: React.CSSProperties = isPlaceholder
    ? { background: '#fed7aa' }  // ✅ 누락 셀: 주황색 배경 (orange-200)
    : { background: zebraBg };

  return (
    <td
      data-col="l3"
      className="cursor-pointer hover:bg-orange-100 border border-[#ccc] p-0.5 px-1 font-normal align-middle"
      style={bgStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title="클릭: 작업요소 선택 모달 | 더블클릭: 직접 입력"
    >
      {isPlaceholder || !value || value.trim() === '' ? (
        <span className="text-[#e65100] font-semibold italic text-[11px]">🔍 클릭하여 작업요소 추가</span>
      ) : (
        <span className={`font-normal ${adaptiveText(value, 55)}`} style={isRevised ? { color: '#c62828' } : undefined}>{value}</span>
      )}
    </td>
  );
}

// ========== Colgroup ==========
export function StructureColgroup() {
  // 완제품 공정(22%) / 메인공정(22%) / 4M(55px) / 작업요소(나머지)
  return (
    <colgroup>
      <col className="w-[22%]" />
      <col className="w-[22%]" />
      <col className="w-[55px] min-w-[55px]" />
      <col />
    </colgroup>
  );
}

/** 셀 텍스트 자동 축소 (잘림 없이 글씨 축소)
 * 1단계: ≤threshold   → 11px 1줄
 * 2단계: ≤threshold×2 → 11px 줄바꿈 (~2줄)
 * 3단계: ≤threshold×3 → 9px 줄바꿈 (~3줄)
 * 4단계: >threshold×3 → 8px 줄바꿈 (전부 표시)
 */
export function adaptiveText(text: string, threshold = 25): string {
  if (!text || text.length <= threshold) return 'text-[11px] break-words';
  if (text.length <= threshold * 2) return 'text-[10px] break-words';
  if (text.length <= threshold * 3) return 'text-[9px] break-words';
  return 'text-[8px] break-words';
}
