/**
 * @file FailureAnalysisSummary.tsx
 * @description 2분할 검증 뷰의 왼쪽 패널 — 4단계 고장분석 요약 (FE/S/FM/FC)
 * - processedFMGroups에서 FE(고장영향), S(심각도), FM(고장형태), FC(고장원인) 표시
 * - FM 기준 rowSpan 병합, FE/FC 자체 rowSpan 유지
 * - 헤더에 적합/누락/중복 통계 배지, 중복 셀 노란배경
 */

'use client';

import React from 'react';
import type { ProcessedFMGroup } from '../processFailureLinks';
import type { VerificationStats } from './types';
import { PLACEHOLDER_DASH, PLACEHOLDER_UNCLASSIFIED } from '../allTabConstants';

const BORDER = '1px solid #ccc';
const HEADER_BG = '#1e3a5f';
const DUPLICATE_BG = '#fffde7';
const MISSING_BG = '#fff0f0';

const HEADER_STYLE: React.CSSProperties = {
  background: HEADER_BG, color: '#fff', border: BORDER,
  padding: '2px 4px', fontSize: '10px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap',
};

const CELL = (bg: string): React.CSSProperties => ({
  background: bg, border: BORDER,
  padding: '2px 4px', fontSize: '10px', verticalAlign: 'middle',
  wordBreak: 'break-word' as const, lineHeight: '1.3',
});

const CENTER_CELL = (bg: string): React.CSSProperties => ({
  ...CELL(bg), textAlign: 'center',
});

const isMissing = (val: string) => !val || val === PLACEHOLDER_DASH || val === PLACEHOLDER_UNCLASSIFIED;

const ROW_BG = '#ffffff';
const ROW_BG_ALT = '#f8f9fa';
const FM_BORDER_BOTTOM = '2px solid #90a4ae';

/** 통계 배지 렌더 */
function StatsBadges({ stats }: { stats: VerificationStats }) {
  return (
    <span style={{ display: 'inline-flex', gap: '3px', marginLeft: '6px' }}>
      {stats.ok > 0 && (
        <span style={{ background: '#4caf50', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 700 }}>
          적합{stats.ok}
        </span>
      )}
      {stats.missing > 0 && (
        <span style={{ background: '#ef5350', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 700 }}>
          누락{stats.missing}
        </span>
      )}
      {stats.duplicate > 0 && (
        <span style={{ background: '#ffc107', color: '#000', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 700 }}>
          중복{stats.duplicate}
        </span>
      )}
    </span>
  );
}

/** 셀 배경 결정: 누락 > 중복 > 기본 */
function cellBg(text: string, baseBg: string, duplicateTexts: Set<string>): string {
  if (isMissing(text)) return MISSING_BG;
  if (duplicateTexts.has(text)) return DUPLICATE_BG;
  return baseBg;
}

interface FailureAnalysisSummaryProps {
  processedFMGroups: ProcessedFMGroup[];
  leftStats: { fe: VerificationStats; fm: VerificationStats; fc: VerificationStats };
}

export function FailureAnalysisSummary({ processedFMGroups, leftStats }: FailureAnalysisSummaryProps) {
  if (processedFMGroups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-[10px]">
        고장연결 데이터가 없습니다.
      </div>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '34%' }} />
        <col style={{ width: '4%' }} />
        <col style={{ width: '31%' }} />
        <col style={{ width: '31%' }} />
      </colgroup>
      <thead className="sticky top-0 z-10">
        <tr>
          <th colSpan={4} style={{ ...HEADER_STYLE, fontSize: '11px', background: '#37474f' }}>
            4단계 고장분석 — FM {processedFMGroups.length}건
          </th>
        </tr>
        <tr>
          <th style={HEADER_STYLE}>
            FE <StatsBadges stats={leftStats.fe} />
          </th>
          <th style={HEADER_STYLE}>S</th>
          <th style={HEADER_STYLE}>
            FM <StatsBadges stats={leftStats.fm} />
          </th>
          <th style={HEADER_STYLE}>
            FC <StatsBadges stats={leftStats.fc} />
          </th>
        </tr>
      </thead>
      <tbody>
        {processedFMGroups.flatMap((fmGroup, fmIdx) =>
          fmGroup.rows.map((row, rowInFM) => {
            const bg = fmIdx % 2 === 0 ? ROW_BG : ROW_BG_ALT;
            const isLastRowOfFM = rowInFM === fmGroup.rows.length - 1;
            const fmDivider: React.CSSProperties = isLastRowOfFM
              ? { borderBottom: FM_BORDER_BOTTOM }
              : {};

            const showFM = rowInFM === 0;
            const showFE = row.feRowSpan > 0;
            const showFC = row.fcRowSpan > 0;

            return (
              <tr key={`${fmGroup.fmId}-${rowInFM}`} style={fmDivider}>
                {showFE && (
                  <td rowSpan={row.feRowSpan} style={{
                    ...CELL(cellBg(row.feText, bg, leftStats.fe.duplicateTexts)),
                    ...(isLastRowOfFM ? { borderBottom: FM_BORDER_BOTTOM } : {}),
                  }}>
                    {row.feText || PLACEHOLDER_DASH}
                  </td>
                )}
                {showFE && (
                  <td rowSpan={row.feRowSpan} style={{
                    ...CENTER_CELL(bg),
                    fontWeight: 700,
                    color: row.feSeverity >= 9 ? '#d32f2f' : row.feSeverity >= 7 ? '#e65100' : undefined,
                    ...(isLastRowOfFM ? { borderBottom: FM_BORDER_BOTTOM } : {}),
                  }}>
                    {row.feSeverity > 0 ? row.feSeverity : PLACEHOLDER_DASH}
                  </td>
                )}
                {showFM && (
                  <td rowSpan={fmGroup.fmRowSpan} style={{
                    ...CELL(cellBg(fmGroup.fmText, bg, leftStats.fm.duplicateTexts)),
                    fontWeight: 600,
                    borderBottom: FM_BORDER_BOTTOM,
                  }}>
                    <span style={{ color: '#1565c0', fontWeight: 700, fontSize: '9px', marginRight: '2px' }}>{fmGroup.fmNo}</span>
                    {fmGroup.fmText || PLACEHOLDER_DASH}
                  </td>
                )}
                {showFC && (
                  <td rowSpan={row.fcRowSpan} style={{
                    ...CELL(cellBg(row.fcText, bg, leftStats.fc.duplicateTexts)),
                    ...(isLastRowOfFM ? { borderBottom: FM_BORDER_BOTTOM } : {}),
                  }}>
                    {row.fcText || PLACEHOLDER_DASH}
                  </td>
                )}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
