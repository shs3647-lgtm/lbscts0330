// @ts-nocheck
/**
 * @file FunctionCellRenderer.tsx
 * @description 기능분석(3단계) 셀 렌더링 - 구분, 완제품기능, 요구사항, 공정기능, 제품특성, 작업요소기능, 공정특성
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
  feIdx?: number;
  fcIdx?: number;
  feText?: string;
  feSeverity?: number;
  fcText?: string;
  fcM4?: string;
  fcWorkElem?: string;
  fcWorkFunction: string;
  fcProcessChar: string;
  feCategory: string;
  feFunctionName: string;
  feRequirement: string;
  feRowSpan: number;
  fcRowSpan: number;
}

interface FMGroup {
  fmId: string;
  fmText: string;
  fmRowSpan: number;
  fmProcessNo: string;
  fmProcessName: string;
  fmProcessFunction: string;
  fmProductChar: string;
  maxSeverity: number;
  rows: FMGroupRow[];
}

interface FunctionCellRendererProps {
  col: ColumnDef;
  colIdx: number;
  fmGroup: FMGroup;
  fmIdx: number;
  row: FMGroupRow;
  rowInFM: number;
  globalRowIdx: number;
}

export function FunctionCellRenderer({
  col,
  colIdx,
  fmGroup,
  fmIdx,
  row,
  rowInFM,
  globalRowIdx,
}: FunctionCellRendererProps): React.ReactElement | null {
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
  const isInMergedRange = (type: 'fe' | 'fc'): boolean => {
    for (let prevIdx = 0; prevIdx < rowInFM; prevIdx++) {
      const prevRow = fmGroup.rows[prevIdx];
      if (!prevRow) continue;
      const span = type === 'fe' ? prevRow.feRowSpan : prevRow.fcRowSpan;
      if (span > 1 && prevIdx + span > rowInFM) {
        return true; // 이전 행의 rowSpan 범위 안에 있음
      }
    }
    return false;
  };

  // ★ FE 기반 역전개 (구분, 완제품기능, 요구사항)
  const feFunctionCols = ['구분', '완제품기능', '요구사항'];
  if (feFunctionCols.includes(col.name)) {
    // ★ rowSpan=0이면 병합된 범위 → 렌더링 안함
    if (row.feRowSpan === 0) return null;
    // 누적 범위 체크: 이전 행의 feRowSpan 범위 안에 있으면 렌더링하지 않음
    if (rowInFM === 0 || !isInMergedRange('fe')) {
      let value = '';
      if (col.name === '구분') value = row.feCategory || '';
      else if (col.name === '완제품기능') value = row.feFunctionName || '';
      else if (col.name === '요구사항') value = row.feRequirement || '';
      
      return (
        <td key={colIdx} rowSpan={row.feRowSpan} style={cellStyle(row.feRowSpan)}>
          {value}
        </td>
      );
    }
    return null;
  }

  // ★ FM 기반 역전개 (공정 기능, 제품특성)
  const fmFunctionCols = ['공정 기능', '제품특성'];
  if (fmFunctionCols.includes(col.name)) {
    if (row.isFirstRow) {
      let value = '';
      if (col.name === '공정 기능') value = fmGroup.fmProcessFunction || '';
      else if (col.name === '제품특성') value = fmGroup.fmProductChar || '';
      
      return (
        <td key={colIdx} rowSpan={fmGroup.fmRowSpan} style={cellStyle(fmGroup.fmRowSpan)}>
          {value}
        </td>
      );
    }
    return null;
  }

  // ★ FC 기반 역전개 (작업요소 기능, 공정특성)
  const fcFunctionCols = ['작업요소 기능', '공정특성'];
  if (fcFunctionCols.includes(col.name)) {
    // 누적 범위 체크: 이전 행의 fcRowSpan 범위 안에 있으면 렌더링하지 않음
    if (rowInFM === 0 || !isInMergedRange('fc')) {
      let value = '';
      if (col.name === '작업요소 기능') value = row.fcWorkFunction || '';
      else if (col.name === '공정특성') value = row.fcProcessChar || '';
      
      return (
        <td key={colIdx} rowSpan={row.fcRowSpan} style={cellStyle(row.fcRowSpan, true)}>
          {value}
        </td>
      );
    }
    return null;
  }

  return null;
}

