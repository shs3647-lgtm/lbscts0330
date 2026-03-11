/**
 * @file hooks/useWorksheetHandlers.ts
 * @description 워크시트 행 조작 핸들러 훅
 */

import { useCallback } from 'react';
import { CPItem, CPState, ContextMenuType, SaveStatus } from '../types';
import { createEmptyItem } from '../utils';

interface UseWorksheetHandlersProps {
  state: CPState;
  setState: React.Dispatch<React.SetStateAction<CPState>>;
  setSaveStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
  closeContextMenu: () => void;
}

export function useWorksheetHandlers({
  state,
  setState,
  setSaveStatus,
  closeContextMenu,
}: UseWorksheetHandlersProps) {
  
  // 셀 값 변경
  const handleCellChange = useCallback((itemId: string, key: string, value: any) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, [key]: value } : item
      ),
      dirty: true,
    }));
  }, [setState]);
  
  // 행 추가 (맨 아래)
  const handleAddRow = useCallback(() => {
    const lastItem = state.items[state.items.length - 1];
    const newItem = createEmptyItem(
      state.cpNo,
      lastItem?.processNo || '',
      lastItem?.processName || ''
    );
    newItem.sortOrder = state.items.length;
    setState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      dirty: true,
    }));
  }, [state.items, state.cpNo, setState]);
  
  // 행 위에 추가 - D열(공정설명)에서 행 추가 시 C~S열만 생성, A/B는 부모 상속(병합)
  const handleInsertRowAbove = useCallback((rowIdx: number, type: ContextMenuType) => {
    const currentItem = state.items[rowIdx];
    
    // 부모 행 찾기: 위쪽으로 올라가면서 processNo와 processName이 있는 행 찾기
    let parentProcessNo = '';
    let parentProcessName = '';
    for (let i = rowIdx; i >= 0; i--) {
      const item = state.items[i];
      if (item.processNo && item.processName && !item.processNo.startsWith('_') && !item.processName.startsWith('_')) {
        parentProcessNo = item.processNo;
        parentProcessName = item.processName;
        break;
      }
    }
    
    // D열에서 행 추가 시:
    // - A열(공정번호), B열(공정명): 부모 값으로 설정 (rowSpan 병합됨)
    // - C열(레벨)부터 S열까지: 기본값으로 초기화 (병합 없이 일반 셀로 생성)
    const newItem = createEmptyItem(
      state.cpNo,
      parentProcessNo,  // A열: 부모 값 (rowSpan 병합됨)
      parentProcessName  // B열: 부모 값 (rowSpan 병합됨)
    );
    
    // C~S열은 createEmptyItem에서 이미 기본값으로 초기화됨
    // (processLevel='', 나머지는 빈 값 또는 false)
    
    const newItems = [...state.items];
    newItems.splice(rowIdx, 0, newItem);
    // sortOrder 재정렬
    newItems.forEach((item, idx) => item.sortOrder = idx);
    setState(prev => ({ ...prev, items: newItems, dirty: true }));
    closeContextMenu();
  }, [state.items, state.cpNo, setState, closeContextMenu]);
  
  // 행 아래에 추가
  const handleInsertRowBelow = useCallback((rowIdx: number, type: ContextMenuType, colKey?: string) => {
    const currentItem = state.items[rowIdx];
    
    // A, B열에서 행 추가 시: 병합 없이 A~S열까지 새로운 행 추가
    if (type === 'process' && (colKey === 'processNo' || colKey === 'processName')) {
      // A, B열에서 행 추가 시 고유한 값으로 설정하여 병합 방지
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newItem = createEmptyItem(
        state.cpNo,
        uniqueId,  // A열: 고유값 (병합 방지)
        uniqueId   // B열: 고유값 (병합 방지)
      );
      // C~S열은 createEmptyItem에서 이미 기본값으로 초기화됨
      
      const newItems = [...state.items];
      newItems.splice(rowIdx + 1, 0, newItem);
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }
    
    // D열(processDesc)에서 행 추가 시: A, B열은 병합, C, D열은 고유값으로 병합 방지
    if (type === 'process' && colKey === 'processDesc') {
      // A, B열: 현재 행 값 복사 (상위 확장병합)
      const newItem = createEmptyItem(
        state.cpNo,
        currentItem?.processNo || '',      // A열: 현재 행 값 (상위 확장병합)
        currentItem?.processName || ''     // B열: 현재 행 값 (상위 확장병합)
      );
      // C, D열: 고유값으로 병합 방지 (트리거 열이므로)
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newItem.processLevel = uniqueId;  // C열: 고유값 (병합 방지)
      newItem.processDesc = uniqueId;   // D열: 고유값 (병합 방지)
      // E~S열은 빈 값 (단순 행 추가)
      
      const newItems = [...state.items];
      newItems.splice(rowIdx + 1, 0, newItem);
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }
    
    // ★★★ 행추가 기능 정의 ★★★
    // - 행추가 발생하는 열: 병합 없이 빈 값으로 새 행 추가
    // - 형제 열들: 병합 없이 새 행 추가
    // - 하위 열들: 단순 행 추가 (빈 값)
    // - 상위 부모/할아버지만: 확장병합됨 (현재 행의 값 복사)
    
    // E열에서 행 추가 시:
    // - A, B, C, D (상위): 현재 행의 값 복사 → 확장병합됨
    // - E (자신): 빈 값 → 병합 안 됨
    // - F~S (하위): 빈 값 → 단순 행 추가
    if (type === 'work') {
      const newItem = createEmptyItem(
        state.cpNo,
        currentItem?.processNo || '',      // A열: 현재 행 값 (상위 확장병합)
        currentItem?.processName || ''     // B열: 현재 행 값 (상위 확장병합)
      );
      newItem.processLevel = currentItem?.processLevel || '';  // C열: 현재 행 값 (상위 확장병합)
      newItem.processDesc = currentItem?.processDesc || '';    // D열: 현재 행 값 (상위 확장병합)
      // E열(workElement)은 빈 값 (병합 안 됨) - createEmptyItem에서 이미 빈 값
      // F~S열은 빈 값 (단순 행 추가) - createEmptyItem에서 이미 빈 값
      
      const newItems = [...state.items];
      newItems.splice(rowIdx + 1, 0, newItem);
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }
    
    // I열에서 행 추가 시:
    // - A, B, C, D, E (상위): 현재 행의 값 복사 → 확장병합됨
    // - I (자신): 빈 값 → 병합 안 됨
    // - J~S (하위): 빈 값 → 단순 행 추가
    if (type === 'char') {
      const newItem = createEmptyItem(
        state.cpNo,
        currentItem?.processNo || '',      // A열: 현재 행 값 (상위 확장병합)
        currentItem?.processName || ''     // B열: 현재 행 값 (상위 확장병합)
      );
      newItem.processLevel = currentItem?.processLevel || '';  // C열: 현재 행 값 (상위 확장병합)
      newItem.processDesc = currentItem?.processDesc || '';    // D열: 현재 행 값 (상위 확장병합)
      newItem.workElement = currentItem?.workElement || '';    // E열: 현재 행 값 (상위 확장병합)
      // I열(productChar)은 빈 값 (병합 안 됨) - createEmptyItem에서 이미 빈 값
      // J~S열은 빈 값 (단순 행 추가) - createEmptyItem에서 이미 빈 값
      
      const newItems = [...state.items];
      newItems.splice(rowIdx + 1, 0, newItem);
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }
    
    // 기타 열에서 행 추가 시 (기본 동작)
    const newItem = createEmptyItem(
      state.cpNo,
      currentItem?.processNo || '',
      currentItem?.processName || ''
    );
    
    const newItems = [...state.items];
    newItems.splice(rowIdx + 1, 0, newItem);
    // sortOrder 재정렬
    newItems.forEach((item, idx) => item.sortOrder = idx);
    setState(prev => ({ ...prev, items: newItems, dirty: true }));
    closeContextMenu();
  }, [state.items, state.cpNo, setState, closeContextMenu]);
  
  // 행 삭제
  const handleDeleteRow = useCallback((rowIdx: number) => {
    if (state.items.length <= 1) {
      alert('최소 1개의 행은 유지해야 합니다.');
      closeContextMenu();
      return;
    }
    const newItems = state.items.filter((_, idx) => idx !== rowIdx);
    // sortOrder 재정렬
    newItems.forEach((item, idx) => item.sortOrder = idx);
    setState(prev => ({ ...prev, items: newItems, dirty: true }));
    closeContextMenu();
  }, [state.items, setState, closeContextMenu]);
  
  // 저장
  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    
    try {
      const res = await fetch(`/api/control-plan/${state.cpNo}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: state.items }),
      });
      
      if (res.ok) {
        setSaveStatus('saved');
        setState(prev => ({ ...prev, dirty: false }));
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      setSaveStatus('error');
    }
  }, [state.cpNo, state.items, setState, setSaveStatus]);
  
  return {
    handleCellChange,
    handleAddRow,
    handleInsertRowAbove,
    handleInsertRowBelow,
    handleDeleteRow,
    handleSave,
  };
}



