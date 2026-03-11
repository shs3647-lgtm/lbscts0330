/**
 * @file useAnalysisCompare.ts
 * @description PFMEA 분석 데이터 비교 로직 훅 (셀 단위 비교)
 * @author AI Assistant
 * @created 2026-01-21
 * @module hooks/useAnalysisCompare
 */

import { useState, useCallback } from 'react';
import { ImportedFlatData } from '../types';
import { loadDatasetByFmeaId, saveMasterDataset } from '../utils/master-api';

// =====================================================
// 타입 정의
// =====================================================

interface UseAnalysisCompareParams {
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  relationTab: 'A' | 'B' | 'C';
  masterDatasetId: string | null;
  masterDatasetName: string;
  setMasterDatasetId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  fmeaId?: string;
  fmeaType?: string;
}

interface UseAnalysisCompareReturn {
  // 상태
  isAnalysisCompareMode: boolean;
  analysisDbData: ImportedFlatData[];
  analysisCellConfirms: Set<string>;

  // 핸들러
  handleStartAnalysisCompareMode: () => Promise<void>;
  handleCancelAnalysisCompareMode: () => void;
  handleToggleAnalysisCellConfirm: (processNo: string, itemCode: string) => void;
  handleSelectAllAnalysisConfirm: (checked: boolean) => void;
  handleAnalysisConfirmSave: () => Promise<void>;

  // 헬퍼 함수
  isAnalysisCellChanged: (processNo: string, itemCode: string, newValue: string | undefined) => boolean;
  isAnalysisCellNew: (processNo: string, itemCode: string) => boolean;
}

// =====================================================
// 훅 구현
// =====================================================

