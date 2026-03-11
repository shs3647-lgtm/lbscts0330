/**
 * @file useUndoRedo.ts
 * @description PFD Undo/Redo 히스토리 관리 + 셀 병합/해제 훅
 * @extracted-from page.tsx (lines 56-160)
 */

import { useState, useCallback } from 'react';
import { PfdItem } from '../types';

const MAX_HISTORY_COUNT = 10;

interface UseUndoRedoOptions {
    /** 현재 아이템 배열 */
    items: PfdItem[];
    /** 아이템 배열 업데이트 함수 */
    setItems: (updater: (prev: PfdItem[]) => PfdItem[]) => void;
    /** dirty 플래그 설정 */
    setDirty: (dirty: boolean) => void;
}

interface UseUndoRedoReturn {
    /** Undo 히스토리에 저장 */
    saveToHistory: () => void;
    /** Undo 실행 - 이전 상태 반환 (없으면 null) */
    handleUndo: () => PfdItem[] | null;
    /** Redo 실행 - 다음 상태 반환 (없으면 null) */
    handleRedo: () => PfdItem[] | null;
    /** Undo 가능 여부 */
    canUndo: boolean;
    /** Redo 가능 여부 */
    canRedo: boolean;
    /** Undo 가능 횟수 */
    undoCount: number;
    /** Redo 가능 횟수 */
    redoCount: number;
    /** 위 행과 병합 */
    handleMergeUp: (rowIdx: number, colKey?: string) => void;
    /** 아래 행과 병합 */
    handleMergeDown: (rowIdx: number, colKey?: string) => void;
    /** 병합 해제 */
    handleUnmerge: (rowIdx: number, colKey?: string) => void;
}

/**
 * PFD Undo/Redo 관리 훅
 */
export function useUndoRedo(options: UseUndoRedoOptions): UseUndoRedoReturn {
    const { items, setItems, setDirty } = options;

    const [undoHistory, setUndoHistory] = useState<PfdItem[][]>([]);
    const [redoHistory, setRedoHistory] = useState<PfdItem[][]>([]);

    // 히스토리에 현재 상태 저장
    const saveToHistory = useCallback(() => {
        setUndoHistory(prev => {
            const newHistory = [...prev, [...items]];
            if (newHistory.length > MAX_HISTORY_COUNT) {
                return newHistory.slice(-MAX_HISTORY_COUNT);
            }
            return newHistory;
        });
        // Redo 히스토리 초기화
        setRedoHistory([]);
    }, [items]);

    // Undo 실행
    const handleUndo = useCallback((): PfdItem[] | null => {
        if (undoHistory.length === 0) return null;

        const previousItems = undoHistory[undoHistory.length - 1];
        // 현재 상태를 Redo에 저장
        setRedoHistory(prev => [...prev, [...items]].slice(-MAX_HISTORY_COUNT));
        setUndoHistory(prev => prev.slice(0, -1));

        return previousItems;
    }, [undoHistory, items]);

    // Redo 실행
    const handleRedo = useCallback((): PfdItem[] | null => {
        if (redoHistory.length === 0) return null;

        const nextItems = redoHistory[redoHistory.length - 1];
        // 현재 상태를 Undo에 저장
        setUndoHistory(prev => [...prev, [...items]].slice(-MAX_HISTORY_COUNT));
        setRedoHistory(prev => prev.slice(0, -1));

        return nextItems;
    }, [redoHistory, items]);

    // 위 행과 병합
    const handleMergeUp = useCallback((rowIdx: number, colKey?: string) => {
        if (rowIdx <= 0 || !colKey) {
            alert('첫 번째 행은 위 행과 병합할 수 없습니다.');
            return;
        }
        saveToHistory();
        setItems(prev => {
            const newItems = [...prev];
            const currentItem = newItems[rowIdx];
            const aboveItem = newItems[rowIdx - 1];

            if (!currentItem || !aboveItem) return prev;

            // 위 행의 값으로 현재 행 업데이트
            (newItems[rowIdx] as any)[colKey] = (aboveItem as any)[colKey];
            return newItems;
        });
        setDirty(true);
    }, [saveToHistory, setItems, setDirty]);

    // 아래 행과 병합
    const handleMergeDown = useCallback((rowIdx: number, colKey?: string) => {
        if (!colKey) return;
        saveToHistory();
        setItems(prev => {
            const newItems = [...prev];
            const currentItem = newItems[rowIdx];
            const belowItem = newItems[rowIdx + 1];

            if (!currentItem || !belowItem) {
                alert('마지막 행은 아래 행과 병합할 수 없습니다.');
                return prev;
            }

            // 현재 행의 값으로 아래 행 업데이트
            (newItems[rowIdx + 1] as any)[colKey] = (currentItem as any)[colKey];
            return newItems;
        });
        setDirty(true);
    }, [saveToHistory, setItems, setDirty]);

    // 병합 해제
    const handleUnmerge = useCallback((rowIdx: number, colKey?: string) => {
        if (!colKey) return;
        saveToHistory();
        setItems(prev => {
            const newItems = [...prev];
            const currentItem = newItems[rowIdx];

            if (!currentItem) return prev;

            // 고유 값으로 변경
            const uniqueValue = `_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
            (newItems[rowIdx] as any)[colKey] = uniqueValue;
            return newItems;
        });
        setDirty(true);
    }, [saveToHistory, setItems, setDirty]);

    return {
        saveToHistory,
        handleUndo,
        handleRedo,
        canUndo: undoHistory.length > 0,
        canRedo: redoHistory.length > 0,
        undoCount: undoHistory.length,
        redoCount: redoHistory.length,
        handleMergeUp,
        handleMergeDown,
        handleUnmerge,
    };
}

export default useUndoRedo;
