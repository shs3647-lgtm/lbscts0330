/**
 * @file useEditHandlers.ts
 * @description CP Import 행 편집 핸들러 훅
 * @created 2026-01-14
 * @line-count ~100줄
 */

import { useState, useCallback } from 'react';
import type { ImportedData } from '../types';

type PreviewTab = 'full' | 'group' | 'individual';

// key를 itemCode로 매핑 (PREVIEW_COLUMNS의 key → 실제 itemCode)
const KEY_TO_ITEM_CODE_MAP: Record<string, string> = {
  'processNo': 'A1',
  'processName': 'A2',
  'level': 'A3',
  'processDesc': 'A4',
  'equipment': 'A5',
  'ep': 'A6',
  'autoDetector': 'A7',
  'productChar': 'B1',
  'processChar': 'B2',
  'specialChar': 'B3',
  'spec': 'B4',
  'evalMethod': 'B5',
  'sampleSize': 'B6',
  'frequency': 'B7',
  'owner1': 'B8',
  'owner2': 'B9',
  'reactionPlan': 'B10',
};

export interface UseEditHandlersProps {
  fullData: ImportedData[];
  groupData: ImportedData[];
  itemData: ImportedData[];
  setFullData: React.Dispatch<React.SetStateAction<ImportedData[]>>;
  setGroupData: React.Dispatch<React.SetStateAction<ImportedData[]>>;
  setItemData: React.Dispatch<React.SetStateAction<ImportedData[]>>;
}

export interface UseEditHandlersReturn {
  editingRowId: string | null;
  editValues: Record<string, string>;
  handleEditStart: (processNo: string, data: ImportedData[]) => void;
  handleEditSave: (processNo: string, tab: PreviewTab) => void;
  handleEditCancel: () => void;
  handleDelete: (processNo: string, tab: PreviewTab) => void;
  handleCellChange: (field: string, value: string) => void;
}

/**
 * 행 편집 핸들러 훅
 * - 편집 시작/저장/취소
 * - 행 삭제
 * - 편집 값 관리
 */
export function useEditHandlers({
  fullData,
  groupData,
  itemData,
  setFullData,
  setGroupData,
  setItemData,
}: UseEditHandlersProps): UseEditHandlersReturn {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // 편집 시작
  const handleEditStart = useCallback((processNo: string, data: ImportedData[]) => {
    setEditingRowId(processNo);
    const row = data.filter(d => d.processNo === processNo);
    const values: Record<string, string> = {};
    // itemCode를 key로 변환하여 저장 (편집 시 key로 접근)
    row.forEach(r => {
      const key = Object.keys(KEY_TO_ITEM_CODE_MAP).find(k => KEY_TO_ITEM_CODE_MAP[k] === r.itemCode) || r.itemCode;
      values[key] = r.value;
    });
    setEditValues(values);
  }, []);

  // 편집 취소
  const handleEditCancel = useCallback(() => {
    setEditingRowId(null);
    setEditValues({});
  }, []);

  // 편집 저장
  const handleEditSave = useCallback((processNo: string, tab: PreviewTab) => {
    const setData = tab === 'full' ? setFullData : tab === 'group' ? setGroupData : setItemData;
    
    setData(prev => prev.map(d => {
      if (d.processNo === processNo) {
        // key를 itemCode로 변환하여 찾기
        const key = Object.keys(KEY_TO_ITEM_CODE_MAP).find(k => KEY_TO_ITEM_CODE_MAP[k] === d.itemCode);
        if (key && editValues[key] !== undefined) {
          return { ...d, value: editValues[key] };
        }
      }
      return d;
    }));
    
    setEditingRowId(null);
    setEditValues({});
  }, [editValues, setFullData, setGroupData, setItemData]);

  // 행 삭제
  const handleDelete = useCallback((processNo: string, tab: PreviewTab) => {
    if (!confirm(`공정번호 "${processNo}" 행을 삭제하시겠습니까?`)) return;
    if (tab === 'full') setFullData(prev => prev.filter(d => d.processNo !== processNo));
    else if (tab === 'group') setGroupData(prev => prev.filter(d => d.processNo !== processNo));
    else setItemData(prev => prev.filter(d => d.processNo !== processNo));
  }, [setFullData, setGroupData, setItemData]);

  // 셀 값 변경
  const handleCellChange = useCallback((field: string, value: string) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  }, []);

  return {
    editingRowId,
    editValues,
    handleEditStart,
    handleEditSave,
    handleEditCancel,
    handleDelete,
    handleCellChange,
  };
}

