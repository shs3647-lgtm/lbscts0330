/* CODEFREEZE – 2026-02-16 FMEA Master Data 독립 DB 아키텍처 */
/**
 * @file useMasterDataHandlers.ts
 * @description 마스터 데이터 + BD 현황 관리 훅 (독립 DB 아키텍처)
 * @updated 2026-02-16 - 1 FMEA = 1 Dataset
 */

import { useState, useRef, useEffect } from 'react';
import type { ImportedFlatData } from '../types';
import { loadDatasetByFmeaId, loadAllDatasetSummaries, inheritFromParent } from '../utils/master-api';
import type { DatasetSummary } from '../utils/master-api';
import { fmeaIdToBdId } from '../utils/bd-id';
import type {
  FMEAProject,
  MasterDataType,
  MasterApplyStatus,
  MasterDataState,
  BdStatusItem,
} from '../components';

interface UseMasterDataHandlersProps {
  fmeaList: FMEAProject[];
  selectedFmeaId: string;
  setSelectedFmeaId: React.Dispatch<React.SetStateAction<string>>;
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  masterDatasetId: string | null;
  setMasterDatasetId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  isLoaded: boolean;
}

/** BD 현황 목록 생성 (서버 dataset 목록 기반) */
export function buildBdStatusList(
  projects: FMEAProject[],
  datasetSummaries: DatasetSummary[]
): BdStatusItem[] {
  const typeOrder: Record<string, number> = { M: 0, F: 1, P: 2 };
  const datasetMap = new Map(datasetSummaries.map(ds => [ds.fmeaId, ds]));
  // soft delete된 fmeaId 수집 (API에서 제외되었으므로 datasetMap에 없음)
  const activeFmeaIds = new Set(datasetSummaries.map(ds => ds.fmeaId));

  return projects
    .filter(f => f.id.startsWith('dfm') && f.fmeaType && ['M', 'F', 'P'].includes(f.fmeaType))
    .filter(f => {
      const ds = datasetMap.get(f.id);
      // dataset이 있고 isActive=false면 제외
      if (ds && ds.isActive === false) return false;
      return true;
    })
    .map(f => {
      const ds = datasetMap.get(f.id);
      return {
        fmeaId: f.id,
        fmeaType: f.fmeaType || 'D',
        fmeaName: f.fmeaInfo?.subject || f.fmeaNo || f.id,
        bdId: fmeaIdToBdId(f.id),
        parentFmeaId: f.parentFmeaId,
        parentBdId: f.parentFmeaId && f.parentFmeaId !== f.id
          ? fmeaIdToBdId(f.parentFmeaId)
          : undefined,
        companyName: f.fmeaInfo?.companyName || '',
        customerName: f.fmeaInfo?.customerName || f.project?.customer || '',
        revisionNo: f.revisionNo || '',
        startDate: f.project?.startDate || '',
        createdAt: ds?.createdAt ?? '',
        processCount: ds?.processCount ?? 0,
        itemCount: ds?.itemCount ?? 0,
        dataCount: ds?.dataCount ?? 0,
        fmCount: ds?.fmCount ?? 0,
        fcCount: ds?.fcCount ?? 0,
        sourceFmeaId: ds?.sourceFmeaId ?? null,
        version: ds?.version ?? 0,
        isActive: ds?.isActive ?? true,
      };
    })
    .sort((a, b) =>
      (typeOrder[a.fmeaType] ?? 3) - (typeOrder[b.fmeaType] ?? 3) ||
      a.fmeaId.localeCompare(b.fmeaId)
    );
}

