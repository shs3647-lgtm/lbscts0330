/**
 * @file TemplatePreviewContent.tsx
 * @description TemplateGeneratorPanel 우측 패널
 * - SA/FC/FA 서브탭 (기존데이터 모드)
 * - 통합 액션 바 (항상 고정 표시, 활성화/비활성화 방식)
 * - L1/L2/L3 미리보기 테이블
 * @created 2026-02-26
 * @updated 2026-02-27 — 통합 툴바 (메뉴 고정 + 활성화/비활성화, 저장버튼 제거)
 * @updated 2026-03-27 — pgsql/API 자동검증 (통계표 열기/DB저장 완료 시 자동 실행)
 * @updated 2026-03-28 — FC 미리보기 헤더 고유 건수 = 통계 표; 통계표 SA 열 → 복합키 열
 *
 * CODEFREEZE — 최고단계 (2026-03-27 갱신)
 * 수정 조건: "IMPORT 통계검증 수정해"라고 명시적으로 지시할 때만 수정
 * 포괄적 수정 지시 시 반드시 사용자에게 먼저 확인 요청
 */

'use client';

import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { ImportStepState } from '../utils/stepConfirmation';
import type { ARow, BRow, CRow, CrossTab, CrossTabIds } from '../utils/template-delete-logic';
import {
  l1ItemKeyCellTooltip,
  l1ItemKeyDisplayTail4,
  l2ItemKeyCellTooltip,
  l2ItemKeyDisplayTail4,
  l3ItemKeyCellTooltip,
  l3ItemKeyDisplayTail4,
} from '../utils/templatePreviewKeys';
import type { FCComparisonResult } from '../utils/fcComparison';
import type { ParseStatistics } from '../excel-parser';
import type { TemplateMode } from '../hooks/useTemplateGenerator';
import { FailureChainPreview, type FailureChainPreviewMatrixHeaderCounts } from './FailureChainPreview';
import { FullAnalysisPreview } from './FullAnalysisPreview';
import { TH, TD_NO, TD, TD_EDIT, M4_LABEL, M4_BADGE, EditCell } from './TemplateSharedUI';
import { validateAccuracy, validateFCAccuracy, summarizeAccuracyWarnings, type AccuracyWarning } from '../utils/accuracy-validation';
import { validateStructuralCompleteness, summarizeStructuralIssues } from '../utils/structural-validation';
import { validateUUIDIntegrity, summarizeUUIDIssues } from '../utils/uuid-integrity-validation';
import { ImportAlertDialog, INITIAL_ALERT_STATE, type ImportAlertState } from './ImportAlertDialog';
import { useImportVerification } from '../hooks/useImportVerification';
import { supplementMissingItems } from '../utils/supplementMissingItems';
import {
  countFlatRowsByItemCode,
  countAllFlatRowsByItemCode,
  countCompositeKeysByItemCode,
  countsFromPositionExcelStats,
  countsFromPositionExcelTotalStats,
  countsFromParseStatisticsItemRaw,
  countsVerifyAlignedFromPipelineStats,
  flatRowCountsForVerification,
} from '../utils/import-verification-columns';

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
  /** 위치기반 Import 직후 엑셀 항목별 셀 수 —「파싱」열 */
  positionParserStats?: Record<string, number> | null;
  fmeaId?: string;
}

// ─── 버튼 공통 스타일 ───

const BTN_DISABLED = 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';
const BTN_CONFIRMED = 'bg-green-50 text-green-700 border-green-300 cursor-default';

/** A6/B5: flat 행 수 ≠ RA(DC/PC) 건수가 정상(공정·L3 전개 vs 체인 단위). UUID−파이프 비교 생략 */
const ITEM_CODES_SKIP_UUID_VS_PIPELINE: ReadonlySet<string> = new Set(['A6', 'B5']);

/** 위치기반 excelC*: 물리 셀 수 — flat raw(병합·엔티티)와 척도가 달라 엑셀↔파싱 직접 비교 오탐 */
function excelCellCountsComparableToFlatRowCount(
  positionParserStats: Record<string, number> | null | undefined,
): boolean {
  return !(positionParserStats && Object.keys(positionParserStats).length > 0);
}

/** 통계표「오류 메시지」열 — 원본/파싱/DB/FK/API 불일치 요약 (이름매칭 없음) */
function importStatRowErrorMessage(input: {
  itemCode: string;
  excelVsParse: boolean;
  excelSourceN: number | null;
  parsedFlatN: number;
  rawRowCount: number;
  uuidCount: number;
  verifyScale?: number;
  dbUnderSaved: boolean;
  dbExpectedMismatch: boolean;
  fkOrphans: number;
  apiMismatch: boolean;
}): { text: string; severity: 'ok' | 'warn' | 'error' } {
  const parts: string[] = [];

  const skipUuidVsPipe =
    ITEM_CODES_SKIP_UUID_VS_PIPELINE.has(input.itemCode) ||
    input.verifyScale === undefined;
  // 미리보기 flat에 해당 코드 행이 없으면(재방문·마스터 부분 로드 등) 파이프라인 대비 UUID 비교는 무의미 — DB·API는 이미 일치할 수 있음
  const hasFlatSignal = input.parsedFlatN > 0 || input.uuidCount > 0;
  if (!skipUuidVsPipe && hasFlatSignal && input.uuidCount !== input.verifyScale) {
    parts.push(`UUID≠파이프라인(${input.uuidCount}/${input.verifyScale})`);
  }
  // ★ MBD-26-009: rawCount=distinct, uuidCount=총행(flatData). 스케일이 다르므로
  // uuidCount가 0인데 rawCount>0이면 실제 데이터 손실 (flatData에 해당 코드 없음)
  if (input.uuidCount === 0 && input.rawRowCount > 0) {
    parts.push('빈값·파싱행');
  }
  if (input.excelVsParse && input.excelSourceN != null) {
    parts.push(
      input.excelSourceN > input.parsedFlatN ? '엑셀>파싱(누락)' : '파싱>엑셀(과전개)',
    );
  }
  if (input.dbUnderSaved) {
    parts.push('DB저장 부족');
  } else if (input.dbExpectedMismatch) {
    parts.push('DB≠기대');
  }
  if (input.fkOrphans > 0) {
    parts.push(`FK고아 ${input.fkOrphans}`);
  }
  if (input.apiMismatch) {
    parts.push('API≠기대');
  }

  const severity: 'ok' | 'warn' | 'error' =
    input.fkOrphans > 0 || input.dbUnderSaved ? 'error' : parts.length > 0 ? 'warn' : 'ok';

  return {
    text: parts.length ? parts.join(' · ') : '—',
    severity,
  };
}

/**
 * 통계표: 중복 = 총 파싱 행(raw) − 고유(값 키). 레거시 dupSkipped 누락 시에도 raw−고유로 맞춤.
 * 원본(열) = 고유 + 중복 (= rawCount, raw ≥ unique 일 때).
 */
function itemStatDupCanonical(s: { rawCount: number; uniqueCount: number }): number {
  return Math.max(0, s.rawCount - s.uniqueCount);
}

function itemStatOriginalTotal(s: { rawCount: number; uniqueCount: number }): number {
  return s.uniqueCount + itemStatDupCanonical(s);
}

