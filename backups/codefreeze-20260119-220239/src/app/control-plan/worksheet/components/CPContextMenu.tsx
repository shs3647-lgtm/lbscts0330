/**
 * @file components/CPContextMenu.tsx
 * @description CP 워크시트 컨텍스트 메뉴
 */

import React from 'react';
import { ContextMenuState, ContextMenuType } from '../types';

interface CPContextMenuProps {
  contextMenu: ContextMenuState;
  onClose: () => void;
  onInsertAbove: (rowIdx: number, type: ContextMenuType) => void;
  onInsertBelow: (rowIdx: number, type: ContextMenuType, colKey?: string) => void;
  onDelete: (rowIdx: number) => void;
  onCancel?: () => void;
}

export function CPContextMenu({
  contextMenu,
  onClose,
  onInsertAbove,
  onInsertBelow,
  onDelete,
  onCancel,
}: CPContextMenuProps) {
  if (!contextMenu.visible) return null;
  
  const [deleteClickCount, setDeleteClickCount] = React.useState(0);
  const [cancelClickCount, setCancelClickCount] = React.useState(0);
  
  const getTypeLabel = () => {
    switch (contextMenu.type) {
      case 'process': return '📋 공정설명 기준';
      case 'work': return '🔧 설비/금형/JIG 기준';
      case 'char': return '📊 제품특성 기준';
      case 'general': return '📝 일반';
    }
  };
  
  // A, B열인지 확인 (processNo, processName)
  const isABColumn = contextMenu.colKey === 'processNo' || contextMenu.colKey === 'processName';
  const isSpecialColumn = (contextMenu.type === 'process' && !isABColumn) || contextMenu.type === 'work' || contextMenu.type === 'char';
  
  const handleDelete = () => {
    // 모든 열: 횟수 제한 없이 바로 삭제
    onDelete(contextMenu.rowIdx);
    onClose();
  };
  
  const handleCancel = () => {
    if (cancelClickCount < 2) {
      setCancelClickCount(prev => prev + 1);
    } else {
      if (onCancel) onCancel();
      setCancelClickCount(0);
      onClose();
    }
  };
  
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
        className="fixed z-[201] bg-white border border-gray-300 rounded shadow-lg py-1 min-w-[160px]"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <div className="px-3 py-1 text-[10px] text-gray-500 border-b border-gray-100">
          {getTypeLabel()}
        </div>
        {isABColumn ? (
          <>
            <button
              onClick={() => {
                onInsertBelow(contextMenu.rowIdx, contextMenu.type, contextMenu.colKey);
                onClose();
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center gap-2"
            >
              ⬇️ 아래로 행 추가
            </button>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              🗑️ 행 삭제
            </button>
            <button
              onClick={handleCancel}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"
            >
              ❌ 취소(Undo:3회) {cancelClickCount > 0 && `(${cancelClickCount + 1}/3)`}
            </button>
          </>
        ) : isSpecialColumn ? (
          <>
            <button
              onClick={() => {
                onInsertAbove(contextMenu.rowIdx, contextMenu.type);
                onClose();
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center gap-2"
            >
              ⬆️ 위로 행 추가
            </button>
            <button
              onClick={() => {
                onInsertBelow(contextMenu.rowIdx, contextMenu.type, contextMenu.colKey);
                onClose();
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center gap-2"
            >
              ⬇️ 아래로 행 추가
            </button>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              🗑️ 행 삭제
            </button>
            <button
              onClick={handleCancel}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"
            >
              ❌ 취소(Undo:3회) {cancelClickCount > 0 && `(${cancelClickCount + 1}/3)`}
            </button>
          </>
        ) : (
          <>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              🗑️ 행 삭제
            </button>
            <button
              onClick={handleCancel}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"
            >
              ❌ 취소(Undo:3회) {cancelClickCount > 0 && `(${cancelClickCount + 1}/3)`}
            </button>
          </>
        )}
      </div>
    </>
  );
}



