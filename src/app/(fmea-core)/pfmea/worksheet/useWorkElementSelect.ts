/**
 * @file useWorkElementSelect.ts
 * @description 작업요소 선택 모달 - 상태/로직 hook
 * WorkElementSelectModal.tsx에서 분리 (910→550행 목표)
 *
 * ⚠️ CODE FREEZE 대상 로직 포함 (handleKeyDown, handleApply)
 * 로직 변경 없이 파일 분리만 수행
 */

// CODEFREEZE: DB Only 정책 적용 완료 (2026-02-16) - localStorage pfmea_master_data 폴백 제거
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { extractM4FromValue } from '@/lib/constants';

export interface WorkElement {
  id: string;
  m4: string;
  name: string;
  rawName?: string;  // 공정번호 제외한 순수 이름
  processNo?: string;
}

export interface WorkElementSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedElements: WorkElement[]) => void;
  onDelete?: (deletedNames: string[]) => void;
  processNo?: string;
  processName?: string;
  existingElements?: string[];
  existingL3?: WorkElement[];
  onContinuousAdd?: (element: WorkElement, addNewRow: boolean) => void;
  fmeaId?: string;  // ★★★ 2026-03-27: fmeaId 추가 — 해당 FMEA의 데이터셋에서 조회 ★★★
}

// ★★★ 2026-02-05: MD, JG는 MC에 포함 (4M으로 통합) ★★★
export const M4_OPTIONS = [
  { id: 'MC', label: 'MC', bg: '#e3f2fd', text: '#1565c0' },
  { id: 'IM', label: 'IM', bg: '#fff3e0', text: '#e65100' },
  { id: 'MN', label: 'MN', bg: '#e8f5e9', text: '#2e7d32' },
  { id: 'EN', label: 'EN', bg: '#fce4ec', text: '#c2185b' },
];

// ★★★ 2026-02-02: 하드코딩 데이터 삭제 - DB 기반 데이터만 사용 ★★★
// getMissingWorkElements: StructureTab.tsx(CODEFREEZE)에서 import 중이므로 export 유지
export function getMissingWorkElements(processNo: string, selectedNames: string[]): WorkElement[] {
  return [];
}

// ★★★ 2026-02-03: DB 기반 작업요소 로드 API 호출 ★★★
// ★★★ 2026-03-27: fmeaId 파라미터 추가 — 해당 FMEA의 데이터셋에서 조회 ★★★
const loadWorkElementsFromDB = async (processNo: string, fmeaId?: string): Promise<{ items: WorkElement[]; warnings: string[] }> => {
  try {
    const params = new URLSearchParams({ processNo });
    if (fmeaId) params.set('fmeaId', fmeaId);
    const res = await fetch(`/api/fmea/work-elements?${params.toString()}`);
    if (!res.ok) {
      console.error('[loadWorkElementsFromDB] API 오류:', res.status);
      return { items: [], warnings: [] };
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.workElements)) {
      return { items: data.workElements, warnings: data.warnings || [] };
    }
    return { items: [], warnings: [] };
  } catch (e) {
    console.error('[loadWorkElementsFromDB] 오류:', e);
    return { items: [], warnings: [] };
  }
};

export function getM4Style(m4: string) {
  const opt = M4_OPTIONS.find(o => o.id === m4);
  return opt ? { background: opt.bg, color: opt.text } : {};
}

