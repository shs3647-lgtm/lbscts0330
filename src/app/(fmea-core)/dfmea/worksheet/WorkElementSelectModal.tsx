/**
 * @file WorkElementSelectModal.tsx
 * @description 부품(컴포넌트) 선택 모달 - 검색/입력 통합 버전
 * @version 4.2.0 - hook 분리 (useWorkElementSelect.ts)
 * @updated 2026-02-10
 *
 * ⚠️⚠️⚠️ 코드 프리즈 (CODE FREEZE) ⚠️⚠️⚠️
 * ============================================
 * 이 파일은 완전히 프리즈되었습니다.
 *
 * ❌ 절대 수정 금지:
 * - handleKeyDown 로직 (엔터 키 처리) → useWorkElementSelect.ts
 * - handleApply 로직 (적용 버튼) → useWorkElementSelect.ts
 * - onSave 호출 시 상태 계산 로직
 *
 * ✅ 수정 허용 조건:
 * 1. 사용자가 명시적으로 수정 요청
 * 2. 수정 사유와 범위를 명확히 지시
 * 3. 코드프리즈 경고를 확인하고 진행
 *
 * 📅 프리즈 일자: 2026-02-01
 * ============================================
 */

'use client';

import { createPortal } from 'react-dom';
import React from 'react';
import { useDraggableModal } from '@/components/modals/useDraggableModal';
import { MODAL_COMPACT, ACTION_ICONS, getParentInfoClass } from '@/styles/modal-compact';
import {
  useWorkElementSelect,
  M4_OPTIONS,
  getM4Style,
  type WorkElement,
  type WorkElementSelectModalProps,
} from './useWorkElementSelect';

// re-exports for consumers
export type { WorkElement, WorkElementSelectModalProps };
export { getMissingWorkElements } from './useWorkElementSelect';

