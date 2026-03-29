// CODEFREEZE
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file FunctionL3Tab.tsx
 * @description 작업요소(L3) 기능 분석 - 3행 헤더 구조 (L1과 동일한 패턴)
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
 * ★★★ 2026-02-05: 최적화 리팩토링 (624줄 → 400줄 이하) ★★★
 * - 유틸리티 함수 분리: functionL3Utils.ts
 * - 중복 제거 로직 분리: hooks/useL3Deduplication.ts
 * ============================================
 */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { uid, WorksheetState } from '../../constants';
import { ensurePlaceholder } from '../../utils/safeMutate';
import { FunctionTabProps } from './types';
import { cellP0 } from '@/styles/worksheet';
import { handleEnterBlur } from '../../utils/keyboard';
import { emitSave } from '../../hooks/useSaveEvent';
import { getZebraColors } from '@/styles/level-colors';
import SelectableCell from '@/components/worksheet/SelectableCell';
import { GenericItemSelectModal } from '../../GenericItemSelectModal';
import type { GenericItem } from '../../useGenericItemSelect';
import SpecialCharSelectModal from '@/components/modals/SpecialCharSelectModal';
import SpecialCharBadge from '@/components/common/SpecialCharBadge';
import { isMissing } from '../shared/tabUtils';
import { L3TabHeader } from '../shared/L3TabHeader';
import { AutoMappingPreviewModal } from '../../autoMapping';

// ★★★ 2026-02-05: 최적화 - 유틸리티 및 훅 분리 ★★★
import { isMeaningfulL3, filterMeaningfulWorkElements, filterMeaningfulFunctionsL3, filterMeaningfulProcessChars, calculateWorkElementRowSpan, calculateProcRowSpanL3, calculateL3Counts } from './functionL3Utils';
import { useFunctionL3Handlers } from './hooks/useFunctionL3Handlers';
import { useL3Deduplication } from './hooks/useL3Deduplication';
import { useAlertModal } from '../../hooks/useAlertModal';
import AlertModal from '@/components/modals/AlertModal';

// ★★★ 컨텍스트 메뉴 (수동모드 행 추가/삭제) ★★★
// ┌──────────────────────────────────────────────────────────────────┐
// │ 3L기능 컨텍스트 메뉴 — 조작 대상: 작업요소(읽기전용) / 기능 / 공정특성 │
// │                                                                  │
// │ 작업요소(L3):    구조분석에서 연동, 여기서 추가/삭제 불가          │
// │ 기능(Function):  작업요소별로 자유롭게 추가/삭제                   │
// │ 공정특성(Char):  기능 안에서 자유롭게 추가/삭제                    │
// │                                                                  │
// │ ※ 빈값 폴백: charId 빈값 → 기능 행 삭제로 폴백                  │
// └──────────────────────────────────────────────────────────────────┘
import { PfmeaContextMenu, initialPfmeaContextMenu, PfmeaContextMenuState } from '../../components/PfmeaContextMenu';
type L3RowType = 'workElement' | 'function' | 'processChar';

