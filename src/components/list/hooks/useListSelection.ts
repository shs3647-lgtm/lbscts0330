/**
 * @file useListSelection.ts
 * @description 리스트 행 선택 공통 훅
 * @version 1.0.0
 * @created 2026-01-24
 */

import { useState, useCallback } from 'react';

interface UseListSelectionReturn {
  selectedRows: Set<string>;
  toggleRow: (id: string) => void;
  toggleAllRows: (allIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  isAllSelected: (allIds: string[]) => boolean;
}

export function useListSelection(): UseListSelectionReturn {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleAllRows = useCallback((allIds: string[]) => {
    setSelectedRows(prev => {
      if (prev.size === allIds.length && allIds.length > 0) {
        return new Set();
      } else {
        return new Set(allIds);
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedRows.has(id);
  }, [selectedRows]);

  const isAllSelected = useCallback((allIds: string[]) => {
    return allIds.length > 0 && selectedRows.size === allIds.length;
  }, [selectedRows]);

  return {
    selectedRows,
    toggleRow,
    toggleAllRows,
    clearSelection,
    isSelected,
    isAllSelected,
  };
}
