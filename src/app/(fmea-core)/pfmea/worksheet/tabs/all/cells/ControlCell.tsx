/**
 * @file cells/ControlCell.tsx
 * @description 예방관리, 검출관리, 특별특성 셀 렌더링
 */
'use client';

import React from 'react';
import { ControlCellProps, HEIGHTS } from './types';

export function ControlCell({
  colIdx,
  globalRowIdx,
  rowSpan,
  cellColor,
  cellAltColor,
  align,
  type,
  state,
  onOpenModal,
}: ControlCellProps) {
  const key = `${type}-${globalRowIdx}`;
  const value = state?.riskData?.[key] || '';

  return (
    <td
      key={colIdx}
      rowSpan={rowSpan}
      onDoubleClick={() => onOpenModal(type, globalRowIdx)}
      style={{
        background: globalRowIdx % 2 === 0 ? cellColor : cellAltColor,
        height: `${HEIGHTS.body}px`,
        padding: '3px 4px',
        border: '1px solid #ccc',
        fontSize: '11px',
        textAlign: align,
        verticalAlign: 'middle',
        cursor: 'pointer',
      }}
    >
      {value}
    </td>
  );
}










