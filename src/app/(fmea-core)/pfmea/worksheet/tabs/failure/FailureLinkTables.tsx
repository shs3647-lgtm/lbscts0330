/**
 * @file FailureLinkTables.tsx
 * @description 고장연결 탭 - FE/FM/FC 테이블 컴포넌트 (분할)
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

import React, { useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { getFmeaLabels } from '@/lib/fmea-labels';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../../constants';
import { panelStyle, panelHeaderStyle, thStyle, tdStyle, tdCenterStyle, flexContainerStyle, headerStyle, panelStyleWithFlex, scrollAreaStyle, tableFullStyle } from './FailureLinkStyles';
import { FEItem, FMItem, FCItem } from './FailureLinkTypes';

interface FailureLinkTablesProps {
  feData: FEItem[];
  fmData: FMItem[];
  fcData: FCItem[];
  currentFMId: string | null;
  linkedFEIds: Set<string>;  // 현재 FM에 연결된 FE IDs
  linkedFCIds: Set<string>;  // 현재 FM에 연결된 FC IDs
  linkStats: {
    feLinkedIds: Set<string>;
    feLinkedTexts: Set<string>;
    fcLinkedIds: Set<string>;
    fcLinkedTexts: Set<string>;
    fmLinkedIds: Set<string>;
    fmLinkCounts: Map<string, { feCount: number; fcCount: number }>;
    feLinkedCount: number;
    feMissingCount: number;
    fmLinkedCount: number;
    fmMissingCount: number;
    fcLinkedCount: number;
    fcMissingCount: number;
  };
  selectedProcess: string;
  feFcFilter: string;  // 'all' or processName - FE/FC 공정 필터
  // ✅ 고아(삭제됨) ID Sets
  orphanFmIds?: Set<string>;
  orphanFeIds?: Set<string>;
  orphanFcIds?: Set<string>;
  onSelectFM: (id: string) => void;
  onToggleFE: (id: string) => void;
  onToggleFC: (id: string) => void;
  onUnlinkFE: (id: string) => void;
  onUnlinkFC: (id: string) => void;  // 더블클릭 연결 해제
  onDeleteOrphanFM?: (fmId: string, fmText: string) => void;  // 고아 FM 개별 삭제
  onRestoreOrphanFM?: (fmId: string, fmText: string, fmProcess: string) => void;  // 고아 FM 복구
  onProcessChange: (process: string) => void;
  onFeFcFilterChange: (filter: string) => void;
}

const BORDER_BLUE = '1px solid #90caf9';
const BORDER_ORANGE = '1px solid #ffcc80';
const BORDER_GREEN = '1px solid #a5d6a7';

export default function FailureLinkTables({
  feData,
  fmData,
  fcData,
  // 클릭 타이머 관리 (더블클릭과 싱글클릭 구분)
  ...restProps
}: FailureLinkTablesProps) {
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  const lb = getFmeaLabels(isDfmea);
  const clickTimerRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 싱글클릭 핸들러 (200ms 딜레이) - FE/FC 공용
  const handleClick = useCallback((id: string, onToggle: (id: string) => void) => {
    // 기존 타이머가 있으면 취소
    const existingTimer = clickTimerRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 200ms 후에 싱글클릭으로 처리
    const timer = setTimeout(() => {
      onToggle(id);
      clickTimerRef.current.delete(id);
    }, 200);

    clickTimerRef.current.set(id, timer);
  }, []);

  // 더블클릭 핸들러 (타이머 취소 후 즉시 해제) - FE/FC 공용
  const handleDoubleClick = useCallback((id: string, onUnlink: (id: string) => void) => {
    // 싱글클릭 타이머 취소
    const existingTimer = clickTimerRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      clickTimerRef.current.delete(id);
    }

    // 즉시 연결 해제
    onUnlink(id);
  }, []);

  const {
    currentFMId,
    linkedFEIds,
    linkedFCIds,
    linkStats,
    selectedProcess,
    feFcFilter,
    orphanFmIds = new Set<string>(),
    orphanFeIds = new Set<string>(),
    orphanFcIds = new Set<string>(),
    onSelectFM,
    onToggleFE,
    onToggleFC,
    onUnlinkFE,
    onUnlinkFC,
    onDeleteOrphanFM,  // 고아 FM 개별 삭제 핸들러
    onRestoreOrphanFM, // 고아 FM 복구 핸들러
    onProcessChange,
    onFeFcFilterChange,
  } = restProps;
  // ★ FM: 항상 모든 공정 표시 (필터링 없음)
  // FC: feFcFilter로 필터링 (FE는 항상 전체 표시 - 갯수 적음)
  const filteredFcData = feFcFilter === 'all' ? fcData : fcData.filter(fc => fc.processName === feFcFilter);

  // 공정 목록 추출 (FM/FC 각각)
  const fmProcessNames = Array.from(new Set(fmData.map(fm => fm.processName).filter(n => !n.startsWith('삭제'))));
  const fcProcessNames = Array.from(new Set(fcData.map(fc => fc.processName)));

  return (
    <div className="bg-white flex flex-col min-w-0" style={{ ...flexContainerStyle('1 1 60%', `2px solid #ccc`), minWidth: 0, overflow: 'hidden' }}>
      <div className="flex items-center justify-between py-0.5 px-2" style={headerStyle('#fff3e0', `1px solid #ccc`, 'clamp(10px, 1vw, 12px)')}>
        <span className="font-semibold whitespace-nowrap">고장연결(Failure Link)</span>
        <span className="text-[8px] text-gray-500 whitespace-nowrap ml-1">FE=고장영향 FM=고장형태 FC=고장원인 S=심각도 Cat=구분 {lb.structureWeCol}={isDfmea ? '부품(컴포넌트)' : '작업요소'} FA=고장분석</span>

        <div className="flex items-center gap-2">
        {/* 1st: FM 공정 이동 */}
        <div className="flex items-center gap-0.5">
          <span className="text-[9px] font-bold text-orange-700 whitespace-nowrap">FM:</span>
          <select
            value={selectedProcess !== 'all' ? selectedProcess : ''}
            onChange={(e) => onProcessChange(e.target.value || fmProcessNames[0])}
            className={`px-1 py-0 text-[10px] rounded border font-semibold ${selectedProcess !== 'all'
              ? 'bg-orange-500 text-white border-orange-400'
              : 'bg-white text-orange-600 border-orange-300'
            }`}
            title="해당 공정 FM으로 이동"
          >
            <option value="" disabled>공정</option>
            {fmProcessNames.map((proc) => (
              <option key={proc} value={proc}>{proc}</option>
            ))}
          </select>
          <button
            onClick={() => onProcessChange('all')}
            className={`px-1 py-0 text-[10px] rounded border font-semibold ${selectedProcess === 'all'
              ? 'bg-purple-600 text-white border-purple-500'
              : 'bg-white text-purple-600 border-purple-300'
            }`}
            title="모든 FM"
          >
            ALL
          </button>
        </div>

        {/* 구분선 */}
        <div className="w-px h-4 bg-gray-400" />

        {/* 2nd: FE/FC 공정 필터 */}
        <div className="flex items-center gap-0.5">
          <span className="text-[9px] font-bold text-green-700 whitespace-nowrap">FC:</span>
          <select
            value={feFcFilter !== 'all' ? feFcFilter : ''}
            onChange={(e) => onFeFcFilterChange(e.target.value || fcProcessNames[0])}
            className={`px-1 py-0 text-[10px] rounded border font-semibold ${feFcFilter !== 'all'
              ? 'bg-green-600 text-white border-green-500'
              : 'bg-white text-green-600 border-green-300'
            }`}
            title="해당 공정 FC 필터"
          >
            <option value="" disabled>공정</option>
            {fcProcessNames.map((proc) => (
              <option key={proc} value={proc}>{proc}</option>
            ))}
          </select>
          <button
            onClick={() => onFeFcFilterChange('all')}
            className={`px-1 py-0 text-[10px] rounded border font-semibold ${feFcFilter === 'all'
              ? 'bg-purple-600 text-white border-purple-500'
              : 'bg-white text-purple-600 border-purple-300'
            }`}
            title="모든 FC"
          >
            ALL
          </button>
        </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-0.5 p-0.5">
        {/* FE 테이블 - 반응형 비율 */}
        <div style={{ ...panelStyleWithFlex('1 1 35%', '#ddd'), minWidth: 0 }}>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={thStyle('#e3f2fd', '8%')}>No</th>
                  <th style={thStyle('#e3f2fd', '8%')} title="Category: YP/SP/USER">구분(Cat)</th>
                  <th style={thStyle('#e3f2fd')} title="Failure Effect">고장영향(FE)</th>
                  <th style={thStyle('#e3f2fd', '6%')} title="Severity">S</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // ★ scope별 그룹 인덱스 계산 — DFMEA에 PFMEA 명칭(YP/SP/USER) 절대 주입 금지
                  const scopeColorMap: Record<string, { light: string; dark: string }> = {
                    'YP':   { light: '#e3f2fd', dark: '#bbdefb' },
                    'SP':   { light: '#fff3e0', dark: '#ffe0b2' },
                    'USER': { light: '#f3e5f5', dark: '#e1bee7' },
                    '법규': { light: '#e8eaf6', dark: '#c5cae9' },
                    '기본': { light: '#e3f2fd', dark: '#bbdefb' },
                    '보조': { light: '#fff3e0', dark: '#ffe0b2' },
                    '관능': { light: '#f3e5f5', dark: '#e1bee7' },
                  };
                  let scopeIdx = 0;
                  let prevScope = '';

                  return feData.map((fe, idx) => {
                    // scope 변경 시 인덱스 리셋
                    if (fe.scope !== prevScope) {
                      scopeIdx = 0;
                      prevScope = fe.scope;
                    }
                    const scopeColors = scopeColorMap[fe.scope] || scopeColorMap[isDfmea ? '법규' : 'YP'];
                    const stripeBg = scopeIdx % 2 === 0 ? scopeColors.dark : scopeColors.light;
                    scopeIdx++;

                    // ★ 고아 FE 감지
                    const isOrphanFe = orphanFeIds.has(fe.id);

                    // ✅ ID만 사용 (텍스트 매칭 완전 제거)
                    const isLinkedInSaved = linkStats.feLinkedIds.has(fe.id);
                    const isLinkedToCurrentFM = linkedFEIds.has(fe.id);
                    // ★ 현재 FM에 연결된 FE: 하늘색 강조 (줄무늬와 명확 구분), 고아는 빨간색
                    const noBg = isOrphanFe ? '#ef5350' : (isLinkedToCurrentFM ? '#1976d2' : (isLinkedInSaved ? COLORS.function.dark : '#f57c00'));
                    const cellBg = isOrphanFe ? '#ffebee' : (isLinkedToCurrentFM ? '#bbdefb' : (isLinkedInSaved ? '#c8e6c9' : stripeBg));
                    const severityColor = fe.severity && fe.severity >= 8 ? '#f57c00' : fe.severity && fe.severity >= 5 ? '#f57f17' : COLORS.structure.text;

                    // ★ 고아 FE: 점선 테두리
                    const rowStyle: React.CSSProperties = isOrphanFe ? {
                      outline: '2px dashed #ef5350',
                      outlineOffset: '-1px',
                    } : (isLinkedToCurrentFM ? { boxShadow: 'inset 0 0 0 3px #1976d2' } : {});

                    return (
                      <tr
                        key={fe.id}
                        data-fe-id={fe.id}
                        onClick={() => handleClick(fe.id, onToggleFE)}
                        onDoubleClick={() => handleDoubleClick(fe.id, onUnlinkFE)}
                        className={currentFMId ? 'cursor-pointer' : ''}
                        title={isOrphanFe ? '🗑️ 삭제됨 (더블클릭: 연결 해제)' : '클릭: 연결 / 더블클릭: 연결 해제'}
                        style={rowStyle}
                      >
                        <td style={tdCenterStyle(noBg, BORDER_BLUE, '#fff', { fontSize: 'clamp(7px, 0.7vw, 9px)' })}>
                          {isOrphanFe ? '🗑️' : fe.feNo}
                        </td>
                        <td style={tdCenterStyle(cellBg, BORDER_BLUE, isOrphanFe ? '#c62828' : COLORS.structure.text, { fontSize: 'clamp(7px, 0.7vw, 9px)' })}>
                          {isOrphanFe ? '삭제됨' : fe.scope}
                        </td>
                        <td style={tdStyle(cellBg, BORDER_BLUE, { color: isOrphanFe ? '#c62828' : COLORS.structure.text, fontSize: 'clamp(8px, 0.8vw, 10px)', lineHeight: 1.15 })}>
                          {isOrphanFe && <span className="mr-1 text-red-600 font-bold">🗑️</span>}
                          {isLinkedInSaved && !isOrphanFe && <span className="mr-1 text-green-700 font-bold">●</span>}
                          {fe.text}
                          {isLinkedToCurrentFM && <span className="ml-1 text-blue-700 font-bold">▶</span>}
                        </td>
                        <td style={tdCenterStyle(cellBg, BORDER_BLUE, isOrphanFe ? '#c62828' : severityColor, { fontSize: 'clamp(7px, 0.7vw, 9px)' })}>
                          {isOrphanFe ? '-' : (fe.severity || '-')}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* FM 테이블 - 반응형 비율 */}
        <div style={{ ...panelStyleWithFlex('1 1 30%', '#ddd'), minWidth: 0 }}>
          <div style={scrollAreaStyle}>
            <table style={tableFullStyle(FONT_SIZES.cell)}>
              <thead>
                <tr>
                  <th style={thStyle('#fff3e0', '20%')}>No</th>
                  <th style={thStyle('#fff3e0')} title="Failure Mode">고장형태(FM)</th>
                </tr>
              </thead>
              <tbody>
                {fmData.map((fm, idx) => {
                  const isSelected = currentFMId === fm.id;
                  const counts = linkStats.fmLinkCounts.get(fm.id) || { feCount: 0, fcCount: 0 };
                  const isLinked = counts.feCount > 0 && counts.fcCount > 0;
                  // ★v6.3: FC import 기준 — savedLinks에 참조된 FM만 누락 판정
                  const hasAnySavedLinks = linkStats.fmLinkedCount > 0;
                  const isReferencedByFL = linkStats.fmLinkedIds.has(fm.id) ||
                    counts.feCount > 0 || counts.fcCount > 0;
                  const isMissing = isReferencedByFL && (counts.feCount === 0 || counts.fcCount === 0) &&
                    hasAnySavedLinks;

                  // ★ 고아 FM 감지: fmNo가 "🗑️"로 시작하면 고아
                  const isOrphanFm = fm.fmNo.startsWith('🗑️');
                  // 원래 fmNo 추출 (🗑️M3 → M3)
                  const displayFmNo = isOrphanFm ? fm.fmNo.replace('🗑️', '') : fm.fmNo;

                  // 고아 FM: 빨간색 배경
                  const noBg = isOrphanFm ? '#ef5350' : (isLinked ? COLORS.function.dark : (isMissing ? '#f44336' : '#f57c00'));
                  // ★ 선택된 FM: 하늘색 배경으로 주황색 줄무늬와 명확하게 구분, 고아는 빨간 배경
                  const cellBg = isSelected ? '#bbdefb' : (isOrphanFm ? '#ffebee' : (idx % 2 === 1 ? '#ffe0b2' : '#fff3e0'));

                  // 체크표시: 현재 선택된 FM만 파란색 체크표시, 확정된 FM은 녹색 텍스트만
                  let checkMark: React.ReactNode = '';
                  if (isSelected && !isLinked) {
                    checkMark = <span className="text-blue-600 font-bold mr-1">▶</span>; // 현재 선택됨 - 파란색 화살표
                  }

                  let statusIcon = '';
                  // ★ 누락 경고: 미연결 + 부분연결 모두 표시
                  if (!isLinked && !isOrphanFm && hasAnySavedLinks) {
                    if (counts.feCount === 0 && counts.fcCount === 0) {
                      statusIcon = ' ⚠️ 미연결';
                    } else {
                      const missing = [];
                      if (counts.feCount === 0) missing.push('FE');
                      if (counts.fcCount === 0) missing.push('FC');
                      statusIcon = ` ⚠️ ${missing.join('/')} 누락`;
                    }
                  }

                  // 텍스트 색상: 고아는 빨간색, 확정된 FM은 녹색, 그 외는 기본 색상
                  const textColor = isOrphanFm ? '#c62828' : (isLinked ? '#2e7d32' : (isMissing ? '#d32f2f' : COLORS.failure.text));

                  // ★ 선택된 FM: 두꺼운 테두리로 강조, 고아 FM: 점선 테두리
                  const rowStyle: React.CSSProperties = isSelected ? {
                    outline: '3px solid #1976d2',
                    outlineOffset: '-1px',
                    boxShadow: '0 0 8px rgba(25, 118, 210, 0.5)',
                  } : (isOrphanFm ? {
                    outline: '2px dashed #ef5350',
                    outlineOffset: '-1px',
                  } : {});

                  return (
                    <tr
                      key={fm.id}
                      data-fm-id={fm.id}
                      onClick={() => onSelectFM(fm.id)}
                      onDoubleClick={() => {
                        // 고아 FM인 경우에만 더블클릭으로 삭제
                        if (isOrphanFm && onDeleteOrphanFM) {
                          onDeleteOrphanFM(fm.id, fm.text);
                        }
                      }}
                      className="cursor-pointer"
                      style={rowStyle}
                      title={isOrphanFm ? '🗑️ 더블클릭하여 삭제' : '클릭하여 선택'}
                    >
                      <td style={tdCenterStyle(isSelected ? '#1976d2' : noBg, BORDER_ORANGE, '#fff', { whiteSpace: 'nowrap' })}>
                        {isOrphanFm ? `${displayFmNo}` : displayFmNo}
                      </td>
                      <td style={tdStyle(cellBg, BORDER_ORANGE, {
                        color: textColor,
                        fontWeight: isSelected ? FONT_WEIGHTS.bold : (isMissing || isOrphanFm ? FONT_WEIGHTS.bold : FONT_WEIGHTS.normal),
                      })}>
                        {isOrphanFm ? '🗑️' : isLinked ? <span className="mr-1 text-green-700 font-bold">●</span> : isMissing ? <span className="mr-1 text-red-600">⚠️</span> : null}
                        {checkMark}
                        {fm.text}
                        {isOrphanFm && (
                          <span className="ml-2 inline-flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onRestoreOrphanFM) onRestoreOrphanFM(fm.id, fm.text, fm.processName);
                              }}
                              className="px-1.5 py-0.5 text-[9px] bg-green-500 text-white rounded hover:bg-green-600"
                              title="복구: 고장형태 탭에 다시 추가"
                            >
                              복구
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeleteOrphanFM) onDeleteOrphanFM(fm.id, fm.text);
                              }}
                              className="px-1.5 py-0.5 text-[9px] bg-red-500 text-white rounded hover:bg-red-600"
                              title="삭제: 연결 데이터 완전 삭제"
                            >
                              삭제
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FC 테이블 - 반응형 비율 */}
        <div style={{ ...panelStyleWithFlex('1 1 35%', '#ddd'), minWidth: 0 }}>
          <div style={scrollAreaStyle}>
            <table style={{ ...tableFullStyle(FONT_SIZES.cell), tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{...thStyle('#e8f5e9'), width: 30, minWidth: 30, maxWidth: 30}}>No</th>
                  <th style={thStyle('#e8f5e9', '24%')} title="Process Name">{lb.l2Short}<br/>({lb.l2En})</th>
                  <th style={{...thStyle('#e8f5e9', isDfmea ? '14%' : '26px'), minWidth: isDfmea ? 52 : 26}} title={lb.structureWeColEn}>{lb.structureWeCol}</th>
                  <th style={thStyle('#e8f5e9')} title="Failure Cause">고장원인(FC)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // ★ 공정별 그룹 인덱스 계산 (공정명별 줄무늬)
                  const processColorPalette = [
                    { light: '#e8f5e9', dark: '#c8e6c9' },   // 녹색 1
                    { light: '#e3f2fd', dark: '#bbdefb' },   // 파란색
                    { light: '#fff3e0', dark: '#ffe0b2' },   // 주황색
                    { light: '#f3e5f5', dark: '#e1bee7' },   // 보라색
                    { light: '#e0f7fa', dark: '#b2ebf2' },   // 시안
                    { light: '#fce4ec', dark: '#f8bbd9' },   // 핑크
                  ];
                  const processColorMap = new Map<string, { light: string; dark: string }>();
                  let colorIdx = 0;
                  let processRowIdx = 0;
                  let prevProcess = '';

                  return filteredFcData.map((fc, idx) => {
                    // 공정 변경 시 색상 할당 및 인덱스 리셋
                    if (fc.processName !== prevProcess) {
                      if (!processColorMap.has(fc.processName)) {
                        processColorMap.set(fc.processName, processColorPalette[colorIdx % processColorPalette.length]);
                        colorIdx++;
                      }
                      processRowIdx = 0;
                      prevProcess = fc.processName;
                    }
                    const colors = processColorMap.get(fc.processName) || processColorPalette[0];
                    const stripeBg = processRowIdx % 2 === 0 ? colors.dark : colors.light;
                    processRowIdx++;

                    // ★ 고아 FC 감지
                    const isOrphanFc = orphanFcIds.has(fc.id);

                    // ✅ ID만 사용 (텍스트 매칭 완전 제거)
                    const isLinkedInSaved = linkStats.fcLinkedIds.has(fc.id);
                    const isLinkedToCurrentFM = linkedFCIds.has(fc.id);
                    // ★ 현재 FM에 연결된 FC: 하늘색 강조 (줄무늬와 명확 구분), 고아는 빨간색
                    const noBg = isOrphanFc ? '#ef5350' : (isLinkedToCurrentFM ? '#1976d2' : (isLinkedInSaved ? COLORS.function.dark : '#f57c00'));
                    const cellBg = isOrphanFc ? '#ffebee' : (isLinkedToCurrentFM ? '#bbdefb' : (isLinkedInSaved ? '#c8e6c9' : stripeBg));

                    // ★ 고아 FC: 점선 테두리
                    const rowStyle: React.CSSProperties = isOrphanFc ? {
                      outline: '2px dashed #ef5350',
                      outlineOffset: '-1px',
                    } : (isLinkedToCurrentFM ? { boxShadow: 'inset 0 0 0 3px #1976d2' } : {});

                    return (
                      <tr key={fc.id} data-fc-id={fc.id} style={rowStyle}>
                        {/* NO열 클릭 → 연결 해제 */}
                        <td
                          style={{ ...tdCenterStyle(noBg, BORDER_GREEN, '#fff'), cursor: 'pointer' }}
                          onClick={() => onUnlinkFC(fc.id)}
                          title={isOrphanFc ? '🗑️ 삭제됨 (클릭: 연결 해제)' : '클릭: 연결 해제'}
                        >
                          {isOrphanFc ? '🗑️' : fc.fcNo}
                        </td>
                        <td style={tdCenterStyle(cellBg, BORDER_GREEN, isOrphanFc ? '#c62828' : COLORS.function.text, {
                          fontSize: 'clamp(7px, 0.7vw, 9px)',
                          wordBreak: 'keep-all',
                          overflowWrap: 'anywhere',
                          lineHeight: 1.1,
                        })}>
                          {isOrphanFc ? '삭제됨' : (fc.processName || '').split(/(?=\()/).map((s, j) =>
                            j === 0 ? s : <React.Fragment key={j}><br/>{s}</React.Fragment>
                          )}
                        </td>
                        <td style={tdCenterStyle(cellBg, BORDER_GREEN, isOrphanFc ? '#c62828' : COLORS.function.text, {
                          fontSize: 'clamp(7px, 0.7vw, 9px)',
                        })}>
                          {isOrphanFc ? '🗑️' : fc.m4}
                        </td>
                        {/* 고장원인열 클릭 → 연결 추가 */}
                        <td
                          style={{ ...tdStyle(cellBg, BORDER_GREEN, { color: isOrphanFc ? '#c62828' : COLORS.function.text }), cursor: 'pointer' }}
                          onClick={() => handleClick(fc.id, onToggleFC)}
                          onDoubleClick={() => handleDoubleClick(fc.id, onUnlinkFC)}
                          title="클릭: 연결 추가 / 더블클릭: 연결 해제"
                        >
                          {isLinkedInSaved && <span className="mr-1 text-green-700">●</span>}
                          {fc.text}
                          {isLinkedToCurrentFM && <span className="ml-1 text-blue-700 font-bold">▶</span>}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

