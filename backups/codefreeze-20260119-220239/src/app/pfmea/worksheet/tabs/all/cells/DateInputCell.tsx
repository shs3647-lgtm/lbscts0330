// @ts-nocheck
/**
 * @file cells/DateInputCell.tsx
 * @description 날짜 입력 셀 (목표완료일자, 완료일자)
 */
'use client';

import React from 'react';
import { DateInputCellProps, HEIGHTS } from './types';
import { WorksheetState } from '../../../constants';

export function DateInputCell({
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
}: DateInputCellProps) {
  const key = `${field}-${globalRowIdx}`;
  const value = state?.riskData?.[key] as string || '';

  const handleDoubleClick = () => {
    if (!setState) {
      console.error('setState가 없습니다.');
      return;
    }
    const newValue = prompt(`${label}을(를) 입력하세요 (YYYY-MM-DD):`, value);
    if (newValue !== null) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (newValue && !dateRegex.test(newValue)) {
        alert('날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)');
        return;
      }
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