export function useWorkElementSelect({
  isOpen,
  onClose,
  onSave,
  processNo = '',
  processName = '',
  existingL3 = [],
  fmeaId = '',  // ★★★ 2026-03-27: fmeaId 추가 — 해당 FMEA의 데이터셋에서 조회 ★★★
}: Pick<WorkElementSelectModalProps, 'isOpen' | 'onClose' | 'onSave' | 'processNo' | 'processName' | 'existingL3'> & { fmeaId?: string }) {
  const [elements, setElements] = useState<WorkElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentProcessNo, setCurrentProcessNo] = useState(processNo);
  const [worksheetItemIds, setWorksheetItemIds] = useState<Set<string>>(new Set());
  const [m4Warnings, setM4Warnings] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const existingL3Ref = useRef(existingL3);
  existingL3Ref.current = existingL3;

  const [inputValue, setInputValue] = useState('');
  const [selectedM4, setSelectedM4] = useState('MC');
  const [filterM4, setFilterM4] = useState('all');
  const inputRef = useRef<HTMLInputElement>(null);

  // ★★★ 2026-03-27: 모달 로딩 — 단순화 (ID 기반만) ★★★
  useEffect(() => {
    if (!isOpen) return;
    let canceled = false;

    const initModal = async () => {
      setCurrentProcessNo(processNo);
      console.log('[모달 초기화] processNo:', processNo, 'fmeaId:', fmeaId);

      // 1. DB에서 작업요소 로드 (SSoT) — fmeaId 전달
      const { items: loaded, warnings } = processNo?.trim()
        ? await loadWorkElementsFromDB(processNo, fmeaId)
        : { items: [], warnings: [] };
      
      console.log('[모달] 마스터 DB 로드:', loaded.length, '개 -', loaded.map(e => e.name).join(', '));
      
      if (canceled) return;
      setM4Warnings(warnings);
      // 2. 워크시트에 있는 항목 추출 (더블클릭 입력 포함)
      const worksheetItems = existingL3Ref.current
        .filter(item => item.name?.trim() && !item.name.includes('없음'));
      const existingIds = new Set(worksheetItems.map(item => item.id));
      console.log('[모달] 워크시트 항목:', worksheetItems.length, '개 -', worksheetItems.map(e => e.name).join(', '));

      // 3. 마스터 DB에 없는 워크시트 항목도 elements에 추가 (더블클릭 입력 등)
      const loadedIds = new Set(loaded.map(e => e.id));
      const worksheetOnlyItems: WorkElement[] = worksheetItems
        .filter(item => !loadedIds.has(item.id))
        .map(item => ({
          id: item.id,
          name: item.name,
          m4: item.m4 || '',
          processNo: processNo || '',
        }));
      console.log('[모달] 워크시트만 있는 항목:', worksheetOnlyItems.length, '개');
      
      setElements([...loaded, ...worksheetOnlyItems]);

      // 4. 워크시트에 있는 ID = 적용됨 (마스터 DB 유무와 무관)
      setSelectedIds(new Set());
      setWorksheetItemIds(existingIds);
      setInputValue('');
      setFilterM4('all');
      setSelectedM4('MC');
      setEditingId(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    initModal();
    return () => { canceled = true; };
  }, [isOpen, processNo]);

  // ✅ 필터링만 (정렬 없음 — 로드/목록 순서 유지, 공정 선택 모달과 동일)
  const filteredElements = useMemo(() => {
    let result = elements;
    if (filterM4 !== 'all') result = result.filter(e => e.m4 === filterM4);
    if (inputValue.trim()) {
      const q = inputValue.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q));
    }
    return result;
  }, [elements, filterM4, inputValue]);

  // ★★★ 공통/공정 분류 ★★★
  const { commonMNElements, processElements } = useMemo(() => {
    const common: WorkElement[] = [];
    const process: WorkElement[] = [];
    filteredElements.forEach(elem => {
      if (elem.processNo === '0' || elem.processNo === '00') common.push(elem);
      else process.push(elem);
    });
    return { commonMNElements: common, processElements: process };
  }, [filteredElements]);

  const exactMatch = useMemo(() => {
    if (!inputValue.trim()) return null;
    return elements.find(e => e.name.toLowerCase() === inputValue.toLowerCase());
  }, [elements, inputValue]);

  // 선택 토글
  const toggleSelect = useCallback((id: string) => {
    if (editingId) return;
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, [editingId]);

  // ★ 더블클릭 편집
  const handleEditDoubleClick = useCallback((elem: WorkElement, e: React.MouseEvent) => {
    e.stopPropagation();
    const rawName = elem.name.replace(/^\d+\s+/, '');
    setEditingId(elem.id);
    setEditValue(rawName);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (editingId && editValue.trim()) {
      const elem = elements.find(e => e.id === editingId);
      if (elem) {
        const rawOldName = elem.name.replace(/^\d+\s+/, '');
        if (editValue.trim() !== rawOldName) {
          const { m4: extractedM4, name: actualName } = extractM4FromValue(editValue.trim());
          if (!actualName) { setEditingId(null); return; }

          const newDisplayName = actualName;
          setElements(prev => prev.map(e =>
            e.id === editingId ? { ...e, name: newDisplayName, ...(extractedM4 ? { m4: extractedM4 } : {}) } : e
          ));

          try {
            const res = await fetch('/api/fmea/work-elements', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ updates: [{ id: elem.id, name: actualName, ...(extractedM4 ? { m4: extractedM4 } : {}) }] }),
            });
            const data = await res.json();
            if (data.success) {
            } else {
              console.error('작업요소명 저장 실패:', data.error);
            }
          } catch (e) {
            console.error('작업요소명 DB 저장 오류:', e);
          }

          setTimeout(() => {
            const updatedElements = elements.map(el =>
              el.id === editingId ? { ...el, name: newDisplayName } : el
            );
            const selected = updatedElements.filter(el => selectedIds.has(el.id));
            if (selected.length > 0) onSave(selected);
          }, 100);
        }
      }
    }
    setEditingId(null);
  }, [editingId, editValue, elements, selectedIds, onSave]);

  // ★★★ 공정별 전체 선택/해제 ★★★
  const selectProcessElements = useCallback(() => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      processElements.forEach(e => newSet.add(e.id));
      return newSet;
    });
  }, [processElements]);

  const deselectProcessElements = useCallback(() => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      processElements.forEach(e => newSet.delete(e.id));
      return newSet;
    });
  }, [processElements]);

  const selectCommonElements = useCallback(() => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      commonMNElements.forEach(e => newSet.add(e.id));
      return newSet;
    });
  }, [commonMNElements]);

  const deselectCommonElements = useCallback(() => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      commonMNElements.forEach(e => newSet.delete(e.id));
      return newSet;
    });
  }, [commonMNElements]);

  const selectAll = () => setSelectedIds(new Set(filteredElements.map(e => e.id)));
  const deselectAll = () => setSelectedIds(new Set());

  // ★★★ 2026-03-27: handleApply — 기존 적용됨 + 새로 선택된 항목 합치기 ★★★
  const handleApply = () => {
    // 기존 적용됨 = elements 순서 / 새 선택 = 화면(filteredElements) 순서
    const existingApplied = elements.filter(e => worksheetItemIds.has(e.id));
    const newlySelected = filteredElements.filter(
      e => selectedIds.has(e.id) && !worksheetItemIds.has(e.id)
    );
    const allApplied = [...existingApplied, ...newlySelected];
    
    // 중복 제거 (ID 기준)
    const uniqueMap = new Map(allApplied.map(e => [e.id, e]));
    onSave(Array.from(uniqueMap.values()));
    onClose();
  };

  // ★★★ CODE FREEZE: handleKeyDown 로직 (변경 금지) ★★★
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();

    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // 1. 정확히 일치하는 항목이 있으면 → 선택/해제 토글
    if (exactMatch) {
      const wasSelected = selectedIds.has(exactMatch.id);
      const newSelectedIds = new Set(selectedIds);
      if (wasSelected) newSelectedIds.delete(exactMatch.id);
      else newSelectedIds.add(exactMatch.id);
      setSelectedIds(newSelectedIds);
      setInputValue('');
      // ★★★ 2026-03-27: onSave 호출 제거 — "적용" 버튼 클릭 시에만 저장 ★★★
      return;
    }

    // 2. 검색 결과가 1개면 → 그것 선택
    if (filteredElements.length === 1) {
      const target = filteredElements[0];
      const wasSelected = selectedIds.has(target.id);
      const newSelectedIds = new Set(selectedIds);
      if (wasSelected) newSelectedIds.delete(target.id);
      else newSelectedIds.add(target.id);
      setSelectedIds(newSelectedIds);
      setInputValue('');
      // ★★★ 2026-03-27: onSave 호출 제거 — "적용" 버튼 클릭 시에만 저장 ★★★
      return;
    }

    // 3. 새 항목 추가 → DB 저장 → 워크시트 저장
    const { m4: inputM4, name: cleanName } = extractM4FromValue(trimmed);
    if (!cleanName) return;
    
    // ★★★ 2026-03-27: 이미 목록에 같은 이름 있으면 생성 차단 ★★★
    const duplicateInList = elements.find(e => 
      e.name.replace(/^\d+\s+/, '').toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateInList) {
      alert(`"${cleanName}"은(는) 이미 목록에 존재합니다.`);
      setInputValue('');
      return;
    }
    
    const finalM4 = inputM4 || selectedM4;
    const displayName = currentProcessNo ? `${currentProcessNo} ${cleanName}` : cleanName;

    setInputValue('');
    setFilterM4('all');

    // DB에 저장 후 ID 받아서 사용
    console.log('[작업요소 추가] fmeaId:', fmeaId, 'processNo:', currentProcessNo, 'name:', cleanName);
    fetch('/api/fmea/work-elements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, processNo: currentProcessNo, name: cleanName, m4: finalM4 }),
    })
      .then(res => res.json())
      .then(data => {
        console.log('[작업요소 추가] API 응답:', data);
        const dbId = data.id || `new_${Date.now()}`;
        const newElem: WorkElement = { id: dbId, m4: finalM4, name: displayName, processNo: currentProcessNo };
        
        setElements(prev => [newElem, ...prev]);
        setWorksheetItemIds(prev => new Set([...prev, dbId]));
        
        // 워크시트에 저장
        const allApplied = [...elements.filter(e => worksheetItemIds.has(e.id)), newElem];
        onSave(allApplied);
      })
      .catch(e => console.error('[작업요소] DB 저장 오류:', e));
  };

  // ★★★ 2026-03-27: 삭제 = 워크시트에서만 제거, 선택창 목록에는 남음 (미적용으로 이동) ★★★
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

    const deleteNames = toDelete.map(e => e.name.replace(/^\d+\s+/, '')).join(', ');
    if (!window.confirm(`선택된 ${toDelete.length}개 작업요소를 워크시트에서 제거하시겠습니까?\n\n❌ 제거: ${deleteNames}\n※ 선택창 목록에는 유지됩니다.`)) return;

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
  }, [elements, selectedIds, worksheetItemIds, onSave, onClose]);

  // ★★★ 2026-03-27: 목록에서 완전 삭제 (미적용 항목 X 버튼) — 마스터 DB에서도 삭제 ★★★
  const handleRemoveFromList = useCallback((id: string) => {
    const elem = elements.find(e => e.id === id);
    if (!elem) return;
    
    // 적용됨 항목은 X 버튼으로 삭제 불가 (삭제 버튼 사용)
    if (worksheetItemIds.has(id)) {
      alert('적용됨 항목은 삭제 버튼을 사용해주세요.');
      return;
    }
    
    if (!window.confirm(`"${elem.name.replace(/^\d+\s+/, '')}"을(를) 완전히 삭제하시겠습니까?\n\n※ 마스터 데이터에서도 삭제됩니다.`)) return;
    
    // UI에서 즉시 제거
    setElements(prev => prev.filter(e => e.id !== id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    // 마스터 DB에서도 삭제
    fetch('/api/fmea/work-elements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    }).catch(e => console.error('[작업요소] DB 삭제 오류:', e));
  }, [elements, worksheetItemIds]);

  // 힌트 메시지
  const getHintMessage = () => {
    if (!inputValue.trim()) return '검색 또는 새 항목 입력 후 Enter';
    if (exactMatch) return `Enter → "${exactMatch.name}" 선택`;
    if (filteredElements.length === 1) return `Enter → "${filteredElements[0].name}" 선택`;
    if (filteredElements.length > 1) return `${filteredElements.length}개 검색됨 - 클릭하여 선택`;
    return `Enter → "${inputValue}" 새로 추가`;
  };

  // 4M 빈값 일괄 MC 분류
  const setEmptyM4ToMC = useCallback(() => {
    setElements(prev => prev.map(e => !e.m4 ? { ...e, m4: 'MC' } : e));
    setM4Warnings([]);
  }, []);

  // ★★★ 2026-03-27: 적용됨/미적용 분류 ★★★
  const { appliedElements, notAppliedElements } = useMemo(() => {
    const applied: WorkElement[] = [];
    const notApplied: WorkElement[] = [];
    processElements.forEach(elem => {
      if (worksheetItemIds.has(elem.id)) applied.push(elem);
      else notApplied.push(elem);
    });
    return { appliedElements: applied, notAppliedElements: notApplied };
  }, [processElements, worksheetItemIds]);

  // ★★★ 2026-03-27: 적용됨/미적용 섹션별 선택/해제 ★★★
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

  return {
    elements, selectedIds, currentProcessNo, worksheetItemIds,
    m4Warnings, editingId, editValue, setEditValue,
    inputValue, setInputValue, selectedM4, setSelectedM4,
    filterM4, setFilterM4, inputRef,
    filteredElements, commonMNElements, processElements,
    appliedElements, notAppliedElements,
    exactMatch,
    toggleSelect, handleEditDoubleClick, handleEditSave,
    selectProcessElements, deselectProcessElements,
    selectCommonElements, deselectCommonElements,
    selectAppliedElements, deselectAppliedElements,
    selectNotAppliedElements, deselectNotAppliedElements,
    selectAll, deselectAll,
    handleApply, handleKeyDown, handleDelete, handleRemoveFromList,
    getHintMessage, setEmptyM4ToMC, setEditingId,
  };
}
