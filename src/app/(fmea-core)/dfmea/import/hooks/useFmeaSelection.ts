/**
 * @file useFmeaSelection.ts
 * @description FMEA 프로젝트 목록 + BD 현황 로딩 + 선택 관리
 * 3개 Import 모드(수동/자동/기존데이터) 공용 훅
 * @created 2026-02-26
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { buildBdStatusList } from './useMasterDataHandlers';
import {
  loadAllDatasetSummaries,
  loadAllDatasetSummariesAdmin,
  softDeleteDatasets,
  restoreDatasets,
  permanentDeleteDatasets,
} from '../utils/master-api';
import type { FMEAProject, BdStatusItem } from '../components/ImportPageTypes';

export interface UseFmeaSelectionReturn {
  fmeaList: FMEAProject[];
  selectedFmeaId: string;
  setSelectedFmeaId: (id: string) => void;
  selectedFmea: FMEAProject | undefined;
  bdStatusList: BdStatusItem[];
  setBdStatusList: React.Dispatch<React.SetStateAction<BdStatusItem[]>>;
  isAdmin: boolean;
  adminMode: boolean;
  l1Name: string;
  handleDeleteDatasets: (ids: string[]) => Promise<void>;
  handleRestoreDatasets: (ids: string[]) => Promise<void>;
  handleToggleAdminMode: () => Promise<void>;
  handlePermanentDeleteDatasets: (ids: string[]) => Promise<void>;
}

export function useFmeaSelection(): UseFmeaSelectionReturn {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get('id');
  const { isAdmin } = useAuth();

  const [fmeaList, setFmeaList] = useState<FMEAProject[]>([]);
  const [selectedFmeaId, setSelectedFmeaId] = useState<string>(idFromUrl || '');
  const [bdStatusList, setBdStatusList] = useState<BdStatusItem[]>([]);
  const [adminMode, setAdminMode] = useState(false);

  const selectedFmea = fmeaList.find(f => f.id === selectedFmeaId);
  // ★ l1Name 우선순위: partName(품명) → subject에서 FMEA접미사 제거 → productName
  const rawL1 = selectedFmea?.fmeaInfo?.partName
    || selectedFmea?.fmeaInfo?.subject
    || selectedFmea?.project?.productName
    || '';
  const l1Name = rawL1.replace(/\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i, '').trim();

  // 초기 로드: FMEA 목록 + BD 현황
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/fmea/projects?type=P');
        if (!res.ok) return;
        const data = await res.json();
        const projects: FMEAProject[] = (data.projects || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          fmeaNo: (p.fmeaNo || p.id) as string,
          fmeaType: p.fmeaType as string,
          fmeaInfo: p.fmeaInfo as FMEAProject['fmeaInfo'],
          project: p.project as FMEAProject['project'],
          parentFmeaId: (p.parentFmeaId || null) as string | null,
          parentFmeaType: (p.parentFmeaType || null) as string | null,
          revisionNo: p.revisionNo as string,
        }));
        setFmeaList(projects);
        if (!selectedFmeaId && projects.length > 0) {
          setSelectedFmeaId(projects[0].id);
        }

        // BD 현황 로드
        const { summaries, deletedFmeaIds } = await loadAllDatasetSummaries();
        const activeProjects = projects.filter(p => !deletedFmeaIds.includes(p.id.toLowerCase()));
        setBdStatusList(buildBdStatusList(activeProjects, summaries));
      } catch (e) {
        console.error('FMEA 목록/BD 현황 로드 오류:', e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadBdStatus = useCallback(async (projects: FMEAProject[], admin: boolean) => {
    try {
      const resp = admin ? await loadAllDatasetSummariesAdmin() : await loadAllDatasetSummaries();
      const sums = Array.isArray(resp) ? resp : resp.summaries;
      const delIds: string[] = Array.isArray(resp) ? [] : (resp.deletedFmeaIds || []);
      const activeList = admin ? projects : projects.filter(p => !delIds.includes(p.id.toLowerCase()));
      setBdStatusList(buildBdStatusList(activeList, sums));
    } catch (e) {
      console.error('BD 현황 리로드 오류:', e);
    }
  }, []);

  const handleDeleteDatasets = useCallback(async (fmeaIds: string[]) => {
    const result = await softDeleteDatasets(fmeaIds);
    if (!result.ok) {
      alert(`BD 삭제 실패: ${result.error || '알 수 없는 오류'}`);
      console.error('[handleDeleteDatasets] 삭제 실패:', result.error, fmeaIds);
      return;
    }
    await reloadBdStatus(fmeaList, adminMode);
  }, [fmeaList, adminMode, reloadBdStatus]);

  const handleRestoreDatasets = useCallback(async (fmeaIds: string[]) => {
    const result = await restoreDatasets(fmeaIds);
    if (result.ok) await reloadBdStatus(fmeaList, true);
  }, [fmeaList, reloadBdStatus]);

  const handleToggleAdminMode = useCallback(async () => {
    const newMode = !adminMode;
    setAdminMode(newMode);
    await reloadBdStatus(fmeaList, newMode);
  }, [adminMode, fmeaList, reloadBdStatus]);

  const handlePermanentDeleteDatasets = useCallback(async (fmeaIds: string[]) => {
    const result = await permanentDeleteDatasets(fmeaIds);
    if (result.ok) await reloadBdStatus(fmeaList, true);
  }, [fmeaList, reloadBdStatus]);

  return {
    fmeaList, selectedFmeaId, setSelectedFmeaId, selectedFmea,
    bdStatusList, setBdStatusList,
    isAdmin, adminMode, l1Name,
    handleDeleteDatasets, handleRestoreDatasets,
    handleToggleAdminMode, handlePermanentDeleteDatasets,
  };
}
