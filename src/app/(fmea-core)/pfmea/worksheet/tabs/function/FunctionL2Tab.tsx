// CODEFREEZE
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file FunctionL2Tab.tsx
 * @description 메인공정(L2) 기능 분석 - 3행 헤더 구조 (L1과 동일한 패턴)
 *
 * @status CODEFREEZE v4.1.0 🔒
 * @frozen_date 2026-03-04
 * @freeze_level L4
 * @verified tsc 0 errors + build 227 pages
 *
 * ⚠️⚠️⚠️ 코드프리즈 (CODE FREEZE) ⚠️⚠️⚠️
 * ============================================
 * 📅 프리즈 일자: 2026-01-05 → 2026-03-04 갱신
 * 📌 프리즈 범위: 구조분석부터 3L원인분석까지 전체
 * 
 * ★★★ 2026-02-05: 최적화 리팩토링 (625줄 → 400줄 이하) ★★★
 * - 유틸리티 함수 분리: functionL2Utils.ts
 * - 중복 제거 로직 분리: hooks/useL2Deduplication.ts
 * ============================================
 */

'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { getFmeaLabels } from '@/lib/fmea-labels';
import { uid, WorksheetState } from '../../constants';
import { ensurePlaceholder } from '../../utils/safeMutate';
import { FunctionTabProps } from './types';
import { cellP0 } from '@/styles/worksheet';
import { handleEnterBlur } from '../../utils/keyboard';
import SelectableCell from '@/components/worksheet/SelectableCell';
import { GenericItemSelectModal } from '../../GenericItemSelectModal';
import type { GenericItem } from '../../useGenericItemSelect';
import { emitSave } from '../../hooks/useSaveEvent';
import { mergeRowsByMasterSelection } from '../../utils/mergeRowsByMasterSelection';
import { findLinkedProductCharsForFunction } from '../../utils/auto-link';
import SpecialCharSelectModal from '@/components/modals/SpecialCharSelectModal';
import { AutoMappingPreviewModal } from '../../autoMapping';
import SpecialCharBadge from '@/components/common/SpecialCharBadge';
import { getZebraColors } from '@/styles/level-colors';

// ★★★ 2026-02-05: 최적화 - 유틸리티 및 훅 분리 ★★★
import { isPlaceholderL2, filterMeaningfulFunctionsL2, filterMeaningfulProductChars, calculateProcRowSpanL2, calculateL2Counts } from './functionL2Utils';
import { FunctionL2Header } from '../shared/FunctionL2Header';
import { scrollToFirstMissingRow } from '../shared/scrollToMissing';
import { useFunctionL2Handlers } from './hooks/useFunctionL2Handlers';
import { useL2Deduplication } from './hooks/useL2Deduplication';
import { useAlertModal } from '../../hooks/useAlertModal';
import AlertModal from '@/components/modals/AlertModal';

// ★★★ 컨텍스트 메뉴 (수동모드 행 추가/삭제) ★★★
// ┌──────────────────────────────────────────────────────────────────┐
// │ 2L기능 컨텍스트 메뉴 — 조작 대상: 공정(읽기전용) / 기능 / 제품특성 │
// │                                                                  │
// │ 공정(L2):        구조분석에서 연동, 여기서 추가/삭제 불가          │
// │ 기능(Function):  공정별로 자유롭게 추가/삭제                      │
// │ 제품특성(Char):  기능 안에서 자유롭게 추가/삭제                    │
// │                                                                  │
// │ ※ 빈값 폴백: charId 빈값 → 기능 행 삭제로 폴백                  │
// └──────────────────────────────────────────────────────────────────┘
import { PfmeaContextMenu, initialPfmeaContextMenu, PfmeaContextMenuState } from '../../components/PfmeaContextMenu';
type L2RowType = 'process' | 'function' | 'productChar';

/** 제품특성(A4) `DataSelectModal` 전용 — 메인공정기능(A3)은 `L2FunctionSelectModal` */
type L2ProductCharModal = {
  type: string;
  procId: string;
  funcId?: string;
  charId?: string;
  title: string;
  itemCode: string;
};

