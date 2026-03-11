/**
 * @file components/AutoInputModal.tsx
 * @description CP 워크시트 자동 입력 모달
 */

import React from 'react';
import { AutoModalState, ContextMenuType } from '../types';

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
  if (!modal.visible) return null;
  
  const getTypeLabel = () => {
    switch (modal.type) {
      case 'process': return '📋 공정설명 기준';
      case 'work': return '🔧 설비/금형/JIG 기준';
      case 'char': return '📊 제품특성 기준';
    }
  };
  
  const getParentFields = () => {
    switch (modal.type) {
      case 'process': return ' 공정번호, 공정명';
      case 'work': return ' 공정번호, 공정명, 레벨, 공정설명';
      case 'char': return ' 공정번호, 공정명, 레벨, 공정설명, 설비/금형/JIG';
    }
  };
  
  return (
    <>
      {/* 배경 */}
      <div 
        className="fixed inset-0 bg-black/50 z-[300]"
        onClick={onClose}
      />
      {/* 모달 */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] bg-white rounded-lg shadow-2xl p-4 min-w-[320px]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🤖</span>
          <h3 className="text-lg font-bold text-gray-800">자동 행 추가</h3>
        </div>
        
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
    </>
  );
}



