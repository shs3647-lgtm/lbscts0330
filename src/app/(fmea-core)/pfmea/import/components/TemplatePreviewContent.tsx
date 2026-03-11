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
import { FullAnalysisPreview } from './FullAnalysisPreview';
import ParseStatisticsPanel from './ParseStatisticsPanel';
import { FAVerificationBar } from './FAVerificationBar';
import { TH, TD_NO, TD, TD_EDIT, M4_LABEL, M4_BADGE, EditCell } from './TemplateSharedUI';

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
  // 미리보기 레벨
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
  fmeaId?: string;  // ★ 2026-03-05: verify-counts 자체 호출용
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
  // ★ 2026-03-10: 4개 모드(기존/수동/자동/전처리) 모두 SA→FC→FA 3단계 검증 표준화
  const hasStepProcess = flatData.length > 0;  // 데이터가 있으면 3단계 프로세스 활성화
  const isSAActive = stepState.activeStep === 'SA';

  // ── parseStatistics 없을 때 flatData/crossTab에서 통계 자동 생성 ──
  const effectiveStatistics = useMemo<ParseStatistics | undefined>(() => {
    if (parseStatistics) return parseStatistics;
    // DB에서 로드한 경우 parseStatistics가 없으므로 crossTab/flatData에서 역산
    if (crossTab.total === 0 && flatData.length === 0) return undefined;

    const ITEM_LABELS: Record<string, string> = {
      A1: '공정번호', A2: '공정명', A3: '공정기능', A4: '제품특성', A5: '고장형태', A6: '검출관리',
      B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: '고장원인', B5: '예방관리',
      C1: '구분', C2: '제품기능', C3: '요구사항', C4: '고장영향',
    };

    // flatData에서 itemCode별 통계
    const codeCounts = new Map<string, { raw: number; vals: Set<string> }>();
    flatData.forEach(d => {
      const code = d.itemCode;
      if (!code) return;
      if (!codeCounts.has(code)) codeCounts.set(code, { raw: 0, vals: new Set() });
      const entry = codeCounts.get(code)!;
      entry.raw++;
      if (d.value?.trim()) entry.vals.add(`${d.processNo || ''}|${d.value.trim()}`);
    });

    const itemStats: import('../excel-parser').ItemCodeStat[] = [];
    for (const [code, info] of codeCounts) {
      itemStats.push({
        itemCode: code,
        label: ITEM_LABELS[code] || code,
        rawCount: info.raw,
        uniqueCount: info.vals.size,
        dupSkipped: info.raw - info.vals.size,
      });
    }
    // 코드 순서 정렬
    itemStats.sort((a, b) => a.itemCode.localeCompare(b.itemCode));

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

  // ── FC검증 토글 ──
  const [showVerification, setShowVerification] = useState(false);

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
    if (!confirm(`${code} 중복 ${dupRowIndices.size}행(${ids.length}개 항목)을 삭제하시겠습니까?\n\n⚠️ 중복 행 전체가 삭제됩니다.\n하나만 유지하려면 [편집]으로 선택 후 개별 삭제하세요.`)) return;
    onDeleteItems(ids);
    setHighlightDupCode(null);
    setSelectedRows(new Set());
  }, [highlightDupCode, dupRowIndices, crossTab, onDeleteItems, setSelectedRows]);

  // ── SA 확정 핸들러 (미확정 시 전진) ──
  const handleSAConfirm = useCallback(() => {
    if (generatedData.length === 0) {
      alert('기초정보 데이터가 없습니다.\n엑셀 Import 또는 템플릿을 먼저 생성해주세요.');
      return;
    }
    const v = effectiveStatistics?.verification;
    if (v && !v.pass) {
      const details = v.mismatches.slice(0, 10).map(m => {
        const typeLabel: Record<string, string> = { FM_COUNT: 'FM건수', FC_PER_FM: 'FC/FM', FE_PER_FM: 'FE/FM', CHAIN_COUNT: '사슬행수' };
        return `  [${m.processNo}] ${typeLabel[m.type] || m.type}: 원본 ${m.rawCount} → 파싱 ${m.parsedCount}`;
      }).join('\n');
      const ok = confirm(
        `⚠️ 검증 불일치 ${v.mismatches.length}건 발견\n━━━━━━━━━━━━━━━━━━━━\n` + details +
        (v.mismatches.length > 10 ? `\n  ... 외 ${v.mismatches.length - 10}건` : '') +
        `\n━━━━━━━━━━━━━━━━━━━━\n원본 엑셀과 파싱 결과가 다릅니다.\n그래도 SA 확정을 진행하시겠습니까?`
      );
      if (!ok) return;
    }
    const result = confirmSA();
    if (result?.success) {
      const d = result.diagnostics;
      alert(`SA 확정 완료!\n\nL2 공정: ${d.l2Count}개\nL3 작업요소: ${d.l3Count}개\nL2기능: ${d.l2FuncCount}개, L3기능: ${d.l3FuncCount}개\n고장형태: ${d.fmCount}개, 고장원인: ${d.fcCount}개, 고장영향: ${d.feCount}개`);
    } else if (result && !result.success) {
      alert('SA 확정 실패: 계층 구조 빌드에 문제가 있습니다.');
    } else if (!result) {
      alert('SA 확정 불가: 데이터를 먼저 저장해주세요.');
    }
  }, [generatedData.length, effectiveStatistics, confirmSA]);

  // ── SA 되돌리기 핸들러 (확정 후 리셋+SA탭 이동) ──
  const handleSAReset = useCallback(() => {
    resetToSA();
  }, [resetToSA]);

  // ── FC 확정 핸들러 (미확정 시 전진) ──
  const handleFCConfirm = useCallback(() => {
    if (fcComparison && fcComparison.missing.length > 0) {
      const ok = confirm(
        `FC 비교 결과 누락 ${fcComparison.missing.length}건이 있습니다.\n` +
        `매칭률: ${fcComparison.stats.matchRate.toFixed(0)}%\n\n` +
        '경고를 무시하고 FC를 확정하시겠습니까?'
      );
      if (!ok) return;
      confirmFC(true);
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
      {/* ─── SA/FC/FA 서브탭 — 4개 모드 공통 3단계 확정 배지 ─── */}
      {hasStepProcess && (
        <div className="flex items-center gap-0 mb-1.5 border-b border-gray-200">
          {(['SA', 'FC', 'FA'] as const).map((tab, idx) => {
            const labels = { SA: 'SA 시스템분석', FC: 'FC 고장사슬', FA: 'FA 통합분석' };
            const counts = { SA: crossTab.total, FC: failureChains.length, FA: failureChains.length };
            const confirmed = { SA: stepState.saConfirmed, FC: stepState.fcConfirmed, FA: stepState.faConfirmed };
            const isActive = stepState.activeStep === tab;
            return (
              <React.Fragment key={tab}>
                {idx > 0 && <span className="text-gray-300 text-[10px] mx-0.5">&rarr;</span>}
                <button onClick={() => setActiveStep(tab)}
                  className={`px-3 py-1 text-[11px] font-bold cursor-pointer transition-colors border-b-2 ${
                    isActive
                      ? 'text-blue-700 border-blue-600 bg-blue-50/60'
                      : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'
                  }`}>
                  {confirmed[tab] && <span className="text-green-600 mr-0.5">&#10003;</span>}
                  {labels[tab]} <span className="text-[9px] font-normal">({counts[tab]})</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ─── 통합 액션 바 (항상 고정 표시, 활성화/비활성화) ─── */}
      <div>
        <div className="flex flex-wrap items-center gap-1 mb-1">
          {/* 편집 */}
          <button onClick={() => {
            if (!isSAActive || editDisabled) return;
            if (!isEditing && !templateGenerated && !isDownload) {
              onGenerate();
              setTemplateGenerated(true);
            }
            setIsEditing(!isEditing); setSelectedRows(new Set());
          }}
            disabled={!isSAActive || editDisabled}
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
              !isSAActive || editDisabled ? BTN_DISABLED
              : isEditing ? 'bg-blue-600 text-white border-blue-600 cursor-pointer' : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 cursor-pointer'
            }`}>
            {isEditing && isSAActive ? '편집 ON' : '편집'}
          </button>
          {isEditing && isSAActive && (<>
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
          </>)}

          <span className="w-px h-4 bg-blue-300 mx-0.5" />

          {/* L1/L2/L3 레벨 */}
          {(['L1','L2','L3'] as const).map(lvl => {
            const count = lvl === 'L1' ? crossTab.cRows.length : lvl === 'L2' ? crossTab.aRows.length : crossTab.bRows.length;
            const miss = missingStats[lvl];
            const disabled = !isSAActive;
            return (
              <button key={lvl} onClick={() => !disabled && setPreviewLevel(lvl)}
                disabled={disabled}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                  disabled ? BTN_DISABLED
                  : previewLevel === lvl
                    ? 'bg-blue-600 text-white border-blue-600 cursor-pointer'
                    : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 cursor-pointer'
                }`}>
                {lvl} <span className="text-[9px]">{count}</span>
                {!disabled && miss > 0 && <span className={`ml-0.5 text-[8px] ${previewLevel === lvl ? 'text-orange-200' : 'text-orange-500'}`}>({miss})</span>}
              </button>
            );
          })}

          {isSAActive && missingStats[previewLevel] > 0 && (
            <button
              onClick={() => {
                const details = missingDetails[previewLevel];
                if (details.length > 0) {
                  alert(`${previewLevel} 누락 ${details.length}건:\n\n${details.slice(0, 15).join('\n')}${details.length > 15 ? `\n... 외 ${details.length - 15}건` : ''}\n\n확인 후 해당 행을 편집해 주세요.`);
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

          <span className="w-px h-4 bg-blue-300 mx-0.5" />

          {/* Import */}
          {onImportFile && (
            <button onClick={onImportFile}
              className="px-2.5 py-0.5 rounded text-[10px] font-bold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer">
              Import
            </button>
          )}

          {/* FMEA 작성 — ★ 2026-03-10: FA 완료 후에만 활성화 */}

          {/* ─── 확정 버튼 그룹 (4개 모드 공통 — 데이터 있으면 활성화) ─── */}
          {hasStepProcess && (<>
            {/* SA: 미확정→확정 / 확정됨→되돌리기 */}
            {stepState.saConfirmed ? (
              <button
                onClick={handleSAReset}
                disabled={isAnalysisComplete}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                  isAnalysisComplete ? BTN_DISABLED
                  : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100 cursor-pointer'
                }`}>
                SA 확정됨
              </button>
            ) : (
              <button
                onClick={handleSAConfirm}
                disabled={!canSA}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                  canSA ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 cursor-pointer' : BTN_DISABLED
                }`}>
                SA 확정
              </button>
            )}

            {/* FC검증 토글 — SA확정 후, FC확정 전 위치 (워크플로우 순서) */}
            {failureChains.length > 0 && (
              <button
                onClick={() => setShowVerification(v => !v)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border cursor-pointer ${
                  showVerification
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100'
                }`}
                title="FC검증 통계표 토글">
                FC검증
              </button>
            )}

            {/* FC: 미확정→확정 / 확정됨→되돌리기 */}
            {stepState.fcConfirmed ? (
              <button
                onClick={handleFCReset}
                disabled={isAnalysisComplete}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                  isAnalysisComplete ? BTN_DISABLED
                  : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100 cursor-pointer'
                }`}>
                FC 확정됨
              </button>
            ) : (
              <button
                onClick={handleFCConfirm}
                disabled={!canFC}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                  canFC ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 cursor-pointer' : BTN_DISABLED
                }`}>
                FC 확정
              </button>
            )}

            <button
              onClick={() => confirmFA()}
              disabled={!canFA || isAnalysisImporting || isAnalysisComplete}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                isAnalysisComplete ? BTN_CONFIRMED
                : canFA && !isAnalysisImporting
                  ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 cursor-pointer'
                  : BTN_DISABLED
              }`}>
              {isAnalysisImporting ? '생성중...' : isAnalysisComplete ? 'FA 완료' : 'FA 확정'}
            </button>

            {/* ★ FMEA 작성 → : FA 완료 후에만 활성화 */}
            {fmeaId && (
              <button
                onClick={() => window.location.href = `/pfmea/worksheet?id=${fmeaId}`}
                disabled={!isAnalysisComplete}
                className={`px-3 py-0.5 rounded text-[10px] font-bold border ${
                  isAnalysisComplete
                    ? 'border-orange-400 text-white bg-orange-500 hover:bg-orange-600 cursor-pointer'
                    : BTN_DISABLED
                }`}>
                FMEA 작성 →
              </button>
            )}
            {isAnalysisComplete && (
              <span className="text-[10px] text-green-600 font-bold">✓ 검증 완료</span>
            )}
          </>)}

          {/* ★ 2026-02-27: 엑셀 내보내기 제거, 샘플Down/빈 양식은 탭 바 우측으로 이동 */}
        </div>
      </div>

      {/* ─── 변환결과 통계표 — 4개 모드 공통, 모든 단계에서 표시 ─── */}
      {effectiveStatistics && (
        <div className="mb-1.5">
          <ParseStatisticsPanel statistics={effectiveStatistics} dbVerifyCounts={stepState.dbVerifyCounts ?? undefined} failureChains={failureChains} flatData={flatData} fmeaId={fmeaId} />
        </div>
      )}

      {/* ─── FC검증 통계 — 토글 시 항상 표시 ─── */}
      {showVerification && failureChains.length > 0 && (
        <FAVerificationBar chains={failureChains} parseStatistics={effectiveStatistics} flatData={flatData} onScrollToItem={handleScrollToUnmatched} />
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

      {/* ─── FA 콘텐츠: 통합분석 미리보기 (4개 모드 공통) ─── */}
      {stepState.activeStep === 'FA' && (<>
        {!stepState.fcConfirmed && stepState.saConfirmed && (
          <div className="flex items-center gap-2 mb-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-300 rounded text-[11px]">
            <span className="text-amber-700">FC 고장사슬이 확정되지 않았습니다.</span>
            <button
              onClick={() => { confirmFC(true); }}
              className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white border border-teal-600 hover:bg-teal-700 cursor-pointer">
              FC 확정 후 FA 진행
            </button>
          </div>
        )}
        <div className="flex items-center justify-end gap-1.5 mb-1.5">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px]">
            <b className="text-blue-700">{failureChains.length}</b><span className="text-blue-500">전체</span>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px]">
            <b className="text-blue-700">{new Set(failureChains.map(c => c.processNo)).size}</b><span className="text-blue-500">공정</span>
          </span>
        </div>
        <FullAnalysisPreview chains={failureChains} crossTab={crossTab} isFullscreen={isFullscreen} hideStats parseStatistics={effectiveStatistics} />
      </>)}

      {/* ─── SA 콘텐츠: L1/L2/L3 미리보기 ─── */}
      {isSAActive && <>
        {/* ─── 누락 경고 배너 ─── */}
        {missingStats[previewLevel] > 0 && flatData.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const details = missingDetails[previewLevel];
              if (details.length > 0) {
                alert(`${previewLevel} 누락 ${details.length}건:\n\n${details.slice(0, 15).join('\n')}${details.length > 15 ? `\n... 외 ${details.length - 15}건` : ''}\n\n확인 후 해당 행을 편집해 주세요.`);
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
              disabled={editDisabled || !isSAActive}
              className={`px-2 py-0.5 text-[9px] rounded font-bold border ${
                editDisabled || !isSAActive ? BTN_DISABLED
                : 'bg-blue-600 text-white border-blue-600 cursor-pointer hover:bg-blue-700'
              }`}>
              편집
            </button>
            {/* 삭제: 중복행 직접 삭제 (확인 후) */}
            <button onClick={handleDeleteDupRows}
              disabled={editDisabled || !isSAActive || !onDeleteItems}
              className={`px-2 py-0.5 text-[9px] rounded font-bold border ${
                editDisabled || !isSAActive ? BTN_DISABLED
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
                  {crossTab.cRows.map((r, i) => {
                    const cMissing = r.C1 && !r.C2;
                    return (
                    <tr key={i} data-missing={cMissing ? 'true' : undefined} className={`${selectedRows.has(i) ? 'bg-red-50' : cMissing ? 'bg-orange-50/60' : i % 2 ? 'bg-gray-50/50' : ''}`}>
                      {isEditing && <td className={`${TD} text-center`}><input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleRow(i)} className="cursor-pointer" /></td>}
                      <td className={TD_NO}>{i+1}</td>
                      <td className={`${isEditing ? TD_EDIT : TD} text-center font-medium`}>
                        <EditCell value={r.C1} itemId={r._ids.C1} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.C1 ? (val) => onAddItems?.([{ processNo: r.category, category: 'C', itemCode: 'C1', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                      <td className={isEditing ? TD_EDIT : TD}>
                        <EditCell value={r.C2} itemId={r._ids.C2} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.C2 ? (val) => onAddItems?.([{ processNo: r.category, category: 'C', itemCode: 'C2', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                      <td className={isEditing ? TD_EDIT : TD}>
                        <EditCell value={r.C3} itemId={r._ids.C3} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.C3 ? (val) => onAddItems?.([{ processNo: r.category, category: 'C', itemCode: 'C3', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                      <td className={isEditing ? TD_EDIT : TD}>
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
                  {/* v3.0: A6 검출관리 컬럼 제거 — 리스크 탭에서 입력 */}
                </tr></thead><tbody>
                  {crossTab.aRows.map((r, i) => {
                    const aMissing = r.A1 && !r.A2;
                    const aDup = dupRowIndices.has(i) && highlightDupCode?.startsWith('A');
                    return (
                    <tr key={i} ref={i === firstDupIdx && aDup ? firstDupRef : undefined} data-missing={aMissing ? 'true' : undefined} className={`${selectedRows.has(i) ? 'bg-red-50' : aDup ? 'bg-amber-100 ring-1 ring-amber-400' : aMissing ? 'bg-orange-50/60' : i % 2 ? 'bg-gray-50/50' : ''}`}>
                      {isEditing && <td className={`${TD} text-center`}><input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleRow(i)} className="cursor-pointer" /></td>}
                      <td className={`${TD_NO} ${aMissing ? 'border-l-2 border-l-orange-400' : ''}`}>{i+1}</td>
                      <td className={`${isEditing ? TD_EDIT : TD} text-center font-mono font-medium`}>
                        <EditCell value={r.A1} itemId={r._ids.A1} onSave={onUpdateItem} editing={isEditing}
                          onCreateNew={!r._ids.A1 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A1', value: val, createdAt: new Date() }]) : undefined} />
                      </td>
                      <td className={isEditing ? TD_EDIT : TD}><EditCell value={r.A2} itemId={r._ids.A2} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A2 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A2', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={isEditing ? TD_EDIT : TD}><EditCell value={r.A3} itemId={r._ids.A3} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A3 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A3', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={isEditing ? TD_EDIT : TD}><EditCell value={r.A4} itemId={r._ids.A4} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A4 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A4', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${TD} text-center`}><span className={`text-[10px] font-bold ${r.A4SC ? 'text-red-700' : 'text-gray-300'}`}>{r.A4SC || '-'}</span></td>
                      <td className={isEditing ? TD_EDIT : TD}><EditCell value={r.A5} itemId={r._ids.A5} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.A5 ? (val) => onAddItems?.([{ processNo: r.processNo, category: 'A', itemCode: 'A5', value: val, createdAt: new Date() }]) : undefined} /></td>
                      {/* v3.0: A6 검출관리 셀 제거 */}
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
                  {/* v3.0: B5 예방관리 컬럼 제거 — 리스크 탭에서 입력 */}
                </tr></thead><tbody>
                  {crossTab.bRows.slice(0, 100).map((r, i) => {
                    const bMissing = false;
                    const bDup = dupRowIndices.has(i) && highlightDupCode?.startsWith('B');
                    return (
                    <tr key={i} ref={i === firstDupIdx && bDup ? firstDupRef : undefined} data-missing={bMissing ? 'true' : undefined} className={`${selectedRows.has(i) ? 'bg-red-50' : bDup ? 'bg-amber-100 ring-1 ring-amber-400' : bMissing ? 'bg-orange-50/60' : i % 2 ? 'bg-gray-50/50' : ''}`}>
                      {isEditing && <td className={`${TD} text-center`}><input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleRow(i)} className="cursor-pointer" /></td>}
                      <td className={`${TD_NO} ${bMissing ? 'border-l-2 border-l-orange-400' : ''}`}>{i+1}</td>
                      <td className={`${TD} text-center font-mono`}>{r.processNo}</td>
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
                      <td className={isEditing ? TD_EDIT : TD}><EditCell value={r.B1} itemId={r._ids.B1} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B1 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B1', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={isEditing ? TD_EDIT : TD}><EditCell value={r.B2} itemId={r._ids.B2} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B2 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B2', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={isEditing ? TD_EDIT : TD}><EditCell value={r.B3} itemId={r._ids.B3} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B3 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B3', value: val, createdAt: new Date() }]) : undefined} /></td>
                      <td className={`${TD} text-center`}><span className={`text-[10px] font-bold ${r.B3SC ? 'text-red-700' : 'text-gray-300'}`}>{r.B3SC || '-'}</span></td>
                      <td className={isEditing ? TD_EDIT : TD}><EditCell value={r.B4} itemId={r._ids.B4} onSave={onUpdateItem} editing={isEditing}
                        onCreateNew={!r._ids.B4 ? (val) => onAddItems?.([{ processNo: r.processNo, m4: r.m4, category: 'B', itemCode: 'B4', value: val, createdAt: new Date() }]) : undefined} /></td>
                      {/* v3.0: B5 예방관리 셀 제거 */}
                    </tr>
                    );
                  })}
                  {crossTab.bRows.length > 100 && <tr><td colSpan={isEditing ? 11 : 10} className="text-center text-gray-400 text-[9px] py-0.5">... 외 {crossTab.bRows.length - 100}행</td></tr>}
                </tbody></table>
              </div>
            )}
          </>
        )}
      </>}
    </div>
  );
}

export default TemplatePreviewContent;
