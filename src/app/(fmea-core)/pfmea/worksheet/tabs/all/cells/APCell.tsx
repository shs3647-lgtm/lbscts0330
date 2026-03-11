/**
 * @file cells/APCell.tsx
 * @description AP(Action Priority) 셀 렌더링
 */
'use client';

import React from 'react';
import { APCellProps, HEIGHTS } from './types';
import { calculateAP } from '../apCalculator';

export function APCell({
  colIdx,
  globalRowIdx,
  rowSpan,
  cellColor,
  cellAltColor,
  align,
  stage,
  severity,
  occurrence,
  detection,
  onAPClick,
}: APCellProps) {
  const rawApValue = calculateAP(severity, occurrence, detection);
  const apValue: 'H' | 'M' | 'L' | null = rawApValue === '' ? null : rawApValue as 'H' | 'M' | 'L';

  const getAPColor = (ap: 'H' | 'M' | 'L' | null) => {
    if (ap === 'H') return '#ef5350';
    if (ap === 'M') return '#ffeb3b';
    if (ap === 'L') return '#66bb6a';
    return globalRowIdx % 2 === 0 ? cellColor : cellAltColor;
  };

  return (
    <td
      key={colIdx}
      rowSpan={rowSpan}
      onDoubleClick={() => {
        if (apValue) {
          onAPClick(stage, [{
            id: `ap-${globalRowIdx}`,
            processName: '',
            failureMode: '',
            failureCause: '',
            severity,
            occurrence,
            detection,
            ap: apValue,
          }]);
        }
      }}
      style={{
        background: getAPColor(apValue),
        color: apValue ? '#000' : 'inherit',
        height: `${HEIGHTS.body}px`,
        padding: '3px 4px',
        border: '1px solid #ccc',
        fontSize: '11px',
        textAlign: align,
        verticalAlign: 'middle',
        cursor: 'pointer',
        fontWeight: apValue ? 700 : 400,
      }}
    >
      {apValue || ''}
    </td>
  );
}

