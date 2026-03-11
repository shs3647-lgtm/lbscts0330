/**
 * @file PmTableBody.tsx
 * @description WS 워크시트 테이블 바디 (데이터 행 + 빈 행)
 */

import React, { memo, useCallback } from 'react';
import { PfdItem, SpanInfo, ContextMenuType } from '../types';
import { PM_COLUMNS, HEIGHTS } from '../pmConstants';
import { renderCell } from '../renderers';
import { createEmptyItem } from '../utils';
import { ChangeMarker } from '@/lib/change-history';

interface PmTableBodyProps {
    /** 데이터 아이템 배열 */
    items: PfdItem[];
    /** PFD/WS 번호 */
    pfdNo: string;
    /** 공정 rowSpan 맵 */
    processRowSpan: SpanInfo[];
    /** 공정설명 rowSpan 맵 */
    descRowSpan: SpanInfo[];
    /** 작업요소 rowSpan 맵 */
    workRowSpan: SpanInfo[];
    /** 설비 rowSpan 맵 */
    equipmentRowSpan: SpanInfo[];
    /** 특성 rowSpan 맵 */
    charRowSpan: SpanInfo[];
    /** 컬럼 너비 맵 */
    columnWidths: Record<number, number>;
    /** 컬럼 너비 가져오기 */
    getColumnWidth: (colId: number) => number;
    /** 셀 값 변경 핸들러 */
    onCellChange: (id: string, field: string, value: any) => void;
    /** 컨텍스트 메뉴 열기 */
    onContextMenu: (e: React.MouseEvent, rowIdx: number, type: ContextMenuType, colKey?: string) => void;
    /** 자동 모드 클릭 */
    onAutoModeClick: (rowIdx: number, mode: ContextMenuType, colKey?: string) => void;
    /** 입력 모드 (수동/자동) */
    inputMode: 'manual' | 'auto';
    /** 변경 마커 */
    changeMarkers: ChangeMarker;
    /** 빈 행 클릭 시 행 추가 후 콜백 */
    onAddEmptyRow: (newItem: PfdItem) => void;
    /** 상태 업데이트 함수 */
    setState: React.Dispatch<React.SetStateAction<any>>;
}

/**
 * WS 워크시트 테이블 바디
 */
function PmTableBodyComponent({
    items,
    pfdNo,
    processRowSpan,
    descRowSpan,
    workRowSpan,
    equipmentRowSpan,
    charRowSpan,
    columnWidths,
    getColumnWidth,
    onCellChange,
    onContextMenu,
    onAutoModeClick,
    inputMode,
    changeMarkers,
    onAddEmptyRow,
    setState,
}: PmTableBodyProps) {

    // 빈 행 우클릭 핸들러
    const handleEmptyRowContextMenu = useCallback((e: React.MouseEvent, colKey: string) => {
        e.preventDefault();
        const newItem = createEmptyItem(pfdNo);
        const newRowIdx = items.length;
        onAddEmptyRow(newItem);
        // 컨텍스트 메뉴 열기
        setTimeout(() => {
            onContextMenu(e, newRowIdx, 'process', colKey);
        }, 50);
    }, [pfdNo, items.length, onAddEmptyRow, onContextMenu]);

    return (
        <tbody>
            {/* 실제 데이터 행 */}
            {items.map((item, rowIdx) => (
                <tr key={item.id}>
                    {PM_COLUMNS.map(col => renderCell({
                        item,
                        col,
                        rowIdx,
                        items,
                        processRowSpan,
                        descRowSpan,
                        workRowSpan,
                        equipmentRowSpan,
                        charRowSpan,
                        onCellChange,
                        onContextMenu,
                        onAutoModeClick,
                        columnWidths,
                        inputMode,
                        changeMarkers,
                    }))}
                </tr>
            ))}

            {/* 기본 30행 빈 행 표시 (데이터가 30개 미만일 때) */}
            {Array.from({ length: Math.max(0, 30 - items.length) }).map((_, idx) => (
                <tr key={`empty-${idx}`}>
                    {PM_COLUMNS.map((col, colIdx) => {
                        const emptyRowBgColor = (items.length + idx) % 2 === 0
                            ? '#ffffff'
                            : '#fafafa';
                        const currentWidth = getColumnWidth(col.id);

                        return (
                            <td
                                key={`empty-${idx}-${col.id}`}
                                className="border border-gray-200 text-center cursor-pointer hover:bg-blue-50"
                                style={{
                                    height: HEIGHTS.body,
                                    width: currentWidth,
                                    minWidth: currentWidth,
                                    background: emptyRowBgColor,
                                }}
                                onContextMenu={(e) => handleEmptyRowContextMenu(e, col.key)}
                            >
                            </td>
                        );
                    })}
                </tr>
            ))}
        </tbody>
    );
}

export const PmTableBody = memo(PmTableBodyComponent);
export default PmTableBody;
