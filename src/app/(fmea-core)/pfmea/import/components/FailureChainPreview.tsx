/**
 * @file FailureChainPreview.tsx
 * @description FC(Failure Chain) 미리보기 — 엑셀 FC 시트 양식 동일 구조
 * @created 2026-02-21
 * @updated 2026-03-27 — v5: 엑셀 FC 시트 양식 일치화
 * @updated 2026-03-28 — Import 엑셀 FC는 행마다 개별셀(병합 없음), 본 화면만 rowspan 병합 표시
 * @updated 2026-03-28 — 정렬·병합: 공정번호→FM→FE→FC (FM 중심 n:1:n, 실제 고장사슬과 동일 축)
 * @updated 2026-03-28 — 항목별 건수 요약(구분·FE·공정·FM·WE·FC) 상단 표시, 행별 갯수 열 제거
 * @updated 2026-03-28 — 동일 공정·FM·FE 아래 (작업요소+고장원인) 중복 행 미리보기 병합
 * @updated 2026-03-28 — 열 헤더 고유 건수는 통계표(flatData itemCode 고유)와 동일하면 matrixHeaderCounts로 통일
 *
 * 컬럼 순서 (FC 시트 = Import 엑셀과 동일):
 *   FE구분 | FE(고장영향) | L2-1.공정번호 | FM(고장형태) | 4M | WE(작업요소) | FC(고장원인)
 *
 * 화면 병합(rowspan): 공정번호+FM 동일 블록 세로 병합; FE구분은 FM 블록 내 동일 구분만 병합;
 *   FE(텍스트)는 행별(동일 FE 연속 시만 병합). 4M·WE·FC는 항상 1행.
 */

'use client';

import React, { useMemo } from 'react';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { normalizeScope } from '@/lib/fmea/scope-constants';
import {
  chainCompositeKey,
  getFailureChainPreviewDisplayChains,
  mapDedupedChainsToPreviewRows,
} from './failureChainPreviewModel';

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

const COL_COUNT = 8;

/**
 * Import 통계 표 `effectiveStatistics.itemStats[].uniqueCount`와 동일 눈금.
 * 전달 시 FC 미리보기 테이블 헤더의 C1/C4/A1/A5/B1/B4·4M 숫자가 통계 표와 일치한다.
 */
export interface FailureChainPreviewMatrixHeaderCounts {
  uniqueByCode: Partial<Record<string, number>>;
  /** B계열 flat 행의 서로 다른 m4 값 개수 */
  uniqueM4FromFlat: number;
}

/** 파서·통계와 미리보기 체인 행 수를 나란히 비교 (이름/FK 매칭 없음, 건수만) */
export interface FailureChainPreviewVerificationRefs {
  /** rawFingerprint.totalChainRows 등 — 엑셀 FC 물리 행 합계 */
  parserTotalChainRows?: number | null;
  /** statistics.chainCount — 파서가 기록한 체인 건수 */
  parserChainCount?: number | null;
}

// ─── Props ───

