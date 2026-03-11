/**
 * @file FailureLinkTables.tsx
 * @description 고장연결 탭 - FE/FM/FC 테이블 컴포넌트 (분할)
 */

'use client';

import React from 'react';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/app/dfmea/worksheet/constants';
import { panelStyle, panelHeaderStyle, thStyle, tdStyle, tdCenterStyle, flexContainerStyle, headerStyle, panelStyleWithFlex, scrollAreaStyle, tableFullStyle } from './FailureLinkStyles';

interface FEItem { id: string; scope: string; feNo: string; text: string; severity?: number; }
interface FMItem { id: string; fmNo: string; processName: string; text: string; }
interface FCItem { id: string; fcNo: string; processName: string; m4: string; workElem: string; text: string; }

interface FailureLinkTablesProps {
  feData: FEItem[];
  fmData: FMItem[];
  fcData: FCItem[];
  currentFMId: string | null;
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
  currentFMId,
  linkStats,
  selectedProcess,
  fcLinkScope,
  onSelectFM,
  onToggleFE,
  onToggleFC,
  onProcessChange,
  onFcScopeChange,
}: FailureLinkTablesProps) {
  const filteredFmData = selectedProcess === 'all' ? fmData : fmData.filter(fm => fm.processName === selectedProcess);
  const filteredFcData = fcLinkScope === 'all' ? fcData : (selectedProcess === 'all' ? fcData : fcData.filter(fc => fc.processName === selectedProcess));

  return (
    <div className="bg-white flex flex-col min-w-0" style={flexContainerStyle('60', `2px solid #ccc`)}>
      <div className="flex justify-center items-center py-2 px-3 relative" style={headerStyle('#fff3e0', `1px solid #ccc`, FONT_SIZES.pageHeader)}>
        <span className="font-semibold">D-FMEA 고장 분석(4단계) - 고장연결</span>
        <div className="absolute right-3 flex items-center gap-1.5">
          <select 
            value={selectedProcess} 
            onChange={(e) => {
              onProcessChange(e.target.value);
            }}
            className="px-2 py-0.5 text-xs rounded border border-yellow-500 bg-yellow-50 font-semibold text-orange-600"
          >
            <option value="all">모든공정</option>
            {Array.from(new Set(fmData.map(fm => fm.processName))).map(proc => (
              <option key={proc} value={proc}>{proc}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden gap-1 p-1">
        {/* FE 테이블 */}
        <div style={panelStyle(COLORS.structure.dark)}>
          <div style={panelHeaderStyle(COLORS.structure.dark)}>
            고장영향(FE) <span className="font-semibold text-green-200">연결:{linkStats.feLinkedCount}</span> <span className="font-semibold text-yellow-200">누락:{linkStats.feMissingCount}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th style={thStyle('#e3f2fd', '20%')}>No</th>
                  <th style={thStyle('#e3f2fd')}>고장영향(FE)</th>
                  <th style={thStyle('#e3f2fd', '15%')}>S</th>
                </tr>
              </thead>
              <tbody>
                {feData.map((fe, idx) => {
                  const isLinkedInSaved = linkStats.feLinkedIds.has(fe.id) || linkStats.feLinkedTexts.has(fe.text);
                  const noBg = isLinkedInSaved ? COLORS.structure.dark : '#f57c00';
                  const cellBg = isLinkedInSaved ? '#bbdefb' : (idx % 2 === 1 ? '#bbdefb' : '#e3f2fd');
                  const severityColor = fe.severity && fe.severity >= 8 ? '#f57c00' : fe.severity && fe.severity >= 5 ? '#f57f17' : COLORS.structure.text;
                  return (
                    <tr key={fe.id} onClick={() => onToggleFE(fe.id)} className={currentFMId ? 'cursor-pointer' : ''}>
                      <td style={tdCenterStyle(noBg, BORDER_BLUE, '#fff')}>{fe.feNo}</td>
                      <td style={tdStyle(cellBg, BORDER_BLUE, { color: COLORS.structure.text })}>{fe.text}{isLinkedInSaved ? ' ✓' : ''}</td>
                      <td style={tdCenterStyle(cellBg, BORDER_BLUE, severityColor)}>{fe.severity || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FM 테이블 */}
        <div style={panelStyleWithFlex('0 0 28%', COLORS.failure.dark)}>
          <div style={panelHeaderStyle(COLORS.failure.dark)}>
            FM({fmData.length}) <span className="font-semibold text-green-200">연결:{linkStats.fmLinkedCount}</span> <span className="font-semibold text-yellow-200">누락:{linkStats.fmMissingCount}</span>
          </div>
          <div style={scrollAreaStyle}>
            <table style={tableFullStyle(FONT_SIZES.cell)}>
              <thead>
                <tr>
                  <th style={thStyle('#fff3e0', '15%')}>No</th>
                  <th style={thStyle('#fff3e0', '30%', { whiteSpace: 'nowrap' })}>공정명</th>
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
                  const cellBg = isSelected ? '#fff8e1' : (idx % 2 === 1 ? '#ffe0b2' : '#fff3e0');
                  
                  let statusIcon = '';
                  if (isLinked) {
                    statusIcon = ` ✓ (FE:${counts.feCount} FC:${counts.fcCount})`;
                  } else if (counts.feCount > 0 || counts.fcCount > 0) {
                    const missing = [];
                    if (counts.feCount === 0) missing.push('FE');
                    if (counts.fcCount === 0) missing.push('FC');
                    statusIcon = ` ⚠️ ${missing.join('/')} 누락`;
                  }
                  
                  return (
                    <tr key={fm.id} onClick={() => onSelectFM(fm.id)} className="cursor-pointer">
                      <td style={tdCenterStyle(noBg, BORDER_ORANGE, '#fff')}>{fm.fmNo}</td>
                      <td style={tdCenterStyle(cellBg, BORDER_ORANGE, COLORS.failure.text, { fontSize: FONT_SIZES.small, whiteSpace: 'nowrap', padding: '4px 6px' })}>{fm.processName}</td>
                      <td style={tdStyle(cellBg, BORDER_ORANGE, { 
                        color: isMissing ? '#d32f2f' : COLORS.failure.text, 
                        fontWeight: isMissing ? FONT_WEIGHTS.bold : FONT_WEIGHTS.normal, 
                        padding: '4px 6px' 
                      })}>
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

        {/* FC 테이블 */}
        <div style={panelStyleWithFlex('1 1 47%', COLORS.function.dark)}>
          <div className="flex justify-between items-center" style={panelHeaderStyle(COLORS.function.dark)}>
            <span className="flex-1 text-center">
              고장원인(FC) <span className="font-semibold text-[#c8e6c9]">연결:{linkStats.fcLinkedCount}</span> <span className="font-semibold text-[#ffe082]">누락:{linkStats.fcMissingCount}</span>
            </span>
            <select
              value={fcLinkScope}
              onChange={(e) => onFcScopeChange(e.target.value as 'current' | 'all')}
              className="px-1 py-0.5 text-xs rounded border border-green-700 bg-green-50 font-semibold text-green-800"
            >
              <option value="current">해당공정</option>
              <option value="all">모든공정</option>
            </select>
          </div>
          <div style={scrollAreaStyle}>
            <table style={tableFullStyle(FONT_SIZES.cell)}>
              <thead>
                <tr>
                  <th style={thStyle('#e8f5e9', '8%')}>No</th>
                  <th style={thStyle('#e8f5e9', '14%', { whiteSpace: 'nowrap' })}>공정명</th>
                  <th style={thStyle('#e8f5e9', '8%')}>4M</th>
                  <th style={thStyle('#e8f5e9', '18%')}>컴포넌트</th>
                  <th style={thStyle('#e8f5e9')}>고장원인(FC)</th>
                </tr>
              </thead>
              <tbody>
                {filteredFcData.map((fc, idx) => {
                  const isLinkedInSaved = linkStats.fcLinkedIds.has(fc.id) || linkStats.fcLinkedTexts.has(fc.text);
                  const noBg = isLinkedInSaved ? COLORS.function.dark : '#f57c00';
                  const cellBg = isLinkedInSaved ? '#c8e6c9' : (idx % 2 === 1 ? '#c8e6c9' : '#e8f5e9');
                  return (
                    <tr key={fc.id} onClick={() => onToggleFC(fc.id)} className="cursor-pointer">
                      <td style={tdCenterStyle(noBg, BORDER_GREEN, '#fff')}>{fc.fcNo}</td>
                      <td style={tdCenterStyle(cellBg, BORDER_GREEN, COLORS.function.text, { fontSize: FONT_SIZES.small, whiteSpace: 'nowrap' })}>{fc.processName}</td>
                      <td style={tdCenterStyle(cellBg, BORDER_GREEN, COLORS.function.text)}>{fc.m4}</td>
                      <td style={tdStyle(cellBg, BORDER_GREEN, { fontSize: FONT_SIZES.small, color: COLORS.function.text })}>{fc.workElem}</td>
                      <td style={tdStyle(cellBg, BORDER_GREEN, { color: COLORS.function.text })}>{fc.text}{isLinkedInSaved ? ' ✓' : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

