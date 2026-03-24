/**
 * @file TemplatePreviewContent.tsx
 * @description TemplateGeneratorPanel 우측 패널
 * - SA/FC/FA 서브탭 (기존데이터 모드)
 * - 통합 액션 바 (항상 고정 표시, 활성화/비활성화 방식)
 * - L1/L2/L3 미리보기 테이블
 * @created 2026-02-26
 * @updated 2026-02-27 — 통합 툴바 (메뉴 고정 + 활성화/비활성화, 저장버튼 제거)
 *
 * CODEFREEZE — 최고단계 (2026-02-28)
 * 수정 조건: "IMPORT 통계검증 수정해"라고 명시적으로 지시할 때만 수정
 * 포괄적 수정 지시 시 반드시 사용자에게 먼저 확인 요청
 */

'use client';

import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { ImportStepState } from '../utils/stepConfirmation';
import type { CrossTab, CrossTabIds } from '../utils/template-delete-logic';
import type { FCComparisonResult } from '../utils/fcComparison';
import type { ParseStatistics } from '../excel-parser';
import type { TemplateMode } from '../hooks/useTemplateGenerator';
import { FailureChainPreview } from './FailureChainPreview';
// FullAnalysisPreview 삭제됨 (사용자 요청)
import { FAVerificationBar } from './FAVerificationBar';
import { TH, TD_NO, TD, TD_EDIT, M4_LABEL, M4_BADGE, EditCell } from './TemplateSharedUI';
import { validateAccuracy, validateFCAccuracy, summarizeAccuracyWarnings, type AccuracyWarning } from '../utils/accuracy-validation';
import { validateStructuralCompleteness, summarizeStructuralIssues } from '../utils/structural-validation';
import { validateUUIDIntegrity, summarizeUUIDIssues } from '../utils/uuid-integrity-validation';
import { ImportAlertDialog, INITIAL_ALERT_STATE, type ImportAlertState } from './ImportAlertDialog';
import { autoFixMissingA6, autoFixMissingB5 } from '../utils/autoFixMissing';
import { useImportVerification } from '../hooks/useImportVerification';
import { supplementMissingItems } from '../utils/supplementMissingItems';
import { supplementChainsFromFlatData } from '../utils/supplementChainsFromFlatData';

// ─── Props ───

export interface TemplatePreviewContentProps {
  // 모드
  templateMode: TemplateMode;
  isFullscreen: boolean;
  // 편집 상태
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  editDisabled: boolean;
  templateGenerated: boolean;
  setTemplateGenerated: (v: boolean) => void;
  // 미리보기 레벨 (L1/L2/L3 테이블 전용 — 고장사슬은 activeStep === 'FC' 패널)
  previewLevel: 'L1' | 'L2' | 'L3';
  setPreviewLevel: (v: 'L1' | 'L2' | 'L3') => void;
  // 행 선택
  selectedRows: Set<number>;
  setSelectedRows: (v: Set<number>) => void;
  tableMaxH: string;
  // 데이터
  flatData: ImportedFlatData[];
  generatedData: ImportedFlatData[];
  crossTab: CrossTab;
  failureChains: MasterFailureChain[];
  missingStats: { L1: number; L2: number; L3: number; total: number };
  missingDetails: { L1: string[]; L2: string[]; L3: string[] };
  // 3단계 확정
  stepState: ImportStepState;
  setActiveStep: (step: 'SA' | 'FC' | 'FA') => void;
  canSA: boolean;
  canFC: boolean;
  canFA: boolean;
  confirmSA: () => { success: boolean; diagnostics: { l2Count: number; l3Count: number; l2FuncCount: number; l3FuncCount: number; fmCount: number; fcCount: number; feCount: number } } | null;
  confirmFC: (force?: boolean) => void;
  confirmFA: () => void;
  quickCreateWorksheet?: () => Promise<void>;
  resetToSA: () => void;
  resetToFC: () => void;
  fcComparison?: FCComparisonResult | null;
  isAnalysisImporting: boolean;
  isAnalysisComplete: boolean;
  // 핸들러
  onGenerate: () => void;
  onUpdateItem?: (id: string, value: string) => void;
  onUpdateM4?: (id: string, m4: string) => void;
  onDeleteItems?: (ids: string[]) => void;
  onAddItems?: (items: Omit<ImportedFlatData, 'id'>[]) => void;
  onImportFile?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  dirty?: boolean;
  onDownloadSample?: () => void;
  onDownloadEmpty?: () => void;
  // 행 조작 핸들러
  toggleRow: (idx: number) => void;
  toggleAll: (rows: { _ids: CrossTabIds }[]) => void;
  handleDeleteSelected: () => void;
  handleAddFromSelected: () => void;
  handleAddL2Row: () => void;
  handleAddL3Row: () => void;
  handleAddL1Row: (catOverride?: string) => void;
  // 행추가 폼 상태
  addPNo: string;
  setAddPNo: (v: string) => void;
  addM4: 'MN' | 'MC' | 'IM' | 'EN';
  setAddM4: (v: 'MN' | 'MC' | 'IM' | 'EN') => void;
  addCat: string;
  setAddCat: (v: string) => void;
  // 정보
  l1Name?: string;
  bdFmeaName?: string;
  parseStatistics?: ParseStatistics;
  fmeaId?: string;
}

// ─── 버튼 공통 스타일 ───

const BTN_DISABLED = 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';
const BTN_CONFIRMED = 'bg-green-50 text-green-700 border-green-300 cursor-default';

// ─── 컴포넌트 ───

