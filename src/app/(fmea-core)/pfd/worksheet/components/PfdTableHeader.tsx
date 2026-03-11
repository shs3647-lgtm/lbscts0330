/**
 * @file PfdTableHeader.tsx
 * @description PFD 워크시트 테이블 헤더 컴포넌트 (3행 구조)
 * @extracted-from page.tsx (lines 847-986)
 */

import React, { memo } from 'react';
import { HEIGHTS, PFD_COLUMNS, calculateGroupSpans, type PfdColumnDef } from '../pfdConstants';

/** 컬럼명을 한글/영어로 분리: "한글(English)" → { ko: "한글", en: "English" } */
function splitKoEn(name: string): { ko: string; en: string } | null {
  const match = name.match(/^(.+?)\(([^)]+)\)$/);
  if (!match) return null;
  return { ko: match[1], en: match[2] };
}

interface ExtensionMergeState {
    all: boolean;
    D: boolean;
    E: boolean;
    F: boolean;
    H: boolean;
}

interface PfdTableHeaderProps {
    /** 동적 컬럼 배열 (부품명 모드에 따라 필터링됨) */
    columns?: PfdColumnDef[];
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
 * PFD 워크시트 테이블 헤더 (3행)
 * - 1행: 그룹 헤더 (공정현황, 관리항목)
 * - 2행: 컬럼명
 * - 3행: 열번호 (NO, A, B, C...)
 */
function PfdTableHeaderComponent({
    columns: columnsProp,
    columnWidths,
    getColumnWidth,
    startResize,
    resetColumnWidth,
    extensionMerge,
}: PfdTableHeaderProps) {
    const cols = columnsProp || PFD_COLUMNS;
    const groupSpans = calculateGroupSpans(cols);

    return (
        <thead style={{ position: 'sticky', top: 0, zIndex: 30, background: '#ffffff' }}>
            {/* 1행: 그룹 헤더 */}
            <tr>
                {/* 단계 열 헤더 */}
                <th
                    colSpan={1}
                    className="font-bold text-[12px] text-center border border-white"
                    style={{
                        background: '#1565c0',
                        color: '#ffffff',
                        height: HEIGHTS.header1,
                        width: 40,
                        minWidth: 40,
                        padding: 0,
                        margin: 0,
                        borderLeft: '2px solid #1565c0', // ★ 워크시트 구분선
                    }}
                    title="Step"
                >
                    단계(Step)
                </th>
                {/* 나머지 그룹 헤더 — 한글(영어) 줄바꿈 */}
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
                                <span className="text-[12px]">{g.group}</span>
                            )}
                        </th>
                    );
                })}
            </tr>

            {/* 2행: 컬럼명 헤더 + 리사이즈 핸들 — 한글(위) + 영어(아래) 줄바꿈 */}
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
                                <span className="text-[11px]">{col.name}</span>
                            )}
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
                {cols.map((col, idx) => {
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
                            className={`${groupBgColor} text-gray-600 font-bold text-[11px] text-center border border-gray-300`}
                            style={{
                                height: HEIGHTS.header3,
                                width: currentWidth,
                                minWidth: currentWidth,
                                maxWidth: currentWidth,
                                borderBottom: '2px solid #000000',
                                color: idx === 0 ? '#000000' : undefined,
                                fontWeight: 700,
                                ...(idx === 0 && { borderLeft: '2px solid #1565c0' }), // ★ 첫 번째 열 좌측 구분선
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

export const PfdTableHeader = memo(PfdTableHeaderComponent);
export default PfdTableHeader;