interface Props {
  chains: MasterFailureChain[];
  isFullscreen?: boolean;
  hideStats?: boolean;
  /** 있으면 열 헤더·요약의 고유 건수를 체인이 아닌 통계 표(flat) 기준으로 표시 */
  matrixHeaderCounts?: FailureChainPreviewMatrixHeaderCounts | null;
  verificationRefs?: FailureChainPreviewVerificationRefs | null;
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

export function FailureChainPreview({
  chains,
  isFullscreen,
  hideStats,
  matrixHeaderCounts,
  verificationRefs,
}: Props) {
  const tableMaxH = isFullscreen ? 'max-h-[calc(100vh-180px)]' : 'max-h-[400px]';

  const displayChains = useMemo(
    () => getFailureChainPreviewDisplayChains(chains),
    [chains],
  );

  const renderRows = useMemo(
    () => mapDedupedChainsToPreviewRows(displayChains),
    [displayChains],
  );

  const stats = useMemo(() => {
    const rawRows = chains.length;
    const weFcMergedRows = rawRows - displayChains.length;
    const uniqueFM = new Set(displayChains.map(c => `${c.processNo}|${c.fmValue}`).filter(Boolean)).size;
    const uniqueFC = new Set(displayChains.map(c => c.fcValue).filter(Boolean)).size;
    const uniqueScope = new Set(displayChains.map(c => scopeAbbr(c.feScope || ''))).size;
    const uniqueFeText = new Set(displayChains.map(c => (c.feValue || '').trim()).filter(Boolean)).size;
    const uniqueWorkElement = new Set(displayChains.map(c => (c.workElement || '').trim()).filter(Boolean)).size;
    const uniqueM4 = new Set(displayChains.map(c => (c.m4 || '').trim()).filter(Boolean)).size;
    const processes = new Set(displayChains.map(c => c.processNo).filter(Boolean)).size;
    const uniqueChainKeysRaw = new Set(chains.map(chainCompositeKey)).size;
    const duplicatePhysicalRows = rawRows - uniqueChainKeysRaw;
    const uniqueChainKeys = new Set(displayChains.map(chainCompositeKey)).size;
    return {
      total: displayChains.length,
      rawRows,
      weFcMergedRows,
      processes,
      uniqueFM,
      uniqueFC,
      uniqueScope,
      uniqueFeText,
      uniqueWorkElement,
      uniqueM4,
      uniqueChainKeys,
      duplicatePhysicalRows,
    };
  }, [chains, displayChains]);

  /** 통계 표와 동일 눈금(전달 시) — 미리보기 행 병합과 무관 */
  const hdr = useMemo(() => {
    const m = matrixHeaderCounts;
    const u = m?.uniqueByCode;
    return {
      uniqueScope: u?.C1 ?? stats.uniqueScope,
      uniqueFeText: u?.C4 ?? stats.uniqueFeText,
      processes: u?.A1 ?? stats.processes,
      uniqueFM: u?.A5 ?? stats.uniqueFM,
      uniqueM4: m ? m.uniqueM4FromFlat : stats.uniqueM4,
      uniqueWorkElement: u?.B1 ?? stats.uniqueWorkElement,
      uniqueFC: u?.B4 ?? stats.uniqueFC,
    };
  }, [matrixHeaderCounts, stats]);

  const verifyLines = useMemo(() => {
    const physical = stats.rawRows;
    const shown = stats.total;
    const refs = verificationRefs;
    if (!refs) return [];
    const lines: { label: string; ok: boolean | null; detail: string }[] = [];
    const mergeNote = stats.weFcMergedRows > 0 ? ` | 미리보기 ${shown}행(WE+FC 병합 ${stats.weFcMergedRows})` : ` | 미리보기 ${shown}행`;
    const row = refs.parserTotalChainRows;
    if (typeof row === 'number' && Number.isFinite(row)) {
      lines.push({
        label: '파서 FC행',
        ok: row === physical,
        detail: `${row} ↔ 원본 ${physical}${mergeNote}${row === physical ? '' : ` (원본 Δ ${physical - row})`}`,
      });
    }
    const cc = refs.parserChainCount;
    if (typeof cc === 'number' && Number.isFinite(cc)) {
      lines.push({
        label: '파서 chainCount',
        ok: cc === physical,
        detail: `${cc} ↔ 원본 ${physical}${mergeNote}${cc === physical ? '' : ` (원본 Δ ${physical - cc})`}`,
      });
    }
    return lines;
  }, [stats.rawRows, stats.total, stats.weFcMergedRows, verificationRefs]);

  if (chains.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-[11px] border border-dashed border-gray-300 rounded">
        고장사슬 데이터 없음 — 기초정보에 A5(고장형태), B4(고장원인), C4(고장영향) 데이터가 필요합니다
      </div>
    );
  }

  const thPad = isFullscreen ? 'px-2 py-1' : 'px-1 py-0.5';
  const fs = isFullscreen ? 13 : 10;
  const hdrTitleSuffix = matrixHeaderCounts ? ' — 통계표 고유와 동일' : '';

