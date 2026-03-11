// CODEFREEZE
/**
 * @file PfdTableBody.tsx
 * @description PFD 워크시트 테이블 바디 컴포넌트 (데이터 행 + 빈 행)
 * @extracted-from page.tsx (lines 989-1056)
 */

import React, { memo, useCallback, useMemo } from 'react';
import { PfdItem, SpanInfo, ContextMenuType } from '../types';
import { PFD_COLUMNS, HEIGHTS, type PfdColumnDef } from '../pfdConstants';
import { renderCell, buildGroupIndexMap } from '../renderers';
import { createEmptyItem } from '../utils';
import { ChangeMarker } from '@/lib/change-history';

interface PfdTableBodyProps {
    /** 동적 컬럼 배열 (부품명 모드에 따라 필터링됨) */
    columns?: PfdColumnDef[];
    /** 데이터 아이템 배열 */
    items: PfdItem[];
    /** PFD 번호 */
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
 * PFD 워크시트 테이블 바디
 * - 실제 데이터 행 렌더링
 * - 30개 미만일 때 빈 행 표시
 */
function PfdTableBodyComponent({
    columns: columnsProp,
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
}: PfdTableBodyProps) {

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

    const cols = columnsProp || PFD_COLUMNS;

    // ★★★ 최적화: groupIndex 맵 사전 계산 (O(n) 단일 패스) ★★★
    const groupIndexMap = useMemo(() => buildGroupIndexMap(items), [items]);

    return (
        <tbody>
            {/* 실제 데이터 행 */}
            {items.map((item, rowIdx) => (
                <tr key={item.id}>
                    {cols.map(col => renderCell({
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
                        groupIndexMap,
                    }))}
                </tr>
            ))}

            {/* 기본 30행 빈 행 표시 (데이터가 30개 미만일 때) */}
            {Array.from({ length: Math.max(0, 30 - items.length) }).map((_, idx) => (
                <tr key={`empty-${idx}`}>
                    {cols.map((col, colIdx) => {
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
                                    ...(colIdx === 0 && { borderLeft: '2px solid #1565c0' }), // ★ 첫 번째 열 좌측 구분선
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

export const PfdTableBody = memo(PfdTableBodyComponent);
export default PfdTableBody;
