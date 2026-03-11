// CODEFREEZE
/**
 * @file components/AutoInputModal.tsx
 * @description CP 워크시트 자동 입력 모달 - 플로팅 윈도우
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { AutoModalState, ContextMenuType } from '../types';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface AutoInputModalProps {
  modal: AutoModalState;
  onClose: () => void;
  onPositionChange: (position: 'above' | 'below') => void;
  onInsert: () => void;
}

export function AutoInputModal({
  modal,
  onClose,
  onPositionChange,
  onInsert,
}: AutoInputModalProps) {
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen: modal.visible, width: 500, height: 400, minWidth: 400, minHeight: 280 });

  if (!modal.visible) return null;

  const getTypeLabel = () => {
    switch (modal.type) {
      case 'process': return '📋 공정설명 기준(Process Desc.)';
      case 'work': return '🔧 설비/금형/JIG 기준(Equipment)';
      case 'char': return '📊 제품특성 기준(Product Char.)';
    }
  };

  const getParentFields = () => {
    switch (modal.type) {
      case 'process': return ' 공정번호(P-No), 공정명(Process Name)';
      case 'work': return ' 공정번호(P-No), 공정명(Process Name), 레벨(Level), 공정설명(Process Desc.)';
      case 'char': return ' 공정번호(P-No), 공정명(Process Name), 레벨(Level), 공정설명(Process Desc.), 설비/금형/JIG(Equipment)';
    }
  };

  return typeof document === 'undefined' ? null : createPortal(
    <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 p-4 pb-0 cursor-move" onMouseDown={onDragStart}>
        <span className="text-2xl">🤖</span>
        <h3 className="text-lg font-bold text-gray-800 flex-1">자동 행 추가(Auto Row Add)</h3>
        <button onMouseDown={e => e.stopPropagation()} onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-auto p-4">
        {/* 기준 정보 */}
        <div className="bg-gray-50 rounded p-3 mb-4 text-xs">
          <div className="font-bold text-gray-600 mb-2">
            {getTypeLabel()}
          </div>
          <div className="text-gray-500">
            복사될 부모 필드:{getParentFields()}
          </div>
        </div>

        {/* 위치 선택 */}
        <div className="mb-4">
          <label className="text-sm font-bold text-gray-700 block mb-2">추가 위치</label>
          <div className="flex gap-2">
            <button
              onClick={() => onPositionChange('above')}
              className={`flex-1 py-2 px-3 rounded text-sm font-bold transition-all ${
                modal.position === 'above'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ⬆️ 위로
            </button>
            <button
              onClick={() => onPositionChange('below')}
              className={`flex-1 py-2 px-3 rounded text-sm font-bold transition-all ${
                modal.position === 'below'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ⬇️ 아래로
            </button>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-bold"
          >
            취소
          </button>
          <button
            onClick={onInsert}
            className="flex-1 py-2 px-4 rounded bg-purple-600 text-white hover:bg-purple-700 text-sm font-bold"
          >
            ✅ 행 추가
          </button>
        </div>
      </div>

      {/* 리사이즈 핸들 */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>,
    document.body
  );
}
