/**
 * @file StructureTab.tsx
 * @description FMEA 워크시트 - 구조분석(2단계) 탭
 * 
 * ⚠️⚠️⚠️ 코드프리즈 (CODE FREEZE) ⚠️⚠️⚠️
 * ============================================
 * 이 파일은 완전히 프리즈되었습니다.
 * 
 * ❌ 절대 수정 금지:
 * - 코드 변경 금지
 * - 주석 변경 금지
 * - 스타일 변경 금지
 * - 로직 변경 금지
 * 
 * ✅ 수정 허용 조건:
 * 1. 사용자가 명시적으로 수정 요청
 * 2. 수정 사유와 범위를 명확히 지시
 * 3. 코드프리즈 경고를 확인하고 진행
 * 
 * 📅 프리즈 일자: 2025-01-03
 * 📌 프리즈 범위: 구조분석부터 3L원인분석까지 전체
 * ============================================
 */

'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { WorksheetState, COLORS, FlatRow, FONT_SIZES, FONT_WEIGHTS, HEIGHTS } from '../constants';
import { S, F, X, L1, L2, L3, cell, cellCenter, border, btnConfirm, btnEdit, badgeConfirmed, badgeOk, badgeMissing } from '@/styles/worksheet';

interface StructureTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  rows: FlatRow[];
  l1Spans: number[];
  l2Spans: number[];
  setDirty: (dirty: boolean) => void;
  handleInputBlur: () => void;
  handleInputKeyDown: (e: React.KeyboardEvent) => void;
  handleSelect: (type: 'L1' | 'L2' | 'L3', id: string | null) => void;
  setIsProcessModalOpen: (open: boolean) => void;
  setIsWorkElementModalOpen: (open: boolean) => void;
  setTargetL2Id: (id: string | null) => void;
  saveToLocalStorage?: () => void; // 영구 저장 함수
}

// 스타일 함수
const BORDER = `1px solid #ccc`;
const cellBase: React.CSSProperties = { border: BORDER, padding: '4px 6px', fontSize: FONT_SIZES.cell, verticalAlign: 'middle' };
const headerStyle = (bg: string, color = '#fff'): React.CSSProperties => ({ ...cellBase, background: bg, color, fontWeight: FONT_WEIGHTS.bold, textAlign: 'center' });
const dataCell = (bg: string): React.CSSProperties => ({ ...cellBase, background: bg });

// 4M 셀 - 읽기 전용 표시
function M4Cell({ value, zebraBg }: { value: string; zebraBg: string }) {
  return (
    <td className={`${cell} w-20 max-w-[80px] min-w-[80px] text-center font-bold text-blue-800 ${zebraBg}`}>
      {value || <span className="text-red-600 font-semibold">-</span>}
    </td>
  );
}

