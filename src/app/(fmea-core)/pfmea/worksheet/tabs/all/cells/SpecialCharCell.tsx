/**
 * @file cells/SpecialCharCell.tsx
 * @description 특별특성 셀 렌더링 — SC 마스터 기반 동적 기호/색상
 */
'use client';

import type { CSSProperties } from 'react';
import { resolveSpecialChar, getResolvedBadgeStyle } from '@/components/common/SpecialCharBadge';

interface SpecialCharCellProps {
    colIdx: number;
    globalRowIdx: number;
    rowSpan: number;
    cellColor: string;
    cellAltColor: string;
    value: string;
    align?: 'left' | 'center' | 'right';
}

export function SpecialCharCell({
    colIdx,
    globalRowIdx,
    rowSpan,
    cellColor,
    cellAltColor,
    value,
    align = 'center',
}: SpecialCharCellProps) {
    const displayValue = String(value ?? '');
    const resolved = displayValue.trim() ? resolveSpecialChar(displayValue) : null;
    const titleText =
        displayValue.trim() === ''
            ? '특별특성 없음'
            : resolved?.meaning
              ? `특별특성: ${displayValue} — ${resolved.meaning}`
              : `특별특성: ${displayValue}`;

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
            title={titleText}
        >
            {displayValue.trim() ? (
                <span style={getResolvedBadgeStyle(value)}>{displayValue}</span>
            ) : (
                ''
            )}
        </td>
    );
}