/**
 * @file PmTableHeader.tsx
 * @description WS 워크시트 테이블 헤더 (3행 구조)
 */

import React, { memo } from 'react';
import { HEIGHTS, PM_COLUMNS, calculateGroupSpans } from '../pmConstants';

interface ExtensionMergeState {
    all: boolean;
    D: boolean;
    E: boolean;
    F: boolean;
    H: boolean;
}

interface PmTableHeaderProps {
    /** 컬럼 너비 맵 */
    columnWidths: Record<number, number>;
    /** 컬럼 너비 가져오기 */
    getColumnWidth: (colId: number) => number;
    /** 리사이즈 시작 */
    startResize: (colId: number, startX: number) => void;
    /** 컬럼 너비 초기화 */
    resetColumnWidth: (colId: number) => void;
    /** 확장병합 설정 */
    extensionMerge: ExtensionMergeState;
}

/**
 * WS 워크시트 테이블 헤더 (3행)
 * - 1행: 그룹 헤더 (공정현황, 관리항목)
 * - 2행: 컬럼명
 * - 3행: 열번호 (NO, A, B, C...)
 */
function PmTableHeaderComponent({
    columnWidths,
    getColumnWidth,
    startResize,
    resetColumnWidth,
    extensionMerge,
}: PmTableHeaderProps) {
    const groupSpans = calculateGroupSpans(PM_COLUMNS);

    return (
        <thead style={{ background: '#ffffff' }}>
            {/* 1행: 그룹 헤더 */}
            <tr>
                {/* 단계 열 헤더 */}
                <th
                    colSpan={1}
                    className="font-bold text-[12px] text-center sticky top-0 z-30 border border-white"
                    style={{
                        background: '#1565c0',
                        color: '#ffffff',
                        height: HEIGHTS.header1,
                        width: 40,
                        minWidth: 40,
                        padding: 0,
                        margin: 0,
                    }}
                >
                    단계
                </th>
                {/* 나머지 그룹 헤더 */}
                {groupSpans.map((g, idx) => (
                    <th
                        key={idx}
                        colSpan={g.span}
                        className="text-white font-bold text-[12px] text-center sticky top-0 z-30 border border-white"
                        style={{
                            background: g.color,
                            height: HEIGHTS.header1,
                            padding: 0,
                            margin: 0,
                        }}
                    >
                        {g.group}
                    </th>
                ))}
            </tr>

            {/* 2행: 컬럼명 헤더 + 리사이즈 핸들 */}
            <tr>
                {PM_COLUMNS.map(col => {
                    const currentWidth = getColumnWidth(col.id);
                    return (
                        <th
                            key={col.id}
                            className="font-bold text-[12px] text-center border border-gray-300 whitespace-nowrap sticky z-29 relative"
                            style={{
                                width: currentWidth,
                                minWidth: currentWidth,
                                maxWidth: currentWidth,
                                background: col.headerColor,
                                height: HEIGHTS.header2,
                                top: `${HEIGHTS.header1}px`,
                                padding: 0,
                                margin: 0,
                            }}
                            onDoubleClick={() => resetColumnWidth(col.id)}
                        >
                            {col.name}
                            {/* 리사이즈 핸들 */}
                            <div
                                className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500/50"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    startResize(col.id, e.clientX);
                                }}
                            />
                        </th>
                    );
                })}
            </tr>

            {/* 3행: 열번호 (단계, A, B, C...) */}
            <tr>
                {PM_COLUMNS.map((col, idx) => {
                    const colLetter = idx === 0 ? '' : String.fromCharCode(64 + idx);
                    const hasContextMenu = col.key === 'processName' || col.key === 'processDesc' || col.key === 'workElement' || col.key === 'equipment' || col.key === 'productChar';

                    // 병합 토글 상태에 따라 + 표시 결정
                    const showPlusIndicator = (() => {
                        if (!hasContextMenu) return false;
                        if (col.key === 'processDesc') return extensionMerge.D;
                        if (col.key === 'workElement') return extensionMerge.E;
                        if (col.key === 'equipment') return extensionMerge.F;
                        if (col.key === 'productChar') return extensionMerge.H;
                        if (col.key === 'processName') return true;
                        return false;
                    })();

                    let groupBgColor = 'bg-gray-200';
                    if (idx === 0) {
                        groupBgColor = 'bg-blue-200';
                    } else if (idx >= 1 && idx <= 6) {
                        groupBgColor = 'bg-blue-100';
                    } else if (idx >= 7 && idx <= 10) {
                        groupBgColor = 'bg-green-100';
                    }

                    const currentWidth = getColumnWidth(col.id);

                    return (
                        <th
                            key={`col-${col.id}`}
                            className={`${groupBgColor} text-gray-600 font-bold text-[11px] text-center border border-gray-300 sticky z-28`}
                            style={{
                                height: HEIGHTS.header3,
                                width: currentWidth,
                                minWidth: currentWidth,
                                maxWidth: currentWidth,
                                borderBottom: '2px solid #000000',
                                color: idx === 0 ? '#000000' : undefined,
                                top: `${HEIGHTS.header1 + HEIGHTS.header2}px`,
                                fontWeight: 700,
                            }}
                        >
                            {idx === 0 ? (
                                <span style={{ fontWeight: 700, color: '#000000' }}>NO</span>
                            ) : col.key === 'processLevel' ? (
                                <span>
                                    <span>{colLetter}</span>
                                    <span className="text-gray-500 text-[9px] ml-0.5">▼</span>
                                </span>
                            ) : showPlusIndicator ? (
                                <span>
                                    <span className="text-red-600 font-bold text-[12px]">+</span>
                                    <span>{colLetter}</span>
                                </span>
                            ) : (
                                colLetter
                            )}
                        </th>
                    );
                })}
            </tr>
        </thead>
    );
}

export const PmTableHeader = memo(PmTableHeaderComponent);
export default PmTableHeader;
