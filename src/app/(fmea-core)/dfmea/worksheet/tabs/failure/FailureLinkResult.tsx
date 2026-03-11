/**
 * @file FailureLinkResult.tsx
 * @description 고장연결 결과 테이블 화면
 */

'use client';

import React, { useMemo, useEffect, useCallback } from 'react';
import { COLORS, FONT_SIZES } from '../../constants';
import { groupFailureLinksByFM, calculateLastRowMerge } from '../../utils';
import {
  resultTableContainer,
  resultTableHeaderStyle,
  resultFooterStyle,
  tdCenterStyle,
  tdStyle
} from './FailureLinkStyles';
import { LinkResult, FMItem } from './FailureLinkTypes';

interface FailureLinkResultProps {
  savedLinks: LinkResult[];
  fmData: FMItem[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function FailureLinkResult({ savedLinks, fmData, isFullscreen, onToggleFullscreen }: FailureLinkResultProps) {
  // ESC 키로 전체화면 닫기
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onToggleFullscreen?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onToggleFullscreen]);
  // FM별 그룹핑
  const fmGroupsMap = useMemo(() => groupFailureLinksByFM(savedLinks), [savedLinks]);

  // 렌더링용 그룹 데이터 변환
  const groups = useMemo(() => {
    const result: {
      fmId: string; fmText: string; fmProcess: string; fmNo: string;
      fes: { id: string; scope: string; text: string; severity: number; feNo: string }[];
      fcs: { id: string; processName: string; m4: string; workElem: string; text: string; fcNo: string }[];
    }[] = [];

    fmGroupsMap.forEach((group, fmId) => {
      const fm = fmData.find(f => f.id === fmId);
      // ★ FM 텍스트/공정명은 fmData에서 최신 값 가져오기 (savedLinks의 오래된 값 사용 방지)
      result.push({
        fmId: group.fmId,
        fmText: fm?.text || group.fmText,           // ★ 최신 텍스트 우선
        fmProcess: fm?.processName || group.fmProcess, // ★ 최신 공정명 우선
        fmNo: fm?.fmNo || group.fmNo || '',
        fes: group.fes.map(fe => ({
          id: fe.id,
          scope: fe.scope,
          text: fe.text,
          severity: fe.severity,
          feNo: fe.no
        })),
        fcs: group.fcs.map(fc => ({
          id: fc.id,
          processName: fc.process,
          m4: fc.m4,
          workElem: fc.workElem,
          text: fc.text,
          fcNo: fc.no
        }))
      });
    });

    const parseFmNo = (fmNo: string) => {
      const match = fmNo.match(/\d+/);
      return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
    };

    result.sort((a, b) => parseFmNo(a.fmNo) - parseFmNo(b.fmNo));
    return result;
  }, [fmGroupsMap, fmData]);

  // 렌더링할 행 데이터 생성
  const renderRows = useMemo(() => {
    const rows: {
      fmId: string; rowIdx: number; totalRows: number;
      fe?: { id: string; scope: string; text: string; severity: number; feNo: string }; feRowSpan: number; showFe: boolean;
      fm: { text: string; no: string; process: string }; showFm: boolean;
      fc?: { id: string; processName: string; m4: string; workElem: string; text: string; fcNo: string }; fcRowSpan: number; showFc: boolean;
    }[] = [];

    groups.forEach(group => {
      const feCount = group.fes.length;
      const fcCount = group.fcs.length;
      const totalRows = Math.max(feCount, fcCount, 1);

      for (let rowIdx = 0; rowIdx < totalRows; rowIdx++) {
        const mergeConfig = calculateLastRowMerge(feCount, fcCount, rowIdx, totalRows);

        let feItem: typeof group.fes[0] | undefined = undefined;
        if (mergeConfig.showFe && rowIdx < feCount) {
          feItem = group.fes[rowIdx];
        }

        let fcItem: typeof group.fcs[0] | undefined = undefined;
        if (mergeConfig.showFc && rowIdx < fcCount) {
          fcItem = group.fcs[rowIdx];
        }

        rows.push({
          fmId: group.fmId,
          rowIdx,
          totalRows,
          fe: feItem,
          feRowSpan: mergeConfig.feRowSpan,
          showFe: mergeConfig.showFe,
          fm: { text: group.fmText, no: group.fmNo, process: group.fmProcess },
          showFm: rowIdx === 0,
          fc: fcItem,
          fcRowSpan: mergeConfig.fcRowSpan,
          showFc: mergeConfig.showFc
        });
      }
    });

    return rows;
  }, [groups]);

