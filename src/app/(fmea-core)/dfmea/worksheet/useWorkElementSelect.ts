/**
 * @file useWorkElementSelect.ts
 * @description 작업요소 선택 모달 - 상태/로직 hook
 * WorkElementSelectModal.tsx에서 분리 (910→550행 목표)
 *
 * ⚠️ CODE FREEZE 대상 로직 포함 (handleKeyDown, handleApply)
 * 로직 변경 없이 파일 분리만 수행
 */

// CODEFREEZE: DB Only 정책 적용 완료 (2026-02-16) - localStorage dfmea_master_data 폴백 제거
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { extractM4FromValue } from '@/lib/constants';

export interface WorkElement {
  id: string;
  m4: string;
  name: string;
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
}

// ★★★ 2026-02-05: MD, JG는 MC에 포함 (4M으로 통합) ★★★
export const M4_OPTIONS = [
  { id: 'MC', label: 'MC', bg: '#e3f2fd', text: '#1565c0' },
  { id: 'IM', label: 'IM', bg: '#fff3e0', text: '#e65100' },
  { id: 'MN', label: 'MN', bg: '#e8f5e9', text: '#2e7d32' },
  { id: 'EN', label: 'EN', bg: '#fce4ec', text: '#c2185b' },
];

// ★★★ 2026-02-02: 하드코딩 데이터 삭제 - DB 기반 데이터만 사용 ★★★
export const WORK_ELEMENTS_BY_PROCESS: Record<string, WorkElement[]> = {};

export function getMissingWorkElements(processNo: string, selectedNames: string[]): WorkElement[] {
  return [];
}

