/**
 * @file FailureChainPreview.tsx
 * @description FC(Failure Chain) 미리보기 — N:1:N 구조 (Process→FM→FE/FC)
 * @created 2026-02-21
 * @updated 2026-03-09 — N:1:N 구조 (Process-first, FM 중심축)
 *
 * N:1:N 병합 규칙 (FM = 중심축):
 *   Process 병합: key = processNo (1차 축)
 *   FM 병합: key = processNo|fmText (2차 축, Process 내 경계)
 *   Cat 병합: key = processNo|fmText|feScope (FM 내 경계)
 *   FE 병합: key = processNo|fmText|feScope|feText (FM 내 경계)
 *   4M, WE, FC: 행별 독립 (병합 없음)
 */

'use client';

import React, { useMemo } from 'react';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { normalizeScope } from '@/lib/fmea/scope-constants';

// ─── 색상 상수 ───

const FM_BG = ['#fff3e0', '#ffe0b2'];   // 주황 (Process, FM 영역)
const FE_BG = ['#e3f2fd', '#bbdefb'];   // 파란 (Cat, FE 영역)
const FC_BG = ['#e8f5e9', '#c8e6c9'];   // 녹색 (4M, WE, FC 영역)

const HEADER_FM = '#3a2a10';
const HEADER_FE = '#1a3050';
const HEADER_FC = '#1a3520';
const BORDER_FM = '#5a4a2a';
const BORDER_FE = '#2a4a6a';
const BORDER_FC = '#2a5530';

const COL_COUNT = 7; // Process, FM, Cat, FE, 4M, WE, FC

// ─── Props ───

interface Props {
  chains: MasterFailureChain[];
  isFullscreen?: boolean;
  hideStats?: boolean;
}

// ─── 셀 스타일 헬퍼 ───

