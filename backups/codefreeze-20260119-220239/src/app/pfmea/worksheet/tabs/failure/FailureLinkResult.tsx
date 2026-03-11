// @ts-nocheck
/**
 * @file FailureLinkResult.tsx
 * @description 고장연결 결과 테이블 화면
 */

'use client';

import React, { useMemo } from 'react';
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
}

export default function FailureLinkResult({ savedLinks, fmData }: FailureLinkResultProps) {
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

  return (
    <div style={resultTableContainer}>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th colSpan={4} style={resultTableHeaderStyle(COLORS.structure.dark)}>고장영향(FE)</th>
            <th rowSpan={2} style={resultTableHeaderStyle(COLORS.failure.dark, { width: '14%', verticalAlign: 'middle' })}>고장형태<br/>(FM)</th>
            <th colSpan={4} style={resultTableHeaderStyle(COLORS.function.dark)}>고장원인(FC)</th>
          </tr>
          <tr>
            <th className="w-[6%] bg-[#e3f2fd] p-1 border border-gray-300 font-semibold">No</th>
            <th className="w-[10%] bg-[#e3f2fd] p-1 border border-gray-300 font-semibold">구분</th>
            <th className="w-[18%] bg-[#e3f2fd] p-1 border border-gray-300 font-semibold">고장영향</th>
            <th className="w-[5%] bg-[#e3f2fd] p-1 border border-gray-300 font-semibold">S</th>
            <th className="w-[6%] bg-[#e8f5e9] p-1 border border-gray-300 font-semibold">No</th>
            <th className="w-[10%] bg-[#e8f5e9] p-1 border border-gray-300 font-semibold">공정명</th>
            <th className="w-[12%] bg-[#e8f5e9] p-1 border border-gray-300 font-semibold">작업요소</th>
            <th className="bg-[#e8f5e9] p-1 border border-gray-300 font-semibold">고장원인</th>
          </tr>
        </thead>
        <tbody>
          {renderRows.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center p-10 text-gray-400">
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
              <tr key={`${row.fmId}-${row.rowIdx}`} className={row.rowIdx === 0 ? 'border-t-2 border-gray-400' : ''}>
                {row.showFe && (
                  <>
                    <td rowSpan={row.feRowSpan} style={tdCenterStyle(feBg, '1px solid #ccc', COLORS.structure.text)}>{row.fe?.feNo || ''}</td>
                    <td rowSpan={row.feRowSpan} style={tdCenterStyle(feBg, '1px solid #ccc', 'inherit', { fontSize: FONT_SIZES.small, whiteSpace: 'nowrap' })}>
                      {row.fe?.scope === 'Your Plant' ? 'YP' : row.fe?.scope === 'Ship to Plant' ? 'SP' : row.fe?.scope === 'User' ? 'USER' : row.fe?.scope || ''}
                    </td>
                    <td rowSpan={row.feRowSpan} style={tdStyle(feBg, '1px solid #ccc', { fontSize: FONT_SIZES.small, verticalAlign: 'middle' })}>{row.fe?.text || ''}</td>
                    <td rowSpan={row.feRowSpan} style={tdCenterStyle(feBg, '1px solid #ccc', (row.fe?.severity || 0) >= 8 ? '#f57c00' : (row.fe?.severity || 0) >= 5 ? '#f57f17' : '#333')}>{row.fe?.severity || ''}</td>
                  </>
                )}
                {row.showFm && (
                  <td rowSpan={row.totalRows} style={tdCenterStyle(fmBg, '1px solid #ccc')}>
                    <div className="text-xs font-semibold text-orange-800">{row.fm.no}</div>
                    <div>{row.fm.text}</div>
                  </td>
                )}
                {row.showFc && (
                  <>
                    <td rowSpan={row.fcRowSpan} style={tdCenterStyle(fcBg, '1px solid #ccc', COLORS.function.text)}>{row.fc?.fcNo || ''}</td>
                    <td rowSpan={row.fcRowSpan} style={tdCenterStyle(fcBg, '1px solid #ccc', 'inherit', { fontSize: FONT_SIZES.small, whiteSpace: 'nowrap' })}>{row.fc?.processName || ''}</td>
                    <td rowSpan={row.fcRowSpan} style={tdStyle(fcBg, '1px solid #ccc', { fontSize: FONT_SIZES.small, verticalAlign: 'middle' })}>{row.fc?.workElem || ''}</td>
                    <td rowSpan={row.fcRowSpan} style={tdStyle(fcBg, '1px solid #ccc', { verticalAlign: 'middle' })}>{row.fc?.text || ''}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* 통계 */}
      <div style={resultFooterStyle}>
        <strong className="font-bold">📊 연결 현황:</strong> FM {groups.length}개 | FE {groups.reduce((sum, g) => sum + g.fes.length, 0)}개 | FC {groups.reduce((sum, g) => sum + g.fcs.length, 0)}개
      </div>
    </div>
  );
}

