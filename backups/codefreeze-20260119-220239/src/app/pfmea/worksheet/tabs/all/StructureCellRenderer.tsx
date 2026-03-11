// @ts-nocheck
/**
 * @file StructureCellRenderer.tsx
 * @description 구조분석(2단계) 셀 렌더링 - 완제품공정명, NO+공정명, 4M, 작업요소
 * @updated 2026-01-11 - 셀 스타일 최적화 (패딩 1px, 폰트 120% 한줄)
 */
'use client';

import React from 'react';
import { HEIGHTS, CELL_STYLE, STEP_DIVIDER, STEP_FIRST_COLUMN_IDS } from './allTabConstants';

interface ColumnDef {
  id: number;
  step: string;
  group: string;
  name: string;
  width: number;
  cellColor: string;
  cellAltColor: string;
  align: 'left' | 'center' | 'right';
}

interface FMGroupRow {
  isFirstRow: boolean;
  fcM4: string;
  fcWorkElem: string;
  fcRowSpan: number;
}

interface FMGroup {
  fmRowSpan: number;
  fmProcessNo: string;
  fmProcessName: string;
  rows: FMGroupRow[];
}

interface StructureCellRendererProps {
  col: ColumnDef;
  colIdx: number;
  fmGroup: FMGroup;
  fmIdx: number;
  row: FMGroupRow;
  rowInFM: number;
  globalRowIdx: number;
  l1ProductName?: string;
}

export function StructureCellRenderer({
  col,
  colIdx,
  fmGroup,
  fmIdx,
  row,
  rowInFM,
  globalRowIdx,
  l1ProductName,
}: StructureCellRendererProps): React.ReactElement | null {
  // ★ 2026-01-11: 셀 스타일 최적화 (패딩 1px, 폰트 120% 한줄) + 단계 구분선
  const isStepFirst = STEP_FIRST_COLUMN_IDS.includes(col.id);
  const cellStyle = (rowSpan: number, useGlobalIdx = false) => ({
    background: (useGlobalIdx ? globalRowIdx : fmIdx) % 2 === 0 ? col.cellColor : col.cellAltColor,
    height: `${HEIGHTS.body}px`,
    padding: CELL_STYLE.padding,
    borderTop: '1px solid #ccc',
    borderRight: '1px solid #ccc',
    borderBottom: '1px solid #ccc',
    borderLeft: isStepFirst ? `${STEP_DIVIDER.borderWidth} ${STEP_DIVIDER.borderStyle} ${STEP_DIVIDER.borderColor}` : '1px solid #ccc',
    fontSize: CELL_STYLE.fontSize,
    lineHeight: CELL_STYLE.lineHeight,
    textAlign: col.align,
    verticalAlign: 'middle' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word' as const,
  });

  // ★ 누적 rowSpan 범위 체크 헬퍼 함수
  const isInMergedRange = (): boolean => {
    for (let prevIdx = 0; prevIdx < rowInFM; prevIdx++) {
      const prevRow = fmGroup.rows[prevIdx];
      if (!prevRow) continue;
      if (prevRow.fcRowSpan > 1 && prevIdx + prevRow.fcRowSpan > rowInFM) {
        return true; // 이전 행의 rowSpan 범위 안에 있음
      }
    }
    return false;
  };

  // ★ 완제품 공정명 - FM 전체 병합
  if (col.name === '완제품 공정명') {
    if (row.isFirstRow) {
      return (
        <td key={colIdx} rowSpan={fmGroup.fmRowSpan} style={cellStyle(fmGroup.fmRowSpan)}>
          {l1ProductName || ''}
        </td>
      );
    }
    return null;
  }

  // ★ NO+공정명 - FM 전체 병합
  if (col.name === 'NO+공정명') {
    if (row.isFirstRow) {
      const processDisplay = fmGroup.fmProcessNo && fmGroup.fmProcessName 
        ? `${fmGroup.fmProcessNo}. ${fmGroup.fmProcessName}` 
        : fmGroup.fmProcessName || '';
      return (
        <td key={colIdx} rowSpan={fmGroup.fmRowSpan} style={cellStyle(fmGroup.fmRowSpan)}>
          {processDisplay}
        </td>
      );
    }
    return null;
  }

  // ★ 4M - FC별 병합 (누적 범위 체크)
  if (col.name === '4M') {
    if (rowInFM === 0 || !isInMergedRange()) {
      return (
        <td key={colIdx} rowSpan={row.fcRowSpan} style={{ ...cellStyle(row.fcRowSpan, true), textAlign: 'center' }}>
          {row.fcM4 || ''}
        </td>
      );
    }
    return null;
  }

  // ★ 작업요소 - FC별 병합 (누적 범위 체크)
  if (col.name === '작업요소') {
    if (rowInFM === 0 || !isInMergedRange()) {
      return (
        <td key={colIdx} rowSpan={row.fcRowSpan} style={cellStyle(row.fcRowSpan, true)}>
          {row.fcWorkElem || ''}
        </td>
      );
    }
    return null;
  }

  return null;
}

