/**
 * @file useL1FunctionSelect.ts
 * @description 완제품기능(C2) / 요구사항(C3) 선택 모달 - 상태/로직 hook
 * 작업요소(useWorkElementSelect.ts) 패턴 벤치마킹
 * 
 * 주요 기능:
 * - 마스터 DB에서 C2/C3 로드
 * - 중복 체크 + 새 항목 추가
 * - 삭제 버튼: 워크시트에서만 삭제 (마스터 유지)
 * - X 버튼: 마스터 DB에서 완전 삭제 (미적용 항목만)
 * @created 2026-03-27
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

export interface L1FunctionItem {
  id: string;
  name: string;
  category: string; // YP, SP, USER
  parentId?: string; // C3의 경우 부모 C2 ID
}

export interface L1FunctionSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedItems: L1FunctionItem[]) => void;
  type: 'C2' | 'C3'; // C2=완제품기능, C3=요구사항
  category: string; // YP, SP, USER
  parentId?: string; // C3 선택 시 부모 C2 ID
  parentName?: string; // C3 선택 시 부모 C2 이름 (표시용)
  existingItems?: L1FunctionItem[]; // 워크시트에 이미 있는 항목
  fmeaId?: string;
}

// 마스터 DB에서 C2/C3 로드
const loadL1FunctionsFromDB = async (
  type: 'C2' | 'C3',
  category: string,
  fmeaId?: string,
  parentId?: string,
  parentName?: string // ★ C3 조회 시 부모 C2 이름 (ID 매칭용)
): Promise<{ items: L1FunctionItem[] }> => {
  try {
    const params = new URLSearchParams({ type, category });
    if (fmeaId) params.set('fmeaId', fmeaId);
    if (parentId) params.set('parentId', parentId);
    if (parentName) params.set('parentName', parentName); // ★ C2 이름으로 ID 매칭
    
    const res = await fetch(`/api/fmea/l1-functions?${params.toString()}`);
    if (!res.ok) {
      console.error('[loadL1FunctionsFromDB] API 오류:', res.status);
      return { items: [] };
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.items)) {
      return { items: data.items };
    }
    return { items: [] };
  } catch (e) {
    console.error('[loadL1FunctionsFromDB] 오류:', e);
    return { items: [] };
  }
};

export function useL1FunctionSelect({
  isOpen,
  onClose,
  onSave,
  type,
  category,
  parentId = '',
  parentName = '',
  existingItems = [],
  fmeaId = '',
}: L1FunctionSelectModalProps) {
  const [elements, setElements] = useState<L1FunctionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [worksheetItemIds, setWorksheetItemIds] = useState<Set<string>>(new Set());
  
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const existingItemsRef = useRef(existingItems);
  existingItemsRef.current = existingItems;

  // 모달 초기화
  useEffect(() => {
    if (!isOpen) return;
    let canceled = false;

    const initModal = async () => {
      console.log('[L1Function 모달 초기화] type:', type, 'category:', category, 'fmeaId:', fmeaId);

      // 1. DB에서 로드 (C3일 때 parentName도 전달)
      const { items: loaded } = await loadL1FunctionsFromDB(type, category, fmeaId, parentId, parentName);
      
      console.log('[L1Function 모달] 마스터 DB 로드:', loaded.length, '개 -', loaded.map(e => e.name).join(', '));
      
      if (canceled) return;

      // 2. 워크시트에 있는 항목 추출
      const worksheetItems = existingItemsRef.current.filter(item => item.name?.trim());
      const worksheetNames = new Set(worksheetItems.map(item => item.name.trim().toLowerCase()));
      const worksheetNameToId = new Map(worksheetItems.map(item => [item.name.trim().toLowerCase(), item.id]));
      console.log('[L1Function 모달] 워크시트 항목:', worksheetItems.length, '개 -', worksheetItems.map(e => e.name).join(', '));

      // 3. 마스터 DB 이름 기준 중복 제거 + 워크시트 ID 우선 사용
      const seenNames = new Set<string>();
      const deduped: L1FunctionItem[] = [];
      
      // 먼저 워크시트 항목 추가 (우선순위 높음)
      for (const item of worksheetItems) {
        const key = item.name.trim().toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          deduped.push({ id: item.id, name: item.name, category, parentId });
        }
      }
      
      // 마스터 DB에서 워크시트에 없는 항목만 추가
      for (const item of loaded) {
        const key = item.name.trim().toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          deduped.push(item);
        }
      }
      
      console.log('[L1Function 모달] 중복 제거 후:', deduped.length, '개');
      
      // worksheetItemIds는 워크시트에 있는 이름의 ID들
      const worksheetItemIds = new Set(
        deduped.filter(item => worksheetNames.has(item.name.trim().toLowerCase())).map(item => item.id)
      );
      
      setElements(deduped);
      setSelectedIds(new Set());
      setWorksheetItemIds(worksheetItemIds);
      setInputValue('');
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    initModal();
    return () => { canceled = true; };
  }, [isOpen, type, category, fmeaId, parentId, parentName]);

  // 필터링 (검색어 기반)
  const filteredElements = useMemo(() => {
    let result = elements;
    if (inputValue.trim()) {
      const q = inputValue.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q));
    }
    return result;
  }, [elements, inputValue]);

  // 정확히 일치하는 항목
  const exactMatch = useMemo(() => {
    if (!inputValue.trim()) return null;
    const q = inputValue.trim().toLowerCase();
    return elements.find(e => e.name.toLowerCase() === q);
  }, [elements, inputValue]);

  // 적용됨/미적용 분류
  const { appliedElements, notAppliedElements } = useMemo(() => {
    const applied: L1FunctionItem[] = [];
    const notApplied: L1FunctionItem[] = [];
    filteredElements.forEach(elem => {
      if (worksheetItemIds.has(elem.id)) applied.push(elem);
      else notApplied.push(elem);
    });
    return { appliedElements: applied, notAppliedElements: notApplied };
  }, [filteredElements, worksheetItemIds]);

  // 선택 토글
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  // 적용 버튼
  const handleApply = useCallback(() => {
    const existingApplied = elements.filter(e => worksheetItemIds.has(e.id));
    const newlySelected = filteredElements.filter(
      e => selectedIds.has(e.id) && !worksheetItemIds.has(e.id)
    );
    const allApplied = [...existingApplied, ...newlySelected];
    
    // 중복 제거 (ID 기준)
    const uniqueMap = new Map(allApplied.map(e => [e.id, e]));
    onSave(Array.from(uniqueMap.values()));
    onClose();
  }, [elements, filteredElements, selectedIds, worksheetItemIds, onSave, onClose]);

  // Enter 키 처리 (새 항목 추가)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();

    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // 1. 정확히 일치하는 항목이 있으면 선택/해제 토글
    if (exactMatch) {
      const wasSelected = selectedIds.has(exactMatch.id);
      const newSelectedIds = new Set(selectedIds);
      if (wasSelected) newSelectedIds.delete(exactMatch.id);
      else newSelectedIds.add(exactMatch.id);
      setSelectedIds(newSelectedIds);
      setInputValue('');
      return;
    }

    // 2. 검색 결과가 1개면 그것 선택
    if (filteredElements.length === 1) {
      const target = filteredElements[0];
      const wasSelected = selectedIds.has(target.id);
      const newSelectedIds = new Set(selectedIds);
      if (wasSelected) newSelectedIds.delete(target.id);
      else newSelectedIds.add(target.id);
      setSelectedIds(newSelectedIds);
      setInputValue('');
      return;
    }

    // 3. 새 항목 추가
    const cleanName = trimmed;
    
    // 중복 체크 (목록에 같은 이름 있으면 차단)
    const duplicateInList = elements.find(e => 
      e.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateInList) {
      alert(`"${cleanName}"은(는) 이미 목록에 존재합니다.`);
      setInputValue('');
      return;
    }

    setInputValue('');

    // DB에 저장 후 ID 받아서 사용
    console.log('[L1Function 추가] fmeaId:', fmeaId, 'type:', type, 'category:', category, 'name:', cleanName);
    fetch('/api/fmea/l1-functions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, type, category, name: cleanName, parentId }),
    })
      .then(res => res.json())
      .then(data => {
        console.log('[L1Function 추가] API 응답:', data);
        const dbId = data.id || `new_${Date.now()}`;
        const newElem: L1FunctionItem = { id: dbId, name: cleanName, category, parentId };
        
        setElements(prev => [newElem, ...prev]);
        setWorksheetItemIds(prev => new Set([...prev, dbId]));
        
        // 워크시트에 저장
        const allApplied = [...elements.filter(e => worksheetItemIds.has(e.id)), newElem];
        onSave(allApplied);
      })
      .catch(e => console.error('[L1Function] DB 저장 오류:', e));
  }, [inputValue, exactMatch, filteredElements, selectedIds, elements, worksheetItemIds, fmeaId, type, category, parentId, onSave]);

  // 삭제 버튼 (워크시트에서만 제거, 마스터 DB 유지)
  const handleDelete = useCallback(() => {
    if (selectedIds.size === 0) {
      alert('삭제할 항목을 선택하세요.');
      return;
    }

    // 적용됨 항목 중 선택된 것만 삭제 대상
    const toDelete = elements.filter(e => selectedIds.has(e.id) && worksheetItemIds.has(e.id));
    if (toDelete.length === 0) {
      alert('워크시트에 적용된 항목만 삭제할 수 있습니다.');
      return;
    }

    const deleteNames = toDelete.map(e => e.name).join(', ');
    const typeLabel = type === 'C2' ? '완제품기능' : '요구사항';
    if (!window.confirm(`선택된 ${toDelete.length}개 ${typeLabel}을(를) 워크시트에서 제거하시겠습니까?\n\n❌ 제거: ${deleteNames}\n※ 선택창 목록에는 유지됩니다.`)) return;

    // worksheetItemIds에서 제거 (목록에는 남음 → 미적용으로 이동)
    const newWorksheetIds = new Set(worksheetItemIds);
    toDelete.forEach(e => newWorksheetIds.delete(e.id));
    setWorksheetItemIds(newWorksheetIds);

    // 선택 해제
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      toDelete.forEach(e => newSet.delete(e.id));
      return newSet;
    });

    // 워크시트 저장 (남은 적용됨 항목만)
    const remaining = elements.filter(e => newWorksheetIds.has(e.id));
    onSave(remaining);
    onClose();
  }, [elements, selectedIds, worksheetItemIds, type, onSave, onClose]);

  // X 버튼 (마스터 DB에서 완전 삭제 - 미적용 항목만)
  const handleRemoveFromList = useCallback((id: string) => {
    const elem = elements.find(e => e.id === id);
    if (!elem) return;
    
    // 적용됨 항목은 X 버튼으로 삭제 불가
    if (worksheetItemIds.has(id)) {
      alert('적용됨 항목은 삭제 버튼을 사용해주세요.');
      return;
    }
    
    const typeLabel = type === 'C2' ? '완제품기능' : '요구사항';
    if (!window.confirm(`"${elem.name}"을(를) 완전히 삭제하시겠습니까?\n\n※ 마스터 데이터에서도 삭제됩니다.`)) return;
    
    // UI에서 즉시 제거
    setElements(prev => prev.filter(e => e.id !== id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    // 마스터 DB에서도 삭제
    fetch('/api/fmea/l1-functions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], type }),
    }).catch(e => console.error('[L1Function] DB 삭제 오류:', e));
  }, [elements, worksheetItemIds, type]);

  // 섹션별 선택/해제
  const selectAppliedElements = useCallback(() => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      appliedElements.forEach(e => newSet.add(e.id));
      return newSet;
    });
  }, [appliedElements]);

  const deselectAppliedElements = useCallback(() => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      appliedElements.forEach(e => newSet.delete(e.id));
      return newSet;
    });
  }, [appliedElements]);

  const selectNotAppliedElements = useCallback(() => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      notAppliedElements.forEach(e => newSet.add(e.id));
      return newSet;
    });
  }, [notAppliedElements]);

  const deselectNotAppliedElements = useCallback(() => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      notAppliedElements.forEach(e => newSet.delete(e.id));
      return newSet;
    });
  }, [notAppliedElements]);

  const selectAll = useCallback(() => setSelectedIds(new Set(filteredElements.map(e => e.id))), [filteredElements]);
  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  // 힌트 메시지
  const getHintMessage = useCallback(() => {
    if (!inputValue.trim()) return '검색 또는 새 항목 입력 후 Enter';
    if (exactMatch) return `Enter → "${exactMatch.name}" 선택`;
    if (filteredElements.length === 1) return `Enter → "${filteredElements[0].name}" 선택`;
    if (filteredElements.length > 1) return `${filteredElements.length}개 검색됨 - 클릭하여 선택`;
    return `Enter → "${inputValue}" 새로 추가`;
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
  };
}
