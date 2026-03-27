'use client';

/**
 * @file page.tsx
 * @description FMEA 워크시트 메인 페이지
 * @author AI Assistant
 * @created 2025-12-27
 * @refactored 모듈화 - constants, hooks, tabs 분리
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

import React, { useState, useCallback, useMemo, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import PFMEATopNav from '@/components/layout/PFMEATopNav';
import { SidebarRouter } from '@/components/layout';

// 모듈화된 상수, hooks
import { COLORS, uid, getTabLabel, WorksheetState, WorkElement, Process } from './constants';
import { btnConfirm, btnEdit, badgeConfirmed, badgeOk, badgeMissing } from '@/styles/worksheet';
import { useWorksheetState, useCpSync, useExcelHandlers, useProcessHandlers } from './hooks';
import { useAuth } from '@/hooks/useAuth';
import { useSpecialCharVerify } from './hooks/useSpecialCharVerify';
import { useImportVerify } from './hooks/useImportVerify';
import { useAutoTabAdvance } from './hooks/useAutoTabAdvance';
import { useSaveListener } from './hooks/useSaveEvent';
import { useArrayGuard } from './hooks/useArrayGuard';
import {
  StructureTab, StructureColgroup, StructureHeader, StructureRow,
  FunctionTab, FunctionColgroup, FunctionHeader, FunctionRow,
  FailureTab, FailureColgroup, FailureHeader, FailureRow,
  RiskTab, RiskHeader, RiskRow,
  OptTab, OptHeader, OptRow,
  DocTab, DocHeader, DocRow,
} from './tabs';
import { FailureTab as FailureTabNew } from './tabs/failure';
// ✅ excel-export: ES dynamic import() — 사용자 액션(버튼 클릭) 시점에 로드 (초기 번들 제외)
import APTableModal from '@/components/modals/APTableModal';
import {
  groupFailureLinksWithFunctionData,
  groupByProcessName,
  calculateLastRowMerge,
  type FMGroup
} from './utils';
import { getPanelById } from './panels';
// ★ 2026-03-07: page.xyz placeholder 컨텍스트 메뉴 제거 → 각 탭이 자체 PfmeaContextMenu 관리
// import { PfmeaContextMenu, initialPfmeaContextMenu, PfmeaContextMenuState } from './components/PfmeaContextMenu';
import { useBackupTrigger } from './hooks/useBackupTrigger';
import { getStepNumber } from './components/TabFullComponents';
import { registerSaveErrorCallback, unregisterSaveErrorCallback, setupBeforeUnloadGuard } from './db-storage';
import { toast } from '@/hooks/useToast';
import { DEFAULT_COMPARE_MASTER_FMEA_ID, normalizeCompareTab } from '../compare/constants';
import CompareEmbedToolbar from './components/CompareEmbedToolbar';
// ✅ convertToFmea4: Fmea4Tab 컴포넌트 내부에서 사용 (page.tsx에서 미사용 → import 제거)

// ✅ 대용량 컴포넌트 Dynamic Import — 초기 번들 경량화
const TopMenuBar = dynamic(() => import('./components/TopMenuBar'), { ssr: false });
const TabMenu = dynamic(() => import('./components/TabMenu'), { ssr: false });
const StructureTabFull = dynamic(() => import('./components/TabFullComponents').then(mod => mod.StructureTabFull), { ssr: false });
const FunctionTabFull = dynamic(() => import('./components/TabFullComponents').then(mod => mod.FunctionTabFull), { ssr: false });
const FailureTabFull = dynamic(() => import('./components/TabFullComponents').then(mod => mod.FailureTabFull), { ssr: false });
const DocTabFull = dynamic(() => import('./components/TabFullComponents').then(mod => mod.DocTabFull), { ssr: false });
const AllTabRenderer = dynamic(() => import('./tabs/all/AllTabRenderer'), {
  ssr: false,
  loading: () => <div className="p-10 text-center text-gray-400">전체보기 로딩 중...</div>
});
const FailureLinkResult = dynamic(() => import('./components/FailureLinkResult'), { ssr: false });
const SpecialCharMasterModal = dynamic(() => import('@/components/modals/SpecialCharMasterModal'), { ssr: false });
const SODMasterModal = dynamic(() => import('@/components/modals/SODMasterModal'), { ssr: false });
const CpSyncWizard = dynamic(() => import('./components/CpSyncWizard'), { ssr: false });
const BackupPanel = dynamic(() => import('./components/BackupPanel'), { ssr: false });
const Fmea4Tab = dynamic(() => import('./tabs/fmea4').then(mod => mod.Fmea4Tab), { ssr: false });
const CPTab = dynamic(() => import('./tabs/cp').then(mod => mod.CPTab), { ssr: false });

/**
 * FMEA 워크시트 메인 페이지 컨텐츠
 */
