// @ts-nocheck
/**
 * @file hooks/useProcessHandlers.ts
 * @description FMEA 워크시트 공정/작업요소 모달 핸들러 훅
 * @module pfmea/worksheet
 */

'use client';

import { useCallback, useState } from 'react';
import { WorksheetState, Process, uid } from '../constants';

// ============================================================================
// 타입 정의
// ============================================================================

interface UseProcessHandlersParams {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
}

interface UseProcessHandlersReturn {
  /** 선택된 L2 ID (작업요소 모달용) */
  targetL2Id: string | null;
  /** 선택된 L2 ID 설정 */
  setTargetL2Id: (id: string | null) => void;
  /** 구조분석 누락 건수 계산 */
  calculateStructureMissing: () => number;
  /** 공정 저장 핸들러 */
  handleProcessSave: (selectedProcesses: { no: string; name: string }[]) => void;
  /** 작업요소 선택 핸들러 */
  handleWorkElementSelect: (selectedElements: { id: string; m4: string; name: string }[]) => void;
}

// ============================================================================
// 훅 구현
// ============================================================================

/**
 * FMEA 워크시트 공정/작업요소 핸들러 훅
 * 
 * @param params - 핸들러 파라미터
 * @returns 공정/작업요소 관련 핸들러들
 */
export function useProcessHandlers({
  state,
  setState,
  setDirty,
}: UseProcessHandlersParams): UseProcessHandlersReturn {
  const [targetL2Id, setTargetL2Id] = useState<string | null>(null);

  // 구조분석 누락 건수 계산
  const calculateStructureMissing = useCallback(() => {
    let count = 0;
    
    // 완제품명 누락
    if (!state.l1.name || state.l1.name.trim() === '') count++;
    
    // 공정 및 작업요소 검사
    state.l2.forEach(proc => {
      const procName = proc.name || '';
      if (!procName || procName.includes('클릭') || procName.includes('선택')) count++;
      
      proc.l3.forEach(we => {
        const weName = we.name || '';
        if (!weName || weName.includes('클릭') || weName.includes('추가') || weName.includes('필요') || weName.includes('선택')) count++;
      });
    });
    
    return count;
  }, [state.l1.name, state.l2]);

  // 공정 모달 저장 핸들러
  const handleProcessSave = useCallback((selectedProcesses: { no: string; name: string }[]) => {
    console.log('[공정저장] 선택된 공정:', selectedProcesses.map(p => `${p.no}:${p.name}`));
    
    setState(prev => {
      const selectedNames = selectedProcesses.map(p => p.name);
      console.log('[공정저장] 선택된 이름들:', selectedNames);
      console.log('[공정저장] 기존 l2:', prev.l2.map(p => `${p.no}:${p.name}`));
      
      const keepL2 = prev.l2.filter(p => !p.name.includes('클릭') && selectedNames.includes(p.name));
      const keepNames = keepL2.map(p => p.name);
      console.log('[공정저장] 유지할 공정:', keepNames);
      
      // 선택된 순서대로 처리 (기존 유지 또는 신규 생성)
      const finalL2: Process[] = selectedProcesses.map((p, idx) => {
        // 기존에 있으면 유지
        const existing = prev.l2.find(e => e.name === p.name && !e.name.includes('클릭'));
        if (existing) {
          console.log('[공정저장] 기존 유지:', p.name);
          return { ...existing, no: p.no, order: (idx + 1) * 10 };
        }
        // 없으면 새로 생성
        console.log('[공정저장] 신규 생성:', p.name);
        return {
          id: uid(),
          no: p.no,
          name: p.name,
          order: (idx + 1) * 10,
          functions: [],
          productChars: [],
          l3: [{ id: uid(), m4: '', name: '(클릭하여 작업요소 추가)', order: 10, functions: [], processChars: [] }]
        };
      });
      
      // 빈 경우 기본 항목 추가
      if (finalL2.length === 0) {
        finalL2.push({
          id: uid(),
          no: '',
          name: '(클릭하여 공정 선택)',
          order: 10,
          functions: [],
          productChars: [],
          l3: [{ id: uid(), m4: '', name: '(공정 선택 후 작업요소 추가)', order: 10, functions: [], processChars: [] }]
        });
      }
      
      console.log('[공정저장] 최종 l2:', finalL2.map(p => `${p.no}:${p.name}`));
      return { ...prev, l2: finalL2 };
    });
    setDirty(true);
  }, [setState, setDirty]);

  // 작업요소 모달 저장 핸들러 (확정/수정 모드 모두 동일하게 작동)
  const handleWorkElementSelect = useCallback((selectedElements: { id: string; m4: string; name: string }[]) => {
    if (!targetL2Id) {
      console.warn('[작업요소 저장] targetL2Id 없음 - 중단');
      return;
    }
    
    const isConfirmed = state.structureConfirmed || false;
    console.log('[작업요소 저장] 시작', { targetL2Id, selectedCount: selectedElements.length, isConfirmed });
    
    // 중복 제거 (이름 기준) + 경고 메시지
    const duplicates = selectedElements.filter((e, idx, arr) => 
      arr.findIndex(x => x.name === e.name) !== idx
    );
    if (duplicates.length > 0) {
      const dupNames = [...new Set(duplicates.map(d => d.name))].join(', ');
      alert(`⚠️ 중복 항목이 제거되었습니다: ${dupNames}`);
    }
    
    const uniqueElements = selectedElements.filter((e, idx, arr) => 
      arr.findIndex(x => x.name === e.name) === idx
    );
    console.log('[작업요소 저장] 중복 제거 후:', uniqueElements.length);
    
    setState(prev => {
      const l2Index = prev.l2.findIndex(p => p.id === targetL2Id);
      if (l2Index === -1) return prev;
      
      const updated = { ...prev };
      const targetProcess = updated.l2[l2Index];
      
      // 기존 L3 항목들 (placeholder 제외)
      const existingL3 = targetProcess.l3.filter(l => 
        !l.name.includes('클릭') && 
        !l.name.includes('추가') && 
        !l.name.includes('필요')
      );
      const existingNames = existingL3.map(l => l.name);
      
      // 선택된 순서대로 처리
      const newL3 = uniqueElements.map((el, idx) => {
        // 기존에 있으면 유지 (순서만 변경)
        const existing = existingL3.find(e => e.name === el.name);
        if (existing) {
          return { ...existing, m4: el.m4 || existing.m4, order: (idx + 1) * 10 };
        }
        // 없으면 새로 생성
        return {
          id: uid(),
          m4: el.m4,
          name: el.name,
          order: (idx + 1) * 10,
          functions: [],
          processChars: []
        };
      });
      
      // 빈 경우 placeholder 추가
      if (newL3.length === 0) {
        newL3.push({
          id: uid(),
          m4: '',
          name: '(클릭하여 작업요소 추가)',
          order: 10,
          functions: [],
          processChars: []
        });
      }
      
      updated.l2 = [...prev.l2];
      updated.l2[l2Index] = { ...targetProcess, l3: newL3 };
      
      return updated;
    });
    
    setDirty(true);
  }, [targetL2Id, state.structureConfirmed, setState, setDirty]);

  return {
    targetL2Id,
    setTargetL2Id,
    calculateStructureMissing,
    handleProcessSave,
    handleWorkElementSelect,
  };
}

export default useProcessHandlers;
