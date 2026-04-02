/**
 * @file AllTabEmpty.tsx
 * @description P-FMEA ALL 화면 (구조분석 CSS 벤치마킹)
 *
 * ★★★ 화면정의서 v2.2 + 구조분석 디자인 통일 ★★★
 * - 레벨별 색상 체계: L1(파란색), L2(녹색), L3(주황색)
 * - 표준 border: #ccc
 * - 버튼/배지: worksheet.ts 스타일 사용
 *
 * @refactored 2026-02-10 - useControlModalSave, AllTabImprovePanel 분리
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAllTabModals } from './hooks/useAllTabModals';
import { useAllTabStats } from './hooks/useAllTabStats';
import { useControlModalSave } from './hooks/useControlModalSave';
import { RiskOptCellRenderer } from './RiskOptCellRenderer';
import { FailureCellRenderer } from './FailureCellRenderer';
import { FunctionCellRenderer } from './FunctionCellRenderer';
import { StructureCellRenderer } from './StructureCellRenderer';
import { processFailureLinks, FailureLinkRow, ProcessedFMGroup } from './processFailureLinks';
import VerificationTable from './verification/VerificationTable';
import { FailureAnalysisSummary } from './verification/FailureAnalysisSummary';
import { useVerificationData } from './verification/useVerificationData';
import type { VerificationMode } from './verification/types';
import { AllTabImprovePanel, getTargetScore } from './AllTabImprovePanel';
import { useAutoRecommendPC } from './hooks/useAutoRecommendPC';
import { useAutoRecommendDC } from './hooks/useAutoRecommendDC';
import { useAutoRecommendS } from './hooks/useAutoRecommendS';
import { useAutoFillEffects } from './hooks/useAutoFillEffects';
import { useRecommendHandlers } from './hooks/useRecommendHandlers';
import { useAutoLldHandlers } from './hooks/useAutoLldHandlers';
import { useAutoLldFilter } from './hooks/useAutoLldFilter';
import { useManualPCDCFill } from './hooks/useManualPCDCFill';
import { useAutoFixAll } from './hooks/useAutoFixAll';
import AllTabModals from './AllTabModals';
import RecommendImprovementModal from './RecommendImprovementModal';
import AutoLldResultModal from './AutoLldResultModal';
import LldFilterResultModal from './LldFilterResultModal';
import { getOptRowCount } from './multiOptUtils';
import { useMultiOptRows } from './hooks/useMultiOptRows';
import { buildFMOptCountKeys, buildProcessGroups } from './fmGroupUtils';
import { ProcessGroupTbody } from './components/ProcessGroupTbody';
import type { FMGroupHandlers } from './components/FMGroupRows';
import { usePathname } from 'next/navigation';
import {
  COLORS, HEIGHTS, COLUMNS_BASE, STEP_COLORS,
  getColumnsWithRPN, getColumnsForModule, calculateStepSpans, calculateGroupSpans,
  ColumnDef, StepSpan, GroupSpan,
  CELL_STYLE, FM_DIVIDER,
  COMPACT_FONT, COMPACT_HEIGHTS,
  getGroupFirstColumnIds,
} from './allTabConstants';
import AllTabHeader from './AllTabHeader';
import type { WorksheetState, L1FailureScope, Process, L2FailureMode, L3FailureCauseExtended } from '../../constants';
import { emitSave } from '../../hooks/useSaveEvent';

// ============ 컴포넌트 ============
interface AllTabEmptyProps {
  rowCount?: number;
  showRPN?: boolean;
  visibleSteps?: string[];
  failureLinks?: FailureLinkRow[];
  state?: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;  // ★★★ 2026-02-11: SOD 즉시 저장용
  onOpen5AP?: () => void;
  onOpen6AP?: () => void;
  onOpenRPN?: () => void;
  activePanelId?: string;
  inputMode?: 'manual' | 'auto';
  onContextMenu?: (
    e: React.MouseEvent,
    rowIdx: number,
    fmId?: string,
    fcId?: string,
    columnType?: 'fm' | 'fc' | 'fe' | 'sod' | 'ap' | 'other'
  ) => void;
  fmeaRevisionDate?: string;
  onOpenSpecialChar?: () => void;
}

export default function AllTabEmpty({
  rowCount = 10,
  showRPN = false,
  visibleSteps,
  failureLinks = [],
  state,
  setState,
  setDirty,
  saveAtomicDB,
  onOpen5AP,
  onOpen6AP,
  onOpenRPN,
  activePanelId,
  inputMode,
  onContextMenu,
  fmeaRevisionDate,
  onOpenSpecialChar,
}: AllTabEmptyProps) {
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  // ★★★ fmeaRevisionDate를 API에서 자동 로드 ★★★
  const [loadedFmeaRevisionDate, setLoadedFmeaRevisionDate] = React.useState(fmeaRevisionDate || '');
  React.useEffect(() => {
    if (fmeaRevisionDate) {
      setLoadedFmeaRevisionDate(fmeaRevisionDate);
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const fmeaId = urlParams.get('id');
      if (fmeaId) {
        fetch(`/api/fmea/projects?id=${fmeaId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.project?.fmeaInfo?.fmeaRevisionDate) {
              setLoadedFmeaRevisionDate(data.project.fmeaInfo.fmeaRevisionDate);
            }
          })
          .catch((err) => { console.error('[AllTab] fmeaRevisionDate 로드 실패:', err); });
      }
    }
  }, [fmeaRevisionDate]);

  // 모달 관리 훅
  const {
    sodModal, controlModal, setControlModal, closeControlModal, closeSodModal,
    handleSODClick, handleSODSelect,
    lldModal, openLldModal, closeLldModal, handleLldSelect,
    openUserModal, closeUserModal, handleUserSelect, userModal,
    openDateModal, closeDateModal, handleDateSelect, dateModal,
  } = useAllTabModals(setState, setDirty, saveAtomicDB);

  // ★ 특별특성 선택 모달 상태 (셀 클릭 → 선택 → riskData 저장)
  const [specialCharModal, setSpecialCharModal] = useState<{
    riskDataKey: string; currentValue: string;
  } | null>(null);

  const handleOpenSpecialChar = React.useCallback((riskDataKey: string, currentValue: string) => {
    setSpecialCharModal({ riskDataKey, currentValue });
  }, []);

  const handleSpecialCharSelect = React.useCallback((symbol: string) => {
    if (!specialCharModal || !setState) return;
    // ★ uniqueKey 추출 → 리스크분석 + 최적화 양쪽 동기 변경
    const baseKey = specialCharModal.riskDataKey
      .replace('specialChar-opt-', '')
      .replace('specialChar-', '');
    const riskKey = `specialChar-${baseKey}`;
    const optKey = `specialChar-opt-${baseKey}`;
    setState((prev: WorksheetState) => {
      const newRiskData = { ...(prev.riskData || {}) };
      if (symbol.trim()) {
        newRiskData[riskKey] = symbol.trim();
        newRiskData[optKey] = symbol.trim();
      } else {
        delete newRiskData[riskKey];
        delete newRiskData[optKey];
      }
      return { ...prev, riskData: newRiskData };
    });
    setDirty?.(true);
    setSpecialCharModal(null);
  }, [specialCharModal, setState, setDirty]);

  // AP 모달 상태
  const [apModal, setApModal] = useState<{
    isOpen: boolean;
    stage: 5 | 6;
    data: Array<{
      id: string; processName: string; failureMode: string; failureCause: string;
      severity: number; occurrence: number; detection: number; ap: 'H' | 'M' | 'L';
    }>;
  }>({ isOpen: false, stage: 5, data: [] });

  // AP 개선 모달 상태
  const [apImproveModal, setApImproveModal] = useState<{
    isOpen: boolean; uniqueKey: string; fmId: string; fcId: string;
    s: number; o: number; d: number; ap: 'H' | 'M' | 'L'; failureMode?: string;
  }>({ isOpen: false, uniqueKey: '', fmId: '', fcId: '', s: 0, o: 0, d: 0, ap: 'L' });

  const handleApImprove = useCallback((uniqueKey: string, fmId: string, fcId: string, s: number, o: number, d: number, ap: 'H' | 'M' | 'L', failureMode?: string) => {
    setApImproveModal({ isOpen: true, uniqueKey, fmId, fcId, s, o, d, ap, failureMode });
  }, []);

  const handleApImproveSave = useCallback(async (data: { uniqueKey: string; direction: string; preventionOpt?: string; detectionOpt?: string }) => {
    if (!setState) return;

    // CFT 리더 이름 조회하여 책임자 자동 배정
    let leader = '';
    try {
      const fmeaId = state?.fmeaId || new URLSearchParams(window.location.search).get('id') || '';
      if (fmeaId) {
        const res = await fetch(`/api/fmea/info?fmeaId=${encodeURIComponent(fmeaId)}`);
        const info = await res.json();
        leader = info?.fmeaInfo?.responsible || info?.fmeaInfo?.fmeaResponsibleName || '';
      }
    } catch (err: unknown) { console.error('[AllTab] CFT 리더 조회 실패:', err); }

    setState((prev: WorksheetState) => {
      const rd = prev.riskData || {};
      const updates: Record<string, string> = {};
      if (data.preventionOpt) updates[`prevention-opt-${data.uniqueKey}`] = data.preventionOpt;
      if (data.detectionOpt) updates[`detection-opt-${data.uniqueKey}`] = data.detectionOpt;
      const personKey = `person-opt-${data.uniqueKey}`;
      if (leader && !((rd[personKey] as string) || '').trim()) {
        updates[personKey] = leader;
      }
      return { ...prev, riskData: { ...rd, ...updates } };
    });
    setDirty?.(true);
  }, [setState, setDirty, state]);

  // ★ 성능 최적화: fmeaId를 ref로 추출 (콜백에서 state 의존 제거 → 참조 안정화)
  const fmeaIdRef = useRef(state?.fmeaId || '');
  useEffect(() => { fmeaIdRef.current = state?.fmeaId || ''; }, [state]);

  // ★ 2026-02-22: FM/FC 셀 클릭 → 고장연결 탭 이동 핸들러
  const handleNavigateToFailureLink = React.useCallback((fmId: string) => {
    if (!setState) return;
    saveAtomicDB?.();
    setState(prev => ({ ...prev, tab: 'failure-link' }));
    try {
      localStorage.setItem(`pfmea_tab_${fmeaIdRef.current || 'default'}`, 'failure-link');
    } catch (e) { console.error('[AllTab] localStorage 저장 실패:', e); }
  }, [setState, saveAtomicDB]);

  // ★ 검증 뷰에서 더블클릭 → 해당 분석 탭의 정확한 항목으로 이동
  const handleNavigateToAnalysisTab = React.useCallback((level: 'FE' | 'FM' | 'FC', itemId: string) => {
    if (!setState) return;
    saveAtomicDB?.();
    const tabMap = { FE: 'failure-l1', FM: 'failure-l2', FC: 'failure-l3' } as const;
    const targetTab = tabMap[level];
    setState(prev => ({
      ...prev,
      tab: targetTab,
      previousTab: 'all',
      previousVerificationMode: level,
      scrollToItemId: itemId,
    }));
    try {
      localStorage.setItem(`pfmea_tab_${fmeaIdRef.current || 'default'}`, targetTab);
    } catch (e) { console.error('[AllTab] localStorage 저장 실패:', e); }
  }, [setState, saveAtomicDB]);

  // 고장연결 데이터 처리 (failureScopes: 1L탭 심각도 fallback)
  const failureScopes = state?.l1?.failureScopes;
  const processedFMGroups = React.useMemo(
    () => processFailureLinks(failureLinks, state?.l2, failureScopes),
    [failureLinks, state?.l2, failureScopes]
  );

  // ★ 고장연결검증 모드: state.verificationMode (TabMenu에서 설정)
  const verificationMode = (state?.verificationMode || null) as VerificationMode;

  // 분석 탭에서 돌아왔을 때 previousVerificationMode 자동 복원 후 클리어
  useEffect(() => {
    if (state?.previousVerificationMode && state?.previousTab === 'all') {
      setState?.(prev => ({ ...prev, verificationMode: state.previousVerificationMode as VerificationMode, previousTab: undefined, previousVerificationMode: undefined }));
    }
  }, [state?.previousVerificationMode, state?.previousTab, setState]);
  const { feSpanned, fmSpanned, fcSpanned, counts: vCounts, leftStats, rightStats } = useVerificationData(verificationMode, processedFMGroups);

  // 통계 계산
  const { globalMaxSeverity, apStats, apStats6, srpStats } = useAllTabStats({
    state, failureLinks, processedFMGroups,
  });

  // ★ LLD(필터코드) 통합 추천 핸들러 (모달 관리만 — setState는 여기서 직접)
  const {
    handleAutoLldFilter, lldFilterModal, closeLldFilterModal, getCheckedChanges,
    selectMatchedAndApply, deleteLldFilterCandidates,
    toggleLldFilterCheck, toggleAllLldFilterCheck,
  } = useAutoLldFilter({
    state, processedFMGroups,
  });

  // 컬럼 계산 (메모이제이션) — LLD 모달 오픈 시 자동 조정
  const columns = useMemo(() => {
    const allCols = showRPN ? getColumnsWithRPN(isDfmea) : getColumnsForModule(isDfmea);
    // LLD 모달 오픈 시 해당 단계에 맞는 컬럼만 표시
    if (lldFilterModal.isOpen) {
      const stepMap: Record<string, string[]> = {
        '5ST': ['구조분석', '고장분석', '리스크분석'],
        '6ST': ['고장분석', '리스크분석', '최적화'],
      };
      const overrideSteps = stepMap[lldFilterModal.applyStep];
      if (overrideSteps) return allCols.filter(col => overrideSteps.includes(col.step));
    }
    const filtered = visibleSteps && visibleSteps.length > 0
      ? allCols.filter(col => visibleSteps.includes(col.step))
      : allCols;
    return filtered;
  }, [showRPN, visibleSteps, lldFilterModal.isOpen, lldFilterModal.applyStep, isDfmea]);

  const stepSpans = useMemo(() => calculateStepSpans(columns), [columns]);
  const groupSpans = useMemo(() => calculateGroupSpans(columns), [columns]);
  const groupFirstIds = useMemo(() => getGroupFirstColumnIds(columns), [columns]);
  const totalWidth = useMemo(() => columns.reduce((sum, col) => sum + col.width, 0), [columns]);

  // ★ Compact 모드: ALL탭은 항상 전체 표시 → compact 비활성 (극초컴팩트 방지)
  const isCompact = false;
  const hFont = isCompact ? COMPACT_FONT : undefined;
  const hHeights = isCompact ? COMPACT_HEIGHTS : HEIGHTS;

  // ★ FM별 optCountKey 생성 (전체 riskData 스캔 대신 FM별 opt-rows 키만 추출)
  const fmOptCountKeys = useMemo(
    () => buildFMOptCountKeys(processedFMGroups, state?.riskData || {}),
    [processedFMGroups, state?.riskData],
  );

  // ★ 공정별 FM 그룹핑 (processedFMGroups 변경 시만 재계산)
  const processGroups = useMemo(
    () => buildProcessGroups(processedFMGroups),
    [processedFMGroups],
  );

  // ★★★ 2026-02-23: failureStats를 구조/SOD 분리 — riskData 변경 시 구조통계 재계산 방지 ★★★
  // 1) 구조 통계 (failureLinks/l1/l2만 의존 — riskData 변경 무관)
  const structureStats = useMemo(() => {
    const linkedFeIds = new Set<string>();
    const linkedFmIds = new Set<string>();
    const linkedFcIds = new Set<string>();

    failureLinks.forEach((link: FailureLinkRow) => {
      if (link.feId) linkedFeIds.add(link.feId);
      if (link.fmId) linkedFmIds.add(link.fmId);
      if (link.fcId) linkedFcIds.add(link.fcId);
    });

    const linked = { fe: linkedFeIds.size, fm: linkedFmIds.size, fc: linkedFcIds.size };

    let stateFe = 0, stateFm = 0, stateFc = 0;
    if (state?.l1?.failureScopes) {
      stateFe = state.l1.failureScopes.filter((fs: L1FailureScope) => fs.effect || fs.id).length;
    }
    if (state?.l2) {
      state.l2.forEach((proc: Process) => {
        if (proc.failureModes) stateFm += proc.failureModes.filter((fm: L2FailureMode) => fm.name || fm.id).length;
        if (proc.failureCauses) stateFc += proc.failureCauses.filter((fc: L3FailureCauseExtended & { cause?: string }) => fc.cause || fc.name || fc.id).length;
      });
    }
    const stateCounts = { fe: stateFe, fm: stateFm, fc: stateFc };
    const mismatch = {
      fe: linked.fe !== stateCounts.fe && linked.fe > 0 && stateCounts.fe > 0,
      fm: linked.fm !== stateCounts.fm && linked.fm > 0 && stateCounts.fm > 0,
      fc: linked.fc !== stateCounts.fc && linked.fc > 0 && stateCounts.fc > 0,
    };
    const missingSevCount = processedFMGroups.filter(g => g.maxSeverity === 0).length;
    return { linked, state: stateCounts, mismatch, hasMismatch: mismatch.fe || mismatch.fm || mismatch.fc, missingSevCount };
  }, [failureLinks, state?.l1, state?.l2, processedFMGroups]);

  // 2) SOD 누락 카운트 (riskData만 의존 — 가벼운 O(n) 연산)
  const missingSODCounts = useMemo(() => {
    const riskData = state?.riskData || {};
    let missingOCount = 0;
    let missingDCount = 0;
    processedFMGroups.forEach(fmGroup => {
      fmGroup.rows.forEach((row, rowIdx) => {
        if (fmGroup.fmId && (row.fcId || row.fcRowSpan > 0)) {
          // ★ fcId 빈값 방어: FMGroupRows와 동일한 키 패턴
          const uniqueKey = row.fcId
            ? `${fmGroup.fmId}-${row.fcId}`
            : `${fmGroup.fmId}-r${rowIdx}`;
          const o = Number(riskData[`risk-${uniqueKey}-O`]) || 0;
          const d = Number(riskData[`risk-${uniqueKey}-D`]) || 0;
          // O=1, D=1은 import 기본값 → 미평가로 간주
          if (o <= 1) missingOCount++;
          if (d <= 1) missingDCount++;
        }
      });
    });
    return { missingOCount, missingDCount };
  }, [state?.riskData, processedFMGroups]);

  // 3) 합치기 (두 메모 모두 변경 시에만 새 객체 생성)
  const failureStats = useMemo(() => ({
    ...structureStats,
    ...missingSODCounts,
  }), [structureStats, missingSODCounts]);

  // ★ 3ST 기능분석 통계: 완제품기능(C2)/요구사항(C3)/고장영향(C4) 카운트
  const functionStats = useMemo(() => {
    const l1 = state?.l1;
    if (!l1) return undefined;
    // C2 완제품기능: l1.types[].functions[] (빈 이름 제외)
    let productFunctionCount = 0;
    // C3 요구사항: l1.types[].functions[].requirements[]
    let requirementCount = 0;
    for (const t of (l1.types || [])) {
      for (const f of (t.functions || [])) {
        if (f.name?.trim()) productFunctionCount++;
        for (const r of (f.requirements || [])) {
          if (r.name?.trim()) requirementCount++;
        }
      }
    }
    // C4 고장영향: l1.failureScopes[] (effect 또는 id 존재)
    const failureEffectCount = (l1.failureScopes || []).filter((fs: L1FailureScope) => fs.effect || fs.id).length;
    return { productFunctionCount, requirementCount, failureEffectCount };
  }, [state?.l1]);

  // ★★★ 2026-02-23: O누락/D누락/S누락 배지 클릭 → 해당 미평가 행으로 스크롤 ★★★
  const missingScrollIdxRef = useRef<{ S: number; O: number; D: number }>({ S: 0, O: 0, D: 0 });

  const scrollToMissing = useCallback((category: 'S' | 'O' | 'D') => {
    const missingKeys: string[] = [];
    
    if (category === 'S') {
      // 심각도 누락 수집
      processedFMGroups.forEach(fmGroup => {
        if (fmGroup.maxSeverity === 0 && fmGroup.fmId) {
          missingKeys.push(fmGroup.fmId);
        }
      });
    } else {
      // O, D 누락 수집
      const riskData = state?.riskData || {};
      processedFMGroups.forEach(fmGroup => {
        fmGroup.rows.forEach((row, rowIdx) => {
          if (fmGroup.fmId && (row.fcId || row.fcRowSpan > 0)) {
            const uk = row.fcId
              ? `${fmGroup.fmId}-${row.fcId}`
              : `${fmGroup.fmId}-r${rowIdx}`;
            const val = Number(riskData[`risk-${uk}-${category}`]) || 0;
            if (val === 0) missingKeys.push(uk);
          }
        });
      });
    }

    if (missingKeys.length === 0) return;

    // 순환 인덱스
    const idx = missingScrollIdxRef.current[category] % missingKeys.length;
    missingScrollIdxRef.current[category] = idx + 1;
    const targetKey = missingKeys[idx];

    // data-fm 속성(S누락) 또는 data-uk 속성(O/D누락) 찾기
    const selector = category === 'S' ? `tr[data-fm="${targetKey}"]` : `tr[data-uk="${targetKey}"]`;
    const tr = document.querySelector(selector) as HTMLElement | null;
    
    if (tr) {
      tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 하이라이트 깜빡임
      tr.style.outline = '3px solid #ff5722';
      tr.style.outlineOffset = '-1px';
      setTimeout(() => { tr.style.outline = ''; tr.style.outlineOffset = ''; }, 1500);
    }
  }, [state?.riskData, processedFMGroups]);

  // 개선방향 패널 상태
  const [showImprovePanel, setShowImprovePanel] = useState(false);
  const [improvedItems, setImprovedItems] = useState<Set<string>>(new Set());

  const handleImprove = (fmId: string, fcId: string, type: 'O' | 'D', current: number, globalRowIdx: number) => {
    const uniqueKey = fmId && fcId ? `${fmId}-${fcId}` : `legacy-${globalRowIdx}`;
    setImprovedItems(prev => new Set([...prev, `${uniqueKey}-${type}`]));

    if (setState) {
      const target = getTargetScore(current, type);
      const riskKey = fmId && fcId ? `risk-${fmId}-${fcId}-${type}` : `risk-${globalRowIdx}-${type}`;
      setState(prev => ({
        ...prev,
        riskData: { ...(prev.riskData || {}), [riskKey]: target }
      }));
      if (setDirty) setDirty(true);
    }
  };

  // ★ 예방관리(PC) 자동추천 훅
  const { autoRecommendPC } = useAutoRecommendPC({
    state, setState, setDirty, processedFMGroups, saveAtomicDB,
  });

  // ★ 검출관리(DC) 자동추천 훅
  const { autoRecommendDC } = useAutoRecommendDC({
    state, setState, setDirty, processedFMGroups, saveAtomicDB,
  });

  // ★ O/D 매칭 핸들러 (Import 1:1 직접 매칭)
  const handleOMatch = useCallback(() => {
    autoRecommendPC(1, true); // force=true → 기존 자동추천(P:) 덮어쓰기, Import 1:1 매칭
  }, [autoRecommendPC]);

  const handleDMatch = useCallback(() => {
    autoRecommendDC(3, false); // maxCount=3, force=false (빈 셀만)
  }, [autoRecommendDC]);

  // ★ O/D 누락 하이라이트 토글 상태
  const [highlightMissingO, setHighlightMissingO] = useState(false);
  const [highlightMissingD, setHighlightMissingD] = useState(false);
  const toggleHighlightO = useCallback(() => setHighlightMissingO(p => !p), []);
  const toggleHighlightD = useCallback(() => setHighlightMissingD(p => !p), []);

  // ★ 심각도(S) 자동추천 훅
  const { autoRecommendS } = useAutoRecommendS({
    state, setState, setDirty, processedFMGroups, saveAtomicDB,
  });

  // ★ 추천/개선 핸들러 (useRecommendHandlers.ts로 분리)
  const {
    handleAPImprove, handleRecommendImprovement, autoRecommendO, autoRecommendD,
    recommendModal, closeRecommendModal, applyRecommendations, applySingleRecommendation,
  } = useRecommendHandlers({
    state, setState, setDirty, saveAtomicDB, processedFMGroups, globalMaxSeverity,
  });

  // ★ 습득교훈(LLD) 자동선택 핸들러
  const {
    handleAutoLld, autoLldModal, closeAutoLldModal, applyAutoLld,
    toggleAutoLldCheck, toggleAllAutoLldCheck,
  } = useAutoLldHandlers({
    state, setState, setDirty, saveAtomicDB, processedFMGroups,
  });

  // ★★★ LLD 일괄적용 — AllTabEmpty에서 직접 setState (handleLldSelect와 동일 코드 경로) ★★★
  const applyLldFilter = useCallback(() => {
    if (!setState) return;
    // ★ 적용 전에 applyStep 캡처 (getCheckedChanges가 모달을 닫으므로)
    const applyStep = lldFilterModal.applyStep;
    const result = getCheckedChanges();
    if (!result) return;

    const { changes, appliedLldNos } = result;

    // ★ 적용 후 해당 step view 유지 (모달 닫힘으로 인한 화면 이탈 방지)
    const stepViewMap: Record<string, number[]> = {
      '5ST': [4, 5],
      '6ST': [4, 5, 6],
    };

    // setState 직접 호출 — handleLldSelect (useAllTabModals.ts:418)와 100% 동일 패턴
    setState((prev: WorksheetState) => ({
      ...prev,
      riskData: { ...(prev.riskData || {}), ...changes },
      visibleSteps: stepViewMap[applyStep] || prev.visibleSteps,
    }));

    if (setDirty) setDirty(true);

    // DB 저장
    emitSave();

    // API — LLD 적용결과 기록
    const fmeaId = state?.fmeaId || '';
    for (const lldNo of appliedLldNos) {
      fetch('/api/lld/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lldNo, fmeaId, appliedDate: new Date().toISOString().slice(0, 10) }),
      }).catch(err => console.error('[LLD Apply] API 오류:', err));
    }
  }, [setState, setDirty, saveAtomicDB, state?.fmeaId, getCheckedChanges, lldFilterModal.applyStep]);

  // ★★★ 매칭선택 적용 (원클릭) ★★★
  const applyLldFilterMatchedOnly = useCallback(() => {
    if (!setState) return;
    const applyStep = lldFilterModal.applyStep;
    const result = selectMatchedAndApply();
    if (!result) return;

    const { changes, appliedLldNos } = result;
    const stepViewMap: Record<string, number[]> = { '5ST': [4, 5], '6ST': [4, 5, 6] };

    setState((prev: WorksheetState) => ({
      ...prev,
      riskData: { ...(prev.riskData || {}), ...changes },
      visibleSteps: stepViewMap[applyStep] || prev.visibleSteps,
    }));

    if (setDirty) setDirty(true);
    emitSave();

    const fmeaId = state?.fmeaId || '';
    for (const lldNo of appliedLldNos) {
      fetch('/api/lld/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lldNo, fmeaId, appliedDate: new Date().toISOString().slice(0, 10) }),
      }).catch(err => console.error('[LLD Apply] API 오류:', err));
    }
  }, [setState, setDirty, saveAtomicDB, state?.fmeaId, selectMatchedAndApply, lldFilterModal.applyStep]);

  // ★★★ 6ST 최적화 LLD 전체 삭제 ★★★
  const handleClearOptLld = useCallback(() => {
    if (!setState || !state?.riskData) return;
    const riskData = state.riskData;
    // lesson-opt-* 키가 있는 uniqueKey 수집
    const lldUks = new Set<string>();
    for (const key of Object.keys(riskData)) {
      if (key.startsWith('lesson-opt-')) {
        lldUks.add(key.replace('lesson-opt-', ''));
      }
    }
    if (lldUks.size === 0) {
      alert('삭제할 LLD 적용 데이터가 없습니다.');
      return;
    }
    if (!confirm(`6ST 최적화에 적용된 LLD ${lldUks.size}건을 삭제하시겠습니까?`)) return;

    const cleaned = { ...riskData };
    for (const uk of lldUks) {
      delete cleaned[`lesson-opt-${uk}`];
      delete cleaned[`prevention-opt-${uk}`];
      delete cleaned[`detection-opt-${uk}`];
      delete cleaned[`opt-${uk}-O`];
      delete cleaned[`opt-${uk}-D`];
    }
    setState((prev: WorksheetState) => ({ ...prev, riskData: cleaned }));
    if (setDirty) setDirty(true);
    emitSave();
  }, [setState, setDirty, saveAtomicDB, state?.riskData]);

  // ★ 자동수정 통합 오케스트레이터 (S→PC→DC 순차실행)
  const { runAutoFix, isRunning: isAutoFixRunning } = useAutoFixAll({
    autoRecommendS, autoRecommendPC, autoRecommendDC, saveAtomicDB,
  });

  // ★ 자동채움 이펙트 (O자동채움, O재평가, PC/DC자동채움) — useAutoFillEffects.ts로 분리
  useAutoFillEffects({ state, setState, setDirty, processedFMGroups });

  // ★ PC/DC 수동 전체 매칭 + LLD 5ST 초기화
  const { handleManualPCDCFill, handleClearLld5ST, isRunningPCDC } = useManualPCDCFill({
    state, setState, setDirty, saveAtomicDB, processedFMGroups,
  });

  // ★ 다중행 개선안 관리 (2026-03-01)
  const { handleAddOptRow, handleRemoveOptRow } = useMultiOptRows({
    state, setState, setDirty, processedFMGroups,
  });

  // ★ 마지막 포커스된 FC uniqueKey 추적 (헤더 "개선추가" 버튼용)
  const lastFocusedOptKeyRef = useRef<string>('');
  const handleAddOptRowTracked = useCallback((uk: string) => {
    lastFocusedOptKeyRef.current = uk;
    handleAddOptRow(uk);
  }, [handleAddOptRow]);
  const handleHeaderAddOpt = useCallback(() => {
    const uk = lastFocusedOptKeyRef.current;
    if (!uk) {
      alert('먼저 최적화 영역의 셀을 클릭하세요.');
      return;
    }
    handleAddOptRow(uk);
  }, [handleAddOptRow]);

  // ★ FMGroupRows 공통 핸들러 (안정 참조)
  const fmGroupHandlers: FMGroupHandlers = useMemo(() => ({
    handleSODClick,
    setControlModal,
    setApModal,
    handleApImprove,
    openLldModal,
    openUserModal,
    openDateModal,
    handleOpenSpecialChar,
    handleAddOptRowTracked,
    handleRemoveOptRow,
    handleNavigateToFailureLink,
  }), [
    handleSODClick, setControlModal, setApModal, handleApImprove,
    openLldModal, openUserModal, openDateModal, handleOpenSpecialChar,
    handleAddOptRowTracked, handleRemoveOptRow, handleNavigateToFailureLink,
  ]);

  // ★ DataSelectModal 저장/삭제 핸들러 (hook 분리)
  const {
    handleSave, handleDelete,
    modalTitle, modalItemCode, currentValues,
    switchModes, handleModeChange, sodInfo, sodRecommendation,
  } = useControlModalSave({
    controlModal, setControlModal, closeControlModal,
    state, setState, setDirty, processedFMGroups,
  });

  return (
    <div className="relative bg-white" style={{ display: 'inline-block', minWidth: '100%' }}>
      {/* H→L 개선방향 패널 */}
      {showImprovePanel && (
        <AllTabImprovePanel
          hItems={apStats.hItems}
          improvedItems={improvedItems}
          onClose={() => setShowImprovePanel(false)}
          onImprove={handleImprove}
        />
      )}

      {/* ★ 검증 모드: 2분할(왼=고장분석, 우=검증), 일반 모드: 기존 ALL 테이블 */}
      {verificationMode ? (
        <div style={{ display: 'flex', gap: '4px', height: 'calc(100vh - 180px)' }}>
          {/* 왼쪽: 4단계 고장분석 요약 (35%) */}
          <div style={{ width: '35%', minWidth: '280px', overflowY: 'auto', overflowX: 'hidden', borderRight: '3px solid #1976d2' }}>
            <FailureAnalysisSummary processedFMGroups={processedFMGroups} leftStats={leftStats} />
          </div>
          {/* 우측: 고장연결검증 테이블 (65%) */}
          <div style={{ width: '65%', minWidth: '400px', overflowY: 'auto', overflowX: 'auto' }}>
            <VerificationTable
              mode={verificationMode}
              feSpanned={feSpanned}
              fmSpanned={fmSpanned}
              fcSpanned={fcSpanned}
              rightStats={rightStats}
              onDoubleClick={handleNavigateToAnalysisTab}
            />
          </div>
        </div>
      ) : (
      <table
        onClick={(e) => {
          // ★ 최적화 영역 클릭 시 lastFocusedOptKey 자동 추적
          const tr = (e.target as HTMLElement).closest('tr[data-uk]') as HTMLElement | null;
          if (tr?.dataset.uk) lastFocusedOptKeyRef.current = tr.dataset.uk;
        }}
        style={{
          // ★ 소수 단계 표시 시 (≤3 step groups) 화면에 완전히 맞추기 (비율 기반)
          // stepSpans.length로 판단 — LLD 모달 override 시에도 정확한 step 수 반영
          width: stepSpans.length <= 3 ? '100%' : `${totalWidth}px`,
          minWidth: stepSpans.length <= 3 ? undefined : `${totalWidth}px`,
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}
      >
        {/* colgroup: 소수 단계 시 비율(%) 기반, 전체 시 고정(px) */}
        <colgroup>
          {columns.map((col, idx) => {
            const usePct = stepSpans.length <= 3;
            const colWidth = usePct
              ? `${((col.width / totalWidth) * 100).toFixed(2)}%`
              : `${col.width}px`;
            return <col key={idx} style={{ width: colWidth }} />;
          })}
        </colgroup>

        <AllTabHeader
          stepSpans={stepSpans}
          groupSpans={groupSpans}
          columns={columns}
          hHeights={hHeights}
          hFont={hFont}
          isCompact={isCompact}
          isDfmea={isDfmea}
          failureStats={failureStats}
          functionStats={functionStats}
          apStats={apStats}
          apStats6={apStats6}
          srpStats={srpStats}
          saveAtomicDB={saveAtomicDB}
          autoRecommendS={autoRecommendS}
          autoRecommendO={autoRecommendO}
          autoRecommendD={autoRecommendD}
          handleRecommendImprovement={handleRecommendImprovement}
          handleAutoLldFilter={handleAutoLldFilter}
          handleClearOptLld={handleClearOptLld}
          handleManualPCDCFill={handleManualPCDCFill}
          isRunningPCDC={isRunningPCDC}
          handleClearLld5ST={handleClearLld5ST}
          scrollToMissing={scrollToMissing}
        />

        {/* ★ 공정별 지연 로딩: 각 공정이 독립 <tbody>로 렌더링 */}
        {processGroups.length > 0 ? (
          processGroups.map(pg => (
            <ProcessGroupTbody
              key={pg.processNo}
              processNo={pg.processNo}
              fmGroups={pg.fmGroups}
              estimatedHeight={pg.estimatedHeight}
              fmOptCountKeys={fmOptCountKeys}
              columns={columns}
              state={state}
              setState={setState}
              setDirty={setDirty}
              handlers={fmGroupHandlers}
              loadedFmeaRevisionDate={loadedFmeaRevisionDate}
              isCompact={isCompact}
              highlightMissingO={highlightMissingO}
              highlightMissingD={highlightMissingD}
              colCount={columns.length}
              groupFirstIds={groupFirstIds}
              RiskOptCellRenderer={RiskOptCellRenderer}
              FailureCellRenderer={FailureCellRenderer}
              FunctionCellRenderer={FunctionCellRenderer}
              StructureCellRenderer={StructureCellRenderer}
            />
          ))
        ) : (
          <tbody>
            {Array.from({ length: rowCount }, (_, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} style={{
                    background: rowIdx % 2 === 0 ? col.cellColor : col.cellAltColor,
                    height: isCompact ? undefined : `${HEIGHTS.body}px`,
                    minHeight: isCompact ? `${COMPACT_HEIGHTS.body}px` : undefined,
                    padding: isCompact ? '1px 1px' : '3px 4px',
                    border: '1px solid #ccc', fontSize: isCompact ? '9px' : '11px',
                    textAlign: col.align, whiteSpace: isCompact ? 'normal' : 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    wordBreak: isCompact ? 'break-word' : undefined,
                  }} />
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
      )}

      {/* ★ 모달 렌더링 (AllTabModals.tsx로 분리) */}
      <AllTabModals
        controlModal={controlModal} closeControlModal={closeControlModal}
        modalTitle={modalTitle} modalItemCode={modalItemCode}
        currentValues={currentValues} switchModes={switchModes}
        handleModeChange={handleModeChange} handleSave={handleSave}
        handleDelete={handleDelete} sodInfo={sodInfo}
        sodRecommendation={sodRecommendation} state={state}
        sodModal={sodModal} closeSodModal={closeSodModal}
        handleSODSelect={handleSODSelect}
        lldModal={lldModal} closeLldModal={closeLldModal}
        handleLldSelect={handleLldSelect} handleAutoLld={handleAutoLld}
        userModal={userModal} closeUserModal={closeUserModal}
        handleUserSelect={handleUserSelect}
        dateModal={dateModal} closeDateModal={closeDateModal}
        handleDateSelect={handleDateSelect}
        apModal={apModal} setApModal={setApModal}
        apImproveModal={apImproveModal} setApImproveModal={setApImproveModal}
        handleApImproveSave={handleApImproveSave}
        specialCharModal={specialCharModal} setSpecialCharModal={setSpecialCharModal}
        handleSpecialCharSelect={handleSpecialCharSelect}
      />

      {/* ★ 개선추천 전체적용 모달 */}
      <RecommendImprovementModal
        isOpen={recommendModal.isOpen}
        onClose={closeRecommendModal}
        candidates={recommendModal.candidates}
        onApplyAll={applyRecommendations}
        onApplySingle={applySingleRecommendation}
        cftLeaderName={recommendModal.cftLeaderName}
        diagnostics={recommendModal.diagnostics}
      />

      {/* ★ 습득교훈 자동선택 모달 */}
      <AutoLldResultModal
        isOpen={autoLldModal.isOpen}
        onClose={closeAutoLldModal}
        modalState={autoLldModal}
        onApplyAll={applyAutoLld}
        onToggleCheck={toggleAutoLldCheck}
        onToggleAllCheck={toggleAllAutoLldCheck}
      />

      {/* ★ LLD(필터코드) 통합 추천 모달 */}
      <LldFilterResultModal
        modal={lldFilterModal}
        onClose={closeLldFilterModal}
        onApply={applyLldFilter}
        onSelectMatchedAndApply={applyLldFilterMatchedOnly}
        onDelete={deleteLldFilterCandidates}
        onToggleCheck={toggleLldFilterCheck}
        onToggleAll={toggleAllLldFilterCheck}
      />
    </div>
  );
}

// Export
export { COLUMNS_BASE, COLORS, HEIGHTS, getColumnsWithRPN, STEP_COLORS };
export type { ColumnDef };
