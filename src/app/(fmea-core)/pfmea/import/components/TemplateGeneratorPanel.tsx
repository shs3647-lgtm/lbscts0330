/**
 * @file TemplateGeneratorPanel.tsx
 * @description 템플릿 생성기 인라인 패널 (항상 화면에 표시)
 * 3탭: ① 기존 데이터 다운로드 / ② 수동 템플릿 / ③ 전처리
 * + 전체 데이터 미리보기 (실시간 자동 갱신)
 * + 인라인 편집 / 저장 / 구조분석 배지
 * @created 2026-02-18
 * @updated 2026-02-26 - 컴포넌트 분리 (TemplateSharedUI, FAVerificationBar, TemplatePreviewContent)
 */

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { ImportedFlatData } from '../types';
import type { ManualTemplateConfig, WorkElementInput } from '../utils/template-data-generator';
import type { TemplateMode } from '../hooks/useTemplateGenerator';
import type { BdStatusItem, FMEAProject } from './ImportPageTypes';
import { fmeaIdToBdId, BD_TYPE_COLORS } from '../utils/bd-id';
import HelpIcon from '@/components/common/HelpIcon';
import { buildCrossTab, collectDeleteIds } from '../utils/template-delete-logic';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { buildFailureChainsFromFlat } from '../types/masterFailureChain';
import { useImportSteps } from '../hooks/useImportSteps';
import { TabBtn, DataStatusBar } from './TemplateSharedUI';
import { TemplatePreviewContent } from './TemplatePreviewContent';
import StepBPreprocessSection from './StepBPreprocessSection';
import ManualTemplateInline from './ManualTemplateInline';
import AutoTemplateInline from './AutoTemplateInline';

// ─── Props ───

interface Props {
  onGenerate: () => void;
  templateMode: TemplateMode;
  setTemplateMode: (mode: TemplateMode) => void;
  manualConfig: ManualTemplateConfig;
  updateManualConfig: <K extends keyof ManualTemplateConfig>(key: K, value: ManualTemplateConfig[K]) => void;
  workElements: WorkElementInput[];
  multipliers: { b2: number; b3: number; b4: number; b5: number };
  updateMultiplier: (key: 'b2' | 'b3' | 'b4' | 'b5', value: number) => void;
  addWorkElement: (el: Omit<WorkElementInput, 'id'>) => void;
  removeWorkElement: (id: string) => void;
  updateWorkElement: (id: string, field: keyof WorkElementInput, value: string) => void;
  flatData: ImportedFlatData[];
  onDownloadSample?: () => void;
  onDownloadEmpty?: () => void;
  onImportFile?: () => void;
  // ★ 편집/저장/입포트 핸들러
  onUpdateItem?: (id: string, value: string) => void;
  onUpdateM4?: (id: string, m4: string) => void;
  onDeleteItems?: (ids: string[]) => void;
  onAddItems?: (items: Omit<ImportedFlatData, 'id'>[]) => void;
  onSave?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  dirty?: boolean;
  selectedFmeaId?: string;
  // ★ 3단계 확정 프로세스
  l1Name?: string;
  fmeaInfo?: { subject?: string; companyName?: string; customerName?: string; modelYear?: string; fmeaType?: string; engineeringLocation?: string; designResponsibility?: string; fmeaResponsibleName?: string; partName?: string; partNo?: string };
  onWorksheetSaved?: () => void;
  // 기존 데이터 탭 - 로드된 FMEA 정보 표시
  bdFmeaId?: string;
  bdFmeaName?: string;
  // BD 현황 정보
  bdStatusList?: BdStatusItem[];
  fmeaList?: FMEAProject[];
  // ★ 고장사슬 데이터 (기존데이터 FC/FA 미리보기용)
  failureChains?: MasterFailureChain[];
  // ★ v2.5.1: 파싱 통계 (변환결과 검증용)
  parseStatistics?: import('../../import/excel-parser').ParseStatistics;
  // ★ 전처리 DB 저장 후 콜백 (기존데이터 탭 전환 + 데이터 리로드)
  onPreprocessSaved?: () => void;
  // ★ 외부에서 펼치기 제어 (BD 사용 클릭 시, 값이 바뀔 때마다 펼침)
  expandTrigger?: number;
}

// ─── 메인 컴포넌트 ───

