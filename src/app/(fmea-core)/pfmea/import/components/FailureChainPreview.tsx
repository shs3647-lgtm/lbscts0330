/**
 * @file FailureChainPreview.tsx
 * @description FC(Failure Chain) 미리보기 — 엑셀 FC 시트 양식 동일 구조
 * @created 2026-02-21
 * @updated 2026-03-27 — v5: 엑셀 FC 시트 양식 일치화
 *
 * 컬럼 순서 (FC 시트 = Import 엑셀과 동일):
 *   FE구분 | FE(고장영향) | L2-1.공정번호 | FM(고장형태) | 4M | 작업요소(WE) | FC(고장원인)
 *
 * 병합 규칙 (FC 시트 forward-fill 기준):
 *   FE구분: key = feScope (1차 축)
 *   FE: key = feScope|feText (2차 축)
 *   공정번호: key = feScope|feText|processNo (3차 축)
 *   FM: key = feScope|feText|processNo|fmText (4차 축)
 *   4M, WE, FC: 행별 독립 (병합 없음)
 */

'use client';

import React, { useMemo } from 'react';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { normalizeScope } from '@/lib/fmea/scope-constants';

// ─── 색상 상수 (FC 시트 스타일) ───

const FE_BG = ['#f3e8ff', '#e9d5ff'];   // 보라 (FE구분, FE 영역)
const FM_BG = ['#fff7ed', '#ffedd5'];   // 주황 (공정번호, FM 영역)
const FC_BG = ['#ecfdf5', '#d1fae5'];   // 녹색 (4M, WE, FC 영역)

const HEADER_FE = '#6b21a8';
const HEADER_FM = '#9a3412';
const HEADER_FC = '#065f46';
const BORDER_FE = '#9333ea';
const BORDER_FM = '#c2410c';
const BORDER_FC = '#047857';

const COL_COUNT = 7;

// ─── Props ───

interface Props {
  chains: MasterFailureChain[];
  isFullscreen?: boolean;
  hideStats?: boolean;
}

// ─── 셀 스타일 헬퍼 ───

function cellStyle(bg: string, extra?: React.CSSProperties): React.CSSProperties {
  return {
    border: '0.5px solid #a78bfa',
    padding: '2px 4px',
    verticalAlign: 'middle',
    background: bg,
    fontSize: 10,
    ...extra,
  };
}

function cellCenterStyle(bg: string, extra?: React.CSSProperties): React.CSSProperties {
  return cellStyle(bg, { textAlign: 'center', whiteSpace: 'nowrap', ...extra });
}

const scopeAbbr = (scope: string): string => normalizeScope(scope);

// ─── flat row 타입 ───

interface FlatRow {
  fe: { scope: string; text: string };
  fm: { processNo: string; text: string };
  fc: { m4: string; workElement: string; text: string };
}

// ─── 연속 span 계산 ───

function calcSpans(len: number, keyFn: (i: number) => string): number[] {
  const spans = new Array<number>(len).fill(0);
  let i = 0;
  while (i < len) {
    const key = keyFn(i);
    let span = 1;
    while (i + span < len && keyFn(i + span) === key) span++;
    spans[i] = span;
    i += span;
  }
  return spans;
}

// ─── 컴포넌트 ───

