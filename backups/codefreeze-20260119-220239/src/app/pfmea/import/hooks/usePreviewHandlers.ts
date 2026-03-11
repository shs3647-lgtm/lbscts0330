/**
 * @file usePreviewHandlers.ts
 * @description 미리보기 핸들러 훅
 */

import { useRef } from 'react';
import { ImportedFlatData } from '../types';

export interface UsePreviewHandlersProps {
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  previewColumn: string;
  selectedRows: Set<string>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  draggedIndex: number | null;
  setDraggedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  /** optional: persist to DB master (keep localStorage as fallback) */
  externalPersist?: (flatData: ImportedFlatData[]) => Promise<void> | void;
}

export function usePreviewHandlers(props: UsePreviewHandlersProps) {
  const {
    flatData,
    setFlatData,
    previewColumn,
    selectedRows,
    setSelectedRows,
    draggedIndex,
    setDraggedIndex,
    setIsSaved,
    setIsSaving,
    setDirty,
    externalPersist,
  } = props;

  // ✅ 중복 저장 방지용 ref
  const isSavingRef = useRef(false);

  /** 전체 삭제 */
  const handleAllDelete = () => {
    if (!confirm(`${previewColumn} 항목의 모든 데이터를 삭제하시겠습니까?`)) return;
    setFlatData((prev) => prev.filter((d) => d.itemCode !== previewColumn));
    setSelectedRows(new Set());
    setDirty(true);
  };

  /** 선택 삭제 */
  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }
    if (!confirm(`선택된 ${selectedRows.size}개 항목을 삭제하시겠습니까?`)) return;
    setFlatData((prev) => prev.filter((d) => !selectedRows.has(d.id)));
    setSelectedRows(new Set());
    setDirty(true);
  };

  /** 행 선택/해제 */
  const handleRowSelect = (id: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /** 드래그 시작 */
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  /** 드래그 오버 */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  /** 드롭 */
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const selectedData = flatData.filter((d) => d.itemCode === previewColumn);
    const otherData = flatData.filter((d) => d.itemCode !== previewColumn);

    const newSelectedData = [...selectedData];
    const [draggedItem] = newSelectedData.splice(draggedIndex, 1);
    newSelectedData.splice(targetIndex, 0, draggedItem);

    setFlatData([...otherData, ...newSelectedData]);
    setDraggedIndex(null);
    setDirty(true);
  };

  /** 드래그 종료 */
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  /** 미리보기 데이터 저장 (localStorage + DB) */
  const handleSavePreview = async () => {
    // ✅ 중복 저장 방지
    if (isSavingRef.current) {
      console.warn('⚠️ 저장 진행 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      // ✅ 빈 값 제외 (DB 저장 기준과 동일하게 localStorage도 동기화)
      const validData = flatData.filter((d) => d.value && d.value.trim() !== '');

      // 1. localStorage에 저장 (폴백)
      localStorage.setItem('pfmea_master_data', JSON.stringify(validData));
      localStorage.setItem('pfmea_saved_at', new Date().toISOString());
      console.log('✅ localStorage 저장 완료:', validData.length, '건');

      // 2. DB에 저장 (externalPersist)
      if (externalPersist) {
        await externalPersist(flatData);
      }

      setIsSaved(true);
      setDirty(false);
      console.log('✅ 데이터 저장 완료:', validData.length, '건 (LocalStorage + DB)');
      setTimeout(() => setIsSaved(false), 5000);
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return {
    handleAllDelete,
    handleDeleteSelected,
    handleRowSelect,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleSavePreview,
  };
}


