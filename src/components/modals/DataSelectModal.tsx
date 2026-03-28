/**
 * @file DataSelectModal.tsx
 * @description 공용 데이터 선택 모달 - 표준화된 형태
 * @version 4.0.0 - 표준화 적용
 * @updated 2025-12-29
 * 
 * 표준 레이아웃:
 * ┌───────────────────────────────────────────────────────────────┐
 * │ 📋 타이틀                                              [닫기]│
 * ├───────────────────────────────────────────────────────────────┤
 * │ [필터▼] 검색...                  │전체│해제│적용│삭제│        │
 * ├───────────────────────────────────────────────────────────────┤
 * │ + [카테고리▼] 새 항목 입력...                        [저장]  │
 * ├───────────────────────────────────────────────────────────────┤
 * │ ☑ 기본  Your Plant     ×  │ ☐ 기본  Ship to Plant          │
 * │ ☑ 기본  User               │ ☐ --  -                        │
 * ├───────────────────────────────────────────────────────────────┤
 * │                        ✓ 2개 선택                             │
 * └───────────────────────────────────────────────────────────────┘
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDraggableModal } from './useDraggableModal';
import {
  DataItem,
  ITEM_CODE_LABELS,
  CATEGORY_COLORS,
  DEFAULT_ITEMS,
  PFMEA_DEFAULT_ITEMS
} from './data/defaultItems';

// Re-export for backward compatibility
export type { DataItem } from './data/defaultItems';
export { ITEM_CODE_LABELS } from './data/defaultItems';

interface DataSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedValues: string[]) => void;
  onDelete?: (deletedValues: string[]) => void;
  title: string;
  itemCode: string;
  currentValues: string[];
  processNo?: string;
  processName?: string;
  workElementName?: string;
  parentTypeName?: string;    // 구분 (Your Plant / Ship to Plant / User)
  parentFunction?: string;
  parentCategory?: string;
  parentReqName?: string;     // 상위 요구사항
  parentFunctions?: string[]; // 상위 기능 목록 (요구사항 선택 시)
  processList?: { id: string; no: string; name: string }[];
  onProcessChange?: (processId: string) => void;
  singleSelect?: boolean;
  /** ✅ 2026-01-25: FMEA ID별 필터링 */
  fmeaId?: string;
  /** 호출측 호환 — 모달 내부에서 직접 사용하지 않으나 CODEFREEZE 호출측이 전달 */
  fmeaType?: string;
  fcText?: string;
  switchModes?: { id: string; label: string; itemCode: string }[];
  currentMode?: string;
  onModeChange?: (mode: string) => void;
  sodInfo?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sodRecommendation?: Record<string, any>;
  /**
   * true: 적용 시 체크된 항목만 전달(순서 유지, 해제 반영). false: 기존 currentValues + 신규만 병합.
   * 2L A3/A4(메인공정 기능·제품특성) 등 워크시트와 선택 상태를 1:1로 맞출 때 사용.
   */
  fullSelectionApply?: boolean;
}

