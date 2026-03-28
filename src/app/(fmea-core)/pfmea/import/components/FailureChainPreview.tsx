/**
 * @file FailureChainPreview.tsx
 * @description FC(Failure Chain) 미리보기 — 엑셀 FC 시트 양식 동일 구조
 * @created 2026-02-21
 * @updated 2026-03-27 — v5: 엑셀 FC 시트 양식 일치화
 * @updated 2026-03-28 — Import 엑셀 FC는 행마다 개별셀(병합 없음), 본 화면만 rowspan 병합 표시
 * @updated 2026-03-28 — 정렬·병합: 공정번호→FM→FE→FC (FM 중심 n:1:n, 실제 고장사슬과 동일 축)
 *
 * 컬럼 순서 (FC 시트 = Import 엑셀과 동일):
 *   FE구분 | FE(고장영향) | L2-1.공정번호 | FM(고장형태) | 4M | 작업요소(WE) | FC(고장원인)
 *
 * 화면 병합(rowspan): 공정번호+FM 동일 블록 세로 병합; FE구분은 FM 블록 내 동일 구분만 병합;
 *   FE(텍스트)는 행별(동일 FE 연속 시만 병합). 4M·WE·FC는 항상 1행.
 */

'use client';

import React, { useMemo } from 'react';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { normalizeScope } from '@/lib/fmea/scope-constants';
import { buildFailureChainPreviewRenderRows } from './failureChainPreviewModel';

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

// ─── 컴포넌트 ───

export function FailureChainPreview({ chains, isFullscreen, hideStats }: Props) {
  const tableMaxH = isFullscreen ? 'max-h-[calc(100vh-180px)]' : 'max-h-[400px]';

  const renderRows = useMemo(
    () => buildFailureChainPreviewRenderRows(chains),
    [chains],
  );

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

      <div className={`overflow-y-auto ${tableMaxH} border border-gray-200 rounded`} data-testid="import-fc-chain-preview">
        {tableBody}
      </div>

      {!hideStats && (
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-600">
          <strong>연결 현황:</strong> FM {stats.uniqueFM}개 | FE {stats.uniqueFE}개 | FC {stats.uniqueFC}개 | 체인 {stats.total}행
        </div>
      )}
    </div>
  );
}

export default FailureChainPreview;
