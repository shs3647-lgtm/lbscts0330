/**
 * @file FunctionCellRenderer.tsx
 * @description 기능분석(3단계) 셀 렌더링 - 구분, 완제품기능, 요구사항, 공정기능, 제품특성, 작업요소기능, 공정특성
 * @updated 2026-01-11 - 셀 스타일 최적화 (패딩 1px, 폰트 120% 한줄)
 */
'use client';

import React from 'react';
import { HEIGHTS, CELL_STYLE, STEP_DIVIDER, STEP_FIRST_COLUMN_IDS, COMPACT_CELL_STYLE, COMPACT_HEIGHTS, GROUP_DIVIDER } from './allTabConstants';

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
  groupFirstIds?: number[];
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
  groupFirstIds,
}: FunctionCellRendererProps): React.ReactElement | null {
  const isStepFirst = STEP_FIRST_COLUMN_IDS.includes(col.id);
  const isGroupFirst = groupFirstIds?.includes(col.id) ?? false;
  const cs = isCompact ? COMPACT_CELL_STYLE : CELL_STYLE;
  const leftBorder = isStepFirst
    ? `${STEP_DIVIDER.borderWidth} ${STEP_DIVIDER.borderStyle} ${STEP_DIVIDER.borderColor}`
    : isGroupFirst
      ? `${GROUP_DIVIDER.borderWidth} ${GROUP_DIVIDER.borderStyle} ${GROUP_DIVIDER.borderColor}`
      : '1px solid #ccc';
  const cellStyle = (rowSpan: number, useGlobalIdx = false) => ({
    background: (useGlobalIdx ? globalRowIdx : fmIdx) % 2 === 0 ? col.cellColor : col.cellAltColor,
    height: isCompact ? undefined : `${HEIGHTS.body}px`,
    minHeight: isCompact ? `${COMPACT_HEIGHTS.body}px` : undefined,
    padding: cs.padding,
    borderTop: '1px solid #ccc',
    borderRight: '1px solid #ccc',
    borderBottom: '1px solid #ccc',
    borderLeft: leftBorder,
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

  // ★ FE 기반 역전개 (구분=5, 완제품기능/시스템기능=6, 요구사항=7)
  const feFunctionIds = [5, 6, 7];
  if (feFunctionIds.includes(col.id)) {
    // ★ rowSpan=0이면 병합된 범위 → 렌더링 안함
    if (row.feRowSpan === 0) return null;
    // 누적 범위 체크: 이전 행의 feRowSpan 범위 안에 있으면 렌더링하지 않음
    if (rowInFM === 0 || !isInMergedRange('fe')) {
      let value = '';
      if (col.id === 5) value = row.feCategory || '';
      else if (col.id === 6) value = row.feFunctionName || '';
      else if (col.id === 7) value = row.feRequirement || '';

      return (
        <td key={colIdx} rowSpan={row.feRowSpan} style={cellStyle(row.feRowSpan)}>
          {value}
        </td>
      );
    }
    return null;
  }

  // ★ FM 기반 역전개 (공정기능/초점요소기능=8, 제품특성=9)
  const fmFunctionIds = [8, 9];
  if (fmFunctionIds.includes(col.id)) {
    if (row.isFirstRow) {
      let value = '';
      if (col.id === 8) value = fmGroup.fmProcessFunction || '';
      else if (col.id === 9) value = fmGroup.fmProductChar || '';

      return (
        <td key={colIdx} rowSpan={fmGroup.fmRowSpan} style={cellStyle(fmGroup.fmRowSpan)}>
          {value}
        </td>
      );
    }
    return null;
  }

  // ★ FC 기반 역전개 (작업요소기능/부품기능=10, 공정특성/설계특성=11)
  const fcFunctionIds = [10, 11];
  if (fcFunctionIds.includes(col.id)) {
    // 누적 범위 체크: 이전 행의 fcRowSpan 범위 안에 있으면 렌더링하지 않음
    if (rowInFM === 0 || !isInMergedRange('fc')) {
      let value = '';
      if (col.id === 10) value = row.fcWorkFunction || '';
      else if (col.id === 11) value = row.fcProcessChar || '';

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

