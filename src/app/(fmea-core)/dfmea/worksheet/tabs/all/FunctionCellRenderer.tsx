/**
 * @file FunctionCellRenderer.tsx
 * @description 기능분석(3단계) 셀 렌더링 - 구분, 완제품기능, 요구사항, 설계기능, 설계특성, 부품(컴포넌트)기능, 설계파라미터
 * @updated 2026-01-11 - 셀 스타일 최적화 (패딩 1px, 폰트 120% 한줄)
 */
'use client';

import React from 'react';
import { HEIGHTS, CELL_STYLE, STEP_DIVIDER, STEP_FIRST_COLUMN_IDS, COMPACT_CELL_STYLE, COMPACT_HEIGHTS } from './allTabConstants';

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
  isCompact?: boolean;
  merged?: { fe: boolean; fc: boolean; fm: boolean };
}

export const FunctionCellRenderer = React.memo(function FunctionCellRendererInner({
  col,
  colIdx,
  fmGroup,
  fmIdx,
  row,
  rowInFM,
  globalRowIdx,
  isCompact,
  merged,
}: FunctionCellRendererProps): React.ReactElement | null {
  // ★ 2026-01-11: 셀 스타일 최적화 + 단계 구분선 + compact 모드
  const isStepFirst = STEP_FIRST_COLUMN_IDS.includes(col.id);
  const cs = isCompact ? COMPACT_CELL_STYLE : CELL_STYLE;
  const cellStyle = (rowSpan: number, useGlobalIdx = false) => ({
    background: (useGlobalIdx ? globalRowIdx : fmIdx) % 2 === 0 ? col.cellColor : col.cellAltColor,
    height: isCompact ? undefined : `${HEIGHTS.body}px`,
    minHeight: isCompact ? `${COMPACT_HEIGHTS.body}px` : undefined,
    padding: cs.padding,
    borderTop: '1px solid #ccc',
    borderRight: '1px solid #ccc',
    borderBottom: '1px solid #ccc',
    borderLeft: isStepFirst ? `${STEP_DIVIDER.borderWidth} ${STEP_DIVIDER.borderStyle} ${STEP_DIVIDER.borderColor}` : '1px solid #ccc',
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    textAlign: col.align,
    verticalAlign: 'middle' as const,
    overflow: 'hidden' as const,
    whiteSpace: isCompact ? 'normal' as const : undefined,
    wordBreak: 'break-word' as const,
  });

  // ★ 성능 최적화: 사전 계산된 merged 캐시 사용 (O(n) 루프 제거)
  const isInMergedRange = (type: 'fe' | 'fc'): boolean => {
    if (merged) return type === 'fe' ? merged.fe : merged.fc;
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

  // ★ FM 기반 역전개 (공정 기능, 설계특성)
  const fmFunctionCols = ['공정 기능', '설계특성'];
  if (fmFunctionCols.includes(col.name)) {
    if (row.isFirstRow) {
      let value = '';
      if (col.name === '공정 기능') value = fmGroup.fmProcessFunction || '';
      else if (col.name === '설계특성') value = fmGroup.fmProductChar || '';
      
      return (
        <td key={colIdx} rowSpan={fmGroup.fmRowSpan} style={cellStyle(fmGroup.fmRowSpan)}>
          {value}
        </td>
      );
    }
    return null;
  }

  // ★ FC 기반 역전개 (부품(컴포넌트) 기능, 설계파라미터)
  const fcFunctionCols = ['부품(컴포넌트) 기능', '설계파라미터'];
  if (fcFunctionCols.includes(col.name)) {
    // 누적 범위 체크: 이전 행의 fcRowSpan 범위 안에 있으면 렌더링하지 않음
    if (rowInFM === 0 || !isInMergedRange('fc')) {
      let value = '';
      if (col.name === '부품(컴포넌트) 기능') value = row.fcWorkFunction || '';
      else if (col.name === '설계파라미터') value = row.fcProcessChar || '';
      
      return (
        <td key={colIdx} rowSpan={row.fcRowSpan} style={cellStyle(row.fcRowSpan, true)}>
          {value}
        </td>
      );
    }
    return null;
  }

  return null;
});

