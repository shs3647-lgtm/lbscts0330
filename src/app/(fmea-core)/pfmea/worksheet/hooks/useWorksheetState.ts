// CODEFREEZE
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useWorksheetState.ts
 * @description FMEA 워크시트 상태 관리 Hook (모듈화 버전)
 * @version 3.0.0 - 저장/로드 로직 분리
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

'use client';

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  WorksheetState,
  FMEAProject,
  Process,
  WorkElement,
  FlatRow,
  createInitialState,
  uid
} from '../constants';
import {
  FMEAWorksheetDB,
  FlattenedRow,
  flattenDB,
} from '../schema';
import { migrateToAtomicDB, convertToLegacyFormat } from '../migration';
import { saveWorksheetDB, loadWorksheetDBAtomic } from '../db-storage';
import { normalizeConfirmedFlags } from '@/shared/types/worksheet';
import { calculateFlatRows, calculateSpans, calculateL1Spans } from './useRowsCalculation';
import { useWorksheetSave } from './useWorksheetSave';
import { useWorksheetDataLoader } from './useWorksheetDataLoader';
import { normalizeFailureLinks } from './useFailureLinkUtils';

interface UseWorksheetStateReturn {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced: (updater: React.SetStateAction<WorksheetState>) => void;
  dirty: boolean;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  lastSaved: string;
  fmeaList: FMEAProject[];
  currentFmea: FMEAProject | null;
  selectedFmeaId: string | null;
  handleFmeaChange: (fmeaId: string) => void;
  rows: FlatRow[];
  l1Spans: number[];
  l1TypeSpans: number[];
  l1FuncSpans: number[];
  l2Spans: number[];
  saveToLocalStorage: () => void;
  saveToLocalStorageOnly: () => void;
  handleInputKeyDown: (e: React.KeyboardEvent) => void;
  handleInputBlur: () => void;
  handleSelect: (type: 'L1' | 'L2' | 'L3', id: string | null) => void;
  addL2: () => void;
  addL3: (l2Id: string) => void;
  deleteL2: (l2Id: string) => void;
  deleteL3: (l2Id: string, l3Id: string) => void;
  handleProcessSelect: (selectedProcesses: Array<{ processNo: string; processName: string }>) => void;
  atomicDB: FMEAWorksheetDB | null;
  setAtomicDB: React.Dispatch<React.SetStateAction<FMEAWorksheetDB | null>>;
  flattenedRows: FlattenedRow[];
  saveAtomicDB: (force?: boolean) => void;
  suppressAutoSaveRef: React.MutableRefObject<boolean>;  // ★ 2026-02-18
}

