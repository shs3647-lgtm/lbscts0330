/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file FunctionL1Tab.tsx
 * @description 완제품(L1) 기능 분석 - 3행 헤더 구조 (구조분석 + 기능분석)
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
 * 📅 프리즈 일자: 2026-01-05
 * 📌 프리즈 범위: 구조분석부터 3L원인분석까지 전체
 * 
 * ★★★ 2026-02-05: 최적화 리팩토링 (854줄 → 500줄 이하) ★★★
 * - 유틸리티 함수 분리: functionL1Utils.ts
 * - 핸들러 로직 분리: hooks/useFunctionL1Handlers.ts
 * ============================================
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { FunctionTabProps } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';
import DataSelectModal from '@/components/modals/DataSelectModal';
import { AutoMappingPreviewModal } from '../../autoMapping';
import { COLORS, uid, WorksheetState } from '../../constants';
import { ensurePlaceholder } from '../../utils/safeMutate';
import { handleEnterBlur } from '../../utils/keyboard';
import { getL1TypeColor, getZebra, getZebraColors } from '@/styles/level-colors';

// ★★★ 2026-02-05: 최적화 - 유틸리티 및 핸들러 분리 ★★★
import { formatL1Name, filterMeaningfulFunctions, filterMeaningfulRequirements, calculateTypeRowSpan, calculateFunctionRowSpan } from './functionL1Utils';
import { useFunctionL1Handlers } from './hooks/useFunctionL1Handlers';
import { useAlertModal } from '../../hooks/useAlertModal';
import AlertModal from '@/components/modals/AlertModal';

// ★★★ 컨텍스트 메뉴 (수동모드 행 추가/삭제) ★★★
// ┌──────────────────────────────────────────────────────────────────┐
// │ 1L기능 컨텍스트 메뉴 — 조작 대상: 구분(Type) / 기능 / 요구사항   │
// │                                                                  │
// │ 구분(YP/SP/USER): 구조분석에서 자동 연동된 고정 구조              │
// │ 기능(Function):   구분 안에서 자유롭게 추가/삭제 가능             │
// │ 요구사항(Req):    기능 안에서 자유롭게 추가/삭제 가능             │
// │                                                                  │
// │ ※ 구조분석과 다름: 구조분석은 공정(L2) 자체를 추가/삭제          │
// │ ※ 여기서는 구분은 고정, 그 안의 기능/요구사항만 조작              │
// │ ※ 빈값 폴백: reqId 빈값 → 기능 행 삭제로 폴백                   │
// └──────────────────────────────────────────────────────────────────┘
import { PfmeaContextMenu, initialPfmeaContextMenu, PfmeaContextMenuState } from '../../components/PfmeaContextMenu';
// import { useL1ContextMenu, L1RowType } from './hooks/useL1ContextMenu';
type L1RowType = 'type' | 'function' | 'requirement';

// ✅ 공용 스타일/유틸리티 (2026-01-19 리팩토링)
import { FunctionL1Header } from '../shared/FunctionL1Header';

const getTypeColor = getL1TypeColor;

// ★ parentCategory → 정규화 카테고리 (DB processNo 저장용)
function normalizeCategoryToProcessNo(cat?: string): string | undefined {
  if (!cat) return undefined;
  const c = cat.trim().toUpperCase();
  if (c === 'YOUR PLANT' || c === 'YP') return 'YP';
  if (c === 'SHIP TO PLANT' || c === 'SP') return 'SP';
  if (c === 'USER' || c === 'END USER' || c === 'EU') return 'USER';
  return undefined;
}

