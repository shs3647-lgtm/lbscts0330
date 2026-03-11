/**
 * @file useDataSelectState.ts
 * @description DataSelectModal의 데이터 로딩, 상태 관리, 핸들러를 분리한 커스텀 훅
 * @version 1.0.0 - DataSelectModal.tsx에서 상태/효과/핸들러 추출
 * @created 2026-02-11
 */

// CODEFREEZE: DB Only 정책 적용 완료 (2026-02-16) - localStorage pfmea_master_data 폴백 제거
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DataItem,
  ITEM_CODE_LABELS,
  DEFAULT_ITEMS,
  PFMEA_DEFAULT_ITEMS
} from './data/defaultItems';

/** useDataSelectState 훅의 파라미터 타입 */
export interface UseDataSelectStateParams {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedValues: string[]) => void;
  onDelete?: (deletedValues: string[]) => void;
  itemCode: string;
  currentValues: string[];
  title: string;
  processNo?: string;
  parentCategory?: string;
  parentFunction?: string;
  parentFunctions?: string[];
  singleSelect?: boolean;
  fmeaId?: string;
  switchModes?: { id: string; label: string; itemCode: string }[];
  currentMode?: string;
  onModeChange?: (modeId: string) => void;
}

export function useDataSelectState({
  isOpen,
  onClose,
  onSave,
  onDelete,
  itemCode,
  currentValues,
  title,
  processNo,
  parentCategory,
  parentFunction,
  parentFunctions = [],
  singleSelect = false,
  fmeaId,
}: UseDataSelectStateParams) {
  const [items, setItems] = useState<DataItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [newValue, setNewValue] = useState('');
  // ★★★ 2026-02-05: C1(구분)은 YP를 기본값으로 ★★★
  const [newCategory, setNewCategory] = useState(itemCode === 'C1' ? 'YP' : '추가');

  // 더블클릭 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // ✅ 초기화 완료 플래그 (items 변경 시 재초기화 방지)
  const [initialized, setInitialized] = useState(false);

  const itemInfo = ITEM_CODE_LABELS[itemCode] || { label: itemCode, category: 'A', level: 'L1' as const };
  const hasBelongsToFilter = ['C1', 'C2', 'C3', 'FE1', 'FE2'].includes(itemCode);

  // ✅ 2026-01-16: 초기 currentValues 저장 (모달 열릴 때마다 업데이트)
  const initialCurrentValuesRef = useRef<string[]>(Array.isArray(currentValues) ? currentValues : []);
  const prevCurrentValuesRef = useRef<string[]>(Array.isArray(currentValues) ? currentValues : []);

  // ✅ 2026-01-26: currentValues 또는 title 변경 시 (다른 셀 클릭) 선택 상태 즉시 리셋
  const prevTitleRef = useRef<string>(title);

  useEffect(() => {
    const prevArr = Array.isArray(prevCurrentValuesRef.current) ? prevCurrentValuesRef.current : [];
    const currArr = Array.isArray(currentValues) ? currentValues : [];
    const prevStr = [...prevArr].sort().join('|');
    const currStr = [...currArr].sort().join('|');
    const titleChanged = prevTitleRef.current !== title;

    if (prevStr !== currStr || titleChanged) {
      initialCurrentValuesRef.current = Array.isArray(currentValues) ? currentValues : [];
      setInitialized(false); // 재초기화 트리거

      // ✅ 2026-01-26: 선택 상태도 즉시 리셋 (새로운 셀은 빈 상태로 시작)
      if (currArr.length === 0) {
        setSelectedIds(new Set());
      }
    }
    prevCurrentValuesRef.current = Array.isArray(currentValues) ? currentValues : [];
    prevTitleRef.current = title;
  }, [currentValues, title]);

  // ✅ 모달이 열릴 때마다 초기값 업데이트
  useEffect(() => {
    if (isOpen) {
      initialCurrentValuesRef.current = Array.isArray(currentValues) ? currentValues : [];
    }
  }, [isOpen, currentValues]);

  // 데이터 로드 - ✅ 2026-01-25: DB에서 sourceFmeaId 필터링 추가
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      let allItems: DataItem[] = [];

      // ★★★ 2026-02-03: SC(특별특성)는 pfmea_special_char_master에서 고객별 기호 로드 ★★★
      if (itemCode === 'SC') {
        try {
          const savedMaster = localStorage.getItem('pfmea_special_char_master');
          if (savedMaster) {
            const parsed = JSON.parse(savedMaster);
            const masterData = Array.isArray(parsed) ? parsed : [];
            // 고객별 기호 목록 추출 (중복 제거)
            const symbolSet = new Map<string, { icon: string; color: string; customer: string; meaning: string }>();
            masterData.forEach((item: any) => {
              const key = item.customerSymbol;
              if (key && !symbolSet.has(key)) {
                symbolSet.set(key, {
                  icon: item.icon || '',
                  color: item.color || '#9e9e9e',
                  customer: item.customer || '',
                  meaning: item.meaning || ''
                });
              }
            });
            // DataItem 형태로 변환
            symbolSet.forEach((data, symbol) => {
              allItems.push({
                id: `SC_master_${symbol}`,
                value: symbol,  // customerSymbol (IC, CC, BM-F 등)
                category: data.customer,  // 고객사 (현대/기아, BMW 등)
                icon: data.icon,
                color: data.color,
                meaning: data.meaning,
              });
            });
          }
        } catch (e) {
          console.error('[DataSelectModal] SC 마스터 로드 오류:', e);
        }
        // 기본값이 없으면 PFMEA_DEFAULT_ITEMS에서 로드
        if (allItems.length === 0) {
          const isPFMEA = typeof window !== 'undefined' && window.location.pathname.includes('/pfmea');
          const defaultItemsSource = isPFMEA ? PFMEA_DEFAULT_ITEMS : DEFAULT_ITEMS;
          if (defaultItemsSource['SC']) {
            allItems = defaultItemsSource['SC'].map((item: any) => ({
              ...item,
              category: item.category || '기본'
            }));
          }
        }
        setItems(allItems);
        setInitialized(true);
        return;  // SC는 여기서 종료
      }

      // ★★★ 2026-02-05: C2(완제품기능), C3(요구사항)도 DB 마스터에서 로드 ★★★
      const isL1FunctionOrReq = false;  // DB 로드 허용

      // ✅ 2026-01-25: PFMEA/DFMEA 분리 - URL 경로에 따라 올바른 데이터 로드
      const isPFMEA = typeof window !== 'undefined' && window.location.pathname.includes('/pfmea');
      const defaultItemsSource = isPFMEA ? PFMEA_DEFAULT_ITEMS : DEFAULT_ITEMS;

      // ★★★ 2026-02-03: L1(C2/C3/C4), L2(A3-A6, FM1), L3(B2-B6, FC1)는 기본 옵션 로드 안 함 (DB 기초정보만 사용) ★★★
      // ★★★ 수정: B5/B6(예방관리/검출관리)도 DB 전용 - 레거시/기본옵션 사용 안 함 ★★★
      const isL1FunctionItem = itemCode === 'C2' || itemCode === 'C3' || itemCode === 'C4' || itemCode === 'FE2'; // ★ FE2=고장영향도 DB전용
      const isL2FunctionItem = ['A3', 'A4', 'A5', 'A6', 'FM1'].includes(itemCode);  // 2L 공정기능/제품특성/고장형태/검출관리
      const isL3FunctionItem = ['B2', 'B3', 'B4', 'B5', 'B6', 'FC1'].includes(itemCode);  // ★ B5/B6 포함 (DB 전용)
      const isDbOnlyItem = isL1FunctionItem || isL2FunctionItem || isL3FunctionItem;
      // ★★★ 2026-02-03: A5는 DB 전용 (기본값 사용 안 함) ★★★
      const isFailureItem = itemCode === 'FM1' || itemCode === 'FC1';  // A5 제거
      // ★★★ B5/B6는 DB 기초정보에서만 로드 (기본 옵션 사용 안 함) ★★★
      const isControlItem = itemCode === 'B5' || itemCode === 'B6';
      // ★★★ 2026-02-18: B2/B3/B4도 기본값이 있으면 로드 (hasDefaults 추가) ★★★
      const hasDefaults = defaultItemsSource[itemCode]?.length > 0;
      if (!isL1FunctionOrReq && (!isDbOnlyItem || isFailureItem || hasDefaults) && !isControlItem && defaultItemsSource[itemCode]) {
        // ★★★ 2026-02-03: B5/B6 제외 - 기본값에 현재 공정번호 반영 ★★★
        allItems = defaultItemsSource[itemCode].map((item: any) => ({
          ...item,
          category: processNo || item.category || '전체',  // 공정번호가 있으면 표시
          processNo: processNo || item.processNo || '',
        }));
      }

      // ✅ 2026-01-25: DB에서 sourceFmeaId + processNo로 필터링하여 데이터 로드
      // ★★★ 2026-02-03: C2/C3/C4, A3, B5/B6는 fmeaId 없어도 로드 (기초정보 전체) ★★★
      if (!isL1FunctionOrReq && (fmeaId || isDbOnlyItem || isControlItem)) {
        try {
          // ★★★ 2026-02-16: PFMEA/DFMEA 자동 감지 - 올바른 master API 호출 ★★★
          const masterApiPath = isPFMEA ? '/api/pfmea/master' : '/api/dfmea/master';
          const res = await fetch(`${masterApiPath}?includeItems=true`);
          if (res.ok) {
            const data = await res.json();
            const flatItems = data.active?.flatItems || [];

            // ★★★ 2026-02-03: B5/B6/A6는 기초정보 데이터이므로 fmeaId 필터링 제외 ★★★
            // ★ FIX: A6(검출관리)도 Import 기초정보에서 로드해야 함 (sourceFmeaId=null 포함)
            const isControlItemForFilter = itemCode === 'B5' || itemCode === 'B6' || itemCode === 'A6';

            // ★ fmeaId가 있으면 필터링, 단 B5/B6는 fmeaId 필터링 제외 (기초정보 전체 로드)
            // ★★★ 2026-02-08: FE2→C4 매핑 (모달 itemCode FE2 = DB itemCode C4) ★★★
            const dbItemCode = itemCode === 'FE2' ? 'C4' : itemCode.toUpperCase();
            let fmeaItems = flatItems.filter((item: any) =>
              item.itemCode === dbItemCode &&
              (isControlItemForFilter || !fmeaId || item.sourceFmeaId === fmeaId)
            );
            // ✅ processNo가 있으면 해당 공정 데이터만 필터링
            // ★★★ 2026-02-05: 공통공정 = '0' (하드코딩) ★★★
            // - 공정번호 0, 10, 20, 30... 형식으로 통일
            // - 공정번호 '0'은 공통공정 (모든 공정에 표시)
            // - 예: 작업자, 셋업엔지니어, 보전원 등
            const COMMON_PROCESS = '0';

            // ★★★ 2026-02-08: A5(고장형태)도 해당 공정 필터링 적용 ★★★
            const isFailureModeItem = itemCode === 'FM1' || itemCode === 'FC1';
            const isProcessRelatedItem = ['A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6'].includes(itemCode);

            // ★★★ 2026-02-22: 공정번호 기반 필터 (해당공정 + 공통공정만 표시) ★★★
            // B2/B3/B4/B5는 parentCategory(4M) 필터 적용 안 함 — processNo만 사용
            if (processNo && !isFailureModeItem) {
              if (isProcessRelatedItem) {
                fmeaItems = fmeaItems.filter((item: any) => {
                  const itemProcessNo = String(item.processNo ?? '').trim();
                  return (
                    itemProcessNo === String(processNo) ||  // 해당 공정
                    itemProcessNo === COMMON_PROCESS        // 공통공정 (0)
                  );
                });
              } else {
                fmeaItems = fmeaItems.filter((item: any) => item.processNo === processNo);
              }
            }
            // ★★★ 2026-02-06 FIX: C2/C3/C4는 parentCategory로 필터링 (구분별 기능/요구사항/고장영향) ★★★
            // ★ 중요: 필터 결과가 0건이면 전체 표시 (USER 등 DB에 해당 카테고리 데이터가 없을 수 있음)
            const isL1Item = itemCode === 'C2' || itemCode === 'C3' || itemCode === 'C4' || itemCode === 'FE2'; // ★ FE2도 카테고리 필터
            if (isL1Item && parentCategory) {
              // ★★★ 구분 이름 정규화 (Your Plant → YP, Ship to Plant → SP, User → USER) ★★★
              const normalizeCat = (cat: string): string => {
                const c = (cat || '').trim().toUpperCase();
                if (c === 'YOUR PLANT' || c === 'YP' || c === '자사') return 'YP';
                if (c === 'SHIP TO PLANT' || c === 'SP' || c === '고객사') return 'SP';
                if (c === 'USER' || c === 'END USER' || c === '사용자') return 'USER';
                return cat;  // 원본 반환
              };
              const normalizedCategory = normalizeCat(parentCategory);
              const filteredByCategory = fmeaItems.filter((item: any) => normalizeCat(item.processNo) === normalizedCategory);

              // ★★★ 2026-02-06 FIX: 해당 카테고리 항목이 0건이면 전체 표시 (USER 등) ★★★
              if (filteredByCategory.length > 0) {
                fmeaItems = filteredByCategory;
              } else {
                // fmeaItems 그대로 유지 (필터링 안 함)
              }
              // ★★★ 2026-02-16: USER + C2/C3(완제품기능/요구사항) 모달에 N/A 하드코딩 항목 추가 ★★★
              if (normalizedCategory === 'USER' && (itemCode === 'C2' || itemCode === 'C3')) {
                const naExists = fmeaItems.some((item: any) => {
                  const v = typeof item.value === 'string' ? item.value : item.value?.name || '';
                  return v.trim().toUpperCase() === 'N/A';
                });
                if (!naExists && !allItems.find(i => i.value === 'N/A')) {
                  allItems.push({
                    id: `${itemCode}_na_hardcoded`,
                    value: 'N/A',
                    category: 'USER',
                    processNo: 'USER',
                  });
                }
              }
            }

            // ★ 2026-03-04: 필터 결과 0건 시 디버그 로그 (빈 모달 원인 추적)
            if (fmeaItems.length === 0) {
              if (flatItems.length > 0) {
                const sampleSourceIds = [...new Set(flatItems.slice(0, 10).map((i: any) => i.sourceFmeaId))];
                const sampleProcessNos = [...new Set(flatItems.slice(0, 10).map((i: any) => i.processNo))];
              }
            }

            fmeaItems.forEach((item: any, idx: number) => {
              // ★★★ 2026-02-03: 객체를 문자열로 변환 (공정특성 파싱 문제 해결) ★★★
              let rawValue = item.value;
              if (rawValue && typeof rawValue === 'object') {
                // JSON 객체인 경우 name 또는 value 필드 추출
                rawValue = rawValue.name || rawValue.value || '';
              }
              const valueStr = String(rawValue || '').trim();
              if (!valueStr || valueStr === '[object Object]') return;  // 빈 값 또는 잘못된 객체 건너뜀

              const value = valueStr;
              // ★★★ 2026-02-03: 플레이스홀더 값 제외 ★★★
              const isPlaceholder = value.includes('입력)') || value.includes('선택)') || value === '(필수)' || value === '(선택)';
              if (isPlaceholder) return;  // 플레이스홀더는 건너뜀

              // ★★★ 2026-02-03: 접두사 제거 - 값만 표시, 필터는 내부적으로 동작 ★★★
              if (!allItems.find(i => i.value === value)) {
                allItems.push({
                  id: `${itemCode}_db_${idx}`,
                  value: value,  // 원본 값만 표시 (접두사 없음)
                  category: item.processNo || '',  // ★ YP/SP/USER 표시
                  processNo: item.processNo,
                  sourceFmeaId: item.sourceFmeaId,
                });
              }
            });
          }
        } catch (e) {
          console.error('[DataSelectModal] DB 로드 오류:', e);
        }
      }

      // ★★★ 2026-02-16: localStorage 폴백 제거 (DB Only 정책) ★★★

      // 현재 워크시트에 있는 값 (초기값 사용) - 항상 표시
      // ★★★ 2026-02-08: isDbOnlyItem도 현재값 표시 (DB에 항목 없으면 빈 모달 방지) ★★★
      (initialCurrentValuesRef.current || []).forEach((val, idx) => {
        if (val && val.trim() && !allItems.find(i => i.value === val)) {
          allItems.push({
            id: `${itemCode}_current_${idx}`,
            value: val,
            category: '워크시트',
          });
        }
      });

      // ★★★ 2026-02-03: A5(고장형태) 데이터 없으면 경고 ★★★
      if ((itemCode === 'A5' || itemCode === 'FM1') && allItems.length === 0) {
        alert('⚠️ 고장형태 기초데이터가 없습니다.\n\n기초정보에서 고장형태(L2-5)를 먼저 임포트해주세요.');
      }
      // ★ 2026-03-04: B2/B3(작업요소기능/공정특성) 데이터 없으면 안내
      if ((itemCode === 'B2' || itemCode === 'B3') && allItems.length === 0) {
      }

      // ★★★ 2026-02-22: 공정번호 순서대로 정렬 ★★★
      allItems.sort((a, b) => {
        const aNo = parseInt(String(a.processNo ?? ''), 10);
        const bNo = parseInt(String(b.processNo ?? ''), 10);
        const aValid = !isNaN(aNo);
        const bValid = !isNaN(bNo);
        if (aValid && bValid) return aNo - bNo;
        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;
        return a.value.localeCompare(b.value, 'ko');
      });

      setItems(allItems);
      setSearch('');
      setCategoryFilter('All');
    };

    loadData();
  }, [isOpen, itemCode, processNo, parentCategory, fmeaId]);

  // ✅ 모달이 닫힐 때 초기화 플래그 리셋
  useEffect(() => {
    if (!isOpen) {
      setInitialized(false);
    }
  }, [isOpen]);

  // ✅ 선택 상태 초기화 - 최초 1회만 수행 (items 변경 시 재초기화 방지)
  useEffect(() => {
    if (initialized) return; // 이미 초기화됨
    if (items.length === 0) return; // 아직 items 로드 안됨

    const newSelectedIds = new Set<string>();
    (initialCurrentValuesRef.current || []).forEach(val => {
      const found = items.find(item => item.value === val);
      if (found) newSelectedIds.add(found.id);
    });
    setSelectedIds(newSelectedIds);
    setInitialized(true);
  }, [items, initialized, title, itemCode]);

  // 필터링
  const filteredItems = useMemo(() => {
    let result = items;

    // ★★★ 2026-02-18: B2/B3/B4는 parentCategory 필터 적용 안 함 (모든 4M 항목 표시) ★★★
    // PFMEA L3 기본값들은 belongsTo로 구분되지만 parentCategory로는 필터링하지 않음
    // (사용자가 작업요소의 m4 값과 다른 기능도 선택할 수 있어야 함)
    const skipParentCategoryFilter = ['B2', 'B3', 'B4'].includes(itemCode);
    if (parentCategory && !skipParentCategoryFilter) {
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
  }, [items, categoryFilter, search, parentCategory, hasBelongsToFilter, itemCode]);

  // ★★★ 2026-01-11: singleSelect를 함수 내부에서 직접 참조 (closure 문제 방지) ★★★
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        // ★ singleSelect가 true일 때만 기존 선택 초기화
        if (singleSelect === true) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  }, [singleSelect]);

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

    // ★★★ 2026-02-16: localStorage 저장 제거 (DB Only 정책) ★★★

    setEditingId(null);
    setEditingValue('');
  }, [editingId, editingValue, items, itemCode]);

  // 편집 취소 (ESC)
  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditingValue('');
  }, []);

  const selectAll = useCallback(() => setSelectedIds(new Set(filteredItems.map(i => i.id))), [filteredItems]);
  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const handleApply = useCallback(() => {
    const selectedValues = items.filter(item => selectedIds.has(item.id)).map(item => item.value);
    onSave(selectedValues);
    // ✅ 2026-01-26: 저장 후 0.5초 뒤에 자동 닫기 (저장 완료 대기)
    setTimeout(() => {
      onClose();
    }, 500);
  }, [items, selectedIds, onSave, onClose]);

  // ✅ 2026-01-19: 선택 삭제 기능 수정 - 체크된 항목만 삭제
  const handleDeleteSelected = useCallback(() => {
    // 현재 체크된 항목들의 값
    const selectedValues = items.filter(item => selectedIds.has(item.id)).map(item => item.value);

    // 삭제 대상: 체크된 것 중 currentValues에 있는 것 (이미 저장된 것만 삭제 가능)
    const deletedValues = (currentValues || []).filter(v => selectedValues.includes(v));

    if (deletedValues.length === 0) {
      alert('삭제할 항목이 없습니다.\n\n💡 삭제하려면 항목을 체크한 후 삭제 버튼을 클릭하세요.');
      return;
    }

    if (!confirm(`${deletedValues.length}개 항목을 삭제하시겠습니까?\n\n삭제될 항목:\n${deletedValues.join('\n')}`)) return;

    if (onDelete) {
      onDelete(deletedValues);
    }
    // ★★★ 2026-02-05: 삭제 후 모달 닫기 ★★★
    setTimeout(() => {
      onClose();
    }, 300);
  }, [items, selectedIds, currentValues, onDelete, onClose]);

  const handleAddSave = useCallback(async () => {
    if (!newValue.trim()) return;
    const trimmedValue = newValue.trim();

    // 중복이면 무시
    if (items.some(i => i.value === trimmedValue)) {
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

    // ★★★ 2026-02-08: DB 저장은 기초정보 항목(isDbOnly)만 수행 ★★★
    // B1(작업요소)은 m4 필요 → 엑셀 Import에서만 DB 저장, A1/A2는 워크시트 구조 항목
    const _addIsL1 = itemCode === 'C2' || itemCode === 'C3' || itemCode === 'C4' || itemCode === 'FE2';
    const _addIsL2 = ['A3', 'A4', 'A5', 'A6', 'FM1'].includes(itemCode);
    const _addIsL3 = ['B2', 'B3', 'B4', 'B5', 'B6', 'FC1'].includes(itemCode);
    const _addIsDbOnly = _addIsL1 || _addIsL2 || _addIsL3;
    if (_addIsDbOnly) {
      try {
        const categoryCode = itemCode.startsWith('B') ? 'B' : itemCode.startsWith('A') ? 'A' : 'C';
        const dbCode = itemCode === 'FE2' ? 'C4' : itemCode.toUpperCase();
        const res = await fetch('/api/pfmea/master', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setActive: false,   // ★ 기존 활성 Dataset에 항목만 추가 (Dataset 전환/삭제 안 함)
            replace: false,     // ★ 기존 데이터 유지, 새 항목만 추가
            sourceFmeaId: fmeaId || '',
            flatData: [{
              processNo: processNo || '',
              category: categoryCode,
              itemCode: dbCode,
              value: trimmedValue,
            }]
          })
        });
        if (!res.ok) {
          console.error('[수동입력] DB 저장 실패:', await res.text());
        }
      } catch (e) {
        console.error('[수동입력] DB 저장 오류:', e);
      }
    }

    // ★★★ 2026-02-16: localStorage 저장 제거 (DB Only 정책) ★★★

    // ✅ 2026-01-16: 엔터 시 워크시트에 즉시 반영 (모달 유지)
    // 현재 선택된 항목들 + 새 항목을 워크시트에 전달
    const allSelectedValues = [...(currentValues || []).filter(v => v !== trimmedValue), trimmedValue];
    onSave(allSelectedValues);

    setNewValue('');
  }, [newValue, items, newCategory, itemCode, fmeaId, processNo, currentValues, onSave]);

  const handleDeleteSingle = useCallback((item: DataItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(item.id);
      return newSet;
    });
  }, []);

  const isCurrentlySelected = useCallback((value: string) => (currentValues || []).includes(value), [currentValues]);

  // ★★★ 검색창 Enter 처리 (검색값이 목록에 없으면 추가) ★★★
  const handleSearchEnter = useCallback((trimmed: string) => {
    const exists = items.some(i => i.value === trimmed);
    if (!exists) {
      // 새 항목 추가 (맨 위에)
      const newItem: DataItem = { id: `new_${Date.now()}`, value: trimmed, category: '추가' };
      setItems(prev => [newItem, ...prev]); // 맨 위에 추가
      setSelectedIds(prev => new Set([...prev, newItem.id]));
      // 필터를 초기화하여 추가된 항목이 보이게
      setCategoryFilter('All');
      // ★★★ 2026-02-08: isDbOnlyItem이면 DB 저장 (handleAddSave와 동일 패턴) ★★★
      const _isL1 = itemCode === 'C2' || itemCode === 'C3' || itemCode === 'C4' || itemCode === 'FE2';
      const _isL2 = ['A3', 'A4', 'A5', 'A6', 'FM1'].includes(itemCode);
      const _isL3 = ['B2', 'B3', 'B4', 'B5', 'B6', 'FC1'].includes(itemCode);
      const _isDbOnly = _isL1 || _isL2 || _isL3;
      if (_isDbOnly) {
        const catCode = itemCode.startsWith('B') ? 'B' : itemCode.startsWith('A') ? 'A' : 'C';
        const dbCode = itemCode === 'FE2' ? 'C4' : itemCode.toUpperCase();
        // ★ 2026-02-08: setActive: false → 기존 활성 Dataset에 항목만 추가
        fetch('/api/pfmea/master', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setActive: false, replace: false,
            sourceFmeaId: fmeaId || '',
            flatData: [{ processNo: processNo || '', category: catCode, itemCode: dbCode, value: trimmed }]
          })
        }).then(() => {})
          .catch(err => console.error('[검색입력] DB 저장 오류:', err));
      }
      // ★★★ 2026-02-16: localStorage 저장 제거 (DB Only 정책) ★★★
      // ✅ 2026-01-16: 엔터 시 워크시트에 즉시 반영 (모달 유지)
      const allSelectedValues = [...(currentValues || []).filter(v => v !== trimmed), trimmed];
      onSave(allSelectedValues);
      setSearch('');
    } else {
      // 이미 있으면 선택 후 워크시트에 반영
      const found = items.find(i => i.value === trimmed);
      if (found) {
        setSelectedIds(prev => new Set([...prev, found.id]));
        // ✅ 2026-01-16: 엔터 시 워크시트에 즉시 반영 (모달 유지)
        const allSelectedValues = [...(currentValues || []).filter(v => v !== trimmed), trimmed];
        onSave(allSelectedValues);
      }
      setSearch('');
    }
  }, [items, itemCode, fmeaId, processNo, currentValues, onSave]);

  return {
    // State
    items,
    selectedIds,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    newValue,
    setNewValue,
    newCategory,
    setNewCategory,
    editingId,
    editingValue,
    setEditingValue,

    // Computed
    itemInfo,
    hasBelongsToFilter,
    filteredItems,

    // Handlers
    toggleSelect,
    selectAll,
    deselectAll,
    handleDoubleClick,
    handleEditSave,
    handleEditCancel,
    handleApply,
    handleDeleteSelected,
    handleAddSave,
    handleDeleteSingle,
    isCurrentlySelected,
    handleSearchEnter,
  };
}
