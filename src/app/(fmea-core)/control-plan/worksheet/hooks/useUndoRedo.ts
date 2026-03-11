/**
 * @file useUndoRedo.ts
 * @description Undo/Redo 히스토리 관리 및 셀 병합/해제 로직
 * @extracted-from page.tsx (lines 55-175)
 */

import { useState, useCallback } from 'react';

const MAX_HISTORY_COUNT = 10;

export interface UndoRedoActions<T> {
    /** 현재 상태를 히스토리에 저장 (변경 전 호출) */
    saveToHistory: (itemsToSave?: T[]) => void;
    /** Undo 실행 */
    handleUndo: () => T[] | null;
    /** Redo 실행 */
    handleRedo: () => T[] | null;
    /** Undo 가능 여부 */
    canUndo: boolean;
    /** Redo 가능 여부 */
    canRedo: boolean;
    /** Undo 히스토리 개수 */
    undoCount: number;
    /** Redo 히스토리 개수 */
    redoCount: number;
}

export interface MergeActions {
    /** 위 행과 병합 */
    handleMergeUp: (rowIdx: number, colKey: string | undefined) => void;
    /** 아래 행과 병합 */
    handleMergeDown: (rowIdx: number, colKey: string | undefined) => void;
    /** 병합 해제 */
    handleUnmerge: (rowIdx: number, colKey: string | undefined) => void;
}

export interface UseUndoRedoOptions<T> {
    /** 현재 아이템 배열 */
    items: T[];
    /** 상태 업데이트 함수 */
    setItems: (updater: (prev: T[]) => T[]) => void;
    /** dirty 상태 설정 함수 */
    setDirty?: (dirty: boolean) => void;
}

/**
 * Undo/Redo 히스토리 관리 훅
 */
export function useUndoRedo<T extends Record<string, any>>(
    options: UseUndoRedoOptions<T>
): UndoRedoActions<T> & MergeActions {
    const { items, setItems, setDirty } = options;

    // Undo/Redo 히스토리 (최대 10개)
    const [undoHistory, setUndoHistory] = useState<T[][]>([]);
    const [redoHistory, setRedoHistory] = useState<T[][]>([]);

    // 히스토리에 현재 상태 저장 (변경 전에 호출)
    const saveToHistory = useCallback((itemsToSave?: T[]) => {
        const toSave = itemsToSave ?? items;
        setUndoHistory(prev => {
            const newHistory = [...prev, [...toSave]];
            if (newHistory.length > MAX_HISTORY_COUNT) {
                return newHistory.slice(-MAX_HISTORY_COUNT);
            }
            return newHistory;
        });
        // 새 작업 시 리두 히스토리 초기화
        setRedoHistory([]);
    }, [items]);

    // Undo 실행
    const handleUndo = useCallback((): T[] | null => {
        if (undoHistory.length === 0) {
            return null;
        }

        // 현재 상태를 리두 히스토리에 저장
        setRedoHistory(prev => {
            const newHistory = [...prev, [...items]];
            if (newHistory.length > MAX_HISTORY_COUNT) {
                return newHistory.slice(-MAX_HISTORY_COUNT);
            }
            return newHistory;
        });

        // 언두 실행
        const previousItems = undoHistory[undoHistory.length - 1];
        setUndoHistory(prev => prev.slice(0, -1));

        return previousItems;
    }, [undoHistory, items]);

    // Redo 실행
    const handleRedo = useCallback((): T[] | null => {
        if (redoHistory.length === 0) {
            return null;
        }

        // 현재 상태를 언두 히스토리에 저장
        setUndoHistory(prev => {
            const newHistory = [...prev, [...items]];
            if (newHistory.length > MAX_HISTORY_COUNT) {
                return newHistory.slice(-MAX_HISTORY_COUNT);
            }
            return newHistory;
        });

        // 리두 실행
        const nextItems = redoHistory[redoHistory.length - 1];
        setRedoHistory(prev => prev.slice(0, -1));

        return nextItems;
    }, [redoHistory, items]);

    // ★ 셀 병합 - 위 행과 병합
    const handleMergeUp = useCallback((rowIdx: number, colKey: string | undefined) => {
        if (rowIdx <= 0 || !colKey) {
            return;
        }

        saveToHistory();
        setItems(prevItems => {
            const newItems = [...prevItems];
            const currentItem = newItems[rowIdx];
            const aboveItem = newItems[rowIdx - 1];

            if (!currentItem || !aboveItem) return prevItems;

            // 위 행의 값으로 현재 행 업데이트 (병합 효과)
            (newItems[rowIdx] as any)[colKey] = (aboveItem as any)[colKey];

            return newItems;
        });
        setDirty?.(true);
    }, [saveToHistory, setItems, setDirty]);

    // ★ 셀 병합 - 아래 행과 병합
    const handleMergeDown = useCallback((rowIdx: number, colKey: string | undefined) => {
        if (!colKey) return;

        saveToHistory();
        setItems(prevItems => {
            const newItems = [...prevItems];
            const currentItem = newItems[rowIdx];
            const belowItem = newItems[rowIdx + 1];

            if (!currentItem || !belowItem) {
                return prevItems;
            }

            // 현재 행의 값으로 아래 행 업데이트 (병합 효과)
            (newItems[rowIdx + 1] as any)[colKey] = (currentItem as any)[colKey];

            return newItems;
        });
        setDirty?.(true);
    }, [saveToHistory, setItems, setDirty]);

    // ★ 셀 병합 해제 (고유 값으로 변경)
    const handleUnmerge = useCallback((rowIdx: number, colKey: string | undefined) => {
        if (!colKey) return;

        saveToHistory();
        setItems(prevItems => {
            const newItems = [...prevItems];
            const currentItem = newItems[rowIdx];

            if (!currentItem) return prevItems;

            // 고유 값으로 변경 (언더스코어 + 랜덤 ID)
            const uniqueValue = `_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
            (newItems[rowIdx] as any)[colKey] = uniqueValue;

            return newItems;
        });
        setDirty?.(true);
    }, [saveToHistory, setItems, setDirty]);

    return {
        // Undo/Redo
        saveToHistory,
        handleUndo,
        handleRedo,
        canUndo: undoHistory.length > 0,
        canRedo: redoHistory.length > 0,
        undoCount: undoHistory.length,
        redoCount: redoHistory.length,
        // Merge
        handleMergeUp,
        handleMergeDown,
        handleUnmerge,
    };
}

export default useUndoRedo;