export function TemplateGeneratorPanel(props: Props) {
  const {
    onGenerate, templateMode, setTemplateMode,
    manualConfig, updateManualConfig,
    workElements, multipliers, updateMultiplier,
    addWorkElement, removeWorkElement, updateWorkElement,
    flatData, onDownloadSample, onDownloadEmpty, onImportFile,
    onUpdateItem, onUpdateM4, onDeleteItems, onAddItems,
    onSave,
    isSaved, isSaving, dirty, selectedFmeaId,
    l1Name, fmeaInfo: propsFmeaInfo, onWorksheetSaved,
    bdFmeaId, bdFmeaName,
    bdStatusList, fmeaList,
    failureChains: externalChains,
    parseStatistics,
  } = props;

  const displayBdId = bdFmeaId ? fmeaIdToBdId(bdFmeaId) : null;

  const [collapsed, setCollapsed] = useState(true);

  // BD 사용 클릭 시 자동 펼치기
  React.useEffect(() => {
    if (props.expandTrigger && props.expandTrigger > 0) setCollapsed(false);
  }, [props.expandTrigger]);

  const [previewLevel, setPreviewLevel] = useState<'L1' | 'L2' | 'L3'>('L2');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ★ 템플릿 생성 완료 플래그
  const [templateGenerated, setTemplateGenerated] = useState(false);

  // 행 추가 입력 상태
  const [addPNo, setAddPNo] = useState('');
  const [addM4, setAddM4] = useState<'MN' | 'MC' | 'IM' | 'EN'>('MC');
  const [addCat, setAddCat] = useState('');

  // 프리뷰 레벨 변경 시 선택 초기화
  useEffect(() => { setSelectedRows(new Set()); }, [previewLevel]);

  // ESC 키로 전체화면 종료
  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);


  // ── 미리보기 데이터 ──
  const generatedData = useMemo(() => flatData, [flatData]);

  const crossTab = useMemo(() => buildCrossTab(generatedData), [generatedData]);

  // ★ 고장사슬: 외부(DB)에서 온 데이터 우선, 없으면 flat 데이터에서 자동 도출
  const failureChains = useMemo(() => {
    if (externalChains && externalChains.length > 0) return externalChains;
    if (generatedData.length === 0) return [];
    return buildFailureChainsFromFlat(generatedData, crossTab);
  }, [externalChains, templateMode, generatedData, crossTab]);

  // ★ 누락 통계
  const missingStats = useMemo(() => {
    const l1 = crossTab.cRows.filter(r => r.C1 && !r.C2).length;
    const l2 = crossTab.aRows.filter(r => r.A1 && !r.A2).length;
    const l3 = 0;
    return { L1: l1, L2: l2, L3: l3, total: l1 + l2 + l3 };
  }, [crossTab]);

  const missingDetails = useMemo(() => {
    const L1 = crossTab.cRows
      .map((r, i) => (r.C1 && !r.C2 ? `• ${i + 1}행 구분 "${r.C1}": C2(완제품기능) 없음` : null))
      .filter(Boolean) as string[];
    const L2 = crossTab.aRows
      .map((r, i) => (r.A1 && !r.A2 ? `• ${i + 1}행 공정 ${r.A1}: A2(공정명) 없음` : null))
      .filter(Boolean) as string[];
    return { L1, L2, L3: [] as string[] };
  }, [crossTab]);

  // ★ 3단계 확정 프로세스 훅 (SA→FC→FA)
  const {
    stepState, setActiveStep,
    canSA, canFC, canFA,
    confirmSA, confirmFC, confirmFA,
    quickCreateWorksheet,
    resetToSA, resetToFC,
    fcComparison, isAnalysisImporting, isAnalysisComplete,
  } = useImportSteps({
    flatData: generatedData,
    failureChains,
    externalChains: externalChains && externalChains.length > 0 ? externalChains : undefined,
    crossTab,
    isSaved: isSaved ?? false,
    missingTotal: missingStats.total,
    fmeaId: selectedFmeaId || '',
    l1Name: l1Name || '',
    fmeaInfo: propsFmeaInfo,
    parseStatistics,
    onWorksheetSaved,
  });

  // ★ 편집 가능 여부
  const editDisabled = templateMode === 'download' && flatData.length === 0;

  // ── 행 선택/삭제 핸들러 ──
  const toggleRow = useCallback((idx: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }, []);

  const toggleAll = useCallback((rows: { _ids: Record<string, string> }[]) => {
    setSelectedRows(prev => prev.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const result = collectDeleteIds(previewLevel, crossTab, selectedRows, flatData);
    if (result.blocked) {
      alert(result.blockReason || '삭제할 수 없습니다.');
      return;
    }
    if (result.idsToDelete.length > 0 && onDeleteItems) {
      onDeleteItems(result.idsToDelete);
      setSelectedRows(new Set());
    }
  }, [previewLevel, crossTab, selectedRows, onDeleteItems, flatData]);

  // ── 행 추가 핸들러 ──
  const handleAddL2Row = useCallback(() => {
    if (!addPNo.trim() || !onAddItems) return;
    const pNo = addPNo.trim();
    const items: Omit<ImportedFlatData, 'id'>[] = ['A1','A2','A3','A4','A5','A6'].map(code => ({
      processNo: pNo, category: 'A' as const, itemCode: code,
      value: code === 'A1' ? pNo : '', createdAt: new Date(),
    }));
    onAddItems(items);
    setAddPNo('');
  }, [addPNo, onAddItems]);

  const handleAddL3Row = useCallback(() => {
    if (!addPNo.trim() || !onAddItems) return;
    const pNo = addPNo.trim();
    const items: Omit<ImportedFlatData, 'id'>[] = ['B1','B2','B3','B4','B5'].map(code => ({
      processNo: pNo, category: 'B' as const, itemCode: code, value: '',
      m4: addM4, createdAt: new Date(),
    }));
    onAddItems(items);
    setAddPNo('');
  }, [addPNo, addM4, onAddItems]);

  const handleAddFromSelected = useCallback(() => {
    if (!onAddItems || selectedRows.size === 0) return;
    const lastIdx = Math.max(...selectedRows);
    if (previewLevel === 'L3') {
      const row = crossTab.bRows[lastIdx];
      if (!row) return;
      const items: Omit<ImportedFlatData, 'id'>[] = ['B1','B2','B3','B4','B5'].map(code => ({
        processNo: row.processNo, category: 'B' as const, itemCode: code, value: '',
        m4: row.m4, createdAt: new Date(),
      }));
      onAddItems(items);
    } else if (previewLevel === 'L2') {
      const row = crossTab.aRows[lastIdx];
      if (!row) return;
      const items: Omit<ImportedFlatData, 'id'>[] = ['A1','A2','A3','A4','A5','A6'].map(code => ({
        processNo: row.processNo, category: 'A' as const, itemCode: code,
        value: code === 'A1' ? row.processNo : '', createdAt: new Date(),
      }));
      onAddItems(items);
    } else {
      const row = crossTab.cRows[lastIdx];
      if (!row) return;
      const items: Omit<ImportedFlatData, 'id'>[] = ['C1','C2','C3','C4'].map(code => ({
        processNo: row.category, category: 'C' as const, itemCode: code,
        value: code === 'C1' ? row.category : '', createdAt: new Date(),
      }));
      onAddItems(items);
    }
    setSelectedRows(new Set());
  }, [onAddItems, selectedRows, previewLevel, crossTab]);

  const handleAddL1Row = useCallback((catOverride?: string) => {
    const cat = (catOverride || addCat).trim();
    if (!cat || !onAddItems) return;
    const items: Omit<ImportedFlatData, 'id'>[] = ['C1','C2','C3','C4'].map(code => ({
      processNo: cat, category: 'C' as const, itemCode: code,
      value: code === 'C1' ? cat : '', createdAt: new Date(),
    }));
    onAddItems(items);
    setAddCat('');
  }, [addCat, onAddItems]);

  // ── 테이블 높이 ──
  const tableMaxH = isFullscreen ? 'max-h-[calc(100vh-180px)]' : 'max-h-[280px]';

  // ── 렌더링 ──
  return (
    <div className={isFullscreen
      ? 'fixed inset-0 z-[99999] bg-white overflow-auto flex flex-col'
      : 'mb-4 border border-blue-100 rounded-lg bg-blue-50/30 shadow-sm'}>
      {/* 헤더 */}
      <div className={`bg-[#2c5f7c] text-white px-4 py-2 ${collapsed && !isFullscreen ? 'rounded-lg' : isFullscreen ? '' : 'rounded-t-lg'} flex items-center justify-between cursor-pointer`}
        onClick={() => { if (!isFullscreen) setCollapsed(!collapsed); }}>
        <div className="flex items-center gap-2">
          {!isFullscreen && <span className="text-white/60 text-[11px]">{collapsed ? '▶' : '▼'}</span>}
          {isFullscreen ? (<>
            {displayBdId && (
              <span className="font-mono font-bold text-[13px] text-white">{displayBdId}</span>
            )}
            {bdFmeaName && (
              <span className="text-[12px] text-white/80">({bdFmeaName})</span>
            )}
            <span className="w-px h-4 bg-white/30 mx-1" />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/15 border border-white/30 rounded text-[11px]">
              <b>{new Set(flatData.filter(d => d.itemCode === 'A1' || d.itemCode === 'A2').map(d => d.processNo)).size}</b>
              <span className="text-white/70">공정</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/15 border border-white/30 rounded text-[11px]">
              <b>{new Set(flatData.map(d => d.itemCode)).size}</b>
              <span className="text-white/70">시트</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/15 border border-white/30 rounded text-[11px]">
              <b>{flatData.filter(d => d.value?.trim()).length}</b>
              <span className="text-white/70">데이터</span>
            </span>
          </>) : (<>
            <span className="font-semibold text-[13px]">기초정보 템플릿</span>
            {flatData.length > 0 && (
              <span className="text-[11px] text-white/50">
                {new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo)).size}공정 · {flatData.filter(d => d.value?.trim()).length}건
              </span>
            )}
          </>)}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer border border-white/30 bg-white/10 text-white hover:bg-white/20 transition-colors"
            title={isFullscreen ? '전체화면 종료 (ESC)' : '전체화면'}>
            {isFullscreen ? '축소' : '전체화면'}
          </button>
          <HelpIcon title="기초정보 템플릿 도움말" popoverWidth={420}>
            <div style={{ lineHeight: 1.8 }}>
              <p style={{ fontWeight: 700, marginBottom: 6, color: '#0c4a6e' }}>기초정보 템플릿이란?</p>
              <p>PFMEA 구조분석 워크시트에 사용되는 기초정보(공정명, 기능, 고장모드 등)를 관리하는 패널입니다.</p>
              <p style={{ fontWeight: 700, marginTop: 10, marginBottom: 6, color: '#0c4a6e' }}>3가지 탭</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '3px 6px', fontWeight: 700, color: '#2563eb' }}>기존 데이터</td>
                    <td style={{ padding: '3px 6px' }}>DB 기초정보 미리보기/편집 <span style={{ color: '#6b7280', fontSize: 10 }}>(L3: 4M+작업요소)</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '3px 6px', fontWeight: 700, color: '#2563eb' }}>수동 템플릿</td>
                    <td style={{ padding: '3px 6px' }}>샘플Down → 엑셀 편집 → Import</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '3px 6px', fontWeight: 700, color: '#2563eb' }}>자동</td>
                    <td style={{ padding: '3px 6px' }}>기존 BD에서 작업요소 자동 추출 → 생성</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 6px', fontWeight: 700, color: '#2563eb' }}>전처리</td>
                    <td style={{ padding: '3px 6px' }}>Import 전 데이터 전처리</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>* 샘플Down으로 업종별 예시 템플릿을 다운로드할 수 있습니다</p>
            </div>
          </HelpIcon>
        </div>
      </div>

      {/* 3탭 */}
      {!collapsed && <div className="flex items-center border-b border-blue-100 bg-blue-50/40">
        <div className="flex flex-1">
          <TabBtn active={templateMode === 'download'} label="기존 데이터" onClick={() => { setTemplateMode('download'); setTemplateGenerated(false); setIsEditing(false); setSelectedRows(new Set()); }} />
          <TabBtn active={templateMode === 'manual'} label="수동 템플릿" onClick={() => { setTemplateMode('manual'); setTemplateGenerated(false); setIsEditing(false); setSelectedRows(new Set()); }} />
          <TabBtn active={templateMode === 'auto'} label="자동" onClick={() => { setTemplateMode('auto'); setTemplateGenerated(false); setIsEditing(false); setSelectedRows(new Set()); }} />
          <TabBtn active={templateMode === 'preprocess'} label="전처리" onClick={() => { setTemplateMode('preprocess'); setTemplateGenerated(false); setIsEditing(false); setSelectedRows(new Set()); }} />
        </div>
        {/* ★ 2026-02-27: 샘플/빈 양식 다운로드 — 탭 바 우측 배치 */}
        <div className="flex items-center gap-1 pr-2">
          {onDownloadSample && (
            <button onClick={onDownloadSample}
              className="px-2 py-0.5 rounded text-[10px] font-bold border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer">
              샘플Down
            </button>
          )}
          {onDownloadEmpty && (
            <button onClick={onDownloadEmpty}
              className="px-2 py-0.5 rounded text-[10px] font-bold border border-gray-300 text-gray-500 bg-white hover:bg-gray-50 cursor-pointer">
              빈 양식
            </button>
          )}
        </div>
      </div>}

      {!collapsed && <div className={`p-3 ${isFullscreen ? 'bg-white flex-1 overflow-auto' : 'bg-white/70'}`}>
        <div className={`flex gap-3 ${isFullscreen ? 'h-full' : ''}`}>
          {/* ── 좌측: 설정/컨트롤 (전체화면에서는 숨김) ── */}
          {!isFullscreen && <div className="w-[35%] shrink-0 flex flex-col">
        {/* ─── 데이터 현황 ─── */}
        <DataStatusBar flatData={flatData} showApplied={templateMode !== 'download' && flatData.length > 0} bdFmeaId={bdFmeaId} bdFmeaName={bdFmeaName} />

        {/* ─── BD 현황 (Part/Master/Family) ─── */}
        {bdStatusList && bdStatusList.length > 0 && (
          <div className="mb-2">
            <table className="w-full border-collapse text-[9px]">
              <thead>
                <tr>
                  <th className="border border-gray-200 px-1 py-0.5 bg-gray-50 text-gray-500 font-semibold text-center w-[50px]">구분</th>
                  <th className="border border-gray-200 px-1 py-0.5 bg-gray-50 text-gray-500 font-semibold text-center w-[65px]">BD ID</th>
                  <th className="border border-gray-200 px-1 py-0.5 bg-gray-50 text-gray-500 font-semibold">FMEA</th>
                  <th className="border border-gray-200 px-1 py-0.5 bg-gray-50 text-gray-500 font-semibold text-center w-[34px]">상태</th>
                  <th className="border border-gray-200 px-1 py-0.5 bg-gray-50 text-gray-500 font-semibold text-center w-[55px]">데이터</th>
                </tr>
              </thead>
              <tbody>
                {(['P', 'M', 'F'] as const).map(type => {
                  const selectedFmea = fmeaList?.find(f => f.id === selectedFmeaId);
                  const selectedType = selectedFmea?.fmeaType || 'P';
                  const info = selectedType === type && selectedFmeaId
                    ? bdStatusList.find(b => b.fmeaId === selectedFmeaId)
                    : selectedType === 'P' && selectedFmea?.parentFmeaId
                      ? bdStatusList.find(b => {
                          const parent = fmeaList?.find(f => f.id === selectedFmea?.parentFmeaId);
                          return parent?.fmeaType === type && b.fmeaId === parent.id;
                        })
                      : undefined;
                  const c = BD_TYPE_COLORS[type] || BD_TYPE_COLORS.P;
                  const label = type === 'M' ? 'Master' : type === 'F' ? 'Family' : 'Part';
                  const hasData = (info?.dataCount ?? 0) > 0;
                  return (
                    <tr key={type} className={selectedType === type ? 'bg-blue-50/30' : ''}>
                      <td className="border border-gray-200 px-1 py-0.5 text-center">
                        <span className={`text-[8px] font-bold px-1 py-0 rounded ${c.bg} ${c.text} ${c.border} border`}>{label}</span>
                      </td>
                      <td className="border border-gray-200 px-1 py-0.5 text-center font-mono font-bold text-indigo-600">
                        {info?.bdId || '-'}
                      </td>
                      <td className="border border-gray-200 px-1 py-0.5 truncate max-w-[120px]">
                        {info?.fmeaName || <span className="text-gray-400">{type} FMEA 미등록</span>}
                      </td>
                      <td className="border border-gray-200 px-1 py-0.5 text-center">
                        {hasData ? (
                          <span className="text-[8px] font-bold px-1 py-0 rounded bg-green-100 text-green-700 border border-green-300">연동</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="border border-gray-200 px-1 py-0.5 text-center">
                        {hasData ? (
                          <span className="text-gray-600">{info!.dataCount}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ★ 기존 데이터 탭 전용: 빈 데이터 안내 */}
        {templateMode === 'download' && flatData.length === 0 && (
          <div className="text-center py-3 text-[11px] text-gray-400">
            데이터 없음 — 엑셀 Import 또는 템플릿으로 생성
          </div>
        )}

        {/* ─── 수동 탭: 인라인 설정 UI ─── */}
        {templateMode === 'manual' && (
          <div className="mb-2">
            <ManualTemplateInline
              config={manualConfig}
              updateConfig={updateManualConfig}
              onGenerate={onGenerate}
              isSaving={isSaving}
              hasData={flatData.length > 0}
            />
          </div>
        )}

        {/* ─── 자동 탭: 인라인 작업요소 UI ─── */}
        {templateMode === 'auto' && (
          <div className="mb-2">
            <AutoTemplateInline
              workElements={workElements}
              multipliers={multipliers}
              addWorkElement={addWorkElement}
              removeWorkElement={removeWorkElement}
              updateWorkElement={updateWorkElement}
              updateMultiplier={updateMultiplier}
              onGenerate={onGenerate}
              isSaving={isSaving}
              hasData={flatData.length > 0}
              selectedFmeaId={selectedFmeaId}
            />
          </div>
        )}

        {/* ─── 전처리 탭: 파일 업로드 UI ─── */}
        {templateMode === 'preprocess' && (
          <div className="mb-2">
            <StepBPreprocessSection selectedFmeaId={selectedFmeaId} onSaved={() => {
              props.setTemplateMode('download');
              props.onPreprocessSaved?.();
            }} />
          </div>
        )}
          </div>}

          {/* ── 우측: 미리보기 ── */}
          <TemplatePreviewContent
            templateMode={templateMode}
            isFullscreen={isFullscreen}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            editDisabled={editDisabled}
            templateGenerated={templateGenerated}
            setTemplateGenerated={setTemplateGenerated}
            previewLevel={previewLevel}
            setPreviewLevel={setPreviewLevel}
            selectedRows={selectedRows}
            setSelectedRows={(v: Set<number>) => setSelectedRows(v)}
            tableMaxH={tableMaxH}
            flatData={flatData}
            generatedData={generatedData}
            crossTab={crossTab}
            failureChains={failureChains}
            missingStats={missingStats}
            missingDetails={missingDetails}
            stepState={stepState}
            setActiveStep={setActiveStep}
            canSA={canSA}
            canFC={canFC}
            canFA={canFA}
            confirmSA={confirmSA}
            confirmFC={confirmFC}
            confirmFA={confirmFA}
            quickCreateWorksheet={quickCreateWorksheet}
            resetToSA={resetToSA}
            resetToFC={resetToFC}
            fcComparison={fcComparison}
            isAnalysisImporting={isAnalysisImporting}
            isAnalysisComplete={isAnalysisComplete}
            onGenerate={onGenerate}
            onUpdateItem={onUpdateItem}
            onUpdateM4={onUpdateM4}
            onDeleteItems={onDeleteItems}
            onAddItems={onAddItems}
            onImportFile={onImportFile}
            onSave={onSave}
            isSaved={isSaved}
            isSaving={isSaving}
            dirty={dirty}
            onDownloadSample={onDownloadSample}
            onDownloadEmpty={onDownloadEmpty}
            toggleRow={toggleRow}
            toggleAll={toggleAll}
            handleDeleteSelected={handleDeleteSelected}
            handleAddFromSelected={handleAddFromSelected}
            handleAddL2Row={handleAddL2Row}
            handleAddL3Row={handleAddL3Row}
            handleAddL1Row={handleAddL1Row}
            addPNo={addPNo}
            setAddPNo={setAddPNo}
            addM4={addM4}
            setAddM4={setAddM4}
            addCat={addCat}
            setAddCat={setAddCat}
            l1Name={l1Name}
            bdFmeaName={bdFmeaName}
            parseStatistics={parseStatistics}
            fmeaId={selectedFmeaId}
          />
        </div>
      </div>}
    </div>
  );
}

export default TemplateGeneratorPanel;
