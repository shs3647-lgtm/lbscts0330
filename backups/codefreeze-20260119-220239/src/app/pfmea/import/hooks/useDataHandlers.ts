/**
 * @file useDataHandlers.ts
 * @description 데이터 삭제, 행 선택, 드래그앤드롭 핸들러
 */

import { ImportedFlatData } from '../types';

interface UseDataHandlersProps {
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  previewColumn: string;
  selectedRows: Set<string>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedRelationRows: Set<string>;
  setSelectedRelationRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  relationTab: 'A' | 'B' | 'C';
  setDirty: (dirty: boolean) => void;
  draggedIndex: number | null;
  setDraggedIndex: React.Dispatch<React.SetStateAction<number | null>>;
}

export function useDataHandlers({
  flatData,
  setFlatData,
  previewColumn,
  selectedRows,
  setSelectedRows,
  selectedRelationRows,
  setSelectedRelationRows,
  relationTab,
  setDirty,
  draggedIndex,
  setDraggedIndex,
}: UseDataHandlersProps) {
  
  /** 전체 삭제 (선택된 항목 코드의 모든 데이터 삭제) */
  const handleAllDelete = () => {
    if (!confirm(`${previewColumn} 항목의 모든 데이터를 삭제하시겠습니까?`)) return;
    setFlatData(prev => prev.filter(d => d.itemCode !== previewColumn));
    setSelectedRows(new Set());
  };

  /** 선택 삭제 (체크된 행만 삭제) */
  const handleDeleteSelected = () => {
    console.log('[Del] selectedRows:', selectedRows);
    console.log('[Del] selectedRows.size:', selectedRows.size);
    if (selectedRows.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }
    if (!confirm(`선택된 ${selectedRows.size}개 항목을 삭제하시겠습니까?`)) return;
    console.log('[Del] 삭제 전 flatData 길이:', flatData.length);
    setFlatData(prev => {
      const newData = prev.filter(d => !selectedRows.has(d.id));
      console.log('[Del] 삭제 후 flatData 길이:', newData.length);
      return newData;
    });
    setSelectedRows(new Set());
  };

  /** 관계형 테이블 - 행 선택/해제 */
  const handleRelationRowSelect = (processNo: string) => {
    setSelectedRelationRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(processNo)) {
        newSet.delete(processNo);
      } else {
        newSet.add(processNo);
      }
      return newSet;
    });
  };

  /** 관계형 테이블 - 선택 삭제 */
  const handleRelationDeleteSelected = () => {
    console.log('[RelDel] selectedRelationRows:', selectedRelationRows);
    if (selectedRelationRows.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }
    if (!confirm(`선택된 ${selectedRelationRows.size}개 공정의 데이터를 삭제하시겠습니까?`)) return;
    
    setFlatData(prev => prev.filter(d => !selectedRelationRows.has(d.processNo)));
    setSelectedRelationRows(new Set());
    setDirty(true);
  };

  /** 관계형 테이블 - 전체 삭제 */
  const handleRelationAllDelete = () => {
    const itemCodes = relationTab === 'A' ? ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] :
                      relationTab === 'B' ? ['B1', 'B2', 'B3', 'B4', 'B5'] :
                      ['C1', 'C2', 'C3', 'C4'];
    if (!confirm(`${relationTab === 'A' ? '고장형태(L2)' : relationTab === 'B' ? '고장원인(L3)' : '고장영향(L1)'} 데이터 전체를 삭제하시겠습니까?`)) return;
    
    setFlatData(prev => prev.filter(d => !itemCodes.includes(d.itemCode)));
    setSelectedRelationRows(new Set());
    setDirty(true);
  };

  /** 행 선택/해제 토글 */
  const handleRowSelect = (id: string) => {
    setSelectedRows(prev => {
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

  /** 드래그 오버 (드롭 허용) */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  /** 드롭 (순서 변경) */
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    
    const selectedData = flatData.filter(d => d.itemCode === previewColumn);
    const otherData = flatData.filter(d => d.itemCode !== previewColumn);
    
    const newSelectedData = [...selectedData];
    const [draggedItem] = newSelectedData.splice(draggedIndex, 1);
    newSelectedData.splice(targetIndex, 0, draggedItem);
    
    setFlatData([...otherData, ...newSelectedData]);
    setDraggedIndex(null);
  };

  /** 드래그 종료 */
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  
  return {
    handleAllDelete,
    handleDeleteSelected,
    handleRelationRowSelect,
    handleRelationDeleteSelected,
    handleRelationAllDelete,
    handleRowSelect,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}