export default function WorkElementSelectModal({
  isOpen,
  onClose,
  onSave,
  processNo = '',
  processName = '',
  existingElements = [],
  existingL3 = [],
  onContinuousAdd,
}: WorkElementSelectModalProps) {
  const {
    elements, selectedIds, currentProcessNo,
    m4Warnings, editingId, editValue, setEditValue,
    inputValue, setInputValue, selectedM4, setSelectedM4,
    filterM4, setFilterM4, inputRef,
    filteredElements, commonMNElements, processElements,
    exactMatch,
    toggleSelect, handleEditDoubleClick, handleEditSave,
    selectProcessElements, deselectProcessElements,
    selectCommonElements, deselectCommonElements,
    selectAll, deselectAll,
    handleApply, handleKeyDown, handleDelete,
    getHintMessage, setEmptyM4ToMC, setEditingId,
  } = useWorkElementSelect({ isOpen, onClose, onSave, processNo, processName, existingL3 });

  const { position: modalPosition, handleMouseDown } =
    useDraggableModal({ initialPosition: { top: 60, right: 360 }, modalWidth: 400, modalHeight: 500, isOpen });

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] pointer-events-none" />
      <div
        className="fixed bg-white rounded-lg shadow-2xl w-[400px] flex flex-col overflow-hidden max-h-[calc(100vh-80px)] cursor-move z-[9999] pointer-events-auto"
        style={{ top: `${modalPosition.top}px`, right: `${modalPosition.right}px` }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {/* ===== 헤더 ===== */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className="text-yellow-300 text-[11px] font-bold">선택입력 :</span>
            <span>🔧</span>
            <h2 className="text-[11px] font-bold">부품(컴포넌트) 선택</h2>
          </div>
          <button onClick={onClose} className="text-[10px] px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded font-bold">닫기</button>
        </div>

        {/* ===== 상위항목(공정) ===== */}
        <div className={`${getParentInfoClass()} flex items-center gap-2`}>
          <span className="text-[10px] font-bold text-red-700">★ 공정:</span>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded">
            {currentProcessNo} {processName}
          </span>
        </div>

        {/* ===== 통합 입력 영역 ===== */}
        <div className={`${MODAL_COMPACT.parentInfo.padding} border-b bg-gradient-to-r from-green-50 to-emerald-50`}>
          <div className="flex items-center gap-1.5">
            <select value={filterM4} onChange={(e) => { const v = e.target.value; setFilterM4(v); if (v !== 'all') setSelectedM4(v); }} className="px-1 py-1 text-[10px] border rounded cursor-pointer shrink-0">
              <option value="all">전체</option>
              {M4_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <select value={selectedM4} onChange={(e) => setSelectedM4(e.target.value)} className="px-1 py-1 text-[10px] border rounded font-bold" style={getM4Style(selectedM4)}>
              {M4_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="🔍 검색 또는 새 항목 입력..."
              className="flex-1 px-2 py-1 text-[11px] border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
          </div>
          <div className="mt-1 text-[9px] text-gray-500 text-center">{getHintMessage()}</div>
        </div>

        {/* ===== 버튼 영역 ===== */}
        <div className={`${MODAL_COMPACT.searchBar.padding} border-b bg-gray-50 flex items-center gap-1`}>
          <button onClick={selectAll} className={`${MODAL_COMPACT.button.icon} font-bold bg-blue-500 text-white rounded hover:bg-blue-600`}>{ACTION_ICONS.selectAll} 전체<span className="text-[8px] opacity-70 ml-0.5">(All)</span></button>
          <button onClick={deselectAll} className={`${MODAL_COMPACT.button.icon} font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400`}>{ACTION_ICONS.deselectAll} 해제<span className="text-[8px] opacity-70 ml-0.5">(Clr)</span></button>
          <button onClick={handleApply} className={`${MODAL_COMPACT.button.icon} font-bold bg-green-600 text-white rounded hover:bg-green-700`}>{ACTION_ICONS.apply} 적용<span className="text-[8px] opacity-70 ml-0.5">(OK)</span></button>
          <button onClick={handleDelete} className={`${MODAL_COMPACT.button.icon} font-bold bg-red-500 text-white rounded hover:bg-red-600`} title="선택된 항목을 워크시트에서 제거합니다 (마스터 기초정보는 유지)">
            {ACTION_ICONS.delete} 삭제<span className="text-[8px] opacity-70 ml-0.5">(Del)</span>
          </button>
        </div>

        {/* ===== 리스트 ===== */}
        <div className="overflow-auto p-2 min-h-[250px] max-h-[350px]">
          {/* 4M 빈값 경고 */}
          {(() => {
            const emptyM4 = elements.filter(e => !e.m4);
            if (emptyM4.length === 0) return null;
            return (
              <div className="mb-2 px-2 py-1.5 bg-orange-50 border border-orange-300 rounded text-[10px] text-orange-800 flex items-center justify-between">
                <span>
                  ⚠️ 기초정보에 <strong>4M 분류 없음</strong> {emptyM4.length}개
                  ({emptyM4.map(e => e.name.replace(/^\d+\s+/, '')).slice(0, 3).join(', ')}{emptyM4.length > 3 ? '...' : ''})
                </span>
                <button onClick={setEmptyM4ToMC} className="ml-2 px-2 py-0.5 text-[9px] font-bold bg-orange-500 text-white rounded hover:bg-orange-600 shrink-0">MC로 분류</button>
              </div>
            );
          })()}

          {/* 공통 MN 부품(컴포넌트) */}
          {commonMNElements.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[10px] font-bold text-green-700">👤 공통 작업자 ({commonMNElements.filter(e => selectedIds.has(e.id)).length}/{commonMNElements.length})</span>
                <div className="flex gap-1">
                  <button onClick={selectCommonElements} className="text-[8px] px-1.5 py-0.5 bg-green-500 text-white rounded hover:bg-green-600">전체<span className="text-[8px] opacity-70 ml-0.5">(All)</span></button>
                  <button onClick={deselectCommonElements} className="text-[8px] px-1.5 py-0.5 bg-gray-400 text-white rounded hover:bg-gray-500">해제<span className="text-[8px] opacity-70 ml-0.5">(Clr)</span></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1.5 bg-green-50 rounded border border-green-200">
                {commonMNElements.map(elem => (
                  <ElementItem key={elem.id} elem={elem} isSelected={selectedIds.has(elem.id)} isEditing={editingId === elem.id}
                    editValue={editValue} setEditValue={setEditValue} handleEditSave={handleEditSave} setEditingId={setEditingId}
                    toggleSelect={toggleSelect} handleEditDoubleClick={handleEditDoubleClick}
                    colorScheme="green" badge="공통" />
                ))}
              </div>
            </div>
          )}

          {/* 해당 공정 부품(컴포넌트) */}
          {processElements.length > 0 && (
            <div className="mb-1">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[10px] font-bold text-blue-700">🔧 {currentProcessNo}번 공정 ({processElements.filter(e => selectedIds.has(e.id)).length}/{processElements.length})</span>
                <div className="flex gap-1">
                  <button onClick={selectProcessElements} className="text-[8px] px-1.5 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600">전체<span className="text-[8px] opacity-70 ml-0.5">(All)</span></button>
                  <button onClick={deselectProcessElements} className="text-[8px] px-1.5 py-0.5 bg-gray-400 text-white rounded hover:bg-gray-500">해제<span className="text-[8px] opacity-70 ml-0.5">(Clr)</span></button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1">
            {processElements.map(elem => {
              const isHighlighted = exactMatch?.id === elem.id || (filteredElements.length === 1);
              const isMissing = false;
              return (
                <ElementItem key={elem.id} elem={elem} isSelected={selectedIds.has(elem.id)} isEditing={editingId === elem.id}
                  editValue={editValue} setEditValue={setEditValue} handleEditSave={handleEditSave} setEditingId={setEditingId}
                  toggleSelect={toggleSelect} handleEditDoubleClick={handleEditDoubleClick}
                  colorScheme="blue" isHighlighted={isHighlighted} isMissing={isMissing} />
              );
            })}

            {inputValue.trim() && filteredElements.length === 0 && (
              <div className="col-span-2 flex items-center gap-2 px-2 py-2 rounded border-2 border-dashed border-green-400 bg-green-50">
                <span className="text-green-600 font-bold">+</span>
                <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={getM4Style(selectedM4)}>{selectedM4}</span>
                <span className="text-[10px] text-green-700 font-medium">"{inputValue}" 새로 추가</span>
                <span className="text-[9px] text-gray-400 ml-auto">Enter</span>
              </div>
            )}

            {processElements.length < 8 && !inputValue.trim() &&
              Array.from({ length: Math.max(0, 8 - processElements.length) }).map((_, idx) => (
                <div key={`empty-${idx}`} className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-100 bg-gray-50/50">
                  <div className="w-4 h-4 rounded border border-gray-200 bg-white shrink-0" />
                  <span className="text-[9px] text-gray-300">--</span>
                  <span className="flex-1 text-[10px] text-gray-300">-</span>
                </div>
              ))
            }
          </div>
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
  elem, isSelected, isEditing, editValue, setEditValue,
  handleEditSave, setEditingId, toggleSelect, handleEditDoubleClick,
  colorScheme, badge, isHighlighted, isMissing,
}: {
  elem: WorkElement; isSelected: boolean; isEditing: boolean;
  editValue: string; setEditValue: (v: string) => void;
  handleEditSave: () => void; setEditingId: (id: string | null) => void;
  toggleSelect: (id: string) => void;
  handleEditDoubleClick: (elem: WorkElement, e: React.MouseEvent) => void;
  colorScheme: 'green' | 'blue'; badge?: string;
  isHighlighted?: boolean; isMissing?: boolean;
}) {
  const m4Style = getM4Style(elem.m4);
  const isGreen = colorScheme === 'green';
  const selectedBg = isGreen ? 'bg-green-100 border-green-500 ring-1 ring-green-400' : 'bg-blue-50 border-blue-400';
  const defaultBorder = isGreen ? 'bg-white border-green-200 hover:border-green-400' : 'bg-white border-gray-200 hover:border-blue-300';
  const checkBg = isGreen ? 'bg-green-600 border-green-600' : 'bg-blue-500 border-blue-500';
  const textColor = isGreen ? 'text-green-800' : 'text-blue-800';

  let borderClass = isSelected ? selectedBg : defaultBorder;
  if (isMissing && !isSelected) borderClass = 'bg-red-50 border-red-400 ring-1 ring-red-300';
  if (isHighlighted && !isSelected && !isMissing) borderClass = 'bg-yellow-50 border-yellow-400 ring-1 ring-yellow-300';

  return (
    <div
      onClick={() => toggleSelect(elem.id)}
      onDoubleClick={(e) => handleEditDoubleClick(elem, e)}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded border cursor-pointer transition-all ${borderClass}`}
    >
      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? checkBg : isMissing ? 'bg-red-100 border-red-400' : 'bg-white border-gray-300'}`}>
        {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
        {!isSelected && isMissing && <span className="text-red-500 text-[8px] font-bold">!</span>}
      </div>
      <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${!elem.m4 ? 'bg-orange-200 text-orange-800' : ''}`} style={elem.m4 ? m4Style : {}}>
        {elem.m4 || '?'}
      </span>
      {isEditing ? (
        <input
          type="text" value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleEditSave(); }
            if (e.key === 'Escape') { e.stopPropagation(); setEditingId(null); }
          }}
          autoFocus
          className="flex-1 px-1 py-0.5 text-[10px] border border-blue-400 rounded focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={`flex-1 text-[10px] truncate ${isSelected ? `${textColor} font-medium` : isMissing ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
          {badge ? elem.name.replace(/^0\s+/, '') : elem.name}
        </span>
      )}
      {badge && <span className="text-[8px] px-1 py-0.5 bg-green-600 text-white rounded shrink-0">{badge}</span>}
      {isMissing && <span className="text-[8px] font-bold px-1 py-0.5 bg-red-500 text-white rounded shrink-0">누락</span>}
    </div>
  );
}
