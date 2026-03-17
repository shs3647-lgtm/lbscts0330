// CODEFREEZE-LIFTED: 2026-03-15 atomicDbLoader 경로 추가
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useWorksheetDataLoader.ts
 * @description 워크시트 데이터 로드 로직 — atomic DB 우선 로드 + legacy 폴백
 *
 * 2026-03-15 변경:
 * - atomicDbLoader.loadAtomicDB()로 먼저 로드 시도
 * - atomic 데이터 존재 시 atomicToLegacy()로 변환하여 legacy 탭 호환
 * - atomic 데이터 없으면 기존 legacy 로드 경로로 폴백
 * - 기존 로드 경로는 그대로 유지 (호환성)
 */

'use client';

import { useEffect } from 'react';
import { WorksheetState, createInitialState, uid } from '../constants';
import { FMEAWorksheetDB, createEmptyDB } from '../schema';
import { migrateToAtomicDB, convertToLegacyFormat } from '../migration';
import { loadWorksheetDB, saveWorksheetDB, loadWorksheetDBAtomic } from '../db-storage';
import { normalizeConfirmedFlags } from '@/shared/types/worksheet';
import { normalizeFailureLinks } from './useFailureLinkUtils';
import { computeCompletenessScore } from '@/lib/failure-link-utils';
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

      // ★★★ 2026-03-15: Atomic DB 직접 로드 (UUID 보존, migrateToAtomicDB 미사용) ★★★
      const atomicData = await loadAtomicDB(normalizedFmeaId);
      if (atomicData && Array.isArray(atomicData.l2Structures) && atomicData.l2Structures.length > 0) {
        // atomic 데이터가 존재하면 직접 사용 — legacy 변환은 렌더링용
        const legacyFromAtomic = atomicToLegacy(atomicData);

        // 탭 결정: URL > localStorage > DB > 'structure'
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

        // ensureL1Types 인라인 (기존 함수가 아직 정의 전이므로)
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

        console.log('[WorksheetDataLoader] Atomic DB 직접 로드 성공 — migrateToAtomicDB 스킵');
        requestAnimationFrame(() => {
          suppressAutoSaveRef.current = false;
        });
        return;
      }

      // ── FALLBACK: Atomic 데이터 없음 → 기존 legacy 로드 경로 ──
      const loadedDB = await loadWorksheetDB(normalizedFmeaId);
      const loadedAtomicDB = await loadWorksheetDBAtomic(normalizedFmeaId);

      // ★★★ 2026-02-22: 탭 유지 — URL > localStorage > DB > 현재 state > 'structure' ★★★
      // 비동기 로드 완료 시점의 최신 URL을 읽어야 함 (hydration이 이미 replaceState 했을 수 있음)
      const urlTabParam = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('tab')
        : null;

      // ★ localStorage에서 탭 복원
      let savedTab = '';
      try {
        const storedTab = localStorage.getItem(`pfmea_tab_${normalizedFmeaId}`);
        if (storedTab) {
          savedTab = storedTab;
        }
      } catch (e) { /* ignore */ }

      // ★ DB 레거시에서 탭 가져오기 (최후 폴백)
      const dbLegacyTab = (loadedDB as any)?.tab || (loadedAtomicDB as any)?.tab || '';
      if (!savedTab && dbLegacyTab) {
        savedTab = dbLegacyTab;
      }

      // ★ 최종 탭 결정: URL > localStorage > DB > 'structure'
      const legacyTab = urlTabParam || savedTab || 'structure';

      const hasDbResponse = Boolean(loadedDB) || Boolean(loadedAtomicDB);

      // 후보 스냅샷 중 가장 완성도 높은 것 선택 (순수 함수 — src/lib/failure-link-utils.ts)
      const scoreLegacy = computeCompletenessScore;

      const dbLegacyCandidate = (loadedDB && (loadedDB as any)._isLegacyDirect) ? (loadedDB as any) : null;

      let dbRiskData: { [key: string]: number | string } = {};
      if (dbLegacyCandidate && dbLegacyCandidate.riskData) {
        dbRiskData = dbLegacyCandidate.riskData;
      }

      let atomicAsLegacy: any = null;
      if (loadedAtomicDB && (loadedAtomicDB as any).l2Structures) {
        try {
          atomicAsLegacy = convertToLegacyFormat(loadedAtomicDB as any);
          const c = (loadedAtomicDB as any).confirmed || {};
          atomicAsLegacy.structureConfirmed = Boolean(c.structure ?? (loadedAtomicDB as any).l1Structure?.confirmed ?? false);
          atomicAsLegacy.l1Confirmed = Boolean(c.l1Function ?? false);
          atomicAsLegacy.l2Confirmed = Boolean(c.l2Function ?? false);
          atomicAsLegacy.l3Confirmed = Boolean(c.l3Function ?? false);
          atomicAsLegacy.failureL1Confirmed = Boolean(c.l1Failure ?? false);
          atomicAsLegacy.failureL2Confirmed = Boolean(c.l2Failure ?? false);
          atomicAsLegacy.failureL3Confirmed = Boolean(c.l3Failure ?? false);
          atomicAsLegacy.failureLinkConfirmed = Boolean(c.failureLink ?? false);

          // convertToLegacyFormat은 riskAnalyses 기반 5단계 키만 복원하므로,
          // dbRiskData에서 6단계 최적화 키(person-opt-, prevention-opt-, detection-opt- 등)를 병합
          if (Object.keys(dbRiskData).length > 0 && atomicAsLegacy.riskData) {
            const OPT_PREFIXES = ['prevention-opt-', 'detection-opt-', 'person-opt-', 'targetDate-opt-', 'completeDate-opt-', 'status-opt-', 'lesson-opt-', 'result-opt-', 'note-opt-', 'opt-', 'opt6-', 'specialChar-opt-', 'S-fe-'];
            for (const [k, v] of Object.entries(dbRiskData)) {
              if (!(k in atomicAsLegacy.riskData) && OPT_PREFIXES.some(p => k.startsWith(p))) {
                atomicAsLegacy.riskData[k] = v;
              }
            }
          }
        } catch (e) {
          console.error('[복구] 원자성→레거시 변환 실패:', e);
        }
      }

      const dbScore = scoreLegacy(dbLegacyCandidate);
      const atomicScore = scoreLegacy(atomicAsLegacy);

      // ★★★ 2026-02-02: DB Only 정책 - localStorage 후보 제거 ★★★
      const candidates: Array<{ label: string; data: any; score: number }> = [
        { label: 'dbLegacy', data: dbLegacyCandidate, score: dbScore },
        { label: 'atomicAsLegacy', data: atomicAsLegacy, score: atomicScore },
      ].filter(c => c.score > 0).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const rank = (label: string) => (label === 'atomicAsLegacy' ? 2 : 1);
        return rank(b.label) - rank(a.label);
      });

      // ★★★ 2026-03-15: Atomic DB 우선 로드 — SSoT 전환 ★★★
      if (candidates.length > 0) {
        console.log(`[WorksheetDataLoader] SSoT 선택: ${candidates[0].label} (score=${candidates[0].score})`);
      }

      // ★★★ 2026-02-09: ensureL1Types를 모든 경로에서 사용할 수 있도록 외부로 이동 ★★★
      const ensureL1Types = (l1: any) => {
        if (!l1) return { ...createInitialState().l1, name: projectL1Name };
        const currentName = l1.name || '';
        const isPlaceholder = !currentName || currentName.includes('입력') || currentName.trim() === '';
        // ★ projectL1Name(등록정보 partName 기반)이 있으면 항상 우선 적용
        // 기존 l1.name이 subject(프로젝트명)에서 온 잘못된 값일 수 있으므로
        const finalL1Name = projectL1Name || (isPlaceholder ? '' : currentName);
        const types = l1.types || [];
        // ★ DB에 types가 없으면 기본 3개 구분(YP/SP/USER)을 자동 생성
        //   각 구분마다 name='' placeholder 함수 1개 포함 (수동모드 입력용, 삭제 금지)
        if (types.length === 0) {
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

      // ★ CODEFREEZE: deduplicateL3 비활성화 (수동모드 placeholder 삭제 버그 유발)
      // const deduplicateL3 = (l2: any[]): any[] => { ... };

      const best = candidates[0];
      if (best && best.score > 0 && best.data) {
        const src = best.data;

        const dbConfirmed = dbLegacyCandidate?.confirmed || {};
        const confirmedFlags = {
          structureConfirmed: Boolean(dbConfirmed.structure || src.structureConfirmed || src.confirmed?.structure || false),
          l1Confirmed: Boolean(dbConfirmed.l1Function || src.l1Confirmed || src.confirmed?.l1Function || false),
          l2Confirmed: Boolean(dbConfirmed.l2Function || src.l2Confirmed || src.confirmed?.l2Function || false),
          l3Confirmed: Boolean(dbConfirmed.l3Function || src.l3Confirmed || src.confirmed?.l3Function || false),
          failureL1Confirmed: Boolean(dbConfirmed.l1Failure || src.failureL1Confirmed || src.confirmed?.l1Failure || false),
          failureL2Confirmed: Boolean(dbConfirmed.l2Failure || src.failureL2Confirmed || src.confirmed?.l2Failure || false),
          failureL3Confirmed: Boolean(dbConfirmed.l3Failure || src.failureL3Confirmed || src.confirmed?.l3Failure || false),
          failureLinkConfirmed: Boolean(dbConfirmed.failureLink || src.failureLinkConfirmed || src.confirmed?.failureLink || false),
        };
        const normalizedConfirmed = normalizeConfirmedFlags(confirmedFlags);

        // ★★★ 2026-02-02: DB Only 정책 - riskData는 DB 소스에서만 ★★★
        const restoredRiskData = src.riskData || {};

        const newState: WorksheetState = {
          // ★ fmeaId 명시 설정 — 파이프라인 일관성 보장 (2026-03-10)
          fmeaId: normalizedFmeaId,
          l1: ensureL1Types(src.l1),
          l2: src.l2 || [],  // ★ CODEFREEZE: deduplicateL3 제거 (버그 유발)
          tab: legacyTab,
          riskData: restoredRiskData,
          search: String(src.search || ''),
          selected: src.selected || null,
          levelView: src.levelView || 'L1',
          visibleSteps: src.visibleSteps || { step2: true, step3: true, step4: true, step5: true, step6: true },
          ...normalizedConfirmed,
          failureLinks: src.failureLinks || [],
          // ★★★ 2026-02-10: fmea4Rows 복원 (FMEA 4판 데이터) ★★★
          fmea4Rows: src.fmea4Rows || [],
        };

        // ★★★ 2026-02-23: failureLinks fallback — 선택 후보에 없으면 dbLegacy에서 복원 ★★★
        // Rule 10.5 준수: l2 할당 라인 미수정, 별도 후처리로 원본 불변
        if ((newState.failureLinks || []).length === 0 && dbLegacyCandidate?.failureLinks?.length > 0) {
          newState.failureLinks = dbLegacyCandidate.failureLinks;
        }

        // ★★★ 2026-02-16: placeholder 공정 정리 (실제 공정이 있으면 placeholder 제거) ★★★
        // Rule 10.5 준수: l2 할당 라인 미수정, 별도 후처리로 원본 불변
        const rawL2 = newState.l2 || [];
        const realProcesses = rawL2.filter((p: any) => {
          const n = (p.name || '').trim();
          return n && !n.includes('클릭하여') && !n.includes('공정 선택');
        });
        if (realProcesses.length > 0 && realProcesses.length < rawL2.length) {
          newState.l2 = realProcesses;
        }

        // ★★★ 2026-02-19: 고장분석 탭인데 상위 확정 안 됐으면 → ALL 탭으로 자동 이동 ★★★
        const failureTabs = ['failure-l1', 'failure-l2', 'failure-l3', 'failure-link'];
        if (failureTabs.includes(newState.tab)) {
          const hasData = (newState.l2 || []).some((p: any) => {
            const fms = Array.isArray(p?.failureModes) ? p.failureModes : [];
            return fms.length > 0;
          });
          if (!hasData && !newState.failureL1Confirmed && !newState.failureL2Confirmed) {
            newState.tab = 'all';
          }
        }

        // ★★★ 2026-02-25: legacyTab 직접 사용 (prev.tab 의존 제거 — React 타이밍 경합 방지) ★★★
        setStateSynced(prev => ({
          ...newState,
          tab: legacyTab,
          visibleSteps: Array.isArray(prev.visibleSteps) ? prev.visibleSteps : newState.visibleSteps,
        }));

        const derivedAtomic = loadedAtomicDB && (loadedAtomicDB as any).l2Structures
          ? (loadedAtomicDB as any)
          : migrateToAtomicDB(src);
        // ★ fmeaId 동기화 — URL의 normalizedFmeaId를 항상 우선 적용 (2026-03-10)
        derivedAtomic.fmeaId = normalizedFmeaId;
        setAtomicDB(derivedAtomic);

        // ★ src에도 fmeaId 보장 (saveWorksheetDB legacyData 인자)
        const srcWithFmeaId = src.fmeaId === normalizedFmeaId ? src : { ...src, fmeaId: normalizedFmeaId };

        // ★ 2026-03-04: requestAnimationFrame 사용 (50ms 임의 타이밍 → 렌더 사이클 후 안전 해제)
        requestAnimationFrame(() => {
          suppressAutoSaveRef.current = false;
          saveWorksheetDB(derivedAtomic, srcWithFmeaId).catch(e => console.error('[복구] DB 동기화 오류:', e));
        });

        return;
      }

      // ★★★ 2026-02-02: localStorage 레거시 데이터 로드 제거 (DB Only 정책) ★★★
      // 이 블록은 제거됨 - 모든 데이터는 DB에서만 로드

      // DB에서 레거시 데이터가 직접 반환된 경우
      if (loadedDB && (loadedDB as any)._isLegacyDirect) {
        const legacyDirect = loadedDB as any;

        const hasValidDBData = legacyDirect.l1?.name || (legacyDirect.l2 && legacyDirect.l2.length > 0);

        // ★★★ 2026-02-02: localStorage 복구 블록 제거 (DB Only 정책) ★★★
        if (!hasValidDBData) {
          setStateSynced(createInitialState());
          requestAnimationFrame(() => { suppressAutoSaveRef.current = false; });
          return;
        }

        const apiConfirmed = legacyDirect.confirmed || {};
        const confirmedFlags = {
          structureConfirmed: Boolean(legacyDirect.structureConfirmed || apiConfirmed.structure || false),
          l1Confirmed: Boolean(legacyDirect.l1Confirmed || apiConfirmed.l1Function || false),
          l2Confirmed: Boolean(legacyDirect.l2Confirmed || apiConfirmed.l2Function || false),
          l3Confirmed: Boolean(legacyDirect.l3Confirmed || apiConfirmed.l3Function || false),
          failureL1Confirmed: Boolean(legacyDirect.failureL1Confirmed || apiConfirmed.l1Failure || false),
          failureL2Confirmed: Boolean(legacyDirect.failureL2Confirmed || apiConfirmed.l2Failure || false),
          failureL3Confirmed: Boolean(legacyDirect.failureL3Confirmed || apiConfirmed.l3Failure || false),
          failureLinkConfirmed: Boolean(legacyDirect.failureLinkConfirmed || apiConfirmed.failureLink || false),
        };

        const normalizedConfirmed = normalizeConfirmedFlags(confirmedFlags);

        const newState: WorksheetState = {
          l1: ensureL1Types(legacyDirect.l1),  // ★ 2026-02-09: ensureL1Types 적용 (완제품명 연동)
          l2: legacyDirect.l2 || [],  // ★ CODEFREEZE: deduplicateL3 제거 (버그 유발)
          tab: legacyTab,
          riskData: legacyDirect.riskData || {},  // ★ DB에서 직접 로드
          search: legacyDirect.search || '',
          selected: legacyDirect.selected || null,
          levelView: legacyDirect.levelView || 'L1',
          visibleSteps: legacyDirect.visibleSteps || { step2: true, step3: true, step4: true, step5: true, step6: true },
          ...normalizedConfirmed,
          failureLinks: legacyDirect.failureLinks || [],
          // ★★★ 2026-02-10: fmea4Rows 복원 ★★★
          fmea4Rows: legacyDirect.fmea4Rows || [],
        };

        // ★★★ 2026-02-25: legacyTab 직접 사용 (prev.tab 의존 제거 — React 타이밍 경합 방지) ★★★
        setStateSynced(prev => ({
          ...newState,
          tab: legacyTab,
          visibleSteps: Array.isArray(prev.visibleSteps) ? prev.visibleSteps : newState.visibleSteps,
        }));

        const derivedAtomicDB = migrateToAtomicDB(legacyDirect);
        setAtomicDB(derivedAtomicDB);

        requestAnimationFrame(() => { suppressAutoSaveRef.current = false; });
        return;
      }

      // 원자성 DB에 실제 데이터가 있는지 확인
      const hasValidData = loadedDB && (
        (loadedDB.l1Structure && loadedDB.l1Structure.name) ||
        (loadedDB.failureEffects && loadedDB.failureEffects.length > 0) ||
        loadedDB.l2Structures.length > 0
      );

      // 원자성 DB가 있고 실제 데이터가 있는 경우
      if (hasValidData) {
        setAtomicDB(loadedDB);

        const legacy = convertToLegacyFormat(loadedDB);

        // ★★★ 2026-02-16: DB Only 정책 - localStorage에서 레거시 데이터 읽기 완전 제거 ★★★
        // l1.name은 DB 또는 등록정보에서만 복원
        const isL1Placeholder = (n: string) => !n || n.trim() === '' || n.includes('입력');
        if (loadedDB.l1Structure?.name && !isL1Placeholder(loadedDB.l1Structure.name)) {
          legacy.l1.name = loadedDB.l1Structure.name;
        } else if (projectL1Name) {
          legacy.l1.name = projectL1Name;
        }

        const finalLegacy = legacy;

        // ★ 탭 우선순위: URL > localStorage(legacyTab) > 'structure'
        setState(prev => {
          const hasExistingRiskData = Object.keys(prev.riskData || {}).length > 0;

          const src: any = finalLegacy as any;
          const normalized = normalizeConfirmedFlags({
            structureConfirmed: Boolean(src.structureConfirmed || legacy.structureConfirmed || false),
            l1Confirmed: Boolean(src.l1Confirmed || legacy.l1Confirmed || false),
            l2Confirmed: Boolean(src.l2Confirmed || legacy.l2Confirmed || false),
            l3Confirmed: Boolean(src.l3Confirmed || legacy.l3Confirmed || false),
            failureL1Confirmed: Boolean(src.failureL1Confirmed || legacy.failureL1Confirmed || false),
            failureL2Confirmed: Boolean(src.failureL2Confirmed || legacy.failureL2Confirmed || false),
            failureL3Confirmed: Boolean(src.failureL3Confirmed || legacy.failureL3Confirmed || false),
            failureLinkConfirmed: Boolean(src.failureLinkConfirmed || (legacy as any).failureLinkConfirmed || false),
          });

          // ★★★ 2026-02-09: placeholder면 등록정보 완제품명 적용 ★★★
          const rawL1Name = (finalLegacy as any)?.l1?.name || (prev as any)?.l1?.name || '';
          const l1NameIsPlaceholder = !rawL1Name || rawL1Name.trim() === '' || rawL1Name.includes('입력');
          const nextL1: any = {
            ...(finalLegacy.l1 as any),
            name: (l1NameIsPlaceholder && projectL1Name) ? projectL1Name : rawL1Name,
          };

          return {
            ...prev,
            l1: nextL1,
            l2: finalLegacy.l2 as any,
            failureLinks: finalLegacy.failureLinks || [],
            riskData: hasExistingRiskData ? prev.riskData : ((finalLegacy as any).riskData || {}),
            // ★★★ 2026-02-10: fmea4Rows 복원 ★★★
            fmea4Rows: (finalLegacy as any).fmea4Rows || (prev as any).fmea4Rows || [],
            // ★★★ 2026-02-25: legacyTab 직접 사용 (prev.tab 의존 제거 — React 타이밍 경합 방지) ★★★
            tab: legacyTab,
            structureConfirmed: normalized.structureConfirmed,
            l1Confirmed: normalized.l1Confirmed,
            l2Confirmed: normalized.l2Confirmed,
            l3Confirmed: normalized.l3Confirmed,
            failureL1Confirmed: normalized.failureL1Confirmed,
            failureL2Confirmed: normalized.failureL2Confirmed,
            failureL3Confirmed: normalized.failureL3Confirmed,
            failureLinkConfirmed: normalized.failureLinkConfirmed,
            visibleSteps: prev.visibleSteps || [2, 3, 4, 5, 6],
          };
        });
        setDirty(false);
        return;
      }

      // 레거시 데이터 로드 시도
      const keys = [`pfmea_worksheet_${normalizedFmeaId}`, `fmea-worksheet-${normalizedFmeaId}`];
      let savedData = null;
      for (const key of keys) {
        // ★ DB Only: localStorage에서 레거시 데이터 로드 비활성화
        savedData = null; // localStorage.getItem(key);
        if (savedData) break;
      }

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);

          // 고장형태 데이터 초기화 옵션
          if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('reset-fm') === 'true') {
              if (parsed.l2) {
                parsed.l2.forEach((p: any) => {
                  p.failureModes = [];
                });
                parsed.failureL2Confirmed = false;
              }

              const allKeys = Object.keys(localStorage);
              allKeys.forEach(key => {
                if (key.includes(normalizedFmeaId) && (key.includes('worksheet') || key.includes('db'))) {
                  try {
                    const data = localStorage.getItem(key);
                    if (data) {
                      const dataObj = JSON.parse(data);
                      if (dataObj.l2) {
                        dataObj.l2.forEach((p: any) => {
                          p.failureModes = [];
                        });
                        dataObj.failureL2Confirmed = false;
                      }
                      if (dataObj.failureModes) {
                        dataObj.failureModes = [];
                      }
                      if (dataObj.confirmed) {
                        dataObj.confirmed.l2Failure = false;
                      }
                      localStorage.setItem(key, JSON.stringify(dataObj));
                    }
                  } catch (e) {
                    console.error('[초기화] 키 처리 실패:', key, e);
                  }
                }
              });

              parsed.failureLinks = normalizeFailureLinks(
                parsed.failureLinks || [],
                parsed as any
              );
              localStorage.setItem(`pfmea_worksheet_${normalizedFmeaId}`, JSON.stringify(parsed));

              urlParams.delete('reset-fm');
              const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
              window.history.replaceState({}, '', newUrl);
              setTimeout(() => location.reload(), 500);
              return;
            }
          }

          const hasValidL1 = parsed.l1 && (parsed.l1.name || (parsed.l1.types && parsed.l1.types.length > 0));
          const hasValidL2 = parsed.l2 && parsed.l2.length > 0 && parsed.l2.some((p: any) => p.name && !p.name.includes('클릭'));

          if (parsed.l1 && parsed.l2 && (hasValidL1 || hasValidL2)) {
            const migratedL1 = {
              ...parsed.l1,
              name: parsed.l1.name || projectL1Name || '',
              types: parsed.l1.types || [],
              failureScopes: parsed.l1.failureScopes || []
            };

            if (!migratedL1.name || migratedL1.name.trim() === '') {
              const atomicKey = `pfmea_atomic_${normalizedFmeaId}`;
              const atomicData = localStorage.getItem(atomicKey);
              if (atomicData) {
                try {
                  const atomicParsed = JSON.parse(atomicData);
                  if (atomicParsed.l1Structure?.name) {
                    migratedL1.name = atomicParsed.l1Structure.name;
                  }
                } catch (e) {
                  console.error('[데이터 로드] 원자성 DB 파싱 실패:', e);
                }
              }
            }

            const isEmptyValue = (val: string | undefined | null): boolean => {
              if (!val) return true;
              const trimmed = String(val).trim();
              return trimmed === '' || trimmed === '-';
            };

            const migratedL2 = parsed.l2
              .filter((p: any) => {
                const hasName = !isEmptyValue(p.name);
                const hasL3 = (p.l3 || []).length > 0;
                const hasFunctions = (p.functions || []).length > 0;
                return hasName || hasL3 || hasFunctions;
              })
              .map((p: any) => {
                const allProductChars = (p.functions || []).flatMap((f: any) => f.productChars || []);
                const migratedFailureModes = (p.failureModes || []).map((fm: any) => {
                  if (fm.productCharId) return fm;
                  const firstPC = allProductChars[0];
                  if (firstPC) {
                    return { ...fm, productCharId: firstPC.id };
                  }
                  return fm;
                });

                return {
                  ...p,
                  functions: p.functions || [],
                  productChars: p.productChars || [],
                  failureModes: migratedFailureModes,
                  l3: (p.l3 || [])
                    .filter((we: any) => {
                      const hasName = !isEmptyValue(we.name);
                      const hasM4 = !isEmptyValue(we.m4);
                      const hasFunctions = (we.functions || []).length > 0;
                      return hasName || hasM4 || hasFunctions;
                    })
                    .map((we: any) => ({
                      ...we,
                      // ★ 레거시 4M 매핑: MT → IM, HM → MN
                      m4: we.m4 === 'MT' ? 'IM' : we.m4 === 'HM' ? 'MN' : (we.m4 || ''),
                      functions: we.functions || [],
                      processChars: we.processChars || [],
                      failureCauses: we.failureCauses || []
                    }))
                };
              });

            const mergedConfirmed = normalizeConfirmedFlags({
              structureConfirmed: Boolean(parsed.structureConfirmed ?? parsed.confirmed?.structure ?? false),
              l1Confirmed: Boolean(parsed.l1Confirmed ?? parsed.confirmed?.l1Function ?? false),
              l2Confirmed: Boolean(parsed.l2Confirmed ?? parsed.confirmed?.l2Function ?? false),
              l3Confirmed: Boolean(parsed.l3Confirmed ?? parsed.confirmed?.l3Function ?? false),
              failureL1Confirmed: Boolean(parsed.failureL1Confirmed ?? parsed.confirmed?.l1Failure ?? false),
              failureL2Confirmed: Boolean(parsed.failureL2Confirmed ?? parsed.confirmed?.l2Failure ?? false),
              failureL3Confirmed: Boolean(parsed.failureL3Confirmed ?? parsed.confirmed?.l3Failure ?? false),
              failureLinkConfirmed: Boolean(parsed.failureLinkConfirmed ?? parsed.confirmed?.failureLink ?? false),
            });

            const atomicData = migrateToAtomicDB({
              fmeaId: normalizedFmeaId,
              l1: migratedL1,
              l2: migratedL2,
              failureLinks: parsed.failureLinks || [],
              riskData: parsed.riskData || {},
              structureConfirmed: mergedConfirmed.structureConfirmed,
              l1Confirmed: mergedConfirmed.l1Confirmed,
              l2Confirmed: mergedConfirmed.l2Confirmed,
              l3Confirmed: mergedConfirmed.l3Confirmed,
              failureL1Confirmed: mergedConfirmed.failureL1Confirmed,
              failureL2Confirmed: mergedConfirmed.failureL2Confirmed,
              failureL3Confirmed: mergedConfirmed.failureL3Confirmed,
            });
            setAtomicDB(atomicData);
            saveWorksheetDB(atomicData, parsed).catch(e => console.error('[마이그레이션] DB 저장 오류:', e));

            setState(prev => {
              const hasExistingRiskData = Object.keys(prev.riskData || {}).length > 0;
              const parsedRiskData = parsed.riskData || {};
              const hasNewRiskData = Object.keys(parsedRiskData).length > 0;

              return {
                ...prev,
                l1: migratedL1,
                l2: migratedL2,
                failureLinks: parsed.failureLinks || [],
                riskData: hasExistingRiskData ? prev.riskData : (hasNewRiskData ? parsedRiskData : prev.riskData),
                // ★★★ 2026-02-10: fmea4Rows 복원 ★★★
                fmea4Rows: parsed.fmea4Rows || (prev as any).fmea4Rows || [],
                tab: parsed.tab || prev.tab,
                structureConfirmed: mergedConfirmed.structureConfirmed,
                l1Confirmed: mergedConfirmed.l1Confirmed,
                l2Confirmed: mergedConfirmed.l2Confirmed,
                l3Confirmed: mergedConfirmed.l3Confirmed,
                failureL1Confirmed: mergedConfirmed.failureL1Confirmed,
                failureL2Confirmed: mergedConfirmed.failureL2Confirmed,
                failureL3Confirmed: mergedConfirmed.failureL3Confirmed,
                failureLinkConfirmed: mergedConfirmed.failureLinkConfirmed,
                visibleSteps: prev.visibleSteps || [2, 3, 4, 5, 6],
              };
            });
            setDirty(false);
          } else {
            const emptyDB = createEmptyDB(normalizedFmeaId);
            setAtomicDB(emptyDB);

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
            setDirty(false);
          }
        } catch (e) {
          console.error('데이터 파싱 오류:', e);
        }
      } else {
        const emptyDB = createEmptyDB(normalizedFmeaId);
        setAtomicDB(emptyDB);

        // ★★★ 2026-02-02: DB에서 로드한 projectL1Name 사용 (localStorage 제거) ★★★
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
      }
    })();
  }, [selectedFmeaId, baseId, mode, setStateSynced, setState, setAtomicDB, setDirty, suppressAutoSaveRef]);
}
