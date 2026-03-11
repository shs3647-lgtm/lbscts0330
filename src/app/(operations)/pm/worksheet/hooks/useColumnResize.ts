/**
 * @file useColumnResize.ts
 * @description PFD 워크시트 컬럼 리사이즈 훅
 *
 * 기능:
 * - 마우스 드래그로 컬럼 폭 조정 (80% ~ 150%)
 * - localStorage에 컬럼 폭 저장/불러오기
 */

import { useState, useCallback, useEffect } from 'react';
import { PM_COLUMNS, RESIZE_CONFIG } from '../pmConstants';

const STORAGE_KEY = 'pfd-worksheet-column-widths';

export interface ColumnWidths {
    [colId: number]: number;
}

export interface ResizeState {
    isResizing: boolean;
    colId: number | null;
    startX: number;
    startWidth: number;
}

// localStorage에서 저장된 컬럼 폭 불러오기
function loadSavedWidths(): ColumnWidths | null {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
    }
    return null;
}

// 컬럼별 리사이즈 범위 계산
function getColumnResizeBounds(colId: number) {
    const col = PM_COLUMNS.find(c => c.id === colId);
    if (!col) return { min: 30, max: 300 };
    return {
        min: Math.max(RESIZE_CONFIG.minWidth, col.width * 0.5),
        max: Math.min(RESIZE_CONFIG.maxWidth, col.width * 2),
    };
}

export function useColumnResize() {
    // 각 컬럼의 현재 폭 (저장된 값 또는 기본값)
    const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
        const widths: ColumnWidths = {};
        PM_COLUMNS.forEach(col => {
            widths[col.id] = col.width;
        });
        return widths;
    });

    // 리사이즈 상태
    const [resizeState, setResizeState] = useState<ResizeState>({
        isResizing: false,
        colId: null,
        startX: 0,
        startWidth: 0,
    });

    // 클라이언트 사이드에서 localStorage 불러오기
    useEffect(() => {
        const savedWidths = loadSavedWidths();
        if (savedWidths) {
            setColumnWidths(savedWidths);
        }
    }, []);

    // 리사이즈 시작
    const startResize = useCallback((colId: number, clientX: number) => {
        const currentWidth = columnWidths[colId] || PM_COLUMNS.find(c => c.id === colId)?.width || 80;
        setResizeState({
            isResizing: true,
            colId,
            startX: clientX,
            startWidth: currentWidth,
        });
    }, [columnWidths]);

    // 리사이즈 중
    const handleResize = useCallback((clientX: number) => {
        if (!resizeState.isResizing || resizeState.colId === null) return;

        const delta = clientX - resizeState.startX;
        const newWidth = resizeState.startWidth + delta;
        const bounds = getColumnResizeBounds(resizeState.colId);

        // 범위 제한
        const clampedWidth = Math.max(bounds.min, Math.min(bounds.max, newWidth));

        setColumnWidths(prev => ({
            ...prev,
            [resizeState.colId!]: clampedWidth,
        }));
    }, [resizeState]);

    // 리사이즈 종료 (자동 저장)
    const endResize = useCallback(() => {
        // 저장 먼저 실행
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
            } catch (e) { console.error('[PM 컬럼 폭 저장] 오류:', e); }
        }
        setResizeState({
            isResizing: false,
            colId: null,
            startX: 0,
            startWidth: 0,
        });
    }, [columnWidths]);

    // 컬럼 폭 초기화 (더블 클릭 시)
    const resetColumnWidth = useCallback((colId: number) => {
        const col = PM_COLUMNS.find(c => c.id === colId);
        if (col) {
            setColumnWidths(prev => ({
                ...prev,
                [colId]: col.width,
            }));
        }
    }, []);

    // 현재 컬럼 폭 가져오기
    const getColumnWidth = useCallback((colId: number): number => {
        return columnWidths[colId] || PM_COLUMNS.find(c => c.id === colId)?.width || 80;
    }, [columnWidths]);

    // 마우스 이벤트 핸들러 (전역)
    useEffect(() => {
        if (!resizeState.isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            handleResize(e.clientX);
        };

        const handleMouseUp = () => {
            endResize();
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizeState.isResizing, handleResize, endResize]);

    return {
        columnWidths,
        resizeState,
        startResize,
        endResize,
        resetColumnWidth,
        getColumnWidth,
    };
}
