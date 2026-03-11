/**
 * @file PmContextMenu.tsx
 * @description WS 워크시트 우클릭 메뉴
 */

import React, { useEffect, useRef } from 'react';
import { ContextMenuState } from '../types'; // WS types

interface PmContextMenuProps {
    contextMenu: ContextMenuState;
    onClose: () => void;
    onInsertAbove: (rowIdx: number) => void;
    onInsertBelow: (rowIdx: number) => void;
    onDelete: (rowIdx: number) => void;
    onUndo: () => void;
    onRedo: () => void;
    onMergeUp: (rowIdx: number, colKey: string) => void;
    onMergeDown: (rowIdx: number, colKey: string) => void;
    onUnmerge: (rowIdx: number, colKey: string) => void;
    undoCount: number;
    redoCount: number;
}

function PmContextMenuInner({
    contextMenu,
    onClose,
    onInsertAbove,
    onInsertBelow,
    onDelete,
    onUndo,
    onRedo,
    onMergeUp,
    onMergeDown,
    onUnmerge,
    undoCount,
    redoCount,
}: PmContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (contextMenu.visible) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [contextMenu.visible, onClose]);

    if (!contextMenu.visible) return null;

    const { x, y, rowIdx, colKey } = contextMenu;

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-white border border-gray-200 shadow-lg rounded-md py-1 min-w-[160px] text-xs"
            style={{ top: y, left: x }}
        >
            <div className="px-3 py-1.5 text-gray-400 border-b border-gray-100 font-bold bg-gray-50">
                행 {rowIdx + 1} 작업
            </div>

            <button
                onClick={() => { onInsertAbove(rowIdx); onClose(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-gray-700 flex items-center gap-2"
            >
                <span>⬆️</span> 위로 행 추가
            </button>
            <button
                onClick={() => { onInsertBelow(rowIdx); onClose(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-gray-700 flex items-center gap-2"
            >
                <span>⬇️</span> 아래로 행 추가
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button
                onClick={() => { onDelete(rowIdx); onClose(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
                <span>🗑️</span> 행 삭제
            </button>

            {/* Undo/Redo */}
            <div className="my-1 border-t border-gray-100" />
            <button
                onClick={() => { onUndo(); onClose(); }}
                disabled={undoCount === 0}
                className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${undoCount > 0 ? 'hover:bg-blue-50 text-gray-700' : 'text-gray-300'
                    }`}
            >
                <span>↩️</span> 실행 취소 ({undoCount})
            </button>
            <button
                onClick={() => { onRedo(); onClose(); }}
                disabled={redoCount === 0}
                className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${redoCount > 0 ? 'hover:bg-blue-50 text-gray-700' : 'text-gray-300'
                    }`}
            >
                <span>↪️</span> 다시 실행 ({redoCount})
            </button>

            {/* 병합/분할 (병합 가능한 컬럼인 경우만) */}
            {colKey && ['D', 'E', 'F', 'H'].includes(colKey) && (
                <>
                    <div className="my-1 border-t border-gray-100" />
                    <div className="px-3 py-1 text-[10px] text-gray-400 font-bold">셀 병합/분할 ({colKey})</div>
                    <button
                        onClick={() => { onMergeUp(rowIdx, colKey); onClose(); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-gray-700 flex items-center gap-2"
                    >
                        <span>🔼</span> 위와 병합
                    </button>
                    <button
                        onClick={() => { onMergeDown(rowIdx, colKey); onClose(); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-gray-700 flex items-center gap-2"
                    >
                        <span>🔽</span> 아래와 병합
                    </button>
                    <button
                        onClick={() => { onUnmerge(rowIdx, colKey); onClose(); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-gray-700 flex items-center gap-2"
                    >
                        <span>❌</span> 병합 해제
                    </button>
                </>
            )}
        </div>
    );
}

const PmContextMenu = React.memo(PmContextMenuInner);
export default PmContextMenu;