// ✅ 메인공정 셀 - 클릭(모달) / 더블클릭(인라인 수정) 지원
function EditableL2Cell({ 
  l2Id, l2No, l2Name, state, setState, setDirty, handleSelect, setIsProcessModalOpen, saveToLocalStorage, zebraBg, rowSpan, isConfirmed 
}: { 
  l2Id: string; l2No: string; l2Name: string; state: WorksheetState; 
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>; 
  setDirty: (dirty: boolean) => void; handleSelect: (type: 'L1' | 'L2' | 'L3', id: string | null) => void;
  setIsProcessModalOpen: (open: boolean) => void;
  saveToLocalStorage?: () => void; zebraBg: string; rowSpan: number; isConfirmed?: boolean;
}) {
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
      saveToLocalStorage?.();
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

  // 더블클릭 → 인라인 수정 (기존 공정만)
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
      <td rowSpan={rowSpan} className="border border-[#ccc] p-0.5 bg-green-50">
        <input
          type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
          autoFocus className="w-full px-1 border-none outline-2 outline-green-500 bg-white rounded-sm text-xs text-center"
        />
      </td>
    );
  }

  return (
    <td 
      rowSpan={rowSpan}
      className={`text-center cursor-pointer hover:bg-green-200 text-xs border border-[#ccc] p-1 align-middle break-words ${isPlaceholder ? 'bg-white' : zebraBg}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={isPlaceholder ? '클릭: 공정 선택' : '클릭: 모달 | 더블클릭: 텍스트 수정'}
    >
      {isPlaceholder ? <span className="text-[#e65100] font-semibold">🔍 클릭하여 공정 선택</span> : <span className="font-semibold">{l2No} {l2Name}</span>}
    </td>
  );
}

function EditableL3Cell({ 
  value, l3Id, l2Id, state, setState, setDirty, handleSelect, setTargetL2Id, setIsWorkElementModalOpen, saveToLocalStorage, zebraBg, isConfirmed 
}: { 
  value: string; l3Id: string; l2Id: string; state: WorksheetState; setState: React.Dispatch<React.SetStateAction<WorksheetState>>; 
  setDirty: (dirty: boolean) => void; handleSelect: (type: 'L1' | 'L2' | 'L3', id: string | null) => void;
  setTargetL2Id: (id: string | null) => void; setIsWorkElementModalOpen: (open: boolean) => void;
  saveToLocalStorage?: () => void; zebraBg: string; isConfirmed?: boolean;
}) {
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
      saveToLocalStorage?.(); // 영구 저장
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
  const bgStyle = isPlaceholder 
    ? { background: `repeating-linear-gradient(45deg, ${zebraBg}, ${zebraBg} 4px, #fff3e0 4px, #fff3e0 8px)` }
    : {};
  
  return (
    <td 
      className={`cursor-pointer hover:bg-orange-100 border border-[#ccc] p-0.5 px-1 break-words text-xs ${!isPlaceholder ? zebraBg : ''}`}
      style={bgStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={isPlaceholder ? '클릭: 작업요소 추가' : '클릭: 모달 | 더블클릭: 텍스트 수정'}
    >
      {isPlaceholder ? <span className="text-[#e65100] font-semibold">🔍 클릭</span> : <span className="font-normal">{value}</span>}
    </td>
  );
}

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

interface MissingCounts {
  l1Count: number;  // 완제품 공정 누락
  l2Count: number;  // 메인공정명 누락
  l3Count: number;  // 작업요소 누락
}

interface StructureHeaderProps {
  onProcessModalOpen: () => void;
  missingCounts?: MissingCounts & { total?: number };
  isConfirmed?: boolean;
  onConfirm?: () => void;
  onEdit?: () => void;
  workElementCount?: number; // ✅ 작업요소명 개수
  // ✅ 구조분석 COUNT (S1/S2/S3)
  l1Name?: string;  // 완제품명
  s2Count?: number; // 메인공정 개수
  s3Count?: number; // 작업요소 개수
}

export function StructureHeader({ onProcessModalOpen, missingCounts, isConfirmed, onConfirm, onEdit, workElementCount = 0, l1Name = '', s2Count = 0, s3Count = 0 }: StructureHeaderProps) {
  // 확정된 경우 돋보기 숨김
  const showSearchIcon = !isConfirmed && missingCounts && missingCounts.l2Count > 0;
  
  const totalMissing = missingCounts?.total || ((missingCounts?.l1Count || 0) + (missingCounts?.l2Count || 0) + (missingCounts?.l3Count || 0));
  
  return (
    <>
      {/* 1행: 단계 구분 + 확정/수정 버튼 (기능분석과 동일한 구조) */}
      <tr>
        <th colSpan={4} className="bg-[#1976d2] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center">
          <div className="flex items-center justify-center gap-5">
            <span>2단계 : 구조분석</span>
            <div className="flex gap-1.5">
              {isConfirmed ? (
                <span className={badgeConfirmed}>✓ 확정됨({workElementCount})</span>
              ) : (
                <button 
                  type="button" 
                  onClick={(e) => {
                    console.log('[StructureHeader] 확정 버튼 클릭 이벤트');
                    console.log('[StructureHeader] onConfirm:', typeof onConfirm);
                    console.log('[StructureHeader] workElementCount:', workElementCount);
                    e.preventDefault();
                    e.stopPropagation();
                    if (onConfirm) {
                      onConfirm();
                    } else {
                      console.error('[StructureHeader] onConfirm이 없습니다!');
                    }
                  }} 
                  disabled={workElementCount === 0}
                  className={`${btnConfirm} ${workElementCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={workElementCount === 0 ? '작업요소를 먼저 연결해주세요' : '확정'}
                >
                  확정
                </button>
              )}
              <span className={totalMissing > 0 ? badgeMissing : badgeOk}>누락 {totalMissing}건</span>
              {isConfirmed && (
                <button type="button" onClick={onEdit} className={btnEdit}>수정</button>
              )}
            </div>
          </div>
        </th>
      </tr>
      {/* 2행: 항목 그룹 (기능분석과 동일한 구조) */}
      <tr>
        <th className="bg-[#1976d2] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
          1. 완제품 공정명
          {missingCounts && missingCounts.l1Count > 0 && (
            <span className="ml-1.5 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs">
              {missingCounts.l1Count}
            </span>
          )}
        </th>
        <th onClick={onProcessModalOpen} className="bg-[#388e3c] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center cursor-pointer hover:bg-green-600">
          2. 메인 공정명 {showSearchIcon && '🔍'}
          {missingCounts && missingCounts.l2Count > 0 && (
            <span className="ml-1.5 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs">
              {missingCounts.l2Count}
            </span>
          )}
        </th>
        <th colSpan={2} className="bg-[#f57c00] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
          3. 작업 요소명 {!isConfirmed && missingCounts && missingCounts.l3Count > 0 && '🔍'}
          {missingCounts && missingCounts.l3Count > 0 && (
            <span className="ml-1.5 bg-white text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {missingCounts.l3Count}
            </span>
          )}
        </th>
      </tr>
      {/* 3행: 서브 헤더 - COUNT 표시 표준: 항목명(숫자) */}
      <tr>
        <th className="bg-[#e3f2fd] border border-[#ccc] p-1 text-xs font-semibold text-center border-b-[3px] border-b-[#1976d2]">
          {l1Name || '완제품 제조라인'}<span className="text-green-700 font-bold">(1)</span>
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] p-1 text-xs font-semibold text-center border-b-[3px] border-b-[#388e3c]">
          공정NO+공정명<span className={`font-bold ${s2Count > 0 ? 'text-green-700' : 'text-red-500'}`}>({s2Count})</span>
        </th>
        <th className="w-20 max-w-[80px] min-w-[80px] bg-[#29b6f6] text-white border border-[#ccc] border-b-[3px] border-b-[#0288d1] p-1 text-xs font-bold text-center">4M</th>
        <th className="bg-[#ffe0b2] border border-[#ccc] p-1 text-xs font-semibold text-center border-b-[3px] border-b-[#f57c00]">
          작업요소<span className={`font-bold ${s3Count > 0 ? 'text-green-700' : 'text-red-500'}`}>({s3Count})</span>
        </th>
      </tr>
    </>
  );
}

export function StructureRow({
  row, idx, l2Spans, state, setState, setDirty, handleInputBlur, handleInputKeyDown, handleSelect, setIsProcessModalOpen, setIsWorkElementModalOpen, setTargetL2Id, saveToLocalStorage, zebraBg, isConfirmed,
}: StructureTabProps & { row: FlatRow; idx: number; zebraBg: string; isConfirmed?: boolean }) {
  // 완제품 공정명과 메인 공정명이 1:1로 병합되도록 l2Spans 사용
  // ✅ 수정: l2Spans[idx]가 0이면 병합된 행이므로 표시 안함
  const spanCount = l2Spans[idx];
  const showMergedCells = spanCount !== undefined && spanCount > 0;
  
  return (
    <>
      {/* 완제품 공정명: 메인 공정명과 동일하게 l2Spans 기준 병합 (1:1 매칭) */}
      {showMergedCells && (
        <td 
          rowSpan={spanCount || 1} 
          className={`text-center text-xs border border-[#ccc] p-1 align-middle break-words ${zebraBg}`}
        >
          <input
            type="text" value={state.l1.name}
            onChange={(e) => { setState(prev => ({ ...prev, l1: { ...prev.l1, name: e.target.value } })); setDirty(true); }}
            onBlur={handleInputBlur} onKeyDown={handleInputKeyDown} placeholder="완제품명 입력"
            className="w-full text-center border-0 outline-none text-xs font-semibold min-h-6 bg-white/95 rounded px-1"
          />
        </td>
      )}
      
      {/* 메인 공정명: l2Spans 기준 병합 + 인라인 수정 지원 */}
      {showMergedCells && (
        <EditableL2Cell
          l2Id={row.l2Id}
          l2No={row.l2No}
          l2Name={row.l2Name}
          state={state}
          setState={setState}
          setDirty={setDirty}
          handleSelect={handleSelect}
          setIsProcessModalOpen={setIsProcessModalOpen}
          saveToLocalStorage={saveToLocalStorage}
          zebraBg={zebraBg}
          rowSpan={spanCount || 1}
          isConfirmed={isConfirmed}
        />
      )}
      <M4Cell value={row.m4} zebraBg={zebraBg} />
      <EditableL3Cell value={row.l3Name} l3Id={row.l3Id} l2Id={row.l2Id} state={state} setState={setState} setDirty={setDirty} handleSelect={handleSelect} setTargetL2Id={setTargetL2Id} setIsWorkElementModalOpen={setIsWorkElementModalOpen} saveToLocalStorage={saveToLocalStorage} zebraBg={zebraBg} isConfirmed={isConfirmed} />
    </>
  );
}

export default function StructureTab(props: StructureTabProps) {
  const { rows, setIsProcessModalOpen, state, setState, setDirty, saveToLocalStorage, handleInputBlur, handleInputKeyDown } = props;
  
  // ✅ 확정 상태 (고장분석 패턴 적용)
  const isConfirmed = (state as any).structureConfirmed || false;

  // ✅ 구조 데이터 변경 감지용 ref (고장분석 패턴 적용)
  const structureDataRef = useRef<string>('');
  
  // ✅ 구조 데이터 변경 시 자동 저장 (확실한 저장 보장)
  useEffect(() => {
    const dataKey = JSON.stringify({ l1: state.l1, l2: state.l2.map(p => ({ id: p.id, no: p.no, name: p.name, l3: p.l3 })) });
    if (structureDataRef.current && dataKey !== structureDataRef.current) {
      console.log('[StructureTab] 구조 데이터 변경 감지, 자동 저장');
      saveToLocalStorage?.();
    }
    structureDataRef.current = dataKey;
  }, [state.l1, state.l2, saveToLocalStorage]);

  // ✅ 확정 상태 변경 시 자동 저장 (고장분석 패턴 적용)
  const confirmedRef = useRef<boolean>(isConfirmed);
  useEffect(() => {
    if (confirmedRef.current !== isConfirmed) {
      console.log('[StructureTab] 확정 상태 변경 감지:', isConfirmed);
      // 약간의 딜레이 후 저장 (state 업데이트 완료 보장)
      const timer = setTimeout(() => {
        saveToLocalStorage?.();
        console.log('[StructureTab] 확정 상태 저장 완료');
      }, 50);
      confirmedRef.current = isConfirmed;
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, saveToLocalStorage]);

  // 누락 건수 계산 (rows 배열 기반 - 화면에 표시되는 것과 일치)
  const missingCounts = useMemo(() => {
    const isMissing = (name: string | undefined | null) => {
      if (name === null || name === undefined) return true;
      if (!name) return true;
      const trimmed = String(name).trim();
      if (trimmed === '' || trimmed === '-') return true;
      if (String(name).includes('클릭')) return true;
      if (String(name).includes('추가')) return true;
      if (String(name).includes('선택')) return true;
      if (String(name).includes('입력')) return true;
      if (String(name).includes('필요')) return true;
      return false;
    };
    
    let l1Count = 0;  // 완제품 공정 누락
    let l2Count = 0;  // 메인공정명 누락 (중복 제거)
    let l3Count = 0;  // 작업요소 누락
    let m4Count = 0;  // 4M 누락
    
    // 완제품 공정명 체크
    if (isMissing(state.l1.name)) l1Count++;
    
    // 중복 제거를 위한 Set
    const checkedL2 = new Set<string>();
    
    // rows 배열 기반으로 체크 (화면에 표시되는 것과 일치)
    rows.forEach(row => {
      // 메인공정명 누락 체크 (중복 제거)
      if (!checkedL2.has(row.l2Id) && isMissing(row.l2Name)) {
        l2Count++;
        checkedL2.add(row.l2Id);
      }
      
      // 작업요소명 누락 체크
      if (isMissing(row.l3Name)) l3Count++;
      
      // 4M 누락 체크
      if (isMissing(row.m4)) m4Count++;
    });
    
    return { l1Count, l2Count, l3Count: l3Count + m4Count, total: l1Count + l2Count + l3Count + m4Count };
  }, [state.l1.name, rows]);

  // ✅ 작업요소명 개수 계산
  const workElementCount = useMemo(() => {
    return state.l2.reduce((sum, p) => sum + (p.l3 || []).length, 0);
  }, [state.l2]);

  // ✅ S COUNT 계산 (구조분석)
  // S1 = 완제품공정명 (항상 1, 고정)
  // S2 = 메인공정 개수 (입력 완료된 것만)
  // S3 = 작업요소 개수 (입력 완료된 것만)
  const sCounts = useMemo(() => {
    const isFilled = (name: string | undefined | null) => {
      if (!name) return false;
      const trimmed = String(name).trim();
      if (trimmed === '' || trimmed === '-') return false;
      if (name.includes('클릭') || name.includes('선택') || name.includes('입력')) return false;
      return true;
    };
    
    const s2Count = state.l2.filter(p => isFilled(p.name)).length;
    const s3Count = state.l2.reduce((sum, p) => 
      sum + (p.l3 || []).filter((we: any) => isFilled(we.name)).length, 0);
    
    return { s2Count, s3Count };
  }, [state.l2]);

  // ✅ 확정 핸들러 (고장분석 패턴 적용)
  const handleConfirm = useCallback(() => {
    console.log('[StructureTab] ========== 확정 버튼 클릭 ==========');
    console.log('[StructureTab] missingCounts:', missingCounts);
    console.log('[StructureTab] missingCounts.total:', missingCounts.total);
    console.log('[StructureTab] isConfirmed:', isConfirmed);
    console.log('[StructureTab] saveToLocalStorage:', typeof saveToLocalStorage);
    console.log('[StructureTab] workElementCount:', workElementCount);
    
    // ✅ 작업요소가 연결되어 있는지 확인
    if (workElementCount === 0) {
      console.log('[StructureTab] 작업요소 없음, 확정 불가');
      alert('⚠️ 작업요소를 먼저 연결해주세요.\n\n작업요소가 없으면 확정할 수 없습니다.');
      return;
    }
    
    if (missingCounts.total > 0) {
      console.log('[StructureTab] 누락 항목 있음, 확정 불가');
      alert(`누락된 항목이 ${missingCounts.total}건 있습니다.\n모든 항목을 입력 후 확정해 주세요.`);
      return;
    }
    
    // ✅ 현재 구조 통계 로그
    const procCount = state.l2.length;
    const weCount = state.l2.flatMap(p => p.l3).length;
    console.log('[StructureTab] 확정 시 공정:', procCount, '개, 작업요소:', weCount, '개');
    
    console.log('[StructureTab] setState 호출 전');
    setState((prev: any) => {
      const newState = { ...prev, structureConfirmed: true, structureConfirmedAt: new Date().toISOString() };
      console.log('[StructureTab] 확정 상태 업데이트:', newState.structureConfirmed);
      return newState;
    });
    console.log('[StructureTab] setState 호출 후');
    setDirty(true);
    
    // ✅ 즉시 저장 (requestAnimationFrame 사용)
    requestAnimationFrame(() => {
      console.log('[StructureTab] requestAnimationFrame 실행');
      if (saveToLocalStorage) {
        saveToLocalStorage();
        console.log('[StructureTab] 확정 후 localStorage 저장 완료');
      } else {
        console.error('[StructureTab] saveToLocalStorage가 없습니다!');
      }
    });
    
    alert('✅ 구조분석(2단계)이 확정되었습니다.\n\n이제 기능분석(3단계) 탭이 활성화되었습니다.');
    console.log('[StructureTab] ========== 확정 완료 ==========');
  }, [missingCounts, isConfirmed, state.l2, setState, setDirty, saveToLocalStorage, workElementCount]);

  // ✅ 수정 핸들러 (고장분석 패턴 적용)
  const handleEdit = useCallback(() => {
    setState((prev: any) => ({ ...prev, structureConfirmed: false }));
    setDirty(true);
    requestAnimationFrame(() => saveToLocalStorage?.());
  }, [setState, setDirty, saveToLocalStorage]);
  
  return (
    <>
      <StructureColgroup />
      {/* 헤더 - 하단 2px 검은색 구분선 */}
      <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
        <StructureHeader 
          onProcessModalOpen={() => setIsProcessModalOpen(true)} 
          missingCounts={missingCounts} 
          isConfirmed={isConfirmed}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          workElementCount={workElementCount}
          l1Name={state.l1.name || ''}
          s2Count={sCounts.s2Count}
          s3Count={sCounts.s3Count}
        />
      </thead>
      <tbody>
        {rows.length === 0 ? (
          // ✅ rows가 비어있을 때도 완제품 공정명 입력 가능
          <tr className="h-6 bg-white">
            <td colSpan={4} className="text-center text-xs border border-[#ccc] p-1 align-middle">
              <div className="flex items-center justify-center gap-2">
                <input
                  type="text" 
                  value={state.l1.name || ''}
                  onChange={(e) => { 
                    setState(prev => ({ ...prev, l1: { ...prev.l1, name: e.target.value } })); 
                    setDirty(true); 
                  }}
                  onBlur={handleInputBlur} 
                  onKeyDown={handleInputKeyDown} 
                  placeholder="완제품명+라인 입력"
                  className="w-full max-w-md text-center border border-gray-300 outline-none text-xs font-semibold min-h-6 bg-white rounded px-2 py-1"
                />
                <span className="text-gray-500 text-xs">공정을 추가하려면 "2. 메인 공정명"을 클릭하세요</span>
              </div>
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => {
            const zebraBg = idx % 2 === 1 ? '#bbdefb' : '#e3f2fd';
            return (
              <tr key={row.l3Id} className="h-6" style={{ background: zebraBg }}>
                <StructureRow {...props} row={row} idx={idx} zebraBg={zebraBg} isConfirmed={isConfirmed} />
              </tr>
            );
          })
        )}
      </tbody>
    </>
  );
}
