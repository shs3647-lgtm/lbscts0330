/**
 * @file useRelationHandlers.ts
 * @description 관계형 데이터 핸들러 훅
 */

import { ImportedFlatData } from '../types';

export interface UseRelationHandlersProps {
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  relationTab: 'A' | 'B' | 'C';
  selectedRelationRows: Set<string>;
  setSelectedRelationRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  getRelationData: (tabOverride?: 'A' | 'B' | 'C') => any[];
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  relationFileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useRelationHandlers(props: UseRelationHandlersProps) {
  const {
    flatData,
    setFlatData,
    relationTab,
    selectedRelationRows,
    setSelectedRelationRows,
    getRelationData,
    setIsSaved,
    relationFileInputRef,
  } = props;

  /** 관계형 테이블 - 행 선택/해제 */
  const handleRelationRowSelect = (processNo: string) => {
    setSelectedRelationRows((prev) => {
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
    if (selectedRelationRows.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }
    if (!confirm(`선택된 ${selectedRelationRows.size}개 공정의 데이터를 삭제하시겠습니까?`)) return;

    setFlatData((prev) => prev.filter((d) => !selectedRelationRows.has(d.processNo)));
    setSelectedRelationRows(new Set());
    setIsSaved(false);
  };

  /** 관계형 테이블 - 전체 삭제 */
  const handleRelationAllDelete = () => {
    const itemCodes =
      relationTab === 'A' ? ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] : relationTab === 'B' ? ['B1', 'B2', 'B3', 'B4', 'B5'] : ['C1', 'C2', 'C3', 'C4'];
    if (
      !confirm(
        `${relationTab === 'A' ? '고장형태(L2)' : relationTab === 'B' ? '고장원인(L3)' : '고장영향(L1)'} 데이터 전체를 삭제하시겠습니까?`
      )
    )
      return;

    setFlatData((prev) => prev.filter((d) => !itemCodes.includes(d.itemCode)));
    setSelectedRelationRows(new Set());
    setIsSaved(false);
  };

  /** 관계형 데이터 저장 */
  const handleSaveRelation = async () => {
    try {
      const relationData = {
        A: getRelationData('A'),
        B: getRelationData('B'),
        C: getRelationData('C'),
      };
      localStorage.setItem('pfmea_relation_data', JSON.stringify(relationData));
      localStorage.setItem('pfmea_relation_saved_at', new Date().toISOString());
      console.log('✅ 관계형 데이터 저장 완료');
      alert('관계형 데이터가 저장되었습니다.');
      setIsSaved(true);
    } catch (error) {
      console.error('관계형 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  return {
    handleRelationRowSelect,
    handleRelationDeleteSelected,
    handleRelationAllDelete,
    handleSaveRelation,
  };
}