function FMEAWorksheetPageContent() {
  const router = useRouter();
  const urlParams = useSearchParams();
  const compareEmbed = urlParams.get('compareEmbed') === '1';
  const compareReadonly = urlParams.get('readonly') === '1';
  const compareSide = (urlParams.get('compareSide') as 'left' | 'right' | null) || null;
  const { isAdmin } = useAuth();

  const reportCompareScroll = useCallback(
    (el: HTMLElement) => {
      if (!compareEmbed || !compareSide) return;
      if (typeof window === 'undefined' || window.parent === window) return;
      const denom = el.scrollHeight - el.clientHeight;
      const scrollRatio = denom > 0 ? el.scrollTop / denom : 0;
      window.parent.postMessage(
        { type: 'pfmea-compare-scroll', scrollRatio, scrollTop: el.scrollTop, source: compareSide },
        window.location.origin,
      );
    },
    [compareEmbed, compareSide],
  );

  /** scroll 이벤트는 버블하지 않음 — 중첩 overflow-auto 스크롤을 캡처 단계에서 동기화 */
  useEffect(() => {
    if (!compareEmbed || !compareSide) return;
    const onScrollCapture = (e: Event) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const denom = t.scrollHeight - t.clientHeight;
      if (denom <= 0) return;
      const root = document.getElementById('fmea-worksheet-container');
      if (!root || !root.contains(t)) return;
      reportCompareScroll(t);
    };
    document.addEventListener('scroll', onScrollCapture, true);
    return () => document.removeEventListener('scroll', onScrollCapture, true);
  }, [compareEmbed, compareSide, reportCompareScroll]);

  // ✅ FMEA 워크시트 기본 배율 110% 설정
  // ⚠️ 2026-01-11: zoom은 클릭 이벤트에 영향을 줄 수 있어 비활성화
  // React.useEffect(() => {
  //   const worksheetContainer = document.getElementById('fmea-worksheet-container');
  //   if (worksheetContainer) {
  //     worksheetContainer.style.zoom = '1.1';
  //     worksheetContainer.style.transformOrigin = '0 0';
  //   }
  // }, []);

  // ✅ 상속 정보 상태
  const [inheritInfo, setInheritInfo] = React.useState<{
    parentFmeaId: string;
    parentSubject: string;
    inheritedAt: string;
  } | null>(null);

  // 워크시트 상태 관리 Hook
  const {
    state,
    setState,
    setStateSynced,  // ✅ stateRef 동기 업데이트 버전
    dirty,
    setDirty,
    isSaving,
    lastSaved,
    fmeaList,
    currentFmea,
    selectedFmeaId,
    handleFmeaChange,
    rows,
    l1Spans,
    l1TypeSpans,
    l1FuncSpans,
    l2Spans,
    saveToLocalStorage,
    saveToLocalStorageOnly,
    saveAtomicDB,
    suppressAutoSaveRef,
    handleInputKeyDown,
    handleInputBlur,
    handleSelect,
    addL2,
    atomicDB,
    setAtomicDB,
  } = useWorksheetState();

  // ★★★ 중앙 저장 이벤트 리스너 등록 ★★★
  useSaveListener(saveAtomicDB);

  // ★★★ 2026-03-07: 저장 에러 콜백 등록 + 탭 닫힘 경고 ★★★
  useEffect(() => {
    registerSaveErrorCallback((message) => {
      toast.error(message);
    });
    const cleanupBeforeUnload = setupBeforeUnloadGuard();
    return () => {
      unregisterSaveErrorCallback();
      cleanupBeforeUnload();
    };
  }, []);

  // ★ Import 데이터 기준 검증
  const { importCounts } = useImportVerify(selectedFmeaId);



  // ★ CP/PFD 동기화 훅 (모듈화)
  const {
    linkedCpNo,
    linkedPfdNo,
    syncStatus,
    handleCpStructureSync,
    handleCpDataSync,
    handleCreateCp,   // ★ FMEA → CP 생성
    handleCreatePfd,  // ★ FMEA → PFD 생성
    // ★★★ 순차 연동 위저드 ★★★
    wizardState,
    startSyncWizard,
    executeNextStep,
    executeAllSteps,  // ★ 전체 단계 한번에 실행
    closeWizard,
    canSyncToCp,
    quickSyncAndNavigate,  // ★ 일반사용자용 원클릭 연동+이동
  } = useCpSync(selectedFmeaId);

  // ★ 특별특성 불일치 검증 (경고만, 데이터 수정 없음 — SSoT: Atomic DB)
  useSpecialCharVerify({
    fmeaId: selectedFmeaId || undefined,
    stateL2: state.l2,
  });

  // ★ 확정 후 자동 다음탭 이동
  useAutoTabAdvance(state, setState);

  // ★★★ 2026-03-07: 배열 구조 무결성 안전망 — l2/l3/functions 배열 깨짐 자동 복구 ★★★
  useArrayGuard(state, setState, setStateSynced);

  // 모달 상태
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isWorkElementModalOpen, setIsWorkElementModalOpen] = useState(false);
  const [isSpecialCharModalOpen, setIsSpecialCharModalOpen] = useState(false);
  const [isSODModalOpen, setIsSODModalOpen] = useState(false);
  const [showAPModal, setShowAPModal] = useState(false);
  const [show6APModal, setShow6APModal] = useState(false);

  // ★ 백업 관리
  const backupStateRef = React.useRef(state);
  React.useEffect(() => { backupStateRef.current = state; }, [state]);
  const { isBackupPanelOpen, setBackupPanelOpen, triggerConfirmBackup } = useBackupTrigger({
    fmeaId: selectedFmeaId,
    stateRef: backupStateRef,
    lastSaved,
  });

  // ★ 공정/작업요소 핸들러 훅 (모듈화)
  const {
    targetL2Id,
    setTargetL2Id,
    calculateStructureMissing,
    handleProcessSave,
    handleWorkElementSelect,
  } = useProcessHandlers({ state, setState, setDirty });

  // 우측 패널 활성화 상태
  const [activePanelId, setActivePanelId] = useState<string>('');
  // ★ 패널 전체화면 모드 (ALL 탭 전용)
  const [panelFullscreen, setPanelFullscreen] = useState(false);
  // ESC 키로 전체화면 해제
  useEffect(() => {
    if (!panelFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanelFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [panelFullscreen]);

  // ★★★ 2026-01-19: 버튼 클릭 시 패널 유지 플래그 ★★★
  const panelButtonClickedRef = React.useRef(false);

  // ALL 탭 Shift+휠 → 좌우 스크롤 (ref callback으로 DOM 생성 즉시 non-passive 등록)
  const shiftWheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const allTabScrollRef = useCallback((node: HTMLDivElement | null) => {
    if (shiftWheelHandlerRef.current && allTabScrollElRef.current) {
      allTabScrollElRef.current.removeEventListener('wheel', shiftWheelHandlerRef.current);
      shiftWheelHandlerRef.current = null;
    }
    allTabScrollElRef.current = node;
    if (!node) return;
    const handler = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      // SHIFT+wheel: deltaY(세로 휠) 또는 deltaX(OS 변환) → 횡스크롤
      const delta = e.deltaY || e.deltaX;
      if (delta !== 0) {
        e.preventDefault();
        node.scrollLeft += delta;
      }
    };
    node.addEventListener('wheel', handler, { passive: false });
    shiftWheelHandlerRef.current = handler;
  }, []);
  const allTabScrollElRef = useRef<HTMLDivElement | null>(null);

  // ★★★ ALL 탭 스크롤 위치 저장/복원 ★★★
  const hasScrolledOnLoadRef = useRef(false);
  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ALL 탭 스크롤 시 위치를 localStorage에 저장 (300ms 디바운스)
  useEffect(() => {
    if (state.tab !== 'all') return;
    const container = document.getElementById('all-tab-scroll-wrapper');
    if (!container) return;
    const fmeaId = selectedFmeaId?.toLowerCase();
    if (!fmeaId) return;

    const handleScroll = () => {
      if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
      scrollSaveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(`pfmea_scrollLeft_${fmeaId}`, String(container.scrollLeft));
        } catch { /* ignore */ }
      }, 300);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
    };
  }, [state.tab, selectedFmeaId]);

  // ALL 탭 로드 시 스크롤 위치 복원
  useEffect(() => {
    if (state.tab !== 'all' || hasScrolledOnLoadRef.current) return;
    hasScrolledOnLoadRef.current = true;

    const fmeaId = selectedFmeaId?.toLowerCase();
    const steps = Array.isArray(state.visibleSteps) ? state.visibleSteps : [2, 3, 4, 5, 6];

    // 특정 단계만 선택된 경우 → 해당 단계 헤더로 스크롤
    if (steps.length < 5) {
      const targetStep = Math.min(...steps);
      requestAnimationFrame(() => {
        const target = document.querySelector(`[data-step-num="${targetStep}"]`) as HTMLElement;
        if (!target) return;
        const container = document.getElementById('all-tab-scroll-wrapper');
        if (!container) return;
        container.scrollTo({ left: Math.max(0, target.offsetLeft - 10), behavior: 'auto' });
      });
      return;
    }

    // 전체 단계 표시 → 저장된 scrollLeft 복원
    if (!fmeaId) return;
    let savedScrollLeft = 0;
    try {
      const v = localStorage.getItem(`pfmea_scrollLeft_${fmeaId}`);
      if (v) savedScrollLeft = parseInt(v, 10) || 0;
    } catch { /* ignore */ }
    if (savedScrollLeft <= 0) return;

    const tryRestore = (attempt: number) => {
      const container = document.getElementById('all-tab-scroll-wrapper');
      if (!container) {
        if (attempt < 5) setTimeout(() => tryRestore(attempt + 1), 100);
        return;
      }
      if (container.scrollWidth > container.clientWidth) {
        container.scrollTo({ left: savedScrollLeft, behavior: 'auto' });
      } else if (attempt < 5) {
        setTimeout(() => tryRestore(attempt + 1), 150);
      }
    };
    requestAnimationFrame(() => tryRestore(0));
  }, [state.tab, state.visibleSteps, selectedFmeaId]);

  // ALL 탭에서 벗어나면 스크롤 복원 플래그 초기화
  useEffect(() => {
    if (state.tab !== 'all') {
      hasScrolledOnLoadRef.current = false;
    }
  }, [state.tab]);

  // ★★★ 탭 변경 시 패널 초기화 ★★★
  // - 모든 탭: 워크시트 전체 너비 사용 (패널 없음)
  // - 5AP/6AP/RPN 클릭 시에만 풀스크린 모달로 표시
  React.useEffect(() => {
    if (panelButtonClickedRef.current) {
      panelButtonClickedRef.current = false;
      return;
    }
    setActivePanelId('');
    setPanelFullscreen(false);
  }, [state.tab]);

  // ★★★ RPN 컬럼 표시 여부 (rpn 패널 활성화 시 true) ★★★
  const showRPN = activePanelId === 'rpn' || activePanelId === 'rpn-chart';

  // ★★★ 2026-01-27: 입력모드 (auto: 기존 모달방식, manual: 컨텍스트 메뉴) ★★★
  const [inputMode, setInputMode] = useState<'manual' | 'auto'>('auto');

  // ★★★ 2026-03-07: page.tsx placeholder 컨텍스트 메뉴 제거
  // 각 탭(StructureTab, FunctionL1~L3, FailureL1~L3)이 자체 PfmeaContextMenu를 관리하므로
  // page.tsx 수준의 contextMenu 상태/핸들러는 불필요 (alert('준비중') 충돌 원인이었음)

  // 트리 접기/펼치기 상태
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // ★★★ 2026-01-12: showAPInAll, apStageInAll 제거 - 플러그인 통일 ★★★

  const toggleCollapse = useCallback((procId: string) => {
    setCollapsedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(procId)) {
        newSet.delete(procId);
      } else {
        newSet.add(procId);
      }
      return newSet;
    });
  }, []);

  // Import 모달 상태
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // ★ 엑셀 핸들러 훅 (모듈화)
  const fmeaName = currentFmea?.fmeaInfo?.subject || currentFmea?.project?.productName || 'PFMEA';
  const {
    fileInputRef,
    importMessage,
    handleImportFile,
    handleStructureExport,
    handleDownloadTemplate,
    handleWorksheetExport,
  } = useExcelHandlers({ state, setState, setDirty, fmeaName, fmeaId: selectedFmeaId || undefined });

  // ★★★ 2026-02-16: DB Only 정책 - 상속 정보 localStorage 읽기 제거 ★★★
  // 상속 정보는 DB에서 로드 (현재 미구현 - 향후 DB API 추가 예정)

  // ★★★ 2026-02-16: 구조분석만 autoLoad (기능분석부터는 수동 디폴트)
  // 기초정보 Import 후 워크시트 이동 시 구조분석(L2/L3)만 자동 로드
  const autoLoadDone = useRef(false);
  useEffect(() => {
    if (autoLoadDone.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoLoad') !== 'true') return;
    if (!selectedFmeaId) return;
    if (!state.tab) return;

    autoLoadDone.current = true;

    (async () => {
      try {
        // ★★★ 2026-02-16: L1 완제품명도 프로젝트에서 가져오기 ★★★
        let projectL1Name = '';
        try {
          const projRes = await fetch(`/api/fmea/projects?id=${encodeURIComponent(selectedFmeaId)}`);
          const projData = await projRes.json();
          const proj = projData.projects?.[0];
          if (proj?.fmeaInfo) {
            const rawSubject = proj.fmeaInfo.subject || '';
            const rawPartName = proj.fmeaInfo.partName || '';
            // 품명(partName) 우선, 없으면 subject에서 추출 (레거시 호환)
            const partFromSubject = rawSubject.includes('+') ? rawSubject.split('+')[0].trim() : rawSubject.trim();
            const baseName = rawPartName || partFromSubject || '';
            if (baseName && baseName !== '품명' && baseName !== '품명+PFMEA') {
              projectL1Name = `${baseName}+생산공정`;
            }
          }
        } catch (e) { /* ignore */ }

        const masterUrl = `/api/fmea/master-structure?sourceFmeaId=${encodeURIComponent(selectedFmeaId)}`;
        const res = await fetch(masterUrl);
        const data = await res.json();
        if (!data.success || !data.processes || data.processes.length === 0) {
          return;
        }

        // ★ 공통작업요소(00) 배분 (StructureTab.loadFromMaster와 동일 로직)
        const commonWEs = (data.commonWorkElements || []).map((we: any) => ({
          name: (we.name || '').replace(/^00\s+/, ''),
          m4: we.m4 || 'MN',
        }));

        const ts = Date.now();
        const newL2 = data.processes.map((proc: any, idx: number) => {
          const procWEs = (proc.workElements || []).map((we: any) => ({
            name: we.name || '', m4: we.m4 || 'MC',
          }));
          const allWEs = [...procWEs, ...commonWEs];

          const seen = new Set<string>();
          const unique = allWEs.filter((we: any) => {
            const norm = (we.name || '').trim().toLowerCase();
            if (!norm || seen.has(norm)) return false;
            seen.add(norm);
            return true;
          });

          return {
            id: `l2_${proc.no}_${ts}_${idx}`,
            no: proc.no,
            name: proc.name,
            order: idx,
            l3: unique.map((we: any, weIdx: number) => ({
              id: `l3_${proc.no}_${weIdx}_${ts}`,
              name: we.name,
              m4: we.m4,
              order: weIdx,
              functions: [],
              processChars: [],
            })),
          };
        });

        // ★ setStateSynced 사용 + DB 저장 + L1 완제품명 자동설정
        const updateFn = (prev: any) => {
          const curL1 = (prev.l1?.name || '').trim();
          const isL1Empty = !curL1 || curL1.includes('입력');
          const nextL1 = (isL1Empty && projectL1Name) ? { ...prev.l1, name: projectL1Name } : prev.l1;
          return { ...prev, l1: nextL1, l2: newL2, structureConfirmed: false };
        };
        if (setStateSynced) setStateSynced(updateFn);
        else setState(updateFn);
        setDirty?.(true);

        // ★★★ 2026-03-21 FIX: autoLoad 시 saveAtomicDB 제거
        // Import에서 정상 저장한 Atomic DB(FC=104)를 워크시트 로드 시 덮어쓰기 방지
        // atomicToLegacy 변환 과정에서 Cu Target FC 등이 손실되어 FC=102로 역행
        // DB 저장은 사용자 편집 시에만 실행

        const totalWE = newL2.reduce((s: number, p: any) => s + (p.l3?.length || 0), 0);
      } catch (e) {
        console.error('[autoLoad] 마스터 로드 오류:', e);
      }
    })();
  }, [selectedFmeaId, state.tab, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 작업요소 모달 연속입력 핸들러 (수동입력 후 즉시 워크시트 반영)
  const handleWorkElementContinuousAdd = useCallback((element: { id: string; m4: string; name: string }, addNewRow: boolean) => {
    if (!targetL2Id) {
      return;
    }


    setState(prev => {
      const newL2 = prev.l2.map(proc => {
        if (proc.id !== targetL2Id) return proc;

        // 기존 작업요소 목록 복사
        const existingL3 = [...proc.l3];

        // placeholder 행 제거
        const meaningfulL3 = existingL3.filter(we => we.name?.trim());

        // 새 작업요소 추가
        const newWorkElement: WorkElement = {
          id: uid(),
          m4: element.m4 || '',
          name: element.name,
          order: (meaningfulL3.length + 1) * 10,
          functions: [],
          processChars: [],
        };

        const updatedL3 = [...meaningfulL3, newWorkElement];

        // 새 행 추가 요청이 있으면 placeholder 행 추가
        if (addNewRow) {
          updatedL3.push({
            id: uid(),
            m4: '',
            name: '',
            order: updatedL3.length * 10,
            functions: [],
            processChars: [],
          });
        }

        return { ...proc, l3: updatedL3 };
      });
      return { ...prev, l2: newL2 };
    });
    setDirty(true);
    requestAnimationFrame(() => saveToLocalStorage?.());
  }, [targetL2Id, setState, setDirty, saveToLocalStorage]);

  // 작업요소 모달 삭제 핸들러 (2개 이상이면 행 삭제, 1개면 내용만 삭제)
  const handleWorkElementDelete = useCallback((deletedNames: string[]) => {
    if (!targetL2Id || deletedNames.length === 0) return;

    // 이름 정규화 (공백 제거)
    const normalizedDeletedNames = deletedNames.map(n => n.trim());

    setState(prev => {
      const newL2 = prev.l2.map(proc => {
        if (proc.id !== targetL2Id) return proc;


        const currentCount = proc.l3.length;

        if (currentCount > 1) {
          // 2개 이상이면 행 자체 삭제
          const remainingL3 = proc.l3.filter(w => !normalizedDeletedNames.includes(w.name.trim()));

          // 모두 삭제되면 최소 1행 유지
          if (remainingL3.length === 0) {
            remainingL3.push({ id: uid(), m4: '', name: '', order: 10, functions: [], processChars: [] });
          }

          return { ...proc, l3: remainingL3 };
        } else {
          // 1개만 남았으면 내용만 삭제, 행 유지
          const updatedL3 = proc.l3.map(w => {
            const isMatch = normalizedDeletedNames.includes(w.name.trim());
            if (isMatch) {
              return { ...w, name: '', m4: '' };
            }
            return w;
          });

          return { ...proc, l3: updatedL3 };
        }
      });
      return { ...prev, l2: newL2 };
    });
    setDirty(true);
  }, [targetL2Id, setState, setDirty]);

  // 작업요소명 수정
  const renameL3 = useCallback((l3Id: string, newName: string) => {
    setState(prev => ({
      ...prev,
      l2: prev.l2.map(p => ({
        ...p,
        l3: p.l3.map(w => w.id === l3Id ? { ...w, name: newName } : w)
      }))
    }));
    setDirty(true);
  }, [setState, setDirty]);

  // 검색 필터링된 트리 데이터
  const filteredTree = useMemo(() => {
    const q = (state.search || '').toLowerCase();
    if (!q) return state.l2;
    return state.l2.filter(proc => {
      const procLabel = `${proc.no} ${proc.name}`.toLowerCase();
      return procLabel.includes(q) || proc.l3.some(w => `${w.m4} ${w.name}`.toLowerCase().includes(q));
    });
  }, [state.l2, state.search]);

  // 공통 탭 props
  const tabProps = {
    state,
    setState,
    setStateSynced,  // ✅ stateRef 동기 업데이트 버전
    rows,
    l1Spans,
    l1TypeSpans,
    l1FuncSpans,
    l2Spans,
    setDirty,
    handleInputBlur,
    handleInputKeyDown,
    handleSelect,
    setIsProcessModalOpen,
    setIsWorkElementModalOpen,
    setTargetL2Id,
    saveToLocalStorage,
    saveToLocalStorageOnly,
    saveAtomicDB,
    suppressAutoSaveRef,  // ★ 2026-02-18: 데이터 로드 중 저장 차단
    atomicDB,             // ★ 2026-03-27: atomicDB 단일화
    setAtomicDB,          // ★ 2026-03-27: atomicDB 직접 편집
    onAPClick: () => setShowAPModal(true),
    fmeaId: selectedFmeaId || undefined, // ★ 2026-02-08: 자동모드 마스터 필터링용
    customerName: (currentFmea?.fmeaInfo as any)?.customerIndustry || currentFmea?.fmeaInfo?.customerName || '', // ★ 특별특성 고객사 필터용 (customerIndustry 우선)
    importCounts: importCounts.loaded ? importCounts : undefined,
  };

  return (
    <>
      {!compareEmbed && (
        <>
          <SidebarRouter />
          <div className="fixed h-screen z-40 bg-white" style={{ left: 48, width: 5 }} /> {/* 사이드바 구분선 */}
          <PFMEATopNav selectedFmeaId={currentFmea?.id} linkedCpNo={linkedCpNo} linkedPfdNo={linkedPfdNo} />
        </>
      )}

      <div
        className="h-full flex flex-col font-[Segoe_UI,Malgun_Gothic,Arial,sans-serif]"
        style={{ background: COLORS.bg, color: COLORS.text, marginLeft: compareEmbed ? 0 : 53 }}
      >

        {/* ========== 상단 메뉴 바 ========== */}
        {!compareEmbed && (
        <TopMenuBar
          fmeaList={fmeaList}
          currentFmea={currentFmea}
          selectedFmeaId={selectedFmeaId}
          cpNo={linkedCpNo}
          dirty={dirty}
          isSaving={isSaving}
          syncStatus={syncStatus}
          lastSaved={lastSaved}
          currentTab={state.tab}
          importMessage={importMessage}
          fileInputRef={fileInputRef}
          onFmeaChange={handleFmeaChange}
          onSave={() => {
            saveAtomicDB(true);
          }}
          onNavigateToList={() => router.push('/pfmea/list')}
          onExport={async () => {
            try {
              const fmeaName = currentFmea?.fmeaInfo?.subject || 'PFMEA';
              if (state.tab === 'structure') {
                handleStructureExport();
              } else if (state.tab === 'function-l1') {
                const { exportFunctionL1 } = await import('./excel-export');
                await exportFunctionL1(state, fmeaName, false);
              } else if (state.tab === 'failure-l1') {
                const { exportFunctionL1 } = await import('./excel-export');
                await exportFunctionL1(state, fmeaName, true);
              } else if (state.tab === 'function-l2') {
                const { exportFunctionL2 } = await import('./excel-export');
                await exportFunctionL2(state, fmeaName, false);
              } else if (state.tab === 'failure-l2') {
                const { exportFunctionL2 } = await import('./excel-export');
                await exportFunctionL2(state, fmeaName, true);
              } else if (state.tab === 'function-l3') {
                const { exportFunctionL3 } = await import('./excel-export');
                await exportFunctionL3(state, fmeaName, false);
              } else if (state.tab === 'failure-l3') {
                const { exportFunctionL3 } = await import('./excel-export');
                await exportFunctionL3(state, fmeaName, true);
              } else if (state.tab === 'linkage') {
                const { exportLinkageExcel } = await import('./excel-export-linkage');
                await exportLinkageExcel(state, fmeaName);
              } else if (state.tab === 'all') {
                // ★ CFT + 개정/승인 데이터를 API에서 가져와서 전체 내보내기
                await handleWorksheetExport('all');
              } else {
                const { exportFMEAWorksheet } = await import('./excel-export');
                await exportFMEAWorksheet(state, fmeaName);
              }
            } catch (err) {
              console.error('[엑셀 내보내기 오류]', err);
              alert(`엑셀 내보내기 실패: ${err instanceof Error ? err.message : String(err)}`);
            }
          }}
          onImportClick={() => fileInputRef.current?.click()}
          onImportFile={handleImportFile}
          onDownloadTemplate={handleDownloadTemplate}
          onOpenSpecialChar={() => setIsSpecialCharModalOpen(true)}
          onOpenSOD={() => setIsSODModalOpen(true)}
          onOpenSRecommend={() => {
            // ★ 2026-03-25: S추천 토글 — 이미 열려있으면 닫기, 아니면 열기 + 자동추천 적용
            if (state.tab === 'failure-severity-map') {
              setState(prev => ({ ...prev, tab: 'failure-l1' }));
              return;
            }
            // 자동추천 적용 (applyBulkSeverityRecommendations)
            try {
              const { applyBulkSeverityRecommendations } = require('@/lib/fmea/s-recommend-bulk-apply');
              const result = applyBulkSeverityRecommendations(state.l1, selectedFmeaId || 'default');
              if (result.changeCount > 0) {
                setState(prev => ({
                  ...prev,
                  l1: { ...prev.l1, failureScopes: result.updatedScopes },
                  tab: 'failure-severity-map',
                }));
                console.log(`[S추천] ${result.changeCount}건 자동적용`);
              } else {
                setState(prev => ({ ...prev, tab: 'failure-severity-map' }));
              }
            } catch (e) {
              console.error('[S추천] 자동적용 오류:', e);
              setState(prev => ({ ...prev, tab: 'failure-severity-map' }));
            }
            try {
              const id = selectedFmeaId?.toLowerCase();
              if (id) localStorage.setItem(`pfmea_tab_${id}`, 'failure-severity-map');
            } catch { /* ignore */ }
          }}
          onOpen5AP={() => {
            panelButtonClickedRef.current = true;
            if (state.tab !== 'all') setState(prev => ({ ...prev, tab: 'all' }));
            setActivePanelId(prev => prev === '5ap' ? '' : '5ap');
            setPanelFullscreen(false);
          }}
          onOpen6AP={() => {
            panelButtonClickedRef.current = true;
            if (state.tab !== 'all') setState(prev => ({ ...prev, tab: 'all' }));
            setActivePanelId(prev => prev === '6ap' ? '' : '6ap');
            setPanelFullscreen(false);
          }}
          onOpenRPN={() => {
            panelButtonClickedRef.current = true;
            if (state.tab !== 'all') setState(prev => ({ ...prev, tab: 'all' }));
            setActivePanelId(prev => prev === 'rpn' ? '' : 'rpn');
          }}
          showRPN={showRPN}
          onOpenPDF={() => {
            panelButtonClickedRef.current = true;
            if (activePanelId === 'pdf' && panelFullscreen) {
              setActivePanelId(''); setPanelFullscreen(false);
            } else {
              setActivePanelId('pdf'); setPanelFullscreen(true);
            }
          }}
          onOpenTree={() => {
            // Tree 패널 삭제됨 — no-op
          }}
          activePanelId={activePanelId}
          onCpStructureSync={handleCpStructureSync}
          onCpDataSync={handleCpDataSync}
          onCreateCp={() => linkedCpNo ? startSyncWizard(state) : handleCreateCp(state)}
          onCreatePfd={() => handleCreatePfd(state)}
          isAdmin={isAdmin}
          onQuickCpSync={() => quickSyncAndNavigate(state)}
          linkedPfdNo={linkedPfdNo}
          onConfirm={async () => {
            if (!confirm('FMEA를 확정하시겠습니까?\n\n확정 시 개정관리 현황 화면으로 이동합니다.')) return;
            if (saveAtomicDB) await saveAtomicDB(true);
            const fmeaId = selectedFmeaId || '';
            const isRevision = /-r\d+$/.test(fmeaId);
            if (isRevision) {
              try {
                await fetch('/api/fmea/revision-confirm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ fmeaId }),
                });
              } catch (e) { /* ignore */ }
            }
            router.push(`/pfmea/revision?id=${fmeaId}`);
          }}
          showCompareButton={Boolean(selectedFmeaId)}
          onCompareClick={() => {
            const tab = normalizeCompareTab(state.tab);
            router.push(
              `/pfmea/compare?left=${encodeURIComponent(DEFAULT_COMPARE_MASTER_FMEA_ID)}&right=${encodeURIComponent(selectedFmeaId!)}&tab=${encodeURIComponent(tab)}`,
            );
          }}
          onOpenBackup={() => setBackupPanelOpen(true)}
          onOpenStats={() => {
            panelButtonClickedRef.current = true;
            setActivePanelId(prev => prev === 'stats' ? '' : 'stats');
            setPanelFullscreen(false);
          }}
          state={state}
          inputMode={inputMode}
          onInputModeChange={setInputMode}
        />
        )}

        {/* 상속 모드 배너 */}
        {inheritInfo && (
          <div
            className="fixed top-[72px] left-[53px] right-0 h-7 z-[99] bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 border-b border-blue-800 flex items-center justify-center gap-4 text-white text-xs"
          >
            <span className="font-bold">
              🔵 상속 모드
            </span>
            <span>|</span>
            <span>
              기반 FMEA: <span className="font-semibold text-yellow-200">{inheritInfo.parentFmeaId}</span>
            </span>
            <a
              href={`/pfmea/worksheet?id=${inheritInfo.parentFmeaId}`}
              className="px-2 py-0.5 bg-white/20 rounded hover:bg-white/30 transition-colors"
            >
              원본 보기
            </a>
            <button
              onClick={() => {
                if (confirm('상속 정보를 해제하시겠습니까?\n데이터는 유지되지만, 상속 표시가 사라집니다.')) {
                  setInheritInfo(null);
                }
              }}
              className="px-2 py-0.5 bg-red-500/50 rounded hover:bg-red-500/70 transition-colors"
            >
              상속 해제
            </button>
          </div>
        )}

        {/* ===== 탭 메뉴 (고정, top-[72px] = TopNav 36 + TopMenuBar 36) ===== */}
        {!compareEmbed && (
        <div
          className={`fixed ${inheritInfo ? 'top-[100px]' : 'top-[72px]'} left-[53px] right-0 h-9 z-[100] bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 border-b-[2px] border-[#1a237e]`}
        >
          <TabMenu
            state={state}
            setState={setState}
            setDirty={setDirty}
            saveToLocalStorage={saveToLocalStorage}
            saveAtomicDB={saveAtomicDB}
            fmeaId={selectedFmeaId || ''}
            showCompareButton={Boolean(selectedFmeaId)}
            onCompareClick={() => {
              const tab = normalizeCompareTab(state.tab);
              router.push(
                `/pfmea/compare?left=${encodeURIComponent(DEFAULT_COMPARE_MASTER_FMEA_ID)}&right=${encodeURIComponent(selectedFmeaId!)}&tab=${encodeURIComponent(tab)}`,
              );
            }}
            onOpen5AP={() => {
              panelButtonClickedRef.current = true;
              if (state.tab !== 'all') setState(prev => ({ ...prev, tab: 'all' }));
              setActivePanelId(prev => prev === '5ap' ? '' : '5ap');
              setPanelFullscreen(false);
            }}
            onOpen6AP={() => {
              panelButtonClickedRef.current = true;
              if (state.tab !== 'all') setState(prev => ({ ...prev, tab: 'all' }));
              setActivePanelId(prev => prev === '6ap' ? '' : '6ap');
              setPanelFullscreen(false);
            }}
            onAllClick={() => {
              setActivePanelId('');
              setPanelFullscreen(false);
            }}
          />
        </div>
        )}

        {/* ========== 메인 레이아웃 (메뉴 아래, 상속 배너 고려) ========== */}
        {/* All 탭: overflow-auto로 브라우저 스크롤 허용 */}
        <div
          className={`fixed flex flex-row overflow-hidden ${
            compareEmbed
              ? 'top-0 left-0 right-0 bottom-0'
              : inheritInfo
                ? 'top-[136px] left-[53px] right-0 bottom-0'
                : 'top-[108px] left-[53px] right-0 bottom-0'
          }`}
        >

          {/* ===== 좌측: 워크시트 영역 ===== */}
          <div
            id="fmea-worksheet-container"
            className={`flex-1 flex flex-col min-w-0 bg-white overflow-hidden ${compareReadonly ? 'compare-worksheet-readonly' : ''}`}
          >
            {compareEmbed && (
              <CompareEmbedToolbar
                readOnly={compareReadonly}
                dirty={dirty}
                isSaving={isSaving}
                lastSaved={lastSaved}
                fmeaId={selectedFmeaId || ''}
                fmeaLabel={
                  (currentFmea?.fmeaInfo as { subject?: string } | undefined)?.subject ||
                  ''
                }
                onSave={() => {
                  void saveAtomicDB(true);
                }}
              />
            )}

            {/* 구조분석 제목 바는 StructureTab 내부 헤더로 이동됨 (표준화 완료) */}

            {/* All 탭: 좌우 스크롤 지원 (2026-01-12 수정) */}
            {(state.tab === 'all' || state.tab === 'risk' || state.tab === 'opt') ? (
              <>
              <div
                id="all-tab-scroll-wrapper"
                ref={allTabScrollRef}
                className="worksheet-scroll-container min-h-0"
                style={{
                  flex: 1,
                  overflowX: 'scroll',
                  overflowY: 'auto',
                  background: '#fff',
                  position: 'relative',
                }}
              >
                {/* 전체보기 탭: 통합 화면 (40열 구조) - 원자성 DB 기반 */}
                <AllTabRenderer
                  tab={state.tab}
                  rows={rows}
                  state={state}
                  setState={setStateSynced || setState}
                  setDirty={setDirty}
                  saveAtomicDB={saveAtomicDB}
                  l1Spans={l1Spans}
                  l1TypeSpans={l1TypeSpans}
                  l1FuncSpans={l1FuncSpans}
                  l2Spans={l2Spans}
                  onAPClick={() => setShowAPModal(true)}
                  visibleSteps={state.visibleSteps || [2, 3, 4, 5, 6]}
                  fmeaId={selectedFmeaId || undefined}
                  useAtomicDB={true}
                  showRPN={showRPN}
                  // ★★★ 2026-01-19: ALL 탭 내 패널 전환 핸들러 ★★★
                  onOpen5AP={() => {
                    panelButtonClickedRef.current = true;
                    setActivePanelId(prev => prev === '5ap' ? '' : '5ap');
                    setPanelFullscreen(false);
                  }}
                  onOpen6AP={() => {
                    panelButtonClickedRef.current = true;
                    setActivePanelId(prev => prev === '6ap' ? '' : '6ap');
                    setPanelFullscreen(false);
                  }}
                  onOpenRPN={() => {
                    panelButtonClickedRef.current = true;
                    setActivePanelId(prev => prev === 'rpn' ? '' : 'rpn');
                  }}
                  activePanelId={activePanelId}
                  inputMode={inputMode}
                  // ★★★ 2026-02-03: 등록화면 목표완료일 연동 ★★★
                  fmeaRevisionDate={currentFmea?.fmeaInfo?.fmeaRevisionDate || ''}
                  onOpenSpecialChar={() => setIsSpecialCharModalOpen(true)}
                />
              </div>
              {/* 하단 바 제거 — 확정 버튼은 상단 TopMenuBar로 이동 */}
              </>
            ) : (
              /* 다른 탭: 내용 초과 시에만 좌우 스크롤 */
              <div
                id="worksheet-scroll-container"
                className="worksheet-scroll-container min-h-0"
                style={{
                  flex: 1,
                  overflowX: 'auto',
                  overflowY: 'auto',
                  background: '#fff',
                  position: 'relative',
                }}
                onWheel={(e) => {
                  // 마우스 휠로 좌우 스크롤 (Shift 없이도 가능)
                  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
              >
                {/* 등록정보 없으면 자동으로 등록화면 리다이렉트 (경고창 없음) - 비교뷰에서는 리다이렉트 제외 */}
                {currentFmea && !currentFmea.fmeaInfo?.subject && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 m-3 text-sm text-blue-800">
                    ℹ️ 등록정보 입력이 필요합니다. {compareEmbed ? '비교 뷰에서는 워크시트를 강제로 표시합니다.' : '등록화면으로 이동합니다...'}
                    {!compareEmbed && (() => {
                      // 자동 리다이렉트 (1초 후)
                      setTimeout(() => {
                        router.push(`/pfmea/register?id=${currentFmea.id}`);
                      }, 1000);
                      return null;
                    })()}
                  </div>
                )}
                {/* 워크시트 콘텐츠 */}
                {state.tab.startsWith('function') ? (
                  <FunctionTabFull {...tabProps} />
                ) : state.tab.startsWith('failure') ? (
                  <FailureTabFull {...tabProps} />
                ) : state.tab === 'fmea4' ? (
                  <Fmea4Tab
                    state={state}
                    setState={setState}
                    setDirty={setDirty}
                    saveToLocalStorage={saveToLocalStorage}
                    saveAtomicDB={saveAtomicDB}
                  />
                ) : state.tab === 'structure' ? (
                  <StructureTabFull {...tabProps} />
                ) : state.tab === 'doc' ? (
                  <table className="w-full border-collapse table-fixed">
                    <DocTabFull {...tabProps} />
                  </table>
                ) : null}
              </div>
            )}
          </div>
          {/* 워크시트 영역 닫힘 */}

          {/* ===== 우측: 5AP/6AP/RPN 사이드 패널 (350px) ===== */}
          {!compareEmbed &&
           (state.tab === 'all' || state.tab === 'risk' || state.tab === 'opt' || activePanelId === 'stats') &&
           ['5ap', '6ap', 'rpn', 'rpn-chart', 'stats'].includes(activePanelId) ? (
            <>
              <div className="w-[2px] bg-[#1a237e] shrink-0" />
              <div className="w-[350px] shrink-0 flex flex-col bg-[#f0f4f8] overflow-hidden h-full">
                {/* 패널 헤더: 닫기 버튼 */}
                <div className="h-7 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 text-white flex items-center justify-between px-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase">{activePanelId}</span>
                  <button
                    onClick={() => setActivePanelId('')}
                    className="px-2 py-0.5 text-[10px] bg-red-600 hover:bg-red-500 rounded font-semibold cursor-pointer transition-colors"
                  >
                    닫기
                  </button>
                </div>
                <Suspense fallback={
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '14px', color: '#666' }}>
                    로딩 중...
                  </div>
                }>
                  {(() => {
                    const panel = getPanelById(activePanelId);
                    if (!panel) return null;
                    const PanelComponent = panel.component;
                    return <PanelComponent state={state} setState={setState} inputMode={inputMode} setInputMode={setInputMode} />;
                  })()}
                </Suspense>
              </div>
            </>
          ) : null}
        </div>

        {/* ★★★ 전체화면 오버레이 — PDF 등 전체화면 필요 패널용 ★★★ */}
        {panelFullscreen && !!activePanelId && activePanelId === 'pdf' && (
          <div className="fixed top-[72px] left-[53px] right-0 bottom-0 z-[200] bg-white flex flex-col">
            <div className="h-8 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 text-white flex items-center justify-between px-3 shrink-0 shadow-md">
              <span className="text-[11px] font-bold">
                📄 PDF 뷰어
                <span className="ml-2 text-[9px] text-gray-400 font-normal">전체화면</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setPanelFullscreen(false); setActivePanelId(''); }}
                  className="px-2.5 py-0.5 text-[10px] bg-red-600 hover:bg-red-500 rounded font-semibold cursor-pointer transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400 text-sm">로딩 중...</div>}>
                {(() => {
                  const panel = getPanelById(activePanelId);
                  if (!panel) return null;
                  const PanelComponent = panel.component;
                  return <PanelComponent state={state} setState={setState} inputMode={inputMode} setInputMode={setInputMode} />;
                })()}
              </Suspense>
            </div>
          </div>
        )}

        {/* 
          ★★★ 2026-01-12: 모달 패턴 통일 ★★★
          ProcessSelectModal, WorkElementSelectModal → StructureTab 내부에서 렌더링
          (기능분석/고장분석과 동일한 패턴)
        */}

        {/* 특별특성 마스터 모달 */}
        <SpecialCharMasterModal
          isOpen={isSpecialCharModalOpen}
          onClose={() => setIsSpecialCharModalOpen(false)}
          currentFmeaId={selectedFmeaId}
        />

        {/* SOD 마스터 모달 */}
        <SODMasterModal
          isOpen={isSODModalOpen}
          onClose={() => setIsSODModalOpen(false)}
        />

        {/* ★ 백업 관리 패널 */}
        <BackupPanel
          isOpen={isBackupPanelOpen}
          onClose={() => setBackupPanelOpen(false)}
          fmeaId={selectedFmeaId || ''}
          state={state}
        />

        {/* ★★★ 2026-03-07: placeholder 컨텍스트 메뉴 제거
         * 각 탭(StructureTab, FunctionL1~L3, FailureL1~L3)이 자체 PfmeaContextMenu를 렌더링하므로
         * page.tsx의 alert('준비중') 메뉴는 탭 내부 메뉴와 충돌을 유발함
         */}
      </div>

      {/* ★★★ CP 순차 연동 위저드 모달 (관리자만 표시) ★★★ */}
      {isAdmin && <CpSyncWizard
        wizardState={wizardState}
        cpNo={linkedCpNo}
        l2Data={state.l2}
        onExecuteNext={executeNextStep}
        onExecuteAll={executeAllSteps}
        onClose={closeWizard}
        onNavigateToCp={() => {
          closeWizard();
          window.open(`/control-plan/worksheet?cpNo=${linkedCpNo}`, '_blank');
        }}
        onConfirm={async () => {
          if (!confirm('FMEA를 확정하시겠습니까?\n\n확정 시 개정관리 현황 화면으로 이동합니다.')) return;
          if (saveAtomicDB) await saveAtomicDB(true);
          const fmeaId = selectedFmeaId || '';
          const isRevision = /-r\d+$/.test(fmeaId);
          if (isRevision) {
            try {
              await fetch('/api/fmea/revision-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fmeaId }),
              });
            } catch { /* ignore */ }
          }
          closeWizard();
          router.push(`/pfmea/revision?id=${fmeaId}`);
        }}
      />}
    </>
  );
}

// Suspense boundary wrapper for useSearchParams
export default function FMEAWorksheetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">로딩 중...</div>}>
      <FMEAWorksheetPageContent />
    </Suspense>
  );
}

// ============ 하위 컴포넌트들은 components/TabFullComponents.tsx로 분리됨 ============
