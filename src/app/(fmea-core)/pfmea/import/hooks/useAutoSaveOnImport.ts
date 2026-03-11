/**
 * @file useAutoSaveOnImport.ts
 * @description 생성/임포트 후 즉시 자동저장 훅
 * 저장 버튼 없이 saveMasterDataset 자동 호출
 * @created 2026-02-26
 */

import { useState, useCallback } from 'react';
import { saveMasterDataset } from '../utils/master-api';
import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { BdStatusItem } from '../components/ImportPageTypes';

interface UseAutoSaveOnImportParams {
  selectedFmeaId: string;
  fmeaType: string;
  masterDatasetId: string | null;
  setMasterDatasetId: (id: string | null) => void;
  setBdStatusList: React.Dispatch<React.SetStateAction<BdStatusItem[]>>;
  /** ★ 2026-03-02: 'template' = 수동/자동 모드 (failureChains DB 오염 방지) */
  mode?: 'import' | 'template';
}

export interface UseAutoSaveOnImportReturn {
  isSaving: boolean;
  lastSaveOk: boolean | null;
  triggerSave: (flatData: ImportedFlatData[], options?: {
    failureChains?: MasterFailureChain[];
    datasetName?: string;
  }) => Promise<boolean>;
}

export function useAutoSaveOnImport({
  selectedFmeaId,
  fmeaType,
  masterDatasetId,
  setMasterDatasetId,
  setBdStatusList,
  mode,
}: UseAutoSaveOnImportParams): UseAutoSaveOnImportReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveOk, setLastSaveOk] = useState<boolean | null>(null);

  const triggerSave = useCallback(async (
    flatData: ImportedFlatData[],
    options?: { failureChains?: MasterFailureChain[]; datasetName?: string },
  ): Promise<boolean> => {
    if (!selectedFmeaId) {
      console.error('자동저장 실패: FMEA ID 없음');
      return false;
    }
    setIsSaving(true);
    try {
      const res = await saveMasterDataset({
        fmeaId: selectedFmeaId,
        fmeaType,
        datasetId: masterDatasetId,
        name: options?.datasetName || 'MASTER',
        replace: true,
        flatData,
        failureChains: options?.failureChains,
        mode,  // ★ 2026-03-02: 'template' 모드 → failureChains 강제 무시
      });
      if (res.ok) {
        if (res.datasetId) setMasterDatasetId(res.datasetId);
        // BD 현황 업데이트
        setBdStatusList(prev => prev.map(item =>
          item.fmeaId === selectedFmeaId ? {
            ...item,
            itemCount: new Set(flatData.map(d => d.itemCode)).size,
            dataCount: flatData.filter(d => d.value && d.value.trim() !== '').length,
          } : item
        ));
        setLastSaveOk(true);
        return true;
      }
      setLastSaveOk(false);
      console.error('자동저장 실패: 서버 응답 오류');
      return false;
    } catch (error) {
      console.error('자동저장 오류:', error);
      setLastSaveOk(false);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [selectedFmeaId, fmeaType, masterDatasetId, setMasterDatasetId, setBdStatusList]);

  return { isSaving, lastSaveOk, triggerSave };
}
