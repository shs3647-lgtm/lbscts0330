/**
 * @file useGenericItemSelect.ts
 * @description 구조분석 모달 패턴 제네릭 훅 — 모든 수동입력 모달이 동일 UI/UX로 동작
 * L2FunctionSelectModal(useL2FunctionSelect) 패턴 기반
 * @created 2026-03-29
 */
'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type KeyboardEvent,
} from 'react';

export interface GenericItem {
  id: string;
  name: string;
  processNo?: string;
  category?: string;
  parentId?: string;
}

export interface GenericItemSelectProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedItems: GenericItem[]) => void;
  /** 마스터 DB itemCode (B2, B3, C4, A5, B4 등) */
  itemCode: string;
  /** 공정번호 (L2/L3 레벨 필터링) */
  processNo?: string;
  /** 카테고리 (L1 레벨: YP/SP/USER) */
  category?: string;
  /** 워크시트에 이미 적용된 항목 */
  existingItems?: GenericItem[];
  fmeaId?: string;
  /** 추가 검색 파라미터 (workElement 등) */
  extraParams?: Record<string, string>;
}

/**
 * 통합 마스터 API 호출 — /api/fmea/master-items (모든 itemCode 지원)
 * resolveDataset: masterDatasetId → parentFmeaId → fmeaId → isActive fallback
 */
async function loadItemsFromMaster(
  itemCode: string,
  processNo?: string,
  category?: string,
  fmeaId?: string,
  extraParams?: Record<string, string>,
): Promise<GenericItem[]> {
  try {
    const params = new URLSearchParams();
    params.set('itemCode', itemCode);
    if (fmeaId) params.set('fmeaId', fmeaId);
    if (processNo?.trim()) params.set('processNo', processNo.trim());
    if (category?.trim()) params.set('category', category.trim());
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        if (v?.trim()) params.set(k, v.trim());
      }
    }

    const res = await fetch(`/api/fmea/master-items?${params.toString()}`);
    if (!res.ok) {
      console.error(`[loadItemsFromMaster] ${itemCode}: API 오류`, res.status);
      return [];
    }
    const data = await res.json();
    if (data.warning) {
      console.warn(`[GenericItemSelect] ${data.warning}`);
    }
    if (data.success && Array.isArray(data.items)) {
      return data.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        processNo: item.processNo,
        category: item.category,
      }));
    }
    return [];
  } catch (e) {
    console.error(`[loadItemsFromMaster] ${itemCode}:`, e);
    return [];
  }
}