export function useWorksheetState(): UseWorksheetStateReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedFmeaId = searchParams.get('id')?.toLowerCase() || searchParams.get('fmeaId')?.toLowerCase() || null;  // ✅ DB 소문자 일관성 + fmeaId 폴백
  const baseId = searchParams.get('baseId')?.toLowerCase() || null;  // ✅ DB 소문자 일관성
  const mode = searchParams.get('mode');
  const urlTab = searchParams.get('tab') || null;
  const compareEmbed = searchParams.get('compareEmbed') === '1';

  const [state, setState] = useState<WorksheetState>(createInitialState);
  const [isHydrated, setIsHydrated] = useState(false);
  // ★★★ 2026-02-18: 초기값 TRUE - 데이터 로드 완료 전 자동저장 차단 (빈 데이터 DB 덮어쓰기 방지) ★★★
  const suppressAutoSaveRef = useRef<boolean>(true);

  // Hydration useEffect
  useEffect(() => {
    setIsHydrated(true);

    const urlParams = new URLSearchParams(window.location.search);
    const fmeaId = urlParams.get('id')?.toLowerCase();  // ✅ DB 소문자 일관성
    if (!fmeaId) return;

    const urlTabParam = urlParams.get('tab');
    const compareEmbedParam = urlParams.get('compareEmbed') === '1';

    let savedTab = '';
    const savedRiskData: { [key: string]: number | string } = {};

    /** 비교 뷰 iframe: 부모 URL의 tab만 사용 — FMEA별 localStorage 탭이 좌우 불일치 유발 */
    if (urlTabParam) {
      savedTab = urlTabParam;
    } else if (!compareEmbedParam) {
      try {
        const tabStr = localStorage.getItem(`pfmea_tab_${fmeaId}`);
        if (tabStr) {
          savedTab = tabStr;
        }
      } catch (e) { /* ignore */ }
    }

    // ★★★ 2026-02-16: DB Only 정책 - localStorage에서 riskData 읽기 제거 ★★★
    // riskData는 DB의 riskAnalyses에서 convertToLegacyFormat으로 복원됨


    // ★ visibleSteps 복원 (ALL 탭에서 마지막으로 보던 단계) — 비교 iframe은 동기화 위해 스킵
    let savedVisibleSteps: number[] | null = null;
    if (!compareEmbedParam) {
      try {
        const vsStr = localStorage.getItem(`pfmea_visibleSteps_${fmeaId}`);
        if (vsStr) {
          const parsed = JSON.parse(vsStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            savedVisibleSteps = parsed;
          }
        }
      } catch (e) { /* ignore */ }
    }

    if (savedTab || savedVisibleSteps || Object.keys(savedRiskData).length > 0) {
      setState(prev => ({
        ...prev,
        ...(savedTab && { tab: savedTab }),
        ...(savedVisibleSteps && { visibleSteps: savedVisibleSteps }),
        ...(Object.keys(savedRiskData).length > 0 && { riskData: savedRiskData }),
      }));
    }
  }, []);

  // ★★★ 2026-02-25: 탭 변경 시 localStorage + URL 파라미터 동시 저장 ★★★
  // ★★★ 2026-03-23: fmeaId는 useSearchParams(selectedFmeaId) 우선 — window.location과 불일치 시
  //    드롭다운 전환 직후 탭 클릭이 이전 id로 replaceState 하며 URL을 덮어쓰는 버그 방지
  // 'structure'는 기본값이므로 저장하지 않음 (초기 렌더 시 오염 방지)
  useEffect(() => {
    if (!isHydrated || !state.tab) return;
    /** 비교 뷰 iframe: 부모가 tab 쿼리로 제어 — replaceState로 덮어쓰지 않음 */
    if (compareEmbed) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fromWindow =
        urlParams.get('id')?.toLowerCase() || urlParams.get('fmeaId')?.toLowerCase() || '';
      const canonicalId = (selectedFmeaId || fromWindow || '').toLowerCase();
      if (!canonicalId) return;

      if (urlParams.get('id')?.toLowerCase() !== canonicalId) {
        urlParams.set('id', canonicalId);
      }

      if (state.tab === 'structure') {
        let changed = false;
        if (urlParams.has('tab')) {
          urlParams.delete('tab');
          changed = true;
        }
        if (urlParams.get('id')?.toLowerCase() !== canonicalId) {
          urlParams.set('id', canonicalId);
          changed = true;
        }
        if (changed) {
          const newUrl = urlParams.toString()
            ? window.location.pathname + '?' + urlParams.toString()
            : window.location.pathname + '?id=' + encodeURIComponent(canonicalId);
          window.history.replaceState({}, '', newUrl);
        }
        return;
      }

      localStorage.setItem(`pfmea_tab_${canonicalId}`, state.tab);
      const needTab = urlParams.get('tab') !== state.tab;
      const needId = urlParams.get('id')?.toLowerCase() !== canonicalId;
      if (needTab || needId) {
        urlParams.set('id', canonicalId);
        urlParams.set('tab', state.tab);
        const newUrl = window.location.pathname + '?' + urlParams.toString();
        window.history.replaceState({}, '', newUrl);
      }
    } catch (e) { console.error('[탭 저장 오류]', e); }
  }, [state.tab, isHydrated, selectedFmeaId, compareEmbed]);

  // ★★★ 2026-02-22: visibleSteps 변경 시 localStorage 저장 (ALL 탭 스크롤 위치 복원용) ★★★
  useEffect(() => {
    if (!isHydrated) return;
    if (compareEmbed) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fromWindow =
        urlParams.get('id')?.toLowerCase() || urlParams.get('fmeaId')?.toLowerCase() || '';
      const canonicalId = (selectedFmeaId || fromWindow || '').toLowerCase();
      if (canonicalId && Array.isArray(state.visibleSteps)) {
        localStorage.setItem(`pfmea_visibleSteps_${canonicalId}`, JSON.stringify(state.visibleSteps));
      }
    } catch (e) { console.error('[visibleSteps 저장 오류]', e); }
  }, [state.visibleSteps, isHydrated, selectedFmeaId, compareEmbed]);

  const [atomicDB, _setAtomicDB] = useState<FMEAWorksheetDB | null>(null);
  const atomicDBRef = useRef<FMEAWorksheetDB | null>(null);
  // setAtomicDB: state + ref 동시 갱신 (save에서 ref로 최신 값 읽음)
  const setAtomicDB: React.Dispatch<React.SetStateAction<FMEAWorksheetDB | null>> = useCallback((action) => {
    _setAtomicDB(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      atomicDBRef.current = next;
      return next;
    });
  }, []);
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState('');
  const [fmeaList, setFmeaList] = useState<FMEAProject[]>([]);
  const [fmeaListLoaded, setFmeaListLoaded] = useState(false);
  const [currentFmea, setCurrentFmea] = useState<FMEAProject | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stateRef = useRef(state);

  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * React 큐의 최신 prev를 사용한다 (stateRef 직접 호출만 하면 배치/Strict Mode와 어긋날 수 있음).
   * 함수형 setState로 전달해야 하위에서 createStrictModeDedupedUpdater가 이중 호출을 흡수할 수 있다.
   */
  const setStateSynced = useCallback((updater: React.SetStateAction<WorksheetState>) => {
    setState((prev) => {
      const next =
        typeof updater === 'function'
          ? (updater as (p: WorksheetState) => WorksheetState)(prev)
          : updater;
      stateRef.current = next;
      return next;
    });
  }, []);

  // Save hooks (P2)
  const { saveAtomicDB, saveToLocalStorage, saveToLocalStorageOnly } = useWorksheetSave({
    selectedFmeaId,
    currentFmea,
    atomicDB,
    setAtomicDB,
    atomicDBRef,
    stateRef,
    suppressAutoSaveRef,
    setIsSaving,
    setDirty,
    setLastSaved,
  });

  // Data loader (P1)
  useWorksheetDataLoader({
    selectedFmeaId,
    baseId,
    mode,
    setStateSynced,
    setState,
    setAtomicDB,
    setDirty,
    suppressAutoSaveRef,
  });

  // ★ P1-2: DB에서 로드된 failureLinks 정규화 (ID-텍스트 매핑 복구)
  const failureLinkNormalizedRef = useRef<string | null>(null);
  useEffect(() => {
    const links = (state as any).failureLinks;
    if (!links || links.length === 0 || state.l2.length === 0) return;

    const stateKey = `${selectedFmeaId}_${links.length}_${state.l2.length}`;
    if (failureLinkNormalizedRef.current === stateKey) return;

    const normalized = normalizeFailureLinks(links, state);
    const changed = JSON.stringify(normalized) !== JSON.stringify(links);
    if (changed) {
      failureLinkNormalizedRef.current = stateKey;
      setState(prev => ({ ...prev, failureLinks: normalized } as any));
    } else {
      failureLinkNormalizedRef.current = stateKey;
    }
  }, [selectedFmeaId, (state as any).failureLinks, state.l2]);

  // ★★★ 2026-02-02: 페이지 이탈 시 즉시 저장 (다른 화면 갔다와도 데이터 유지) ★★★
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ★★★ 2026-02-16: DB Only 정책 - beforeUnload localStorage 쓰기 완전 제거 ★★★
    // 탭 전환/종료 시 비동기 DB 저장만 시도
    const handleBeforeUnload = () => {
      // localStorage 쓰기 제거 - DB에 이미 자동저장되어 있음
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 비동기 DB 저장 시도
        saveAtomicDB?.()?.catch(() => { });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedFmeaId, saveAtomicDB]);

  // ★★★ 2026-02-16: DB Only 정책 - FMEA 목록은 DB에서만 로드 ★★★
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadFmeaList = async () => {
      try {
        const res = await fetch('/api/fmea/projects?type=P');
        if (res.ok) {
          const data = await res.json();
          // ★ DB 연결 실패 감지: dbError 플래그 체크
          if (data.dbError) {
            console.error('[PFMEA] DB 연결 실패:', data.error);
            // DB 실패 시 fmeaList를 건드리지 않음 — confirm 트리거 방지
            return;
          }
          if (data.success && data.projects) {
            const projects = data.projects.map((item: any) => ({
              id: item.fmeaNo || item.id,
              fmeaInfo: {
                subject: item.subject || item.fmeaInfo?.subject || '',
                fmeaRevisionDate: item.fmeaRevisionDate || item.fmeaInfo?.fmeaRevisionDate || '',
                customerName: item.customerName || item.fmeaInfo?.customerName || '',
              },
              project: { productName: item.productName || item.project?.productName || '' },
            }));
            setFmeaList(projects);
            setFmeaListLoaded(true);

            if (selectedFmeaId) {
              let found = projects.find((p: any) => p.id?.toLowerCase() === selectedFmeaId.toLowerCase());
              
              // ★ 2026-03-25: Master FMEA (type=M) 등 P타입이 아닌 경우 별도 조회
              if (!found) {
                try {
                  const singleRes = await fetch(`/api/fmea/projects?id=${encodeURIComponent(selectedFmeaId.toLowerCase())}`);
                  if (singleRes.ok) {
                    const singleData = await singleRes.json();
                    if (singleData.success && singleData.projects?.length > 0) {
                      const item = singleData.projects[0];
                      found = {
                        id: item.fmeaNo || item.id,
                        fmeaInfo: {
                          subject: item.subject || item.fmeaInfo?.subject || '',
                          fmeaRevisionDate: item.fmeaRevisionDate || item.fmeaInfo?.fmeaRevisionDate || '',
                          customerName: item.customerName || item.fmeaInfo?.customerName || '',
                        },
                        project: { productName: item.productName || item.project?.productName || '' },
                      };
                    }
                  }
                } catch (e) { console.error('Failed to load specific Master FMEA:', e); }
              }

              if (found) {
                setCurrentFmea(found);
              } else if (!compareEmbed) { // iframe 비교뷰에서는 경고창 및 리다이렉트 생략
                // ★★★ 2026-02-16: selectedFmeaId가 있지만 프로젝트 목록에 없는 경우 ★★★
                // → 경고 메시지 + 등록 화면으로 이동
                setCurrentFmea(null);
                const goToRegister = window.confirm(
                  `PFMEA/Master 프로젝트가 등록되지 않았습니다.\n\n` +
                  `FMEA ID: ${selectedFmeaId}\n\n` +
                  `프로젝트 등록 화면으로 이동하시겠습니까?\n` +
                  `(등록 후 기초정보 Import → 워크시트 순서로 진행해주세요)`
                );
                if (goToRegister) {
                  router.push(`/pfmea/register?id=${encodeURIComponent(selectedFmeaId)}`);
                }
              }
            }
            return;
          }
        }
      } catch (error) {
        console.error('[PFMEA] DB API 호출 실패 (네트워크):', error);
        // ★ 네트워크 실패 시 fmeaList를 건드리지 않음 — 잘못된 confirm 방지
        return;
      }

      // DB 정상 응답이지만 데이터 없으면 빈 목록
      setFmeaList([]);
      setFmeaListLoaded(true);
    };

    loadFmeaList();
  }, [selectedFmeaId]);

  // ✅ FMEA ID 없이 진입 시 자동 선택 (프로젝트 1개일 때만)
  // ★★★ 프로젝트 0개 → 등록 화면으로 안내
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedFmeaId) return;
    if (!fmeaListLoaded) return;

    if (fmeaList.length === 1) {
      const onlyProject = fmeaList[0];
      if (!onlyProject?.id) return;

      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const nextUrl = `/pfmea/worksheet?id=${onlyProject.id}${tabParam ? `&tab=${tabParam}` : ''}`;

      setCurrentFmea(onlyProject);
      router.push(nextUrl);
    } else if (fmeaList.length === 0) {
      // ★★★ 2026-02-16: 등록된 PFMEA가 없으면 등록 화면으로 안내 ★★★
      const goToRegister = window.confirm(
        `등록된 PFMEA 프로젝트가 없습니다.\n\n` +
        `프로젝트 등록 화면으로 이동하시겠습니까?\n` +
        `(등록 → 기초정보 Import → 워크시트 순서로 진행해주세요)`
      );
      if (goToRegister) {
        router.push('/pfmea/register');
      }
    }
  }, [selectedFmeaId, fmeaList, fmeaListLoaded, router]);

  // 상속 모드 처리
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedFmeaId) return;
    if (!baseId || mode !== 'inherit') return;


    (async () => {
      suppressAutoSaveRef.current = true;

      const baseAtomicDB = await loadWorksheetDBAtomic(baseId);

      if (!baseAtomicDB) {
        console.error('[상속 모드] 원본 FMEA 데이터를 찾을 수 없습니다:', baseId);
        suppressAutoSaveRef.current = false;
        return;
      }

      const baseLegacy: any = convertToLegacyFormat(baseAtomicDB as any);

      if (baseLegacy) {
        const confirmedFlags = normalizeConfirmedFlags({
          structureConfirmed: Boolean(baseLegacy.structureConfirmed ?? false),
          l1Confirmed: Boolean(baseLegacy.l1Confirmed ?? false),
          l2Confirmed: Boolean(baseLegacy.l2Confirmed ?? false),
          l3Confirmed: Boolean(baseLegacy.l3Confirmed ?? false),
          failureL1Confirmed: Boolean(baseLegacy.failureL1Confirmed ?? false),
          failureL2Confirmed: Boolean(baseLegacy.failureL2Confirmed ?? false),
          failureL3Confirmed: Boolean(baseLegacy.failureL3Confirmed ?? false),
          failureLinkConfirmed: Boolean(baseLegacy.failureLinkConfirmed ?? false),
        });

        const newState: WorksheetState = {
          l1: baseLegacy.l1 || createInitialState().l1,
          l2: baseLegacy.l2 || [],
          tab: 'structure',
          riskData: baseLegacy.riskData || {},
          search: '',
          selected: baseLegacy.selected || { type: 'L1' as const, id: null },
          levelView: baseLegacy.levelView || 'L1',
          visibleSteps: baseLegacy.visibleSteps || { step2: true, step3: true, step4: true, step5: true, step6: true },
          ...confirmedFlags,
          failureLinks: baseLegacy.failureLinks || [],
        };


        setStateSynced(newState);

        const newAtomicDB = migrateToAtomicDB({
          ...baseLegacy,
          fmeaId: selectedFmeaId,
        });
        newAtomicDB.fmeaId = selectedFmeaId;
        setAtomicDB(newAtomicDB);

        await saveWorksheetDB(newAtomicDB);

        setTimeout(() => {
          suppressAutoSaveRef.current = false;
        }, 1500);
      }
    })();
  }, [selectedFmeaId, baseId, mode, setState]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveToLocalStorage(); }
  }, [saveToLocalStorage]);

  const handleInputBlur = useCallback(() => {
    saveToLocalStorage();
  }, [saveToLocalStorage]);

  const handleFmeaChange = useCallback((fmeaId: string) => {
    if (fmeaId) {
      // ★ 2026-03-10: 프로젝트 전환 시 즉시 structure 탭으로 리셋
      // React client-side navigation에서 state가 리마운트되지 않아 이전 탭(예: 'all')이 유지되는 버그 방지
      setState(prev => ({ ...prev, tab: 'structure' }));
      router.push(`/pfmea/worksheet?id=${fmeaId}`);
    }
  }, [router, setState]);

  const handleSelect = useCallback((type: 'L1' | 'L2' | 'L3', id: string | null) => {
    setState(prev => ({ ...prev, selected: { type, id } }));
  }, []);

  const addL2 = useCallback(() => {
    const newProcess: Process = {
      id: uid(), no: '', name: '', order: (state.l2.length + 1) * 10,
      functions: [], productChars: [],
      l3: [{ id: uid(), m4: '', name: '', order: 10, functions: [], processChars: [] }]
    };
    // ★ 2026-02-20: setState → setStateSynced (stateRef 즉시 동기화 → DB 저장 타이밍 안정)
    setStateSynced(prev => ({ ...prev, l2: [...prev.l2, newProcess] }));
    setDirty(true);
  }, [state.l2.length, setStateSynced]);

  const addL3 = useCallback((l2Id: string) => {
    const newElement: WorkElement = {
      id: uid(), m4: '', name: '', order: 10,
      functions: [], processChars: []
    };
    // ★ 2026-02-20: setState → setStateSynced (stateRef 즉시 동기화 → DB 저장 타이밍 안정)
    setStateSynced(prev => ({
      ...prev,
      l2: prev.l2.map(p => p.id === l2Id ? { ...p, l3: [...p.l3, newElement] } : p)
    }));
    setDirty(true);
  }, [setStateSynced]);

  const deleteL2 = useCallback((l2Id: string) => {
    if (state.l2.length <= 1) {
      alert('최소 1개의 공정이 필요합니다.');
      return;
    }
    // ★ 2026-02-20: setState → setStateSynced
    // ★ 2026-03-07: 삭제된 L2의 FM/FC → failureLinks orphan 방지
    setStateSynced(prev => {
      const deletedProc = prev.l2.find(p => p.id === l2Id);
      const deletedFmIds = new Set<string>();
      const deletedFcIds = new Set<string>();
      if (deletedProc) {
        (deletedProc.failureModes || []).forEach(m => { if (m.id) deletedFmIds.add(m.id); });
        (deletedProc.failureCauses || []).forEach(c => { if (c.id) deletedFcIds.add(c.id); });
      }
      const cleanedLinks = (deletedFmIds.size > 0 || deletedFcIds.size > 0)
        ? (prev.failureLinks || []).filter(link => {
            if (link.fmId && deletedFmIds.has(link.fmId)) return false;
            if (link.fcId && deletedFcIds.has(link.fcId)) return false;
            return true;
          })
        : prev.failureLinks;
      return { ...prev, l2: prev.l2.filter(p => p.id !== l2Id), failureLinks: cleanedLinks };
    });
    setDirty(true);
  }, [state.l2.length, setStateSynced]);

  const deleteL3 = useCallback((l2Id: string, l3Id: string) => {
    // ★ 2026-02-20: setState → setStateSynced
    // ★ 2026-03-07: 삭제된 L3의 FC → failureLinks orphan 방지
    setStateSynced(prev => {
      const targetProc = prev.l2.find(p => p.id === l2Id);
      if (targetProc && targetProc.l3.length <= 1) {
        alert('최소 1개의 작업요소가 필요합니다.');
        return prev;
      }
      // L3에 연결된 processChar → FC → failureLinks 정리
      const deletedFcIds = new Set<string>();
      const targetL3 = (targetProc?.l3 || []).find(w => w.id === l3Id);
      const charIds = new Set<string>();
      (targetL3?.functions || []).forEach((f: any) =>
        (f.processChars || []).forEach((pc: any) => { if (pc.id) charIds.add(pc.id); })
      );
      if (charIds.size > 0) {
        (targetProc?.failureCauses || []).forEach((c: any) => {
          if (c.processCharId && charIds.has(c.processCharId) && c.id) deletedFcIds.add(c.id);
        });
      }
      const cleanedLinks = deletedFcIds.size > 0
        ? (prev.failureLinks || []).filter(link => !(link.fcId && deletedFcIds.has(link.fcId)))
        : prev.failureLinks;
      return {
        ...prev,
        l2: prev.l2.map(p => {
          if (p.id === l2Id) {
            return { ...p, l3: p.l3.filter(w => w.id !== l3Id) };
          }
          return p;
        }),
        failureLinks: cleanedLinks,
      };
    });
    setDirty(true);
  }, [setStateSynced]);

  const handleProcessSelect = useCallback((selectedProcesses: Array<{ processNo: string; processName: string }>) => {
    const duplicates = selectedProcesses.filter((p, idx, arr) =>
      arr.findIndex(x => x.processName === p.processName) !== idx
    );
    if (duplicates.length > 0) {
      const dupNames = [...new Set(duplicates.map(d => d.processName))].join(', ');
      alert(`⚠️ 중복 공정이 제거되었습니다: ${dupNames}`);
    }
    const uniqueProcesses = selectedProcesses.filter((p, idx, arr) =>
      arr.findIndex(x => x.processName === p.processName) === idx
    );
    const selectedNames = new Set(uniqueProcesses.map(p => p.processName));

    // ★ 2026-02-20: setState → setStateSynced (stateRef 즉시 동기화)
    setStateSynced(prev => {
      const keptProcesses = prev.l2.filter(p => {
        if (!p.name?.trim()) {
          return false;
        }
        return selectedNames.has(p.name);
      });

      const existingNames = new Set(keptProcesses.map(p => p.name));
      const newProcesses: Process[] = uniqueProcesses
        .filter(p => !existingNames.has(p.processName))
        .map((p, idx) => ({
          id: uid(),
          no: p.processNo,
          name: p.processName,
          order: (keptProcesses.length + idx + 1) * 10,
          functions: [],
          productChars: [],
          l3: [{ id: uid(), m4: '', name: '', order: 10, functions: [], processChars: [] }]
        }));

      const result = [...keptProcesses, ...newProcesses];

      // ✅ 공정번호 숫자 순 정렬 (10, 20, 100, 110 순서)
      result.sort((a, b) => {
        const numA = parseInt(a.no?.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.no?.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });

      if (result.length === 0) {
        return {
          ...prev,
          l2: [{
            id: uid(),
            no: '',
            name: '',
            order: 10,
            functions: [],
            productChars: [],
            l3: [{ id: uid(), m4: '', name: '', order: 10, functions: [], processChars: [] }]
          }]
        };
      }

      return { ...prev, l2: result };
    });
    setDirty(true);
  }, [setStateSynced]);

  // 원자성 DB 기반 평탄화된 행
  const flattenedRows = useMemo(() => {
    if (!atomicDB) return [];
    return flattenDB(atomicDB);
  }, [atomicDB]);

  // 레거시 평탄화
  // ★★★ 2026-02-09: placeholder 공정 필터링 (빈 행 재발 근본 방지) ★★★
  const rows = useMemo(() => {
    const currentTab = state.tab || '';
    const failureLinks = (state as any).failureLinks || [];
    // ★★★ 2026-03-27: placeholder 필터링 완전 제거 — 빈 이름도 수동 추가 행
    return calculateFlatRows(state, currentTab, failureLinks);
  }, [state.l1, state.l2, state.tab, (state as any).failureLinks]);

  // Span 계산
  const l1Spans = useMemo(() => calculateL1Spans(rows), [rows]);
  const l1TypeSpans = useMemo(() => calculateSpans(rows, 'l1TypeId'), [rows]);
  const l1FuncSpans = useMemo(() => calculateSpans(rows, 'l1FunctionId'), [rows]);
  const l2Spans = useMemo(() => calculateSpans(rows, 'l2Id'), [rows]);

  return {
    state, setState, setStateSynced, dirty, setDirty, isSaving, lastSaved, fmeaList, currentFmea, selectedFmeaId, handleFmeaChange,
    rows, l1Spans, l1TypeSpans, l1FuncSpans, l2Spans,
    saveToLocalStorage,
    saveToLocalStorageOnly,
    suppressAutoSaveRef,  // ★ 2026-02-18: 데이터 로드 중 저장 차단
    handleInputKeyDown, handleInputBlur, handleSelect, addL2, addL3, deleteL2, deleteL3, handleProcessSelect,
    atomicDB, setAtomicDB, flattenedRows, saveAtomicDB,
  };
}
