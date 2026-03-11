// @ts-nocheck
/**
 * @file FailureLinkTables.tsx
 * @description 고장연결 탭 - FE/FM/FC 테이블 컴포넌트 (분할)
 */

'use client';

import React, { useRef, useCallback } from 'react';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../../constants';
import { panelStyle, panelHeaderStyle, thStyle, tdStyle, tdCenterStyle, flexContainerStyle, headerStyle, panelStyleWithFlex, scrollAreaStyle, tableFullStyle } from './FailureLinkStyles';

interface FEItem { id: string; scope: string; feNo: string; text: string; severity?: number; }
interface FMItem { id: string; fmNo: string; processName: string; text: string; }
interface FCItem { id: string; fcNo: string; processName: string; workElem: string; text: string; } // DFMEA: m4 제거됨

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
  fcLinkScope: 'current' | 'all';
  onSelectFM: (id: string) => void;
  onToggleFE: (id: string) => void;
  onToggleFC: (id: string) => void;
  onUnlinkFE: (id: string) => void;
  onUnlinkFC: (id: string) => void;  // 더블클릭 연결 해제
  onProcessChange: (process: string) => void;
  onFcScopeChange: (scope: 'current' | 'all') => void;
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
    fcLinkScope,
    onSelectFM,
    onToggleFE,
    onToggleFC,
    onUnlinkFE,
    onUnlinkFC,
    onProcessChange,
    onFcScopeChange,
  } = restProps;
  const filteredFmData = selectedProcess === 'all' ? fmData : fmData.filter(fm => fm.processName === selectedProcess);
  const filteredFcData = fcLinkScope === 'all' ? fcData : (selectedProcess === 'all' ? fcData : fcData.filter(fc => fc.processName === selectedProcess));

  // A'SSY 목록 추출 (DFMEA)
  const processNames = Array.from(new Set(fmData.map(fm => fm.processName)));
  
  return (
    <div className="bg-white flex flex-col min-w-0" style={flexContainerStyle('60', `2px solid #ccc`)}>
      <div className="flex justify-between items-center py-2 px-3" style={headerStyle('#fff3e0', `1px solid #ccc`, FONT_SIZES.pageHeader)}>
        <span className="font-semibold">P-FMEA 고장 분석(4단계) - 고장연결</span>
        
        {/* 공정 필터: 해당공정 드롭다운 + 모든공정 버튼 */}
        <div className="flex items-center gap-2">
          {/* 해당공정 드롭다운 */}
          <select
            value={selectedProcess !== 'all' ? selectedProcess : ''}
            onChange={(e) => onProcessChange(e.target.value || processNames[0])}
            className={`px-2 py-0.5 text-[11px] rounded border font-semibold transition-all ${
              selectedProcess !== 'all'
                ? 'bg-orange-500 text-white border-orange-400'
                : 'bg-white text-orange-600 border-orange-300'
            }`}
            title="해당 A'SSY의 고장형태만 표시"
          >
            <option value="" disabled>해당 A'SSY</option>
            {processNames.map((proc) => (
              <option key={proc} value={proc}>{proc}</option>
            ))}
          </select>
          
          {/* 모든 A'SSY 버튼 (DFMEA) */}
          <button
            onClick={() => onProcessChange('all')}
            className={`px-3 py-0.5 text-[11px] rounded border font-semibold transition-all ${
              selectedProcess === 'all'
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-white text-purple-600 border-purple-300 hover:bg-purple-50'
            }`}
            title="모든 A'SSY의 고장형태 표시"
          >
            모든 A'SSY
          </button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden gap-1 p-1">
        {/* FE 테이블 - 비율 5:3:5 중 5 */}
        <div style={panelStyleWithFlex('0 0 38%', COLORS.structure.dark)}>
          <div style={panelHeaderStyle(COLORS.structure.dark)}>
            FE(고장영향)
              <span className="ml-2" style={{ color: '#fff', fontWeight: 700 }}>연결:{linkStats.feLinkedCount}</span>
              <span className="ml-1" style={{ color: '#fff', fontWeight: 700 }}>누락:{Math.max(0, feData.length - linkStats.feLinkedCount)}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse" style={{ fontSize: '10px' }}>
              <thead>
                <tr>
                  <th style={thStyle('#e3f2fd', '12%')}>No</th>
                  <th style={thStyle('#e3f2fd', '12%')}>구분</th>
                  <th style={thStyle('#e3f2fd')}>고장영향(FE)</th>
                  <th style={thStyle('#e3f2fd', '12%')}>S</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // ★ scope별 그룹 인덱스 계산 (YP/SP/USER별 줄무늬)
                  const scopeColorMap: Record<string, { light: string; dark: string }> = {
                    'YP': { light: '#e3f2fd', dark: '#bbdefb' },   // 파란색 (Your Plant)
                    'SP': { light: '#f3e5f5', dark: '#e1bee7' },   // 보라색 (Ship to Plant)
                    'USER': { light: '#e8f5e9', dark: '#c8e6c9' }, // 녹색 (User)
                  };
                  let scopeIdx = 0;
                  let prevScope = '';
                  
                  return feData.map((fe, idx) => {
                    // scope 변경 시 인덱스 리셋
                    if (fe.scope !== prevScope) {
                      scopeIdx = 0;
                      prevScope = fe.scope;
                    }
                    const scopeColors = scopeColorMap[fe.scope] || scopeColorMap['YP'];
                    const stripeBg = scopeIdx % 2 === 0 ? scopeColors.dark : scopeColors.light;
                    scopeIdx++;
                    
                    // ✅ ID만 사용 (텍스트 매칭 완전 제거)
                    const isLinkedInSaved = linkStats.feLinkedIds.has(fe.id);
                    const isLinkedToCurrentFM = linkedFEIds.has(fe.id);
                    // ★ 현재 FM에 연결된 FE: 하늘색 강조 (줄무늬와 명확 구분)
                    const noBg = isLinkedToCurrentFM ? '#1976d2' : (isLinkedInSaved ? COLORS.function.dark : '#f57c00');
                    const cellBg = isLinkedToCurrentFM ? '#bbdefb' : (isLinkedInSaved ? '#c8e6c9' : stripeBg);
                    const severityColor = fe.severity && fe.severity >= 8 ? '#f57c00' : fe.severity && fe.severity >= 5 ? '#f57f17' : COLORS.structure.text;
                    return (
                      <tr
                        key={fe.id}
                        onClick={() => handleClick(fe.id, onToggleFE)}
                        onDoubleClick={() => handleDoubleClick(fe.id, onUnlinkFE)}
                        className={currentFMId ? 'cursor-pointer' : ''}
                        title="클릭: 연결 / 더블클릭: 연결 해제"
                        style={isLinkedToCurrentFM ? { boxShadow: 'inset 0 0 0 3px #1976d2' } : undefined}
                      >
                        <td style={tdCenterStyle(noBg, BORDER_BLUE, '#fff')}>{fe.feNo}</td>
                        <td style={tdCenterStyle(cellBg, BORDER_BLUE, COLORS.structure.text, { fontSize: '9px' })}>{fe.scope}</td>
                        <td style={tdStyle(cellBg, BORDER_BLUE, { color: COLORS.structure.text })}>
                          {isLinkedInSaved && <span className="mr-1 text-green-700 font-bold">●</span>}
                          {fe.text}
                          {isLinkedToCurrentFM && <span className="ml-1 text-blue-700 font-bold">▶</span>}
                        </td>
                        <td style={tdCenterStyle(cellBg, BORDER_BLUE, severityColor)}>{fe.severity || '-'}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* FM 테이블 - 비율 5:3:5 중 3 */}
        <div style={panelStyleWithFlex('0 0 24%', COLORS.failure.dark)}>
          <div style={panelHeaderStyle(COLORS.failure.dark)}>
            FM(고장형태)
              <span className="ml-2" style={{ color: '#fff', fontWeight: 700 }}>연결:{linkStats.fmLinkedCount}</span>
              <span className="ml-1" style={{ color: '#fff', fontWeight: 700 }}>누락:{Math.max(0, fmData.length - linkStats.fmLinkedCount)}</span>
          </div>
          <div style={scrollAreaStyle}>
            <table style={{ ...tableFullStyle(FONT_SIZES.cell), fontSize: '10px' }}>
              <thead>
                <tr>
                  <th style={thStyle('#fff3e0', '15%')}>No</th>
                  <th style={thStyle('#fff3e0', '30%', { whiteSpace: 'nowrap' })}>A'SSY명</th>
                  <th style={thStyle('#fff3e0')}>고장형태(FM)</th>
                </tr>
              </thead>
              <tbody>
                {filteredFmData.map((fm, idx) => {
                  const isSelected = currentFMId === fm.id;
                  const counts = linkStats.fmLinkCounts.get(fm.id) || { feCount: 0, fcCount: 0 };
                  const isLinked = counts.feCount > 0 && counts.fcCount > 0;
                  const isMissing = (counts.feCount === 0 || counts.fcCount === 0) && linkStats.fmLinkedIds.has(fm.id);
                  const noBg = isLinked ? COLORS.function.dark : (isMissing ? '#f44336' : '#f57c00');
                  // ★ 선택된 FM: 하늘색 배경으로 주황색 줄무늬와 명확하게 구분
                  const cellBg = isSelected ? '#bbdefb' : (idx % 2 === 1 ? '#ffe0b2' : '#fff3e0');
                  
                  // 체크표시: 현재 선택된 FM만 파란색 체크표시, 확정된 FM은 녹색 텍스트만
                  let checkMark: React.ReactNode = '';
                  if (isSelected && !isLinked) {
                    checkMark = <span className="text-blue-600 font-bold mr-1">▶</span>; // 현재 선택됨 - 파란색 화살표
                  }
                  
                  let statusIcon = '';
                  // FE:N, FC:N 표시 제거 - 누락 경고만 유지
                  if (!isLinked && (counts.feCount > 0 || counts.fcCount > 0)) {
                    const missing = [];
                    if (counts.feCount === 0) missing.push('FE');
                    if (counts.fcCount === 0) missing.push('FC');
                    statusIcon = ` ⚠️ ${missing.join('/')} 누락`;
                  }
                  
                  // 텍스트 색상: 확정된 FM은 녹색, 그 외는 기본 색상
                  const textColor = isLinked ? '#2e7d32' : (isMissing ? '#d32f2f' : COLORS.failure.text);
                  
                  // ★ 선택된 FM: 두꺼운 테두리로 강조
                  const rowStyle: React.CSSProperties = isSelected ? {
                    outline: '3px solid #1976d2',
                    outlineOffset: '-1px',
                    boxShadow: '0 0 8px rgba(25, 118, 210, 0.5)',
                  } : {};
                  
                  return (
                    <tr key={fm.id} onClick={() => onSelectFM(fm.id)} className="cursor-pointer" style={rowStyle}>
                      <td style={tdCenterStyle(isSelected ? '#1976d2' : noBg, BORDER_ORANGE, '#fff')}>{fm.fmNo}</td>
                      <td style={tdCenterStyle(cellBg, BORDER_ORANGE, COLORS.failure.text, { fontSize: FONT_SIZES.small, whiteSpace: 'nowrap', padding: '4px 6px' })}>{fm.processName}</td>
                      <td style={tdStyle(cellBg, BORDER_ORANGE, { 
                        color: textColor, 
                        fontWeight: isSelected ? FONT_WEIGHTS.bold : (isMissing ? FONT_WEIGHTS.bold : FONT_WEIGHTS.normal), 
                        padding: '4px 6px' 
                      })}>
                        {isLinked && <span className="mr-1 text-green-700 font-bold">●</span>}
                        {checkMark}
                        {fm.text}
                        <span className={`text-[11px] ${isLinked ? 'text-green-700' : 'text-orange-600'}`}>{statusIcon}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FC 테이블 - 비율 5:3:5 중 5 */}
        <div style={panelStyleWithFlex('0 0 38%', COLORS.function.dark)}>
          <div className="flex justify-between items-center" style={panelHeaderStyle(COLORS.function.dark)}>
            <span className="flex-1 text-center">
              FC(고장원인)
              <span className="ml-2" style={{ color: '#fff', fontWeight: 700 }}>연결:{linkStats.fcLinkedCount}</span>
              <span className="ml-1" style={{ color: '#fff', fontWeight: 700 }}>누락:{Math.max(0, fcData.length - linkStats.fcLinkedCount)}</span>
            </span>
            <select
              value={fcLinkScope}
              onChange={(e) => onFcScopeChange(e.target.value as 'current' | 'all')}
              className="px-1 py-0.5 text-xs rounded border border-green-700 bg-green-50 font-semibold text-green-800"
            >
              <option value="current">해당 A'SSY</option>
              <option value="all">모든 A'SSY</option>
            </select>
          </div>
          <div style={scrollAreaStyle}>
            <table style={{ ...tableFullStyle(FONT_SIZES.cell), fontSize: '10px' }}>
              <thead>
                <tr>
                  <th style={thStyle('#e8f5e9', '6%', { fontWeight: 'normal', fontSize: '10px' })}>No</th>
                  <th style={thStyle('#e8f5e9', '14%', { whiteSpace: 'nowrap', fontWeight: 'normal', fontSize: '10px' })}>A'SSY명</th>
                  <th style={thStyle('#e8f5e9', '22%', { whiteSpace: 'nowrap', fontWeight: 'normal', fontSize: '10px' })}>부품 또는 특성</th>
                  <th style={thStyle('#e8f5e9', undefined, { fontWeight: 'normal', fontSize: '10px' })}>고장원인(FC)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // ★ A'SSY별 그룹 인덱스 계산 (A'SSY명별 줄무늬) (DFMEA)
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
                    // A'SSY 변경 시 색상 할당 및 인덱스 리셋 (DFMEA)
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
                    
                    // ✅ ID만 사용 (텍스트 매칭 완전 제거)
                    const isLinkedInSaved = linkStats.fcLinkedIds.has(fc.id);
                    const isLinkedToCurrentFM = linkedFCIds.has(fc.id);
                    // ★ 현재 FM에 연결된 FC: 하늘색 강조 (줄무늬와 명확 구분)
                    const noBg = isLinkedToCurrentFM ? '#1976d2' : (isLinkedInSaved ? COLORS.function.dark : '#f57c00');
                    const cellBg = isLinkedToCurrentFM ? '#bbdefb' : (isLinkedInSaved ? '#c8e6c9' : stripeBg);
                    return (
                      <tr key={fc.id} style={isLinkedToCurrentFM ? { boxShadow: 'inset 0 0 0 3px #1976d2' } : undefined}>
                        {/* NO열 클릭 → 연결 해제 */}
                        <td 
                          style={{...tdCenterStyle(noBg, BORDER_GREEN, '#fff'), cursor: 'pointer', fontSize: '10px', fontWeight: 'normal'}}
                          onClick={() => onUnlinkFC(fc.id)}
                          title="클릭: 연결 해제"
                        >
                          {fc.fcNo}
                        </td>
                        <td style={tdCenterStyle(cellBg, BORDER_GREEN, COLORS.function.text, { fontSize: '10px', whiteSpace: 'nowrap', fontWeight: 'normal' })}>{fc.processName}</td>
                        <td style={tdStyle(cellBg, BORDER_GREEN, { 
                          fontSize: '10px', 
                          color: COLORS.function.text, 
                          fontWeight: 'normal',
                          maxWidth: '120px',
                          wordBreak: 'keep-all',
                          overflowWrap: 'break-word',
                          lineHeight: '1.2'
                        })}>{fc.workElem}</td>
                        {/* 고장원인열 클릭 → 연결 추가 */}
                        <td 
                          style={{...tdStyle(cellBg, BORDER_GREEN, { color: COLORS.function.text, fontSize: '10px', fontWeight: 'normal' }), cursor: 'pointer'}}
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

