/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useWorksheetDataLoader.ts
 * @description 워크시트 데이터 로드 — DB 다이렉트 (2026-03-27 레거시 완전 제거)
 *
 * atomicToLegacy() 변환 완전 제거.
 * loadAtomicDB() → state.atomicDB 직접 저장.
 * 레거시 필드(l1, l2, riskData)는 atomicDB에서 최소 호환 빌드.
 */

'use client';

import { useEffect } from 'react';
import { WorksheetState, createInitialState, uid } from '../constants';
import { FMEAWorksheetDB, createEmptyDB } from '../schema';
import { loadAtomicDB } from './atomicDbLoader';
import { buildLegacyCompat } from './legacyCompatBuilder';

interface UseWorksheetDataLoaderParams {
  selectedFmeaId: string | null;
  baseId: string | null;
  mode: string | null;
  setStateSynced: (updater: React.SetStateAction<WorksheetState>) => void;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setAtomicDB: React.Dispatch<React.SetStateAction<FMEAWorksheetDB | null>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  suppressAutoSaveRef: React.MutableRefObject<boolean>;
}

export function useWorksheetDataLoader({
  selectedFmeaId,
  baseId,
  mode,
  setStateSynced,
  setState,
  setAtomicDB,
  setDirty,
  suppressAutoSaveRef,
}: UseWorksheetDataLoaderParams): void {

  useEffect(() => {
    if (typeof window === 'undefined' || !selectedFmeaId) return;

    const normalizedFmeaId = selectedFmeaId.toLowerCase();
    if (baseId && mode === 'inherit') return;

    const urlParams = new URLSearchParams(window.location.search);

    // stale localStorage 강제 클리어
    try {
      const cacheKeys = Object.keys(localStorage).filter(k =>
        k.includes(normalizedFmeaId) && !k.startsWith('pfmea_tab_') && !k.startsWith('pfmea_visibleSteps_')
      );
      if (cacheKeys.length > 0) {
        cacheKeys.forEach(k => localStorage.removeItem(k));
      }
    } catch (_e) { /* Safari private mode */ }

    const freshParam = urlParams.get('fresh');
    if (freshParam === '1') {
      suppressAutoSaveRef.current = true;
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('fresh');
      window.history.replaceState({}, '', cleanUrl.toString());
    }

    (async () => {
      suppressAutoSaveRef.current = true;

      // 프로젝트 기초정보에서 L1 완제품명
      let projectL1Name = '';
      try {
        const projectRes = await fetch(`/api/fmea/projects?id=${normalizedFmeaId}`);
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          if (projectData.success && projectData.projects?.length > 0) {
            const currentProject = projectData.projects.find((p: any) =>
              p.id?.toLowerCase() === normalizedFmeaId
            );
            if (currentProject) {
              const rawPartName = currentProject.fmeaInfo?.partName || '';
              const rawSubject = currentProject.fmeaInfo?.subject || '';
              const rawProjectName = currentProject.fmeaInfo?.fmeaProjectName || '';
              const rawProductName = currentProject.project?.productName || currentProject.project?.projectName || '';
              const stripFmeaSuffix = (s: string) =>
                s.replace(/\s*\([a-z0-9-]+\)\s*$/i, '')
                  .replace(/\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i, '').trim();
              const partFromSubject = stripFmeaSuffix(rawSubject);
              const partFromProjectName = stripFmeaSuffix(rawProjectName);
              const partFromProductName = stripFmeaSuffix(rawProductName);
              const baseName = rawPartName || partFromSubject || partFromProjectName || partFromProductName || '';
              const isDefault = !baseName || baseName === '품명' || baseName === '품명+PFMEA';
              projectL1Name = isDefault ? '' : baseName;
            }
          }
        }
      } catch (e) {
        console.error('[기초정보] DB 로드 오류:', e);
      }

      // ★★★ DB 다이렉트 로드 — atomicToLegacy 완전 제거 ★★★
      const atomicData = await loadAtomicDB(normalizedFmeaId);
      if (atomicData) {
        // 탭 결정
        const loaderUrlParams = typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search) : null;
        const compareEmbedLoader = loaderUrlParams?.get('compareEmbed') === '1';
        const atomicUrlTab = loaderUrlParams?.get('tab') ?? null;
        let atomicSavedTab = '';
        if (!compareEmbedLoader) {
          try {
            const storedTab = localStorage.getItem(`pfmea_tab_${normalizedFmeaId}`);
            if (storedTab) atomicSavedTab = storedTab;
          } catch (_e) { /* ignore */ }
        }
        const atomicTab = compareEmbedLoader
          ? (atomicUrlTab && atomicUrlTab.trim() ? atomicUrlTab : 'structure')
          : (atomicUrlTab || atomicSavedTab || 'structure');

        // L1 이름: 등록정보 우선
        if (projectL1Name && atomicData.l1Structure) {
          const currentL1Name = atomicData.l1Structure.name || '';
          const isPlaceholder = !currentL1Name || currentL1Name.trim() === '' || currentL1Name.includes('입력');
          if (isPlaceholder || projectL1Name) {
            atomicData.l1Structure = { ...atomicData.l1Structure, name: projectL1Name || currentL1Name };
          }
        }

        // ★ 레거시 호환 필드 빌드 (atomicToLegacy 대체 — 최소 빌더)
        const compat = buildLegacyCompat(atomicData, projectL1Name);

        const newState: WorksheetState = {
          fmeaId: normalizedFmeaId,
          atomicDB: atomicData,
          l1: compat.l1,
          l2: compat.l2,
          tab: atomicTab,
          riskData: compat.riskData,
          search: '',
          selected: { type: 'L2', id: null },
          levelView: 'all',
          visibleSteps: [2, 3, 4, 5, 6],
          failureLinks: compat.failureLinks,
          fmea4Rows: [],
          structureConfirmed: atomicData.confirmed?.structure,
          l1Confirmed: atomicData.confirmed?.l1Function,
          l2Confirmed: atomicData.confirmed?.l2Function,
          l3Confirmed: atomicData.confirmed?.l3Function,
          failureL1Confirmed: atomicData.confirmed?.l1Failure,
          failureL2Confirmed: atomicData.confirmed?.l2Failure,
          failureL3Confirmed: atomicData.confirmed?.l3Failure,
          failureLinkConfirmed: atomicData.confirmed?.failureLink,
          riskConfirmed: atomicData.confirmed?.risk,
          optimizationConfirmed: atomicData.confirmed?.optimization,
        };

        setStateSynced(prev => ({
          ...newState,
          tab: atomicTab,
          visibleSteps: Array.isArray(prev.visibleSteps) ? prev.visibleSteps : newState.visibleSteps,
        }));

        atomicData.fmeaId = normalizedFmeaId;
        setAtomicDB(atomicData);

        console.log('[WorksheetDataLoader] DB 다이렉트 로드 성공 (레거시 변환 없음)');
        setTimeout(() => { suppressAutoSaveRef.current = false; }, 3000);
        return;
      }

      // Atomic 데이터 없음 → 빈 상태
      suppressAutoSaveRef.current = true;
      const emptyDB = createEmptyDB(normalizedFmeaId);
      setAtomicDB(emptyDB);

      setState(prev => ({
        ...prev,
        atomicDB: emptyDB,
        l1: createInitialState().l1,
        l2: [{
          id: uid(), no: '', name: '(클릭하여 공정 선택)', order: 10, functions: [], productChars: [],
          l3: [{ id: uid(), m4: '', name: '(공정 선택 후 작업요소 추가)', order: 10, functions: [], processChars: [] }]
        }],
        failureLinks: [],
        riskData: {},
        structureConfirmed: false
      }));

      setTimeout(() => { suppressAutoSaveRef.current = false; }, 3000);
    })();
  }, [selectedFmeaId, baseId, mode, setStateSynced, setState, setAtomicDB, setDirty, suppressAutoSaveRef]);
}