export function FailureChainPreview({ chains, isFullscreen, hideStats }: Props) {
  const tableMaxH = isFullscreen ? 'max-h-[calc(100vh-180px)]' : 'max-h-[400px]';

  const renderRows = useMemo(() => {
    // FC 시트 순서: feScope → feText → processNo → fmText
    const sorted = [...chains].sort((a, b) => {
      const sCmp = (a.feScope || '').localeCompare(b.feScope || '');
      if (sCmp !== 0) return sCmp;
      const feCmp = (a.feValue || '').localeCompare(b.feValue || '');
      if (feCmp !== 0) return feCmp;
      const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
      if (pCmp !== 0) return pCmp;
      const fmCmp = (a.fmValue || '').localeCompare(b.fmValue || '');
      if (fmCmp !== 0) return fmCmp;
      return 0;
    });

    const flatRows: FlatRow[] = sorted.map(c => ({
      fe: { scope: c.feScope || '', text: c.feValue || '' },
      fm: { processNo: c.processNo || '', text: c.fmValue || '' },
      fc: { m4: c.m4 || '', workElement: c.workElement || '', text: c.fcValue || '' },
    }));

    const len = flatRows.length;

    const scopeSpans = calcSpans(len, i => flatRows[i].fe.scope);
    const feSpans = calcSpans(len, i =>
      `${flatRows[i].fe.scope}|${flatRows[i].fe.text}`);
    const processSpans = calcSpans(len, i =>
      `${flatRows[i].fe.scope}|${flatRows[i].fe.text}|${flatRows[i].fm.processNo}`);
    const fmSpans = calcSpans(len, i =>
      `${flatRows[i].fe.scope}|${flatRows[i].fe.text}|${flatRows[i].fm.processNo}|${flatRows[i].fm.text}`);

    return flatRows.map((row, idx) => ({
      ...row,
      scopeRowSpan: scopeSpans[idx],
      showScope: scopeSpans[idx] > 0,
      feRowSpan: feSpans[idx],
      showFe: feSpans[idx] > 0,
      processRowSpan: processSpans[idx],
      showProcess: processSpans[idx] > 0,
      fmRowSpan: fmSpans[idx],
      showFm: fmSpans[idx] > 0,
    }));
  }, [chains]);

  const stats = useMemo(() => {
    const uniqueFM = new Set(chains.map(c => `${c.processNo}|${c.fmValue}`).filter(Boolean)).size;
    const uniqueFC = new Set(chains.map(c => c.fcValue).filter(Boolean)).size;
    const uniqueFE = new Set(chains.map(c => `${c.feScope || ''}|${c.feValue}`).filter(Boolean)).size;
    const processes = new Set(chains.map(c => c.processNo).filter(Boolean)).size;
    return { total: chains.length, processes, uniqueFM, uniqueFC, uniqueFE };
  }, [chains]);

  if (chains.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-[11px] border border-dashed border-gray-300 rounded">
        고장사슬 데이터 없음 — 기초정보에 A5(고장형태), B4(고장원인), C4(고장영향) 데이터가 필요합니다
      </div>
    );
  }

  const thPad = isFullscreen ? 'px-2 py-1' : 'px-1 py-0.5';
  const fs = isFullscreen ? 13 : 10;

  const tableBody = (
    <table className="w-full border-collapse" style={{ fontSize: fs }}>
      <thead className="sticky top-0 z-10">
        <tr>
          <th className={`w-[5%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FE, color: '#fff', border: `1px solid ${BORDER_FE}` }}
            title="FE구분: YP/SP/USER">FE구분</th>
          <th className={`w-[18%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FE, color: '#fff', border: `1px solid ${BORDER_FE}` }}
            title="Failure Effect: 고장영향 (L1 C4)">FE(고장영향)</th>
          <th className={`w-[6%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FM, color: '#fff', border: `1px solid ${BORDER_FM}` }}
            title="L2 A1 공정번호">L2-1.공정번호</th>
          <th className={`w-[16%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FM, color: '#fff', border: `1px solid ${BORDER_FM}` }}
            title="Failure Mode: 고장형태 (L2 A5)">FM(고장형태)</th>
          <th className={`w-[4%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FC, color: '#fff', border: `1px solid ${BORDER_FC}` }}
            title="4M: MN/MC/MT/EN">4M</th>
          <th className={`w-[12%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FC, color: '#fff', border: `1px solid ${BORDER_FC}` }}
            title="Work Element: 작업요소 (L3 B1)">작업요소(WE)</th>
          <th className={`${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FC, color: '#fff', border: `1px solid ${BORDER_FC}` }}
            title="Failure Cause: 고장원인 (L3 B4)">FC(고장원인)</th>
        </tr>
      </thead>
      <tbody>
        {renderRows.length === 0 ? (
          <tr>
            <td colSpan={COL_COUNT} className="text-center p-10 text-gray-400">
              <div className="text-[28px] mb-2.5">📋</div>
              <div>고장사슬 데이터가 없습니다</div>
            </td>
          </tr>
        ) : renderRows.map((row, idx) => {
          const isOdd = idx % 2 === 1 ? 1 : 0;
          const feBg = FE_BG[isOdd];
          const fmBg = FM_BG[isOdd];
          const fcBg = FC_BG[isOdd];
          const isFmFirst = row.showFm;
          return (
            <tr key={`r-${idx}`}
              style={isFmFirst && idx > 0 ? { borderTop: '1.5px solid #c2410c' } : {}}>
              {row.showScope && (
                <td rowSpan={row.scopeRowSpan} style={cellCenterStyle(feBg, { fontWeight: 600 })}>
                  {scopeAbbr(row.fe.scope)}
                </td>
              )}
              {row.showFe && (
                <td rowSpan={row.feRowSpan} style={cellStyle(feBg)}>
                  {row.fe.text}
                </td>
              )}
              {row.showProcess && (
                <td rowSpan={row.processRowSpan} style={cellCenterStyle(fmBg, { fontWeight: 600 })}>
                  {row.fm.processNo}
                </td>
              )}
              {row.showFm && (
                <td rowSpan={row.fmRowSpan} style={cellStyle(fmBg)}>
                  {row.fm.text}
                </td>
              )}
              <td style={cellCenterStyle(fcBg, { fontSize: fs - 1 })}>
                {row.fc.m4}
              </td>
              <td style={cellCenterStyle(fcBg, { fontSize: fs - 1 })}>
                {row.fc.workElement}
              </td>
              <td style={cellStyle(fcBg)}>
                {row.fc.text}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div>
      {!hideStats && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded text-[11px]">
            <b className="text-purple-700">{stats.total}</b><span className="text-purple-500">체인</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded text-[11px]">
            <b className="text-orange-700">{stats.processes}</b><span className="text-orange-500">공정</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[11px]">
            <span className="text-gray-500">FM</span><b className="text-gray-700">{stats.uniqueFM}</b>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[11px]">
            <span className="text-gray-500">FC</span><b className="text-gray-700">{stats.uniqueFC}</b>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[11px]">
            <span className="text-gray-500">FE</span><b className="text-gray-700">{stats.uniqueFE}</b>
          </span>
        </div>
      )}

      <div className={`overflow-y-auto ${tableMaxH} border border-gray-200 rounded`}>
        {tableBody}
      </div>

      <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-600">
        <strong>연결 현황:</strong> FM {stats.uniqueFM}개 | FE {stats.uniqueFE}개 | FC {stats.uniqueFC}개 | 체인 {stats.total}행
      </div>
    </div>
  );
}

export default FailureChainPreview;
