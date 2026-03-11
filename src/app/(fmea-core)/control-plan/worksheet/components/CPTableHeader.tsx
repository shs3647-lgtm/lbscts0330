/**
 * @file CPTableHeader.tsx
 * @description CP 워크시트 테이블 헤더 컴포넌트 (3행 구조)
 * - PFD TableHeader와 동일한 sticky 패턴 적용
 */

import React, { memo } from 'react';
import { HEIGHTS, CP_COLUMNS, calculateGroupSpans, type CPColumnDef } from '../cpConstants';

/** 컬럼명을 한글/영어로 분리: "한글(English)" → { ko: "한글", en: "English" } */
function splitKoEn(name: string): { ko: string; en: string } | null {
    const match = name.match(/^(.+?)\(([^)]+)\)$/);
    if (!match) return null;
    return { ko: match[1], en: match[2] };
}

interface CPTableHeaderProps {
    columns?: CPColumnDef[];
    columnWidths: Record<number, number>;
    getColumnWidth: (colId: number) => number;
    startResize: (colId: number, startX: number) => void;
    resetColumnWidth: (colId: number) => void;
}

function CPTableHeaderComponent({
    columns: columnsProp,
    columnWidths,
    getColumnWidth,
    startResize,
    resetColumnWidth,
}: CPTableHeaderProps) {
    const cols = columnsProp || CP_COLUMNS;
    const groupSpans = calculateGroupSpans(cols);

    return (
        <thead style={{ position: 'sticky', top: 0, zIndex: 30, background: '#ffffff' }}>
            {/* 1행: 그룹 헤더 */}
            <tr>
                <th
                    colSpan={1}
                    className="font-bold text-[11px] text-center border border-white"
                    style={{
                        background: '#90caf9',
                        color: '#000000',
                        height: HEIGHTS.header1,
                        width: 40,
                        minWidth: 40,
                        padding: 0,
                        margin: 0,
                        borderLeft: '2px solid #1565c0',
                    }}
                >
                    단계(Step)
                </th>
                {groupSpans.map((g, idx) => {
                    const gKoEn = splitKoEn(g.group);
                    return (
                        <th
                            key={idx}
                            colSpan={g.span}
                            className="text-white font-bold text-center border border-white"
                            style={{
                                background: g.color,
                                height: HEIGHTS.header1,
                                padding: '0 2px',
                                margin: 0,
                                lineHeight: 1.1,
                            }}
                            title={g.group}
                        >
                            {gKoEn ? (
                                <span className="text-[11px]">
                                    {gKoEn.ko}<span className="text-[9px] font-normal opacity-80">({gKoEn.en})</span>
                                </span>
                            ) : (
                                <span className="text-[11px]">{g.group}</span>
                            )}
                        </th>
                    );
                })}
            </tr>

            {/* 2행: 컬럼명 헤더 — 한글(위) + 영어(아래) 줄바꿈 */}
            <tr>
                {cols.map(col => {
                    const currentWidth = getColumnWidth(col.id);
                    const koEn = splitKoEn(col.name);
                    return (
                        <th
                            key={col.id}
                            className="font-bold text-center border border-gray-300"
                            style={{
                                position: 'relative',
                                width: currentWidth,
                                minWidth: currentWidth,
                                maxWidth: currentWidth,
                                background: col.headerColor,
                                height: HEIGHTS.header2,
                                padding: '0 1px',
                                margin: 0,
                                lineHeight: 1.1,
                                ...(col.id === 0 && { borderLeft: '2px solid #1565c0' }),
                            }}
                            onDoubleClick={() => resetColumnWidth(col.id)}
                            title={col.name}
                        >
                            {koEn ? (
                                <div className="flex flex-col items-center justify-center h-full leading-tight">
                                    <span className="text-[11px] font-bold truncate max-w-full">{koEn.ko}</span>
                                    <span className="text-[8px] font-normal text-gray-700 truncate max-w-full">({koEn.en})</span>
                                </div>
                            ) : (
                                <span className="text-[11px]">{col.name}{col.pfmeaSync && <span className="ml-0.5 text-blue-600">*</span>}</span>
                            )}
                            {/* 리사이즈 핸들 */}
                            <div
                                className="absolute top-0 right-0 w-[4px] h-full cursor-col-resize"
                                style={{ zIndex: 40 }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    startResize(col.id, e.clientX);
                                }}
                            />
                        </th>
                    );
                })}
            </tr>

            {/* 3행: 열번호 */}
            <tr>
                {cols.map((col, idx) => {
                    const colLetter = idx === 0 ? '' : String.fromCharCode(64 + idx);
                    const hasContextMenu = col.key === 'processName' || col.key === 'processDesc' || col.key === 'workElement' || col.key === 'productChar';
                    const hasDropdown = col.type === 'select' && (col.key === 'processLevel' || col.key === 'specialChar' || col.key === 'sampleFreq' || col.key === 'owner1' || col.key === 'owner2');

                    let header3Color = '#90caf9';
                    let borderColor = '#1565c0';
                    let textColor = '#1565c0';
                    if (col.group.startsWith('관리항목')) {
                        header3Color = '#a5d6a7';
                        textColor = '#2e7d32';
                        borderColor = '#2e7d32';
                    } else if (col.group.startsWith('관리방법')) {
                        header3Color = '#2dd4bf';
                        textColor = '#00587a';
                        borderColor = '#00587a';
                    } else if (col.group.startsWith('대응계획')) {
                        header3Color = '#c7d2fe';
                        textColor = '#4338ca';
                        borderColor = '#4338ca';
                    }

                    const currentWidth = getColumnWidth(col.id);
                    return (
                        <th
                            key={`col-${col.id}`}
                            className="text-center border border-gray-300 group"
                            style={{
                                position: 'relative',
                                height: HEIGHTS.header3,
                                width: currentWidth,
                                minWidth: currentWidth,
                                maxWidth: currentWidth,
                                background: header3Color,
                                borderBottom: `2px solid ${borderColor}`,
                                fontSize: '11px',
                                fontWeight: 700,
                                color: textColor,
                                ...(idx === 0 && { borderLeft: '2px solid #1565c0' }),
                            }}
                        >
                            {idx === 0 ? (
                                <span style={{ fontWeight: 700, color: '#1565c0' }}>no</span>
                            ) : hasContextMenu ? (
                                <span>
                                    <span className="text-red-600 font-bold">+</span>
                                    <span>{colLetter}</span>
                                </span>
                            ) : hasDropdown ? (
                                <span>
                                    <span>{colLetter}</span>
                                    <span className="text-gray-500 text-[9px] ml-0.5">▼</span>
                                </span>
                            ) : (
                                colLetter
                            )}
                            <div
                                className="absolute top-0 right-0 w-[4px] h-full cursor-col-resize"
                                style={{ zIndex: 40 }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    startResize(col.id, e.clientX);
                                }}
                                onDoubleClick={() => resetColumnWidth(col.id)}
                                title="드래그: 폭 조정 | 더블클릭: 초기화"
                            />
                        </th>
                    );
                })}
            </tr>
        </thead>
    );
}

export const CPTableHeader = memo(CPTableHeaderComponent);
export default CPTableHeader;