export default function FunctionL1Tab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, fmeaId }: FunctionTabProps) {
  const [modal, setModal] = useState<{ type: string; id: string; title: string; itemCode: string; funcId?: string; reqId?: string; parentFunction?: string; parentCategory?: string } | null>(null);
  const { alertProps, showAlert } = useAlertModal();

  // ★★★ 핸들러 훅 사용 ★★★
  const {
    isConfirmed,
    isAutoMode,
    isLoadingMaster,
    missingCounts,
    missingCount,
    previewResult,
    applyAutoMapping,
    cancelPreview,
    handleCellClick,
    handleConfirm,
    handleEdit,
    handleToggleMode,
    handleInlineEditRequirement,
    handleInlineEditFunction,
    handleSave,
    handleDelete,
  } = useFunctionL1Handlers({
    state,
    setState,
    setStateSynced,
    setDirty,
    saveToLocalStorage,
    saveAtomicDB,
    modal,
    setModal,
    fmeaId,
    showAlert,
  });

  // ★★★ 2026-02-05: 컨텍스트 메뉴 (구조분석 패턴 벤치마킹) ★★★
  const [contextMenu, setContextMenu] = useState<PfmeaContextMenuState>(initialPfmeaContextMenu);
  const [menuExtra, setMenuExtra] = useState<{ rowType: L1RowType; typeId: string; funcId: string; reqId: string }>({ rowType: 'type', typeId: '', funcId: '', reqId: '' });

  // ★★★ 2026-02-06: 병합 추가 시 시각적 피드백 (하이라이트 + 토스트) ★★★
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, rowType: L1RowType, typeId: string, funcId?: string, reqId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    // ★ 2026-03-04: 확정 상태에서도 컨텍스트 메뉴 허용 (자동 확정해제 — 다른 탭과 패턴 통일)
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, l1Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }

    setMenuExtra({ rowType, typeId: typeId || '', funcId: funcId || '', reqId: reqId || '' });
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      rowIdx: 0,
      columnType: rowType === 'type' ? 'l1' : rowType === 'function' ? 'l2' : 'l3',
    });
  }, [isConfirmed, setState, setStateSynced, setDirty]);
  
  const closeContextMenu = useCallback(() => {
    setContextMenu(initialPfmeaContextMenu);
    setMenuExtra({ rowType: 'type', typeId: '', funcId: '', reqId: '' });
  }, []);
  
  // ★★★ 2026-03-06: 열 단위 분기 — 위로 새 행 추가 (type→구분, function→기능, requirement→요구사항) ★★★
  const handleInsertAbove = useCallback(() => {
    const { rowType, typeId, funcId, reqId } = menuExtra;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1) newState.l1 = { id: `l1_${Date.now()}`, name: '', types: [] };
      const types = newState.l1.types || [];
      const typeIdx = types.findIndex((t: { id: string }) => t.id === typeId);

      if (rowType === 'function' && typeIdx >= 0) {
        // 기능 열 → 같은 구분 내 새 기능 추가
        const funcIdx = types[typeIdx].functions?.findIndex((f: { id: string }) => f.id === funcId) ?? -1;
        const newFunc = { id: `func_${Date.now()}`, name: '', requirements: [] };
        if (!types[typeIdx].functions) types[typeIdx].functions = [];
        types[typeIdx].functions.splice(funcIdx >= 0 ? funcIdx : 0, 0, newFunc);
      } else if (rowType === 'requirement' && typeIdx >= 0) {
        // 요구사항 열 → 같은 기능 내 새 요구사항 추가
        const funcIdx = types[typeIdx].functions?.findIndex((f: { id: string }) => f.id === funcId) ?? -1;
        if (funcIdx >= 0) {
          const reqIdx = types[typeIdx].functions[funcIdx].requirements?.findIndex((r: { id: string }) => r.id === reqId) ?? -1;
          const newReq = { id: `req_${Date.now()}`, name: '' };
          if (!types[typeIdx].functions[funcIdx].requirements) types[typeIdx].functions[funcIdx].requirements = [];
          types[typeIdx].functions[funcIdx].requirements.splice(reqIdx >= 0 ? reqIdx : 0, 0, newReq);
        }
      } else {
        // 구분 열 → 새 타입 추가
        const newType = { id: `type_${Date.now()}`, name: '', functions: [{ id: `func_${Date.now()}`, name: '', requirements: [] }] };
        types.splice(typeIdx >= 0 ? typeIdx : 0, 0, newType);
      }

      newState.l1.types = types;
      newState.l1Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 2026-03-06: 열 단위 분기 — 아래로 새 행 추가 (type→구분, function→기능, requirement→요구사항) ★★★
  const handleInsertBelow = useCallback(() => {
    const { rowType, typeId, funcId, reqId } = menuExtra;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1) newState.l1 = { id: `l1_${Date.now()}`, name: '', types: [] };
      const types = newState.l1.types || [];
      const typeIdx = types.findIndex((t: { id: string }) => t.id === typeId);

      if (rowType === 'function' && typeIdx >= 0) {
        // 기능 열 → 같은 구분 내 새 기능 추가
        const funcIdx = types[typeIdx].functions?.findIndex((f: { id: string }) => f.id === funcId) ?? -1;
        const newFunc = { id: `func_${Date.now()}`, name: '', requirements: [] };
        if (!types[typeIdx].functions) types[typeIdx].functions = [];
        types[typeIdx].functions.splice(funcIdx >= 0 ? funcIdx + 1 : types[typeIdx].functions.length, 0, newFunc);
      } else if (rowType === 'requirement' && typeIdx >= 0) {
        // 요구사항 열 → 같은 기능 내 새 요구사항 추가
        const funcIdx = types[typeIdx].functions?.findIndex((f: { id: string }) => f.id === funcId) ?? -1;
        if (funcIdx >= 0) {
          const reqs = types[typeIdx].functions[funcIdx].requirements || [];
          const reqIdx = reqs.findIndex((r: { id: string }) => r.id === reqId);
          const newReq = { id: `req_${Date.now()}`, name: '' };
          if (!types[typeIdx].functions[funcIdx].requirements) types[typeIdx].functions[funcIdx].requirements = [];
          types[typeIdx].functions[funcIdx].requirements.splice(reqIdx >= 0 ? reqIdx + 1 : reqs.length, 0, newReq);
        }
      } else {
        // 구분 열 → 새 타입 추가
        const newType = { id: `type_${Date.now()}`, name: '', functions: [{ id: `func_${Date.now()}`, name: '', requirements: [] }] };
        types.splice(typeIdx >= 0 ? typeIdx + 1 : types.length, 0, newType);
      }

      newState.l1.types = types;
      newState.l1Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 행 삭제 (구조분석 벤치마킹: 빈 행만 삭제 가능, 데이터 있으면 확인) ★★★
  const handleDeleteRow = useCallback(() => {
    const { rowType, typeId, funcId, reqId } = menuExtra;
    const types = state.l1?.types || [];
    const typeIdx = types.findIndex((t: { id: string }) => t.id === typeId);
    if (typeIdx < 0) return;
    
    const currentType = types[typeIdx];
    const typeName = currentType?.name?.trim() || '';
    
    if (rowType === 'type') {
      // 타입 삭제: 타입명과 모든 기능이 비어있어야 삭제 가능
      const allFunctionsEmpty = (currentType.functions || []).every((f: { name?: string; requirements?: { name?: string }[] }) => 
        !f.name?.trim() && (f.requirements || []).every((r: { name?: string }) => !r.name?.trim())
      );
      
      if (allFunctionsEmpty || typeName) {
        if (typeName && !window.confirm(`구분 "${typeName}"을(를) 삭제하시겠습니까?`)) return;
        const updateFn = (prev: WorksheetState) => {
          const newState = JSON.parse(JSON.stringify(prev));
          // ★ 마지막 구분: 빈 구분으로 초기화 (행 유지)
          if (newState.l1.types.length <= 1) {
            newState.l1.types = [{ id: uid(), name: '', functions: [{ id: uid(), name: '', requirements: [{ id: uid(), name: '' }] }] }];
          } else {
            newState.l1.types = newState.l1.types.filter((t: { id: string }) => t.id !== typeId);
          }
          newState.l1Confirmed = false;
          return newState;
        };
        if (setStateSynced) setStateSynced(updateFn);
        else setState(updateFn);
        setDirty(true);
        setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
      } else {
        showAlert('데이터가 있는 구분은 삭제할 수 없습니다.\n먼저 기능과 요구사항을 삭제해 주세요.');
      }
      return;
    }
    
    if (rowType === 'function') {
      const funcIdx = currentType.functions?.findIndex((f: { id: string }) => f.id === funcId) ?? -1;
      if (funcIdx < 0) return;
      
      const currentFunc = currentType.functions[funcIdx];
      const funcName = currentFunc?.name?.trim() || '';
      const allReqsEmpty = (currentFunc.requirements || []).every((r: { name?: string }) => !r.name?.trim());
      
      // 데이터 있으면 확인 후 삭제, 빈 기능은 바로 삭제
      if (funcName && !window.confirm(`기능 "${funcName}"을(를) 삭제하시겠습니까?`)) return;
      const updateFn = (prev: WorksheetState) => {
        const newState = JSON.parse(JSON.stringify(prev));
        const tIdx = newState.l1.types.findIndex((t: { id: string }) => t.id === typeId);
        if (tIdx >= 0) {
          // ★ 마지막 기능: 빈 기능으로 초기화 (행 유지)
          if (newState.l1.types[tIdx].functions.length <= 1) {
            newState.l1.types[tIdx].functions = [{ id: uid(), name: '', requirements: [{ id: uid(), name: '' }] }];
          } else {
            newState.l1.types[tIdx].functions = newState.l1.types[tIdx].functions.filter((f: { id: string }) => f.id !== funcId);
          }
        }
        newState.l1Confirmed = false;
        return newState;
      };
      if (setStateSynced) setStateSynced(updateFn);
      else setState(updateFn);
      setDirty(true);
      setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
      return;
    }
    
    if (rowType === 'requirement') {
      const funcIdx = currentType.functions?.findIndex((f: { id: string }) => f.id === funcId) ?? -1;
      if (funcIdx < 0) return;

      const currentFunc = currentType.functions[funcIdx];
      const reqIdx = currentFunc.requirements?.findIndex((r: { id: string }) => r.id === reqId) ?? -1;
      // ★ reqId가 비어있으면 (플레이스홀더 셀) → 기능 행 삭제로 폴백
      if (reqIdx < 0) {
        const funcName = currentFunc?.name?.trim() || '';
        if (funcName && !window.confirm(`기능 "${funcName}"을(를) 삭제하시겠습니까?`)) return;
        const updateFn = (prev: WorksheetState) => {
          const newState = JSON.parse(JSON.stringify(prev));
          const tIdx = newState.l1.types.findIndex((t: { id: string }) => t.id === typeId);
          if (tIdx >= 0) {
            if (newState.l1.types[tIdx].functions.length <= 1) {
              newState.l1.types[tIdx].functions = [{ id: uid(), name: '', requirements: [{ id: uid(), name: '' }] }];
            } else {
              newState.l1.types[tIdx].functions = newState.l1.types[tIdx].functions.filter((f: { id: string }) => f.id !== funcId);
            }
          }
          newState.l1Confirmed = false;
          return newState;
        };
        if (setStateSynced) setStateSynced(updateFn);
        else setState(updateFn);
        setDirty(true);
        setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
        return;
      }
      
      const reqName = currentFunc.requirements[reqIdx]?.name?.trim() || '';
      
      if (!reqName) {
        // 빈 요구사항은 바로 삭제
        const updateFn = (prev: WorksheetState) => {
          const newState = JSON.parse(JSON.stringify(prev));
          const tIdx = newState.l1.types.findIndex((t: { id: string }) => t.id === typeId);
          if (tIdx >= 0) {
            const fIdx = newState.l1.types[tIdx].functions.findIndex((f: { id: string }) => f.id === funcId);
            if (fIdx >= 0) {
              // ★ 방어: requirements 배열이 완전히 비는 것 방지
              newState.l1.types[tIdx].functions[fIdx].requirements = ensurePlaceholder(
                newState.l1.types[tIdx].functions[fIdx].requirements.filter((r: { id: string }) => r.id !== reqId),
                () => ({ id: uid(), name: '' }), 'L1 requirements'
              );
            }
          }
          newState.l1Confirmed = false;
          return newState;
        };
        if (setStateSynced) setStateSynced(updateFn);
        else setState(updateFn);
        setDirty(true);
        setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
      } else {
        // 데이터가 있는 요구사항은 확인 후 삭제
        if (!window.confirm(`요구사항 "${reqName}"을(를) 삭제하시겠습니까?`)) return;
        const updateFn = (prev: WorksheetState) => {
          const newState = JSON.parse(JSON.stringify(prev));
          const tIdx = newState.l1.types.findIndex((t: { id: string }) => t.id === typeId);
          if (tIdx >= 0) {
            const fIdx = newState.l1.types[tIdx].functions.findIndex((f: { id: string }) => f.id === funcId);
            if (fIdx >= 0) {
              // ★ 방어: requirements 배열이 완전히 비는 것 방지
              newState.l1.types[tIdx].functions[fIdx].requirements = ensurePlaceholder(
                newState.l1.types[tIdx].functions[fIdx].requirements.filter((r: { id: string }) => r.id !== reqId),
                () => ({ id: uid(), name: '' }), 'L1 requirements'
              );
            }
          }
          newState.l1Confirmed = false;
          return newState;
        };
        if (setStateSynced) setStateSynced(updateFn);
        else setState(updateFn);
        setDirty(true);
        setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
      }
    }
  }, [menuExtra, state.l1?.types, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);
  
  // ★★★ 2026-02-06: 하이라이트 + 토스트 헬퍼 ★★★
  const showFeedback = useCallback((newId: string, message: string) => {
    // 하이라이트 추가
    setHighlightIds(prev => new Set(prev).add(newId));
    // 토스트 표시
    setToast(message);
    // 3초 후 하이라이트 제거
    setTimeout(() => {
      setHighlightIds(prev => {
        const next = new Set(prev);
        next.delete(newId);
        return next;
      });
    }, 3000);
    // 2초 후 토스트 제거
    setTimeout(() => setToast(null), 2000);
  }, []);

  // ★★★ 병합 위로 추가 (병합 영역 내 - 같은 부모 안에 항목 추가) ★★★
  const handleAddMergedAbove = useCallback(() => {
    const { rowType, typeId, funcId, reqId } = menuExtra;
    
    let addedId = '';
    let feedbackMsg = '';
    
    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1) return prev;
      const types = newState.l1.types || [];
      let typeIdx = types.findIndex((t: { id: string }) => t.id === typeId);
      // ★ typeId 미매칭 시 폴백: function/requirement면 첫 번째 타입(0)에 추가
      if (typeIdx < 0 && types.length > 0 && (rowType === 'function' || rowType === 'requirement')) typeIdx = 0;
      if (typeIdx < 0) {
        if (types.length > 0 && rowType === 'type') {
          // 첫 번째 타입에 기능 추가 (구분 병합 확장)
          const newId = `func_${Date.now()}`;
          const newFunc = { id: newId, name: '', requirements: [] };
          if (!types[0].functions) types[0].functions = [];
          types[0].functions.splice(0, 0, newFunc);
          addedId = newId;
          feedbackMsg = '⬆️ 새 기능 추가됨 (구분 병합 확장)';
          newState.l1.types = types;
          newState.l1Confirmed = false;
          return newState;
        }
        return prev;
      }
      
      if (rowType === 'function') {
        const funcIdx = types[typeIdx].functions?.findIndex((f: { id: string }) => f.id === funcId) ?? -1;
        const newId = `func_${Date.now()}`;
        const newFunc = { id: newId, name: '', requirements: [] };
        if (!types[typeIdx].functions) types[typeIdx].functions = [];
        types[typeIdx].functions.splice(funcIdx >= 0 ? funcIdx : 0, 0, newFunc);
        addedId = newId;
        feedbackMsg = '⬆️ 새 기능 추가됨 (위로 병합)';
      } else if (rowType === 'requirement') {
        const funcIdx = types[typeIdx].functions?.findIndex((f: { id: string }) => f.id === funcId) ?? -1;
        if (funcIdx >= 0) {
          const reqIdx = types[typeIdx].functions[funcIdx].requirements?.findIndex((r: { id: string }) => r.id === reqId) ?? -1;
          const newId = `req_${Date.now()}`;
          const newReq = { id: newId, name: '' };
          if (!types[typeIdx].functions[funcIdx].requirements) types[typeIdx].functions[funcIdx].requirements = [];
          types[typeIdx].functions[funcIdx].requirements.splice(reqIdx >= 0 ? reqIdx : 0, 0, newReq);
          addedId = newId;
          feedbackMsg = '⬆️ 새 요구사항 추가됨 (위로 병합)';
        }
      } else {
        // ★ 구분 셀에서 병합 추가 → 기존 타입 안에 기능 추가 (구분 셀 rowSpan 확장)
        const newId = `func_${Date.now()}`;
        const newFunc = { id: newId, name: '', requirements: [] };
        if (!types[typeIdx].functions) types[typeIdx].functions = [];
        types[typeIdx].functions.splice(0, 0, newFunc); // 맨 위에 추가
        addedId = newId;
        feedbackMsg = '⬆️ 새 기능 추가됨 (구분 병합 확장)';
      }
      
      newState.l1.types = types;
      newState.l1Confirmed = false;
      return newState;
    };
    
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    saveToLocalStorage?.();
    // ★ 병합 추가는 updateFn 내부에서만 addedId 설정되므로, 비동기 적용 후에도 사용자 피드백을 위해 토스트 표시
    setTimeout(() => setToast('⬆️ 위로 병합 추가 적용됨'), 50);
    setTimeout(() => setToast(null), 2500);
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage]);
  
  // ★★★ 병합 아래로 추가 (병합 영역 내 - 같은 부모 안에 항목 추가) ★★★
  const handleAddMergedBelow = useCallback(() => {
    const { rowType, typeId, funcId, reqId } = menuExtra;
    
    let addedId = '';
    let feedbackMsg = '';
    
    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1) return prev;
      const types = newState.l1.types || [];
      let typeIdx = types.findIndex((t: { id: string }) => t.id === typeId);
      // ★ typeId 미매칭 시 폴백: function/requirement면 첫 번째 타입(0)에 추가
      if (typeIdx < 0 && types.length > 0 && (rowType === 'function' || rowType === 'requirement')) typeIdx = 0;
      if (typeIdx < 0) return prev;
      
      if (rowType === 'function') {
        const funcIdx = types[typeIdx].functions?.findIndex((f: { id: string }) => f.id === funcId) ?? -1;
        const newId = `func_${Date.now()}`;
        const newFunc = { id: newId, name: '', requirements: [] };
        if (!types[typeIdx].functions) types[typeIdx].functions = [];
        types[typeIdx].functions.splice(funcIdx >= 0 ? funcIdx + 1 : types[typeIdx].functions.length, 0, newFunc);
        addedId = newId;
        feedbackMsg = '⬇️ 새 기능 추가됨 (아래로 병합)';
      } else if (rowType === 'requirement') {
        const funcIdx = types[typeIdx].functions?.findIndex((f: { id: string }) => f.id === funcId) ?? -1;
        if (funcIdx >= 0) {
          const reqs = types[typeIdx].functions[funcIdx].requirements || [];
          const reqIdx = reqs.findIndex((r: { id: string }) => r.id === reqId);
          const newId = `req_${Date.now()}`;
          const newReq = { id: newId, name: '' };
          if (!types[typeIdx].functions[funcIdx].requirements) types[typeIdx].functions[funcIdx].requirements = [];
          types[typeIdx].functions[funcIdx].requirements.splice(reqIdx >= 0 ? reqIdx + 1 : reqs.length, 0, newReq);
          addedId = newId;
          feedbackMsg = '⬇️ 새 요구사항 추가됨 (아래로 병합)';
        }
      } else {
        // ★ 구분 셀에서 병합 추가 → 기존 타입 안에 기능 추가 (구분 셀 rowSpan 확장)
        const funcs = types[typeIdx].functions || [];
        const newId = `func_${Date.now()}`;
        const newFunc = { id: newId, name: '', requirements: [] };
        if (!types[typeIdx].functions) types[typeIdx].functions = [];
        types[typeIdx].functions.splice(funcs.length, 0, newFunc); // 맨 아래에 추가
        addedId = newId;
        feedbackMsg = '⬇️ 새 기능 추가됨 (구분 병합 확장)';
      }
      
      newState.l1.types = types;
      newState.l1Confirmed = false;
      return newState;
    };
    
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    saveToLocalStorage?.();
    setTimeout(() => setToast('⬇️ 아래로 병합 추가 적용됨'), 50);
    setTimeout(() => setToast(null), 2500);
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage]);

  // ★ L1 types가 비어있으면 YP/SP/USER 3행 기본 보장 (렌더링 안전장치)
  const DEFAULT_L1_TYPES = useMemo(() => {
    const ts = Date.now();
    return [
      { id: `def-yp-${ts}`, name: 'YP', functions: [{ id: `def-func-yp-${ts}`, name: '', requirements: [] }] },
      { id: `def-sp-${ts}`, name: 'SP', functions: [{ id: `def-func-sp-${ts}`, name: '', requirements: [] }] },
      { id: `def-user-${ts}`, name: 'USER', functions: [{ id: `def-func-user-${ts}`, name: '', requirements: [] }] },
    ];
  }, []);

  const stateWithL1Types = useMemo(() => {
    const types = state.l1?.types || [];
    if (types.length >= 3) return state;
    // types가 3개 미만이면 기본 YP/SP/USER로 보충
    return {
      ...state,
      l1: {
        ...state.l1,
        types: types.length > 0 ? types : DEFAULT_L1_TYPES,
      },
    };
  }, [state, DEFAULT_L1_TYPES]);

  // ✅ 1L COUNT 계산 (완제품기능, 요구사항)
  const functionCount = useMemo(() => {
    return (state.l1?.types || []).reduce((sum, type) =>
      sum + (type.functions || []).filter((f: any) => f.name && !f.name.includes('클릭')).length, 0);
  }, [state.l1?.types]);

  const requirementCount = useMemo(() => {
    return (state.l1?.types || []).reduce((sum, type) =>
      sum + (type.functions || []).reduce((funcSum, func) =>
        funcSum + (func.requirements || []).filter((r: any) => r.name && !r.name.includes('클릭')).length, 0), 0);
  }, [state.l1?.types]);

  return (
    <div className="p-0 overflow-auto h-full" style={{ paddingBottom: '50px' }} onKeyDown={handleEnterBlur}>
      <table className="w-full border-collapse table-fixed">
        {/* ⚠️ 1L탭 자체 colgroup — FunctionColgroup.tsx 미사용 */}
        {/* 완제품명(18%) | 구분(6%) | 완제품기능(34%) | 요구사항(auto=42%) */}
        <colgroup>
          <col style={{ width: '18%' }} /><col style={{ width: '6%' }} /><col style={{ width: '34%' }} /><col />
        </colgroup>

        {/* 3행 헤더 - FunctionL1Header 공용 컴포넌트 사용 */}
        <FunctionL1Header
          isConfirmed={isConfirmed}
          missingCount={missingCount}
          functionCount={functionCount}
          requirementCount={requirementCount}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          isAutoMode={isAutoMode}
          onToggleMode={handleToggleMode}
          isLoadingMaster={isLoadingMaster}
        />

        <tbody>
          <TypeRows
            state={stateWithL1Types}
            handleCellClick={handleCellClick}
            handleInlineEditFunction={handleInlineEditFunction}
            handleInlineEditRequirement={handleInlineEditRequirement}
            handleContextMenu={handleContextMenu}
            isConfirmed={isConfirmed}
            highlightIds={highlightIds}
          />
        </tbody>
      </table>

      {modal && (
        <DataSelectModal
          isOpen={!!modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          title={modal.title}
          itemCode={modal.itemCode}
          currentValues={(() => {
            const types = state.l1?.types || [];
            if (modal.type === 'l1Type') {
              return types.filter((t: any) => t.name && t.name.trim()).map((t: any) => t.name);
            }
            if (modal.type === 'l1Function') {
              const targetType = types.find((t: any) => t.id === modal.id);
              if (targetType) {
                const funcs = targetType.functions || [];
                if (modal.funcId) {
                  const func = funcs.find((f: any) => f.id === modal.funcId);
                  return func?.name ? [func.name] : [];
                }
                return funcs.filter((f: any) => f.name && f.name.trim()).map((f: any) => f.name);
              }
              return [];
            }
            if (modal.type === 'l1Requirement') {
              const targetType = types.find((t: any) => (t.functions || []).some((f: any) => f.id === modal.id));
              if (targetType) {
                const func = (targetType.functions || []).find((f: any) => f.id === modal.id);
                if (func) {
                  const reqs = func.requirements || [];
                  if (modal.reqId) {
                    const req = reqs.find((r: any) => r.id === modal.reqId);
                    return req?.name ? [req.name] : [];
                  }
                  return reqs.filter((r: any) => r.name && r.name.trim()).map((r: any) => r.name);
                }
              }
              return [];
            }
            return [];
          })()}
          singleSelect={false}
          processName={formatL1Name(state.l1?.name)}
          parentFunction={modal.parentFunction}
          parentCategory={modal.parentCategory}
          processNo={normalizeCategoryToProcessNo(modal.parentCategory)}
          fmeaId={fmeaId}
        />
      )}

      {/* ★★★ 자동매핑 트리뷰 미리보기 ★★★ */}
      {previewResult && (
        <AutoMappingPreviewModal
          isOpen={!!previewResult}
          tab="function-l1"
          result={previewResult}
          state={state}
          onConfirm={applyAutoMapping}
          onCancel={cancelPreview}
        />
      )}

      {/* ★★★ 2026-02-06: 병합 추가 피드백 토스트 ★★★ */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold animate-pulse">
          {toast}
        </div>
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

// ★★★ 2026-02-05: Row 컴포넌트 분리 (가독성 개선) ★★★

/** 빈 행 (타입이 없을 때) */
function EmptyRow({ state, handleCellClick, handleContextMenu, isConfirmed }: {
  state: any;
  handleCellClick: (config: any) => void;
  handleContextMenu: (e: React.MouseEvent, rowType: L1RowType, typeId: string, funcId?: string, reqId?: string) => void;
  isConfirmed: boolean;
}) {
  const zebra = getZebraColors(0);
  const firstTypeId = (state.l1?.types || [])[0]?.id || '';
  const firstFuncId = (state.l1?.types || [])[0]?.functions?.[0]?.id || '';
  
  return (
    <tr onContextMenu={(e) => handleContextMenu(e, 'type', firstTypeId)}>
      <td className="border border-[#ccc] p-1 text-center font-semibold text-[10px] break-words" style={{ background: zebra.structure }}>
        {formatL1Name(state.l1?.name)}
      </td>
      <td className="border border-[#ccc] p-0 align-middle" onContextMenu={(e) => handleContextMenu(e, 'type', firstTypeId)}>
        <SelectableCell fontSize="10px" value="" placeholder="YP / SP / USER" bgColor={zebra.function} onClick={() => handleCellClick({ type: 'l1Type', id: state.l1?.id || '', title: '구분 선택', itemCode: 'C1' })} />
      </td>
      <td className="border border-[#ccc] p-0 align-middle" onContextMenu={(e) => handleContextMenu(e, 'function', firstTypeId, firstFuncId)}>
        <SelectableCell fontSize="10px" value="" placeholder="기능 선택" bgColor={zebra.function} onClick={() => handleCellClick({ type: 'l1Function', id: (state.l1?.types || [])[0]?.id || '', title: '완제품 기능 선택', itemCode: 'C2' })} />
      </td>
      <td className="border border-[#ccc] p-0 align-middle" onContextMenu={(e) => handleContextMenu(e, 'requirement', firstTypeId, firstFuncId, '')}>
        <SelectableCell fontSize="10px" value="" placeholder="요구사항 선택" bgColor={zebra.failure} textColor={COLORS.failure.text} onClick={() => handleCellClick({ type: 'l1Requirement', id: (state.l1?.types || [])[0]?.functions?.[0]?.id || '', title: '요구사항 선택', itemCode: 'C3', parentFunction: '' })} />
      </td>
    </tr>
  );
}

/** 타입 행들 렌더링 */
function TypeRows({ state, handleCellClick, handleInlineEditFunction, handleInlineEditRequirement, handleContextMenu, isConfirmed, highlightIds }: {
  state: any;
  handleCellClick: (config: any) => void;
  handleInlineEditFunction: (typeId: string, funcId: string, newValue: string) => void;
  handleInlineEditRequirement: (typeId: string, funcId: string, reqId: string, newValue: string) => void;
  handleContextMenu: (e: React.MouseEvent, rowType: L1RowType, typeId: string, funcId?: string, reqId?: string) => void;
  isConfirmed: boolean;
  highlightIds?: Set<string>;
}) {
  let globalRowIdx = 0;
  let funcCounter = 0;

  // ★★★ 2026-02-18: 구분(YP/SP/USER) 항상 개별 행으로 렌더링 ★★★
  // stateWithL1Types에서 이미 3행 보장되므로 allTypes는 항상 ≥3
  const allTypes = state.l1?.types || [];
  const typesToRender = allTypes;

  return (
    <>
      {typesToRender.map((t: any, tIdx: number) => {
        const typeZebra = getZebra('structure', tIdx);
        const allFunctions = t.functions || [];
        const meaningfulFunctions = filterMeaningfulFunctions(allFunctions);
        // ★ 수정: 의미있는 기능이 있거나, 기능이 2개 이상(사용자가 의도적 추가)이면 모두 표시
        const functionsToRender = (meaningfulFunctions.length > 0 || allFunctions.length > 1) ? allFunctions : allFunctions.slice(0, 1);
        const typeRowSpan = Math.max(1, functionsToRender.reduce((sum: number, f: any) => {
          const reqs = f.requirements || [];
          const meaningfulReqs = filterMeaningfulRequirements(reqs);
          // ★ 수정: 요구사항이 2개 이상이면 모두 표시
          return sum + Math.max(1, (meaningfulReqs.length > 0 || reqs.length > 1) ? reqs.length : 1);
        }, 0));

        // 기능이 없는 경우 (functionsToRender가 비어있는 경우)
        if (functionsToRender.length === 0) {
          const rowIdx = globalRowIdx++;
          const currentFuncIdx = funcCounter++;
          const funcZebraBg = getZebra('function', currentFuncIdx);
          const failZebraBg = getZebra('failure', rowIdx);
          const firstFuncId = t.functions?.[0]?.id || '';
          const isHighlighted = highlightIds?.has(t.id);

          return (
            <tr key={t.id} style={{ background: isHighlighted ? '#FFFDE7' : funcZebraBg, outline: isHighlighted ? '2px solid #FFC107' : undefined, transition: 'all 0.3s' }} onContextMenu={(e) => handleContextMenu(e, 'type', t.id)}>
              <td rowSpan={typeRowSpan} className="border border-[#ccc] p-1 text-center font-semibold text-[10px] break-words align-middle" style={{ background: typeZebra }}>
                {formatL1Name(state.l1?.name)}
              </td>
              <td rowSpan={typeRowSpan} className="border border-[#ccc] px-0.5 py-1 align-middle text-center font-bold cursor-pointer hover:bg-opacity-80" style={{ background: getTypeColor(t.name).light, color: getTypeColor(t.name).text, fontSize: 'clamp(9px, 2.5vw, 11px)', lineHeight: 1.2 }} onClick={() => handleCellClick({ type: 'l1Type', id: state.l1?.id || '', title: '구분 선택', itemCode: 'C1' })} onContextMenu={(e) => handleContextMenu(e, 'type', t.id)}>
                {getTypeColor(t.name).short || t.name || '(빈 타입)'}
              </td>
              <td className="border border-[#ccc] p-0 align-middle" style={{ background: funcZebraBg }} onContextMenu={(e) => handleContextMenu(e, 'function', t.id, firstFuncId)}>
                <SelectableCell fontSize="10px" value="" placeholder="기능 선택" bgColor={funcZebraBg} onClick={() => handleCellClick({ type: 'l1Function', id: t.id, title: '완제품 기능 선택', itemCode: 'C2', parentCategory: t.name })} />
              </td>
              <td className="border border-[#ccc] p-0 align-middle" style={{ background: failZebraBg }} onContextMenu={(e) => handleContextMenu(e, 'requirement', t.id, firstFuncId, '')}>
                <SelectableCell fontSize="10px" value="" placeholder="요구사항 선택" bgColor={failZebraBg} textColor={COLORS.failure.text} onClick={() => handleCellClick({ type: 'l1Requirement', id: t.functions?.[0]?.id || '', title: '요구사항 선택', itemCode: 'C3', parentFunction: '', parentCategory: t.name })} />
              </td>
            </tr>
          );
        }

        // 기능이 있는 경우 (functionsToRender 순회)
        return functionsToRender.map((f: any, fIdx: number) => {
          const currentFuncIdx = funcCounter++;
          const funcBlockZebra = getZebra('function', currentFuncIdx);
          const allReqs = f.requirements || [];
          const meaningfulReqs = filterMeaningfulRequirements(allReqs);
          // ★ 수정: 의미있는 요구사항이 있거나, 요구사항이 2개 이상(사용자가 의도적 추가)이면 모두 표시
          const reqsToRender = (meaningfulReqs.length > 0 || allReqs.length > 1) ? allReqs : allReqs.slice(0, 1);
          const funcRowSpan = Math.max(1, reqsToRender.length);

          // 요구사항이 없는 경우 (reqsToRender가 비어있는 경우)
          if (reqsToRender.length === 0) {
            const rowIdx = globalRowIdx++;
            const failZebraBg = getZebra('failure', rowIdx);
            const isFuncHighlighted = highlightIds?.has(f.id);

            return (
              <tr key={f.id} style={{ background: isFuncHighlighted ? '#FFFDE7' : funcBlockZebra, outline: isFuncHighlighted ? '2px solid #FFC107' : undefined, transition: 'all 0.3s' }} onContextMenu={(e) => handleContextMenu(e, 'function', t.id, f.id)}>
                {fIdx === 0 && (
                  <td rowSpan={typeRowSpan} className="border border-[#ccc] p-1 text-center font-semibold text-[10px] break-words align-middle" style={{ background: typeZebra }}>
                    {formatL1Name(state.l1?.name)}
                  </td>
                )}
                {fIdx === 0 && (
                  <td rowSpan={typeRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: getTypeColor(t.name).light }} onContextMenu={(e) => handleContextMenu(e, 'type', t.id)}>
                    <SelectableCell fontSize="10px" value={getTypeColor(t.name).short} placeholder="YP / SP / USER" bgColor={getTypeColor(t.name).light} textColor={getTypeColor(t.name).text} textAlign="center" onClick={() => handleCellClick({ type: 'l1Type', id: state.l1?.id || '', title: '구분 선택', itemCode: 'C1' })} />
                  </td>
                )}
                <td rowSpan={funcRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: funcBlockZebra }} onContextMenu={(e) => handleContextMenu(e, 'function', t.id, f.id)}>
                  <SelectableCell fontSize="10px" value={f.name} placeholder="기능" bgColor={funcBlockZebra} textColor="#000000" onClick={() => handleCellClick({ type: 'l1Function', id: t.id, funcId: f.id, title: '완제품 기능 선택', itemCode: 'C2', parentCategory: t.name })} onDoubleClickEdit={(newValue) => handleInlineEditFunction(t.id, f.id, newValue)} />
                </td>
                <td className="border border-[#ccc] p-0 align-middle" style={{ background: failZebraBg }} onContextMenu={(e) => handleContextMenu(e, 'requirement', t.id, f.id, '')}>
                  <SelectableCell fontSize="10px" value="" placeholder="요구사항 선택" bgColor={failZebraBg} textColor={COLORS.failure.text} onClick={() => handleCellClick({ type: 'l1Requirement', id: f.id, title: '요구사항 선택', itemCode: 'C3', parentFunction: f.name, parentCategory: t.name })} />
                </td>
              </tr>
            );
          }

          // 요구사항이 있는 경우 (reqsToRender 순회)
          return reqsToRender.map((r: any, rIdx: number) => {
            const rowIdx = globalRowIdx++;
            const failZebraBg = getZebra('failure', rowIdx);
            const isReqHighlighted = highlightIds?.has(r.id) || highlightIds?.has(f.id);

            return (
              <tr key={r.id} style={{ background: isReqHighlighted ? '#FFFDE7' : funcBlockZebra, outline: isReqHighlighted ? '2px solid #FFC107' : undefined, transition: 'all 0.3s' }} onContextMenu={(e) => handleContextMenu(e, 'requirement', t.id, f.id, r.id)}>
                {fIdx === 0 && rIdx === 0 && (
                  <td rowSpan={typeRowSpan} className="border border-[#ccc] p-1 text-center font-semibold text-[10px] break-words align-middle" style={{ background: typeZebra }}>
                    {formatL1Name(state.l1?.name)}
                  </td>
                )}
                {fIdx === 0 && rIdx === 0 && (
                  <td rowSpan={typeRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: getTypeColor(t.name).light }} onContextMenu={(e) => handleContextMenu(e, 'type', t.id)}>
                    <SelectableCell fontSize="10px" value={getTypeColor(t.name).short} placeholder="YP / SP / USER" bgColor={getTypeColor(t.name).light} textColor={getTypeColor(t.name).text} textAlign="center" onClick={() => handleCellClick({ type: 'l1Type', id: state.l1?.id || '', title: '구분 선택', itemCode: 'C1', parentCategory: 'PFMEA' })} />
                  </td>
                )}
                {rIdx === 0 && (
                  <td rowSpan={funcRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: funcBlockZebra }} onContextMenu={(e) => handleContextMenu(e, 'function', t.id, f.id)}>
                    <SelectableCell fontSize="10px" value={f.name} placeholder="기능" bgColor={funcBlockZebra} textColor="#000000" onClick={() => handleCellClick({ type: 'l1Function', id: t.id, funcId: f.id, title: '완제품 기능 선택', itemCode: 'C2', parentCategory: t.name })} onDoubleClickEdit={(newValue) => handleInlineEditFunction(t.id, f.id, newValue)} />
                  </td>
                )}
                <td className="border border-[#ccc] p-0 align-middle" style={{ background: failZebraBg }} onContextMenu={(e) => handleContextMenu(e, 'requirement', t.id, f.id, r.id)}>
                  <SelectableCell
                    value={r.name}
                    placeholder="요구사항"
                    bgColor={failZebraBg}
                    textColor={COLORS.failure.text}
                    onClick={() => handleCellClick({ type: 'l1Requirement', id: f.id, reqId: r.id, title: '요구사항 선택', itemCode: 'C3', parentFunction: f.name, parentCategory: t.name })}
                    onDoubleClickEdit={(newValue) => handleInlineEditRequirement(t.id, f.id, r.id, newValue)}
                  />
                </td>
              </tr>
            );
          });
        });
      })}
    </>
  );
}
