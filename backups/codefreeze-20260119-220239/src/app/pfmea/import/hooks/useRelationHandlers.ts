/**
 * @file useRelationHandlers.ts
 * @description 관계형 데이터 핸들러 훅
 */

import { ImportedFlatData } from '../types';
import { saveMasterDataset } from '../utils/master-api';

export interface UseRelationHandlersProps {
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  relationTab: 'A' | 'B' | 'C';
  selectedRelationRows: Set<string>;
  setSelectedRelationRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  getRelationData: (tabOverride?: 'A' | 'B' | 'C') => any[];
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>; // ✅ 변경 상태 표시
  setIsSaving?: React.Dispatch<React.SetStateAction<boolean>>; // ✅ 저장 중 상태
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
    setDirty,
    setIsSaving,
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
    setDirty?.(true); // ✅ 변경됨 표시
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
    setDirty?.(true); // ✅ 변경됨 표시
  };

  /** 관계형 데이터 저장 (localStorage + DB) */
  const handleSaveRelation = async () => {
    setIsSaving?.(true);

    try {
      // 1. localStorage에 저장 (폴백)
      const validData = flatData.filter((d) => d.value && d.value.trim() !== '');
      localStorage.setItem('pfmea_master_data', JSON.stringify(validData));
      localStorage.setItem('pfmea_saved_at', new Date().toISOString());

      // 2. DB에 저장 (Master Dataset)
      console.log('📦 Master FMEA DB 저장 중...');
      const res = await saveMasterDataset({
        name: 'MASTER',
        setActive: true,
        replace: true,
        flatData: flatData,
      });

      if (res.ok) {
        console.log('✅ Master FMEA DB 저장 완료:', res.datasetId);
        setIsSaved(true);
        setDirty?.(false);
        alert('데이터가 저장되었습니다.');
      } else {
        console.warn('⚠️ DB 저장 실패 (localStorage 유지)');
        alert('DB 저장에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving?.(false);
    }
  };

  return {
    handleRelationRowSelect,
    handleRelationDeleteSelected,
    handleRelationAllDelete,
    handleSaveRelation,
  };
}