  // 통계 값
  const feTotal = groups.reduce((sum, g) => sum + g.fes.length, 0);
  const fcTotal = groups.reduce((sum, g) => sum + g.fcs.length, 0);

  const thPad = isFullscreen ? 'px-2 py-1' : 'px-1 py-0.5';
  const fs = isFullscreen ? 13 : 10;

  // 테이블 본체 (공유)
  const tableBody = (
    <>
      <table className="w-full border-collapse" style={{ fontSize: fs }}>
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={`w-[4%] bg-[#1a3050] text-white ${thPad} border border-[#2a4a6a] font-semibold sticky top-0`} title="고장영향 번호">No</th>
            <th className={`w-[6%] bg-[#1a3050] text-white ${thPad} border border-[#2a4a6a] font-semibold sticky top-0`} title="Category: 구분 (YP=자사공장, SP=후공정, USER=사용자)">Cat</th>
            <th className={`w-[18%] bg-[#1a3050] text-white ${thPad} border border-[#2a4a6a] font-semibold sticky top-0`} title="Failure Effect: 고장영향">FE</th>
            <th className={`w-[3%] bg-[#1a3050] text-white ${thPad} border border-[#2a4a6a] font-semibold sticky top-0`} title="Severity: 심각도">S</th>
            <th className={`w-[4%] bg-[#3a2a10] text-white ${thPad} border border-[#5a4a2a] font-semibold sticky top-0`} title="고장형태 번호">No</th>
            <th className={`w-[16%] bg-[#3a2a10] text-white ${thPad} border border-[#5a4a2a] font-semibold sticky top-0`} title="Failure Mode: 고장형태">FM</th>
            <th className={`w-[4%] bg-[#1a3520] text-white ${thPad} border border-[#2a5530] font-semibold sticky top-0`} title="고장원인 번호">No</th>
            <th className={`w-[12%] bg-[#1a3520] text-white ${thPad} border border-[#2a5530] font-semibold sticky top-0`} title="Process: 공정명">Process</th>
            <th className={`w-[12%] bg-[#1a3520] text-white ${thPad} border border-[#2a5530] font-semibold sticky top-0`} title="Work Element: 작업요소">WE</th>
            <th className={`bg-[#1a3520] text-white ${thPad} border border-[#2a5530] font-semibold sticky top-0`} title="Failure Cause: 고장원인">FC</th>
          </tr>
        </thead>
        <tbody>
          {renderRows.length === 0 ? (
            <tr>
              <td colSpan={10} className="text-center p-10 text-gray-400">
                <div className="text-[28px] mb-2.5">📋</div>
                <div>연결된 고장이 없습니다</div>
              </td>
            </tr>
          ) : renderRows.map((row, idx) => {
            const isOdd = idx % 2 === 1;
            const feBg = isOdd ? '#bbdefb' : '#e3f2fd';
            const fmBg = isOdd ? '#ffe0b2' : '#fff3e0';
            const fcBg = isOdd ? '#c8e6c9' : '#e8f5e9';
            return (
              <tr key={`${row.fmId}-${row.rowIdx}`} style={row.rowIdx === 0 ? { borderTop: '0.5px solid #60a5fa' } : {}}>
                {row.showFe && (
                  <>
                    <td rowSpan={row.feRowSpan} style={tdCenterStyle(feBg, '0.5px solid #60a5fa', COLORS.structure.text)}>{row.fe?.feNo || ''}</td>
                    <td rowSpan={row.feRowSpan} style={tdCenterStyle(feBg, '0.5px solid #60a5fa', 'inherit', { fontSize: FONT_SIZES.small, whiteSpace: 'nowrap' })}>
                      {row.fe?.scope === 'Your Plant' ? 'YP' : row.fe?.scope === 'Ship to Plant' ? 'SP' : row.fe?.scope === 'User' ? 'USER' : row.fe?.scope || ''}
                    </td>
                    <td rowSpan={row.feRowSpan} style={tdStyle(feBg, '0.5px solid #60a5fa', { fontSize: FONT_SIZES.small, verticalAlign: 'middle' })}>{row.fe?.text || ''}</td>
                    <td rowSpan={row.feRowSpan} style={tdCenterStyle(feBg, '0.5px solid #60a5fa', (row.fe?.severity || 0) >= 8 ? '#f57c00' : (row.fe?.severity || 0) >= 5 ? '#f57f17' : '#333')}>{row.fe?.severity || ''}</td>
                  </>
                )}
                {row.showFm && (
                  <>
                    <td rowSpan={row.totalRows} style={tdCenterStyle(fmBg, '0.5px solid #60a5fa', '#333', { fontSize: FONT_SIZES.small, fontWeight: 600 })}>{row.fm.no}</td>
                    <td rowSpan={row.totalRows} style={tdStyle(fmBg, '0.5px solid #60a5fa', { verticalAlign: 'middle' })}>{row.fm.text}</td>
                  </>
                )}
                {row.showFc && (
                  <>
                    <td rowSpan={row.fcRowSpan} style={tdCenterStyle(fcBg, '0.5px solid #60a5fa', COLORS.function.text)}>{row.fc?.fcNo || ''}</td>
                    <td rowSpan={row.fcRowSpan} style={tdCenterStyle(fcBg, '0.5px solid #60a5fa', 'inherit', { fontSize: FONT_SIZES.small, whiteSpace: 'nowrap' })}>{row.fc?.processName || ''}</td>
                    <td rowSpan={row.fcRowSpan} style={tdStyle(fcBg, '0.5px solid #60a5fa', { fontSize: FONT_SIZES.small, verticalAlign: 'middle' })}>{row.fc?.workElem || ''}</td>
                    <td rowSpan={row.fcRowSpan} style={tdStyle(fcBg, '0.5px solid #60a5fa', { verticalAlign: 'middle' })}>{row.fc?.text || ''}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );

  // ★ 전체화면 모드: 헤더/푸터 고정, 테이블만 스크롤
  if (isFullscreen) {
    return (
      <>
        {/* 고정 헤더 (컴팩트) */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '3px 10px', background: '#1a3050', color: '#fff', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 12 }}>고장연결표</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#90caf9' }}>
              FM {groups.length} | FE {feTotal} | FC {fcTotal}
            </span>
            <button
              onClick={onToggleFullscreen}
              style={{
                background: '#ff5722', color: '#fff', border: 'none', borderRadius: 3,
                padding: '2px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              닫기
            </button>
          </div>
        </div>
        {/* 스크롤 가능한 테이블 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {tableBody}
        </div>
        {/* 고정 푸터 */}
        <div style={resultFooterStyle}>
          <strong className="font-bold">연결 현황:</strong> FM {groups.length}개 | FE {feTotal}개 | FC {fcTotal}개
        </div>
      </>
    );
  }

  // ★ 일반 모드
  return (
    <div style={resultTableContainer}>
      {onToggleFullscreen && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 4px', flexShrink: 0 }}>
          <button
            onClick={onToggleFullscreen}
            title="전체화면 보기"
            style={{
              background: '#1a3050', color: '#fff', border: 'none', borderRadius: 3,
              padding: '2px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
            }}
          >
            전체화면
          </button>
        </div>
      )}
      {tableBody}
      <div style={resultFooterStyle}>
        <strong className="font-bold">연결 현황:</strong> FM {groups.length}개 | FE {feTotal}개 | FC {fcTotal}개
      </div>
    </div>
  );
}

