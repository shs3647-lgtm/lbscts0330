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
  saveToHistory?: () => void;  // ★ Undo 히스토리 저장 함수
}

export function useWorksheetHandlers({
  state,
  setState,
  setSaveStatus,
  closeContextMenu,
  saveToHistory,
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
    saveToHistory?.();  // ★ Undo 히스토리 저장
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
  }, [state.items, state.cpNo, setState, saveToHistory]);

  // 행 위에 추가 - 열별 확장병합 로직 적용
  const handleInsertRowAbove = useCallback((rowIdx: number, type: ContextMenuType, colKey?: string) => {
    saveToHistory?.();  // ★ Undo 히스토리 저장
    if (rowIdx < 0 || rowIdx >= state.items.length) return;
    const currentItem = state.items[rowIdx];
    if (!currentItem) return;

    // ★★★ A, B열에서 위로 행 추가 시: 병합 그룹 맨 위에 새 행 추가 ★★★
    if (type === 'process' && (colKey === 'processNo' || colKey === 'processName')) {
      // A, B 병합 그룹의 맨 위 행 찾기
      const currentKey = `${currentItem.processNo}-${currentItem.processName}`;
      let groupStartIdx = rowIdx;
      for (let i = rowIdx - 1; i >= 0; i--) {
        const prevItem = state.items[i];
        const prevKey = `${prevItem.processNo}-${prevItem.processName}`;
        if (prevKey === currentKey) {
          groupStartIdx = i;
        } else {
          break;
        }
      }

      // 새 행은 고유값으로 병합 방지
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newItem = createEmptyItem(
        state.cpNo,
        uniqueId,  // A열: 고유값 (병합 방지)
        uniqueId   // B열: 고유값 (병합 방지)
      );

      const newItems = [...state.items];
      newItems.splice(groupStartIdx, 0, newItem);  // 병합 그룹 맨 위에 삽입
      const reorderedItems = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
      setState(prev => ({ ...prev, items: reorderedItems, dirty: true }));
      closeContextMenu();
      return;
    }

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

    // ★★★ E열(work)에서 위로 행 추가 시: C,D 병합 그룹의 맨 위에 새 행 추가 ★★★
    if (type === 'work') {
      const targetItem = state.items[rowIdx];

      // C, D 병합 그룹의 맨 위 행 찾기 (descKey 기준)
      const descKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}`;
      let groupStartIdx = rowIdx;
      for (let i = rowIdx - 1; i >= 0; i--) {
        const prevItem = state.items[i];
        const prevKey = `${prevItem.processNo}-${prevItem.processName}-${prevItem.processLevel}-${prevItem.processDesc}`;
        if (prevKey === descKey) {
          groupStartIdx = i;
        } else {
          break;
        }
      }

      const newItem = createEmptyItem(
        state.cpNo,
        targetItem.processNo,     // A열: 현재 행 값 (확장병합)
        targetItem.processName    // B열: 현재 행 값 (확장병합)
      );
      // C, D열: 현재 행 값 그대로 복사 → 확장병합됨 (빈값도 동일하게)
      newItem.processLevel = targetItem.processLevel ?? '';  // C열
      newItem.processDesc = targetItem.processDesc ?? '';    // D열
      // E열은 빈 값 (새 행)

      const newItems = [...state.items];
      newItems.splice(groupStartIdx, 0, newItem);  // 병합 그룹 맨 위에 삽입
      const reorderedItems = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
      setState(prev => ({ ...prev, items: reorderedItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // ★★★ F열(part)에서 위로 행 추가 시: A~E 확장병합, partName 빈값 ★★★
    if (type === 'part') {
      const targetItem = state.items[rowIdx];

      // partName 병합 그룹의 맨 위 행 찾기 (연속 같은 partName)
      const partName = targetItem.partName || '';
      let groupStartIdx = rowIdx;
      if (partName) {
        for (let i = rowIdx - 1; i >= 0; i--) {
          if ((state.items[i].partName || '') === partName) {
            groupStartIdx = i;
          } else {
            break;
          }
        }
      }

      const newItem = createEmptyItem(
        state.cpNo,
        targetItem.processNo,     // A열: 확장병합
        targetItem.processName    // B열: 확장병합
      );
      newItem.processLevel = targetItem.processLevel ?? '';  // C열: 확장병합
      newItem.processDesc = targetItem.processDesc ?? '';    // D열: 확장병합
      newItem.equipment = targetItem.equipment ?? '';        // E열: 확장병합
      // F열(partName)은 빈 값 (새 행)

      const newItems = [...state.items];
      newItems.splice(groupStartIdx, 0, newItem);
      const reordered = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
      setState(prev => ({ ...prev, items: reordered, dirty: true }));
      closeContextMenu();
      return;
    }

    // ★★★ I열(char)에서 위로 행 추가 시: E열 병합 그룹 맨 위에 새 행 추가 ★★★
    // A,B,C,D,E 모두 확장병합, I열은 빈값 (E열 행추가와 동일한 로직)
    if (type === 'char') {
      const targetItem = state.items[rowIdx];

      // E열(equipment) 병합 그룹의 맨 위 행 찾기 (workKey 기준)
      const workKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}-${targetItem.equipment}`;
      let groupStartIdx = rowIdx;
      for (let i = rowIdx - 1; i >= 0; i--) {
        const prevItem = state.items[i];
        const prevKey = `${prevItem.processNo}-${prevItem.processName}-${prevItem.processLevel}-${prevItem.processDesc}-${prevItem.equipment}`;
        if (prevKey === workKey) {
          groupStartIdx = i;
        } else {
          break;
        }
      }

      const newItem = createEmptyItem(
        state.cpNo,
        targetItem.processNo,     // A열: 확장병합
        targetItem.processName    // B열: 확장병합
      );
      newItem.processLevel = targetItem.processLevel ?? '';  // C열: 확장병합
      newItem.processDesc = targetItem.processDesc ?? '';    // D열: 확장병합
      newItem.equipment = targetItem.equipment ?? '';    // E열: 확장병합 (빈값도 동일하게)
      // I열은 빈 값 (새 행)

      const newItems = [...state.items];
      newItems.splice(groupStartIdx, 0, newItem);  // E열 병합 그룹 맨 위에 삽입
      const reorderedItems = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
      setState(prev => ({ ...prev, items: reorderedItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // D열에서 위로 행 추가 시: C,D 병합 그룹 맨 위에 새 행 추가
    const targetItem = state.items[rowIdx];

    // C, D 병합 그룹의 맨 위 행 찾기 (descKey 기준 - C,D 병합 유지)
    const descKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}`;
    let groupStartIdx = rowIdx;
    for (let i = rowIdx - 1; i >= 0; i--) {
      const prevItem = state.items[i];
      const prevKey = `${prevItem.processNo}-${prevItem.processName}-${prevItem.processLevel}-${prevItem.processDesc}`;
      if (prevKey === descKey) {
        groupStartIdx = i;
      } else {
        break;
      }
    }

    // A, B열: 현재 행 값 복사 (상위 확장병합)
    const newItem = createEmptyItem(
      state.cpNo,
      targetItem.processNo,  // A열: 현재 행 값 (상위 확장병합)
      targetItem.processName  // B열: 현재 행 값 (상위 확장병합)
    );
    // C, D열: 고유값으로 병합 방지 (새로운 공정설명이므로)
    const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    newItem.processLevel = uniqueId;  // C열: 고유값 (병합 방지)
    newItem.processDesc = uniqueId;   // D열: 고유값 (병합 방지)

    const newItems = [...state.items];
    newItems.splice(groupStartIdx, 0, newItem);  // C,D 병합 그룹 맨 위에 삽입
    const reorderedItems2 = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
    setState(prev => ({ ...prev, items: reorderedItems2, dirty: true }));
    closeContextMenu();
  }, [state.items, state.cpNo, setState, closeContextMenu, saveToHistory]);

  // 행 아래에 추가
  const handleInsertRowBelow = useCallback((rowIdx: number, type: ContextMenuType, colKey?: string) => {
    saveToHistory?.();  // ★ Undo 히스토리 저장
    const currentItem = state.items[rowIdx];

    // A, B열에서 아래로 행 추가 시: 병합 그룹의 맨 아래 행 아래에 새 행 추가
    if (type === 'process' && (colKey === 'processNo' || colKey === 'processName')) {
      // ★ 현재 행이 속한 A,B 병합 그룹의 맨 아래 행 찾기
      const currentKey = `${currentItem?.processNo}-${currentItem?.processName}`;
      let groupEndIdx = rowIdx;
      for (let i = rowIdx + 1; i < state.items.length; i++) {
        const nextItem = state.items[i];
        const nextKey = `${nextItem.processNo}-${nextItem.processName}`;
        if (nextKey === currentKey) {
          groupEndIdx = i;
        } else {
          break;
        }
      }

      // 새 행은 고유값으로 병합 방지
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newItem = createEmptyItem(
        state.cpNo,
        uniqueId,  // A열: 고유값 (병합 방지)
        uniqueId   // B열: 고유값 (병합 방지)
      );

      const newItems = [...state.items];
      newItems.splice(groupEndIdx + 1, 0, newItem);  // 병합 그룹 맨 아래 다음에 삽입
      const reorderedItems = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
      setState(prev => ({ ...prev, items: reorderedItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // D열(processDesc)에서 아래로 행 추가 시: C,D 병합 그룹 맨 아래에 새 행 추가
    if (type === 'process' && colKey === 'processDesc') {
      const targetItem = state.items[rowIdx];

      // C, D 병합 그룹의 맨 아래 행 찾기 (descKey 기준 - C,D 병합 유지)
      const descKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}`;
      let groupEndIdx = rowIdx;
      for (let i = rowIdx + 1; i < state.items.length; i++) {
        const nextItem = state.items[i];
        const nextKey = `${nextItem.processNo}-${nextItem.processName}-${nextItem.processLevel}-${nextItem.processDesc}`;
        if (nextKey === descKey) {
          groupEndIdx = i;
        } else {
          break;
        }
      }

      // A, B열: 현재 행 값 복사 (상위 확장병합)
      const newItem = createEmptyItem(
        state.cpNo,
        targetItem.processNo,      // A열: 현재 행 값 (상위 확장병합)
        targetItem.processName     // B열: 현재 행 값 (상위 확장병합)
      );
      // C, D열: 고유값으로 병합 방지 (새로운 공정설명이므로)
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newItem.processLevel = uniqueId;  // C열: 고유값 (병합 방지)
      newItem.processDesc = uniqueId;   // D열: 고유값 (병합 방지)
      // E~S열은 빈 값 (단순 행 추가)

      const newItems = [...state.items];
      newItems.splice(groupEndIdx + 1, 0, newItem);  // C,D 병합 그룹 맨 아래 다음에 삽입
      const reorderedItems = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
      setState(prev => ({ ...prev, items: reorderedItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // ★★★ 행추가 기능 정의 ★★★
    // - 행추가 발생하는 열: 병합 없이 빈 값으로 새 행 추가
    // - 형제 열들: 병합 없이 새 행 추가
    // - 하위 열들: 단순 행 추가 (빈 값)
    // - 상위 부모/할아버지만: 확장병합됨 (현재 행의 값 복사)

    // E열에서 아래로 행 추가 시:
    // - A, B, C, D (상위): 현재 행(rowIdx)의 값 복사 → C,D 병합 그룹 맨 아래에 추가 (확장병합)
    // - E (자신): 빈 값 → 병합 안 됨
    if (type === 'work') {
      const targetItem = state.items[rowIdx];

      // C, D 병합 그룹의 맨 아래 행 찾기 (descKey 기준)
      const descKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}`;
      let groupEndIdx = rowIdx;
      for (let i = rowIdx + 1; i < state.items.length; i++) {
        const nextItem = state.items[i];
        const nextKey = `${nextItem.processNo}-${nextItem.processName}-${nextItem.processLevel}-${nextItem.processDesc}`;
        if (nextKey === descKey) {
          groupEndIdx = i;
        } else {
          break;
        }
      }

      const newItem = createEmptyItem(
        state.cpNo,
        targetItem.processNo,      // A열: 현재 행 값 (확장병합)
        targetItem.processName     // B열: 현재 행 값 (확장병합)
      );
      // C, D열: 현재 행 값 그대로 복사 → 확장병합됨 (빈값도 동일하게)
      newItem.processLevel = targetItem.processLevel ?? '';  // C열
      newItem.processDesc = targetItem.processDesc ?? '';    // D열
      // E열은 빈 값 (새 행)

      const newItems = [...state.items];
      newItems.splice(groupEndIdx + 1, 0, newItem);  // C,D 병합 그룹 맨 아래 다음에 삽입
      const reorderedItems = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
      setState(prev => ({ ...prev, items: reorderedItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // ★★★ F열(part)에서 아래로 행 추가 시: A~E 확장병합, partName 빈값 ★★★
    if (type === 'part') {
      const targetItem = state.items[rowIdx];

      // partName 병합 그룹의 맨 아래 행 찾기 (연속 같은 partName)
      const partName = targetItem.partName || '';
      let groupEndIdx = rowIdx;
      if (partName) {
        for (let i = rowIdx + 1; i < state.items.length; i++) {
          if ((state.items[i].partName || '') === partName) {
            groupEndIdx = i;
          } else {
            break;
          }
        }
      }

      const newItem = createEmptyItem(
        state.cpNo,
        targetItem.processNo,      // A열: 확장병합
        targetItem.processName     // B열: 확장병합
      );
      newItem.processLevel = targetItem.processLevel ?? '';  // C열: 확장병합
      newItem.processDesc = targetItem.processDesc ?? '';    // D열: 확장병합
      newItem.equipment = targetItem.equipment ?? '';        // E열: 확장병합
      // F열(partName)은 빈 값 (새 행)

      const newItems = [...state.items];
      newItems.splice(groupEndIdx + 1, 0, newItem);
      const reordered = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
      setState(prev => ({ ...prev, items: reordered, dirty: true }));
      closeContextMenu();
      return;
    }

    // I열에서 아래로 행 추가 시:
    // - A, B, C, D, E (상위): 현재 행의 값 복사 → E열 병합 그룹 맨 아래에 추가 (확장병합)
    // - I (자신): 빈 값 → 병합 안 됨
    if (type === 'char') {
      const targetItem = state.items[rowIdx];

      // E열(equipment) 병합 그룹의 맨 아래 행 찾기 (workKey 기준)
      const workKey = `${targetItem.processNo}-${targetItem.processName}-${targetItem.processLevel}-${targetItem.processDesc}-${targetItem.equipment}`;
      let groupEndIdx = rowIdx;
      for (let i = rowIdx + 1; i < state.items.length; i++) {
        const nextItem = state.items[i];
        const nextKey = `${nextItem.processNo}-${nextItem.processName}-${nextItem.processLevel}-${nextItem.processDesc}-${nextItem.equipment}`;
        if (nextKey === workKey) {
          groupEndIdx = i;
        } else {
          break;
        }
      }

      const newItem = createEmptyItem(
        state.cpNo,
        targetItem.processNo,      // A열: 현재 행 값 (확장병합)
        targetItem.processName     // B열: 현재 행 값 (확장병합)
      );
      newItem.processLevel = targetItem.processLevel ?? '';  // C열: 확장병합
      newItem.processDesc = targetItem.processDesc ?? '';    // D열: 확장병합
      newItem.equipment = targetItem.equipment ?? '';    // E열: 확장병합 (빈값도 동일하게)
      // I열(productChar)은 빈 값 (병합 안 됨)

      const newItems = [...state.items];
      newItems.splice(groupEndIdx + 1, 0, newItem);  // E열 병합 그룹 맨 아래 다음에 삽입
      const reorderedItems = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
      setState(prev => ({ ...prev, items: reorderedItems, dirty: true }));
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
    const reorderedItems2 = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
    setState(prev => ({ ...prev, items: reorderedItems2, dirty: true }));
    closeContextMenu();
  }, [state.items, state.cpNo, setState, closeContextMenu, saveToHistory]);

  // 행 삭제
  const handleDeleteRow = useCallback((rowIdx: number) => {
    if (state.items.length <= 1) {
      alert('최소 1개의 행은 유지해야 합니다.');
      closeContextMenu();
      return;
    }
    saveToHistory?.();  // ★ Undo 히스토리 저장
    const filtered = state.items.filter((_, idx) => idx !== rowIdx);
    const reorderedItems = filtered.map((item, idx) => ({ ...item, sortOrder: idx }));
    setState(prev => ({ ...prev, items: reorderedItems, dirty: true }));
    closeContextMenu();
  }, [state.items, setState, closeContextMenu, saveToHistory]);

  // 저장
  const handleSave = useCallback(async () => {
    setSaveStatus('saving');

    try {
      let targetCpNo = state.cpNo;

      // ★★★ cpNo가 없으면 새 CP 자동 생성 ★★★
      if (!targetCpNo || targetCpNo === '__NEW__') {
        const year = new Date().getFullYear().toString().slice(-2);
        const newCpNo = `cp${year}-${Date.now().toString().slice(-6)}`;

        // 새 CP 생성 API 호출
        const createRes = await fetch('/api/control-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpNo: newCpNo,
            partName: state.partName || '',
            customer: state.customer || '',
            fmeaId: state.fmeaId || '',
          }),
        });

        if (!createRes.ok) {
          console.error('[CP 저장] CP 생성 실패');
          setSaveStatus('error');
          return;
        }

        const createData = await createRes.json();
        targetCpNo = createData.data?.cpNo || newCpNo;

        // state에 cpNo 업데이트
        setState(prev => ({ ...prev, cpNo: targetCpNo! }));
      }

      // Items 저장
      const res = await fetch(`/api/control-plan/${targetCpNo}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: state.items }),
      });

      if (res.ok) {
        setSaveStatus('saved');
        setState(prev => ({ ...prev, cpNo: targetCpNo!, dirty: false }));
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        console.error('[CP 저장] Items 저장 실패');
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      setSaveStatus('error');
    }
  }, [state.cpNo, state.items, state.partName, state.customer, state.fmeaId, setState, setSaveStatus]);

  return {
    handleCellChange,
    handleAddRow,
    handleInsertRowAbove,
    handleInsertRowBelow,
    handleDeleteRow,
    handleSave,
  };
}



