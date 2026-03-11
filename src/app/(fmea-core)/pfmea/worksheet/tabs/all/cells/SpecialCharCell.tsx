/**
 * @file cells/SpecialCharCell.tsx
 * @description 특별특성 셀 렌더링 (CC/SC 배지)
 * @created 2026-01-27
 */
'use client';

import React from 'react';
import type { CSSProperties } from 'react';

interface SpecialCharCellProps {
    colIdx: number;
    globalRowIdx: number;
    rowSpan: number;
    cellColor: string;
    cellAltColor: string;
    value: string;
    align?: 'left' | 'center' | 'right';
}

// CC/SC 배지 스타일
const getBadgeStyle = (sc: string): CSSProperties => {
    if (sc === 'CC') return { backgroundColor: '#ef5350', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 };
    if (sc === 'SC') return { backgroundColor: '#ff9800', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 };
    return {};
};

export function SpecialCharCell({
    colIdx,
    globalRowIdx,
    rowSpan,
    cellColor,
    cellAltColor,
    value,
    align = 'center',
}: SpecialCharCellProps) {
    return (
        <td
            key={colIdx}
            rowSpan={rowSpan}
            style={{
                background: globalRowIdx % 2 === 0 ? cellColor : cellAltColor,
                height: '20px',
                padding: '1px',
                border: '1px solid #ccc',
                fontSize: '11px',
                textAlign: align,
                verticalAlign: 'middle',
                cursor: 'default',
            }}
            title={value ? `특별특성: ${value}` : '특별특성 없음'}
        >
            {value ? (
                <span style={getBadgeStyle(value)}>{value}</span>
            ) : (
                ''
            )}
        </td>
    );
}