export function useGenericItemSelect({
  isOpen,
  onClose,
  onSave,
  itemCode,
  processNo = '',
  category = '',
  existingItems = [],
  fmeaId = '',
  extraParams,
}: GenericItemSelectProps) {
  const [elements, setElements] = useState<GenericItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [worksheetItemIds, setWorksheetItemIds] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const existingItemsRef = useRef(existingItems);
  existingItemsRef.current = existingItems;

  useEffect(() => {
    if (!isOpen) return;
    let canceled = false;

    const init = async () => {
      const loaded = await loadItemsFromMaster(itemCode, processNo, category, fmeaId, extraParams);
      if (canceled) return;

      const worksheetItems = existingItemsRef.current.filter((item) => item.name?.trim());
      console.log(`[GenericItemSelect] ${itemCode} | DB: ${loaded.length}개 | 워크시트: ${worksheetItems.length}개`, worksheetItems.map(i => i.name));
      const worksheetNames = new Set(worksheetItems.map((item) => item.name.trim().toLowerCase()));
      const seenNames = new Set<string>();
      const deduped: GenericItem[] = [];

      // 워크시트 항목 우선
      for (const item of worksheetItems) {
        const key = item.name.trim().toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          deduped.push({ id: item.id, name: item.name, processNo, category });
        }
      }

      // 마스터 DB 항목 추가
      for (const item of loaded) {
        const key = item.name.trim().toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          deduped.push({ ...item, processNo });
        }
      }

      const worksheetItemIdsSet = new Set(
        deduped
          .filter((item) => worksheetNames.has(item.name.trim().toLowerCase()))
          .map((item) => item.id)
      );

      setElements(deduped);
      setSelectedIds(new Set());
      setWorksheetItemIds(worksheetItemIdsSet);
      setInputValue('');
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    init();
    return () => { canceled = true; };
  }, [isOpen, itemCode, processNo, category, fmeaId]);

  const filteredElements = useMemo(() => {
    if (!inputValue.trim()) return elements;
    const q = inputValue.toLowerCase();
    return elements.filter((e) => e.name.toLowerCase().includes(q));
  }, [elements, inputValue]);

  const exactMatch = useMemo(() => {
    if (!inputValue.trim()) return null;
    const q = inputValue.trim().toLowerCase();
    return elements.find((e) => e.name.toLowerCase() === q) ?? null;
  }, [elements, inputValue]);

  const { appliedElements, notAppliedElements } = useMemo(() => {
    const applied: GenericItem[] = [];
    const notApplied: GenericItem[] = [];
    filteredElements.forEach((elem) => {
      if (worksheetItemIds.has(elem.id)) applied.push(elem);
      else notApplied.push(elem);
    });
    return { appliedElements: applied, notAppliedElements: notApplied };
  }, [filteredElements, worksheetItemIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    const existingApplied = elements.filter((e) => worksheetItemIds.has(e.id));
    const newlySelected = filteredElements.filter(
      (e) => selectedIds.has(e.id) && !worksheetItemIds.has(e.id)
    );
    const allApplied = [...existingApplied, ...newlySelected];
    const uniqueMap = new Map(allApplied.map((e) => [e.id, e]));
    onSave(Array.from(uniqueMap.values()));
    onClose();
  }, [elements, filteredElements, selectedIds, worksheetItemIds, onSave, onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();

      const trimmed = inputValue.trim();
      if (!trimmed) return;

      if (exactMatch) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(exactMatch.id)) next.delete(exactMatch.id);
          else next.add(exactMatch.id);
          return next;
        });
        setInputValue('');
        return;
      }

      if (filteredElements.length === 1) {
        const target = filteredElements[0];
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(target.id)) next.delete(target.id);
          else next.add(target.id);
          return next;
        });
        setInputValue('');
        return;
      }

      // ★ 2026-03-29: 검색란은 검색/선택 전용 — 새 항목 추가는 "+수동입력" 란 사용 안내
      window.alert(`"${trimmed}"은(는) 목록에 없습니다.\n\n위 "+수동입력" 란에서 새 항목을 추가해주세요.`);
      setInputValue('');
    },
    [inputValue, exactMatch, filteredElements, elements, worksheetItemIds, itemCode, processNo, category, onSave]
  );

  // ★ 2026-03-29: 수동입력 바용 — 새 항목 추가 (handleKeyDown의 신규 항목 로직과 동일)
  const addNewItem = useCallback((name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const duplicate = elements.find(
      (el) => el.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      window.alert(`"${trimmed}"은(는) 이미 목록에 존재합니다.`);
      return false;
    }

    const newId = `new_${Date.now()}`;
    const newElem: GenericItem = { id: newId, name: trimmed, processNo, category };
    setElements((prev) => [newElem, ...prev]);
    setWorksheetItemIds((prev) => new Set([...prev, newId]));

    const allApplied = [
      ...elements.filter((el) => worksheetItemIds.has(el.id)),
      newElem,
    ];
    onSave(allApplied);

    fetch('/api/fmea/master-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemCode, processNo, category, name: trimmed, fmeaId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.id && data.id !== newId) {
          // DB에서 받은 실제 ID로 교체
          setElements(prev => prev.map(e => e.id === newId ? { ...e, id: data.id } : e));
          setWorksheetItemIds(prev => {
            const next = new Set(prev);
            next.delete(newId);
            next.add(data.id);
            return next;
          });
        }
      })
      .catch((err) => console.error(`[useGenericItemSelect] POST ${itemCode}:`, err));

    return true;
  }, [elements, worksheetItemIds, itemCode, processNo, category, fmeaId, onSave]);

  const handleDelete = useCallback(() => {
    if (selectedIds.size === 0) {
      window.alert('삭제할 항목을 선택하세요.');
      return;
    }
    const toDelete = elements.filter((e) => selectedIds.has(e.id) && worksheetItemIds.has(e.id));
    if (toDelete.length === 0) {
      window.alert('워크시트에 적용된 항목만 삭제할 수 있습니다.');
      return;
    }
    const deleteNames = toDelete.map((e) => e.name).join(', ');
    if (!window.confirm(`선택된 ${toDelete.length}개 항목을 워크시트에서 제거하시겠습니까?\n\n❌ 제거: ${deleteNames}\n※ 선택창 목록에는 유지됩니다.`)) {
      return;
    }
    const newWorksheetIds = new Set(worksheetItemIds);
    toDelete.forEach((e) => newWorksheetIds.delete(e.id));
    setWorksheetItemIds(newWorksheetIds);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      toDelete.forEach((e) => next.delete(e.id));
      return next;
    });
    const remaining = elements.filter((e) => newWorksheetIds.has(e.id));
    onSave(remaining);
    // ★ 2026-03-29: onClose() 제거 — 삭제 후 모달 유지, 항목은 미적용으로 이동
  }, [elements, selectedIds, worksheetItemIds, onSave]);

  const handleRemoveFromList = useCallback((id: string) => {
    const elem = elements.find((e) => e.id === id);
    if (!elem) return;
    if (worksheetItemIds.has(id)) {
      window.alert('적용됨 항목은 삭제 버튼을 사용해주세요.');
      return;
    }
    if (!window.confirm(`"${elem.name}"을(를) 완전히 삭제하시겠습니까?\n\n※ 마스터 데이터에서도 삭제됩니다.`)) {
      return;
    }
    setElements((prev) => prev.filter((e) => e.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });

    // 마스터 DB에서도 삭제
    fetch('/api/fmea/master-items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], itemCode }),
    }).catch(err => console.error(`[useGenericItemSelect] DELETE ${itemCode}:`, err));
  }, [elements, worksheetItemIds, itemCode]);

  const selectAppliedElements = useCallback(() => {
    setSelectedIds((prev) => { const next = new Set(prev); appliedElements.forEach((e) => next.add(e.id)); return next; });
  }, [appliedElements]);

  const deselectAppliedElements = useCallback(() => {
    setSelectedIds((prev) => { const next = new Set(prev); appliedElements.forEach((e) => next.delete(e.id)); return next; });
  }, [appliedElements]);

  const selectNotAppliedElements = useCallback(() => {
    setSelectedIds((prev) => { const next = new Set(prev); notAppliedElements.forEach((e) => next.add(e.id)); return next; });
  }, [notAppliedElements]);

  const deselectNotAppliedElements = useCallback(() => {
    setSelectedIds((prev) => { const next = new Set(prev); notAppliedElements.forEach((e) => next.delete(e.id)); return next; });
  }, [notAppliedElements]);

  const getHintMessage = useCallback(() => {
    if (!inputValue.trim()) return '검색어 입력 후 Enter로 선택';
    if (exactMatch) return `Enter → "${exactMatch.name}" 선택`;
    if (filteredElements.length === 1) return `Enter → "${filteredElements[0].name}" 선택`;
    if (filteredElements.length > 1) return `${filteredElements.length}개 검색됨 - 클릭하여 선택`;
    return `"${inputValue}" → +수동입력 란에서 추가`;
  }, [inputValue, exactMatch, filteredElements]);

  return {
    elements,
    selectedIds,
    worksheetItemIds,
    inputValue,
    setInputValue,
    inputRef,
    filteredElements,
    appliedElements,
    notAppliedElements,
    exactMatch,
    toggleSelect,
    handleApply,
    handleKeyDown,
    handleDelete,
    handleRemoveFromList,
    selectAppliedElements,
    deselectAppliedElements,
    selectNotAppliedElements,
    deselectNotAppliedElements,
    getHintMessage,
    addNewItem,
  };
}
