/**
 * @file useColumnResize.ts
 * @description CP 워크시트 컬럼 리사이즈 훅
 *
 * 기능:
 * - 마우스 드래그로 컬럼 폭 조정 (80% ~ 120%)
 * - 폭 축소 시 폰트 크기 자동 조정
 * - 120% 초과 텍스트는 자동 줄바꿈
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { CP_COLUMNS, getColumnResizeBounds, RESIZE_CONFIG } from '../cpConstants';

export interface ColumnWidths {
  [colId: number]: number;
}

export interface ResizeState {
  isResizing: boolean;
  colId: number | null;
  startX: number;
  startWidth: number;
}

export function useColumnResize() {
  // 각 컬럼의 현재 폭 (기본값은 CP_COLUMNS의 width)
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    const widths: ColumnWidths = {};
    CP_COLUMNS.forEach(col => {
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

  // 리사이즈 시작
  const startResize = useCallback((colId: number, clientX: number) => {
    const currentWidth = columnWidths[colId] || CP_COLUMNS.find(c => c.id === colId)?.width || 80;
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

    // 범위 제한 (80% ~ 120%)
    const clampedWidth = Math.max(bounds.min, Math.min(bounds.max, newWidth));

    setColumnWidths(prev => ({
      ...prev,
      [resizeState.colId!]: clampedWidth,
    }));
  }, [resizeState]);

  // 리사이즈 종료
  const endResize = useCallback(() => {
    setResizeState({
      isResizing: false,
      colId: null,
      startX: 0,
      startWidth: 0,
    });
  }, []);

  // 컬럼 폭 초기화 (더블 클릭 시)
  const resetColumnWidth = useCallback((colId: number) => {
    const col = CP_COLUMNS.find(c => c.id === colId);
    if (col) {
      setColumnWidths(prev => ({
        ...prev,
        [colId]: col.width,
      }));
    }
  }, []);

  // 전체 컬럼 폭 초기화
  const resetAllColumnWidths = useCallback(() => {
    const widths: ColumnWidths = {};
    CP_COLUMNS.forEach(col => {
      widths[col.id] = col.width;
    });
    setColumnWidths(widths);
  }, []);

  // 현재 컬럼 폭 가져오기
  const getColumnWidth = useCallback((colId: number): number => {
    return columnWidths[colId] || CP_COLUMNS.find(c => c.id === colId)?.width || 80;
  }, [columnWidths]);

  // 폭 비율 가져오기 (폰트 크기 계산용)
  const getColumnRatio = useCallback((colId: number): number => {
    const col = CP_COLUMNS.find(c => c.id === colId);
    if (!col) return 1;
    return (columnWidths[colId] || col.width) / col.width;
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
    resetAllColumnWidths,
    getColumnWidth,
    getColumnRatio,
  };
}

// 셀 스타일 계산 헬퍼
export function getCellStyle(
  colId: number,
  columnWidths: ColumnWidths,
  baseStyle: React.CSSProperties = {}
): React.CSSProperties {
  const col = CP_COLUMNS.find(c => c.id === colId);
  if (!col) return baseStyle;

  const currentWidth = columnWidths[colId] || col.width;
  const ratio = currentWidth / col.width;

  // 폰트 크기 계산 (80% ~ 100%에서 축소)
  let fontSize = RESIZE_CONFIG.defaultFontSize;
  if (ratio < RESIZE_CONFIG.textScaleThreshold) {
    const scale = (ratio - RESIZE_CONFIG.minRatio) / (RESIZE_CONFIG.textScaleThreshold - RESIZE_CONFIG.minRatio);
    fontSize = RESIZE_CONFIG.minFontSize + (RESIZE_CONFIG.defaultFontSize - RESIZE_CONFIG.minFontSize) * scale;
    fontSize = Math.max(RESIZE_CONFIG.minFontSize, Math.round(fontSize));
  }

  return {
    ...baseStyle,
    width: currentWidth,
    minWidth: currentWidth,
    maxWidth: currentWidth,
    fontSize: `${fontSize}px`,
    // 폭이 좁아지면 줄바꿈 허용
    whiteSpace: ratio < 1 ? 'normal' : 'nowrap',
    wordBreak: ratio < 1 ? 'break-word' : 'normal',
    overflow: 'hidden',
    textOverflow: ratio >= 1 ? 'ellipsis' : 'clip',
  };
}
