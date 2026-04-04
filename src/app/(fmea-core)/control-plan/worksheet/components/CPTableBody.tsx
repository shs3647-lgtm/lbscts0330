/**
 * @file CPTableBody.tsx
 * @description CP 워크시트 테이블 바디 컴포넌트 (데이터 행 + 빈 행)
 * @extracted-from page.tsx (lines 1221-1299)
 */

import React, { memo, useCallback } from 'react';
import { CPItem, SpanInfo, ContextMenuType } from '../types';
import { CP_COLUMNS, HEIGHTS, type CPColumnDef } from '../cpConstants';
import { renderCell } from '../renderers';
import { createEmptyItem } from '../utils';

interface CPTableBodyProps {
    /** 동적 컬럼 배열 (부품명 모드에 따라 필터링됨) */
    columns?: CPColumnDef[];
    /** 데이터 아이템 배열 */
    items: CPItem[];
    /** CP 번호 */
    cpNo: string;
    /** 공정 rowSpan 맵 */
    processRowSpan: SpanInfo[];
    /** 공정설명 rowSpan 맵 */
    descRowSpan: SpanInfo[];
    /** 부품명 rowSpan 맵 */
    partNameRowSpan: SpanInfo[];
    /** 작업요소 rowSpan 맵 */
    workRowSpan: SpanInfo[];
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
    /** 엔터 키 핸들러 */
    onEnterKey: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
    /** EP 장치 클릭 */
    onEPDeviceClick: (rowIdx: number, category: 'EP' | '자동검사') => void;
    /** 빈 행 클릭 시 행 추가 후 콜백 */
    onAddEmptyRow: (newItem: CPItem) => void;
    /** 상태 업데이트 함수 */
    setState: React.Dispatch<React.SetStateAction<any>>;
    /** 연결된 FMEA ID (CP↔PFMEA 크로스링크) */
    fmeaId?: string;
}

/**
 * CP 워크시트 테이블 바디
 * - 실제 데이터 행 렌더링
 * - 30개 미만일 때 빈 행 표시
 */
function CPTableBodyComponent({
    columns: columnsProp,
    items,
    cpNo,
    processRowSpan,
    descRowSpan,
    partNameRowSpan,
    workRowSpan,
    charRowSpan,
    columnWidths,
    getColumnWidth,
    onCellChange,
    onContextMenu,
    onAutoModeClick,
    onEnterKey,
    onEPDeviceClick,
    onAddEmptyRow,
    setState,
    fmeaId,
}: CPTableBodyProps) {

    // 빈 행 클릭 핸들러 (공정명 열)
    const handleEmptyRowClick = useCallback((itemsLength: number) => {
        const newItem = createEmptyItem(cpNo);
        onAddEmptyRow(newItem);
        // 모달 열기는 약간의 딜레이 후 (상태 업데이트 완료 후)
        setTimeout(() => {
            onAutoModeClick(itemsLength, 'process', 'processName');
        }, 100);
    }, [cpNo, onAddEmptyRow, onAutoModeClick]);

    // 빈 행 우클릭 핸들러
    const handleEmptyRowContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const newItem = createEmptyItem(cpNo);
        onAddEmptyRow(newItem);
    }, [cpNo, onAddEmptyRow]);

    const cols = columnsProp || CP_COLUMNS;

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
                        partNameRowSpan,
                        workRowSpan,
                        charRowSpan,
                        onCellChange,
                        onContextMenu,
                        onAutoModeClick,
                        onEnterKey,
                        columnWidths,
                        onEPDeviceClick,
                        fmeaId,
                    }))}
                </tr>
            ))}

            {/* 기본 30행 빈 행 표시 (데이터가 30개 미만일 때) */}
            {Array.from({ length: Math.max(0, 30 - items.length) }).map((_, idx) => (
                <tr key={`empty-${idx}`}>
                    {cols.map((col, colIdx) => {
                        const isProcessNameCol = col.key === 'processName';
                        const isClickableCol = ['processName', 'processDesc', 'workElement', 'productChar'].includes(col.key);

                        // 빈 행 배경색 (줄무늬)
                        const emptyRowBgColor = (items.length + idx) % 2 === 0
                            ? '#ffffff'
                            : '#fafafa';

                        return (
                            <td
                                key={`empty-${idx}-${col.id}`}
                                className={`border border-gray-200 text-center ${isClickableCol ? 'cursor-pointer hover:bg-blue-50' : 'text-gray-400'}`}
                                style={{
                                    height: HEIGHTS.body,
                                    width: getColumnWidth(col.id),
                                    minWidth: getColumnWidth(col.id),
                                    background: emptyRowBgColor,
                                    ...(colIdx === 0 && { borderLeft: '2px solid #1565c0' }), // ★ 첫 번째 열 좌측 구분선
                                }}
                                onClick={isProcessNameCol ? () => handleEmptyRowClick(items.length) : undefined}
                                onContextMenu={handleEmptyRowContextMenu}
                            >
                                {/* 빈 행에는 NO 번호 표시 안함 */}
                            </td>
                        );
                    })}
                </tr>
            ))}
        </tbody>
    );
}

export const CPTableBody = memo(CPTableBodyComponent);
export default CPTableBody;
