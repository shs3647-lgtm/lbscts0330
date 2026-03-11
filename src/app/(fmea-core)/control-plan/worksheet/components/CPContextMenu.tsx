/**
 * @file components/CPContextMenu.tsx
 * @description CP 워크시트 컨텍스트 메뉴
 * @updated 2026-01-27: 병합, 병합해제, 언두(3), 리두(3) 추가
 */

import React from 'react';
import { ContextMenuState, ContextMenuType } from '../types';

interface CPContextMenuProps {
  contextMenu: ContextMenuState;
  onClose: () => void;
  onInsertAbove: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  onInsertBelow: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  onDelete: (rowIdx: number) => void;
  onUndo?: () => void;       // ★ 언두 (Undo)
  onRedo?: () => void;       // ★ 리두 (Redo)
  onMergeUp?: (rowIdx: number, colKey?: string) => void;      // ★ 위 행과 병합
  onMergeDown?: (rowIdx: number, colKey?: string) => void;    // ★ 아래 행과 병합
  onUnmerge?: (rowIdx: number, colKey?: string) => void;      // ★ 병합해제
  undoCount?: number;        // 언두 가능 횟수 (최대 3)
  redoCount?: number;        // 리두 가능 횟수 (최대 3)
}

export function CPContextMenu({
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
  undoCount = 0,
  redoCount = 0,
}: CPContextMenuProps) {
  if (!contextMenu.visible) return null;

  const getTypeLabel = () => {
    switch (contextMenu.type) {
      case 'process': return '📋 공정설명 기준(Process Desc.)';
      case 'work': return '🔧 설비/금형/JIG 기준(Equipment)';
      case 'char': return '📊 제품특성 기준(Product Char.)';
      case 'part': return '📦 부품명 기준(Part Name)';
      case 'general': return '📝 일반(General)';
    }
  };

  // A, B열인지 확인 (processNo, processName)
  const isABColumn = contextMenu.colKey === 'processNo' || contextMenu.colKey === 'processName';
  const isSpecialColumn = (contextMenu.type === 'process' && !isABColumn) || contextMenu.type === 'work' || contextMenu.type === 'char' || contextMenu.type === 'part' || contextMenu.type === 'general';

  // 병합 가능한 컬럼인지 확인 (공정번호, 공정명, 레벨, 공정설명, 부품명, 설비 등)
  const isMergeableColumn = ['processNo', 'processName', 'processLevel', 'processDesc', 'partName', 'workElement'].includes(contextMenu.colKey || '');

  const handleDelete = () => {
    onDelete(contextMenu.rowIdx);
    onClose();
  };

  const handleUndo = () => {
    if (undoCount > 0 && onUndo) {
      onUndo();
    }
    onClose();
  };

  const handleRedo = () => {
    if (redoCount > 0 && onRedo) {
      onRedo();
    }
    onClose();
  };

  // ★ 위 행과 병합
  const handleMergeUp = () => {
    if (onMergeUp) {
      onMergeUp(contextMenu.rowIdx, contextMenu.colKey);
    }
    onClose();
  };

  // ★ 아래 행과 병합
  const handleMergeDown = () => {
    if (onMergeDown) {
      onMergeDown(contextMenu.rowIdx, contextMenu.colKey);
    }
    onClose();
  };

  const handleUnmerge = () => {
    if (onUnmerge) {
      onUnmerge(contextMenu.rowIdx, contextMenu.colKey);
    }
    onClose();
  };

  // 공통 메뉴 아이템: 언두/리두, 병합/병합해제
  const CommonMenuItems = () => (
    <>
      <div className="border-t border-gray-200 my-1" />

      {/* 병합/병합해제 */}
      {isMergeableColumn && (
        <>
          <button
            onClick={handleMergeUp}
            className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 text-purple-700 flex items-center gap-2"
          >
            🔗 위 행과 병합(Merge Up)
          </button>
          <button
            onClick={handleMergeDown}
            className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 text-purple-700 flex items-center gap-2"
          >
            🔗 아래 행과 병합(Merge Down)
          </button>
          <button
            onClick={handleUnmerge}
            className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 text-orange-700 flex items-center gap-2"
          >
            ✂️ 셀 병합 해제(Unmerge)
          </button>
          <div className="border-t border-gray-200 my-1" />
        </>
      )}

      {/* 언두/리두 */}
      <button
        onClick={handleUndo}
        disabled={undoCount === 0}
        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${undoCount > 0 ? 'hover:bg-yellow-50 text-yellow-700' : 'text-gray-300 cursor-not-allowed'
          }`}
      >
        ↩️ 실행취소 (Undo) {undoCount > 0 && <span className="text-[10px] bg-yellow-100 px-1 rounded">{Math.min(undoCount, 3)}회</span>}
      </button>
      <button
        onClick={handleRedo}
        disabled={redoCount === 0}
        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${redoCount > 0 ? 'hover:bg-green-50 text-green-700' : 'text-gray-300 cursor-not-allowed'
          }`}
      >
        ↪️ 다시실행 (Redo) {redoCount > 0 && <span className="text-[10px] bg-green-100 px-1 rounded">{Math.min(redoCount, 3)}회</span>}
      </button>
    </>
  );

  return (
    <>
      {/* 배경 클릭 시 닫기 */}
      <div
        className="fixed inset-0 z-[200]"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      {/* 메뉴 */}
      <div
        className="fixed z-[201] bg-white border border-gray-300 rounded shadow-lg py-1 min-w-[180px]"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <div className="px-3 py-1 text-[10px] text-gray-500 border-b border-gray-100">
          {getTypeLabel()}
        </div>

        {isABColumn || isSpecialColumn ? (
          <>
            <button
              onClick={() => {
                onInsertAbove(contextMenu.rowIdx, contextMenu.type, contextMenu.colKey);
                onClose();
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center gap-2"
            >
              ⬆️ 위로 행 추가(Insert Above)
            </button>
            <button
              onClick={() => {
                onInsertBelow(contextMenu.rowIdx, contextMenu.type, contextMenu.colKey);
                onClose();
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center gap-2"
            >
              ⬇️ 아래로 행 추가(Insert Below)
            </button>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              🗑️ 행 삭제(Delete Row)
            </button>
            <CommonMenuItems />
          </>
        ) : (
          <>
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              🗑️ 행 삭제(Delete Row)
            </button>
            <CommonMenuItems />
          </>
        )}
      </div>
    </>
  );
}