export function TemplatePreviewContent(props: TemplatePreviewContentProps) {
  const {
    templateMode, isFullscreen,
    isEditing, setIsEditing, editDisabled, templateGenerated, setTemplateGenerated,
    previewLevel, setPreviewLevel, selectedRows, setSelectedRows, tableMaxH,
    flatData, generatedData, crossTab, failureChains, missingStats, missingDetails,
    stepState, setActiveStep, canSA, canFC, canFA, confirmSA, confirmFC, confirmFA, quickCreateWorksheet, resetToSA, resetToFC,
    fcComparison, isAnalysisImporting, isAnalysisComplete,
    onGenerate, onUpdateItem, onUpdateM4, onDeleteItems, onAddItems,
    onImportFile, onSave, isSaving, dirty, onDownloadSample, onDownloadEmpty,
    toggleRow, toggleAll, handleDeleteSelected, handleAddFromSelected,
    handleAddL2Row, handleAddL3Row, handleAddL1Row,
    addPNo, setAddPNo, addM4, setAddM4,
    l1Name, bdFmeaName, parseStatistics, fmeaId,
  } = props;

  const isDownload = templateMode === 'download';
  const isManualMode = templateMode === 'manual';
  // ★ 2026-03-10: 4개 모드(기존/수동/자동/전처리) 모두 SA→FC→FA 3단계 검증 표준화
  const hasStepProcess = flatData.length > 0;  // 데이터가 있으면 3단계 프로세스 활성화
  const isSAActive = stepState.activeStep === 'SA';
  // ★ 수동모드: SA만 표시 (FC 제외 — 고장영향까지만 검증)
  const visibleSteps: readonly ('SA' | 'FC')[] = isManualMode ? ['SA'] : ['SA', 'FC'];

  // ── parseStatistics 없을 때 flatData/crossTab에서 통계 자동 생성 ──
  const effectiveStatistics = useMemo<ParseStatistics | undefined>(() => {
    if (parseStatistics) {
      const ALL_CODES_PS: [string, string][] = [
        ['A1', '공정번호'], ['A2', '공정명'], ['A3', '공정기능'],
        ['A4', '제품특성'], ['A5', '고장형태'], ['A6', '검출관리'],
        ['B1', '작업요소'], ['B2', '요소기능'], ['B3', '공정특성'],
        ['B4', '고장원인'], ['B5', '예방관리'],
        ['C1', '구분'], ['C2', '제품기능'], ['C3', '요구사항'], ['C4', '고장영향'],
      ];
      const existing = new Set(parseStatistics.itemStats.map(s => s.itemCode));
      const filled = [...parseStatistics.itemStats];
      for (const [code, label] of ALL_CODES_PS) {
        if (!existing.has(code)) filled.push({ itemCode: code, label, rawCount: 0, uniqueCount: 0, dupSkipped: 0 });
      }
      filled.sort((a, b) => a.itemCode.localeCompare(b.itemCode));
      return { ...parseStatistics, itemStats: filled };
    }
    if (crossTab.total === 0 && flatData.length === 0) return undefined;

    const ALL_CODES: [string, string][] = [
      ['A1', '공정번호'], ['A2', '공정명'], ['A3', '공정기능'],
      ['A4', '제품특성'], ['A5', '고장형태'], ['A6', '검출관리'],
      ['B1', '작업요소'], ['B2', '요소기능'], ['B3', '공정특성'],
      ['B4', '고장원인'], ['B5', '예방관리'],
      ['C1', '구분'], ['C2', '제품기능'], ['C3', '요구사항'], ['C4', '고장영향'],
    ];
    const ITEM_LABELS: Record<string, string> = Object.fromEntries(ALL_CODES);

    const codeCounts = new Map<string, { raw: number; vals: Set<string> }>();
    ALL_CODES.forEach(([code]) => codeCounts.set(code, { raw: 0, vals: new Set() }));
    flatData.forEach(d => {
      const code = d.itemCode;
      if (!code) return;
      if (!codeCounts.has(code)) codeCounts.set(code, { raw: 0, vals: new Set() });
      const entry = codeCounts.get(code)!;
      entry.raw++;
      if (d.value?.trim()) {
        // B-레벨: 같은 공정·다른 4M의 동일 텍스트는 별개 항목 → m4 포함
        const uniqueKey = d.category === 'B' && d.m4
          ? `${d.processNo || ''}|${d.m4}|${d.value.trim()}`
          : `${d.processNo || ''}|${d.value.trim()}`;
        entry.vals.add(uniqueKey);
      }
    });

    const itemStats: import('../excel-parser').ItemCodeStat[] = [];
    for (const [code] of ALL_CODES) {
      const info = codeCounts.get(code) || { raw: 0, vals: new Set<string>() };
      itemStats.push({
        itemCode: code,
        label: ITEM_LABELS[code] || code,
        rawCount: info.raw,
        uniqueCount: info.vals.size,
        dupSkipped: info.raw - info.vals.size,
      });
    }

    // 공정별 통계
    const procMap = new Map<string, { name: string; items: Record<string, { raw: number; unique: Set<string> }> }>();
    flatData.forEach(d => {
      if (!d.processNo || d.category === 'C') return;
      if (!procMap.has(d.processNo)) {
        const nameItem = flatData.find(f => f.processNo === d.processNo && f.itemCode === 'A2');
        procMap.set(d.processNo, { name: nameItem?.value || '', items: {} });
      }
      const proc = procMap.get(d.processNo)!;
      if (!proc.items[d.itemCode]) proc.items[d.itemCode] = { raw: 0, unique: new Set() };
      proc.items[d.itemCode].raw++;
      if (d.value?.trim()) proc.items[d.itemCode].unique.add(d.value.trim());
    });

    const processStats: import('../excel-parser').ProcessItemStat[] = [];
    for (const [pno, info] of procMap) {
      const items: Record<string, { raw: number; unique: number }> = {};
      for (const [code, ci] of Object.entries(info.items)) {
        items[code] = { raw: ci.raw, unique: ci.unique.size };
      }
      processStats.push({ processNo: pno, processName: info.name, items });
    }
    processStats.sort((a, b) => a.processNo.localeCompare(b.processNo, undefined, { numeric: true }));

    return {
      source: 'import' as const,
      totalRows: flatData.length,
      itemStats,
      processStats,
      chainCount: failureChains.length,
    };
  }, [parseStatistics, flatData, crossTab.total, failureChains.length]);

  // ── ★★★ 2026-03-13: 수정본 적색 항목 ID Set (엑셀 적색 표기 → UI 반영) ★★★ ──
  const revisedItemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const d of flatData) {
      if (d.isRevised && d.id) ids.add(d.id);
    }
    return ids;
  }, [flatData]);

  const isRowRevised = useCallback((ids: CrossTabIds): boolean => {
    return Object.values(ids).some(id => id && revisedItemIds.has(id));
  }, [revisedItemIds]);

  // ── 편집 후 자동저장 (2초 디바운스) ──
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!dirty || !onSave || isSaving) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { onSave(); }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [dirty, onSave, isSaving]);

  // ── 경고 다이얼로그 상태 ──
  const [alertState, setAlertState] = useState<ImportAlertState>(INITIAL_ALERT_STATE);
  const closeAlert = useCallback(() => setAlertState(INITIAL_ALERT_STATE), []);

  // ── 통계표/FC검증 토글 ──
  const [showStats, setShowStats] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  // ── ★ SA/FA 단계별 스냅샷 (통계 컬럼용) ──
  const [saSnapshot, setSaSnapshot] = useState<Record<string, number> | null>(null);

  // ── UUID 카운트 (itemCode별) ──
  const uuidCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of flatData) {
      if (!item.itemCode || !item.id || !item.value?.trim()) continue;
      counts[item.itemCode] = (counts[item.itemCode] || 0) + 1;
    }
    return counts;
  }, [flatData]);

  // ★★★ 2026-03-22: FK/pgsql저장/API적합 검증 + 자가개선루프
  const { fkData, pgsqlData, apiData, loopCount, loopLog, runFullVerify, runSelfImprovementLoop } = useImportVerification(fmeaId, flatData, uuidCounts);

  // ── ★ 2026-03-15: 누락 항목코드 자동 보충 (A1-A3, B1-B2, C1-C4) ──
  const supplementedRef = useRef(false);
  useEffect(() => {
    if (supplementedRef.current || flatData.length === 0 || !onAddItems) return;
    const newItems = supplementMissingItems(flatData, failureChains);
    if (newItems.length > 0) {
      supplementedRef.current = true;
      onAddItems(newItems);
      console.log(`[Import 보충] 누락 항목 ${newItems.length}건 자동 생성`);
    }
  }, [flatData, failureChains, onAddItems]);

  // ── ★ 2026-03-16: FC시트 chains를 메인시트 flatData로 보충 (FAVerificationBar 검증 통과) ──
  const supplementedChains = useMemo(() => {
    if (failureChains.length === 0 || flatData.length === 0) return failureChains;
    return supplementChainsFromFlatData(failureChains, flatData);
  }, [failureChains, flatData]);

  // ── ★ 2026-03-16: scanner 공정 수를 보충된 chains 기준으로 보정 ──
  const verificationStatistics = useMemo(() => {
    if (!effectiveStatistics) return effectiveStatistics;
    const suppProcs = new Set(supplementedChains.map(c => c.processNo).filter(Boolean));
    const rf = effectiveStatistics.rawFingerprint;
    if (!rf || rf.processes.length >= suppProcs.size) return effectiveStatistics;
    // scanner 공정 수가 보충 후 체인보다 적으면 보정
    const existingPnos = new Set(rf.processes.map(p => p.processNo));
    const newProcs = [...suppProcs]
      .filter(pno => !existingPnos.has(pno))
      .map(pno => ({
        processNo: pno, processName: pno, fmCount: 0,
        fcByFm: {} as Record<string, number>,
        feByFm: {} as Record<string, number>,
        chainRows: 0,
      }));
    return {
      ...effectiveStatistics,
      rawFingerprint: {
        ...rf,
        processes: [...rf.processes, ...newProcs],
      },
    };
  }, [effectiveStatistics, supplementedChains]);

  // ── 미매칭 항목 스크롤 ──
  const [scrollTarget, setScrollTarget] = useState<{ type: 'FE' | 'FM' | 'FC'; text: string } | null>(null);

  /** 미매칭 항목 클릭 → SA탭 + 해당 레벨 전환 + 스크롤 예약 */
  const handleScrollToUnmatched = useCallback((type: 'FE' | 'FM' | 'FC', text: string) => {
    const level: 'L1' | 'L2' | 'L3' = type === 'FE' ? 'L1' : type === 'FM' ? 'L2' : 'L3';
    if (stepState.activeStep !== 'SA') setActiveStep('SA');
    setPreviewLevel(level);
    setScrollTarget({ type, text });
  }, [stepState.activeStep, setActiveStep, setPreviewLevel]);

  /** 스크롤 실행 — previewLevel 전환 후 DOM 렌더 완료 시 */
  useEffect(() => {
    if (!scrollTarget) return;
    const timer = setTimeout(() => {
      const { type, text } = scrollTarget;
      const level = type === 'FE' ? 'L1' : type === 'FM' ? 'L2' : 'L3';
      const container = document.querySelector(`[data-preview-level="${level}"]`);
      if (!container) { setScrollTarget(null); return; }

      let rowIndex = -1;
      const normT = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

      if (type === 'FE') {
        // FE 텍스트 = 원본 C4 값 (processNo 없음)
        rowIndex = crossTab.cRows.findIndex(r =>
          r.C4 && normT(r.C4) === normT(text)
        );
      } else {
        // FM/FC 텍스트 = "[processNo] value" 형식
        const m = text.match(/^\[(\S+)\]\s*(.+)$/);
        if (m) {
          const [, pno, val] = m;
          if (type === 'FM') {
            rowIndex = crossTab.aRows.findIndex(r =>
              r.processNo === pno && r.A5 && normT(r.A5) === normT(val)
            );
          } else {
            rowIndex = crossTab.bRows.findIndex(r =>
              r.processNo === pno && r.B4 && normT(r.B4) === normT(val)
            );
          }
        }
      }

      if (rowIndex >= 0) {
        const rows = container.querySelectorAll('tbody tr');
        const row = rows[rowIndex] as HTMLElement | undefined;
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.add('ring-2', 'ring-red-400', 'bg-yellow-100');
          setTimeout(() => {
            row.classList.remove('ring-2', 'ring-red-400', 'bg-yellow-100');
          }, 3000);
        }
      }
      setScrollTarget(null);
    }, 120); // DOM 렌더 대기
    return () => clearTimeout(timer);
  }, [scrollTarget, crossTab]);

  // ── 중복행 하이라이트 ──
  const [highlightDupCode, setHighlightDupCode] = useState<string | null>(null);
  const firstDupRef = useRef<HTMLTableRowElement | null>(null);

  /** 중복 행 인덱스 계산: 같은 processNo 내 동일 값 2회 이상 → 중복 */
  const dupRowIndices = useMemo<Set<number>>(() => {
    if (!highlightDupCode) return new Set();
    const code = highlightDupCode;
    const indices = new Set<number>();

    if (code.startsWith('B')) {
      const groups = new Map<string, { idx: number; val: string }[]>();
      crossTab.bRows.forEach((r, i) => {
        const val = (code === 'B1' ? r.B1 : code === 'B2' ? r.B2 : code === 'B3' ? r.B3 : r.B4).trim();
        if (!val) return;
        if (!groups.has(r.processNo)) groups.set(r.processNo, []);
        groups.get(r.processNo)!.push({ idx: i, val });
      });
      groups.forEach(entries => {
        const valMap = new Map<string, number[]>();
        entries.forEach(e => {
          if (!valMap.has(e.val)) valMap.set(e.val, []);
          valMap.get(e.val)!.push(e.idx);
        });
        valMap.forEach(idxs => {
          if (idxs.length > 1) idxs.forEach(idx => indices.add(idx));
        });
      });
    } else if (code.startsWith('A')) {
      const valMap = new Map<string, number[]>();
      crossTab.aRows.forEach((r, i) => {
        const val = (code === 'A1' ? r.A1 : code === 'A2' ? r.A2 : code === 'A3' ? r.A3 : code === 'A4' ? r.A4 : r.A5).trim();
        if (!val) return;
        if (!valMap.has(val)) valMap.set(val, []);
        valMap.get(val)!.push(i);
      });
      valMap.forEach(idxs => {
        if (idxs.length > 1) idxs.forEach(idx => indices.add(idx));
      });
    }
    return indices;
  }, [highlightDupCode, crossTab]);

  const firstDupIdx = useMemo(() =>
    dupRowIndices.size > 0 ? Math.min(...dupRowIndices) : -1
  , [dupRowIndices]);

  /** 통계표 중복 숫자 클릭 → 레벨 전환 + 하이라이트 */
  const handleDupClick = useCallback((itemCode: string) => {
    if (highlightDupCode === itemCode) { setHighlightDupCode(null); return; }
    setHighlightDupCode(itemCode);
    if (itemCode.startsWith('B')) setPreviewLevel('L3');
    else if (itemCode.startsWith('A')) setPreviewLevel('L2');
    else if (itemCode.startsWith('C')) setPreviewLevel('L1');
  }, [highlightDupCode, setPreviewLevel]);

  /** 첫 중복행 자동 스크롤 */
  useEffect(() => {
    if (highlightDupCode && firstDupRef.current) {
      setTimeout(() => {
        firstDupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [highlightDupCode, firstDupIdx]);

  /** 중복행 직접 삭제 (ID 기반, 확인 후 삭제) */
  const handleDeleteDupRows = useCallback(() => {
    if (!onDeleteItems || dupRowIndices.size === 0 || !highlightDupCode) return;
    const code = highlightDupCode;
    const rows = code.startsWith('B') ? crossTab.bRows
      : code.startsWith('A') ? crossTab.aRows
      : crossTab.cRows;
    const ids: string[] = [];
    dupRowIndices.forEach(idx => {
      const row = rows[idx];
      if (row?._ids) Object.values(row._ids).forEach(id => { if (id) ids.push(id); });
    });
    if (ids.length === 0) return;
    setAlertState({
      open: true,
      variant: 'confirm',
      title: `${code} 중복 삭제 확인`,
      summary: `${code} 중복 ${dupRowIndices.size}행(${ids.length}개 항목)을 삭제하시겠습니까?\n\n중복 행 전체가 삭제됩니다.\n하나만 유지하려면 [편집]으로 선택 후 개별 삭제하세요.`,
      onConfirm: () => {
        onDeleteItems(ids);
        setHighlightDupCode(null);
        setSelectedRows(new Set());
      },
    });
  }, [highlightDupCode, dupRowIndices, crossTab, onDeleteItems, setSelectedRows]);

  // ── SA 확정 실행 (confirm 분기 후 호출) ──
  const executeSAConfirm = useCallback(() => {
    const result = confirmSA();
    if (result?.success) {
      // ★ SA 확정 시점의 UUID 카운트 스냅샷 저장 (검증 통계용)
      setSaSnapshot({ ...uuidCounts });
      const d = result.diagnostics;
      const accWarnings = validateAccuracy(generatedData);
      const fcAccWarnings = failureChains.length > 0
        ? validateFCAccuracy(generatedData, failureChains)
        : [];
      const allWarnings = [...accWarnings, ...fcAccWarnings];
      const summary = summarizeAccuracyWarnings(allWarnings);

      // ★ 구조 검증 + UUID 정합성 검증
      const structResult = validateStructuralCompleteness(generatedData, failureChains);
      const uuidResult = validateUUIDIntegrity(generatedData);

      const summaryText = [
        `L2 공정: ${d.l2Count}개`,
        `L3 작업요소: ${d.l3Count}개`,
        `L2기능: ${d.l2FuncCount}개, L3기능: ${d.l3FuncCount}개`,
        `고장형태: ${d.fmCount}개, 고장원인: ${d.fcCount}개, 고장영향: ${d.feCount}개`,
      ].join('\n');

      // 작성정확도만 details에 표시 (구조/UUID는 콘솔 로깅)
      const warningDetails = allWarnings.map(w =>
        `[${w.ruleId}] 공정${w.processNo} ${w.itemCode}: ${w.message}`
      );

      // 구조/UUID 검증 결과는 콘솔에 로깅 (개발자용)
      if (structResult.summary.totalIssues > 0) {
        console.log('[구조검증]', summarizeStructuralIssues(structResult));
        for (const i of structResult.issues) {
          console.log(`  [${i.ruleId}] ${i.sheet} 공정${i.processNo}: ${i.message}`);
        }
      }
      if (uuidResult.issues.length > 0) {
        console.log('[UUID검증]', summarizeUUIDIssues(uuidResult));
        for (const i of uuidResult.issues) {
          console.log(`  [${i.ruleId}] ${i.itemCode} 공정${i.processNo}: ${i.message}`);
        }
      }

      setAlertState({
        open: true,
        variant: summary.total > 0 ? 'warning' : 'success',
        title: 'SA 확정 완료!',
        summary: summaryText,
        details: warningDetails.length > 0 ? warningDetails : undefined,
        footer: summary.total > 0
          ? `작성정확도 경고 ${summary.total}건 — 경고 항목을 검토하여 정확도를 개선하세요.`
          : undefined,
      });
    } else if (result && !result.success) {
      setAlertState({
        open: true,
        variant: 'error',
        title: 'SA 확정 실패',
        summary: '계층 구조 빌드에 문제가 있습니다.',
      });
    } else if (!result) {
      setAlertState({
        open: true,
        variant: 'error',
        title: 'SA 확정 불가',
        summary: '데이터를 먼저 저장해주세요.',
      });
    }
  }, [confirmSA, generatedData, failureChains, uuidCounts]);

  // ── SA 확정 핸들러 (미확정 시 전진) ──
  const handleSAConfirm = useCallback(() => {
    if (generatedData.length === 0) {
      setAlertState({
        open: true,
        variant: 'error',
        title: '기초정보 데이터 없음',
        summary: '기초정보 데이터가 없습니다.\n엑셀 Import 또는 템플릿을 먼저 생성해주세요.',
      });
      return;
    }
    const v = effectiveStatistics?.verification;
    if (v && !v.pass) {
      const typeLabel: Record<string, string> = { FM_COUNT: 'FM건수', FC_PER_FM: 'FC/FM', FE_PER_FM: 'FE/FM', CHAIN_COUNT: '사슬행수' };
      const mismatchDetails = v.mismatches.map(m =>
        `[${m.processNo}] ${typeLabel[m.type] || m.type}: 원본 ${m.rawCount} → 파싱 ${m.parsedCount}`
      );
      setAlertState({
        open: true,
        variant: 'confirm',
        title: `검증 불일치 ${v.mismatches.length}건 발견`,
        summary: '원본 엑셀과 파싱 결과가 다릅니다.\n그래도 SA 확정을 진행하시겠습니까?',
        details: mismatchDetails,
        onConfirm: executeSAConfirm,
      });
      return;
    }
    executeSAConfirm();
  }, [generatedData.length, effectiveStatistics, executeSAConfirm]);

  // ── SA 되돌리기 핸들러 (확정 후 리셋+SA탭 이동) ──
  const handleSAReset = useCallback(() => {
    setSaSnapshot(null);  // SA 스냅샷 초기화
    resetToSA();
  }, [resetToSA]);

  // ── 누락 항목 자동 FIX (A6 검출관리 / B5 예방관리) ──
  const missingA6Count = useMemo(() => crossTab.aRows.filter(r => !r.A6?.trim() && r.A5?.trim()).length, [crossTab.aRows]);
  const missingB5Count = useMemo(() => crossTab.bRows.filter(r => !r.B5?.trim() && r.B4?.trim()).length, [crossTab.bRows]);

  const handleAutoFix = useCallback(() => {
    const a6Result = autoFixMissingA6(crossTab, onUpdateItem, onAddItems);
    const b5Result = autoFixMissingB5(crossTab, onUpdateItem, onAddItems);
    const totalFixed = a6Result.fixed + b5Result.fixed;
    const totalSkipped = a6Result.skipped + b5Result.skipped;
    const allDetails = [...a6Result.details, ...b5Result.details].map(d =>
      `[${d.processNo}] ${d.itemCode}: ${d.value} ← ${d.source}`
    );

    // ★★★ 2026-03-22: autofix 결과 즉시 staging DB 저장 (재로그인 시 재발 방지)
    if (totalFixed > 0 && onSave) {
      // onAddItems/onUpdateItem이 setFlatData를 동기적으로 호출하므로
      // 다음 tick에서 onSave 호출하면 최신 flatData가 DB에 저장됨
      setTimeout(() => onSave(), 100);
    }

    setAlertState({
      open: true,
      variant: totalFixed > 0 ? 'success' : 'warning',
      title: `자동 FIX 완료 — ${totalFixed}건 수정 (DB 저장됨)`,
      summary: [
        `A6(검출관리): ${a6Result.fixed}건 추론 채움${a6Result.skipped > 0 ? `, ${a6Result.skipped}건 스킵(A5 비어있음)` : ''}`,
        `B5(예방관리): ${b5Result.fixed}건 추론 채움${b5Result.skipped > 0 ? `, ${b5Result.skipped}건 스킵(B4 비어있음)` : ''}`,
      ].join('\n'),
      details: allDetails.length > 0 ? allDetails : undefined,
      footer: totalSkipped > 0 ? `스킵 ${totalSkipped}건 — 원본 데이터(A5/B4)가 비어있어 추론 불가` : undefined,
    });
  }, [crossTab, onUpdateItem, onAddItems, onSave]);

  // ── FC 확정 핸들러 (미확정 시 전진) ──
  const handleFCConfirm = useCallback(() => {
    if (fcComparison && fcComparison.missing.length > 0) {
      setAlertState({
        open: true,
        variant: 'confirm',
        title: `FC 비교 결과 누락 ${fcComparison.missing.length}건`,
        summary: `매칭률: ${fcComparison.stats.matchRate.toFixed(0)}%\n\n경고를 무시하고 FC를 확정하시겠습니까?`,
        details: fcComparison.missing.map(m =>
          `[${m.processNo || '-'}] ${m.workElement || '-'}: ${m.fcValue || '-'}`
        ),
        onConfirm: () => confirmFC(true),
      });
    } else {
      confirmFC();
    }
  }, [fcComparison, confirmFC]);

  // ── FC 되돌리기 핸들러 (확정 후 리셋+FC탭 이동) ──
  const handleFCReset = useCallback(() => {
    resetToFC();
  }, [resetToFC]);

  // ★ 2026-02-27: 엑셀 내보내기 제거 (의미 없음)

  return (
    <div className={`flex-1 min-w-0 ${isFullscreen ? '' : 'border-l border-blue-200 pl-3'}`}>
      {/* ─── 데이터/고장사슬 서브탭 ─── */}
      {hasStepProcess && (
        <div className="flex items-center gap-0 mb-1.5 border-b border-gray-200">
          {visibleSteps.map((tab, idx) => {
            const labels = { SA: '데이터 미리보기', FC: 'FC 고장사슬' };
            const counts = { SA: crossTab.total, FC: failureChains.length };
            const isActive = stepState.activeStep === tab;
            return (
              <React.Fragment key={tab}>
                {idx > 0 && <span className="text-gray-300 text-[10px] mx-0.5">|</span>}
                <button onClick={() => setActiveStep(tab)}
                  className={`px-3 py-1 text-[11px] font-bold cursor-pointer transition-colors border-b-2 ${
                    isActive
                      ? 'text-blue-700 border-blue-600 bg-blue-50/60'
                      : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'
                  }`}>
                  {labels[tab]} <span className="text-[9px] font-normal">({counts[tab]})</span>
                </button>
              </React.Fragment>
            );
          })}
          {/* 워크시트 검증 안내 */}
          <span className="ml-auto text-[9px] text-gray-400 pr-2">
            상세 검증/편집: 워크시트 → Verify → STEP 0
          </span>
        </div>
      )}

      {/* ─── 통합 액션 바 (항상 고정 표시, 활성화/비활성화) ─── */}
      <div>
        <div className="flex flex-wrap items-center gap-1 mb-1">
          {/* 편집 */}
          <button onClick={() => {
            if (editDisabled) return;
            if (!isSAActive) {
              setAlertState({
                open: true,
                variant: 'confirm',
                title: 'SA 단계로 되돌리기',
                summary: 'SA 단계로 돌아가서 편집 모드를 활성화합니다.\n계속하시겠습니까?',
                onConfirm: () => {
                  resetToSA();
                  if (!isEditing && !templateGenerated && !isDownload) {
                    onGenerate();
                    setTemplateGenerated(true);
                  }
                  setIsEditing(true);
                },
              });
              return;
            }
            if (!isEditing && !templateGenerated && !isDownload) {
              onGenerate();
              setTemplateGenerated(true);
            }
            setIsEditing(!isEditing); setSelectedRows(new Set());
          }}
            disabled={editDisabled}
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
              editDisabled ? BTN_DISABLED
              : isEditing ? 'bg-blue-600 text-white border-blue-600 cursor-pointer' : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 cursor-pointer'
            }`}>
            {isEditing ? '편집 ON' : '편집'}
          </button>
          {isEditing && (<>
            <button onClick={handleAddFromSelected} disabled={selectedRows.size === 0}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                selectedRows.size > 0 ? 'bg-blue-600 text-white border-blue-600 cursor-pointer' : BTN_DISABLED
              }`}>
              + 행추가 ({selectedRows.size})
            </button>
            <button onClick={handleDeleteSelected} disabled={selectedRows.size === 0}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                selectedRows.size > 0 ? 'bg-red-600 text-white border-red-600 cursor-pointer' : BTN_DISABLED
              }`}>
              삭제 ({selectedRows.size})
            </button>
            {onSave && (
              <button onClick={onSave} disabled={!dirty || isSaving}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                  !dirty || isSaving ? BTN_DISABLED
                  : 'bg-green-600 text-white border-green-600 cursor-pointer hover:bg-green-700'
                }`}>
                {isSaving ? '저장중...' : dirty ? '저장' : '저장됨'}
              </button>
            )}
          </>)}

          <span className="w-px h-4 bg-blue-300 mx-0.5" />

          {/* L1/L2/L3 레벨 전환 (상태별 적색/경고 색상 제거 — 카운트만 표시) */}
          {(['L1','L2','L3'] as const).map(lvl => {
            const count = lvl === 'L1' ? crossTab.cRows.length : lvl === 'L2' ? crossTab.aRows.length : crossTab.bRows.length;
            const miss = missingStats[lvl];
            return (
              <button key={lvl} onClick={() => setPreviewLevel(lvl)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                  previewLevel === lvl
                    ? 'bg-blue-600 text-white border-blue-600 cursor-pointer'
                    : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 cursor-pointer'
                }`}>
                {lvl} <span className="text-[9px]">{count}</span>
                {miss > 0 && <span className={`ml-0.5 text-[8px] ${previewLevel === lvl ? 'text-orange-200' : 'text-orange-500'}`}>({miss})</span>}
              </button>
            );
          })}

          {missingStats[previewLevel] > 0 && (
            <button
              onClick={() => {
                const details = missingDetails[previewLevel];
                if (details.length > 0) {
                  setAlertState({
                    open: true,
                    variant: 'warning',
                    title: `${previewLevel} 누락 ${details.length}건`,
                    summary: '확인 후 해당 행을 편집해 주세요.',
                    details,
                  });
                }
                const tableEl = document.querySelector(`[data-preview-level="${previewLevel}"]`);
                const missingRow = tableEl?.querySelector('tr[data-missing="true"]');
                if (missingRow) {
                  missingRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  (missingRow as HTMLElement).style.outline = '2px solid #f97316';
                  setTimeout(() => { (missingRow as HTMLElement).style.outline = ''; }, 2000);
                }
              }}
              title="클릭하면 누락 항목 상세를 보고 첫 누락 행으로 이동합니다"
              className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 cursor-pointer hover:bg-orange-100">
              누락 {missingStats[previewLevel]}건
            </button>
          )}

          {/* 자동 FIX — A6/B5 누락 자동 채움 */}
          {(missingA6Count > 0 || missingB5Count > 0) && (
            <button
              onClick={handleAutoFix}
              title={`A6(검출관리) ${missingA6Count}건 + B5(예방관리) ${missingB5Count}건 자동 추론 채움`}
              className="px-2.5 py-0.5 rounded text-[10px] font-bold border border-purple-400 text-white bg-purple-600 hover:bg-purple-700 cursor-pointer transition-colors">
              자동FIX ({missingA6Count + missingB5Count})
            </button>
          )}

          {/* 통계표 토글 */}
          {effectiveStatistics && effectiveStatistics.itemStats.length > 0 && (
            <button
              onClick={() => setShowStats(v => !v)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border cursor-pointer ${
                showStats
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
              }`}
              title="아이템코드별 Import 통계표 토글">
              통계
            </button>
          )}

          <span className="w-px h-4 bg-blue-300 mx-0.5" />

          {/* Import */}
          {onImportFile && (
            <button onClick={onImportFile}
              className="px-2.5 py-0.5 rounded text-[10px] font-bold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer">
              Import
            </button>
          )}

          {/* FMEA 작성 — ★ 2026-03-10: FA 완료 후에만 활성화 */}

          {/* ─── 원클릭 Import→워크시트 (SA/FC/FA 자동 확정) ─── */}
          {hasStepProcess && fmeaId && quickCreateWorksheet && (
            <button
              onClick={async () => {
                await quickCreateWorksheet();
                await new Promise(r => setTimeout(r, 2000));
                const result = await runSelfImprovementLoop(
                  // Loop 2: force ReImport
                  async () => {
                    try { await quickCreateWorksheet(); return true; } catch { return false; }
                  },
                  // Loop 3: MasterData Import (save-from-import API)
                  async () => {
                    try {
                      const res = await fetch('/api/fmea/save-from-import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fmeaId, flatData, l1Name: '', failureChains: [] }),
                      });
                      return res.ok;
                    } catch { return false; }
                  }
                );
                if (result.pass) {
                  setAlertState({ open: true, variant: 'success', title: '✅ 자가검증 완료',
                    summary: `${result.loops}회 루프 (${result.strategy}) — pgsql/API ALL PASS\n워크시트로 이동할 수 있습니다.` });
                } else {
                  setAlertState({ open: true, variant: 'warning', title: '⚠️ 자가개선 한계',
                    summary: `3단계 루프 완료 후에도 불일치가 있습니다.\n통계표를 확인하세요.` });
                }
              }}
              disabled={!canSA || isAnalysisImporting || isAnalysisComplete}
              className={`px-3 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                isAnalysisComplete ? BTN_CONFIRMED
                : canSA && !isAnalysisImporting
                  ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 cursor-pointer'
                  : BTN_DISABLED
              }`}>
              {isAnalysisImporting ? '처리중...' : isAnalysisComplete ? '✓ 확정완료' : 'SA+FC+FA 자동확정'}
            </button>
          )}

          {/* ★ 워크시트 이동 — pgsql+API 검증 완료 시에만 활성화 */}
          {fmeaId && flatData.length > 0 && (() => {
            const isVerified = !!(pgsqlData && apiData);
            const allPgsqlOk = pgsqlData ? Object.values(pgsqlData).every(v => v.actual > 0 || v.expected === 0) : false;
            const allApiOk = apiData ? Object.values(apiData).every(v => v.apiCount > 0 || v.expected === 0) : false;
            const canNavigate = isVerified && allPgsqlOk && allApiOk;
            return (
              <button
                onClick={() => {
                  if (canNavigate) {
                    window.location.href = `/pfmea/worksheet?id=${fmeaId}&fresh=1`;
                  } else {
                    setAlertState({
                      open: true,
                      variant: 'warning',
                      title: '검증 미완료',
                      summary: 'Import 후 pgsql/API 검증이 완료되어야 워크시트로 이동할 수 있습니다.\n\n[SA+FC+FA 자동확정] 버튼을 먼저 실행하세요.',
                    });
                  }
                }}
                title={canNavigate ? '검증 완료 — 워크시트 이동' : '검증 미완료 — pgsql/API 확인 필요'}
                className={`px-3 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  canNavigate
                    ? 'border-green-500 text-white bg-green-600 hover:bg-green-700 cursor-pointer'
                    : 'border-orange-400 text-orange-700 bg-orange-50 cursor-pointer hover:bg-orange-100'
                }`}>
                {canNavigate ? '✓ 워크시트 →' : '워크시트 → (검증필요)'}
              </button>
            );
          })()}
          {isAnalysisComplete && (
            <span className="text-[10px] text-green-600 font-bold">✓ 검증 완료</span>
          )}

          {/* ★ 2026-02-27: 엑셀 내보내기 제거, 샘플Down/빈 양식은 탭 바 우측으로 이동 */}
        </div>
      </div>


      {/* ─── Import 통계표 — 전체 표시, 현재 레벨 강조 ─── */}
      {showStats && effectiveStatistics && effectiveStatistics.itemStats.length > 0 && (
        <div className="mb-1.5 border border-indigo-200 rounded bg-indigo-50/30">
          <table className="w-full border-collapse text-[9px]">
            <thead><tr>
              <th className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 text-center border-r border-indigo-500" style={{width:30}}>레벨</th>
              <th className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 text-center border-r border-indigo-500" style={{width:40}}>코드</th>
              <th className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 text-left border-r border-indigo-500">항목</th>
              <th className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 text-center border-r border-indigo-500" style={{width:40}}>원본</th>
              <th className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 text-center border-r border-indigo-500" style={{width:40}}>고유</th>
              <th className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 text-center border-r border-indigo-500" style={{width:40}}>중복</th>
              <th className="bg-cyan-700 text-white font-bold px-1.5 py-0.5 text-center border-r border-cyan-600" style={{width:40}} title="파싱된 유효 UUID 수">UUID</th>
              <th className="bg-emerald-700 text-white font-bold px-1.5 py-0.5 text-center border-r border-emerald-600" style={{width:32}} title="SA(구조확정) 시점 카운트">SA</th>
              <th className="bg-purple-700 text-white font-bold px-1.5 py-0.5 text-center border-r border-purple-600" style={{width:40}} title="FK 무결성 (parentItemId 체인)">FK</th>
              <th className="bg-teal-700 text-white font-bold px-1.5 py-0.5 text-center border-r border-teal-600" style={{width:40}} title="PostgreSQL 프로젝트 스키마 저장 건수">pgsql</th>
              <th className="bg-rose-700 text-white font-bold px-1.5 py-0.5 text-center" style={{width:40}} title="GET API 응답 건수 일치 여부">API</th>
            </tr></thead>
            <tbody>
              {effectiveStatistics.itemStats.map((s, i) => {
                const level = s.itemCode.startsWith('C') ? 'L1' : s.itemCode.startsWith('A') ? 'L2' : 'L3';
                const isCurrentLevel = level === previewLevel;
                const hasDup = s.dupSkipped > 0;
                const isHighlighted = highlightDupCode === s.itemCode;
                const uuid = uuidCounts[s.itemCode] ?? 0;
                return (
                  <tr key={s.itemCode} className={`${
                    isHighlighted ? 'bg-amber-100'
                    : isCurrentLevel ? 'bg-blue-50 font-semibold'
                    : i % 2 ? 'bg-white' : 'bg-gray-50/50'
                  }`}>
                    <td className={`px-1 py-0.5 text-center text-[9px] border-r border-gray-200 ${isCurrentLevel ? 'text-blue-700 font-bold' : 'text-gray-400'}`}>{level}</td>
                    <td className="px-1.5 py-0.5 text-center font-mono font-bold text-[10px] border-r border-gray-200">{s.itemCode}</td>
                    <td className="px-1.5 py-0.5 border-r border-gray-200">{s.label}</td>
                    <td className="px-1.5 py-0.5 text-center font-bold border-r border-gray-200">{s.rawCount}</td>
                    <td className="px-1.5 py-0.5 text-center font-bold text-blue-700 border-r border-gray-200">{s.uniqueCount}</td>
                    <td className="px-1.5 py-0.5 text-center font-bold border-r border-gray-200">
                      {hasDup ? (
                        <button onClick={() => handleDupClick(s.itemCode)}
                          className={`px-1.5 rounded cursor-pointer font-bold ${
                            isHighlighted ? 'bg-amber-500 text-white' : 'text-red-600 bg-red-50 hover:bg-red-100'
                          }`}>
                          {s.dupSkipped}
                        </button>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    {/* ★ UUID / SA / FA / 차이 */}
                    <td className="px-1.5 py-0.5 text-center font-bold text-cyan-700 border-r border-gray-200">{uuid || <span className="text-gray-300">0</span>}</td>
                    <td className="px-1.5 py-0.5 text-center font-bold border-r border-gray-200">
                      {saSnapshot ? (
                        <span className={saSnapshot[s.itemCode] === uuid ? 'text-emerald-600' : 'text-orange-600'}>{saSnapshot[s.itemCode] ?? 0}</span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    {/* FK */}
                    <td className="px-1.5 py-0.5 text-center font-bold border-r border-gray-200">
                      {fkData ? (() => {
                        const fk = fkData[s.itemCode];
                        if (!fk || fk.status === 'na') return <span className="text-gray-300">-</span>;
                        return <span className={fk.orphans === 0 ? 'text-green-600' : 'text-red-600'}>{fk.valid}/{fk.total}</span>;
                      })() : <span className="text-gray-300">-</span>}
                    </td>
                    {/* pgsql */}
                    <td className="px-1.5 py-0.5 text-center font-bold border-r border-gray-200">
                      {pgsqlData ? (() => {
                        const pg = pgsqlData[s.itemCode];
                        if (!pg || pg.status === 'pending') return <span className="text-gray-300">…</span>;
                        return <span className={pg.actual === pg.expected ? 'text-teal-600' : pg.actual > 0 ? 'text-orange-600' : 'text-red-600'}>{pg.actual}</span>;
                      })() : <span className="text-gray-300">-</span>}
                    </td>
                    {/* API */}
                    <td className="px-1.5 py-0.5 text-center font-bold">
                      {apiData ? (() => {
                        const api = apiData[s.itemCode];
                        if (!api || api.status === 'na') return <span className="text-gray-300">-</span>;
                        return <span className={api.apiCount === api.expected ? 'text-green-600' : api.apiCount > 0 ? 'text-orange-600' : 'text-red-600'}>{api.apiCount}</span>;
                      })() : <span className="text-gray-300">-</span>}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-indigo-300 bg-indigo-50">
                <td colSpan={3} className="px-1.5 py-0.5 font-bold text-indigo-800">합계</td>
                <td className="px-1.5 py-0.5 text-center font-bold text-indigo-800">{effectiveStatistics.itemStats.reduce((s, r) => s + r.rawCount, 0)}</td>
                <td className="px-1.5 py-0.5 text-center font-bold text-indigo-800">{effectiveStatistics.itemStats.reduce((s, r) => s + r.uniqueCount, 0)}</td>
                <td className="px-1.5 py-0.5 text-center font-bold text-red-600">{effectiveStatistics.itemStats.reduce((s, r) => s + r.dupSkipped, 0)}</td>
                <td className="px-1.5 py-0.5 text-center font-bold text-cyan-700">{Object.values(uuidCounts).reduce((s, c) => s + c, 0)}</td>
                <td className="px-1.5 py-0.5 text-center font-bold text-emerald-600">
                  {saSnapshot ? Object.values(saSnapshot).reduce((s, c) => s + c, 0) : <span className="text-gray-300">-</span>}
                </td>
                {/* FK 합계 */}
                <td className="px-1.5 py-0.5 text-center font-bold text-purple-700">
                  {fkData ? (() => {
                    const vals = Object.values(fkData);
                    const totalOrphans = vals.reduce((s, v) => s + v.orphans, 0);
                    return totalOrphans === 0 ? <span className="text-green-600">✓</span> : <span className="text-red-600">{totalOrphans}</span>;
                  })() : <span className="text-gray-300">-</span>}
                </td>
                {/* pgsql 합계 */}
                <td className="px-1.5 py-0.5 text-center font-bold text-teal-700">
                  {pgsqlData ? (() => {
                    const vals = Object.values(pgsqlData);
                    const total = vals.reduce((s, v) => s + v.actual, 0);
                    return <span>{total}</span>;
                  })() : <span className="text-gray-300">-</span>}
                </td>
                {/* API 합계 */}
                <td className="px-1.5 py-0.5 text-center font-bold text-rose-700">
                  {apiData ? (() => {
                    const vals = Object.values(apiData);
                    const total = vals.reduce((s, v) => s + v.apiCount, 0);
                    return <span>{total}</span>;
                  })() : <span className="text-gray-300">-</span>}
                </td>
              </tr>
            </tbody>
          </table>
          {/* ★ 자가개선루프 로그 */}
          {loopLog.length > 0 && (
            <div className="mt-1 px-2 py-1 bg-gray-900 rounded text-[9px] font-mono text-gray-300 max-h-[80px] overflow-y-auto">
              <div className="text-[8px] text-gray-500 mb-0.5">자가개선루프 (Loop {loopCount}/3)</div>
              {loopLog.map((log, i) => (
                <div key={i} className={log.includes('✅') ? 'text-green-400' : log.includes('❌') ? 'text-red-400' : log.includes('🔄') ? 'text-yellow-400' : ''}>{log}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── FC검증 통계 — 토글 시 항상 표시 ─── */}
      {showVerification && failureChains.length > 0 && (
        <FAVerificationBar chains={supplementedChains} parseStatistics={verificationStatistics} flatData={flatData} onScrollToItem={handleScrollToUnmatched} />
      )}

      {/* ─── FC 콘텐츠: 고장사슬 미리보기 + 비교 결과 (4개 모드 공통) ─── */}
      {stepState.activeStep === 'FC' && (<>
        <div className="flex items-center justify-end gap-1.5 mb-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px]">
            <b className="text-blue-700">{failureChains.length}</b><span className="text-blue-500">체인</span>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px]">
            <b className="text-blue-700">{new Set(failureChains.map(c => c.processNo)).size}</b><span className="text-blue-500">공정</span>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px]">
            <span className="text-gray-500">FM</span><b className="text-gray-700">{new Set(failureChains.map(c => c.fmValue).filter(Boolean)).size}</b>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px]">
            <span className="text-gray-500">FC</span><b className="text-gray-700">{new Set(failureChains.map(c => c.fcValue).filter(Boolean)).size}</b>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px]">
            <span className="text-gray-500">FE</span><b className="text-gray-700">{new Set(failureChains.map(c => c.feValue).filter(Boolean)).size}</b>
          </span>
          {fcComparison && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              fcComparison.stats.matchRate >= 90 ? 'bg-green-100 text-green-700 border border-green-300'
              : fcComparison.stats.matchRate >= 70 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
              : 'bg-red-100 text-red-700 border border-red-300'
            }`}>
              매칭률: {fcComparison.stats.matchRate.toFixed(0)}%
              ({fcComparison.matched.length}/{fcComparison.stats.total})
            </span>
          )}
        </div>
        <FailureChainPreview chains={failureChains} isFullscreen={isFullscreen} hideStats />
        {fcComparison && (fcComparison.missing.length > 0 || fcComparison.incomplete.length > 0 || fcComparison.apMismatch.length > 0) && (
          <div className="mt-2 p-2 border border-orange-200 rounded bg-orange-50/50 text-[10px]">
            {fcComparison.missing.length > 0 && (
              <div className="mb-0.5 text-orange-700">
                <span className="font-bold">누락 {fcComparison.missing.length}건:</span>{' '}
                {fcComparison.missing.slice(0, 3).map((c, i) => (
                  <span key={i} className="mr-1">{c.processNo}-{c.fmValue}</span>
                ))}
                {fcComparison.missing.length > 3 && <span>... 외 {fcComparison.missing.length - 3}건</span>}
              </div>
            )}
            {fcComparison.incomplete.length > 0 && (
              <div className="mb-0.5 text-orange-600">
                <span className="font-bold">SOD 미입력 {fcComparison.incomplete.length}건</span>
              </div>
            )}
            {fcComparison.apMismatch.length > 0 && (
              <div className="text-red-600">
                <span className="font-bold">AP 불일치 {fcComparison.apMismatch.length}건</span>
              </div>
            )}
          </div>
        )}
      </>)}

      {/* FA 통합분석 미리보기 삭제됨 (사용자 요청) */}

      {/* ─── SA 콘텐츠: L1/L2/L3 미리보기 ─── */}
      <>
        {/* ─── 누락 경고 배너 ─── */}
        {missingStats[previewLevel] > 0 && flatData.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const details = missingDetails[previewLevel];
              if (details.length > 0) {
                setAlertState({
                  open: true,
                  variant: 'warning',
                  title: `${previewLevel} 누락 ${details.length}건`,
                  summary: '확인 후 해당 행을 편집해 주세요.',
                  details,
                });
              }
            }}
            className="flex items-center gap-2 w-full text-left px-2 py-1 bg-orange-50 border border-orange-300 rounded text-[10px] cursor-pointer hover:bg-orange-100 mb-1"
            title="클릭하면 누락 항목 상세를 볼 수 있습니다">
            <span className="font-bold text-orange-700">⚠ {previewLevel} 누락 {missingStats[previewLevel]}건</span>
            <span className="text-orange-500">— 클릭 시 상세 보기</span>
          </button>
        )}

        {/* ─── 행추가 폼 ─── */}
        {isEditing && onAddItems && (
          <div className="flex items-center gap-1.5 mb-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded">
            <span className="text-[10px] font-bold text-blue-700">+ 행추가</span>
            {previewLevel === 'L1' && (<>
              {['YP', 'SP', 'USER'].map(cat => (
                <button key={cat} onClick={() => handleAddL1Row(cat)}
                  className="px-3 py-0.5 rounded text-[10px] font-bold cursor-pointer border border-blue-300 bg-white text-blue-700 hover:bg-blue-100">
                  + {cat}
                </button>
              ))}
            </>)}
            {previewLevel === 'L2' && (<>
              <input value={addPNo} onChange={e => setAddPNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddL2Row()}
                placeholder="공정번호" className="px-1.5 py-0.5 border border-gray-300 rounded text-[10px] w-[90px] bg-white" />
              <button onClick={handleAddL2Row} disabled={!addPNo.trim()}
                className="px-2.5 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold disabled:bg-gray-300 cursor-pointer disabled:cursor-not-allowed">추가</button>
            </>)}
            {previewLevel === 'L3' && (<>
              <input value={addPNo} onChange={e => setAddPNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddL3Row()}
                placeholder="공정번호" className="px-1.5 py-0.5 border border-gray-300 rounded text-[10px] w-[70px] bg-white" />
              <select value={addM4} onChange={e => setAddM4(e.target.value as 'MN' | 'MC' | 'IM' | 'EN')}
                className={`px-1 py-0.5 rounded text-[10px] font-bold appearance-none cursor-pointer border border-gray-300 ${M4_LABEL[addM4] || ''}`}>
                <option value="MN">MN</option><option value="MC">MC</option><option value="IM">IM</option><option value="EN">EN</option>
              </select>
              <button onClick={handleAddL3Row} disabled={!addPNo.trim()}
                className="px-2.5 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold disabled:bg-gray-300 cursor-pointer disabled:cursor-not-allowed">추가</button>
            </>)}
          </div>
        )}

        {/* ─── 중복 하이라이트 표시 바 ─── */}
        {highlightDupCode && dupRowIndices.size > 0 && (
          <div className="flex items-center gap-1.5 mb-1 px-2 py-1 bg-amber-50 border border-amber-300 rounded text-[10px]">
            <span className="text-amber-800 mr-0.5">
              <span className="font-bold">{highlightDupCode}</span> 중복 <span className="font-bold text-red-600">{dupRowIndices.size}행</span>
            </span>
            {/* 편집: 편집모드 ON + 중복행 자동 선택 */}
            <button onClick={() => {
              if (!isEditing) {
                if (!templateGenerated && !isDownload) { onGenerate(); setTemplateGenerated(true); }
                setIsEditing(true);
              }
              setSelectedRows(new Set(dupRowIndices));
            }}
              disabled={editDisabled}
              className={`px-2 py-0.5 text-[9px] rounded font-bold border ${
                editDisabled ? BTN_DISABLED
                : 'bg-blue-600 text-white border-blue-600 cursor-pointer hover:bg-blue-700'
              }`}>
              편집
            </button>
            {/* 삭제: 중복행 직접 삭제 (확인 후) */}
            <button onClick={handleDeleteDupRows}
              disabled={editDisabled || !onDeleteItems}
              className={`px-2 py-0.5 text-[9px] rounded font-bold border ${
                editDisabled ? BTN_DISABLED
                : 'bg-red-600 text-white border-red-600 cursor-pointer hover:bg-red-700'
              }`}>
              삭제
            </button>
            {/* 저장 */}
            {onSave && (
              <button onClick={onSave}
                disabled={!dirty || isSaving}
                className={`px-2 py-0.5 text-[9px] rounded font-bold border ${
                  !dirty || isSaving ? BTN_DISABLED
                  : 'bg-green-600 text-white border-green-600 cursor-pointer hover:bg-green-700'
                }`}>
                {isSaving ? '저장중...' : '저장'}
              </button>
            )}
            {/* 해제 */}
            <button onClick={() => { setHighlightDupCode(null); setSelectedRows(new Set()); }}
              className="px-2 py-0.5 text-[9px] text-gray-500 rounded cursor-pointer hover:bg-gray-200 hover:text-gray-700">
              해제
            </button>
          </div>
        )}

        {/* ─── 수정본 적색 표기 배너 ─── */}
        {revisedItemIds.size > 0 && (
          <div className="mb-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-[10px] text-red-700 font-medium flex items-center gap-1">
            <span>🔴</span>
            <span>수정본 {revisedItemIds.size}건 감지 (엑셀 적색 표기)</span>
          </div>
        )}

        {/* ─── 미리보기 테이블 ─── */}
        {crossTab.total === 0 ? (
          <div className="text-center py-3 text-gray-500 text-[11px] font-medium border border-dashed border-gray-300 rounded">
            {isDownload ? '데이터 없음'
              : (isEditing || templateGenerated) ? '데이터 없음 — [템플릿 생성]으로 재생성'
              : '설정 변경 시 미리보기 자동 갱신'}
          </div>
        ) : (
          <>
            {/* L1 테이블 */}
            {previewLevel === 'L1' && (
              <div className={`overflow-y-auto ${tableMaxH} border border-gray-200 rounded`} data-preview-level="L1">
                <table className="w-full border-collapse text-[9px]"><thead className="sticky top-0 z-10"><tr>
                  {isEditing && <th className={TH} style={{width:24}}>
                    <input type="checkbox" checked={selectedRows.size === crossTab.cRows.length && crossTab.cRows.length > 0}
                      onChange={() => toggleAll(crossTab.cRows)} className="cursor-pointer" />
                  </th>}
                  <th className={TH} style={{width:24}}>No</th>
                  <th className={TH} style={{width:45}}>C1 구분</th>
                  <th className={TH}>C2 제품기능</th>
                  <th className={TH}>C3 요구사항</th>
                  <th className={TH}>C4 고장영향</th>
                </tr></thead><tbody>
                  {crossTab.cRows.length === 0 ? (
                    <tr><td colSpan={isEditing ? 6 : 5} className="text-center py-3 text-gray-400 text-[10px]">
                      L1 데이터 없음 — L2({crossTab.aRows.length}건) 또는 L3({crossTab.bRows.length}건) 탭을 확인하세요
                    </td></tr>
                  ) : crossTab.cRows.map((r, i) => {
                    const cMissing = r.C1 && !r.C2;
                    const cRevised = isRowRevised(r._ids);
                    return (
                    <tr key={i} data-missing={cMissing ? 'true' : undefined} data-revised={cRevised ? 'true' : undefined} className={`${selectedRows.has(i) ? 'bg-red-50' : cMissing ? 'bg-orange-50/60' : cRevised ? 'bg-red-50/40' : i % 2 ? 'bg-gray-50/50' : ''}`}>
                      {isEditing && <td className={`${TD} text-center`}><input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleRow(i)} className="cursor-pointer" /></td>}
                      <td className={`${TD_NO} ${cRevised ? 'border-l-2 border-l-red-500' : ''}`}>{cRevised ? <span title="수정본">🔴</span> : (i+1)}</td>
                      <td className={`${isEditing ? TD_EDIT : TD} text-center font-medium ${cRevised ? 'text-red-600 font-bold' : ''}`}>
                        <EditCell value={r.C1} itemId={r._ids.C1} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.C1 ? (val) => onAddItems?.([{ processNo: r.category, category: 'C', itemCode: 'C1', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${cRevised ? 'text-red-600 font-bold' : ''}`}>
                        <EditCell value={r.C2} itemId={r._ids.C2} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.C2 ? (val) => onAddItems?.([{ processNo: r.category, category: 'C', itemCode: 'C2', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${cRevised ? 'text-red-600 font-bold' : ''}`}>
                        <EditCell value={r.C3} itemId={r._ids.C3} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.C3 ? (val) => onAddItems?.([{ processNo: r.category, category: 'C', itemCode: 'C3', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${cRevised ? 'text-red-600 font-bold' : ''}`}>
                        <EditCell value={r.C4} itemId={r._ids.C4} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.C4 ? (val) => onAddItems?.([{ processNo: r.category, category: 'C', itemCode: 'C4', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                    </tr>
                    );
                  })}
                </tbody></table>
              </div>
            )}

            {/* L2 테이블 */}
            {previewLevel === 'L2' && (
              <div className={`overflow-y-auto ${tableMaxH} border border-gray-200 rounded`} data-preview-level="L2">
                <table className="w-full border-collapse text-[9px]"><thead className="sticky top-0 z-10"><tr>
                  {isEditing && <th className={TH} style={{width:24}}>
                    <input type="checkbox" checked={selectedRows.size === crossTab.aRows.length && crossTab.aRows.length > 0}
                      onChange={() => toggleAll(crossTab.aRows)} className="cursor-pointer" />
                  </th>}
                  <th className={TH} style={{width:24}}>No</th>
                  <th className={TH} style={{width:48}}>A1 공정번호</th>
                  <th className={TH}>A2 공정명</th>
                  <th className={TH}>A3 공정기능</th>
                  <th className={TH}>A4 제품특성</th>
                  <th className={TH} style={{width:38}}>특별특성</th>
                  <th className={TH}>A5 고장형태</th>
                  <th className={TH} style={{background:'#ff6600',color:'#fff'}}>A6 검출관리</th>
                </tr></thead><tbody>
                  {crossTab.aRows.length === 0 ? (
                    <tr><td colSpan={isEditing ? 9 : 8} className="text-center py-3 text-gray-400 text-[10px]">
                      L2 데이터 없음 — L1({crossTab.cRows.length}건) 또는 L3({crossTab.bRows.length}건) 탭을 확인하세요
                    </td></tr>
                  ) : crossTab.aRows.map((r, i) => {
                    const aMissing = r.A1 && !r.A2;
                    const aDup = dupRowIndices.has(i) && highlightDupCode?.startsWith('A');
                    const aRevised = isRowRevised(r._ids);
                    return (
                    <tr key={i} ref={i === firstDupIdx && aDup ? firstDupRef : undefined} data-missing={aMissing ? 'true' : undefined} data-revised={aRevised ? 'true' : undefined} className={`${selectedRows.has(i) ? 'bg-red-50' : aDup ? 'bg-amber-100 ring-1 ring-amber-400' : aMissing ? 'bg-orange-50/60' : aRevised ? 'bg-red-50/40' : i % 2 ? 'bg-gray-50/50' : ''}`}>
                      {isEditing && <td className={`${TD} text-center`}><input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleRow(i)} className="cursor-pointer" /></td>}
                      <td className={`${TD_NO} ${aMissing ? 'border-l-2 border-l-orange-400' : aRevised ? 'border-l-2 border-l-red-500' : ''}`}>{aRevised ? <span title="수정본">🔴</span> : (i+1)}</td>
                      <td className={`${isEditing ? TD_EDIT : TD} text-center font-mono font-medium ${aRevised ? 'text-red-600 font-bold' : ''}`}>
                        <EditCell value={r.A1} itemId={r._ids.A1} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.A1 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A1', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${aRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.A2} itemId={r._ids.A2} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A2 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A2', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${aRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.A3} itemId={r._ids.A3} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A3 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A3', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${aRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.A4} itemId={r._ids.A4} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A4 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A4', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${TD} text-center`}><span className={`text-[10px] font-bold ${r.A4SC ? 'text-red-700' : 'text-gray-300'}`}>{r.A4SC || '-'}</span></td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${aRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.A5} itemId={r._ids.A5} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A5 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A5', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${aRevised ? 'text-red-600 font-bold' : ''}`} style={{background: aRevised ? '#fee2e2' : '#fff9c4'}}><EditCell value={r.A6} itemId={r._ids.A6} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A6 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A6', value: val, createdAt: new Date() }]) : undefined} /></td>
                    </tr>
                    );
                  })}
                </tbody></table>
              </div>
            )}

            {/* L3 테이블 */}
            {previewLevel === 'L3' && (
              <div className={`overflow-y-auto ${tableMaxH} border border-gray-200 rounded`} data-preview-level="L3">
                <table className="w-full border-collapse text-[9px]"><thead className="sticky top-0 z-10"><tr>
                  {isEditing && <th className={TH} style={{width:24}}>
                    <input type="checkbox" checked={selectedRows.size === crossTab.bRows.length && crossTab.bRows.length > 0}
                      onChange={() => toggleAll(crossTab.bRows)} className="cursor-pointer" />
                  </th>}
                  <th className={TH} style={{width:24}}>No</th>
                  <th className={TH} style={{width:38}}>공정</th>
                  <th className={TH} style={{width:28}}>4M</th>
                  <th className={TH}>B1 작업요소</th>
                  <th className={TH}>B2 요소기능</th>
                  <th className={TH}>B3 공정특성</th>
                  <th className={TH} style={{width:38}}>특별특성</th>
                  <th className={TH}>B4 고장원인</th>
                  <th className={TH} style={{background:'#ff6600',color:'#fff'}}>B5 예방관리</th>
                </tr></thead><tbody>
                  {crossTab.bRows.length === 0 ? (
                    <tr><td colSpan={isEditing ? 11 : 10} className="text-center py-3 text-gray-400 text-[10px]">
                      L3 데이터 없음 — L1({crossTab.cRows.length}건) 또는 L2({crossTab.aRows.length}건) 탭을 확인하세요
                    </td></tr>
                  ) : crossTab.bRows.slice(0, 100).map((r, i) => {
                    const bMissing = false;
                    const bDup = dupRowIndices.has(i) && highlightDupCode?.startsWith('B');
                    const bRevised = isRowRevised(r._ids);
                    return (
                    <tr key={i} ref={i === firstDupIdx && bDup ? firstDupRef : undefined} data-missing={bMissing ? 'true' : undefined} data-revised={bRevised ? 'true' : undefined} className={`${selectedRows.has(i) ? 'bg-red-50' : bDup ? 'bg-amber-100 ring-1 ring-amber-400' : bMissing ? 'bg-orange-50/60' : bRevised ? 'bg-red-50/40' : i % 2 ? 'bg-gray-50/50' : ''}`}>
                      {isEditing && <td className={`${TD} text-center`}><input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleRow(i)} className="cursor-pointer" /></td>}
                      <td className={`${TD_NO} ${bMissing ? 'border-l-2 border-l-orange-400' : bRevised ? 'border-l-2 border-l-red-500' : ''}`}>{bRevised ? <span title="수정본">🔴</span> : (i+1)}</td>
                      <td className={`${TD} text-center font-mono ${bRevised ? 'text-red-600 font-bold' : ''}`}>{r.processNo}</td>
                      <td className={`${TD} text-center`}>
                        {isEditing && r._ids.B1 && onUpdateM4 ? (
                          <select value={r.m4} onChange={e => onUpdateM4(r._ids.B1, e.target.value)}
                            className={`text-[9px] px-1 py-0 rounded font-bold cursor-pointer appearance-none text-center border border-gray-200 ${M4_LABEL[r.m4] || 'text-gray-600'}`}>
                            <option value="MN">MN</option><option value="MC">MC</option><option value="IM">IM</option><option value="EN">EN</option>
                          </select>
                        ) : r.m4 ? (
                          <span className={`text-[7px] px-0.5 rounded font-bold ${M4_BADGE[r.m4] || ''}`}>{r.m4}</span>
                        ) : null}
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${bRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.B1} itemId={r._ids.B1} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B1 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B1', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${bRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.B2} itemId={r._ids.B2} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B2 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B2', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${bRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.B3} itemId={r._ids.B3} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B3 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B3', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${TD} text-center`}><span className={`text-[10px] font-bold ${r.B3SC ? 'text-red-700' : 'text-gray-300'}`}>{r.B3SC || '-'}</span></td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${bRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.B4} itemId={r._ids.B4} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B4 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B4', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${bRevised ? 'text-red-600 font-bold' : ''}`} style={{background: bRevised ? '#fee2e2' : '#fff9c4'}}><EditCell value={r.B5} itemId={r._ids.B5} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B5 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B5', value: val, createdAt: new Date() }]) : undefined} /></td>
                    </tr>
                    );
                  })}
                  {crossTab.bRows.length > 100 && <tr><td colSpan={isEditing ? 12 : 11} className="text-center text-gray-400 text-[9px] py-0.5">... 외 {crossTab.bRows.length - 100}행</td></tr>}
                </tbody></table>
              </div>
            )}
          </>
        )}
      </>
      {/* 경고/확인 다이얼로그 */}
      <ImportAlertDialog state={alertState} onClose={closeAlert} />
    </div>
  );
}

export default TemplatePreviewContent;