  const tableBody = (
    <table className="w-full border-collapse" style={{ fontSize: fs }}>
      <thead className="sticky top-0 z-10">
        <tr>
          <th className={`w-[4%] ${thPad} font-semibold sticky top-0 whitespace-normal leading-tight`}
            style={{ background: '#374151', color: '#fff', border: '1px solid #1f2937' }}
            title="체인 행 수(정렬 후 표시 행)">#:{stats.total}</th>
          <th className={`w-[5%] ${thPad} font-semibold sticky top-0 whitespace-normal leading-tight`}
            style={{ background: HEADER_FE, color: '#fff', border: `1px solid ${BORDER_FE}` }}
            title={`FE구분 고유값 수 (L1 C1)${hdrTitleSuffix}`}>FE구분:{hdr.uniqueScope}</th>
          <th className={`w-[18%] ${thPad} font-semibold sticky top-0 whitespace-normal leading-tight`}
            style={{ background: HEADER_FE, color: '#fff', border: `1px solid ${BORDER_FE}` }}
            title={`고장영향 고유 건수 (L1 C4)${hdrTitleSuffix}`}>FE(고장영향):{hdr.uniqueFeText}</th>
          <th className={`w-[6%] ${thPad} font-semibold sticky top-0 whitespace-normal leading-tight`}
            style={{ background: HEADER_FM, color: '#fff', border: `1px solid ${BORDER_FM}` }}
            title={`공정번호 고유 건수 (L2 A1)${hdrTitleSuffix}`}>L2-1.공정번호:{hdr.processes}</th>
          <th className={`w-[16%] ${thPad} font-semibold sticky top-0 whitespace-normal leading-tight`}
            style={{ background: HEADER_FM, color: '#fff', border: `1px solid ${BORDER_FM}` }}
            title={`고장형태 고유 건수 (L2 A5)${hdrTitleSuffix}`}>FM(고장형태):{hdr.uniqueFM}</th>
          <th className={`w-[4%] ${thPad} font-semibold sticky top-0 whitespace-normal leading-tight`}
            style={{ background: HEADER_FC, color: '#fff', border: `1px solid ${BORDER_FC}` }}
            title={`B계열 flat 기준 4M 코드 고유${hdrTitleSuffix}`}>4M:{hdr.uniqueM4}</th>
          <th className={`w-[12%] ${thPad} font-semibold sticky top-0 whitespace-normal leading-tight`}
            style={{ background: HEADER_FC, color: '#fff', border: `1px solid ${BORDER_FC}` }}
            title={`작업요소 고유 건수 (L3 B1)${hdrTitleSuffix}`}>WE(작업요소):{hdr.uniqueWorkElement}</th>
          <th className={`${thPad} font-semibold sticky top-0 whitespace-normal leading-tight`}
            style={{ background: HEADER_FC, color: '#fff', border: `1px solid ${BORDER_FC}` }}
            title={`고장원인 고유 건수 (L3 B4)${hdrTitleSuffix}`}>FC(고장원인):{hdr.uniqueFC}</th>
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
              <td style={cellCenterStyle('#f3f4f6', { fontWeight: 600, color: '#374151' })}>
                {row.rowNo}
              </td>
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
        <div className="mb-1.5 space-y-1">
          <div className="text-[11px] text-gray-800 leading-snug px-0.5">
            구분:{hdr.uniqueScope}, FE(고장현황):{hdr.uniqueFeText}, 공정번호:{hdr.processes}, 고장형태:{hdr.uniqueFM},
            작업요소:{hdr.uniqueWorkElement}, 고장원인:{hdr.uniqueFC}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded text-[11px]">
              <b className="text-purple-700">{stats.total}</b><span className="text-purple-500">체인행</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px]">
              <span className="text-slate-500">고유키</span><b className="text-slate-800">{stats.uniqueChainKeys}</b>
            </span>
            {stats.weFcMergedRows > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 border border-teal-200 rounded text-[11px]">
                <span className="text-teal-700">WE+FC병합</span><b className="text-teal-900">{stats.weFcMergedRows}</b>
              </span>
            )}
            {stats.duplicatePhysicalRows > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[11px]">
                <span className="text-amber-700">7필드중복</span><b className="text-amber-900">{stats.duplicatePhysicalRows}</b>
              </span>
            )}
          </div>
        </div>
      )}

      <div className={`overflow-y-auto ${tableMaxH} border border-gray-200 rounded`} data-testid="import-fc-chain-preview">
        {tableBody}
      </div>

      {!hideStats && (
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-600">
          <strong>연결 현황:</strong> 구분 {hdr.uniqueScope} | FE(고장현황) {hdr.uniqueFeText} | 공정 {hdr.processes} | 고장형태 {hdr.uniqueFM} | 작업요소 {hdr.uniqueWorkElement} | 고장원인 {hdr.uniqueFC} | 체인 {stats.total}행 | 고유키 {stats.uniqueChainKeys}
          {stats.weFcMergedRows > 0 ? ` | WE+FC병합 ${stats.weFcMergedRows}` : ''}
          {stats.duplicatePhysicalRows > 0 ? ` | 7필드중복 ${stats.duplicatePhysicalRows}` : ''}
        </div>
      )}

      {(verifyLines.length > 0 || stats.duplicatePhysicalRows > 0 || stats.weFcMergedRows > 0) && (
        <div
          className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1 rounded border text-[10px]"
          style={{
            background: verifyLines.some(v => v.ok === false) ? '#fff1f2' : '#f0fdf4',
            borderColor: verifyLines.some(v => v.ok === false) ? '#fecdd3' : '#bbf7d0',
          }}
          data-testid="import-fc-chain-preview-verify"
        >
          <strong className="text-gray-700">통계 검증:</strong>
          {verifyLines.length === 0 && (
            <span className="text-gray-500">파서 참조 건수 없음 — 고유키·중복 행으로만 확인</span>
          )}
          {verifyLines.map((v, i) => (
            <span key={i} className={v.ok === false ? 'text-red-700 font-semibold' : 'text-emerald-800'}>
              {v.label}: {v.detail}
              {v.ok === true ? ' ✓' : v.ok === false ? ' ✗' : ''}
            </span>
          ))}
          {stats.weFcMergedRows > 0 && (
            <span className="text-teal-800 font-medium">
              동일 문맥(공정·FM·FE)에서 작업요소+고장원인 동일 {stats.weFcMergedRows}건 병합 표시
            </span>
          )}
          {stats.duplicatePhysicalRows > 0 && (
            <span className="text-amber-800 font-medium">
              원본 동일 7필드 키 중복 {stats.duplicatePhysicalRows}건 — 엑셀 FC 시트 점검
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default FailureChainPreview;
