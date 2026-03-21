/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useWorksheetDataLoader.ts
 * @description 워크시트 데이터 로드 로직 — Atomic DB 전용 (2026-03-20)
 *
 * 2026-03-20 변경:
 * - Legacy fallback 경로 완전 제거
 * - loadAtomicDB() → atomicToLegacy() 변환이 유일한 로드 경로
 * - Atomic DB가 SSoT (Single Source of Truth)
 */

'use client';

import { useEffect } from 'react';
import { WorksheetState, createInitialState, uid } from '../constants';
import { FMEAWorksheetDB, createEmptyDB } from '../schema';
import { loadAtomicDB } from './atomicDbLoader';
import { atomicToLegacy } from '../atomicToLegacyAdapter';

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


  // 워크시트 데이터 로드 (FMEA ID 변경 시) - 원자성 DB 우선
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedFmeaId) return;

    // ✅ 2026-01-25: FMEA ID 항상 소문자로 정규화 (DB 일관성)
    const normalizedFmeaId = selectedFmeaId.toLowerCase();

    // 상속 모드일 때는 로드 스킵
    if (baseId && mode === 'inherit') return;

    // ★★★ PFD 연동 모드: fromPfd 파라미터는 무시하고 메인 로더에서 처리 ★★★
    // API 응답 포맷이 {l1, l2, confirmed, ...} 이므로 메인 로더가 올바르게 처리함
    const urlParams = new URLSearchParams(window.location.search);
    const fromPfd = urlParams.get('fromPfd');

    // ✅ 2026-01-25: 마이그레이션 간소화 - 대문자 키가 있으면 소문자로 통합 후 삭제
    const migrationKey = `_migration_lowercase_v2_${normalizedFmeaId}`;
    // ★ DB Only: 마이그레이션 로직 비활성화
    if (false /* localStorage.getItem(migrationKey) - DB Only 정책 */) {
      const upperFmeaId = selectedFmeaId?.toUpperCase() || '';
      const keys = ['pfmea_worksheet_', 'pfmea_tab_', 'pfmea_riskData_', 'pfmea_atomic_'];
      keys.forEach(prefix => {
        const lowerKey = prefix + normalizedFmeaId;
        const upperKey = prefix + upperFmeaId;
        const upperData = localStorage.getItem(upperKey);
        const lowerData = localStorage.getItem(lowerKey);

        // 대문자 키가 있고 소문자 키가 없으면 → 소문자로 복사
        if (upperData && !lowerData) {
          localStorage.setItem(lowerKey, upperData);
        }
        // 대문자 키 삭제 (소문자 키와 다를 경우만)
        if (upperKey !== lowerKey && upperData) {
          localStorage.removeItem(upperKey);
        }
      });
      localStorage.setItem(migrationKey, new Date().toISOString());
    }

    // ★★★ 2026-03-17 FIX: stale localStorage 강제 클리어 (FC 누락 근본 해결)
    // localStorage의 이전 캐시가 atomic DB 데이터를 오염시키는 문제 방지
    const cacheVersion = 'v2-fc-fix-20260317';
    const cacheKey = `pfmea_cache_ver_${normalizedFmeaId}`;
    if (localStorage.getItem(cacheKey) !== cacheVersion) {
      const staleKeys = [
        `pfmea_worksheet_${normalizedFmeaId}`,
        `pfmea_atomic_${normalizedFmeaId}`,
        `pfmea_riskData_${normalizedFmeaId}`,
      ];
      staleKeys.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(cacheKey, cacheVersion);
      console.log('[WorksheetDataLoader] stale localStorage 클리어 완료 (FC fix)');
    }

    // 원자성 DB 로드 시도 (async) - ★★★ 프로젝트 정보 로드도 여기서 ★★★
    (async () => {

      suppressAutoSaveRef.current = true;

      // ★★★ 2026-02-09: 프로젝트 기초정보에서 L1 완제품명 가져오기 ★★★
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
              // ★ L1 완제품 공정명 = "품명" (렌더링 시 " 생산공정" 접미사 자동 추가)
              // 우선순위: partName → subject → fmeaProjectName → project.productName
              const rawPartName = currentProject.fmeaInfo?.partName || '';
              const rawSubject = currentProject.fmeaInfo?.subject || '';
              const rawProjectName = currentProject.fmeaInfo?.fmeaProjectName || '';
              const rawProductName = currentProject.project?.productName || currentProject.project?.projectName || '';
              // subject/name에서 추출: "품명+PFMEA" → "품명", "품명 FMEA" → "품명", "품명(pfm26-...)" → "품명"
              const stripFmeaSuffix = (s: string) =>
                s.replace(/\s*\([a-z0-9-]+\)\s*$/i, '')  // "(fmeaId)" 접미사 제거
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

      // ★★★ 2026-03-20: Atomic DB 전용 로드 (Legacy fallback 완전 제거) ★★★
      // ★★★ 2026-03-22: loadAtomicDB()와 게이트 일치 — L1만 있고 L2=0인 경우도 반드시 Atomic 렌더
      // (구버전: l2Structures.length>0 조건 → L1-only 프로젝트가 placeholder 빈 시트로 덮임 = 화면 누락)
      const atomicData = await loadAtomicDB(normalizedFmeaId);
      if (atomicData) {
        // atomic 데이터가 존재하면 직접 사용 — atomicToLegacy로 WorksheetState 변환
        const legacyFromAtomic = atomicToLegacy(atomicData);

        // 탭 결정: URL > localStorage > 'structure'
        const atomicUrlTab = typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('tab')
          : null;
        let atomicSavedTab = '';
        try {
          const storedTab = localStorage.getItem(`pfmea_tab_${normalizedFmeaId}`);
          if (storedTab) atomicSavedTab = storedTab;
        } catch (_e) { /* ignore */ }
        const atomicTab = atomicUrlTab || atomicSavedTab || 'structure';

        // L1 이름: 등록정보 우선
        if (projectL1Name && legacyFromAtomic.l1) {
          const currentL1Name = legacyFromAtomic.l1.name || '';
          const isPlaceholder = !currentL1Name || currentL1Name.trim() === '' || currentL1Name.includes('입력');
          if (isPlaceholder || projectL1Name) {
            legacyFromAtomic.l1 = { ...legacyFromAtomic.l1, name: projectL1Name || currentL1Name };
          }
        }

        // ensureL1Types 인라인
        const l1 = legacyFromAtomic.l1 || createInitialState().l1;
        const types = l1.types || [];
        let finalL1 = l1;
        if (types.length === 0) {
          const ts = Date.now();
          finalL1 = {
            ...l1,
            types: [
              { id: `type-${ts}-yp`, name: 'YP', functions: [{ id: `func-${ts}-yp`, name: '', requirements: [] }] },
              { id: `type-${ts}-sp`, name: 'SP', functions: [{ id: `func-${ts}-sp`, name: '', requirements: [] }] },
              { id: `type-${ts}-user`, name: 'USER', functions: [{ id: `func-${ts}-user`, name: '', requirements: [] }] },
            ],
            failureScopes: l1.failureScopes || [],
          };
        }

        const newState: WorksheetState = {
          fmeaId: normalizedFmeaId,
          l1: finalL1 as any,
          l2: legacyFromAtomic.l2 || [],
          tab: atomicTab,
          riskData: legacyFromAtomic.riskData || {},
          search: '',
          selected: { type: 'L2', id: null },
          levelView: 'all',
          visibleSteps: [2, 3, 4, 5, 6],
          failureLinks: legacyFromAtomic.failureLinks || [],
          fmea4Rows: [],
          structureConfirmed: legacyFromAtomic.structureConfirmed,
          l1Confirmed: legacyFromAtomic.l1Confirmed,
          l2Confirmed: legacyFromAtomic.l2Confirmed,
          l3Confirmed: legacyFromAtomic.l3Confirmed,
          failureL1Confirmed: legacyFromAtomic.failureL1Confirmed,
          failureL2Confirmed: legacyFromAtomic.failureL2Confirmed,
          failureL3Confirmed: legacyFromAtomic.failureL3Confirmed,
          failureLinkConfirmed: legacyFromAtomic.failureLinkConfirmed,
          riskConfirmed: legacyFromAtomic.riskConfirmed,
          optimizationConfirmed: legacyFromAtomic.optimizationConfirmed,
        };

        // placeholder 공정 정리 (Rule 10.5 준수: 별도 후처리)
        const rawL2 = newState.l2 || [];
        const realProcesses = rawL2.filter((p: any) => {
          const n = (p.name || '').trim();
          return n && !n.includes('클릭하여') && !n.includes('공정 선택');
        });
        if (realProcesses.length > 0 && realProcesses.length < rawL2.length) {
          newState.l2 = realProcesses;
        }

        setStateSynced(prev => ({
          ...newState,
          tab: atomicTab,
          visibleSteps: Array.isArray(prev.visibleSteps) ? prev.visibleSteps : newState.visibleSteps,
        }));

        // atomicDB를 직접 설정 (migrateToAtomicDB 불필요 — 이미 atomic 형식)
        atomicData.fmeaId = normalizedFmeaId;
        setAtomicDB(atomicData);

        console.log('[WorksheetDataLoader] Atomic DB 직접 로드 성공');
        // ★★★ 2026-03-21 FIX: suppress 해제를 3초 지연
        // Import 직후 워크시트 이동 시 자동저장이 Atomic DB를 덮어쓰기 방지
        setTimeout(() => { suppressAutoSaveRef.current = false; }, 3000);
        return;
      }

      // ── Atomic 데이터 없음 → 빈 상태로 초기화 ──
      const emptyDB = createEmptyDB(normalizedFmeaId);
      setAtomicDB(emptyDB);

      const ensureL1Types = (l1: any) => {
        if (!l1) return { ...createInitialState().l1, name: projectL1Name };
        const currentName = l1.name || '';
        const isPlaceholder = !currentName || currentName.includes('입력') || currentName.trim() === '';
        const finalL1Name = projectL1Name || (isPlaceholder ? '' : currentName);
        const existingTypes = l1.types || [];
        if (existingTypes.length === 0) {
          const ts = Date.now();
          return {
            ...l1,
            name: finalL1Name,
            types: [
              { id: `type-${ts}-yp`, name: 'YP', functions: [{ id: `func-${ts}-yp`, name: '', requirements: [] }] },
              { id: `type-${ts}-sp`, name: 'SP', functions: [{ id: `func-${ts}-sp`, name: '', requirements: [] }] },
              { id: `type-${ts}-user`, name: 'USER', functions: [{ id: `func-${ts}-user`, name: '', requirements: [] }] },
            ],
            failureScopes: l1.failureScopes || [],
          };
        }
        return { ...l1, name: finalL1Name };
      };

      setState(prev => ({
        ...prev,
        l1: ensureL1Types({ id: uid(), name: projectL1Name, types: [], failureScopes: [] }),
        l2: [{
          id: uid(), no: '', name: '(클릭하여 공정 선택)', order: 10, functions: [], productChars: [],
          l3: [{ id: uid(), m4: '', name: '(공정 선택 후 작업요소 추가)', order: 10, functions: [], processChars: [] }]
        }],
        failureLinks: [],
        structureConfirmed: false
      }));

      // ★★★ 2026-03-21 FIX: suppress 해제 3초 지연
      setTimeout(() => { suppressAutoSaveRef.current = false; }, 3000);
    })();
  }, [selectedFmeaId, baseId, mode, setStateSynced, setState, setAtomicDB, setDirty, suppressAutoSaveRef]);
}