// ★★★ 2026-02-03: DB 기반 작업요소 로드 API 호출 ★★★
const loadWorkElementsFromDB = async (processNo: string): Promise<{ items: WorkElement[]; warnings: string[] }> => {
  try {
    const res = await fetch(`/api/fmea/work-elements?processNo=${encodeURIComponent(processNo)}`);
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
}: Pick<WorkElementSelectModalProps, 'isOpen' | 'onClose' | 'onSave' | 'processNo' | 'processName' | 'existingL3'>) {
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

  // ★★★ 모달 로딩 useEffect ★★★
  useEffect(() => {
    if (!isOpen) return;
    let canceled = false;

    const initModal = async () => {
      const currentExistingL3 = existingL3Ref.current;
      setCurrentProcessNo(processNo);

      let loaded: WorkElement[] = [];
      let warnings: string[] = [];
      if (processNo && processNo.trim() !== '') {
        const result = await loadWorkElementsFromDB(processNo);
        if (canceled) return;
        loaded = result.items;
        warnings = result.warnings;
      }
      setM4Warnings(warnings);

      const extractName = (fullName: string): string => {
        const trimmed = (fullName || '').trim();
        const match = trimmed.match(/^\d+\s+(.+)$/);
        return match ? match[1] : trimmed;
      };

      const loadedNames = new Set(loaded.map(e => extractName(e.name).toLowerCase()));
      const customItems = currentExistingL3.filter(item => {
        const name = item.name || '';
        if (name.includes('없음') || name.includes('삭제') || name.includes('추가') || name.includes('클릭')) return false;
        const extractedName = extractName(name).toLowerCase();
        return !loadedNames.has(extractedName);
      });

      const allElements = [...loaded, ...customItems];
      const seenNames = new Set<string>();
      const uniqueElements = allElements.filter(e => {
        const name = extractName(e.name).toLowerCase();
        if (seenNames.has(name)) return false;
        seenNames.add(name);
        return true;
      });

      if (canceled) return;
      setElements(uniqueElements);

      const existingNames = new Set(currentExistingL3
        .filter(item => {
          const name = item.name || '';
          return !name.includes('없음') && !name.includes('삭제') && !name.includes('추가') && !name.includes('클릭');
        })
        .map(item => extractName(item.name).toLowerCase())
      );

      const preSelected = new Set<string>();
      const worksheetIds = new Set<string>();

      if (currentExistingL3.length === 0) {
        uniqueElements.forEach(elem => {
          const isCommon = elem.processNo === '0' || elem.processNo === '00';
          if (!isCommon) {
            preSelected.add(elem.id);
            worksheetIds.add(elem.id);
          }
        });
      } else {
        uniqueElements.forEach(elem => {
          const extractedName = extractName(elem.name).toLowerCase();
          if (existingNames.has(extractedName)) {
            preSelected.add(elem.id);
            worksheetIds.add(elem.id);
          }
        });
      }

      setSelectedIds(preSelected);
      setWorksheetItemIds(worksheetIds);
      setInputValue('');
      setFilterM4('all');
      setSelectedM4('MC');
      setEditingId(null);

      setTimeout(() => inputRef.current?.focus(), 100);
    };

    initModal();
    return () => { canceled = true; };
  }, [isOpen, processNo]);

  // ✅ 필터링
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

  const missingProcessElements = useMemo(() => {
    const pe = WORK_ELEMENTS_BY_PROCESS[currentProcessNo] || [];
    return pe.filter(elem => elem.m4 !== 'MN' && !selectedIds.has(elem.id));
  }, [currentProcessNo, selectedIds]);

  const processRequiredIds = useMemo(() => {
    const pe = WORK_ELEMENTS_BY_PROCESS[currentProcessNo] || [];
    return new Set(pe.filter(e => e.m4 !== 'MN').map(e => e.id));
  }, [currentProcessNo]);

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

          const pNo = elem.processNo || '';
          const newDisplayName = pNo ? `${pNo} ${actualName}` : actualName;
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

  // ★★★ CODE FREEZE: handleApply 로직 (변경 금지) ★★★
  const handleApply = () => {
    const selected = elements.filter(e => selectedIds.has(e.id));
    onSave(selected);
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

      const updatedSelected = elements.filter(el => newSelectedIds.has(el.id));
      onSave(updatedSelected);
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

      const updatedSelected = elements.filter(el => newSelectedIds.has(el.id));
      onSave(updatedSelected);
      return;
    }

    // 3. 새 항목 추가
    const { m4: inputM4, name: cleanName } = extractM4FromValue(trimmed);
    if (!cleanName) return;
    const finalM4 = inputM4 || selectedM4;

    const newElem: WorkElement = {
      id: `new_${Date.now()}`,
      m4: finalM4,
      name: currentProcessNo ? `${currentProcessNo} ${cleanName}` : cleanName,
      processNo: currentProcessNo,
    };

    const newElements = [newElem, ...elements];
    const newSelectedIds = new Set([...selectedIds, newElem.id]);

    setElements(newElements);
    setSelectedIds(newSelectedIds);
    setFilterM4('all');
    setInputValue('');

    // ★★★ 2026-02-16: localStorage 저장 제거 (DB Only 정책) ★★★

    const updatedSelected = newElements.filter(el => newSelectedIds.has(el.id));
    onSave(updatedSelected);
  };

  // ★★★ 2026-02-16: 삭제 = 워크시트에서만 제거 (마스터 DB 유지) ★★★
  const handleDelete = useCallback(() => {
    if (selectedIds.size === 0) {
      alert('삭제할 항목을 선택하세요.');
      return;
    }

    const selectedElements = elements.filter(e => selectedIds.has(e.id));
    const remaining = elements.filter(e => worksheetItemIds.has(e.id) && !selectedIds.has(e.id));
    const deleteNames = selectedElements.map(e => e.name.replace(/^\d+\s+/, '')).join(', ');

    if (!window.confirm(`선택된 ${selectedElements.length}개 작업요소를 워크시트에서 제거하시겠습니까?\n\n❌ 제거: ${deleteNames}\n※ 마스터 기초정보는 유지됩니다.`)) return;

    onSave(remaining);
    setSelectedIds(new Set());
    onClose();
  }, [elements, selectedIds, worksheetItemIds, onSave, onClose]);

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

  return {
    elements, selectedIds, currentProcessNo,
    m4Warnings, editingId, editValue, setEditValue,
    inputValue, setInputValue, selectedM4, setSelectedM4,
    filterM4, setFilterM4, inputRef,
    filteredElements, commonMNElements, processElements,
    missingProcessElements, processRequiredIds, exactMatch,
    toggleSelect, handleEditDoubleClick, handleEditSave,
    selectProcessElements, deselectProcessElements,
    selectCommonElements, deselectCommonElements,
    selectAll, deselectAll,
    handleApply, handleKeyDown, handleDelete,
    getHintMessage, setEmptyM4ToMC, setEditingId,
  };
}