export default function DataSelectModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  title,
  itemCode,
  currentValues,
  processNo,
  processName,
  workElementName,
  parentCategory,
  parentTypeName,
  parentFunction,
  parentReqName,
  parentFunctions = [],
  singleSelect = false,
  fmeaId,  // ✅ 2026-01-25: FMEA ID별 필터링
  fullSelectionApply = false,
}: DataSelectModalProps) {
  const [items, setItems] = useState<DataItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedFunction, setSelectedFunction] = useState(parentFunction || '');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('추가');

  // 더블클릭 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // ✅ 초기화 완료 플래그 (items 변경 시 재초기화 방지)
  const [initialized, setInitialized] = useState(false);

  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 130, right: 0 }, modalWidth: 350, modalHeight: 400, isOpen });

  const itemInfo = ITEM_CODE_LABELS[itemCode] || { label: itemCode, category: 'A', level: 'L1' };
  const hasBelongsToFilter = ['C1', 'C2', 'C3', 'FE1', 'FE2'].includes(itemCode);
  const needsFunctionSelect = itemCode === 'C3' && parentFunctions.length > 0; // 요구사항 선택 시 기능 필요

  // ✅ 2026-01-16: 초기 currentValues 저장 (모달 열릴 때마다 업데이트)
  const initialCurrentValuesRef = useRef<string[]>(currentValues);
  const prevCurrentValuesRef = useRef<string[]>(currentValues);

  // ✅ 2026-01-26: currentValues 또는 title 변경 시 (다른 셀 클릭) 선택 상태 즉시 리셋
  const prevTitleRef = useRef<string>(title);

  useEffect(() => {
    const prevStr = prevCurrentValuesRef.current.sort().join('|');
    const currStr = [...currentValues].sort().join('|');
    const titleChanged = prevTitleRef.current !== title;

    if (prevStr !== currStr || titleChanged) {
      console.log('[DataSelectModal] 대상 변경 감지 - 선택 상태 리셋', {
        prev: prevCurrentValuesRef.current,
        curr: currentValues,
        titleChanged,
        prevTitle: prevTitleRef.current,
        newTitle: title
      });
      initialCurrentValuesRef.current = currentValues;
      setInitialized(false); // 재초기화 트리거

      // ✅ 2026-01-26: 선택 상태도 즉시 리셋 (새로운 셀은 빈 상태로 시작)
      if (currentValues.length === 0) {
        setSelectedIds(new Set());
      }
    }
    prevCurrentValuesRef.current = currentValues;
    prevTitleRef.current = title;
  }, [currentValues, title]);

  // ✅ 모달이 열릴 때마다 초기값 업데이트
  useEffect(() => {
    if (isOpen) {
      initialCurrentValuesRef.current = currentValues;
    }
  }, [isOpen, currentValues]);

  // 데이터 로드 - ✅ 2026-01-25: DB에서 sourceFmeaId 필터링 추가
  useEffect(() => {
    if (!isOpen) return;
    console.log('[DataSelectModal] 모달 열림', { singleSelect, itemCode, title, fmeaId });

    const loadData = async () => {
      let allItems: DataItem[] = [];

      // ✅ 2026-01-25: PFMEA/DFMEA 분리 - URL 경로에 따라 올바른 데이터 로드
      const isPFMEA = typeof window !== 'undefined' && window.location.pathname.includes('/pfmea');
      const defaultItemsSource = isPFMEA ? PFMEA_DEFAULT_ITEMS : DEFAULT_ITEMS;

      // 기본 옵션 로드
      if (defaultItemsSource[itemCode]) {
        allItems = [...defaultItemsSource[itemCode]];
      }

      // ✅ 2026-01-25: DB에서 sourceFmeaId + processNo로 필터링하여 데이터 로드
      if (fmeaId) {
        try {
          const res = await fetch(`/api/pfmea/master?includeItems=true`);
          if (res.ok) {
            const data = await res.json();
            const flatItems = data.active?.flatItems || [];
            // sourceFmeaId + itemCode + processNo로 필터링
            let fmeaItems = flatItems.filter((item: any) =>
              item.sourceFmeaId === fmeaId && item.itemCode === itemCode.toUpperCase()
            );
            // ✅ processNo가 있으면 해당 공정 데이터만 필터링
            if (processNo) {
              fmeaItems = fmeaItems.filter((item: any) => item.processNo === processNo);
            }
            // ★ 2026-03-28: B2/B3는 작업요소별 필터링 (belongsTo = workElementName)
            if (workElementName && (itemCode === 'B2' || itemCode === 'B3')) {
              fmeaItems = fmeaItems.filter((item: any) =>
                item.belongsTo === workElementName || !item.belongsTo
              );
            }
            fmeaItems.forEach((item: any, idx: number) => {
              if (item.value && item.value.trim()) {
                const value = item.value.trim();
                if (!allItems.find(i => i.value === value)) {
                  allItems.push({
                    id: `${itemCode}_db_${idx}`,
                    value,
                    category: '기초정보',  // DB에서 로드된 기초정보
                    processNo: item.processNo,
                    sourceFmeaId: item.sourceFmeaId,
                  });
                }
              }
            });
            console.log(`[DataSelectModal] DB에서 ${fmeaItems.length}건 로드 (FMEA: ${fmeaId}, 공정: ${processNo || '전체'})`);
          }
        } catch (e) {
          console.error('[DataSelectModal] DB 로드 오류:', e);
        }
      }

      // ★ 2026-03-28: localStorage 폴백 제거 — DB Only 정책

      // 현재 워크시트에 있는 값 (초기값 사용)
      initialCurrentValuesRef.current.forEach((val, idx) => {
        if (val && val.trim() && !allItems.find(i => i.value === val)) {
          allItems.push({
            id: `${itemCode}_current_${idx}`,
            value: val,
            category: '워크시트',
          });
        }
      });

      setItems(allItems);
      setSearch('');
      setCategoryFilter('All');
    };

    loadData();
  }, [isOpen, itemCode, processNo, fmeaId, workElementName]);

  // ✅ 모달이 닫힐 때 초기화 플래그 리셋
  useEffect(() => {
    if (!isOpen) {
      setInitialized(false);
    }
  }, [isOpen]);

  // ✅ 선택 상태 초기화 - 최초 1회만 수행
  useEffect(() => {
    if (initialized) return; // 이미 초기화됨
    if (items.length === 0) return; // 아직 items 로드 안됨

    // ★ 2026-03-28: 자동 체크 제거 — 빈 Set으로 시작
    setSelectedIds(new Set());
    setInitialized(true);
  }, [items, initialized, title, itemCode, fullSelectionApply]);

  // 필터링
  const filteredItems = useMemo(() => {
    let result = items;

    if (parentCategory) {
      result = result.filter(i => i.belongsTo === parentCategory || !i.belongsTo);
    }

    if (hasBelongsToFilter && categoryFilter !== 'All') {
      result = result.filter(i => i.belongsTo === categoryFilter || !i.belongsTo);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(item => item.value.toLowerCase().includes(q));
    }

    return result;
  }, [items, categoryFilter, search, parentCategory, hasBelongsToFilter]);

  // ★★★ 2026-01-11: singleSelect를 함수 내부에서 직접 참조 (closure 문제 방지) ★★★
  const toggleSelect = (id: string) => {
    console.log('[DataSelectModal] toggleSelect 호출', { id, singleSelect, title });
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        console.log('[DataSelectModal] 선택 해제', { id, 남은개수: newSet.size });
      } else {
        // ★ singleSelect가 true일 때만 기존 선택 초기화
        if (singleSelect === true) {
          console.log('[DataSelectModal] 단일선택 모드 - 기존 선택 초기화');
          newSet.clear();
        } else {
          console.log('[DataSelectModal] 다중선택 모드 - 기존 선택 유지');
        }
        newSet.add(id);
        console.log('[DataSelectModal] 선택 추가', { id, 총개수: newSet.size, singleSelect });
      }
      return newSet;
    });
  };

  // 더블클릭 편집 시작
  const handleDoubleClick = useCallback((item: DataItem) => {
    setEditingId(item.id);
    setEditingValue(item.value);
  }, []);

  // 편집 저장
  const handleEditSave = useCallback(() => {
    if (!editingId || !editingValue.trim()) {
      setEditingId(null);
      setEditingValue('');
      return;
    }

    const trimmed = editingValue.trim();
    const oldItem = items.find(i => i.id === editingId);
    if (!oldItem) return;

    // 중복 체크 (자기 자신 제외) - 중복이면 무시
    if (items.some(i => i.id !== editingId && i.value === trimmed)) return;

    // 아이템 업데이트
    setItems(prev => prev.map(item =>
      item.id === editingId ? { ...item, value: trimmed } : item
    ));

    // ★ localStorage 제거 — DB Only

    setEditingId(null);
    setEditingValue('');
  }, [editingId, editingValue, items, itemCode]);

  // 편집 취소 (ESC)
  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditingValue('');
  }, []);

  const selectAll = () => setSelectedIds(new Set(filteredItems.map(i => i.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleApply = () => {
    if (fullSelectionApply) {
      const ordered: string[] = [];
      const seenVal = new Set<string>();
      for (const item of filteredItems) {
        if (!selectedIds.has(item.id)) continue;
        const raw = item.value ?? '';
        const t = raw.trim();
        if (!t) continue;
        if (seenVal.has(t)) continue;
        seenVal.add(t);
        ordered.push(t);
      }
      console.log('✅ [DataSelectModal] handleApply fullSelectionApply', {
        title,
        itemCode,
        orderedLength: ordered.length,
        ordered
      });
      onSave(ordered);
    } else {
      // ★ 2026-03-27: 미적용 섹션에서 선택된 항목만 추가 (기존 currentValues 유지)
      const selectedValues = items.filter(item => selectedIds.has(item.id)).map(item => item.value);

      const newSelectedValues = selectedValues.filter(v => !currentValues.includes(v));

      if (newSelectedValues.length === 0) {
        alert('적용할 새 항목을 선택해주세요.');
        return;
      }

      const mergedValues = [...new Set([...currentValues, ...newSelectedValues])];

      console.log('✅ [DataSelectModal] handleApply 호출', {
        title,
        itemCode,
        currentValues,
        selectedIds: Array.from(selectedIds),
        selectedValues,
        newSelectedValues,
        mergedValues,
        itemsCount: items.length,
        singleSelect
      });
      onSave(mergedValues);
    }
    // ✅ 2026-01-26: 저장 후 0.5초 뒤에 자동 닫기 (저장 완료 대기)
    setTimeout(() => {
      onClose();
    }, 500);
  };

  // ✅ 2026-01-19: 선택 삭제 기능 수정 - 체크된 항목만 삭제
  const handleDeleteSelected = () => {
    // 현재 체크된 항목들의 값
    const selectedValues = items.filter(item => selectedIds.has(item.id)).map(item => item.value);

    // 삭제 대상: 체크된 것 중 currentValues에 있는 것 (이미 저장된 것만 삭제 가능)
    const deletedValues = currentValues.filter(v => selectedValues.includes(v));

    if (deletedValues.length === 0) {
      alert('삭제할 항목이 없습니다.\n\n💡 삭제하려면 항목을 체크한 후 삭제 버튼을 클릭하세요.');
      return;
    }

    if (!confirm(`${deletedValues.length}개 항목을 삭제하시겠습니까?\n\n삭제될 항목:\n${deletedValues.join('\n')}`)) return;

    if (onDelete) {
      onDelete(deletedValues);
      console.log('[DataSelectModal] 선택 삭제:', deletedValues);
    }
    // ✅ 2026-03-27: 삭제 후 0.5초 뒤에 자동 닫기
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleAddSave = () => {
    if (!newValue.trim()) return;
    const trimmedValue = newValue.trim();

    // 중복이면 무시
    if (items.some(i => i.value === trimmedValue)) {
      console.warn('[수동입력] 중복 항목:', trimmedValue);
      return;
    }

    // ✅ 2026-01-12: newCategory 사용 (WorkElementSelectModal 스타일)
    const newItem: DataItem = {
      id: `new_${Date.now()}`,
      value: trimmedValue,
      category: newCategory || '추가'
    };
    setItems(prev => [newItem, ...prev]); // 맨 위에 추가
    setSelectedIds(prev => new Set([...prev, newItem.id]));

    // ★ localStorage 제거 — DB Only

    // ✅ 2026-01-16: 엔터 시 워크시트에 즉시 반영 (모달 유지)
    // 현재 선택된 항목들 + 새 항목을 워크시트에 전달
    const allSelectedValues = [...currentValues.filter(v => v !== trimmedValue), trimmedValue];
    onSave(allSelectedValues);
    console.log('[수동입력] 워크시트 반영:', allSelectedValues);

    setNewValue('');
  };

  const handleDeleteSingle = async (item: DataItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 목록에서 제거
    setItems(prev => prev.filter(i => i.id !== item.id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(item.id);
      return newSet;
    });
    // DB에서도 삭제 (마스터 flat items)
    if (fmeaId && item.value) {
      try {
        await fetch('/api/fmea/master-processes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fmeaId,
            processNos: [],
            deleteByValue: { itemCode, processNo: processNo || '', value: item.value },
          }),
        });
      } catch (err) {
        console.error('[DataSelectModal] DB 삭제 오류:', err);
      }
    }
  };

  const isCurrentlySelected = (value: string) => currentValues.includes(value);
  const minRows = 10;

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* ✅ 2026-01-19: 배경을 클릭 통과하도록 변경 - 다른 항목 클릭 시 자동 전환 */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
      />
      <div
        className="fixed bg-white rounded-lg shadow-2xl w-[400px] max-w-[400px] min-w-[400px] flex flex-col overflow-hidden max-h-[calc(100vh-80px)] cursor-move z-[9999] pointer-events-auto"
        style={{
          top: `${modalPosition.top}px`,
          right: `${modalPosition.right}px`
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {/* ===== 헤더 (주황색 + 빨간 닫기) ===== */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-yellow-300 text-[11px] font-bold">선택입력 :</span>
            <span>📋</span>
            <h2 className="text-[11px] font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded font-bold">닫기</button>
        </div>

        {/* ===== 상위 항목 고정 표시 ===== */}
        <div className="px-2 py-1 border-b bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-red-700 shrink-0">★ 상위항목:</span>

            {/* C3 요구사항: 상위는 완제품기능 */}
            {itemCode === 'C3' && parentFunction && (
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-gray-600 font-bold">완제품기능:</span>
                <span className="px-2 py-1 text-[10px] font-bold bg-green-600 text-white rounded max-w-[300px] truncate" title={parentFunction}>
                  {parentFunction}
                </span>
              </div>
            )}

            {/* FM1 고장형태: 상위는 제품특성 */}
            {itemCode === 'FM1' && parentFunction && (
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-gray-600 font-bold">제품특성:</span>
                <span className="px-2 py-1 text-[10px] font-bold bg-green-600 text-white rounded max-w-[300px] truncate" title={parentFunction}>
                  {parentFunction}
                </span>
              </div>
            )}

            {/* FC1 고장원인: 상위는 공정특성 */}
            {itemCode === 'FC1' && parentFunction && (
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-gray-600 font-bold">공정특성:</span>
                <span className="px-2 py-1 text-[10px] font-bold bg-green-600 text-white rounded max-w-[300px] truncate" title={parentFunction}>
                  {parentFunction}
                </span>
              </div>
            )}

            {/* FE2 고장영향: 상위는 요구사항 */}
            {itemCode === 'FE2' && parentReqName && (
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-gray-600 font-bold">요구사항:</span>
                <span className="px-2 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded max-w-[300px] truncate" title={parentReqName}>
                  {parentReqName}
                </span>
              </div>
            )}

            {/* 기본 표시: 위 조건에 해당하지 않는 경우 */}
            {!['C3', 'FM1', 'FC1', 'FE2'].includes(itemCode) && (
              <>
                {processName && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-600 font-bold">공정명:</span>
                    <span className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded">{processName}</span>
                  </div>
                )}
                {parentTypeName && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-600 font-bold">구분:</span>
                    <span className="px-2 py-1 text-[10px] font-bold bg-teal-600 text-white rounded">{parentTypeName}</span>
                  </div>
                )}
                {parentFunction && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-600 font-bold">기능:</span>
                    <span className="px-2 py-1 text-[10px] font-bold bg-green-600 text-white rounded max-w-[250px] truncate" title={parentFunction}>{parentFunction}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ===== 검색 영역 ===== */}
        <div className="px-2 py-1 border-b bg-gray-50">
          {/* 검색/입력 통합 (엔터 치면 추가) */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (!search.trim()) return;
                // 검색값이 목록에 없으면 추가
                const trimmed = search.trim();
                const exists = items.some(i => i.value === trimmed);
                if (!exists) {
                  // 새 항목 추가 (맨 위에)
                  const newItem: DataItem = { id: `new_${Date.now()}`, value: trimmed, category: '추가' };
                  setItems(prev => [newItem, ...prev]); // 맨 위에 추가
                  setSelectedIds(prev => new Set([...prev, newItem.id]));
                  // 필터를 초기화하여 추가된 항목이 보이게
                  setCategoryFilter('All');
                  // ★ localStorage 제거 — DB Only
                  // ✅ 2026-01-16: 엔터 시 워크시트에 즉시 반영 (모달 유지)
                  const allSelectedValues = [...currentValues.filter(v => v !== trimmed), trimmed];
                  onSave(allSelectedValues);
                  console.log('[검색입력] 워크시트 반영:', allSelectedValues);
                  setSearch('');
                } else {
                  // 이미 있으면 선택 후 워크시트에 반영
                  const found = items.find(i => i.value === trimmed);
                  if (found) {
                    setSelectedIds(prev => new Set([...prev, found.id]));
                    // ✅ 2026-01-16: 엔터 시 워크시트에 즉시 반영 (모달 유지)
                    const allSelectedValues = [...currentValues.filter(v => v !== trimmed), trimmed];
                    onSave(allSelectedValues);
                    console.log('[검색선택] 워크시트 반영:', allSelectedValues);
                  }
                  setSearch('');
                }
              }
            }}
            placeholder={`🔍 ${itemInfo.label} 검색 또는 새 항목 입력...`}
            className="w-full px-2 py-0.5 text-[10px] border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* ===== 버튼 영역 제거 → 섹션별로 이동 ===== */}

        {/* 하위항목 라벨 */}
        {itemCode !== 'C1' && (
          <>
            <div className="px-3 py-1 border-b bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <span className="text-[11px] font-bold text-blue-700">▼ 하위항목: {itemInfo.label}</span>
              <span className="text-[9px] text-blue-400 ml-2">검색창에서 입력 후 Enter로 추가</span>
            </div>
          </>
        )}

        {/* ===== 리스트 (적용됨/미적용 분리, 2열 그리드) ===== */}
        <div className="overflow-auto p-1.5 flex-1 min-h-[200px]">
          {(() => {
            // 적용됨(워크시트에 있음) / 미적용 분리
            const appliedItems = filteredItems.filter(item => isCurrentlySelected(item.value));
            const notAppliedItems = filteredItems.filter(item => !isCurrentlySelected(item.value));
            
            const renderItem = (item: DataItem) => {
              const isSelected = selectedIds.has(item.id);
              const isCurrent = isCurrentlySelected(item.value);
              const catColor = CATEGORY_COLORS[item.category || '기본'] || CATEGORY_COLORS['기본'];
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => !isEditing && toggleSelect(item.id)}
                  onDoubleClick={() => handleDoubleClick(item)}
                  className={`flex items-start gap-1.5 px-1.5 py-1 rounded border cursor-pointer transition-all ${isEditing
                    ? 'bg-yellow-50 border-yellow-400'
                    : isSelected
                      ? isCurrent ? 'bg-green-50 border-green-400' : 'bg-blue-50 border-blue-400'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                  title="더블클릭으로 수정"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected
                    ? isCurrent ? 'bg-green-500 border-green-500' : 'bg-blue-500 border-blue-500'
                    : 'bg-white border-gray-300'
                    }`}>
                    {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
                  </div>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: catColor.bg, color: catColor.text }}
                  >
                    {item.category || '기본'}
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave();
                        if (e.key === 'Escape') handleEditCancel();
                      }}
                      onBlur={handleEditSave}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="flex-1 text-[10px] px-1 py-0.5 border border-yellow-400 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 bg-white"
                    />
                  ) : (
                    <span className={`flex-1 text-[10px] break-words leading-tight ${isSelected ? (isCurrent ? 'text-green-800 font-medium' : 'text-blue-800 font-medium') : 'text-gray-700'}`}>
                      {item.value}
                    </span>
                  )}
                  {!isEditing && !isCurrent && (
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={(e) => handleDeleteSingle(item, e)}
                      className="text-red-400 hover:text-red-600 text-xs shrink-0 px-1"
                      title="목록에서 삭제"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            };
            
            // 섹션별 선택/해제 함수
            const selectApplied = () => setSelectedIds(prev => {
              const newSet = new Set(prev);
              appliedItems.forEach(i => newSet.add(i.id));
              return newSet;
            });
            const deselectApplied = () => setSelectedIds(prev => {
              const newSet = new Set(prev);
              appliedItems.forEach(i => newSet.delete(i.id));
              return newSet;
            });
            const selectNotApplied = () => setSelectedIds(prev => {
              const newSet = new Set(prev);
              notAppliedItems.forEach(i => newSet.add(i.id));
              return newSet;
            });
            const deselectNotApplied = () => setSelectedIds(prev => {
              const newSet = new Set(prev);
              notAppliedItems.forEach(i => newSet.delete(i.id));
              return newSet;
            });
            
            return (
              <>
                {/* 적용됨 섹션 */}
                {appliedItems.length > 0 && (
                  <div className="mb-2">
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-green-50 px-2 py-1 rounded mb-1">
                      <span className="text-[10px] font-bold text-green-700">✅ 적용됨 ({appliedItems.filter(i => selectedIds.has(i.id)).length}/{appliedItems.length})</span>
                      <div className="flex gap-1">
                        <button onClick={selectApplied} className="text-[9px] px-1.5 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold">전체</button>
                        <button onClick={deselectApplied} className="text-[9px] px-1.5 py-0.5 bg-gray-400 text-white rounded hover:bg-gray-500 font-bold">해제</button>
                        <button onClick={handleDeleteSelected} className="text-[9px] px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600 font-bold">삭제</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {appliedItems.map(renderItem)}
                    </div>
                  </div>
                )}
                
                {/* 미적용 섹션 */}
                {notAppliedItems.length > 0 && (
                  <div className="mb-1">
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-100 px-2 py-1 rounded mb-1">
                      <span className="text-[10px] font-bold text-gray-500">미적용 ({notAppliedItems.filter(i => selectedIds.has(i.id)).length}/{notAppliedItems.length})</span>
                      <div className="flex gap-1">
                        <button onClick={selectNotApplied} className="text-[9px] px-1.5 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold">전체</button>
                        <button onClick={deselectNotApplied} className="text-[9px] px-1.5 py-0.5 bg-gray-400 text-white rounded hover:bg-gray-500 font-bold">해제</button>
                        <button onClick={handleApply} className="text-[9px] px-1.5 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 font-bold">적용</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {notAppliedItems.map(renderItem)}
                    </div>
                  </div>
                )}
                
                {/* 빈 placeholder */}
                {filteredItems.length === 0 && (
                  <div className="grid grid-cols-2 gap-1">
                    {Array.from({ length: minRows }).map((_, idx) => (
                      <div
                        key={`empty-${idx}`}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded border border-gray-100 bg-gray-50/50"
                      >
                        <div className="w-4 h-4 rounded border border-gray-200 bg-white shrink-0" />
                        <span className="text-[9px] text-gray-300">--</span>
                        <span className="flex-1 text-[10px] text-gray-300">-</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* ===== 푸터: 선택 개수 표시 ===== */}
        <div className="px-2 py-0.5 border-t bg-gray-50 flex items-center justify-center">
          <span className="text-[10px] font-bold text-blue-600">✓ {selectedIds.size}개 선택</span>
        </div>
      </div>
    </>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
