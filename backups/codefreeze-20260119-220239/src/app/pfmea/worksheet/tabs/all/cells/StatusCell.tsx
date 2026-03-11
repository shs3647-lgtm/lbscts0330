// @ts-nocheck
/**
 * @file cells/StatusCell.tsx
 * @description 상태 선택 셀
 */
'use client';

import React from 'react';
import { StatusCellProps, HEIGHTS } from './types';
import { WorksheetState } from '../../../constants';

const STATUS_OPTIONS = ['대기', '진행중', '완료', '보류'];

export function StatusCell({
  colIdx,
  globalRowIdx,
  rowSpan,
  cellColor,
  cellAltColor,
  align,
  state,
  setState,
  setDirty,
}: StatusCellProps) {
  const key = `status-${globalRowIdx}`;
  const value = state?.riskData?.[key] as string || '';

  const handleDoubleClick = () => {
    if (!setState) {
      console.error('setState가 없습니다.');
      return;
    }
    const selected = prompt(
      `상태를 선택하세요:\n${STATUS_OPTIONS.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}\n\n번호 입력:`,
      value ? String(STATUS_OPTIONS.indexOf(value) + 1) : ''
    );
    if (selected !== null) {
      const idx = parseInt(selected) - 1;
      if (idx >= 0 && idx < STATUS_OPTIONS.length) {
        setState((prev: WorksheetState) => ({
          ...prev,
          riskData: { ...(prev.riskData || {}), [key]: STATUS_OPTIONS[idx] }
        }));
        if (setDirty) setDirty(true);
      } else {
        alert('잘못된 번호입니다.');
      }
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