/** 레거시/서버 itemStats의 dupSkipped 누락·불일치 보정: 중복 = raw − 고유 */
function normalizeItemStatRow(s: import('../excel-parser').ItemCodeStat): import('../excel-parser').ItemCodeStat {
  const dup = Math.max(0, s.rawCount - s.uniqueCount);
  return { ...s, dupSkipped: dup };
}

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
    addCat, setAddCat,
    l1Name, bdFmeaName, parseStatistics, positionParserStats, fmeaId,
  } = props;

  /** 엑셀 물리 셀 수(excelC*) — 레거시·진단용. verify 척도는 verifyScaleRowCounts */
  const parseExcelCounts = useMemo((): Record<string, number> | null => {
    if (positionParserStats && Object.keys(positionParserStats).length > 0) {
      return countsFromPositionExcelStats(positionParserStats);
    }
    return countsFromParseStatisticsItemRaw(parseStatistics);
  }, [positionParserStats, parseStatistics]);

  /** ★ MBD-26-009: 엑셀 총 행수 (non-distinct) — DB 115개의 근거 확인용 */
  const parseExcelTotalCounts = useMemo((): Record<string, number> | null => {
    if (positionParserStats && Object.keys(positionParserStats).length > 0) {
      return countsFromPositionExcelTotalStats(positionParserStats);
    }
    return null;
  }, [positionParserStats]);

  /** verify-counts API와 동일 척도 — 통계표 원본/파싱·pgsql 기대값 통일 */
  const verifyScaleRowCounts = useMemo(
    () => countsVerifyAlignedFromPipelineStats(positionParserStats ?? null),
    [positionParserStats],
  );

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
      // ★v5: 지침서 Section 2-2 parentId 체인 반영 — 엑셀 시트 순서 (L1→L2→L3)
      const ALL_CODES_PS: [string, string][] = [
        ['C1', '구분'], ['C2', '제품기능'], ['C3', '요구사항'], ['C4', '★고장영향(FE)'],
        ['A1', '공정번호'], ['A2', '공정명'], ['A3', '공정기능'],
        ['A4', '제품특성'], ['A5', '★고장형태(FM)'], ['A6', '검출관리'],
        ['B1', '작업요소'], ['B2', '요소기능'], ['B3', '공정특성'],
        ['B4', '★고장원인(FC)'], ['B5', '예방관리'],
        ['D1', '★고장영향(FE)'], ['D2', '공정명'], ['D3', '★고장형태(FM)'],
        ['D4', '작업요소'], ['D5', '★고장원인(FC)'],
      ];
      // 엑셀 시트 순서 정렬 (L1 C→L2 A→L3 B→FC D)
      const SHEET_ORDER: Record<string, number> = {
        C1:1,C2:2,C3:3,C4:4, A1:5,A2:6,A3:7,A4:8,A5:9,A6:10, B1:11,B2:12,B3:13,B4:14,B5:15,
        D1:16,D2:17,D3:18,D4:19,D5:20
      };
      const existing = new Set(parseStatistics.itemStats.map(s => s.itemCode));
      const filled = [...parseStatistics.itemStats];
      for (const [code, label] of ALL_CODES_PS) {
        if (!existing.has(code)) filled.push({ itemCode: code, label, rawCount: 0, uniqueCount: 0, dupSkipped: 0 });
      }
      filled.sort((a, b) => (SHEET_ORDER[a.itemCode] ?? 99) - (SHEET_ORDER[b.itemCode] ?? 99));
      // flat이 있으면 고유·파싱·복합키·pgsql/API 기대(복합키 기반)와 같은 눈금 — 서버 unique/raw와 어긋남 방지
      const comp = flatData.length > 0 ? countCompositeKeysByItemCode(flatData) : null;
      const rawAll = flatData.length > 0 ? countAllFlatRowsByItemCode(flatData) : null;
      return {
        ...parseStatistics,
        itemStats: filled.map(s => {
          let row = normalizeItemStatRow(s);
          // ★ 2026-03-29: D코드는 failureChains에서 보강 (parseStatistics에 없으면 0)
          if (s.itemCode.startsWith('D') && failureChains.length > 0 && row.rawCount === 0) {
            const chainDCounts: Record<string, number> = {
              D1: new Set(failureChains.map((c: any) => (c.feValue || '').trim()).filter(Boolean)).size,
              D2: new Set(failureChains.map((c: any) => c.processNo).filter(Boolean)).size,
              D3: new Set(failureChains.map((c: any) => `${c.processNo}|${c.fmValue}`).filter(Boolean)).size,
              D4: new Set(failureChains.map((c: any) => `${c.processNo}|${c.m4||''}|${c.workElement||''}`).filter(Boolean)).size,
              D5: new Set(failureChains.map((c: any) => `${c.processNo}|${c.m4||''}|${c.workElement||''}|${c.fcValue||''}`).filter(Boolean)).size,
            };
            const dCount = chainDCounts[s.itemCode] ?? 0;
            row = normalizeItemStatRow({ ...row, rawCount: dCount, uniqueCount: dCount, dupSkipped: 0 });
          } else if (comp && rawAll) {
            const u = comp[s.itemCode] ?? 0;
            row = normalizeItemStatRow({
              ...row,
              uniqueCount: u,
              dupSkipped: Math.max(0, row.rawCount - u),
            });
          }
          return row;
        }),
      };
    }
    if (crossTab.total === 0 && flatData.length === 0) return undefined;

    // ★v5: 지침서 Section 2-2 parentId 체인 반영 — 엑셀 시트 순서 (L1→L2→L3)
    const ALL_CODES: [string, string][] = [
      ['C1', '구분'], ['C2', '제품기능'], ['C3', '요구사항'], ['C4', '★고장영향(FE)'],
      ['A1', '공정번호'], ['A2', '공정명'], ['A3', '공정기능'],
      ['A4', '제품특성'], ['A5', '★고장형태(FM)'], ['A6', '검출관리'],
      ['B1', '작업요소'], ['B2', '요소기능'], ['B3', '공정특성'],
      ['B4', '★고장원인(FC)'], ['B5', '예방관리'],
      ['D1', '★고장영향(FE)'], ['D2', '공정명'], ['D3', '★고장형태(FM)'],
      ['D4', '작업요소'], ['D5', '★고장원인(FC)'],
    ];
    const ITEM_LABELS: Record<string, string> = Object.fromEntries(ALL_CODES);

    const codeCounts = new Map<string, { raw: number; vals: Set<string> }>();
    ALL_CODES.forEach(([code]) => codeCounts.set(code, { raw: 0, vals: new Set() }));
    flatData.forEach(d => {
      const code = d.itemCode;
      if (!code || !flatRowCountsForVerification(d)) return;
      if (!codeCounts.has(code)) codeCounts.set(code, { raw: 0, vals: new Set() });
      const entry = codeCounts.get(code)!;
      entry.raw++;
      // 고유 = `countCompositeKeysByItemCode`와 동일 척도
      const c = String(d.itemCode ?? '').trim();
      const v = c === 'B3' ? String(d.value ?? '').trim() : (d.value?.trim() ?? '');
      const pno = String(d.processNo ?? '').trim();
      const m4 = String(d.m4 ?? '').trim();
      const pid = String(d.parentItemId ?? '').trim();
      const uniqueKey = `${pno}\x1f${c}\x1f${v}\x1f${m4}\x1f${pid}`;
      entry.vals.add(uniqueKey);
    });

    // ★ 2026-03-29: D코드는 flatData에 없으므로 failureChains에서 주입
    if (failureChains.length > 0) {
      const dCounts: Record<string, { raw: number; unique: Set<string> }> = {
        D1: { raw: failureChains.length, unique: new Set(failureChains.map((c: any) => (c.feValue || '').trim()).filter(Boolean)) },
        D2: { raw: failureChains.length, unique: new Set(failureChains.map((c: any) => c.processNo).filter(Boolean)) },
        D3: { raw: failureChains.length, unique: new Set(failureChains.map((c: any) => `${c.processNo}|${c.fmValue}`).filter(Boolean)) },
        D4: { raw: failureChains.length, unique: new Set(failureChains.map((c: any) => `${c.processNo}|${c.m4||''}|${c.workElement||''}`).filter(Boolean)) },
        D5: { raw: failureChains.length, unique: new Set(failureChains.map((c: any) => `${c.processNo}|${c.m4||''}|${c.workElement||''}|${c.fcValue||''}`).filter(Boolean)) },
      };
      for (const [code, info] of Object.entries(dCounts)) {
        codeCounts.set(code, { raw: info.unique.size, vals: info.unique });
      }
    }

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
      if (!flatRowCountsForVerification(d)) return;
      if (!procMap.has(d.processNo)) {
        const nameItem = flatData.find(f => f.processNo === d.processNo && f.itemCode === 'A2');
        procMap.set(d.processNo, { name: nameItem?.value || '', items: {} });
      }
      const proc = procMap.get(d.processNo)!;
      if (!proc.items[d.itemCode]) proc.items[d.itemCode] = { raw: 0, unique: new Set() };
      proc.items[d.itemCode].raw++;
      const c = String(d.itemCode ?? '').trim();
      const v = c === 'B3' ? String(d.value ?? '').trim() : (d.value?.trim() ?? '');
      const m4 = String(d.m4 ?? '').trim();
      const pid = String(d.parentItemId ?? '').trim();
      proc.items[d.itemCode].unique.add(`${c}\x1f${v}\x1f${m4}\x1f${pid}`);
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
      dataSourceLine: '출처: flatData·체인 파생(통계 보강). 위치기반 파일 선택 시 파서 통계로 교체됩니다.',
      totalRows: flatData.length,
      itemStats: itemStats.map(normalizeItemStatRow),
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

  // ── UUID 카운트 (itemCode별) ──
  const uuidCounts = useMemo(
    () => {
      const base = countFlatRowsByItemCode(flatData);
      // ★ 2026-03-29: D 코드는 flatData에 없으므로 파서 stats 또는 failureChains에서 주입
      if (positionParserStats) {
        base.D1 = positionParserStats.verifyD1FcFe ?? 0;
        base.D2 = positionParserStats.verifyD2FcProcess ?? 0;
        base.D3 = positionParserStats.verifyD3FcFm ?? 0;
        base.D4 = positionParserStats.verifyD4FcWorkElem ?? 0;
        base.D5 = positionParserStats.verifyD5FcFc ?? 0;
      } else if (failureChains.length > 0) {
        // failureChains에서 D코드 추출 (파서 stats 없을 때 fallback)
        base.D1 = new Set(failureChains.map((c: any) => (c.feValue || '').trim()).filter(Boolean)).size;
        base.D2 = new Set(failureChains.map((c: any) => c.processNo).filter(Boolean)).size;
        base.D3 = new Set(failureChains.map((c: any) => `${c.processNo}|${c.fmValue}`).filter(Boolean)).size;
        base.D4 = new Set(failureChains.map((c: any) => `${c.processNo}|${c.m4||''}|${c.workElement||''}`).filter(Boolean)).size;
        base.D5 = new Set(failureChains.map((c: any) => `${c.processNo}|${c.m4||''}|${c.workElement||''}|${c.fcValue||''}`).filter(Boolean)).size;
      }
      return base;
    },
    [flatData, positionParserStats, failureChains],
  );

  /** 복합키 고유 수 — parentItemId·공정·m4까지 구분 (통계 고유와 불일치 시 누락·중복 점검) */
  const compositeKeyCounts = useMemo(
    () => {
      const base = countCompositeKeysByItemCode(flatData);
      if (positionParserStats) {
        base.D1 = positionParserStats.verifyD1FcFe ?? 0;
        base.D2 = positionParserStats.verifyD2FcProcess ?? 0;
        base.D3 = positionParserStats.verifyD3FcFm ?? 0;
        base.D4 = positionParserStats.verifyD4FcWorkElem ?? 0;
        base.D5 = positionParserStats.verifyD5FcFc ?? 0;
      } else if (failureChains.length > 0) {
        base.D1 = new Set(failureChains.map((c: any) => (c.feValue || '').trim()).filter(Boolean)).size;
        base.D2 = new Set(failureChains.map((c: any) => c.processNo).filter(Boolean)).size;
        base.D3 = new Set(failureChains.map((c: any) => `${c.processNo}|${c.fmValue}`).filter(Boolean)).size;
        base.D4 = new Set(failureChains.map((c: any) => `${c.processNo}|${c.m4||''}|${c.workElement||''}`).filter(Boolean)).size;
        base.D5 = new Set(failureChains.map((c: any) => `${c.processNo}|${c.m4||''}|${c.workElement||''}|${c.fcValue||''}`).filter(Boolean)).size;
      }
      return base;
    },
    [flatData, positionParserStats, failureChains],
  );

  /** FC 미리보기 열 헤더 — 복합키·통계 고유와 동일 척도(flat·parent·m4) */
  const fcMatrixHeaderCounts = useMemo((): FailureChainPreviewMatrixHeaderCounts | undefined => {
    if (!effectiveStatistics?.itemStats?.length) return undefined;
    const m4 = new Set(
      flatData.filter(d => d.category === 'B' && d.m4?.trim()).map(d => d.m4!.trim()),
    ).size;
    return { uniqueByCode: compositeKeyCounts, uniqueM4FromFlat: m4 };
  }, [effectiveStatistics?.itemStats?.length, compositeKeyCounts, flatData]);

  // ★★★ 2026-03-29: FK/pgsql저장/API적합 검증 훅
  // verify-counts는 엔티티 수(총 레코드)를 반환 → expected도 composite key 기준으로 통일
  const { fkData: fkDataRaw, pgsqlData, apiData, runFullVerify } = useImportVerification(
    fmeaId,
    flatData,
    uuidCounts,
    undefined,
    null,  // ★ entity count 기준 — parseExcelCounts(distinct)가 아닌 composite key blended 사용
  );

  // ★ MBD-26-009: D 코드 FK = FL의 broken FK 통계 (파서 stats에서)
  const fkData = useMemo(() => {
    const data = { ...fkDataRaw };
    if (positionParserStats) {
      const totalFl = positionParserStats.failureLinks ?? 0;
      const brokenFE = positionParserStats.brokenFE ?? 0;
      const brokenFM = positionParserStats.brokenFM ?? 0;
      const brokenFC = positionParserStats.brokenFC ?? 0;
      // D1(FE): FL 중 feId 누락
      data.D1 = { total: totalFl, valid: totalFl - brokenFE, orphans: brokenFE, status: brokenFE === 0 ? 'pass' : 'error' };
      // D2(공정명): 텍스트 참조 — FK 대상 아님
      data.D2 = { total: totalFl, valid: totalFl, orphans: 0, status: 'pass' };
      // D3(FM): FL 중 fmId 누락
      data.D3 = { total: totalFl, valid: totalFl - brokenFM, orphans: brokenFM, status: brokenFM === 0 ? 'pass' : 'error' };
      // D4(작업요소): 텍스트 참조
      data.D4 = { total: totalFl, valid: totalFl, orphans: 0, status: 'pass' };
      // D5(FC): FL 중 fcId 누락
      data.D5 = { total: totalFl, valid: totalFl - brokenFC, orphans: brokenFC, status: brokenFC === 0 ? 'pass' : 'error' };
    }
    return data;
  }, [fkDataRaw, positionParserStats]);

  // ★★★ 2026-03-27: 통계표가 열렸고 fmeaId 존재 + 미검증 상태면 자동 실행
  // Import → 파싱 → DB 저장 직후 pgsql/API 통계가 즉시 표시됨
  const autoVerifyRanRef = useRef(false);
  useEffect(() => {
    if (showStats && fmeaId && !pgsqlData && !apiData && !autoVerifyRanRef.current) {
      autoVerifyRanRef.current = true;
      runFullVerify();
    }
    // 통계표 닫으면 다음에 열 때 다시 실행 가능하도록 리셋
    if (!showStats) autoVerifyRanRef.current = false;
  }, [showStats, fmeaId, pgsqlData, apiData, runFullVerify]);

  // ★★★ 2026-03-27: DB 저장 완료 시(isSaving → false) 통계표가 열려있으면 pgsql/API 재검증
  const prevSavingRef = useRef(false);
  useEffect(() => {
    if (prevSavingRef.current && !isSaving && showStats && fmeaId) {
      // 저장이 방금 완료됨 → DB에 데이터가 들어갔으므로 즉시 검증
      autoVerifyRanRef.current = false; // 리셋하여 재실행 허용
      setTimeout(() => runFullVerify(), 500); // DB commit 대기
    }
    prevSavingRef.current = !!isSaving;
  }, [isSaving, showStats, fmeaId, runFullVerify]);

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

  // ── 중복행 하이라이트 ──
  const [highlightDupCode, setHighlightDupCode] = useState<string | null>(null);
  const firstDupRef = useRef<HTMLTableRowElement | null>(null);

  /** 중복 행 인덱스: 동일 값이 2회 이상인 행 (B는 공정별, A/C는 전역 값 키) */
  const dupRowIndices = useMemo<Set<number>>(() => {
    if (!highlightDupCode) return new Set();
    const code = highlightDupCode;
    const indices = new Set<number>();

    if (code.startsWith('B')) {
      const groups = new Map<string, { idx: number; val: string }[]>();
      crossTab.bRows.forEach((r, i) => {
        const val = (
          code === 'B1' ? r.B1
            : code === 'B2' ? r.B2
              : code === 'B3' ? r.B3
                : code === 'B4' ? r.B4
                  : r.B5
        ).trim();
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
        const val = (
          code === 'A1' ? r.A1
            : code === 'A2' ? r.A2
              : code === 'A3' ? r.A3
                : code === 'A4' ? r.A4
                  : code === 'A5' ? r.A5
                    : r.A6
        ).trim();
        if (!val) return;
        if (!valMap.has(val)) valMap.set(val, []);
        valMap.get(val)!.push(i);
      });
      valMap.forEach(idxs => {
        if (idxs.length > 1) idxs.forEach(idx => indices.add(idx));
      });
    } else if (code.startsWith('C')) {
      const valMap = new Map<string, number[]>();
      crossTab.cRows.forEach((r, i) => {
        const val = (
          code === 'C1' ? r.C1
            : code === 'C2' ? r.C2
              : code === 'C3' ? r.C3
                : r.C4
        ).trim();
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
    else if (itemCode.startsWith('D')) setPreviewLevel('L3'); // FC 레벨 → L3 뷰
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
  }, [confirmSA, generatedData, failureChains]);

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
    resetToSA();
  }, [resetToSA]);

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
      {/* ★v5: 상단 서브탭 제거 — FC 탭은 L3 우측으로 이동됨 */}

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

          {/* L1/L2/L3/FC 레벨 전환 — 엑셀 시트 순서 (★v5: FC 탭 L3 우측 배치) */}
          {(['L1','L2','L3'] as const).map(lvl => {
            const count = lvl === 'L1' ? crossTab.cRows.length : lvl === 'L2' ? crossTab.aRows.length : crossTab.bRows.length;
            const miss = missingStats[lvl];
            return (
              <button
                key={lvl}
                onClick={() => { setPreviewLevel(lvl); setActiveStep('SA'); }}
                title={
                  lvl === 'L3'
                    ? '파싱 flat → 교차표. L3는 B1(작업요소)마다 B2~B4를 공정번호+4M으로 매칭합니다. 예방(B5)·검출(A6)은 리스크 탭. 빈칸·누락은 파싱 미전개 또는 매칭/parent 단절 가능.'
                    : '파싱된 flat을 항목코드별로 묶은 미리보기. 엑셀 셀과 행 순서는 다를 수 있음.'
                }
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                  previewLevel === lvl && stepState.activeStep === 'SA'
                    ? 'bg-blue-600 text-white border-blue-600 cursor-pointer'
                    : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 cursor-pointer'
                }`}>
                {lvl} <span className="text-[9px]">{count}</span>
                {miss > 0 && <span className={`ml-0.5 text-[8px] ${previewLevel === lvl && stepState.activeStep === 'SA' ? 'text-orange-200' : 'text-orange-500'}`}>({miss})</span>}
              </button>
            );
          })}
          {/* ★v5: FC 고장사슬 탭 — L3 우측 배치 */}
          {!isManualMode && (
            <button
              onClick={() => setActiveStep('FC')}
              title="파싱된 고장사슬. 공정→FM→FE→FC 정렬·FM블록 병합은 엑셀 FC(개별셀)과 동일 눈금. 상단 표는 메인시트·FC시트·VERIFY 기대 건수 교차검증."
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                stepState.activeStep === 'FC'
                  ? 'bg-purple-600 text-white border-purple-600 cursor-pointer'
                  : 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 cursor-pointer'
              }`}>
              FC 고장사슬 <span className="text-[9px]">(FE:{new Set(failureChains.map((c: any) => (c.feValue||'').trim()).filter(Boolean)).size} FM:{new Set(failureChains.map((c: any) => `${c.processNo}|${c.fmValue}`).filter(Boolean)).size} FL:{failureChains.length})</span>
            </button>
          )}
          {!isManualMode && (
            <button
              type="button"
              onClick={() => setActiveStep('FA')}
              title="고장사슬별 S/O/D·AP 및 예방관리(PC)·검출관리(DC). A6/B5·리스크는 이 탭에서 확인합니다."
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                stepState.activeStep === 'FA'
                  ? 'bg-amber-600 text-white border-amber-600 cursor-pointer'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 cursor-pointer'
              }`}>
              리스크 <span className="text-[9px]">(SOD·PC/DC)</span>
            </button>
          )}

          {missingStats[previewLevel] > 0 && (
            <button
              onClick={() => {
                const details = missingDetails[previewLevel];
                if (details.length > 0) {
                  setAlertState({
                    open: true,
                    variant: 'warning',
                    title: `${previewLevel} 누락 ${details.length}건`,
                    summary:
                      '필수 칸이 비어 있습니다. L3는 B1만 있고 B2~B4가 비면 누락으로 잡힙니다. 원인: 파싱 미전개, flat 부재, 공정+4M 매칭/parent 단절. 저장은 atomic 기준이며 일반적으로 atomic에 없으면 DB에도 없습니다.',
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
              title="누락: 필수 칸이 비어 있음(L3는 B1 있는데 B2~B4 중 공백). 원인 후보 — 파싱 미전개, flat 부재, 공정+4M 매칭/parent 단절. 위치기반 저장은 atomic 기준(미리보기와 드물게 불일치 가능)."
              className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 cursor-pointer hover:bg-orange-100">
              누락 {missingStats[previewLevel]}건
            </button>
          )}

          {/* 통계표 토글 — ★ 열 때 pgsql/API 미검증이면 자동 실행 */}
          {effectiveStatistics && effectiveStatistics.itemStats.length > 0 && (
            <button
              onClick={() => {
                setShowStats(v => {
                  const willOpen = !v;
                  if (willOpen && fmeaId && !pgsqlData && !apiData) {
                    // 통계표를 처음 열 때 자동으로 pgsql/API 검증 실행
                    runFullVerify();
                  }
                  return willOpen;
                });
              }}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border cursor-pointer ${
                showStats
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
              }`}
              title="아이템코드별 Import 통계표 토글 (pgsql/API 검증 자동실행)">
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
              onClick={async () => { await quickCreateWorksheet(); setTimeout(() => runFullVerify(), 500); }}
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

          {/* ★ 워크시트 이동 — 데이터 있으면 활성화 (FA 완료 불필요) */}
          {fmeaId && flatData.length > 0 && (
            <button
              onClick={() => window.location.href = `/pfmea/worksheet?id=${fmeaId}&fresh=1`}
              className="px-3 py-0.5 rounded text-[10px] font-bold border border-orange-400 text-white bg-orange-500 hover:bg-orange-600 cursor-pointer">
              워크시트 →
            </button>
          )}
          {isAnalysisComplete && (
            <span className="text-[10px] text-green-600 font-bold">✓ 검증 완료</span>
          )}

          {/* ★ 2026-02-27: 엑셀 내보내기 제거, 샘플Down/빈 양식은 탭 바 우측으로 이동 */}
        </div>
      </div>


      {/* ─── Import 통계표 — 전체 표시, 현재 레벨 강조 ─── */}
      {showStats && effectiveStatistics && effectiveStatistics.itemStats.length > 0 && (
        <div className="mb-1.5 border border-indigo-200 rounded bg-indigo-50/30">
          {effectiveStatistics.dataSourceLine ? (
            <div className="px-1.5 py-0.5 text-[9px] text-indigo-900 bg-indigo-100/80 border-b border-indigo-200 rounded-t">
              {effectiveStatistics.dataSourceLine}
            </div>
          ) : null}
          <table className="w-full border-collapse text-[9px] table-fixed">
            <colgroup>
              <col style={{ width: 30 }} />
              <col style={{ width: 44 }} />
              <col />
              <col style={{ width: 240 }} />
              <col style={{ width: 64 }} />{/* 엑셀행수 */}
              <col style={{ width: 40 }} />{/* 원본 */}
              <col style={{ width: 40 }} />{/* 파싱 */}
              <col style={{ width: 40 }} />{/* DB */}
              <col style={{ width: 40 }} />{/* 중복 */}
              <col style={{ width: 56 }} />{/* parentId */}
              <col style={{ width: 40 }} />{/* UUID */}
              <col style={{ width: 42 }} />{/* 복합키 */}
              <col style={{ width: 42 }} />{/* FK */}
              <col style={{ width: 42 }} />{/* pgsql */}
              <col style={{ width: 42 }} />{/* API */}
            </colgroup>
            <thead><tr>
              <th className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 text-center border-r border-indigo-500" style={{width:30}}>레벨</th>
              <th className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 text-center border-r border-indigo-500" style={{width:40}}>코드</th>
              <th className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 text-left border-r border-indigo-500">항목</th>
              <th className="bg-rose-800 text-white font-bold px-1 py-0.5 text-left border-r border-rose-600" title="원본·파싱·DB·FK·API 불일치 시 요약">오류 메시지</th>
              <th className="bg-orange-700 text-white font-bold px-1.5 py-0.5 text-center border-r border-orange-600" style={{width:64}} title="엑셀 시트 비어있지 않은 셀 총 수 (non-distinct). DB entity 수와 비교 근거">엑셀행수</th>
              <th className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 text-center border-r border-indigo-500" style={{width:40}} title="엑셀 distinct 값 수 (고유한 텍스트 수)">원본</th>
              <th className="bg-violet-700 text-white font-bold px-1.5 py-0.5 text-center border-r border-violet-600" style={{width:40}} title="파서 excelX* distinct 값 = 원본과 동일">파싱</th>
              <th className="bg-red-900 text-white font-bold px-1 py-0.5 text-center border-r border-red-700" style={{width:40}} title="프로젝트 PG 스키마 저장 건수(verify-counts). 엑셀행수(총 entity)와 비교">DB</th>
              <th className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 text-center border-r border-indigo-500" style={{width:40}} title="엑셀행수 − 원본(distinct) = 텍스트 중복 수">중복</th>
              <th className="bg-amber-700 text-white font-bold px-1.5 py-0.5 text-center border-r border-amber-600" style={{width:55}} title="지침서 parentId 체인 (C1→C2→C3→C4, A1→A4→A5→A6, B1→B2→B3→B4→B5)">parentId</th>
              <th className="bg-cyan-700 text-white font-bold px-1.5 py-0.5 text-center border-r border-cyan-600" style={{width:40}} title="파싱된 유효 UUID 수">UUID</th>
              <th className="bg-emerald-700 text-white font-bold px-1 py-0.5 text-center border-r border-emerald-600" style={{width:40}} title="flat 기준 복합키 고유 수">복합키</th>
              <th className="bg-purple-700 text-white font-bold px-1.5 py-0.5 text-center border-r border-purple-600" style={{width:40}} title="FK 무결성 (parentItemId 체인)">FK</th>
              <th className="bg-teal-700 text-white font-bold px-1.5 py-0.5 text-center border-r border-teal-600 cursor-pointer hover:bg-teal-600" style={{width:40}} title="클릭하면 PostgreSQL 프로젝트 스키마 저장 건수를 검증합니다" onClick={() => fmeaId && runFullVerify()}>pgsql{!pgsqlData && fmeaId ? ' ▶' : ''}</th>
              <th className="bg-rose-700 text-white font-bold px-1.5 py-0.5 text-center cursor-pointer hover:bg-rose-600" style={{width:40}} title="클릭하면 GET API 응답 건수를 검증합니다" onClick={() => fmeaId && runFullVerify()}>API{!apiData && fmeaId ? ' ▶' : ''}</th>
            </tr></thead>
            <tbody>
              {effectiveStatistics.itemStats.map((s, i) => {
                const level = s.itemCode.startsWith('C') ? 'L1' : s.itemCode.startsWith('A') ? 'L2' : s.itemCode.startsWith('D') ? 'FC' : 'L3';
                const isCurrentLevel = level === previewLevel;
                const isHighlighted = highlightDupCode === s.itemCode;
                const uuid = uuidCounts[s.itemCode] ?? 0;
                const scaled = verifyScaleRowCounts?.[s.itemCode];
                const dupCanon = itemStatDupCanonical(s);
                const originalTotal = itemStatOriginalTotal(s);
                const excelN =
                  parseExcelCounts != null ? (parseExcelCounts[s.itemCode] ?? null) : null;
                const parsedFlatN = s.rawCount;
                const excelComparable = excelCellCountsComparableToFlatRowCount(positionParserStats);
                const excelVsParse =
                  excelComparable && excelN != null && excelN !== parsedFlatN;
                const pg = pgsqlData?.[s.itemCode];
                const dbActual = pg && pg.status !== 'pending' ? pg.actual : null;
                const dbExpectedForRow =
                  pg && pg.status !== 'pending' ? pg.expected : null;
                /** DB < pgsql 기대(저장 스케일). flat raw>DB는 A6/B5 등에서 정상일 수 있음 */
                const dbUnderSaved =
                  dbActual != null &&
                  dbExpectedForRow != null &&
                  dbActual < dbExpectedForRow;
                /** 검증 기대치와 PG 실제 불일치 */
                const dbExpectedMismatch = pg != null && pg.status !== 'pending' && !pg.match;
                const displayDup = dupCanon;
                const hasDup = displayDup > 0;
                const fkOrphans = fkData?.[s.itemCode]?.orphans ?? 0;
                const apiRow = apiData?.[s.itemCode];
                const apiMismatch =
                  !!apiRow && apiRow.status !== 'na' && !apiRow.match;
                const err = importStatRowErrorMessage({
                  itemCode: s.itemCode,
                  excelVsParse,
                  excelSourceN: excelN,
                  parsedFlatN,
                  rawRowCount: s.rawCount,
                  uuidCount: uuid,
                  verifyScale: scaled,
                  dbUnderSaved,
                  dbExpectedMismatch,
                  fkOrphans,
                  apiMismatch,
                });
                const zebraBg = i % 2 === 0 ? 'bg-slate-100' : 'bg-white';
                return (
                  <tr
                    key={s.itemCode}
                    className={[
                      'border-b border-slate-200/90 transition-colors',
                      zebraBg,
                      isHighlighted ? '!bg-amber-100 shadow-[inset_0_0_0_1px_theme(colors.amber.400)]' : '',
                      isCurrentLevel && !isHighlighted ? 'shadow-[inset_3px_0_0_0_theme(colors.blue.500)]' : '',
                      'hover:bg-slate-200/90',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td
                      className={`px-1 py-0.5 text-center text-[9px] border-r border-slate-200/80 ${isCurrentLevel ? 'text-blue-700 font-bold' : 'text-gray-500'}`}
                    >
                      {level}
                    </td>
                    <td className="px-1.5 py-0.5 text-center font-mono font-bold text-[10px] border-r border-slate-200/80">{s.itemCode}</td>
                    <td className="px-1.5 py-0.5 border-r border-slate-200/80 text-left">{s.label}</td>
                    <td
                      className={[
                        'px-1.5 py-0.5 text-left text-[8px] leading-snug border-r border-slate-200/80 align-top min-w-0 w-full',
                        err.severity === 'error' ? 'text-red-800 bg-red-50/80' : '',
                        err.severity === 'warn' ? 'text-amber-900 bg-amber-50/70' : '',
                        err.severity === 'ok' ? 'text-gray-400' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={err.text === '—' ? '불일치 없음' : err.text}
                    >
                      <span className="line-clamp-4 break-words">{err.text}</span>
                    </td>
                    {/* ★ 엑셀행수 (non-distinct total) */}
                    <td
                      className="px-1.5 py-0.5 text-center font-bold text-orange-800 border-r border-slate-200/80"
                      title={`엑셀 총 행수 (non-distinct): ${parseExcelTotalCounts?.[s.itemCode] ?? '-'}`}
                    >
                      {parseExcelTotalCounts?.[s.itemCode] ?? <span className="text-gray-300">-</span>}
                    </td>
                    {/* ★ 원본 (distinct) */}
                    <td
                      className={`px-1.5 py-0.5 text-center font-bold border-r border-slate-200/80 ${
                        excelN != null && excelN !== parsedFlatN ? 'text-orange-700 bg-orange-50/60' : ''
                      }`}
                      title={excelN != null ? `엑셀 distinct: ${excelN}` : '엑셀 통계 없음'}
                    >
                      {excelN != null ? excelN : originalTotal}
                    </td>
                    {/* 파싱 */}
                    <td
                      className={`px-1.5 py-0.5 text-center font-bold border-r border-slate-200/80 ${
                        excelVsParse ? 'text-orange-700 bg-orange-50/90' : 'text-violet-900'
                      }`}
                      title={`파싱 distinct = ${parsedFlatN}`}
                    >
                      {parsedFlatN}
                    </td>
                    {/* DB */}
                    <td
                      className={[
                        'px-1.5 py-0.5 text-center font-bold border-r border-slate-200/80',
                        dbUnderSaved
                          ? 'bg-red-100 text-red-800 ring-1 ring-red-400'
                          : dbExpectedMismatch
                            ? 'bg-amber-50 text-amber-900'
                            : dbActual != null
                              ? 'text-slate-900'
                              : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={
                        pg && pg.status !== 'pending'
                          ? `PG 저장 ${dbActual}건 · 기대 ${pg.expected}건`
                          : fmeaId
                            ? '통계 열림 시 자동 조회'
                            : 'FMEA 선택 후 조회'
                      }
                    >
                      {pgsqlData ? (
                        pg && pg.status !== 'pending' ? (
                          dbActual
                        ) : (
                          <span className="text-gray-300">…</span>
                        )
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    {/* ★ 중복 = 엑셀행수 - 원본(distinct) */}
                    <td className="px-1.5 py-0.5 text-center font-bold border-r border-slate-200/80">
                      {(() => {
                        const total = parseExcelTotalCounts?.[s.itemCode] ?? 0;
                        const distinct = excelN ?? 0;
                        const dup = Math.max(0, total - distinct);
                        return dup > 0 ? (
                          <button onClick={() => handleDupClick(s.itemCode)}
                            className={`px-1.5 rounded cursor-pointer font-bold ${
                              isHighlighted ? 'bg-amber-500 text-white' : 'text-red-600 bg-red-50 hover:bg-red-100'
                            }`}>
                            {dup}
                          </button>
                        ) : (
                          <span className="text-gray-300">0</span>
                        );
                      })()}
                    </td>
                    {/* ★v5: parentId 체인 (지침서 Section 2-2) */}
                    <td className="px-1 py-0.5 text-center text-[8px] border-r border-slate-200/80 text-amber-800 font-mono" title={`${s.itemCode}.parentId`}>
                      {({
                        C1: '—', C2: 'C1', C3: 'C2', C4: 'C3',
                        A1: '—', A2: 'A1', A3: 'A1', A4: 'A1', A5: 'A4', A6: 'A5',
                        B1: 'A1', B2: 'B1', B3: 'B2', B4: 'B3', B5: 'B4',
                      } as Record<string, string>)[s.itemCode] || '—'}
                    </td>
                    {/* ★ UUID / 복합키 고유 */}
                    <td className="px-1.5 py-0.5 text-center font-bold text-cyan-800 border-r border-slate-200/80">{uuid || <span className="text-gray-300">0</span>}</td>
                    <td
                      className={`px-1 py-0.5 text-center font-bold text-[9px] border-r border-slate-200/80 ${
                        !ITEM_CODES_SKIP_UUID_VS_PIPELINE.has(s.itemCode) &&
                        compositeKeyCounts[s.itemCode] !== s.uniqueCount &&
                        s.uniqueCount > 0
                          ? 'text-amber-800 bg-amber-50/90'
                          : 'text-emerald-800'
                      }`}
                      title={`복합키 고유 ${compositeKeyCounts[s.itemCode] ?? 0} · 통계 고유 ${s.uniqueCount} · UUID ${uuid}`}
                    >
                      {compositeKeyCounts[s.itemCode] ?? 0}
                    </td>
                    {/* FK */}
                    <td className="px-1.5 py-0.5 text-center font-bold border-r border-slate-200/80">
                      {fkData ? (() => {
                        const fk = fkData[s.itemCode];
                        if (!fk || fk.status === 'na') return <span className="text-gray-300">-</span>;
                        return <span className={fk.orphans === 0 ? 'text-green-600' : 'text-red-600'}>{fk.valid}/{fk.total}</span>;
                      })() : <span className="text-gray-300">-</span>}
                    </td>
                    {/* pgsql */}
                    <td className="px-1.5 py-0.5 text-center font-bold border-r border-slate-200/80">
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
              <tr className="border-t-2 border-indigo-400 bg-indigo-100/90 font-semibold">
                <td colSpan={3} className="px-1.5 py-0.5 font-bold text-indigo-900">합계</td>
                <td className="px-1 py-0.5 text-[8px] text-indigo-700 border-r border-indigo-200/80">오류 행은 붉은/주황 셀 참고</td>
                {/* 엑셀행수 합계 */}
                <td className="px-1.5 py-0.5 text-center font-bold text-orange-800">
                  {parseExcelTotalCounts
                    ? effectiveStatistics.itemStats.reduce(
                        (acc, r) => acc + (parseExcelTotalCounts[r.itemCode] ?? 0),
                        0,
                      )
                    : <span className="text-gray-400 font-normal">-</span>}
                </td>
                {/* 원본(distinct) 합계 */}
                <td className="px-1.5 py-0.5 text-center font-bold text-indigo-800">
                  {parseExcelCounts
                    ? effectiveStatistics.itemStats.reduce(
                        (acc, r) => acc + (parseExcelCounts[r.itemCode] ?? itemStatOriginalTotal(r)),
                        0,
                      )
                    : effectiveStatistics.itemStats.reduce(
                        (acc, r) => acc + itemStatOriginalTotal(r),
                        0,
                      )}
                </td>
                {/* 파싱 합계 */}
                <td className="px-1.5 py-0.5 text-center font-bold text-violet-800">
                  {effectiveStatistics.itemStats.reduce((s, r) => s + r.rawCount, 0)}
                </td>
                {/* DB 합계 */}
                <td className="px-1.5 py-0.5 text-center font-bold text-red-950">
                  {pgsqlData
                    ? effectiveStatistics.itemStats.reduce(
                        (sum, r) => sum + (pgsqlData[r.itemCode]?.actual ?? 0),
                        0,
                      )
                    : <span className="text-gray-400 font-normal">-</span>}
                </td>
                {/* 중복 합계 = 엑셀행수 합계 - 원본 합계 */}
                <td className="px-1.5 py-0.5 text-center font-bold text-red-600">
                  {(() => {
                    if (!parseExcelTotalCounts || !parseExcelCounts) return 0;
                    return effectiveStatistics.itemStats.reduce((s, r) => {
                      const t = parseExcelTotalCounts[r.itemCode] ?? 0;
                      const d = parseExcelCounts[r.itemCode] ?? 0;
                      return s + Math.max(0, t - d);
                    }, 0);
                  })()}
                </td>
                <td className="px-1 py-0.5 text-center text-amber-700 text-[8px]">—</td>
                <td className="px-1.5 py-0.5 text-center font-bold text-cyan-700">{Object.values(uuidCounts).reduce((s, c) => s + c, 0)}</td>
                <td className="px-1.5 py-0.5 text-center font-bold text-emerald-800 text-[9px]" title="항목코드별 복합키 고유 수 합(코드 간 키 공유 없음)">
                  {effectiveStatistics.itemStats.reduce((s, r) => s + (compositeKeyCounts[r.itemCode] ?? 0), 0)}
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
        </div>
      )}

      {/* ─── FC 콘텐츠: 고장사슬 미리보기 ─── */}
      {stepState.activeStep === 'FC' && (
        <FailureChainPreview
          chains={failureChains}
          isFullscreen={isFullscreen}
          hideStats
          matrixHeaderCounts={fcMatrixHeaderCounts}
        />
      )}

      {stepState.activeStep === 'FA' && (
        <div className="mb-1" data-testid="import-preview-risk-fa">
          <FullAnalysisPreview
            chains={failureChains}
            crossTab={crossTab}
            isFullscreen={isFullscreen}
            hideStats
            parseStatistics={parseStatistics}
          />
        </div>
      )}

      {/* ─── SA 콘텐츠: 구조 교차표 (L1/L2/L3). 예방·검출은 리스크 탭 ─── */}
      {stepState.activeStep === 'SA' && (
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
              <div className={`overflow-y-auto ${tableMaxH} border border-gray-200 rounded`} data-preview-level="L1" data-testid="import-preview-l1">
                <table className="w-full border-collapse text-[9px]"><thead className="sticky top-0 z-10"><tr>
                  {isEditing && <th className={TH} style={{width:24}}>
                    <input type="checkbox" checked={selectedRows.size === crossTab.cRows.length && crossTab.cRows.length > 0}
                      onChange={() => toggleAll(crossTab.cRows)} className="cursor-pointer" />
                  </th>}
                  <th className={TH} style={{width:24}}>No</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금">C1키</th>
                  <th className={TH} style={{width:45}}>C1 구분</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금">C2키</th>
                  <th className={TH}>C2 제품기능</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금">C3키</th>
                  <th className={TH}>C3 요구사항</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금">C4키</th>
                  <th className={TH}>C4 고장영향</th>
                </tr></thead><tbody>
                  {crossTab.cRows.length === 0 ? (
                    <tr><td colSpan={isEditing ? 10 : 9} className="text-center py-3 text-gray-400 text-[10px]">
                      L1 데이터 없음 — L2({crossTab.aRows.length}건) 또는 L3({crossTab.bRows.length}건) 탭을 확인하세요
                    </td></tr>
                  ) : crossTab.cRows.map((r, i) => {
                    const cMissing = r.C1 && !r.C2;
                    const cRevised = isRowRevised(r._ids);
                    return (
                    <tr key={i} data-missing={cMissing ? 'true' : undefined} data-revised={cRevised ? 'true' : undefined} className={`${selectedRows.has(i) ? 'bg-red-50' : cMissing ? 'bg-orange-50/60' : cRevised ? 'bg-red-50/40' : i % 2 ? 'bg-gray-50/50' : ''}`}>
                      {isEditing && <td className={`${TD} text-center`}><input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleRow(i)} className="cursor-pointer" /></td>}
                      <td className={`${TD_NO} ${cRevised ? 'border-l-2 border-l-red-500' : ''}`}>{cRevised ? <span title="수정본">🔴</span> : (i+1)}</td>
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l1ItemKeyCellTooltip(r, 'C1')}>
                        <span className="block truncate">{l1ItemKeyDisplayTail4(r, 'C1')}</span>
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} text-center font-medium ${cRevised ? 'text-red-600 font-bold' : ''}`}>
                        <EditCell value={r.C1} itemId={r._ids.C1} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.C1 ? (val) => onAddItems?.([{ processNo: r.category, category: 'C', itemCode: 'C1', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l1ItemKeyCellTooltip(r, 'C2')}>
                        <span className="block truncate">{l1ItemKeyDisplayTail4(r, 'C2')}</span>
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${cRevised ? 'text-red-600 font-bold' : ''}`}>
                        <EditCell value={r.C2} itemId={r._ids.C2} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.C2 ? (val) => onAddItems?.([{ processNo: r.category, category: 'C', itemCode: 'C2', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l1ItemKeyCellTooltip(r, 'C3')}>
                        <span className="block truncate">{l1ItemKeyDisplayTail4(r, 'C3')}</span>
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${cRevised ? 'text-red-600 font-bold' : ''}`}>
                        <EditCell value={r.C3} itemId={r._ids.C3} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.C3 ? (val) => onAddItems?.([{ processNo: r.category, category: 'C', itemCode: 'C3', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l1ItemKeyCellTooltip(r, 'C4')}>
                        <span className="block truncate">{l1ItemKeyDisplayTail4(r, 'C4')}</span>
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
              <div className={`overflow-y-auto ${tableMaxH} border border-gray-200 rounded`} data-preview-level="L2" data-testid="import-preview-l2">
                <table className="w-full border-collapse text-[9px]"><thead className="sticky top-0 z-10"><tr>
                  {isEditing && <th className={TH} style={{width:24}}>
                    <input type="checkbox" checked={selectedRows.size === crossTab.aRows.length && crossTab.aRows.length > 0}
                      onChange={() => toggleAll(crossTab.aRows)} className="cursor-pointer" />
                  </th>}
                  <th className={TH} style={{width:24}}>No</th>
                  <th className={TH} style={{width:48}}>A1 공정번호</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금">A2키</th>
                  <th className={TH}>A2 공정명</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금">A3키</th>
                  <th className={TH}>A3 공정기능</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금">A4키</th>
                  <th className={TH}>A4 제품특성</th>
                  <th className={TH} style={{width:38}}>특별특성</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금">A5키</th>
                  <th className={TH}>A5 고장형태</th>
                </tr></thead><tbody>
                  {crossTab.aRows.length === 0 ? (
                    <tr><td colSpan={isEditing ? 12 : 11} className="text-center py-3 text-gray-400 text-[10px]">
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
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l2ItemKeyCellTooltip(r, 'A2')}>
                        <span className="block truncate">{l2ItemKeyDisplayTail4(r, 'A2')}</span>
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${aRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.A2} itemId={r._ids.A2} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A2 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A2', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l2ItemKeyCellTooltip(r, 'A3')}>
                        <span className="block truncate">{l2ItemKeyDisplayTail4(r, 'A3')}</span>
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${aRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.A3} itemId={r._ids.A3} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A3 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A3', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l2ItemKeyCellTooltip(r, 'A4')}>
                        <span className="block truncate">{l2ItemKeyDisplayTail4(r, 'A4')}</span>
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${aRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.A4} itemId={r._ids.A4} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A4 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A4', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${TD} text-center`}><span className={`text-[10px] font-bold ${r.A4SC ? 'text-red-700' : 'text-gray-300'}`}>{r.A4SC || '-'}</span></td>
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l2ItemKeyCellTooltip(r, 'A5')}>
                        <span className="block truncate">{l2ItemKeyDisplayTail4(r, 'A5')}</span>
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${aRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.A5} itemId={r._ids.A5} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A5 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A5', value: val, createdAt: new Date() }]) : undefined} /></td>
                    </tr>
                    );
                  })}
                </tbody></table>
              </div>
            )}

            {/* L3 테이블 */}
            {previewLevel === 'L3' && (
              <div className={`overflow-y-auto ${tableMaxH} border border-gray-200 rounded`} data-preview-level="L3" data-testid="import-preview-l3">
                <table className="w-full border-collapse text-[9px]"><thead className="sticky top-0 z-10"><tr>
                  {isEditing && <th className={TH} style={{width:24}}>
                    <input type="checkbox" checked={selectedRows.size === crossTab.bRows.length && crossTab.bRows.length > 0}
                      onChange={() => toggleAll(crossTab.bRows)} className="cursor-pointer" />
                  </th>}
                  <th className={TH} style={{width:24}}>No</th>
                  <th className={TH} style={{width:38}}>공정</th>
                  <th className={TH} style={{width:28}}>4M</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금·행 전체">B1키</th>
                  <th className={TH}>B1 작업요소</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금·행 전체">B2키</th>
                  <th className={TH}>B2 요소기능</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금·행 전체">B3키</th>
                  <th className={TH}>B3 공정특성</th>
                  <th className={TH} style={{width:38}}>특별특성</th>
                  <th className={TH} style={{width: 40}} title="ID 마지막 4자, 툴팁에 전체 UUID·텍스트 눈금·행 전체">B4키</th>
                  <th className={TH}>B4 고장원인</th>
                </tr></thead><tbody>
                  {crossTab.bRows.length === 0 ? (
                    <tr><td colSpan={isEditing ? 13 : 12} className="text-center py-3 text-gray-400 text-[10px]">
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
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l3ItemKeyCellTooltip(r, 'B1')}>
                        <span className="block truncate">{l3ItemKeyDisplayTail4(r, 'B1')}</span>
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${bRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.B1} itemId={r._ids.B1} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B1 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B1', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l3ItemKeyCellTooltip(r, 'B2')}>
                        <span className="block truncate">{l3ItemKeyDisplayTail4(r, 'B2')}</span>
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${bRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.B2} itemId={r._ids.B2} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B2 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B2', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l3ItemKeyCellTooltip(r, 'B3')}>
                        <span className="block truncate">{l3ItemKeyDisplayTail4(r, 'B3')}</span>
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${bRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.B3} itemId={r._ids.B3} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B3 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B3', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${TD} text-center`}><span className={`text-[10px] font-bold ${r.B3SC ? 'text-red-700' : 'text-gray-300'}`}>{r.B3SC || '-'}</span></td>
                      <td className={`${TD} align-top text-center font-mono text-[9px] font-semibold text-slate-700 w-10`} title={l3ItemKeyCellTooltip(r, 'B4')}>
                        <span className="block truncate">{l3ItemKeyDisplayTail4(r, 'B4')}</span>
                      </td>
                      <td className={`${isEditing ? TD_EDIT : TD} ${bRevised ? 'text-red-600 font-bold' : ''}`}><EditCell value={r.B4} itemId={r._ids.B4} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B4 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B4', value: val, createdAt: new Date() }]) : undefined} /></td>
                    </tr>
                    );
                  })}
                  {crossTab.bRows.length > 100 && <tr><td colSpan={isEditing ? 13 : 12} className="text-center text-gray-400 text-[9px] py-0.5">... 외 {crossTab.bRows.length - 100}행</td></tr>}
                </tbody></table>
              </div>
            )}
          </>
        )}
      </>
      )}
      {/* 경고/확인 다이얼로그 */}
      <ImportAlertDialog state={alertState} onClose={closeAlert} />
    </div>
  );
}

export default TemplatePreviewContent;
