/**
 * 메인공정기능(A3) 선택 모달 — L1FunctionSelectModal UI 패턴
 */
'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useDraggableModal } from '@/components/modals/useDraggableModal';
import { MODAL_COMPACT, getParentInfoClass } from '@/styles/modal-compact';
import { useL2FunctionSelect, L2FunctionSelectModalProps, L2FunctionItem } from './useL2FunctionSelect';

export function L2FunctionSelectModal(props: L2FunctionSelectModalProps) {
  const {
    elements,
    selectedIds,
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
    getHintMessage,
  } = useL2FunctionSelect(props);

  const { position: modalPosition, handleMouseDown } = useDraggableModal({
    initialPosition: { top: 60, right: 200 },
    modalWidth: 620,
    modalHeight: 550,
    isOpen: props.isOpen,
  });

  if (!props.isOpen) return null;
  if (typeof document === 'undefined') return null;

  const procLabel = [props.processNo, props.processName].filter(Boolean).join(' · ');

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] pointer-events-none" />
      <div
        className="fixed bg-white rounded-lg shadow-2xl w-[620px] flex flex-col overflow-hidden max-h-[calc(100vh-80px)] cursor-move z-[9999] pointer-events-auto"
        style={{ top: `${modalPosition.top}px`, right: `${modalPosition.right}px` }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-100 text-[11px] font-bold">선택입력 :</span>
            <span>⚙️</span>
            <h2 className="text-[11px] font-bold">메인공정기능(A3) 선택</h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="text-[10px] px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded font-bold"
          >
            닫기
          </button>
        </div>

        <div className={`${getParentInfoClass()} flex items-center gap-2`}>
          <span className="text-[10px] font-bold text-red-700">★ 공정:</span>
          <span
            className="px-2 py-0.5 text-[10px] font-bold bg-slate-700 text-white rounded truncate max-w-[420px]"
            title={procLabel}
          >
            {procLabel || '(공정번호 없음)'}
          </span>
        </div>

        <div className={`${MODAL_COMPACT.parentInfo.padding} border-b bg-gradient-to-r from-amber-50 to-orange-50`}>
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="🔍 메인공정기능 검색 또는 새 항목 입력..."
              className="flex-1 px-2 py-1 text-[11px] border rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
          </div>
          <div className="mt-1 text-[9px] text-gray-500 text-center">{getHintMessage()}</div>
        </div>

        <div className="overflow-auto p-2 min-h-[250px] max-h-[350px]">
          {appliedElements.length > 0 && (
            <div className="mb-3">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-green-50 px-2 py-1 rounded mb-1">
                <span className="text-[10px] font-bold text-green-700">
                  ✅ 적용됨 ({appliedElements.filter((e) => selectedIds.has(e.id)).length}/
                  {appliedElements.length})
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={selectAppliedElements}
                    className="text-[9px] px-1.5 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold"
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={deselectAppliedElements}
                    className="text-[9px] px-1.5 py-0.5 bg-gray-400 text-white rounded hover:bg-gray-500 font-bold"
                  >
                    해제
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="text-[9px] px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600 font-bold"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div
                className={`grid grid-cols-2 gap-1 ${notAppliedElements.length > 0 ? 'max-h-[140px] overflow-y-auto' : ''}`}
              >
                {appliedElements.map((elem) => {
                  const isHighlighted =
                    exactMatch?.id === elem.id ||
                    (filteredElements.length === 1 && filteredElements[0].id === elem.id);
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

          {notAppliedElements.length > 0 && (
            <div className="mb-1">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-100 px-2 py-1 rounded mb-1">
                <span className="text-[10px] font-bold text-gray-500">
                  미적용 ({notAppliedElements.filter((e) => selectedIds.has(e.id)).length}/
                  {notAppliedElements.length})
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={selectNotAppliedElements}
                    className="text-[9px] px-1.5 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold"
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={deselectNotAppliedElements}
                    className="text-[9px] px-1.5 py-0.5 bg-gray-400 text-white rounded hover:bg-gray-500 font-bold"
                  >
                    해제
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="text-[9px] px-1.5 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 font-bold"
                  >
                    적용
                  </button>
                </div>
              </div>
              <div
                className={`grid grid-cols-2 gap-1 ${appliedElements.length > 0 ? 'max-h-[180px] overflow-y-auto' : ''}`}
              >
                {notAppliedElements.map((elem) => {
                  const isHighlighted =
                    exactMatch?.id === elem.id ||
                    (filteredElements.length === 1 && filteredElements[0].id === elem.id);
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

          {inputValue.trim() && filteredElements.length === 0 && (
            <div className="col-span-2 flex items-center gap-2 px-2 py-2 rounded border-2 border-dashed border-amber-400 bg-amber-50">
              <span className="text-amber-600 font-bold">+</span>
              <span className="text-[10px] text-amber-800 font-medium">&quot;{inputValue}&quot; 새로 추가</span>
              <span className="text-[9px] text-gray-400 ml-auto">Enter</span>
            </div>
          )}

          {elements.length === 0 && !inputValue.trim() && (
            <div className="grid grid-cols-2 gap-1">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-100 bg-gray-50/50"
                >
                  <div className="w-4 h-4 rounded border border-gray-200 bg-white shrink-0" />
                  <span className="flex-1 text-[10px] text-gray-300">-</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-between">
          <span className="text-[10px] text-gray-500">총 {elements.length}개</span>
          <span className="text-xs font-bold text-amber-700">✓ {selectedIds.size}개 선택</span>
        </div>
      </div>
    </>,
    document.body
  );
}

function ElementItem({
  elem,
  isSelected,
  toggleSelect,
  colorScheme,
  isHighlighted,
  onRemove,
}: {
  elem: L2FunctionItem;
  isSelected: boolean;
  toggleSelect: (id: string) => void;
  colorScheme: 'green' | 'blue';
  isHighlighted?: boolean;
  onRemove?: (id: string) => void;
}) {
  const isGreen = colorScheme === 'green';
  const selectedBg = isGreen
    ? 'bg-green-100 border-green-500 ring-1 ring-green-400'
    : 'bg-blue-50 border-blue-400';
  const defaultBorder = isGreen
    ? 'bg-white border-green-200 hover:border-green-400'
    : 'bg-white border-gray-200 hover:border-blue-300';
  const checkBg = isGreen ? 'bg-green-600 border-green-600' : 'bg-blue-500 border-blue-500';
  const textColor = isGreen ? 'text-green-800' : 'text-blue-800';

  let borderClass = isSelected ? selectedBg : defaultBorder;
  if (isHighlighted && !isSelected) borderClass = 'bg-yellow-50 border-yellow-400 ring-1 ring-yellow-300';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => toggleSelect(elem.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleSelect(elem.id);
        }
      }}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded border cursor-pointer transition-all ${borderClass}`}
    >
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? checkBg : 'bg-white border-gray-300'}`}
      >
        {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
      </div>
      <span
        className={`flex-1 text-[10px] truncate ${isSelected ? `${textColor} font-medium` : 'text-gray-700'}`}
      >
        {elem.name}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(elem.id);
          }}
          className="text-red-400 hover:text-red-600 text-xs shrink-0"
          title="목록에서 삭제"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default L2FunctionSelectModal;
