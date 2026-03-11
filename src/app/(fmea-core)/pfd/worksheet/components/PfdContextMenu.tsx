/**
 * @file PfdContextMenu.tsx
 * @description PFD 워크시트 컨텍스트 메뉴 (CP와 동일한 기능)
 * @updated 2026-01-27 - 병합/해제/Undo/Redo 추가
 */

import React from 'react';
import { ContextMenuState, ContextMenuType } from '../types';

interface PfdContextMenuProps {
  contextMenu: ContextMenuState;
  onClose: () => void;
  onInsertAbove: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  onInsertBelow: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  onDelete: (rowIdx: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onMergeUp: (rowIdx: number, colKey?: string) => void;
  onMergeDown: (rowIdx: number, colKey?: string) => void;
  onUnmerge: (rowIdx: number, colKey?: string) => void;
  undoCount: number;
  redoCount: number;
}

export function PfdContextMenu({
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
}: PfdContextMenuProps) {
  if (!contextMenu.visible) return null;

  const { rowIdx, type, colKey } = contextMenu;

  // 타입 라벨
  const getTypeLabel = () => {
    switch (type) {
      case 'process': return '📋 공정설명 기준(Process Desc)';
      case 'work': return '📦 부품명 기준(Part Name)';
      case 'equipment': return '🔧 설비/금형/지그 기준(Equipment)';
      case 'char': return '📊 특성 기준(Characteristic)';
      case 'general': return '📝 일반(General)';
    }
  };

  // 병합 가능한 컬럼
  const isMergeableColumn = ['processNo', 'processName', 'processLevel', 'processDesc', 'workElement', 'equipment', 'productChar', 'processChar'].includes(colKey || '');

  // 핸들러
  const handleInsertAbove = () => {
    onInsertAbove(rowIdx, type, colKey);
    onClose();
  };

  const handleInsertBelow = () => {
    onInsertBelow(rowIdx, type, colKey);
    onClose();
  };

  const handleDelete = () => {
    onDelete(rowIdx);
    onClose();
  };

  const handleMergeUp = () => {
    onMergeUp(rowIdx, colKey);
    onClose();
  };

  const handleMergeDown = () => {
    onMergeDown(rowIdx, colKey);
    onClose();
  };

  const handleUnmerge = () => {
    onUnmerge(rowIdx, colKey);
    onClose();
  };

  const handleUndo = () => {
    onUndo();
    onClose();
  };

  const handleRedo = () => {
    onRedo();
    onClose();
  };

  return (
    <>
      {/* 오버레이 (CP와 동일한 z-index) */}
      <div
        className="fixed inset-0 z-[200]"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />

      {/* 메뉴 (CP와 동일한 z-index) */}
      <div
        className="fixed z-[201] bg-white border border-gray-300 rounded-lg shadow-lg py-2 min-w-56"
        style={{
          left: contextMenu.x,
          top: contextMenu.y,
        }}
      >
        {/* 헤더 - 타입 표시 */}
        <div className="px-4 py-1 text-xs text-gray-500 border-b border-gray-200 mb-1">
          {getTypeLabel()} (행(Row) {rowIdx + 1})
        </div>

        {/* 행 추가 */}
        <button
          onClick={handleInsertAbove}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
        >
          <span>⬆️</span> 위로 행 추가(Insert Above)
        </button>
        <button
          onClick={handleInsertBelow}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
        >
          <span>⬇️</span> 아래로 행 추가(Insert Below)
        </button>

        <div className="border-t border-gray-200 my-1" />

        {/* 행 삭제 */}
        <button
          onClick={handleDelete}
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        >
          <span>🗑️</span> 행 삭제(Delete Row)
        </button>

        {/* 병합 메뉴 (병합 가능한 컬럼인 경우에만) */}
        {isMergeableColumn && (
          <>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={handleMergeUp}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2"
              disabled={rowIdx === 0}
            >
              <span>🔗</span> 위 행과 병합(Merge Up)
            </button>
            <button
              onClick={handleMergeDown}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2"
            >
              <span>🔗</span> 아래 행과 병합(Merge Down)
            </button>
            <button
              onClick={handleUnmerge}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <span>✂️</span> 셀 병합 해제(Unmerge)
            </button>
          </>
        )}

        {/* Undo/Redo */}
        <div className="border-t border-gray-200 my-1" />
        <button
          onClick={handleUndo}
          disabled={undoCount === 0}
          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${undoCount > 0 ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
            }`}
        >
          <span>↩️</span> 실행취소(Undo) ({undoCount})
        </button>
        <button
          onClick={handleRedo}
          disabled={redoCount === 0}
          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${redoCount > 0 ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
            }`}
        >
          <span>↪️</span> 다시실행(Redo) ({redoCount})
        </button>
      </div>
    </>
  );
}