export default function FunctionL2Tab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, fmeaId, customerName, importCounts }: FunctionTabProps) {
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  const lb = getFmeaLabels(isDfmea);
  const [modal, setModal] = useState<L2ProductCharModal | null>(null);
  const [l2FuncModal, setL2FuncModal] = useState<{
    procId: string;
    funcId?: string;
    processNo: string;
    processName: string;
  } | null>(null);
  const [specialCharModal, setSpecialCharModal] = useState<{ procId: string; funcId: string; charId: string; charName: string; currentValue: string } | null>(null);
  const { alertProps, showAlert } = useAlertModal();

  const isConfirmed = state.l2Confirmed || false;

  // ✅ 누락건수 계산 (화면 표시 필터와 일치)
  // ★★★ 2026-03-12 FIX: (기능 미입력)/(제품특성 미입력) placeholder도 누락으로 카운트 ★★★
  const missingCount = useMemo(() => {
    let count = 0;
    const meaningfulProcs = (state.l2 || []).filter((p: any) => {
      const name = (p.name || '').trim();
      return !!name;
    });
    meaningfulProcs.forEach((proc: any) => {
      const funcs = filterMeaningfulFunctionsL2(proc.functions || []);
      // ★ FIX: 의미 있는 기능이 0개면 공정 자체가 누락
      if (funcs.length === 0) {
        count += 1;
        return;
      }
      // ★★★ 2026-02-16: 상위레벨(기능) 입력 시 하위레벨(제품특성) 최소 1개 필수 ★★★
      funcs.forEach((f: any) => {
        if (f.name && f.name.trim()) {
          // ★ FIX: filterMeaningfulProductChars 사용하여 (제품특성 미입력) placeholder 제외
          const chars = filterMeaningfulProductChars(f.productChars || []);
          if (chars.length === 0) count += 1;
        }
      });
    });
    return count;
  }, [state.l2]);

  // ✅ COUNT 계산
  const { processCount, functionCount: l2FunctionCount, productCharCount } = useMemo(() => 
    calculateL2Counts(state.l2 || []), [state.l2]);

  // ✅ 핸들러 hook
  const {
    // ★★★ 자동/수동 모드 + 트리뷰 미리보기 ★★★
    isAutoMode,
    isLoadingMaster,
    handleToggleMode,
    switchToManualMode,
    previewResult,
    applyAutoMapping,
    cancelPreview,
    // 기존 핸들러
    handleCellClick,
    handleConfirm,
    handleEdit,
    handleInlineEditFunction,
    handleInlineEditProductChar,
    handleSave,
    handleDelete,
  } = useFunctionL2Handlers({
    state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, modal, setModal, isConfirmed, fmeaId, showAlert,
  });

  /** 메인공정기능(A3): L2FunctionSelectModal — 그 외는 기존 handleCellClick */
  const handleCellClickForTab = useCallback(
    (config: { type: string; procId: string; funcId?: string; title: string; itemCode: string }) => {
      if (config.type === 'l2Function') {
        const proc = (state.l2 || []).find((p: any) => p.id === config.procId);
        const processNo = String(proc?.no ?? '').trim();
        const processName = String(proc?.name ?? '').trim();
        if (!processNo) {
          showAlert(`구조분석에서 공정번호가 있는 ${lb.l2Short}만 ${lb.l2Func} 선택을 사용할 수 있습니다.`);
          return;
        }
        if (isConfirmed) {
          const updateFn = (prev: any) => ({ ...prev, l2Confirmed: false });
          if (setStateSynced) setStateSynced(updateFn);
          else setState(updateFn);
          setDirty(true);
        }
        setL2FuncModal({
          procId: config.procId,
          funcId: config.funcId,
          processNo,
          processName,
        });
        return;
      }
      handleCellClick(config);
    },
    [state.l2, isConfirmed, setStateSynced, setState, setDirty, handleCellClick, showAlert]
  );

  // ★★★ 2026-03-28: page.tsx 최상위에서 호출로 이동 (이중 dedup 방지) ★★★
  // useL2Deduplication({ l2: state.l2 || [], setState, setStateSynced, setDirty, saveToLocalStorage });

  // ★★★ 2026-02-05: 컨텍스트 메뉴 상태 및 핸들러 ★★★
  const [contextMenu, setContextMenu] = useState<PfmeaContextMenuState>(initialPfmeaContextMenu);
  const [menuExtra, setMenuExtra] = useState<{ rowType: L2RowType; procId: string; funcId: string; charId: string }>({ rowType: 'process', procId: '', funcId: '', charId: '' });

  const handleContextMenu = useCallback((e: React.MouseEvent, rowType: L2RowType, procId: string, funcId?: string, charId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    // ★ 2026-03-04: 확정 상태에서도 컨텍스트 메뉴 허용 (자동 확정해제)
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, l2Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }

    setMenuExtra({ rowType, procId: procId || '', funcId: funcId || '', charId: charId || '' });
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      rowIdx: 0,
      columnType: rowType === 'process' ? 'l2' : rowType === 'function' ? 'l2' : 'l3',
    });
  }, [isConfirmed, setState, setStateSynced, setDirty]);
  
  const closeContextMenu = useCallback(() => {
    setContextMenu(initialPfmeaContextMenu);
    setMenuExtra({ rowType: 'process', procId: '', funcId: '', charId: '' });
  }, []);

  // ★★★ 2026-03-06: 열 단위 분기 — 위로 새 행 추가 (process→공정은 구조분석, function→기능, productChar→제품특성) ★★★
  const handleInsertAbove = useCallback(() => {
    const { rowType, procId, funcId, charId } = menuExtra;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l2) return prev;

      const procIdx = newState.l2.findIndex((p: any) => p.id === procId);
      if (procIdx < 0) return prev;
      const proc = newState.l2[procIdx];

      if (rowType === 'productChar') {
        // 제품특성 열 → 같은 기능 내 새 제품특성 추가
        const funcIdx = proc.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        if (funcIdx >= 0) {
          const charIdx = proc.functions[funcIdx].productChars?.findIndex((c: any) => c.id === charId) ?? -1;
          const newChar = { id: `char_${Date.now()}`, name: '', specialChar: '' };
          if (!proc.functions[funcIdx].productChars) proc.functions[funcIdx].productChars = [];
          proc.functions[funcIdx].productChars.splice(charIdx >= 0 ? charIdx : 0, 0, newChar);
        }
      } else {
        // 공정/기능 열 → 같은 공정 내 새 기능 추가
        const funcIdx = proc.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        const newFunc = { id: `func_${Date.now()}`, name: '', productChars: [{ id: `char_${Date.now()}`, name: '', specialChar: '' }] };
        if (!proc.functions) proc.functions = [];
        proc.functions.splice(funcIdx >= 0 ? funcIdx : 0, 0, newFunc);
      }

      newState.l2Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    emitSave();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 2026-03-06: 열 단위 분기 — 아래로 새 행 추가 (function→기능, productChar→제품특성) ★★★
  const handleInsertBelow = useCallback(() => {
    const { rowType, procId, funcId, charId } = menuExtra;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l2) return prev;

      const procIdx = newState.l2.findIndex((p: any) => p.id === procId);
      if (procIdx < 0) return prev;
      const proc = newState.l2[procIdx];

      if (rowType === 'productChar') {
        // 제품특성 열 → 같은 기능 내 새 제품특성 추가
        const funcIdx = proc.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        if (funcIdx >= 0) {
          const chars = proc.functions[funcIdx].productChars || [];
          const charIdx = chars.findIndex((c: any) => c.id === charId);
          const newChar = { id: `char_${Date.now()}`, name: '', specialChar: '' };
          if (!proc.functions[funcIdx].productChars) proc.functions[funcIdx].productChars = [];
          proc.functions[funcIdx].productChars.splice(charIdx >= 0 ? charIdx + 1 : chars.length, 0, newChar);
        }
      } else {
        // 공정/기능 열 → 같은 공정 내 새 기능 추가
        const funcIdx = proc.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        const newFunc = { id: `func_${Date.now()}`, name: '', productChars: [{ id: `char_${Date.now()}`, name: '', specialChar: '' }] };
        if (!proc.functions) proc.functions = [];
        proc.functions.splice(funcIdx >= 0 ? funcIdx + 1 : proc.functions.length, 0, newFunc);
      }

      newState.l2Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    emitSave();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 병합 위로 추가 - L1 벤치마킹 (rowType별 분기: 공정=새공정, 기능=새기능, 제품특성=새제품특성) ★★★
  const handleAddMergedAbove = useCallback(() => {
    const { rowType, procId, funcId, charId } = menuExtra;
    
    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l2) return prev;
      
      let procIdx = newState.l2.findIndex((p: any) => p.id === procId);
      // ★ procId 미매칭 시 폴백: 기능/제품특성이면 첫 번째 공정(0)에 추가
      if (procIdx < 0 && newState.l2.length > 0 && (rowType === 'function' || rowType === 'productChar')) {
        procIdx = 0;
      }
      if (procIdx < 0) {
        return prev;
      }
      
      // ★★★ L1 벤치마킹: rowType에 따라 분기 ★★★
      if (rowType === 'process') {
        // 공정 셀 우클릭 → 새 공정 추가 (병합 밖으로!)
        // 새 공정 번호 계산 (기존 공정들의 no를 밀어냄)
        const newNo = procIdx + 1;
        // 기존 공정들의 no를 +1씩 증가
        for (let i = procIdx; i < newState.l2.length; i++) {
          if (newState.l2[i].no) newState.l2[i].no = newState.l2[i].no + 1;
        }
        const newProc = {
          id: `proc_${Date.now()}`,
          no: newNo,
          name: '',
          processType: '',
          functions: [{ id: `func_${Date.now()}`, name: '', productChars: [{ id: `char_${Date.now()}`, name: '', specialChar: '' }] }]
        };
        newState.l2.splice(procIdx, 0, newProc);
      } else if (rowType === 'function') {
        // 기능 셀 우클릭 → 같은 공정 안에 새 기능 추가 (위로)
        const proc = newState.l2[procIdx];
        const funcIdx = proc.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        const newFunc = { id: `func_${Date.now()}`, name: '', productChars: [{ id: `char_${Date.now()}`, name: '', specialChar: '' }] };
        if (!proc.functions) proc.functions = [];
        proc.functions.splice(funcIdx >= 0 ? funcIdx : 0, 0, newFunc);
      } else if (rowType === 'productChar') {
        // 제품특성 셀 우클릭 → 같은 기능 안에 새 제품특성 추가 (위로)
        const proc = newState.l2[procIdx];
        const funcIdx = proc.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        if (funcIdx < 0) {
          return prev;
        }
        
        const func = proc.functions[funcIdx];
        const charIdx = func.productChars?.findIndex((c: any) => c.id === charId) ?? -1;
        const newChar = { id: `char_${Date.now()}`, name: '', specialChar: '' };
        
        if (!func.productChars) func.productChars = [];
        func.productChars.splice(charIdx >= 0 ? charIdx : 0, 0, newChar);
      }
      
      newState.l2Confirmed = false;
      return newState;
    };
    
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    
    emitSave();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 병합 아래로 추가 - L1 벤치마킹 (rowType별 분기: 공정=새공정, 기능=새기능, 제품특성=새제품특성) ★★★
  const handleAddMergedBelow = useCallback(() => {
    const { rowType, procId, funcId, charId } = menuExtra;
    
    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l2) return prev;
      
      let procIdx = newState.l2.findIndex((p: any) => p.id === procId);
      if (procIdx < 0 && newState.l2.length > 0 && (rowType === 'function' || rowType === 'productChar')) procIdx = 0;
      if (procIdx < 0) {
        return prev;
      }
      
      // ★★★ L1 벤치마킹: rowType에 따라 분기 ★★★
      if (rowType === 'process') {
        // 공정 셀 우클릭 → 새 공정 추가 (병합 밖으로!)
        // 새 공정 번호 계산 (기존 공정 다음 번호)
        const newNo = procIdx + 2;
        // 기존 공정들의 no를 +1씩 증가 (삽입 위치 이후)
        for (let i = procIdx + 1; i < newState.l2.length; i++) {
          if (newState.l2[i].no) newState.l2[i].no = newState.l2[i].no + 1;
        }
        const newProc = {
          id: `proc_${Date.now()}`,
          no: newNo,
          name: '',
          processType: '',
          functions: [{ id: `func_${Date.now()}`, name: '', productChars: [{ id: `char_${Date.now()}`, name: '', specialChar: '' }] }]
        };
        newState.l2.splice(procIdx + 1, 0, newProc);
      } else if (rowType === 'function') {
        // 기능 셀 우클릭 → 같은 공정 안에 새 기능 추가 (아래로)
        const proc = newState.l2[procIdx];
        const funcIdx = proc.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        const newFunc = { id: `func_${Date.now()}`, name: '', productChars: [{ id: `char_${Date.now()}`, name: '', specialChar: '' }] };
        if (!proc.functions) proc.functions = [];
        proc.functions.splice(funcIdx >= 0 ? funcIdx + 1 : proc.functions.length, 0, newFunc);
      } else if (rowType === 'productChar') {
        // 제품특성 셀 우클릭 → 같은 기능 안에 새 제품특성 추가 (아래로)
        const proc = newState.l2[procIdx];
        const funcIdx = proc.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        if (funcIdx < 0) {
          return prev;
        }
        
        const func = proc.functions[funcIdx];
        const charIdx = func.productChars?.findIndex((c: any) => c.id === charId) ?? -1;
        const newChar = { id: `char_${Date.now()}`, name: '', specialChar: '' };
        
        if (!func.productChars) func.productChars = [];
        func.productChars.splice(charIdx >= 0 ? charIdx + 1 : func.productChars.length, 0, newChar);
      }
      
      newState.l2Confirmed = false;
      return newState;
    };
    
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    
    emitSave();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 행 삭제 (빈 행만 삭제 가능) ★★★
  const handleDeleteRow = useCallback(() => {
    const { rowType, procId, funcId, charId } = menuExtra;
    const proc = (state.l2 || []).find(p => p.id === procId);
    if (!proc) return;
    
    if (rowType === 'function' || rowType === 'process') {
      const funcIdx = proc.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
      if (funcIdx < 0) return;
      
      const func = proc.functions[funcIdx];
      const funcName = func?.name?.trim() || '';
      const allCharsEmpty = (func.productChars || []).every((c: any) => !c.name?.trim());
      
      // 데이터 있으면 확인 후 삭제, 빈 기능은 바로 삭제
      if (funcName && !window.confirm(`기능 "${funcName}"을(를) 삭제하시겠습니까?`)) return;
      const updateFn = (prev: WorksheetState) => {
        const newState = JSON.parse(JSON.stringify(prev));
        const pIdx = newState.l2.findIndex((p: any) => p.id === procId);
        if (pIdx >= 0) {
          // ★ 마지막 기능: 빈 기능으로 초기화 (행 유지)
          if (newState.l2[pIdx].functions.length <= 1) {
            newState.l2[pIdx].functions = [{ id: uid(), name: '', productChars: [{ id: uid(), name: '', specialChar: '' }] }];
          } else {
            newState.l2[pIdx].functions = newState.l2[pIdx].functions.filter((f: any) => f.id !== funcId);
          }
        }
        newState.l2Confirmed = false;
        return newState;
      };
      if (setStateSynced) setStateSynced(updateFn);
      else setState(updateFn);
      setDirty(true);
      emitSave();
      return;
    }
    
    if (rowType === 'productChar') {
      const funcIdx = proc.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
      if (funcIdx < 0) return;

      const func = proc.functions[funcIdx];
      const charIdx = func.productChars?.findIndex((c: any) => c.id === charId) ?? -1;
      // ★ charId 빈값 (플레이스홀더 셀) → 기능 행 삭제로 폴백
      if (charIdx < 0) {
        const funcName = func?.name?.trim() || '';
        if (funcName && !window.confirm(`기능 "${funcName}"을(를) 삭제하시겠습니까?`)) return;
        const updateFn = (prev: WorksheetState) => {
          const newState = JSON.parse(JSON.stringify(prev));
          const pIdx = newState.l2.findIndex((p: any) => p.id === procId);
          if (pIdx >= 0) {
            if (newState.l2[pIdx].functions.length <= 1) {
              newState.l2[pIdx].functions = [{ id: uid(), name: '', productChars: [{ id: uid(), name: '', specialChar: '' }] }];
            } else {
              newState.l2[pIdx].functions = newState.l2[pIdx].functions.filter((f: any) => f.id !== funcId);
            }
          }
          newState.l2Confirmed = false;
          return newState;
        };
        if (setStateSynced) setStateSynced(updateFn);
        else setState(updateFn);
        setDirty(true);
        emitSave();
        return;
      }
      
      const charName = func.productChars[charIdx]?.name?.trim() || '';
      
      if (!charName) {
        const updateFn = (prev: WorksheetState) => {
          const newState = JSON.parse(JSON.stringify(prev));
          const pIdx = newState.l2.findIndex((p: any) => p.id === procId);
          if (pIdx >= 0) {
            const fIdx = newState.l2[pIdx].functions.findIndex((f: any) => f.id === funcId);
            if (fIdx >= 0) {
              // ★ 방어: productChars 배열이 완전히 비는 것 방지
              newState.l2[pIdx].functions[fIdx].productChars = ensurePlaceholder(
                newState.l2[pIdx].functions[fIdx].productChars.filter((c: any) => c.id !== charId),
                () => ({ id: uid(), name: '', specialChar: '' }), 'L2 productChars'
              );
            }
          }
          newState.l2Confirmed = false;
          return newState;
        };
        if (setStateSynced) setStateSynced(updateFn);
        else setState(updateFn);
        setDirty(true);
        emitSave();
      } else {
        if (!window.confirm(`${lb.l2Char} "${charName}"을(를) 삭제하시겠습니까?`)) return;
        const updateFn = (prev: WorksheetState) => {
          const newState = JSON.parse(JSON.stringify(prev));
          const pIdx = newState.l2.findIndex((p: any) => p.id === procId);
          if (pIdx >= 0) {
            const fIdx = newState.l2[pIdx].functions.findIndex((f: any) => f.id === funcId);
            if (fIdx >= 0) {
              // ★ 방어: productChars 배열이 완전히 비는 것 방지
              newState.l2[pIdx].functions[fIdx].productChars = ensurePlaceholder(
                newState.l2[pIdx].functions[fIdx].productChars.filter((c: any) => c.id !== charId),
                () => ({ id: uid(), name: '', specialChar: '' }), 'L2 productChars'
              );
            }
          }
          newState.l2Confirmed = false;
          return newState;
        };
        if (setStateSynced) setStateSynced(updateFn);
        else setState(updateFn);
        setDirty(true);
        emitSave();
      }
    }
  }, [menuExtra, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ L2 공정 중복 제거 (같은 no의 공정이 2개 이상이면 병합) ★★★
  useEffect(() => {
    const l2 = state.l2 || [];
    if (l2.length < 2) return;

    const noCount = new Map<string, number>();
    l2.forEach((p: any) => {
      const key = String(p.no || '').trim();
      noCount.set(key, (noCount.get(key) || 0) + 1);
    });

    const hasDuplicates = Array.from(noCount.values()).some(c => c > 1);
    if (!hasDuplicates) return;


    const updateFn = (prev: any) => {
      const merged = new Map<string, any>();
      (prev.l2 || []).forEach((proc: any) => {
        const key = String(proc.no || '').trim();
        if (!merged.has(key)) {
          merged.set(key, { ...proc });
          return;
        }
        // 이미 있으면 기능 데이터가 있는 쪽으로 병합
        const existing = merged.get(key)!;
        const existFuncs = (existing.functions || []).filter((f: any) => f.name?.trim());
        const newFuncs = (proc.functions || []).filter((f: any) => f.name?.trim());
        if (newFuncs.length > existFuncs.length) {
          merged.set(key, { ...proc });
        }
      });
      const deduped = Array.from(merged.values());
      return { ...prev, l2: deduped };
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);

    emitSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // 마운트 시 1회만 실행

  // ✅ L2 데이터 변경 감지용 ref
  const l2FuncDataRef = useRef<string>('');

  // ✅ L2 기능 데이터 변경 시 자동 저장
  useEffect(() => {
    const allFuncs = (state.l2 || []).flatMap((p: any) => p.functions || []);
    const dataKey = JSON.stringify(allFuncs);
    if (l2FuncDataRef.current && dataKey !== l2FuncDataRef.current) {
      saveToLocalStorage?.();
    }
    l2FuncDataRef.current = dataKey;
  }, [state.l2, saveToLocalStorage]);

  // ✅ 누락 발생 시 자동 수정 모드 전환
  useEffect(() => {
    if (isConfirmed && missingCount > 0) {
      const updateFn = (prev: any) => ({ ...prev, l2Confirmed: false });
      if (setStateSynced) setStateSynced(updateFn);
      else setState(updateFn);
      setDirty(true);
    }
  }, [isConfirmed, missingCount, setState, setStateSynced, setDirty]);

  // ✅ 특별특성 선택 핸들러
  const handleSpecialCharSelect = useCallback((symbol: string) => {
    if (!specialCharModal) return;
    const { procId, funcId, charId } = specialCharModal;

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          functions: proc.functions.map((f: any) => {
            if (f.id !== funcId) return f;
            return {
              ...f,
              productChars: (f.productChars || []).map((c: any) =>
                c.id === charId ? { ...c, specialChar: symbol } : c
              )
            };
          })
        };
      });
      newState.l2Confirmed = false;
      return newState;
    };
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);

    setDirty(true);
    setSpecialCharModal(null);
    emitSave();
  }, [specialCharModal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  return (
    <div className="p-0 overflow-auto h-full" style={{ paddingBottom: '50px' }} onKeyDown={handleEnterBlur}>
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col style={{ width: '15%' }} />
          <col style={{ width: '40%' }} />
          <col style={{ width: '37%' }} />
          <col style={{ width: '8%' }} />
        </colgroup>

        <FunctionL2Header
          isConfirmed={isConfirmed}
          missingCount={missingCount}
          processCount={processCount}
          l2FunctionCount={l2FunctionCount}
          productCharCount={productCharCount}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          isAutoMode={isAutoMode}
          onToggleMode={handleToggleMode}
          isLoadingMaster={isLoadingMaster}
          importProductCharCount={importCounts?.productCharCount}
          importProcessCount={importCounts?.processCount}
          importLoaded={importCounts?.loaded}
          onMissingClick={scrollToFirstMissingRow}
        />

        <tbody>
          {(state.l2 || []).length === 0 ? (
            <EmptyRowL2 />
          ) : (
            <L2ProcessRows
              l2={state.l2 || []}
              handleCellClick={handleCellClickForTab}
              handleInlineEditFunction={handleInlineEditFunction}
              handleInlineEditProductChar={handleInlineEditProductChar}
              setSpecialCharModal={setSpecialCharModal}
              handleContextMenu={handleContextMenu}
            />
          )}
        </tbody>
      </table>

      {/* ★ A4 제품특성 선택 */}
      {modal && modal.type === 'l2ProductChar' && (
        <GenericItemSelectModal
          isOpen={!!modal}
          onClose={() => setModal(null)}
          onSwitchToManualMode={switchToManualMode}
          switchToManualToastMessage="2L 기능분석이 수동(Manual) 모드로 전환되었습니다."
          onSave={(items: GenericItem[]) => {
            // ★★★ 2026-03-30 FIX: A3 모달과 동일 패턴 — 선택에서 빠진 항목 명시적 제거
            const proc = (state.l2 || []).find((p: any) => p.id === modal.procId);
            if (!proc) { setModal(null); return; }
            const func = (proc.functions || []).find((f: any) => f.id === modal.funcId);
            if (!func) { setModal(null); return; }
            
            const selectedNames = new Set(items.map(i => i.name.trim()).filter(Boolean));
            const currentChars: any[] = func.productChars || [];
            
            // 삭제 대상: 이름이 있고 선택에서 빠진 항목
            const charsToRemove = currentChars.filter((c: any) => {
              const nm = (c.name || '').trim();
              return nm && !selectedNames.has(nm);
            });
            
            // 삭제 대상에 하위 데이터(FM 등)가 연결되어 있을 수 있으므로 확인
            if (charsToRemove.length > 0) {
              const removeNames = charsToRemove.map((c: any) => c.name).join(', ');
              if (!window.confirm(`⚠️ 적용에서 제외한 ${lb.l2Char}:\n\n${removeNames}\n\n워크시트에서 제거합니다. 계속할까요?`)) return;
            }
            
            const updateFn = (prev: WorksheetState) => {
              const newState = JSON.parse(JSON.stringify(prev));
              const pIdx = newState.l2.findIndex((p: any) => p.id === modal.procId);
              if (pIdx < 0) return prev;
              const p = newState.l2[pIdx];
              const fIdx = (p.functions || []).findIndex((f: any) => f.id === modal.funcId);
              if (fIdx < 0) return prev;
              
              const existingChars: any[] = p.functions[fIdx].productChars || [];
              const kept = new Set<string>();  // 유지할 char ID
              const existingNameSet = new Set<string>();
              
              // 1) 선택된 이름과 매칭되는 기존 항목 유지
              for (const c of existingChars) {
                const nm = (c.name || '').trim();
                if (nm && selectedNames.has(nm) && !existingNameSet.has(nm)) {
                  kept.add(c.id);
                  existingNameSet.add(nm);
                }
              }
              
              // 2) 빈 행 유지 (이름 없는 char)
              for (const c of existingChars) {
                if (!(c.name || '').trim()) kept.add(c.id);
              }
              
              // 3) 신규 항목 = 선택됐지만 기존에 없는 것
              const newNames = [...selectedNames].filter(n => !existingNameSet.has(n));
              
              // 4) 결과 조합: 유지 항목 + 빈 행에 신규 채움 + 추가 행
              const filteredChars = existingChars.filter((c: any) => kept.has(c.id));
              const emptyRows = filteredChars.filter((c: any) => !(c.name || '').trim());
              
              let ei = 0;
              const result = filteredChars.map((c: any) => {
                if (!(c.name || '').trim() && ei < newNames.length) {
                  return { ...c, name: newNames[ei++] };
                }
                return c;
              });
              
              // 빈 행보다 신규가 많으면 추가
              for (; ei < newNames.length; ei++) {
                result.push({ id: uid(), name: newNames[ei], specialChar: '' });
              }
              
              p.functions[fIdx].productChars = ensurePlaceholder(
                result,
                () => ({ id: uid(), name: '', specialChar: '' }),
                'L2 productChars'
              );
              
              newState.l2Confirmed = false;
              return newState;
            };
            
            if (setStateSynced) setStateSynced(updateFn);
            else setState(updateFn);
            setDirty(true);
            emitSave();
          }}
          itemCode={modal.itemCode}
          processNo={(state.l2 || []).find(p => p.id === modal.procId)?.no}
          fmeaId={fmeaId}
          existingItems={(() => {
            const proc = (state.l2 || []).find(p => p.id === modal.procId);
            if (!proc) return [];
            const func = (proc.functions || []).find(f => f.id === modal.funcId);
            return func ? (func.productChars || []).filter(c => c.name?.trim()).map(c => ({ id: c.id, name: c.name })) : [];
          })()}
          config={{
            title: `${lb.l2Char}(A4) 선택`,
            emoji: '🔬',
            headerGradient: 'from-emerald-500 to-green-600',
            headerAccent: 'text-emerald-200',
            searchPlaceholder: `🔍 ${lb.l2Char} 검색 또는 새 항목 입력...`,
            searchRingColor: 'focus:ring-emerald-500',
            searchBgGradient: 'from-emerald-50 to-green-50',
            parentLabel: `${lb.l2Short}:`,
            parentValue: [(state.l2 || []).find(p => p.id === modal.procId)?.no, (state.l2 || []).find(p => p.id === modal.procId)?.name].filter(Boolean).join(' · '),
          }}
        />
      )}

      {/* ★ A3 메인공정기능 선택 */}
      {l2FuncModal && (
        <GenericItemSelectModal
          isOpen={!!l2FuncModal}
          onClose={() => setL2FuncModal(null)}
          onSwitchToManualMode={switchToManualMode}
          switchToManualToastMessage="2L 기능분석이 수동(Manual) 모드로 전환되었습니다."
          onSave={(selectedItems: GenericItem[]) => {
            const proc = (state.l2 || []).find((p: any) => p.id === l2FuncModal.procId);
            if (!proc) { setL2FuncModal(null); return; }
            const selectedNames = new Set(selectedItems.map((i) => i.name.trim()).filter(Boolean));
            const funcsToRemove = (proc.functions || []).filter((f: any) => {
              const nm = (f.name || '').trim();
              return nm && !selectedNames.has(nm);
            });
            const funcsWithChildren = funcsToRemove.filter(
              (f: any) => (f.productChars || []).filter((c: any) => (c.name || '').trim()).length > 0
            );
            if (funcsWithChildren.length > 0) {
              const childCounts = funcsWithChildren
                .map((f: any) => `• ${f.name}: ${lb.l2Char} ${(f.productChars || []).filter((c: any) => (c.name || '').trim()).length}개`)
                .join('\n');
              if (!window.confirm(`⚠️ 적용에서 제외한 기능에 하위 데이터가 있습니다.\n\n${childCounts}\n\n${lb.l2Char}도 함께 삭제됩니다. 계속할까요?`)) return;
            }

            const picks = selectedItems.map((item) => ({ id: item.id, name: item.name }));
            const updateFn = (prev: WorksheetState) => {
              const newState = JSON.parse(JSON.stringify(prev));
              const pIdx = newState.l2.findIndex((p: any) => p.id === l2FuncModal.procId);
              if (pIdx < 0) return prev;
              const p = newState.l2[pIdx];
              const merged = mergeRowsByMasterSelection(p.functions || [] as any[], picks, {
                isEmpty: (f: any) => !f.name?.trim(),
                patchNamed: (f: any, item) => ({ ...f, name: item.name }),
                patchEmpty: (f: any, item) => ({ ...f, id: item.id, name: item.name }),
                append: (item) => {
                  const linkedChars = findLinkedProductCharsForFunction(prev, item.name);
                  const seenChars = new Set<string>();
                  const autoLinkedChars = linkedChars
                    .filter((cn: string) => { if (seenChars.has(cn)) return false; seenChars.add(cn); return true; })
                    .map((cn: string) => ({ id: uid(), name: cn, specialChar: null as string | null }));
                  return { id: item.id, name: item.name, productChars: autoLinkedChars.length > 0 ? autoLinkedChars : [{ id: uid(), name: '', specialChar: '' }] };
                },
              });
              p.functions = merged.length > 0 ? merged : [{ id: uid(), name: '', productChars: [{ id: uid(), name: '', specialChar: '' }] }];
              newState.l2[pIdx] = p;
              newState.l2Confirmed = false;
              return newState;
            };
            if (setStateSynced) setStateSynced(updateFn);
            else setState(updateFn);
            setDirty(true);
            setL2FuncModal(null);
            emitSave();
          }}
          itemCode="A3"
          processNo={l2FuncModal.processNo}
          fmeaId={fmeaId}
          existingItems={
            (state.l2 || [])
              .find((p: any) => p.id === l2FuncModal.procId)
              ?.functions?.filter((f: any) => f.name?.trim())
              .map((f: any) => ({ id: f.id, name: f.name })) ?? []
          }
          config={{
            title: `${lb.l2Func}(A3) 선택`,
            emoji: '⚙️',
            headerGradient: 'from-amber-500 to-orange-600',
            headerAccent: 'text-amber-200',
            searchPlaceholder: `🔍 ${lb.l2Func} 검색 또는 새 항목 입력...`,
            searchRingColor: 'focus:ring-amber-500',
            searchBgGradient: 'from-amber-50 to-orange-50',
            parentLabel: '공정:',
            parentValue: [l2FuncModal.processNo, l2FuncModal.processName].filter(Boolean).join(' · '),
          }}
        />
      )}

      {/* ★★★ 자동매핑 트리뷰 미리보기 ★★★ */}
      {previewResult && (
        <AutoMappingPreviewModal
          isOpen={!!previewResult}
          tab="function-l2"
          result={previewResult}
          state={state}
          onConfirm={applyAutoMapping}
          onCancel={cancelPreview}
        />
      )}

      {specialCharModal && (
        <SpecialCharSelectModal
          isOpen={!!specialCharModal}
          onClose={() => setSpecialCharModal(null)}
          onSelect={handleSpecialCharSelect}
          currentValue={specialCharModal.currentValue}
          productCharName={specialCharModal.charName}
          customerName={customerName}
        />
      )}

      {/* ★★★ 2026-02-05: 컨텍스트 메뉴 (수동모드 행 추가/삭제) ★★★ */}
      <PfmeaContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onInsertAbove={() => handleInsertAbove()}
        onInsertBelow={() => handleInsertBelow()}
        onDeleteRow={() => handleDeleteRow()}
        onAddMergedAbove={() => handleAddMergedAbove()}
        onAddMergedBelow={() => handleAddMergedBelow()}
      />

      {/* ★★★ 2026-02-17: AlertModal (alert() 대체) ★★★ */}
      <AlertModal {...alertProps} />
    </div>
  );
}

// ★★★ 2026-02-05: Row 컴포넌트 분리 ★★★

function EmptyRowL2() {
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  const lb = getFmeaLabels(isDfmea);
  const zebra = getZebraColors(0);
  return (
    <tr>
      <td className="border border-[#ccc] p-2.5 text-center font-semibold align-middle" style={{ background: zebra.structure }}>
        (구조분석에서 {lb.l2Short} 추가)
      </td>
      <td className={cellP0} style={{ background: zebra.function }}>
        <SelectableCell value="" placeholder={`${lb.l2Func} 선택`} bgColor={zebra.function} onClick={() => { }} />
      </td>
      <td className={cellP0} style={{ background: zebra.function }}>
        <SelectableCell value="" placeholder={`${lb.l2Char} 선택`} bgColor={zebra.function} textColor={'#1b5e20'} onClick={() => { }} />
      </td>
      <td className="border border-[#ccc] p-1 text-center text-[#999] text-xs align-middle" style={{ background: zebra.function }}>-</td>
    </tr>
  );
}

function L2ProcessRows({ l2, handleCellClick, handleInlineEditFunction, handleInlineEditProductChar, setSpecialCharModal, handleContextMenu }: any) {
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  const lb = getFmeaLabels(isDfmea);
  let globalRowIdx = 0;

  // ★★★ 2026-02-18: placeholder 공정 중복 제거 (실제 공정 있으면 placeholder 제외) ★★★
  const isPlaceholderProc = (p: any) => {
    const name = (p.name || '').trim();
    return !name?.trim();
  };
  const meaningfulProcs = l2.filter((p: any) => !isPlaceholderProc(p));
  const effectiveL2 = meaningfulProcs.length > 0 ? meaningfulProcs : l2;

  return (
    <>
      {effectiveL2.map((proc: any, pIdx: number) => {
        // ★★★ 2026-02-05: 수동모드에서는 모든 기능 표시 ★★★
        const allFuncs = proc.functions || [];
        const meaningfulFuncs = filterMeaningfulFunctionsL2(allFuncs);
        const funcsToRender = meaningfulFuncs.length > 0 ? allFuncs : allFuncs.slice(0, 1);
        // ★ 2026-03-28: 빈 행 포함 전체 표시 — charsToRender=allChars와 동일하게 계산
        const procRowSpan = Math.max(1, funcsToRender.reduce((sum: number, f: any) => {
          const chars = f.productChars || [];
          return sum + Math.max(1, chars.length);
        }, 0));

        // 기능이 없는 경우
        if (funcsToRender.length === 0) {
          const rowIdx = globalRowIdx++;
          const zebra = getZebraColors(rowIdx);
          const firstFuncId = (proc.functions || [])[0]?.id || '';
          return (
            <tr key={proc.id} onContextMenu={(e) => handleContextMenu(e, 'function', proc.id, firstFuncId)}>
              <td rowSpan={procRowSpan} className="border border-[#ccc] px-0.5 py-0.5 text-center font-semibold text-[10px] align-middle cursor-pointer hover:bg-blue-50" style={{ background: zebra.structure }} onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, 'process', proc.id); }}>
                {proc.no}. {proc.name}
              </td>
              <td className={cellP0} style={{ background: zebra.function }} onContextMenu={(e) => handleContextMenu(e, 'function', proc.id, firstFuncId)}>
                <SelectableCell value="" placeholder={`${lb.l2Func} 선택`} bgColor={zebra.function} onClick={() => handleCellClick({ type: 'l2Function', procId: proc.id, title: `${lb.l2Short} 기능 선택`, itemCode: 'A3' })} />
              </td>
              <td className={cellP0} style={{ background: zebra.function }}>
                <SelectableCell value="" placeholder={`${lb.l2Char} 선택`} bgColor={zebra.function} textColor={'#1b5e20'} onClick={() => { }} />
              </td>
              <td className="border border-[#ccc] p-1 text-center text-[#999] text-xs align-middle" style={{ background: zebra.function }}>-</td>
            </tr>
          );
        }

        return funcsToRender.map((f: any, fIdx: number) => {
          // ★ 2026-03-28: 빈 행 포함 전체 표시
          const allChars = f.productChars || [];
          const charsToRender = allChars;
          const funcRowSpan = Math.max(1, charsToRender.length);
          const funcFirstRowIdx = globalRowIdx;

          // 제품특성이 없는 경우
          if (charsToRender.length === 0) {
            const rowIdx = globalRowIdx++;
            const zebra = getZebraColors(rowIdx);
            return (
              <tr key={f.id} onContextMenu={(e) => handleContextMenu(e, 'function', proc.id, f.id)}>
                {fIdx === 0 && (
                  <td rowSpan={procRowSpan} className="border border-[#ccc] px-0.5 py-0.5 text-center font-semibold text-[10px] align-middle cursor-pointer hover:bg-blue-50" style={{ background: zebra.structure }} onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, 'process', proc.id); }}>
                    {proc.no}. {proc.name}
                  </td>
                )}
                <td rowSpan={funcRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: zebra.function }} onContextMenu={(e) => handleContextMenu(e, 'function', proc.id, f.id)}>
                  <SelectableCell value={f.name} placeholder={lb.l2Func} bgColor={zebra.function} isRevised={f.isRevised} onClick={() => handleCellClick({ type: 'l2Function', procId: proc.id, funcId: f.id, title: `${lb.l2Short} 기능 선택`, itemCode: 'A3' })} onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, f.id, newValue)} />
                </td>
                <td className={cellP0} style={{ background: zebra.function }} onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, 'productChar', proc.id, f.id, ''); }}>
                  <SelectableCell value="" placeholder={`${lb.l2Char} 선택`} bgColor={zebra.function} textColor={'#1b5e20'} onClick={() => handleCellClick({ type: 'l2ProductChar', procId: proc.id, funcId: f.id, title: `${lb.l2Char} 선택`, itemCode: 'A4' })} />
                </td>
                <td className="border border-[#ccc] p-1 text-center text-[#999] text-xs align-middle" style={{ background: zebra.function }}>-</td>
              </tr>
            );
          }

          // 제품특성이 있는 경우
          return charsToRender.map((c: any, cIdx: number) => {
            const rowIdx = globalRowIdx++;
            const zebra = getZebraColors(rowIdx);
            const firstRowZebra = getZebraColors(funcFirstRowIdx);
            return (
              <tr key={c.id} onContextMenu={(e) => handleContextMenu(e, 'productChar', proc.id, f.id, c.id)}>
                {fIdx === 0 && cIdx === 0 && (
                  <td rowSpan={procRowSpan} className="border border-[#ccc] px-0.5 py-0.5 text-center font-semibold text-[10px] align-middle cursor-pointer hover:bg-blue-50" style={{ background: firstRowZebra.structure }} onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, 'process', proc.id); }}>
                    {proc.no}. {proc.name}
                  </td>
                )}
                {cIdx === 0 && (
                  <td rowSpan={funcRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: firstRowZebra.function }} onContextMenu={(e) => handleContextMenu(e, 'function', proc.id, f.id)}>
                    <SelectableCell value={f.name} placeholder={lb.l2Func} bgColor={firstRowZebra.function} isRevised={f.isRevised} onClick={() => handleCellClick({ type: 'l2Function', procId: proc.id, funcId: f.id, title: `${lb.l2Short} 기능 선택`, itemCode: 'A3' })} onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, f.id, newValue)} />
                  </td>
                )}
                <td className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-0 align-middle" style={{ background: zebra.failure }} onContextMenu={(e) => handleContextMenu(e, 'productChar', proc.id, f.id, c.id)}>
                  <SelectableCell value={c.name} placeholder={lb.l2Char} bgColor={zebra.failure} textColor={'#e65100'} isRevised={c.isRevised} onClick={() => handleCellClick({ type: 'l2ProductChar', procId: proc.id, funcId: f.id, charId: c.id, title: `${lb.l2Char} 선택`, itemCode: 'A4' })} onDoubleClickEdit={(newValue) => handleInlineEditProductChar(proc.id, f.id, c.id, newValue)} />
                </td>
                <td className="border border-[#ccc] p-0 text-center align-middle" style={{ background: zebra.failure }}>
                  <SpecialCharBadge value={c.specialChar || ''} onClick={() => setSpecialCharModal({ procId: proc.id, funcId: f.id, charId: c.id, charName: c.name, currentValue: c.specialChar || '' })} />
                </td>
              </tr>
            );
          });
        });
      })}
    </>
  );
}
