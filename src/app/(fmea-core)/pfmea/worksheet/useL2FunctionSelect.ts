/**
 * 메인공정기능(A3) 선택 모달 — useL1FunctionSelect / 작업요소 패턴
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

export interface L2FunctionItem {
  id: string;
  name: string;
  processNo?: string;
}

export interface L2FunctionSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedItems: L2FunctionItem[]) => void;
  processNo: string;
  processName?: string;
  existingItems?: L2FunctionItem[];
  fmeaId?: string;
}

async function loadFromDB(
  processNo: string,
  fmeaId?: string
): Promise<{ items: L2FunctionItem[] }> {
  try {
    const params = new URLSearchParams();
    if (fmeaId) params.set('fmeaId', fmeaId);
    if (processNo.trim()) params.set('processNo', processNo.trim());
    const res = await fetch(`/api/fmea/l2-functions?${params.toString()}`);
    if (!res.ok) {
      console.error('[loadL2FunctionsFromDB] API 오류:', res.status);
      return { items: [] };
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.items)) {
      return { items: data.items };
    }
    return { items: [] };
  } catch (e) {
    console.error('[loadL2FunctionsFromDB]', e);
    return { items: [] };
  }
}

export function useL2FunctionSelect({
  isOpen,
  onClose,
  onSave,
  processNo,
  existingItems = [],
  fmeaId = '',
}: L2FunctionSelectModalProps) {
  const [elements, setElements] = useState<L2FunctionItem[]>([]);
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
      const { items: loaded } = await loadFromDB(processNo, fmeaId);
      if (canceled) return;

      const worksheetItems = existingItemsRef.current.filter((item: L2FunctionItem) => item.name?.trim());
      const worksheetNames = new Set(
        worksheetItems.map((item: L2FunctionItem) => item.name.trim().toLowerCase())
      );
      const seenNames = new Set<string>();
      const deduped: L2FunctionItem[] = [];

      for (const item of worksheetItems) {
        const key = item.name.trim().toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          deduped.push({ id: item.id, name: item.name, processNo });
        }
      }

      for (const item of loaded) {
        const key = item.name.trim().toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          deduped.push({ ...item, processNo });
        }
      }

      const worksheetItemIdsSet = new Set(
        deduped
          .filter((item: L2FunctionItem) => worksheetNames.has(item.name.trim().toLowerCase()))
          .map((item: L2FunctionItem) => item.id)
      );

      setElements(deduped);
      setSelectedIds(new Set());
      setWorksheetItemIds(worksheetItemIdsSet);
      setInputValue('');
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    init();
    return () => {
      canceled = true;
    };
  }, [isOpen, processNo, fmeaId]);

  const filteredElements = useMemo(() => {
    if (!inputValue.trim()) return elements;
    const q = inputValue.toLowerCase();
    return elements.filter((e: L2FunctionItem) => e.name.toLowerCase().includes(q));
  }, [elements, inputValue]);

  const exactMatch = useMemo(() => {
    if (!inputValue.trim()) return null;
    const q = inputValue.trim().toLowerCase();
    return elements.find((e: L2FunctionItem) => e.name.toLowerCase() === q) ?? null;
  }, [elements, inputValue]);

  const { appliedElements, notAppliedElements } = useMemo(() => {
    const applied: L2FunctionItem[] = [];
    const notApplied: L2FunctionItem[] = [];
    filteredElements.forEach((elem: L2FunctionItem) => {
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
    const existingApplied = elements.filter((e: L2FunctionItem) => worksheetItemIds.has(e.id));
    const newlySelected = filteredElements.filter(
      (e: L2FunctionItem) => selectedIds.has(e.id) && !worksheetItemIds.has(e.id)
    );
    const allApplied = [...existingApplied, ...newlySelected];
    const uniqueMap = new Map(allApplied.map((e: L2FunctionItem) => [e.id, e]));
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
    [
      inputValue,
      exactMatch,
      filteredElements,
      selectedIds,
    ]
  );

  const handleDelete = useCallback(() => {
    if (selectedIds.size === 0) {
      window.alert('삭제할 항목을 선택하세요.');
      return;
    }

    const toDelete = elements.filter(
      (e: L2FunctionItem) => selectedIds.has(e.id) && worksheetItemIds.has(e.id)
    );
    if (toDelete.length === 0) {
      window.alert('워크시트에 적용된 항목만 삭제할 수 있습니다.');
      return;
    }

    const deleteNames = toDelete.map((e: L2FunctionItem) => e.name).join(', ');
    if (
      !window.confirm(
        `선택된 ${toDelete.length}개 메인공정기능을 워크시트에서 제거하시겠습니까?\n\n❌ 제거: ${deleteNames}\n※ 선택창 목록에는 유지됩니다.`
      )
    ) {
      return;
    }

    const newWorksheetIds = new Set(worksheetItemIds);
    toDelete.forEach((e: L2FunctionItem) => newWorksheetIds.delete(e.id));
    setWorksheetItemIds(newWorksheetIds);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      toDelete.forEach((e: L2FunctionItem) => next.delete(e.id));
      return next;
    });

    const remaining = elements.filter((e: L2FunctionItem) => newWorksheetIds.has(e.id));
    onSave(remaining);
    // ★ 2026-03-29: onClose() 제거 — 삭제 후 모달 유지, 항목은 미적용으로 이동
  }, [elements, selectedIds, worksheetItemIds, onSave]);

  const handleRemoveFromList = useCallback(
    (id: string) => {
      const elem = elements.find((e: L2FunctionItem) => e.id === id);
      if (!elem) return;

      if (worksheetItemIds.has(id)) {
        window.alert('적용됨 항목은 삭제 버튼을 사용해주세요.');
        return;
      }

      if (
        !window.confirm(`"${elem.name}"을(를) 완전히 삭제하시겠습니까?\n\n※ 마스터 데이터에서도 삭제됩니다.`)
      ) {
        return;
      }

      setElements((prev) => prev.filter((e: L2FunctionItem) => e.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      fetch('/api/fmea/l2-functions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      }).catch((err) => console.error('[L2Function] DELETE', err));
    },
    [elements, worksheetItemIds]
  );

  // ★ 2026-03-29: +수동입력 바용 — 새 항목 추가 (마스터 DB + 워크시트 동시 저장)
  const addNewItem = useCallback((name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const duplicate = elements.find(
      (el: L2FunctionItem) => el.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      window.alert(`"${trimmed}"은(는) 이미 목록에 존재합니다.`);
      return false;
    }

    // DB에 저장 후 UI 업데이트
    fetch('/api/fmea/l2-functions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, processNo, name: trimmed }),
    })
      .then((res) => res.json())
      .then((data) => {
        const dbId = data.id || `new_${Date.now()}`;
        const newElem: L2FunctionItem = { id: dbId, name: trimmed, processNo };
        setElements((prev) => [newElem, ...prev]);
        setWorksheetItemIds((prev) => new Set([...prev, dbId]));
        const allApplied = [
          ...elements.filter((el: L2FunctionItem) => worksheetItemIds.has(el.id)),
          newElem,
        ];
        onSave(allApplied);
      })
      .catch((err) => console.error('[L2Function] POST', err));

    return true;
  }, [elements, worksheetItemIds, fmeaId, processNo, onSave]);

  const selectAppliedElements = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      appliedElements.forEach((e: L2FunctionItem) => next.add(e.id));
      return next;
    });
  }, [appliedElements]);

  const deselectAppliedElements = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      appliedElements.forEach((e: L2FunctionItem) => next.delete(e.id));
      return next;
    });
  }, [appliedElements]);

  const selectNotAppliedElements = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      notAppliedElements.forEach((e: L2FunctionItem) => next.add(e.id));
      return next;
    });
  }, [notAppliedElements]);

  const deselectNotAppliedElements = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      notAppliedElements.forEach((e: L2FunctionItem) => next.delete(e.id));
      return next;
    });
  }, [notAppliedElements]);

  const selectAll = useCallback(
    () => setSelectedIds(new Set(filteredElements.map((e: L2FunctionItem) => e.id))),
    [filteredElements]
  );
  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

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
    selectAll,
    deselectAll,
    getHintMessage,
    addNewItem,
  };
}