export function useAnalysisCompare({
  flatData,
  setFlatData,
  relationTab,
  masterDatasetId,
  masterDatasetName,
  setMasterDatasetId,
  setIsSaved,
  fmeaId,
  fmeaType,
}: UseAnalysisCompareParams): UseAnalysisCompareReturn {
  // 상태
  const [isAnalysisCompareMode, setIsAnalysisCompareMode] = useState(false);
  const [analysisDbData, setAnalysisDbData] = useState<ImportedFlatData[]>([]);
  const [analysisCellConfirms, setAnalysisCellConfirms] = useState<Set<string>>(new Set());

  /** 분석 데이터 비교 모드 시작 - DB 데이터와 새 데이터 비교 */
  const handleStartAnalysisCompareMode = useCallback(async () => {
    const tabPrefix = relationTab;
    const newData = flatData.filter(d => d.itemCode?.startsWith(tabPrefix));
    if (newData.length === 0) {
      alert('비교할 새 데이터가 없습니다. 먼저 데이터를 Import하세요.');
      return;
    }

    // 기초정보(A1) 확인
    const a1Data = flatData.filter(d => d.itemCode === 'A1');
    if (a1Data.length === 0 && tabPrefix !== 'C') {
      alert('⚠️ 기초정보(L2-1 공정번호)가 없습니다.\n먼저 기초정보를 입력하거나 DB에서 불러오세요.');
      return;
    }

    // 분석데이터의 processNo가 기초정보(A1)에 있는지 확인
    if (tabPrefix !== 'C') {
      const validProcessNos = new Set(a1Data.map(d => d.processNo));
      const invalidData = newData.filter(d => !validProcessNos.has(d.processNo));
      if (invalidData.length > 0) {
        const invalidProcessNos = [...new Set(invalidData.map(d => d.processNo))];
        alert(`⚠️ 기초정보에 없는 공정번호가 분석데이터에 있습니다:\n${invalidProcessNos.join(', ')}\n\n기초정보와 분석데이터의 공정번호를 일치시켜 주세요.`);
        return;
      }
    }

    try {
      if (!fmeaId) {
        alert('FMEA를 선택해주세요.');
        return;
      }
      const loaded = await loadDatasetByFmeaId(fmeaId);
      if (loaded.flatData.length > 0) {
        const validData = loaded.flatData.filter((d: ImportedFlatData) => d.value && d.value.trim() !== '');
        setAnalysisDbData(validData);
        setIsAnalysisCompareMode(true);
        setAnalysisCellConfirms(new Set());
      } else {
        alert('DB에 저장된 기존 데이터가 없습니다.');
      }
    } catch (error) {
      console.error('DB 데이터 로드 오류:', error);
      alert('DB 데이터를 불러오는 중 오류가 발생했습니다.');
    }
  }, [flatData, relationTab, fmeaId]);

  /** 분석 데이터 비교 모드 종료 */
  const handleCancelAnalysisCompareMode = useCallback(() => {
    setIsAnalysisCompareMode(false);
    setAnalysisDbData([]);
    setAnalysisCellConfirms(new Set());
  }, []);

  /** 분석 셀 확정 토글 */
  const handleToggleAnalysisCellConfirm = useCallback((processNo: string, itemCode: string) => {
    const key = `${processNo}-${itemCode}`;
    setAnalysisCellConfirms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  /** 분석 전체 확정 선택 */
  const handleSelectAllAnalysisConfirm = useCallback((checked: boolean) => {
    if (checked) {
      const tabPrefix = relationTab;
      const allKeys = new Set<string>();
      flatData
        .filter(d => d.itemCode?.startsWith(tabPrefix))
        .forEach(newItem => {
          const dbItem = analysisDbData.find(
            d => d.processNo === newItem.processNo && d.itemCode === newItem.itemCode
          );
          if (!dbItem || dbItem.value !== newItem.value) {
            allKeys.add(`${newItem.processNo}-${newItem.itemCode}`);
          }
        });
      setAnalysisCellConfirms(allKeys);
    } else {
      setAnalysisCellConfirms(new Set());
    }
  }, [flatData, relationTab, analysisDbData]);

  /** 분석 확정 저장 - 선택된 셀의 새 데이터로 DB 업데이트 */
  const handleAnalysisConfirmSave = useCallback(async () => {
    if (analysisCellConfirms.size === 0) {
      alert('확정할 셀을 선택하세요.');
      return;
    }

    try {
      const confirmedKeys = analysisCellConfirms;
      const confirmedItemCodes = [...new Set(
        [...confirmedKeys].map(key => key.split('-')[1]).filter(Boolean)
      )];

      // 데이터 일관성 검증
      // ★★★ L1(C 카테고리)은 별도 구분자(YP/SP/USER)를 사용하므로 검증에서 제외 (2026-02-02) ★★★
      const validProcessNos = new Set(
        flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo)
      );
      const invalidProcessNos: string[] = [];
      [...confirmedKeys].forEach(key => {
        const [processNo, itemCode] = key.split('-');
        // C 카테고리는 별도 processNo 체계 (YP/SP/USER) 사용하므로 제외
        if (!itemCode?.startsWith('C') && !validProcessNos.has(processNo)) {
          invalidProcessNos.push(processNo);
        }
      });

      if (invalidProcessNos.length > 0) {
        const uniqueInvalid = [...new Set(invalidProcessNos)];
        alert(`⚠️ 기초정보에 없는 공정번호가 있습니다:\n${uniqueInvalid.join(', ')}\n\n먼저 기초정보(L2-1 공정번호)를 확인하세요.`);
        return;
      }

      const updatedData: ImportedFlatData[] = [];
      const processedKeys = new Set<string>();

      flatData.forEach(item => {
        const key = `${item.processNo}-${item.itemCode}`;

        if (!confirmedItemCodes.includes(item.itemCode)) {
          updatedData.push(item);
          processedKeys.add(key);
          return;
        }

        if (confirmedKeys.has(key)) {
          updatedData.push(item);
          processedKeys.add(key);
        } else {
          const dbItem = analysisDbData.find(
            d => d.processNo === item.processNo && d.itemCode === item.itemCode
          );
          if (dbItem) {
            updatedData.push(dbItem);
            processedKeys.add(key);
          }
        }
      });

      analysisDbData.forEach(dbItem => {
        const key = `${dbItem.processNo}-${dbItem.itemCode}`;
        if (!processedKeys.has(key) && !confirmedItemCodes.includes(dbItem.itemCode)) {
          updatedData.push(dbItem);
        }
      });

      const confirmedCount = [...confirmedKeys].length;

      const res = await saveMasterDataset({
        fmeaId: fmeaId || '',
        fmeaType: fmeaType || 'D',
        datasetId: masterDatasetId,
        name: masterDatasetName || 'MASTER',
        replace: true,
        replaceItemCodes: confirmedItemCodes,
        flatData: updatedData,
      });

      if (res.ok) {
        if (res.datasetId) {
          setMasterDatasetId(res.datasetId);
        }
        setFlatData(updatedData);
        setIsSaved(true);
        setIsAnalysisCompareMode(false);
        setAnalysisDbData([]);
        setAnalysisCellConfirms(new Set());
        alert(`✅ ${confirmedCount}건의 새 데이터가 확정 저장되었습니다.`);
      } else {
        alert('저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('분석 확정 저장 오류:', error);
      alert('확정 저장 중 오류가 발생했습니다.');
    }
  }, [analysisCellConfirms, flatData, analysisDbData, masterDatasetId, masterDatasetName, setMasterDatasetId, setFlatData, setIsSaved, fmeaId, fmeaType]);

  /** 셀이 변경되었는지 확인하는 헬퍼 함수 */
  const isAnalysisCellChanged = useCallback((processNo: string, itemCode: string, newValue: string | undefined): boolean => {
    const dbItem = analysisDbData.find(d => d.processNo === processNo && d.itemCode === itemCode);
    if (!dbItem) return true; // 신규
    return dbItem.value !== newValue;
  }, [analysisDbData]);

  /** 셀이 신규인지 확인하는 헬퍼 함수 */
  const isAnalysisCellNew = useCallback((processNo: string, itemCode: string): boolean => {
    return !analysisDbData.find(d => d.processNo === processNo && d.itemCode === itemCode);
  }, [analysisDbData]);

  return {
    // 상태
    isAnalysisCompareMode,
    analysisDbData,
    analysisCellConfirms,

    // 핸들러
    handleStartAnalysisCompareMode,
    handleCancelAnalysisCompareMode,
    handleToggleAnalysisCellConfirm,
    handleSelectAllAnalysisConfirm,
    handleAnalysisConfirmSave,

    // 헬퍼 함수
    isAnalysisCellChanged,
    isAnalysisCellNew,
  };
}

export default useAnalysisCompare;
