/**
 * @file cells/TextInputCell.tsx
 * @description 텍스트 입력 셀 (습득교훈, 개선결과근거, 책임자성명, 비고)
 */
'use client';

import React from 'react';
import { TextInputCellProps, HEIGHTS } from './types';
import { WorksheetState } from '../../../constants';

export function TextInputCell({
  colIdx,
  globalRowIdx,
  rowSpan,
  cellColor,
  cellAltColor,
  align,
  field,
  label,
  state,
  setState,
  setDirty,
}: TextInputCellProps) {
  const key = `${field}-${globalRowIdx}`;
  const value = state?.riskData?.[key] as string || '';

  const handleDoubleClick = () => {
    if (!setState) {
      return;
    }
    const newValue = prompt(`${label}을(를) 입력하세요:`, value);
    if (newValue !== null) {
      setState((prev: WorksheetState) => ({
        ...prev,
        riskData: { ...(prev.riskData || {}), [key]: newValue }
      }));
      if (setDirty) setDirty(true);
    }
  };

  return (
    <td
      key={colIdx}
      rowSpan={rowSpan}
      onDoubleClick={handleDoubleClick}
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

