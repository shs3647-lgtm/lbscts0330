/**
 * @file StructureCellRenderer.tsx
 * @description 구조분석(2단계) 셀 렌더링 - 완제품공정명, NO+공정명, 4M, 작업요소
 * @updated 2026-01-11 - 셀 스타일 최적화 (패딩 1px, 폰트 120% 한줄)
 */
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { HEIGHTS, CELL_STYLE, STEP_DIVIDER, STEP_FIRST_BASE_IDS, COMPACT_CELL_STYLE, COMPACT_HEIGHTS, GROUP_DIVIDER, getBaseId } from './allTabConstants';

interface ColumnDef {
  id: number;
  baseId?: number;
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
  isCompact?: boolean;
  merged?: { fe: boolean; fc: boolean; fm: boolean };
  groupFirstIds?: number[];
}

export const StructureCellRenderer = React.memo(function StructureCellRendererInner({
  col,
  colIdx,
  fmGroup,
  fmIdx,
  row,
  rowInFM,
  globalRowIdx,
  l1ProductName,
  isCompact,
  merged,
  groupFirstIds,
}: StructureCellRendererProps): React.ReactElement | null {
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  const isStepFirst = STEP_FIRST_BASE_IDS.includes(getBaseId(col));
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
  const isInMergedRange = (): boolean => {
    if (merged) return merged.fc;
    // fallback: merged 캐시 미제공 시 기존 O(n) 방식
    for (let prevIdx = 0; prevIdx < rowInFM; prevIdx++) {
      const prevRow = fmGroup.rows[prevIdx];
      if (!prevRow) continue;
      if (prevRow.fcRowSpan > 1 && prevIdx + prevRow.fcRowSpan > rowInFM) return true;
    }
    return false;
  };

  const bid = getBaseId(col);

  // ★ 완제품 공정명/시스템명 (id=1) - FM 전체 병합
  if (bid === 1) {
    if (row.isFirstRow) {
      const suffix = isDfmea ? '' : ' 생산공정';
      const productDisplay = l1ProductName ? `${l1ProductName}${suffix}` : '';
      return (
        <td key={colIdx} rowSpan={fmGroup.fmRowSpan} style={cellStyle(fmGroup.fmRowSpan)}>
          {productDisplay}
        </td>
      );
    }
    return null;
  }

  // ★ NO+공정명/NO+초점요소 (id=2) - FM 전체 병합
  if (bid === 2) {
    if (row.isFirstRow) {
      const suffix = isDfmea ? '' : ' 생산공정';
      const processDisplay = fmGroup.fmProcessNo && fmGroup.fmProcessName
        ? `${fmGroup.fmProcessNo}. ${fmGroup.fmProcessName}${suffix}`
        : fmGroup.fmProcessName ? `${fmGroup.fmProcessName}${suffix}` : '';
      return (
        <td key={colIdx} rowSpan={fmGroup.fmRowSpan} style={cellStyle(fmGroup.fmRowSpan)}>
          {processDisplay}
        </td>
      );
    }
    return null;
  }

  // ★ 4M/Type (id=3) - FC별 병합 (누적 범위 체크)
  if (bid === 3) {
    if (rowInFM === 0 || !isInMergedRange()) {
      return (
        <td key={colIdx} rowSpan={row.fcRowSpan} style={{ ...cellStyle(row.fcRowSpan, true), textAlign: 'center' }}>
          {row.fcM4 || ''}
        </td>
      );
    }
    return null;
  }

  // ★ 작업요소/부품 (id=4) - FC별 병합 (누적 범위 체크)
  if (bid === 4) {
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
});

