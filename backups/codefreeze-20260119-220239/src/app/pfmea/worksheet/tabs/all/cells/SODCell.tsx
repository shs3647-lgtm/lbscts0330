// @ts-nocheck
/**
 * @file cells/SODCell.tsx
 * @description 심각도, 발생도, 검출도 셀 렌더링
 */
'use client';

import React from 'react';
import { SODCellProps, HEIGHTS } from './types';

export function SODCell({
  colIdx,
  globalRowIdx,
  rowSpan,
  cellColor,
  cellAltColor,
  align,
  category,
  targetType,
  state,
  onSODClick,
}: SODCellProps) {
  const key = `${targetType}-${globalRowIdx}-${category}`;
  const currentValue = state?.riskData?.[key] as number | undefined;

  return (
    <td
      key={colIdx}
      rowSpan={rowSpan}
      onDoubleClick={() => onSODClick(category, targetType, globalRowIdx, currentValue)}
      style={{
        background: globalRowIdx % 2 === 0 ? cellColor : cellAltColor,
        height: `${HEIGHTS.body}px`,
        padding: '3px 4px',
        border: '1px solid #ccc',
        fontSize: '11px',
        textAlign: align,
        verticalAlign: 'middle',
        cursor: 'pointer',
        fontWeight: currentValue ? 700 : 400,
      }}
    >
      {currentValue || ''}
    </td>
  );
}