function cellStyle(bg: string, extra?: React.CSSProperties): React.CSSProperties {
  return {
    border: '0.5px solid #60a5fa',
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

// ─── FE scope 약어 변환 (중앙 상수 사용) ───
const scopeAbbr = (scope: string): string => normalizeScope(scope);

// ─── flat row 타입 ───

interface FlatRow {
  fe: { scope: string; text: string };
  fm: { processNo: string; text: string };
  fc: { m4: string; workElement: string; text: string };
}

// ─── 연속 span 계산 (범용) ───

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

  // 1. Process-first 정렬 → flat rows 생성 (N:1:N — FM 중심축)
  const renderRows = useMemo(() => {
    // ★ Process-first 정렬: processNo → fmText → feScope → feText
    const sorted = [...chains].sort((a, b) => {
      const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
      if (pCmp !== 0) return pCmp;
      const fmCmp = (a.fmValue || '').localeCompare(b.fmValue || '');
      if (fmCmp !== 0) return fmCmp;
      const scopeCmp = (a.feScope || '').localeCompare(b.feScope || '');
      if (scopeCmp !== 0) return scopeCmp;
      return (a.feValue || '').localeCompare(b.feValue || '');
    });

    const flatRows: FlatRow[] = sorted.map(c => ({
      fe: {
        scope: c.feScope || '',
        text: c.feValue || '',
      },
      fm: { processNo: c.processNo || '', text: c.fmValue || '' },
      fc: {
        m4: c.m4 || '',
        workElement: c.workElement || '',
        text: c.fcValue || '',
      },
    }));

    const len = flatRows.length;

    // ★ N:1:N 계층적 span 계산 (FM 경계로 FE 제한)
    // Process: 1차 축 (가장 넓은 merge)
    const processSpans = calcSpans(len, i => flatRows[i].fm.processNo);
    // FM: 2차 축 (Process 내 경계)
    const fmSpans = calcSpans(len, i =>
      `${flatRows[i].fm.processNo}|${flatRows[i].fm.text}`);
    // Cat: FM 경계 내 (FM key 포함 → FM 변경 시 자동 분리)
    const catSpans = calcSpans(len, i =>
      `${flatRows[i].fm.processNo}|${flatRows[i].fm.text}|${flatRows[i].fe.scope}`);
    // FE: FM 경계 내 (FM key + scope 포함)
    const feSpans = calcSpans(len, i =>
      `${flatRows[i].fm.processNo}|${flatRows[i].fm.text}|${flatRows[i].fe.scope}|${flatRows[i].fe.text}`);

    return flatRows.map((row, idx) => ({
      ...row,
      processRowSpan: processSpans[idx],
      showProcess: processSpans[idx] > 0,
      fmRowSpan: fmSpans[idx],
      showFm: fmSpans[idx] > 0,
      catRowSpan: catSpans[idx],
      showCat: catSpans[idx] > 0,
      feRowSpan: feSpans[idx],
      showFe: feSpans[idx] > 0,
    }));
  }, [chains]);

  // 통계
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
          {/* FM 영역 (주황) — Process, FM */}
          <th className={`w-[7%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FM, color: '#fff', border: `1px solid ${BORDER_FM}` }}
            title="Process: 공정번호">Process</th>
          <th className={`w-[16%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FM, color: '#fff', border: `1px solid ${BORDER_FM}` }}
            title="Failure Mode: 고장형태">FM</th>
          {/* FE 영역 (파란) — Cat, FE */}
          <th className={`w-[5%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FE, color: '#fff', border: `1px solid ${BORDER_FE}` }}
            title="Category: 구분 (YP=자사공장, SP=후공정, USER=사용자)">Cat</th>
          <th className={`w-[18%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FE, color: '#fff', border: `1px solid ${BORDER_FE}` }}
            title="Failure Effect: 고장영향">FE</th>
          {/* FC 영역 (녹색) — 4M, WE, FC */}
          <th className={`w-[5%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FC, color: '#fff', border: `1px solid ${BORDER_FC}` }}
            title="4M: Man/Machine/Material/Environment">4M</th>
          <th className={`w-[12%] ${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FC, color: '#fff', border: `1px solid ${BORDER_FC}` }}
            title="Work Element: 작업요소">WE</th>
          <th className={`${thPad} font-semibold sticky top-0`}
            style={{ background: HEADER_FC, color: '#fff', border: `1px solid ${BORDER_FC}` }}
            title="Failure Cause: 고장원인">FC</th>
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
          const fmBg = FM_BG[isOdd];
          const feBg = FE_BG[isOdd];
          const fcBg = FC_BG[isOdd];
          const isFmFirst = row.showFm;
          return (
            <tr key={`r-${idx}`}
              style={isFmFirst && idx > 0 ? { borderTop: '1.5px solid #d97706' } : {}}>
              {/* Process: processNo 기준 병합 (1차 축) */}
              {row.showProcess && (
                <td rowSpan={row.processRowSpan} style={cellCenterStyle(fmBg, { fontWeight: 600 })}>
                  {row.fm.processNo}
                </td>
              )}
              {/* FM: processNo+fmText 기준 병합 (2차 축, FM 중심) */}
              {row.showFm && (
                <td rowSpan={row.fmRowSpan} style={cellStyle(fmBg)}>
                  {row.fm.text}
                </td>
              )}
              {/* Cat: FM 경계 내 scope 병합 */}
              {row.showCat && (
                <td rowSpan={row.catRowSpan} style={cellCenterStyle(feBg, { fontSize: fs - 1 })}>
                  {scopeAbbr(row.fe.scope)}
                </td>
              )}
              {/* FE: FM 경계 내 scope+text 병합 */}
              {row.showFe && (
                <td rowSpan={row.feRowSpan} style={cellStyle(feBg)}>
                  {row.fe.text}
                </td>
              )}
              {/* 4M, WE, FC: 행별 독립 */}
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
      {/* 통계 바 */}
      {!hideStats && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px]">
            <b className="text-blue-700">{stats.total}</b><span className="text-blue-500">체인</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px]">
            <b className="text-blue-700">{stats.processes}</b><span className="text-blue-500">공정</span>
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

      {/* 테이블 */}
      <div className={`overflow-y-auto ${tableMaxH} border border-gray-200 rounded`}>
        {tableBody}
      </div>

      {/* 푸터 */}
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-600">
        <strong>연결 현황:</strong> FM {stats.uniqueFM}개 | FE {stats.uniqueFE}개 | FC {stats.uniqueFC}개
      </div>
    </div>
  );
}

export default FailureChainPreview;