export default function FunctionL3Tab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, fmeaId, customerName, importCounts }: FunctionTabProps) {
  const [modal, setModal] = useState<{ type: string; procId: string; l3Id: string; funcId?: string; title: string; itemCode: string; workElementName?: string; parentCategory?: string } | null>(null);
  const [specialCharModal, setSpecialCharModal] = useState<{ procId: string; l3Id: string; funcId: string; charId: string } | null>(null);
  const { alertProps, showAlert } = useAlertModal();

  const isConfirmed = state.l3Confirmed || false;

  // ✅ 핸들러 hook
  const {
    isAutoMode,
    isLoadingMaster,
    handleToggleMode,
    switchToManualMode,
    previewResult,
    applyAutoMapping,
    cancelPreview,
    handleCellClick,
    handleConfirm,
    handleEdit,
    handleInlineEditFunction,
    handleInlineEditProcessChar,
    handleSave,
    handleDelete,
    handleSpecialCharSelect,
  } = useFunctionL3Handlers({
    state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, modal, setModal, specialCharModal, setSpecialCharModal, isConfirmed, fmeaId, showAlert,
  });

  // ✅ 누락 건수 계산 (기능 없거나 공정특성 없으면 누락)
  const missingCounts = useMemo(() => {
    let functionCount = 0;
    const meaningfulProcs = (state.l2 || []).filter((p: any) => isMeaningfulL3(p.name));
    meaningfulProcs.forEach((proc: any) => {
      const meaningfulL3 = filterMeaningfulWorkElements(proc.l3 || []);
      meaningfulL3.forEach((we: any) => {
        const allFuncs = we.functions || [];
        const hasProcessChars = allFuncs.some((f: any) =>
          (f.processChars || []).some((c: any) => isMeaningfulL3(c?.name))
        );
        const meaningfulFuncs = filterMeaningfulFunctionsL3(allFuncs);
        if (meaningfulFuncs.length === 0 && !hasProcessChars) {
          functionCount++;
        } else if (meaningfulFuncs.length > 0 && !hasProcessChars) {
          functionCount++;
        }
      });
    });
    return { functionCount, charCount: 0, total: functionCount };
  }, [state.l2]);

  const missingCount = missingCounts.total;

  // ✅ 누락 작업요소 ID Set (스크롤 이동용)
  const missingWeIds = useMemo(() => {
    const ids = new Set<string>();
    const meaningfulProcs = (state.l2 || []).filter((p: any) => isMeaningfulL3(p.name));
    meaningfulProcs.forEach((proc: any) => {
      const meaningfulL3 = filterMeaningfulWorkElements(proc.l3 || []);
      meaningfulL3.forEach((we: any) => {
        const allFuncs = we.functions || [];
        const hasProcessChars = allFuncs.some((f: any) =>
          (f.processChars || []).some((c: any) => isMeaningfulL3(c?.name))
        );
        if (!hasProcessChars) ids.add(we.id);
      });
    });
    return ids;
  }, [state.l2]);

  // ✅ 누락 항목으로 스크롤 이동
  const scrollToFirstMissing = useCallback(() => {
    const el = document.querySelector('[data-missing-we="true"]') as HTMLElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '3px solid #dc2626';
      el.style.outlineOffset = '-1px';
      setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 2000);
    }
  }, []);

  // ✅ COUNT 계산
  const { workElementCount, functionCount: l3FunctionCount, processCharCount } = useMemo(() =>
    calculateL3Counts(state.l2 || []), [state.l2]);

  // ★★★ 2026-03-28: page.tsx 최상위에서 호출로 이동 (이중 dedup 방지) ★★★
  // useL3Deduplication({ l2: state.l2 || [], setState, setStateSynced, setDirty, saveToLocalStorage });

  // ★★★ 2026-02-05: 컨텍스트 메뉴 상태 및 핸들러 ★★★
  const [contextMenu, setContextMenu] = useState<PfmeaContextMenuState>(initialPfmeaContextMenu);
  const [menuExtra, setMenuExtra] = useState<{ rowType: L3RowType; procId: string; l3Id: string; funcId: string; charId: string }>({ rowType: 'workElement', procId: '', l3Id: '', funcId: '', charId: '' });

  const handleContextMenu = useCallback((e: React.MouseEvent, rowType: L3RowType, procId: string, l3Id: string, funcId?: string, charId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    // ★ 2026-03-04: 확정 상태에서도 컨텍스트 메뉴 허용 (자동 확정해제 — handleCellClick 패턴 일치)
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, l3Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }

    setMenuExtra({ rowType, procId: procId || '', l3Id: l3Id || '', funcId: funcId || '', charId: charId || '' });
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      rowIdx: 0,
      columnType: 'l3',
    });
  }, [isConfirmed, setState, setStateSynced, setDirty]);
  
  const closeContextMenu = useCallback(() => {
    setContextMenu(initialPfmeaContextMenu);
    setMenuExtra({ rowType: 'workElement', procId: '', l3Id: '', funcId: '', charId: '' });
  }, []);

  // ★★★ 2026-03-06: 열 단위 분기 — 위로 새 행 추가 (function→기능, processChar→공정특성) ★★★
  // ※ funcId 빈값 시: functions 배열이 비어있는 초기 상태 → 새 기능 무조건 추가
  const handleInsertAboveCtx = useCallback(() => {
    const { rowType, procId, l3Id, funcId, charId } = menuExtra;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const procIdx = newState.l2.findIndex((p: any) => p.id === procId);
      if (procIdx < 0) return prev;

      const proc = newState.l2[procIdx];
      const weIdx = proc.l3?.findIndex((we: any) => we.id === l3Id) ?? -1;
      if (weIdx < 0) return prev;
      const we = proc.l3[weIdx];

      if (rowType === 'processChar' && funcId) {
        // 공정특성 열 → 같은 기능 내 새 공정특성 추가
        const fIdx = we.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        if (fIdx >= 0) {
          const charIdx = we.functions[fIdx].processChars?.findIndex((c: any) => c.id === charId) ?? -1;
          const newChar = { id: `char_${Date.now()}`, name: '', specialChar: '' };
          if (!we.functions[fIdx].processChars) we.functions[fIdx].processChars = [];
          we.functions[fIdx].processChars.splice(charIdx >= 0 ? charIdx : 0, 0, newChar);
        }
      } else {
        // 기능/작업요소 열 → 새 기능 추가 (funcId 빈값이어도 동작)
        const fIdx = funcId ? (we.functions?.findIndex((f: any) => f.id === funcId) ?? -1) : -1;
        const newFunc = { id: `func_${Date.now()}`, name: '', processChars: [{ id: `char_${Date.now()}_0`, name: '', specialChar: '' }] };
        if (!we.functions) we.functions = [];
        we.functions.splice(fIdx >= 0 ? fIdx : 0, 0, newFunc);
      }

      newState.l3Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    emitSave();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 2026-03-06: 열 단위 분기 — 아래로 새 행 추가 (function→기능, processChar→공정특성) ★★★
  // ※ funcId 빈값 시: functions 배열이 비어있는 초기 상태 → 새 기능 무조건 추가
  const handleInsertBelowCtx = useCallback(() => {
    const { rowType, procId, l3Id, funcId, charId } = menuExtra;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const procIdx = newState.l2.findIndex((p: any) => p.id === procId);
      if (procIdx < 0) return prev;

      const proc = newState.l2[procIdx];
      const weIdx = proc.l3?.findIndex((we: any) => we.id === l3Id) ?? -1;
      if (weIdx < 0) return prev;
      const we = proc.l3[weIdx];

      if (rowType === 'processChar' && funcId) {
        // 공정특성 열 → 같은 기능 내 새 공정특성 추가
        const fIdx = we.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        if (fIdx >= 0) {
          const chars = we.functions[fIdx].processChars || [];
          const charIdx = chars.findIndex((c: any) => c.id === charId);
          const newChar = { id: `char_${Date.now()}`, name: '', specialChar: '' };
          if (!we.functions[fIdx].processChars) we.functions[fIdx].processChars = [];
          we.functions[fIdx].processChars.splice(charIdx >= 0 ? charIdx + 1 : chars.length, 0, newChar);
        }
      } else {
        // 기능/작업요소 열 → 새 기능 추가 (funcId 빈값이어도 동작)
        const fIdx = funcId ? (we.functions?.findIndex((f: any) => f.id === funcId) ?? -1) : -1;
        const newFunc = { id: `func_${Date.now()}`, name: '', processChars: [{ id: `char_${Date.now()}_0`, name: '', specialChar: '' }] };
        if (!we.functions) we.functions = [];
        we.functions.splice(fIdx >= 0 ? fIdx + 1 : we.functions.length, 0, newFunc);
      }

      newState.l3Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    emitSave();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 2026-03-06 FIX: 병합 위로 추가 — rowType별 분기 (workElement/function→기능, processChar→공정특성) ★★★
  const handleAddMergedAboveCtx = useCallback(() => {
    const { rowType, procId, l3Id, funcId, charId } = menuExtra;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const procIdx = newState.l2.findIndex((p: any) => p.id === procId);
      if (procIdx < 0) return prev;

      const proc = newState.l2[procIdx];
      const weIdx = proc.l3?.findIndex((we: any) => we.id === l3Id) ?? -1;
      if (weIdx < 0) return prev;

      const we = proc.l3[weIdx];

      if (rowType === 'processChar' && funcId) {
        // 공정특성 열 → 같은 기능 내 새 공정특성 추가
        const fIdx = we.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        if (fIdx < 0) return prev;
        const func = we.functions[fIdx];
        const charIdx = func.processChars?.findIndex((c: any) => c.id === charId) ?? -1;
        const newChar = { id: `char_${Date.now()}`, name: '', specialChar: '' };
        if (!func.processChars) func.processChars = [];
        func.processChars.splice(charIdx >= 0 ? charIdx : 0, 0, newChar);
      } else {
        // 작업요소/기능 열 → 같은 작업요소 내 새 기능 추가 (funcId 빈값이어도 동작)
        const fIdx = funcId ? (we.functions?.findIndex((f: any) => f.id === funcId) ?? -1) : -1;
        const newFunc = { id: `func_${Date.now()}`, name: '', processChars: [{ id: `char_${Date.now()}`, name: '', specialChar: '' }] };
        if (!we.functions) we.functions = [];
        we.functions.splice(fIdx >= 0 ? fIdx : 0, 0, newFunc);
      }

      newState.l3Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    emitSave();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 2026-03-06 FIX: 병합 아래로 추가 — rowType별 분기 (workElement/function→기능, processChar→공정특성) ★★★
  const handleAddMergedBelowCtx = useCallback(() => {
    const { rowType, procId, l3Id, funcId, charId } = menuExtra;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const procIdx = newState.l2.findIndex((p: any) => p.id === procId);
      if (procIdx < 0) return prev;

      const proc = newState.l2[procIdx];
      const weIdx = proc.l3?.findIndex((we: any) => we.id === l3Id) ?? -1;
      if (weIdx < 0) return prev;

      const we = proc.l3[weIdx];

      if (rowType === 'processChar' && funcId) {
        // 공정특성 열 → 같은 기능 내 새 공정특성 추가
        const fIdx = we.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
        if (fIdx < 0) return prev;
        const func = we.functions[fIdx];
        const charIdx = func.processChars?.findIndex((c: any) => c.id === charId) ?? -1;
        const newChar = { id: `char_${Date.now()}`, name: '', specialChar: '' };
        if (!func.processChars) func.processChars = [];
        func.processChars.splice(charIdx >= 0 ? charIdx + 1 : func.processChars.length, 0, newChar);
      } else {
        // 작업요소/기능 열 → 같은 작업요소 내 새 기능 추가 (funcId 빈값이어도 동작)
        const fIdx = funcId ? (we.functions?.findIndex((f: any) => f.id === funcId) ?? -1) : -1;
        const newFunc = { id: `func_${Date.now()}`, name: '', processChars: [{ id: `char_${Date.now()}`, name: '', specialChar: '' }] };
        if (!we.functions) we.functions = [];
        we.functions.splice(fIdx >= 0 ? fIdx + 1 : we.functions.length, 0, newFunc);
      }

      newState.l3Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    emitSave();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 행 삭제 (빈 행만 삭제 가능) ★★★
  const handleDeleteRowCtx = useCallback(() => {
    const { rowType, procId, l3Id, funcId, charId } = menuExtra;
    const proc = (state.l2 || []).find(p => p.id === procId);
    if (!proc) return;
    
    const we = (proc.l3 || []).find(w => w.id === l3Id);
    if (!we) return;
    
    if (rowType === 'function' || rowType === 'workElement') {
      const funcIdx = we.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
      if (funcIdx < 0) return;
      
      const func = we.functions[funcIdx];
      const funcName = func?.name?.trim() || '';
      const allCharsEmpty = (func.processChars || []).every((c: any) => !c.name?.trim());
      
      // 데이터 있으면 확인 후 삭제, 빈 기능은 바로 삭제
      if (funcName && !window.confirm(`기능 "${funcName}"을(를) 삭제하시겠습니까?`)) return;
      const updateFn = (prev: WorksheetState) => {
        const newState = JSON.parse(JSON.stringify(prev));
        const pIdx = newState.l2.findIndex((p: any) => p.id === procId);
        if (pIdx >= 0) {
          const wIdx = newState.l2[pIdx].l3.findIndex((w: any) => w.id === l3Id);
          if (wIdx >= 0) {
            // ★ 마지막 기능: 빈 기능으로 초기화 (행 유지)
            if (newState.l2[pIdx].l3[wIdx].functions.length <= 1) {
              newState.l2[pIdx].l3[wIdx].functions = [{ id: uid(), name: '', processChars: [{ id: uid(), name: '', specialChar: '' }] }];
            } else {
              newState.l2[pIdx].l3[wIdx].functions = newState.l2[pIdx].l3[wIdx].functions.filter((f: any) => f.id !== funcId);
            }
          }
        }
        newState.l3Confirmed = false;
        return newState;
      };
      if (setStateSynced) setStateSynced(updateFn);
      else setState(updateFn);
      setDirty(true);
      emitSave();
      return;
    }
    
    if (rowType === 'processChar') {
      const funcIdx = we.functions?.findIndex((f: any) => f.id === funcId) ?? -1;
      if (funcIdx < 0) return;

      const func = we.functions[funcIdx];
      const charIdx = func.processChars?.findIndex((c: any) => c.id === charId) ?? -1;
      // ★ charId 빈값 (플레이스홀더 셀) → 기능 행 삭제로 폴백
      if (charIdx < 0) {
        const funcName = func?.name?.trim() || '';
        if (funcName && !window.confirm(`기능 "${funcName}"을(를) 삭제하시겠습니까?`)) return;
        const updateFn = (prev: WorksheetState) => {
          const newState = JSON.parse(JSON.stringify(prev));
          const pIdx = newState.l2.findIndex((p: any) => p.id === procId);
          if (pIdx >= 0) {
            const wIdx = newState.l2[pIdx].l3.findIndex((w: any) => w.id === l3Id);
            if (wIdx >= 0) {
              if (newState.l2[pIdx].l3[wIdx].functions.length <= 1) {
                newState.l2[pIdx].l3[wIdx].functions = [{ id: uid(), name: '', processChars: [{ id: uid(), name: '', specialChar: '' }] }];
              } else {
                newState.l2[pIdx].l3[wIdx].functions = newState.l2[pIdx].l3[wIdx].functions.filter((f: any) => f.id !== funcId);
              }
            }
          }
          newState.l3Confirmed = false;
          return newState;
        };
        if (setStateSynced) setStateSynced(updateFn);
        else setState(updateFn);
        setDirty(true);
        emitSave();
        return;
      }
      
      const charName = func.processChars[charIdx]?.name?.trim() || '';
      
      if (!charName) {
        const updateFn = (prev: WorksheetState) => {
          const newState = JSON.parse(JSON.stringify(prev));
          const pIdx = newState.l2.findIndex((p: any) => p.id === procId);
          if (pIdx >= 0) {
            const wIdx = newState.l2[pIdx].l3.findIndex((w: any) => w.id === l3Id);
            if (wIdx >= 0) {
              const fIdx = newState.l2[pIdx].l3[wIdx].functions.findIndex((f: any) => f.id === funcId);
              if (fIdx >= 0) {
                // ★ 방어: processChars 배열이 완전히 비는 것 방지
                newState.l2[pIdx].l3[wIdx].functions[fIdx].processChars = ensurePlaceholder(
                  newState.l2[pIdx].l3[wIdx].functions[fIdx].processChars.filter((c: any) => c.id !== charId),
                  () => ({ id: uid(), name: '', specialChar: '' }), 'L3 processChars'
                );
              }
            }
          }
          newState.l3Confirmed = false;
          return newState;
        };
        if (setStateSynced) setStateSynced(updateFn);
        else setState(updateFn);
        setDirty(true);
        emitSave();
      } else {
        if (!window.confirm(`공정특성 "${charName}"을(를) 삭제하시겠습니까?`)) return;
        const deleteCharId = charId; // ★ closure 안전: confirm 시점의 charId 캡처
        const updateFn = (prev: WorksheetState) => {
          const newState = JSON.parse(JSON.stringify(prev));
          const pIdx = newState.l2.findIndex((p: any) => p.id === procId);
          if (pIdx < 0) return prev;
          const wIdx = newState.l2[pIdx].l3.findIndex((w: any) => w.id === l3Id);
          if (wIdx < 0) return prev;
          const fIdx = newState.l2[pIdx].l3[wIdx].functions.findIndex((f: any) => f.id === funcId);
          if (fIdx < 0) return prev;

          const before = newState.l2[pIdx].l3[wIdx].functions[fIdx].processChars.length;
          const filtered = newState.l2[pIdx].l3[wIdx].functions[fIdx].processChars.filter((c: any) => c.id !== deleteCharId);
          console.log(`[L3 공정특성 삭제] charId=${deleteCharId} before=${before} after=${filtered.length}`);
          // 다른 공정특성이 남아있으면 placeholder 불필요
          newState.l2[pIdx].l3[wIdx].functions[fIdx].processChars = filtered.length > 0
            ? filtered
            : [{ id: uid(), name: '', specialChar: '' }];
          newState.l3Confirmed = false;
          return newState;
        };
        if (setStateSynced) setStateSynced(updateFn);
        else setState(updateFn);
        setDirty(true);
        emitSave();
      }
    }
  }, [menuExtra, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ✅ L3 데이터 변경 감지용 ref
  const l3FuncDataRef = useRef<string>('');

  // ✅ L3 기능 데이터 변경 시 자동 저장
  useEffect(() => {
    const allFuncs = (state.l2 || []).flatMap((p: any) => (p.l3 || []).flatMap((we: any) => we.functions || []));
    const dataKey = JSON.stringify(allFuncs);
    if (l3FuncDataRef.current && dataKey !== l3FuncDataRef.current) {
      saveToLocalStorage?.();
    }
    l3FuncDataRef.current = dataKey;
  }, [state.l2, saveToLocalStorage]);

  // ✅ 누락 발생 시 자동 수정 모드 전환
  useEffect(() => {
    if (isConfirmed && missingCount > 0) {
      const updateFn = (prev: any) => ({ ...prev, l3Confirmed: false });
      if (setStateSynced) setStateSynced(updateFn);
      else setState(updateFn);
      setDirty(true);
    }
  }, [isConfirmed, missingCount, setState, setStateSynced, setDirty]);

  // ✅ 의미 있는 기능 체크 헬퍼
  const isMeaningfulFunc = (f: any) => {
    const name = f.name || '';
    const hasProcessChars = (f.processChars || []).some((c: any) => isMeaningfulL3(c?.name));
    const isNameMeaningful = isMeaningfulL3(name) && !name.includes('자동생성');
    return isNameMeaningful || hasProcessChars;
  };

  // ✅ 의미 있는 공정특성 필터
  // 동일 공정특성명 복수 행 허용 — 이름 기준 중복 제거 없음
  // ⚠️ AI주의: `removeDuplicates: true` 로 바꾸면 동일 이름 B3 행이 한 줄로 합쳐져 rowSpan·표시가 깨짐.
  const getMeaningfulChars = (chars: any[]) => filterMeaningfulProcessChars(chars, false);

  // ✅ 공정/작업요소 rowSpan 계산
  // ★ 2026-03-28: 빈 행 포함 전체 표시 — 렌더링과 동일하게 계산
  const getProcRowSpan = (proc: any) => {
    const l3List = (proc.l3 || []);
    if (l3List.length === 0) return 1;
    return l3List.reduce((acc: number, we: any) => {
      const funcs = we.functions || [];
      if (funcs.length === 0) return acc + 1;
      return acc + funcs.reduce((a: number, f: any) => a + Math.max(1, (f.processChars || []).length), 0);
    }, 0);
  };

  const getWeRowSpan = (we: any) => {
    const funcs = we.functions || [];
    if (funcs.length === 0) return 1;
    return funcs.reduce((a: number, f: any) => a + Math.max(1, (f.processChars || []).length), 0);
  };

  const hasAnyL3 = (state.l2 || []).some(p => (p.l3 || []).length > 0);

  return (
    <div className="p-0 overflow-auto h-full" style={{ paddingBottom: '50px' }} onKeyDown={handleEnterBlur}>
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col style={{ width: '13%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '7%' }} />
        </colgroup>

        <L3TabHeader
          tabType="function"
          isConfirmed={isConfirmed}
          missingCount={missingCount}
          workElementCount={workElementCount}
          primaryCount={l3FunctionCount}
          secondaryCount={processCharCount}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          stepLabel="3L 기능분석"
          primaryLabel="작업요소기능"
          secondaryLabel="공정특성"
          showSecondary={true}
          isAutoMode={isAutoMode}
          onToggleMode={handleToggleMode}
          isLoadingMaster={isLoadingMaster}
          onMissingClick={scrollToFirstMissing}
          importSecondaryCount={importCounts?.processCharCount}
          importLoaded={importCounts?.loaded}
        />

        <tbody>
          {!hasAnyL3 ? (
            <EmptyRowL3 />
          ) : (
            <L3ProcessRows
              l2={state.l2 || []}
              isMeaningfulFunc={isMeaningfulFunc}
              getMeaningfulChars={getMeaningfulChars}
              getProcRowSpan={getProcRowSpan}
              getWeRowSpan={getWeRowSpan}
              handleCellClick={handleCellClick}
              handleInlineEditFunction={handleInlineEditFunction}
              handleInlineEditProcessChar={handleInlineEditProcessChar}
              setSpecialCharModal={setSpecialCharModal}
              handleContextMenu={handleContextMenu}
              missingWeIds={missingWeIds}
            />
          )}
        </tbody>
      </table>

      {modal && (
        <GenericItemSelectModal
          isOpen={!!modal}
          onClose={() => setModal(null)}
          onSwitchToManualMode={switchToManualMode}
          switchToManualToastMessage="3L 기능분석이 수동(Manual) 모드로 전환되었습니다."
          onSave={(items: GenericItem[]) => {
            /**
             * ★★★ 수동1원칙: 플레이스홀더 보호 — 절대 삭제하지 않는다 ★★★
             * 삭제하면 배열(rowSpan) 깨진다.
             * 1순위: 빈 슬롯에 모달 데이터를 채운다.
             * 2순위: 남은 빈 슬롯에 "미입력" 문자열을 채워 배열을 유지한다.
             */
            if (!modal) return;
            const selectedNames = new Set(items.map(i => i.name.trim()).filter(Boolean));
            const updateFn = (prev: any) => {
              const newState = JSON.parse(JSON.stringify(prev));
              const procIdx = newState.l2.findIndex((p: any) => p.id === modal.procId);
              if (procIdx < 0) return prev;
              const weIdx = newState.l2[procIdx].l3?.findIndex((w: any) => w.id === modal.l3Id) ?? -1;
              if (weIdx < 0) return prev;
              const we = newState.l2[procIdx].l3[weIdx];

              if (modal.type === 'l3Function') {
                // B2 작업요소기능
                const funcs = we.functions || [];
                const removed = funcs.filter((f: any) => f.name?.trim() && !selectedNames.has(f.name.trim()));
                if (removed.length > 0 && !window.confirm(`${removed.map((f: any) => f.name).join(', ')} 삭제?`)) return prev;
                const kept = funcs.filter((f: any) => !f.name?.trim() || selectedNames.has(f.name.trim()));
                const existingNames = new Set(kept.filter((f: any) => f.name?.trim()).map((f: any) => f.name.trim()));
                // ★ 1순위: 빈 슬롯에 새 데이터를 채워넣기 (배열 구조 보호)
                const newNames = items.map(i => i.name.trim()).filter(n => n && !existingNames.has(n));
                let newIdx = 0;
                for (let ki = 0; ki < kept.length && newIdx < newNames.length; ki++) {
                  if (!kept[ki].name?.trim()) {
                    kept[ki] = { ...kept[ki], name: newNames[newIdx++] };
                  }
                }
                // 남은 새 항목은 추가
                while (newIdx < newNames.length) {
                  kept.push({ id: uid(), name: newNames[newIdx++], processChars: [{ id: uid(), name: '', specialChar: '' }] });
                }
                // ★ 2순위: 남은 빈 슬롯은 "미입력" 문자열로 보호
                // (빈 슬롯을 삭제하면 rowSpan 깨짐)
                if (kept.length === 0) kept.push({ id: uid(), name: '', processChars: [{ id: uid(), name: '', specialChar: '' }] });
                we.functions = kept;
              } else if (modal.type === 'l3ProcessChar') {
                // B3 공정특성
                const funcIdx = we.functions?.findIndex((f: any) => f.id === modal.funcId) ?? -1;
                if (funcIdx < 0) return prev;
                const chars = we.functions[funcIdx].processChars || [];
                const removed = chars.filter((c: any) => c.name?.trim() && !selectedNames.has(String(c.name).trim()));
                if (removed.length > 0 && !window.confirm(`${removed.map((c: any) => c.name).join(', ')} 삭제?`)) return prev;
                const kept = chars.filter((c: any) => !String(c.name || '').trim() || selectedNames.has(String(c.name).trim()));
                const existingNames = new Set(kept.filter((c: any) => String(c.name || '').trim()).map((c: any) => String(c.name).trim()));
                // ★ 1순위: 빈 슬롯에 새 데이터를 채워넣기
                const newNames = items.map(i => i.name.trim()).filter(n => n && !existingNames.has(n));
                let newIdx = 0;
                for (let ki = 0; ki < kept.length && newIdx < newNames.length; ki++) {
                  if (!String(kept[ki].name || '').trim()) {
                    kept[ki] = { ...kept[ki], name: newNames[newIdx++] };
                  }
                }
                // 남은 새 항목은 추가
                while (newIdx < newNames.length) {
                  kept.push({ id: uid(), name: newNames[newIdx++], specialChar: '' });
                }
                if (kept.length === 0) kept.push({ id: uid(), name: '', specialChar: '' });
                we.functions[funcIdx].processChars = kept;
              }
              newState.l3Confirmed = false;
              return newState;
            };
            if (setStateSynced) setStateSynced(updateFn); else setState(updateFn);
            setDirty(true);
            emitSave();
          }}
          itemCode={modal.itemCode}
          processNo={(state.l2 || []).find(p => p.id === modal.procId)?.no}
          fmeaId={fmeaId}
          existingItems={(() => {
            const proc = (state.l2 || []).find(p => p.id === modal.procId);
            if (!proc) return [];
            const we = (proc.l3 || []).find(w => w.id === modal.l3Id);
            if (!we) return [];
            if (modal.type === 'l3Function') return (we.functions || []).filter(f => f.name?.trim()).map(f => ({ id: f.id, name: f.name }));
            if (modal.type === 'l3ProcessChar') {
              const func = (we.functions || []).find(f => f.id === modal.funcId);
              return func ? (func.processChars || []).filter(c => c.name?.trim()).map(c => ({ id: c.id, name: String(c.name || '') })) : [];
            }
            return [];
          })()}
          config={modal.itemCode === 'B2' ? {
            title: '작업요소기능(B2) 선택',
            emoji: '🔧',
            headerGradient: 'from-teal-500 to-cyan-600',
            headerAccent: 'text-teal-200',
            searchPlaceholder: '🔍 작업요소기능 검색 또는 새 항목 입력...',
            searchRingColor: 'focus:ring-teal-500',
            searchBgGradient: 'from-teal-50 to-cyan-50',
            parentLabel: '작업요소:',
            parentValue: modal.workElementName || '',
          } : {
            title: '공정특성(B3) 선택',
            emoji: '📊',
            headerGradient: 'from-orange-500 to-amber-600',
            headerAccent: 'text-orange-200',
            searchPlaceholder: '🔍 공정특성 검색 또는 새 항목 입력...',
            searchRingColor: 'focus:ring-orange-500',
            searchBgGradient: 'from-orange-50 to-amber-50',
            parentLabel: '작업요소:',
            parentValue: modal.workElementName || '',
          }}
        />
      )}

      {specialCharModal && (
        <SpecialCharSelectModal
          isOpen={!!specialCharModal}
          onClose={() => setSpecialCharModal(null)}
          onSelect={handleSpecialCharSelect}
          currentValue={(() => {
            const proc = (state.l2 || []).find(p => p.id === specialCharModal.procId);
            if (!proc) return '';
            const we = (proc.l3 || []).find(w => w.id === specialCharModal.l3Id);
            if (!we) return '';
            const func = (we.functions || []).find(f => f.id === specialCharModal.funcId);
            if (!func) return '';
            const char = (func.processChars || []).find(c => c.id === specialCharModal.charId);
            return char?.specialChar || '';
          })()}
          productCharName={(() => {
            const proc = (state.l2 || []).find(p => p.id === specialCharModal.procId);
            if (!proc) return '';
            const we = (proc.l3 || []).find(w => w.id === specialCharModal.l3Id);
            if (!we) return '';
            const func = (we.functions || []).find(f => f.id === specialCharModal.funcId);
            if (!func) return '';
            const char = (func.processChars || []).find(c => c.id === specialCharModal.charId);
            return String(char?.name || '');
          })()}
          customerName={customerName}
        />
      )}

      {/* ★★★ 자동매핑 트리뷰 미리보기 ★★★ */}
      {previewResult && (
        <AutoMappingPreviewModal
          isOpen={!!previewResult}
          tab="function-l3"
          result={previewResult}
          state={state}
          onConfirm={applyAutoMapping}
          onCancel={cancelPreview}
        />
      )}

      {/* ★★★ 2026-02-05: 컨텍스트 메뉴 (수동모드 행 추가/삭제) ★★★ */}
      <PfmeaContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onInsertAbove={() => handleInsertAboveCtx()}
        onInsertBelow={() => handleInsertBelowCtx()}
        onDeleteRow={() => handleDeleteRowCtx()}
        onAddMergedAbove={() => handleAddMergedAboveCtx()}
        onAddMergedBelow={() => handleAddMergedBelowCtx()}
      />

      {/* ★★★ 2026-02-17: AlertModal (alert() 대체) ★★★ */}
      <AlertModal {...alertProps} />
    </div>
  );
}

// ★★★ 2026-02-05: Row 컴포넌트 분리 ★★★

function EmptyRowL3() {
  return (
    <tr className="bg-[#e8f5e9]">
      <td colSpan={3} className="border border-[#ccc] p-2.5 text-center bg-[#e3f2fd] text-xs text-gray-500 align-middle">
        (구조분석에서 작업요소 추가)
      </td>
      <td className="border border-[#ccc] p-0 align-middle">
        <SelectableCell value="" placeholder="작업요소기능 선택" bgColor={'#e8f5e9'} onClick={() => { }} />
      </td>
      <td className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-0 align-middle">
        <SelectableCell value="" placeholder="공정특성 선택" bgColor={'#e8f5e9'} onClick={() => { }} />
      </td>
      <td className="border border-[#ccc] border-l-0 p-1 text-center bg-[#fff3e0] align-middle">
        <SpecialCharBadge value="" onClick={() => { }} />
      </td>
    </tr>
  );
}

function L3ProcessRows({ l2, isMeaningfulFunc, getMeaningfulChars, getProcRowSpan, getWeRowSpan, handleCellClick, handleInlineEditFunction, handleInlineEditProcessChar, setSpecialCharModal, handleContextMenu, missingWeIds }: any) {
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
      {effectiveL2.flatMap((proc: any, procIdx: number) => {
        const l3List = (proc.l3 || []);
        if (l3List.length === 0) return [];

        const procFirstRowIdx = globalRowIdx;
        const procRowSpan = getProcRowSpan(proc);
        let isFirstProcRow = true;

        return l3List.flatMap((we: any, weIdx: number) => {
          // ★ 2026-03-28: 빈 행 포함 전체 표시
          const allFuncs = we.functions || [];
          const funcsToRender = allFuncs;
          // ★ 2026-03-28: 빈 행 포함 전체 — getProcRowSpan/getWeRowSpan과 동일 계산
          const weRowSpan = funcsToRender.length === 0 ? 1 : funcsToRender.reduce((sum: number, f: any) => {
            return sum + Math.max(1, (f.processChars || []).length);
          }, 0);
          const weFirstRowIdx = globalRowIdx;

          // 기능이 없는 경우
          if (funcsToRender.length === 0) {
            const rowIdx = globalRowIdx++;
            const zebra = getZebraColors(rowIdx);
            const procZebra = getZebraColors(procFirstRowIdx);
            const firstFuncId = (we.functions || [])[0]?.id || '';
            const isMissingWe = missingWeIds?.has(we.id);
            const row = (
              <tr key={`${proc.id}_${we.id}`} data-missing-we={isMissingWe ? "true" : undefined} onContextMenu={(e) => handleContextMenu(e, 'function', proc.id, we.id, firstFuncId)}>
                {isFirstProcRow && (
                  <td rowSpan={procRowSpan} className="border border-[#ccc] px-0.5 py-0.5 text-center text-[10px] font-semibold align-middle break-words" style={{ background: procZebra.structure }}>
                    {proc.no}. {proc.name}
                  </td>
                )}
                <td rowSpan={weRowSpan} className="border border-[#ccc] p-1 text-center text-xs font-medium align-middle" style={{ background: zebra.structure }}>{we.m4}</td>
                <td rowSpan={weRowSpan} className="border border-[#ccc] p-1 font-semibold text-xs align-middle break-words" style={{ background: zebra.structure }}>{we.name}</td>
                <td className={cellP0} style={{ background: zebra.function }} onContextMenu={(e) => handleContextMenu(e, 'function', proc.id, we.id, firstFuncId)}>
                  <SelectableCell value="" placeholder="작업요소기능 선택" bgColor={zebra.function} onClick={() => handleCellClick({ type: 'l3Function', procId: proc.id, l3Id: we.id, title: '작업요소 기능 선택', itemCode: 'B2', workElementName: we.name, parentCategory: we.m4 })} />
                </td>
                <td className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-0 align-middle" style={{ background: zebra.failure }}>
                  <SelectableCell value="" placeholder="공정특성 선택" bgColor={zebra.failure} onClick={() => { }} />
                </td>
                <td className="border border-[#ccc] border-l-0 p-1 text-center align-middle" style={{ background: zebra.failure }}>
                  <SpecialCharBadge value="" onClick={() => { }} />
                </td>
              </tr>
            );
            isFirstProcRow = false;
            return [row];
          }

          // 기능이 있는 경우
          const isMissingWeFunc = missingWeIds?.has(we.id);
          return funcsToRender.flatMap((f: any, fIdx: number) => {
            // ★ 2026-03-28: 빈 행 포함 전체 표시
            const allChars = f.processChars || [];
            const charsToRender = allChars;
            const funcRowSpan = Math.max(1, charsToRender.length);
            const funcFirstRowIdx = globalRowIdx;
            // ★ 2026-03-28: 상위 작업요소기능에 실제 값이 있는지 — state에서 직접 조회
            const actualWe = (proc.l3 || []).find((w: any) => w.id === we.id);
            const actualFunc = (actualWe?.functions || []).find((fn: any) => fn.id === f.id);
            const hasFuncValue = !!(actualFunc && actualFunc.name && String(actualFunc.name).trim().length > 0);

            // 공정특성이 없는 경우
            if (charsToRender.length === 0) {
              const rowIdx = globalRowIdx++;
              const zebra = getZebraColors(rowIdx);
              const procZebra = getZebraColors(procFirstRowIdx);
              const weZebra = getZebraColors(weFirstRowIdx);
              const row = (
                <tr key={`${proc.id}_${we.id}_${f.id}`} data-missing-we={isMissingWeFunc && fIdx === 0 ? "true" : undefined} onContextMenu={(e) => handleContextMenu(e, 'function', proc.id, we.id, f.id)}>
                  {isFirstProcRow && (
                    <td rowSpan={procRowSpan} className="border border-[#ccc] px-0.5 py-0.5 text-center text-[10px] font-semibold align-middle" style={{ background: procZebra.structure }}>
                      {proc.no}. {proc.name}
                    </td>
                  )}
                  {fIdx === 0 && (
                    <>
                      <td rowSpan={weRowSpan} className="border border-[#ccc] p-1 text-center text-xs font-medium align-middle" style={{ background: weZebra.structure }}>{we.m4}</td>
                      <td rowSpan={weRowSpan} className="border border-[#ccc] p-1 font-semibold text-xs align-middle" style={{ background: weZebra.structure }}>{we.name}</td>
                    </>
                  )}
                  <td rowSpan={funcRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: zebra.function }} onContextMenu={(e) => handleContextMenu(e, 'function', proc.id, we.id, f.id)}>
                    <SelectableCell value={f.name} placeholder="작업요소기능" bgColor={zebra.function} isRevised={f.isRevised} onClick={() => handleCellClick({ type: 'l3Function', procId: proc.id, l3Id: we.id, funcId: f.id, title: '작업요소 기능 선택', itemCode: 'B2', workElementName: we.name, parentCategory: we.m4 })} onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, we.id, f.id, newValue)} />
                  </td>
                  <td className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-0 align-middle" style={{ background: zebra.failure }} onContextMenu={hasFuncValue ? undefined : (e) => e.stopPropagation()}>
                    <SelectableCell value="" placeholder="공정특성 선택" bgColor={zebra.failure} onClick={hasFuncValue ? () => handleCellClick({ type: 'l3ProcessChar', procId: proc.id, l3Id: we.id, funcId: f.id, title: '공정특성 선택', itemCode: 'B3', workElementName: we.name, parentCategory: we.m4 }) : () => {}} />
                  </td>
                  <td className="border border-[#ccc] border-l-0 p-1 text-center align-middle" style={{ background: zebra.failure }}>
                    <SpecialCharBadge value="" onClick={() => { }} />
                  </td>
                </tr>
              );
              isFirstProcRow = false;
              return [row];
            }

            // 공정특성이 있는 경우
            return charsToRender.map((c: any, cIdx: number) => {
              const rowIdx = globalRowIdx++;
              const zebra = getZebraColors(rowIdx);
              const procZebra = getZebraColors(procFirstRowIdx);
              const weZebra = getZebraColors(weFirstRowIdx);
              const funcZebra = getZebraColors(funcFirstRowIdx);
              const row = (
                <tr key={`${proc.id}_${we.id}_${f.id}_${c.id}`} data-missing-we={isMissingWeFunc && fIdx === 0 && cIdx === 0 ? "true" : undefined} onContextMenu={hasFuncValue ? (e) => handleContextMenu(e, 'processChar', proc.id, we.id, f.id, c.id) : undefined}>
                  {isFirstProcRow && (
                    <td rowSpan={procRowSpan} className="border border-[#ccc] px-0.5 py-0.5 text-center text-[10px] font-semibold align-middle" style={{ background: procZebra.structure }}>
                      {proc.no}. {proc.name}
                    </td>
                  )}
                  {fIdx === 0 && cIdx === 0 && (
                    <>
                      <td rowSpan={weRowSpan} className="border border-[#ccc] p-1 text-center text-xs font-medium align-middle" style={{ background: weZebra.structure }}>{we.m4}</td>
                      <td rowSpan={weRowSpan} className="border border-[#ccc] p-1 font-semibold text-xs align-middle" style={{ background: weZebra.structure }}>{we.name}</td>
                    </>
                  )}
                  {cIdx === 0 && (
                    <td rowSpan={funcRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: funcZebra.function }} onContextMenu={(e) => handleContextMenu(e, 'function', proc.id, we.id, f.id)}>
                      <SelectableCell value={f.name} placeholder="작업요소기능" bgColor={funcZebra.function} isRevised={f.isRevised} onClick={() => handleCellClick({ type: 'l3Function', procId: proc.id, l3Id: we.id, funcId: f.id, title: '작업요소 기능 선택', itemCode: 'B2', workElementName: we.name, parentCategory: we.m4 })} onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, we.id, f.id, newValue)} />
                    </td>
                  )}
                  <td className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-0 align-middle" style={{ background: zebra.failure }} onContextMenu={hasFuncValue ? (e) => handleContextMenu(e, 'processChar', proc.id, we.id, f.id, c.id) : undefined}>
                    <SelectableCell value={c.name} placeholder="공정특성 선택" bgColor={zebra.failure} isRevised={c.isRevised} onClick={hasFuncValue ? () => handleCellClick({ type: 'l3ProcessChar', procId: proc.id, l3Id: we.id, funcId: f.id, charId: c.id, title: '공정특성 선택', itemCode: 'B3', workElementName: we.name, parentCategory: we.m4 }) : () => {}} onDoubleClickEdit={hasFuncValue ? (newValue) => handleInlineEditProcessChar(proc.id, we.id, f.id, c.id, newValue) : undefined} />
                  </td>
                  <td className="border border-[#ccc] border-l-0 p-1 text-center align-middle" style={{ background: zebra.failure }}>
                    <SpecialCharBadge value={c.specialChar || ''} onClick={() => setSpecialCharModal({ procId: proc.id, l3Id: we.id, funcId: f.id, charId: c.id })} />
                  </td>
                </tr>
              );
              isFirstProcRow = false;
              return row;
            });
          });
        });
      })}
    </>
  );
}
