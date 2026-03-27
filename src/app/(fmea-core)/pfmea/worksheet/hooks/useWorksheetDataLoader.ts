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

    // ★★★ 2026-03-22: Import 후 워크시트 이동 시 stale React state 방지
    // URL에 fresh=1이 있으면 suppressAutoSave 활성화 → DB 데이터만 사용
    const freshParam = urlParams.get('fresh');
    if (freshParam === '1') {
      suppressAutoSaveRef.current = true;
      // fresh 파라미터 제거 (뒤로가기 시 불필요한 재적용 방지)
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('fresh');
      window.history.replaceState({}, '', cleanUrl.toString());
      console.log('[WorksheetDataLoader] Import 후 fresh 모드 — DB에서 최신 데이터 로드');
    }

    // 원자성 DB 로드 시도 (async) - ★★★ 프로젝트 정보 로드도 여기서 ★★★
    (async () => {

      suppressAutoSaveRef.current = true;

      // ★★★ 2026-03-24: DB가 SSoT — 로드 시 오래된 localStorage 캐시 무효화
      // 근본원인: auto-link/고장수정이 DB에 직접 저장하지만 localStorage에 구 state가 남아
      //          새로고침 시 캐시 우선 렌더링 → DB 변경 미반영 (FM:146 vs DB:129)
      try {
        const cacheKeys = Object.keys(localStorage).filter(k =>
          k.includes(normalizedFmeaId) && !k.startsWith('pfmea_tab_') && !k.startsWith('pfmea_visibleSteps_')
        );
        if (cacheKeys.length > 0) {
          cacheKeys.forEach(k => localStorage.removeItem(k));
          console.log(`[WorksheetDataLoader] localStorage 캐시 ${cacheKeys.length}건 클리어 (DB SSoT)`);
        }
      } catch (_e) { /* Safari private mode 등 */ }

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
        // ★ 비교 뷰(compareEmbed): URL tab만 사용 — 좌·우 FMEA별 localStorage가 서로 다른 탭을 켜는 버그 방지
        const loaderUrlParams = typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : null;
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

        // ★ 2026-03-27: L3 빈 공정에 실제 빈 L3 1개 추가 (state + atomicDB 양쪽)
        const l2IdSet = new Set((atomicData.l3Structures || []).map((l3: any) => l3.l2Id));
        const newL3Entries: any[] = [];
        if (Array.isArray(newState.l2)) {
          newState.l2 = newState.l2.map((proc: any) => {
            if (!proc.l3 || proc.l3.length === 0) {
              const newL3Id = `init-l3-${proc.id}-${Date.now()}`;
              // atomicDB에도 L3가 없으면 추가
              if (!l2IdSet.has(proc.id)) {
                newL3Entries.push({
                  id: newL3Id, fmeaId: normalizedFmeaId,
                  l1Id: atomicData.l1Structure?.id || '', l2Id: proc.id,
                  m4: '', name: '', order: 0,
                });
              }
              return { ...proc, l3: [{ id: newL3Id, name: '', m4: '', order: 0, functions: [], processChars: [] }] };
            }
            return proc;
          });
        }
        if (newL3Entries.length > 0) {
          atomicData.l3Structures = [...(atomicData.l3Structures || []), ...newL3Entries];
        }

        setStateSynced(prev => ({
          ...newState,
          tab: atomicTab,
          visibleSteps: Array.isArray(prev.visibleSteps) ? prev.visibleSteps : newState.visibleSteps,
        }));

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
          id: uid(), no: '', name: '', order: 10, functions: [], productChars: [],
          l3: [{ id: uid(), m4: '', name: '', order: 10, functions: [], processChars: [] }]
        }],
        failureLinks: [],
        structureConfirmed: false
      }));

      // ★★★ 2026-03-21 FIX: suppress 해제 3초 지연
      setTimeout(() => { suppressAutoSaveRef.current = false; }, 3000);
    })();
  }, [selectedFmeaId, baseId, mode, setStateSynced, setState, setAtomicDB, setDirty, suppressAutoSaveRef]);
}