export function useMasterDataHandlers({
  fmeaList,
  selectedFmeaId,
  setSelectedFmeaId,
  flatData,
  setFlatData,
  masterDatasetId,
  setMasterDatasetId,
  setIsSaved,
  setDirty,
  setFileName,
  isLoaded,
}: UseMasterDataHandlersProps) {
  const [masterType, setMasterType] = useState<MasterDataType>('M');
  const [masterFmeaId, setMasterFmeaId] = useState<string>('');
  const [masterApplyStatus, setMasterApplyStatus] = useState<MasterApplyStatus>('not_applied');
  const [masterItemCount, setMasterItemCount] = useState(0);
  const [masterDataCount, setMasterDataCount] = useState(0);

  const [bdStatusList, setBdStatusList] = useState<BdStatusItem[]>([]);
  const skipReloadRef = useRef(false);
  const fmeaChangeRef = useRef(selectedFmeaId);

  // 마스터 타입/FMEA 선택
  const handleMasterTypeChange = (type: MasterDataType) => {
    setMasterType(type);
    setMasterFmeaId('');
    setMasterApplyStatus('not_applied');
    setMasterItemCount(0);
    setMasterDataCount(0);
  };

  const handleMasterFmeaSelect = async (fmeaId: string) => {
    setMasterFmeaId(fmeaId);
    setMasterApplyStatus('not_applied');
    if (!fmeaId) {
      setMasterItemCount(0);
      setMasterDataCount(0);
      return;
    }
    try {
      const loaded = await loadDatasetByFmeaId(fmeaId);
      setMasterItemCount(new Set(loaded.flatData.map(d => d.itemCode)).size);
      setMasterDataCount(loaded.flatData.filter(d => d.value && d.value.trim() !== '').length);
    } catch {
      setMasterItemCount(0);
      setMasterDataCount(0);
    }
  };

  // 마스터 적용
  const handleMasterApplyChange = async (status: MasterApplyStatus) => {
    setMasterApplyStatus(status);
    if (status === 'applied' && masterFmeaId) {
      try {
        const loaded = await loadDatasetByFmeaId(masterFmeaId);
        if (loaded.flatData.length > 0) {
          setFlatData(loaded.flatData);
          setMasterDatasetId(loaded.datasetId);
          setIsSaved(true);
          setDirty(false);
        } else {
          alert('마스터 데이터가 없습니다. 먼저 데이터를 저장하세요.');
          setMasterApplyStatus('not_applied');
        }
      } catch (error) {
        console.error('마스터 데이타 로드 오류:', error);
        alert('마스터 데이터를 불러오는 중 오류가 발생했습니다.');
        setMasterApplyStatus('not_applied');
      }
    }
  };

  // 상위에서 가져오기 (상속)
  const handleCopyFromParent = async () => {
    const fmea = fmeaList.find(f => f.id === selectedFmeaId);
    if (!fmea?.parentFmeaId) {
      alert('상위 FMEA가 연결되어 있지 않습니다.');
      return;
    }
    if (fmea.parentFmeaId === fmea.id) {
      alert('마스터 FMEA는 상위 데이터를 가져올 수 없습니다.');
      return;
    }
    try {
      const result = await inheritFromParent({
        targetFmeaId: selectedFmeaId,
        sourceFmeaId: fmea.parentFmeaId,
      });
      if (result.flatData.length === 0) {
        alert('상위 FMEA의 데이터가 없습니다. 먼저 상위 FMEA의 데이터를 저장하세요.');
        return;
      }
      setFlatData(result.flatData);
      setDirty(true);
      setIsSaved(false);
    } catch (error) {
      console.error('상위 데이터 복사 오류:', error);
      alert('상위 데이터를 가져오는 중 오류가 발생했습니다.');
    }
  };

  const handleSelectAndCopy = async (targetFmeaId: string) => {
    const fmea = fmeaList.find(f => f.id === targetFmeaId);
    if (!fmea?.parentFmeaId || fmea.parentFmeaId === fmea.id) {
      alert('상위 FMEA가 없습니다.');
      return;
    }
    try {
      const result = await inheritFromParent({
        targetFmeaId,
        sourceFmeaId: fmea.parentFmeaId,
      });
      if (result.flatData.length === 0) {
        alert('상위 FMEA의 데이터가 없습니다.');
        return;
      }
      skipReloadRef.current = true;
      setSelectedFmeaId(targetFmeaId);
      fmeaChangeRef.current = targetFmeaId;
      setFlatData(result.flatData);
      setDirty(true);
      setIsSaved(false);
    } catch (error) {
      console.error('BD 상위 데이터 복사 오류:', error);
      alert('상위 데이터를 가져오는 중 오류가 발생했습니다.');
    }
  };

  // FMEA 선택 변경 시 데이터 리로드
  useEffect(() => {
    if (!isLoaded || !selectedFmeaId) return;
    if (fmeaChangeRef.current === selectedFmeaId) return;
    if (skipReloadRef.current) {
      skipReloadRef.current = false;
      fmeaChangeRef.current = selectedFmeaId;
      return;
    }
    fmeaChangeRef.current = selectedFmeaId;

    const reloadForFmea = async () => {
      try {
        const loaded = await loadDatasetByFmeaId(selectedFmeaId);
        setFlatData(loaded.flatData);
        if (loaded.datasetId) setMasterDatasetId(loaded.datasetId);
        setIsSaved(loaded.flatData.length > 0);
        setDirty(false);
        setFileName('');
        setMasterItemCount(new Set(loaded.flatData.map(d => d.itemCode)).size);
        setMasterDataCount(loaded.flatData.filter(d => d.value && d.value.trim() !== '').length);
      } catch (e) {
        console.error('FMEA 변경 시 데이터 로드 오류:', e);
      }
    };
    reloadForFmea();
  }, [selectedFmeaId, isLoaded]);

  const masterData: MasterDataState = {
    masterType,
    masterFmeaId,
    applyStatus: masterApplyStatus,
    itemCount: masterItemCount,
    dataCount: masterDataCount,
  };

  return {
    masterData,
    masterApplyStatus,
    bdStatusList,
    setBdStatusList,
    masterItemCount,
    setMasterItemCount,
    masterDataCount,
    setMasterDataCount,
    skipReloadRef,
    fmeaChangeRef,
    handleMasterTypeChange,
    handleMasterFmeaSelect,
    handleMasterApplyChange,
    handleCopyFromParent,
    handleSelectAndCopy,
  };
}
