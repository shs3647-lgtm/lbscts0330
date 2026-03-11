/**
 * @file hooks/useWorksheetHandlers.ts
 * @description PFD 워크시트 행 조작 핸들러 훅 (CP와 동일한 병합 로직)
 * @updated 2026-01-25
 */

import { useCallback } from 'react';
import { PfdItem, PfdState, ContextMenuType, SaveStatus } from '../types';
import { createEmptyItem } from '../utils';

interface ExtensionMergeSettings {
  all: boolean;
  D: boolean;
  E: boolean;
  F: boolean;
  H: boolean;
}

interface UseWorksheetHandlersProps {
  state: PfdState;
  setState: React.Dispatch<React.SetStateAction<PfdState>>;
  setSaveStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
  closeContextMenu: () => void;
  saveToHistory?: () => void;
  extensionMerge?: ExtensionMergeSettings;  // ★ 확장병합 설정
}

export function useWorksheetHandlers({
  state,
  setState,
  setSaveStatus,
  closeContextMenu,
  saveToHistory,
  extensionMerge = { all: true, D: true, E: true, F: true, H: true },  // 기본값: 모두 활성화
}: UseWorksheetHandlersProps) {

  // ★★★ 셀 값 변경 - 병합 셀 보호 (병합 그룹 내 동기화) ★★★
  const handleCellChange = useCallback((itemId: string, key: string, value: any) => {
    // 병합 대상 컬럼 (A~F열)
    const mergedColumns = ['processNo', 'processName', 'processLevel', 'processDesc', 'workElement', 'equipment'];

    if (mergedColumns.includes(key)) {
      // 병합된 셀 값 변경 시 같은 병합 그룹 내 모든 셀 동기화
      setState(prev => {
        const targetItem = prev.items.find(item => item.id === itemId);
        if (!targetItem) return prev;

        // 병합 그룹 키 생성 (변경 대상 컬럼까지만 포함)
        const getGroupKey = (item: PfdItem, columnKey: string) => {
          const cols = mergedColumns.slice(0, mergedColumns.indexOf(columnKey)) as (keyof PfdItem)[];
          return cols.map(c => (item[c] as string) || '').join('-');
        };

        const targetGroupKey = getGroupKey(targetItem, key);
        const targetValue = (targetItem as any)[key];

        return {
          ...prev,
          items: prev.items.map(item => {
            const itemGroupKey = getGroupKey(item, key);
            // 같은 병합 그룹이고, 같은 값을 가진 셀만 동기화
            if (itemGroupKey === targetGroupKey && (item as any)[key] === targetValue) {
              return { ...item, [key]: value };
            }
            return item;
          }),
          dirty: true,
        };
      });
    } else {
      // 병합 대상이 아닌 컬럼은 단순 변경
      setState(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId ? { ...item, [key]: value } : item
        ),
        dirty: true,
      }));
    }
  }, [setState]);

  // 행 추가 (맨 아래)
  const handleAddRow = useCallback(() => {
    saveToHistory?.();
    const lastItem = state.items[state.items.length - 1];
    const newItem = createEmptyItem(
      state.pfdNo || '',
      lastItem?.processNo || '',
      lastItem?.processName || ''
    );
    newItem.sortOrder = state.items.length;
    setState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      dirty: true,
    }));
  }, [state.items, state.pfdNo || '', setState, saveToHistory]);

  // 행 위에 추가 - 열별 확장병합 로직 적용
  const handleInsertRowAbove = useCallback((rowIdx: number, type: ContextMenuType, colKey?: string) => {
    saveToHistory?.();
    const currentItem = state.items[rowIdx];

    // ★★★ A, B열에서 위로 행 추가 시: 병합 그룹 맨 위에 새 행 추가 ★★★
    if (type === 'process' && (colKey === 'processNo' || colKey === 'processName')) {
      // A, B 병합 그룹의 맨 위 행 찾기
      const currentKey = `${currentItem?.processNo}-${currentItem?.processName}`;
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
        state.pfdNo || '',
        uniqueId,  // A열: 고유값 (병합 방지)
        uniqueId   // B열: 고유값 (병합 방지)
      );

      const newItems = [...state.items];
      newItems.splice(groupStartIdx, 0, newItem);  // 병합 그룹 맨 위에 삽입
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // 부모 행 찾기
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

    // ★★★ E열(부품명/workElement)에서 위로 행 추가 시: A,B,C,D 확장병합, E열 단순 행 추가 (D열과 동일) ★★★
    if (type === 'work') {
      const targetItem = state.items[rowIdx];

      // C,D 병합 그룹의 맨 위 행 찾기 (null/undefined 정규화)
      const descKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}`;
      let groupStartIdx = rowIdx;
      for (let i = rowIdx - 1; i >= 0; i--) {
        const prevItem = state.items[i];
        const prevKey = `${prevItem.processNo || ''}-${prevItem.processName || ''}-${prevItem.processLevel || ''}-${prevItem.processDesc || ''}`;
        if (prevKey === descKey) {
          groupStartIdx = i;
        } else {
          break;
        }
      }

      // A, B, C, D열: 현재 행 값 복사 (확장병합)
      const newItem = createEmptyItem(
        state.pfdNo || '',
        targetItem.processNo,      // A열: 확장병합
        targetItem.processName     // B열: 확장병합
      );
      newItem.processLevel = targetItem.processLevel ?? '';  // C열: 확장병합
      newItem.processDesc = targetItem.processDesc ?? '';    // D열: 확장병합
      // E열(부품명): 고유값으로 새 병합 그룹 (단순 행 추가)
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newItem.workElement = uniqueId;

      const newItems = [...state.items];
      newItems.splice(groupStartIdx, 0, newItem);
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // ★★★ F열(equipment/설비)에서 위로 행 추가 시: A,B,C,D,E 확장병합, F열 단순 행 추가 ★★★
    if (type === 'equipment') {
      const targetItem = state.items[rowIdx];

      // E열(workElement) 병합 그룹의 맨 위 행 찾기 (null/undefined 정규화)
      const workKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}-${targetItem.workElement || ''}`;
      let groupStartIdx = rowIdx;
      for (let i = rowIdx - 1; i >= 0; i--) {
        const prevItem = state.items[i];
        const prevKey = `${prevItem.processNo || ''}-${prevItem.processName || ''}-${prevItem.processLevel || ''}-${prevItem.processDesc || ''}-${prevItem.workElement || ''}`;
        if (prevKey === workKey) {
          groupStartIdx = i;
        } else {
          break;
        }
      }

      // A, B, C, D, E열: 현재 행 값 복사 (확장병합)
      const newItem = createEmptyItem(
        state.pfdNo || '',
        targetItem.processNo,      // A열: 확장병합
        targetItem.processName     // B열: 확장병합
      );
      newItem.processLevel = targetItem.processLevel ?? '';  // C열: 확장병합
      newItem.processDesc = targetItem.processDesc ?? '';    // D열: 확장병합
      newItem.workElement = targetItem.workElement ?? '';    // E열: 확장병합
      // F열(설비): 고유값으로 새 병합 그룹 (단순 행 추가)
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newItem.equipment = uniqueId;

      const newItems = [...state.items];
      newItems.splice(groupStartIdx, 0, newItem);
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // ★★★ I열(제품특성/char)에서 위로 행 추가 시: A,B,C,D,E,F 확장병합, I열 단순 행 추가 ★★★
    if (type === 'char') {
      const targetItem = state.items[rowIdx];

      // F열(equipment) 병합 그룹의 맨 위 행 찾기 (null/undefined 정규화)
      const equipKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}-${targetItem.workElement || ''}-${targetItem.equipment || ''}`;
      let groupStartIdx = rowIdx;
      for (let i = rowIdx - 1; i >= 0; i--) {
        const prevItem = state.items[i];
        const prevKey = `${prevItem.processNo || ''}-${prevItem.processName || ''}-${prevItem.processLevel || ''}-${prevItem.processDesc || ''}-${prevItem.workElement || ''}-${prevItem.equipment || ''}`;
        if (prevKey === equipKey) {
          groupStartIdx = i;
        } else {
          break;
        }
      }

      // A, B, C, D, E, F열: 현재 행 값 복사 (확장병합)
      const newItem = createEmptyItem(
        state.pfdNo || '',
        targetItem.processNo,      // A열: 확장병합
        targetItem.processName     // B열: 확장병합
      );
      newItem.processLevel = targetItem.processLevel ?? '';  // C열: 확장병합
      newItem.processDesc = targetItem.processDesc ?? '';    // D열: 확장병합
      newItem.workElement = targetItem.workElement ?? '';    // E열: 확장병합
      newItem.equipment = targetItem.equipment ?? '';        // F열: 확장병합
      // I열(제품특성): 고유값으로 새 병합 그룹 (단순 행 추가)
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newItem.productChar = uniqueId;

      const newItems = [...state.items];
      newItems.splice(groupStartIdx, 0, newItem);
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // ★★★ D열(processDesc)에서 위로 행 추가 시: 확장병합 설정에 따라 동작 ★★★
    if (type === 'process' && colKey === 'processDesc') {
      const targetItem = state.items[rowIdx];

      // 확장병합이 활성화된 경우에만 확장 로직 적용
      if (extensionMerge.D) {
        // C,D 병합 그룹의 맨 위 행 찾기 (null/undefined 정규화)
        const descKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}`;
        let groupStartIdx = rowIdx;
        for (let i = rowIdx - 1; i >= 0; i--) {
          const prevItem = state.items[i];
          const prevKey = `${prevItem.processNo || ''}-${prevItem.processName || ''}-${prevItem.processLevel || ''}-${prevItem.processDesc || ''}`;
          if (prevKey === descKey) {
            groupStartIdx = i;
          } else {
            break;
          }
        }

        // A, B열: 현재 행 값 복사 (확장병합)
        const newItem = createEmptyItem(
          state.pfdNo || '',
          targetItem.processNo,      // A열: 현재 행 값 (확장병합)
          targetItem.processName     // B열: 현재 행 값 (확장병합)
        );
        // C, D열: 고유값으로 새 병합 그룹 (단순 행 추가)
        const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        newItem.processLevel = uniqueId;  // C열: 고유값 (병합 방지)
        newItem.processDesc = uniqueId;   // D열: 고유값 (병합 방지)
        // E~S열은 빈 값 (단순 행 추가)

        const newItems = [...state.items];
        newItems.splice(groupStartIdx, 0, newItem);  // 병합 그룹 맨 위에 삽입
        newItems.forEach((item, idx) => item.sortOrder = idx);
        setState(prev => ({ ...prev, items: newItems, dirty: true }));
        closeContextMenu();
        return;
      } else {
        // 확장병합 OFF: 단순 행 추가 (현재 위치 위에)
        const newItem = createEmptyItem(state.pfdNo || '', '', '');
        const newItems = [...state.items];
        newItems.splice(rowIdx, 0, newItem);
        newItems.forEach((item, idx) => item.sortOrder = idx);
        setState(prev => ({ ...prev, items: newItems, dirty: true }));
        closeContextMenu();
        return;
      }
    }

    // 기타 열에서 위로 행 추가 (기본 동작)
    const targetItem = state.items[rowIdx];
    const newItem = createEmptyItem(
      state.pfdNo || '',
      targetItem?.processNo || '',
      targetItem?.processName || ''
    );

    const newItems = [...state.items];
    newItems.splice(rowIdx, 0, newItem);
    newItems.forEach((item, idx) => item.sortOrder = idx);
    setState(prev => ({ ...prev, items: newItems, dirty: true }));
    closeContextMenu();
  }, [state.items, state.pfdNo || '', setState, closeContextMenu, saveToHistory]);

  // 행 아래에 추가
  const handleInsertRowBelow = useCallback((rowIdx: number, type: ContextMenuType, colKey?: string) => {
    saveToHistory?.();
    const currentItem = state.items[rowIdx];

    // A, B열에서 아래로 행 추가 시: 병합 그룹의 맨 아래 행 아래에 새 행 추가
    if (type === 'process' && (colKey === 'processNo' || colKey === 'processName')) {
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

      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newItem = createEmptyItem(
        state.pfdNo || '',
        uniqueId,
        uniqueId
      );

      const newItems = [...state.items];
      newItems.splice(groupEndIdx + 1, 0, newItem);
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // ★★★ D열(processDesc)에서 아래로 행 추가 시: A,B 확장병합, C~S 단순 행 추가 (CP와 동일) ★★★
    if (type === 'process' && colKey === 'processDesc') {
      const targetItem = state.items[rowIdx];

      // C,D 병합 그룹의 맨 아래 행 찾기 (null/undefined 정규화)
      const descKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}`;
      let groupEndIdx = rowIdx;
      for (let i = rowIdx + 1; i < state.items.length; i++) {
        const nextItem = state.items[i];
        const nextKey = `${nextItem.processNo || ''}-${nextItem.processName || ''}-${nextItem.processLevel || ''}-${nextItem.processDesc || ''}`;
        if (nextKey === descKey) {
          groupEndIdx = i;
        } else {
          break;
        }
      }

      // A, B열: 현재 행 값 복사 (확장병합)
      const newItem = createEmptyItem(
        state.pfdNo || '',
        targetItem.processNo,      // A열: 현재 행 값 (확장병합)
        targetItem.processName     // B열: 현재 행 값 (확장병합)
      );
      // C, D열: 고유값으로 새 병합 그룹 (단순 행 추가)
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newItem.processLevel = uniqueId;  // C열: 고유값 (병합 방지)
      newItem.processDesc = uniqueId;   // D열: 고유값 (병합 방지)
      // E~S열은 빈 값 (단순 행 추가)

      const newItems = [...state.items];
      newItems.splice(groupEndIdx + 1, 0, newItem);  // 병합 그룹 맨 아래 다음에 삽입
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // ★★★ E열(부품명/workElement)에서 아래로 행 추가 시: A,B,C,D 확장병합, E열 단순 행 추가 (D열과 동일) ★★★
    if (type === 'work') {
      const targetItem = state.items[rowIdx];

      // C,D 병합 그룹의 맨 아래 행 찾기 (null/undefined 정규화)
      const descKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}`;
      let groupEndIdx = rowIdx;
      for (let i = rowIdx + 1; i < state.items.length; i++) {
        const nextItem = state.items[i];
        const nextKey = `${nextItem.processNo || ''}-${nextItem.processName || ''}-${nextItem.processLevel || ''}-${nextItem.processDesc || ''}`;
        if (nextKey === descKey) {
          groupEndIdx = i;
        } else {
          break;
        }
      }

      // A, B, C, D열: 현재 행 값 복사 (확장병합)
      const newItem = createEmptyItem(
        state.pfdNo || '',
        targetItem.processNo,      // A열: 확장병합
        targetItem.processName     // B열: 확장병합
      );
      newItem.processLevel = targetItem.processLevel ?? '';  // C열: 확장병합
      newItem.processDesc = targetItem.processDesc ?? '';    // D열: 확장병합
      // E열(부품명): 고유값으로 새 병합 그룹 (단순 행 추가)
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newItem.workElement = uniqueId;

      const newItems = [...state.items];
      newItems.splice(groupEndIdx + 1, 0, newItem);
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // ★★★ F열(equipment/설비)에서 아래로 행 추가 시: A,B,C,D,E 확장병합, F열 단순 행 추가 ★★★
    if (type === 'equipment') {
      const targetItem = state.items[rowIdx];

      // E열(workElement) 병합 그룹의 맨 아래 행 찾기 (null/undefined 정규화)
      const workKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}-${targetItem.workElement || ''}`;
      let groupEndIdx = rowIdx;
      for (let i = rowIdx + 1; i < state.items.length; i++) {
        const nextItem = state.items[i];
        const nextKey = `${nextItem.processNo || ''}-${nextItem.processName || ''}-${nextItem.processLevel || ''}-${nextItem.processDesc || ''}-${nextItem.workElement || ''}`;
        if (nextKey === workKey) {
          groupEndIdx = i;
        } else {
          break;
        }
      }

      // A, B, C, D, E열: 현재 행 값 복사 (확장병합)
      const newItem = createEmptyItem(
        state.pfdNo || '',
        targetItem.processNo,      // A열: 확장병합
        targetItem.processName     // B열: 확장병합
      );
      newItem.processLevel = targetItem.processLevel ?? '';  // C열: 확장병합
      newItem.processDesc = targetItem.processDesc ?? '';    // D열: 확장병합
      newItem.workElement = targetItem.workElement ?? '';    // E열: 확장병합
      // F열(설비): 고유값으로 새 병합 그룹 (단순 행 추가)
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newItem.equipment = uniqueId;

      const newItems = [...state.items];
      newItems.splice(groupEndIdx + 1, 0, newItem);
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // ★★★ I열(제품특성/char)에서 아래로 행 추가 시: A,B,C,D,E,F 확장병합, I열 단순 행 추가 ★★★
    if (type === 'char') {
      const targetItem = state.items[rowIdx];

      // F열(equipment) 병합 그룹의 맨 아래 행 찾기 (null/undefined 정규화)
      const equipKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}-${targetItem.processLevel || ''}-${targetItem.processDesc || ''}-${targetItem.workElement || ''}-${targetItem.equipment || ''}`;
      let groupEndIdx = rowIdx;
      for (let i = rowIdx + 1; i < state.items.length; i++) {
        const nextItem = state.items[i];
        const nextKey = `${nextItem.processNo || ''}-${nextItem.processName || ''}-${nextItem.processLevel || ''}-${nextItem.processDesc || ''}-${nextItem.workElement || ''}-${nextItem.equipment || ''}`;
        if (nextKey === equipKey) {
          groupEndIdx = i;
        } else {
          break;
        }
      }

      // A, B, C, D, E, F열: 현재 행 값 복사 (확장병합)
      const newItem = createEmptyItem(
        state.pfdNo || '',
        targetItem.processNo,      // A열: 확장병합
        targetItem.processName     // B열: 확장병합
      );
      newItem.processLevel = targetItem.processLevel ?? '';  // C열: 확장병합
      newItem.processDesc = targetItem.processDesc ?? '';    // D열: 확장병합
      newItem.workElement = targetItem.workElement ?? '';    // E열: 확장병합
      newItem.equipment = targetItem.equipment ?? '';        // F열: 확장병합
      // I열(제품특성): 고유값으로 새 병합 그룹 (단순 행 추가)
      const uniqueId = `_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newItem.productChar = uniqueId;

      const newItems = [...state.items];
      newItems.splice(groupEndIdx + 1, 0, newItem);
      newItems.forEach((item, idx) => item.sortOrder = idx);
      setState(prev => ({ ...prev, items: newItems, dirty: true }));
      closeContextMenu();
      return;
    }

    // 기타 열에서 행 추가 시 (기본 동작)
    const newItem = createEmptyItem(
      state.pfdNo || '',
      currentItem?.processNo || '',
      currentItem?.processName || ''
    );

    const newItems = [...state.items];
    newItems.splice(rowIdx + 1, 0, newItem);
    newItems.forEach((item, idx) => item.sortOrder = idx);
    setState(prev => ({ ...prev, items: newItems, dirty: true }));
    closeContextMenu();
  }, [state.items, state.pfdNo || '', setState, closeContextMenu, saveToHistory]);

  // ★★★ 행 삭제 - 병합 그룹 보호 ★★★
  const handleDeleteRow = useCallback((rowIdx: number) => {
    if (state.items.length <= 1) {
      alert('최소 1개의 행은 유지해야 합니다.');
      closeContextMenu();
      return;
    }

    const targetItem = state.items[rowIdx];

    // 병합 그룹 찾기 (A~B열 기준 - 공정 단위)
    const processKey = `${targetItem.processNo || ''}-${targetItem.processName || ''}`;
    const sameProcessItems = state.items.filter(item =>
      `${item.processNo || ''}-${item.processName || ''}` === processKey
    );

    // 같은 병합 그룹에 여러 행이 있고, 해당 행이 그룹의 첫 번째 행인 경우 경고
    if (sameProcessItems.length > 1) {
      const firstInGroup = state.items.findIndex(item =>
        `${item.processNo || ''}-${item.processName || ''}` === processKey
      ) === rowIdx;

      if (firstInGroup && sameProcessItems.length > 1) {
        const confirmDelete = confirm(
          `이 행은 병합된 공정 그룹의 첫 번째 행입니다.\n` +
          `삭제 시 병합 표시가 변경될 수 있습니다.\n\n` +
          `계속 삭제하시겠습니까?`
        );
        if (!confirmDelete) {
          closeContextMenu();
          return;
        }
      }
    }

    saveToHistory?.();
    const newItems = state.items.filter((_, idx) => idx !== rowIdx);
    newItems.forEach((item, idx) => item.sortOrder = idx);
    setState(prev => ({ ...prev, items: newItems, dirty: true }));
    closeContextMenu();
  }, [state.items, setState, closeContextMenu, saveToHistory]);

  // 저장 (DB API 호출)
  const handleSave = useCallback(async () => {
    if (!state.pfdNo) {
      console.error('PFD No가 없습니다.');
      return;
    }

    setSaveStatus('saving');
    try {

      // ★★★ DB API 호출 ★★★
      const res = await fetch(`/api/pfd/${state.pfdNo}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: state.items }),
      });

      if (res.ok) {
        const data = await res.json();
        setState(prev => ({ ...prev, dirty: false }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        const errorData = await res.json();
        console.error('❌ [PFD] DB 저장 실패:', errorData);
        setSaveStatus('error');
        alert('저장 실패: ' + (errorData.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('❌ [PFD] 저장 오류:', error);
      setSaveStatus('error');
      alert('저장 오류: ' + error);
    }
  }, [state.pfdNo || '', state.items, setState, setSaveStatus]);

  return {
    handleCellChange,
    handleAddRow,
    handleInsertRowAbove,
    handleInsertRowBelow,
    handleDeleteRow,
    handleSave,
  };
}