/**
 * @file L1FunctionSelectModal.tsx
 * @description 완제품기능(C2) / 요구사항(C3) 선택 모달
 * 작업요소(WorkElementSelectModal.tsx) UI/UX 완전 벤치마킹
 * @created 2026-03-27
 */

'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useDraggableModal } from '@/components/modals/useDraggableModal';
import { MODAL_COMPACT, getParentInfoClass } from '@/styles/modal-compact';
import { useL1FunctionSelect, L1FunctionSelectModalProps, L1FunctionItem } from './useL1FunctionSelect';

export function L1FunctionSelectModal(props: L1FunctionSelectModalProps) {
  const {
    elements,
    selectedIds,
    worksheetItemIds,
    inputValue,
    setInputValue,
    inputRef,
    filteredElements,
    appliedElements,
    notAppliedElements,
    exactMatch,
    toggleSelect,
    handleApply,
    handleKeyDown,
    handleDelete,
    handleRemoveFromList,
    selectAppliedElements,
    deselectAppliedElements,
    selectNotAppliedElements,
    deselectNotAppliedElements,
    selectAll,
    deselectAll,
    getHintMessage,
  } = useL1FunctionSelect(props);

  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 60, right: 200 }, modalWidth: 620, modalHeight: 550, isOpen: props.isOpen });

  if (!props.isOpen) return null;
  if (typeof document === 'undefined') return null;

  const typeLabel = props.type === 'C2' ? '완제품기능' : '요구사항';
  const typeEmoji = props.type === 'C2' ? '📋' : '📝';
  const categoryLabel = props.category || 'YP';
  const parentInfo = props.type === 'C3' && props.parentName ? props.parentName : '';
  
  // 헤더 색상 (C2: 보라색, C3: 빨간색)
  const headerGradient = props.type === 'C2' 
    ? 'from-purple-500 to-purple-600' 
    : 'from-red-500 to-red-600';
  const headerAccent = props.type === 'C2' ? 'text-purple-200' : 'text-yellow-300';

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] pointer-events-none" />
      <div
        className="fixed bg-white rounded-lg shadow-2xl w-[620px] flex flex-col overflow-hidden max-h-[calc(100vh-80px)] cursor-move z-[9999] pointer-events-auto"
        style={{ top: `${modalPosition.top}px`, right: `${modalPosition.right}px` }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {/* ===== 헤더 ===== */}
        <div
          className={`flex items-center justify-between px-3 py-1.5 bg-gradient-to-r ${headerGradient} text-white cursor-move select-none`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className={`${headerAccent} text-[11px] font-bold`}>선택입력 :</span>
            <span>{typeEmoji}</span>
            <h2 className="text-[11px] font-bold">{typeLabel} 선택</h2>
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-white/20 rounded border border-white/40">수동입력</span>
          </div>
          <button onClick={props.onClose} className="text-[10px] px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded font-bold">닫기</button>
        </div>

        {/* ===== 상위항목(구분/기능) ===== */}
        <div className={`${getParentInfoClass()} flex items-center gap-2`}>
          <span className="text-[10px] font-bold text-red-700">★ 구분:</span>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded">
            {categoryLabel}
          </span>
          {parentInfo && (
            <>
              <span className="text-[10px] font-bold text-gray-500">→</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-green-600 text-white rounded truncate max-w-[180px]" title={parentInfo}>
                {parentInfo}
              </span>
            </>
          )}
        </div>

        {/* ===== 통합 입력 영역 ===== */}
        <div className={`${MODAL_COMPACT.parentInfo.padding} border-b bg-gradient-to-r from-green-50 to-emerald-50`}>
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`🔍 ${typeLabel} 검색 또는 새 항목 입력...`}
              className="flex-1 px-2 py-1 text-[11px] border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
          </div>
          <div className="mt-1 text-[9px] text-gray-500 text-center">{getHintMessage()}</div>
        </div>

        {/* ===== 리스트 ===== */}
        <div className="overflow-auto p-2 min-h-[250px] max-h-[350px]">
          {/* 적용됨 섹션 */}
          {appliedElements.length > 0 && (
            <div className="mb-3">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-green-50 px-2 py-1 rounded mb-1">
                <span className="text-[10px] font-bold text-green-700">✅ 적용됨 ({appliedElements.filter(e => selectedIds.has(e.id)).length}/{appliedElements.length})</span>
                <div className="flex gap-1">
                  <button onClick={selectAppliedElements} className="text-[9px] px-1.5 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold">전체</button>
                  <button onClick={deselectAppliedElements} className="text-[9px] px-1.5 py-0.5 bg-gray-400 text-white rounded hover:bg-gray-500 font-bold">해제</button>
                  <button onClick={handleDelete} className="text-[9px] px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600 font-bold">삭제</button>
                </div>
              </div>
              <div className={`grid grid-cols-2 gap-1 ${notAppliedElements.length > 0 ? 'max-h-[140px] overflow-y-auto' : ''}`}>
                {appliedElements.map(elem => {
                  const isHighlighted = exactMatch?.id === elem.id || (filteredElements.length === 1 && filteredElements[0].id === elem.id);
                  return (
                    <ElementItem
                      key={elem.id}
                      elem={elem}
                      isSelected={selectedIds.has(elem.id)}
                      toggleSelect={toggleSelect}
                      colorScheme="green"
                      isHighlighted={isHighlighted}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 미적용 섹션 */}
          {notAppliedElements.length > 0 && (
            <div className="mb-1">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-100 px-2 py-1 rounded mb-1">
                <span className="text-[10px] font-bold text-gray-500">미적용 ({notAppliedElements.filter(e => selectedIds.has(e.id)).length}/{notAppliedElements.length})</span>
                <div className="flex gap-1">
                  <button onClick={selectNotAppliedElements} className="text-[9px] px-1.5 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold">전체</button>
                  <button onClick={deselectNotAppliedElements} className="text-[9px] px-1.5 py-0.5 bg-gray-400 text-white rounded hover:bg-gray-500 font-bold">해제</button>
                  <button onClick={handleApply} className="text-[9px] px-1.5 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 font-bold">적용</button>
                </div>
              </div>
              <div className={`grid grid-cols-2 gap-1 ${appliedElements.length > 0 ? 'max-h-[180px] overflow-y-auto' : ''}`}>
                {notAppliedElements.map(elem => {
                  const isHighlighted = exactMatch?.id === elem.id || (filteredElements.length === 1 && filteredElements[0].id === elem.id);
                  return (
                    <ElementItem
                      key={elem.id}
                      elem={elem}
                      isSelected={selectedIds.has(elem.id)}
                      toggleSelect={toggleSelect}
                      colorScheme="blue"
                      isHighlighted={isHighlighted}
                      onRemove={handleRemoveFromList}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 새 항목 추가 UI */}
          {inputValue.trim() && filteredElements.length === 0 && (
            <div className="col-span-2 flex items-center gap-2 px-2 py-2 rounded border-2 border-dashed border-green-400 bg-green-50">
              <span className="text-green-600 font-bold">+</span>
              <span className="text-[10px] text-green-700 font-medium">"{inputValue}" 새로 추가</span>
              <span className="text-[9px] text-gray-400 ml-auto">Enter</span>
            </div>
          )}

          {/* 빈 placeholder */}
          {elements.length === 0 && !inputValue.trim() && (
            <div className="grid grid-cols-2 gap-1">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={`empty-${idx}`} className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-100 bg-gray-50/50">
                  <div className="w-4 h-4 rounded border border-gray-200 bg-white shrink-0" />
                  <span className="flex-1 text-[10px] text-gray-300">-</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== 푸터 ===== */}
        <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-between">
          <span className="text-[10px] text-gray-500">총 {elements.length}개</span>
          <span className="text-xs font-bold text-blue-600">✓ {selectedIds.size}개 선택</span>
        </div>
      </div>
    </>,
    document.body
  );
}

// 개별 요소 아이템 렌더링 컴포넌트
function ElementItem({
  elem, isSelected, toggleSelect, colorScheme, isHighlighted, onRemove,
}: {
  elem: L1FunctionItem;
  isSelected: boolean;
  toggleSelect: (id: string) => void;
  colorScheme: 'green' | 'blue';
  isHighlighted?: boolean;
  onRemove?: (id: string) => void;
}) {
  const isGreen = colorScheme === 'green';
  const selectedBg = isGreen ? 'bg-green-100 border-green-500 ring-1 ring-green-400' : 'bg-blue-50 border-blue-400';
  const defaultBorder = isGreen ? 'bg-white border-green-200 hover:border-green-400' : 'bg-white border-gray-200 hover:border-blue-300';
  const checkBg = isGreen ? 'bg-green-600 border-green-600' : 'bg-blue-500 border-blue-500';
  const textColor = isGreen ? 'text-green-800' : 'text-blue-800';

  let borderClass = isSelected ? selectedBg : defaultBorder;
  if (isHighlighted && !isSelected) borderClass = 'bg-yellow-50 border-yellow-400 ring-1 ring-yellow-300';

  return (
    <div
      onClick={() => toggleSelect(elem.id)}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded border cursor-pointer transition-all ${borderClass}`}
    >
      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? checkBg : 'bg-white border-gray-300'}`}>
        {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
      </div>
      <span className={`flex-1 text-[10px] truncate ${isSelected ? `${textColor} font-medium` : 'text-gray-700'}`}>
        {elem.name}
      </span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(elem.id); }}
          className="text-red-400 hover:text-red-600 text-xs shrink-0"
          title="목록에서 삭제"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default L1FunctionSelectModal;
