/**
 * @file cells/SODCell.tsx
 * @description 심각도, 발생도, 검출도 셀 렌더링
 * - 배경색: 해당 컬럼의 레벨 색상 (props로 전달)
 * - 글씨색: 점수별 (1-3녹색, 4-6주황, 7-10빨강)
 */
'use client';

import React from 'react';
import { SODCellProps, HEIGHTS } from './types';
import { getSODTextColor } from '../allTabConstants';

export function SODCell({
  colIdx,
  globalRowIdx,
  rowSpan,
  cellColor,    // ★ 해당 레벨의 배경색
  cellAltColor, // ★ 해당 레벨의 대체 배경색
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
        background: globalRowIdx % 2 === 0 ? cellColor : cellAltColor, // ★ 해당 레벨 색상
        color: getSODTextColor(currentValue), // ★ 점수별 글씨색
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


