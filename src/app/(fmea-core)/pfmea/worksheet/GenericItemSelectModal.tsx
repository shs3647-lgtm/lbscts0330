/**
 * @file GenericItemSelectModal.tsx
 * @description 구조분석 모달(ProcessSelectModal) UI 완전 클론 — 제네릭 버전
 * 모든 수동입력 모달(1L/2L/3L 기능, 1L영향, 2L형태, 3L원인)이 이 컴포넌트를 재사용
 * @version 3.0.0 - ProcessSelectModal UI 패턴으로 통일
 * @updated 2026-03-29
 */
'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDraggableModal } from '@/components/modals/useDraggableModal';
import { MODAL_COMPACT } from '@/styles/modal-compact';
import { toast } from '@/hooks/useToast';
import { useGenericItemSelect, GenericItemSelectProps, GenericItem } from './useGenericItemSelect';

export interface GenericItemSelectModalConfig {
  /** 모달 제목 (예: "고장영향(C4) 선택") */
  title: string;
  /** 이모지 (예: "💥") */
  emoji: string;
  /** 헤더 그라데이션 CSS (예: "from-red-500 to-red-600") */
  headerGradient: string;
  /** 헤더 강조 텍스트 색상 (예: "text-red-200") */
  headerAccent: string;
  /** 검색 placeholder (예: "🔍 고장영향 검색...") */
  searchPlaceholder: string;
  /** 검색 포커스 링 색상 (예: "focus:ring-red-500") */
  searchRingColor: string;
  /** 검색 배경 그라데이션 (예: "from-red-50 to-orange-50") */
  searchBgGradient: string;
  /** 상위 정보 라벨 (예: "공정:") */
  parentLabel?: string;
  /** 상위 정보 값 (예: "10 · PR Coating") */
  parentValue?: string;
}

export type GenericItemSelectModalProps = GenericItemSelectProps & {
  config: GenericItemSelectModalConfig;
  /** 더블클릭 "+수동입력" 시 탭을 수동(Manual) 모드로 전환 (구조분석 ProcessSelectModal과 동일) */
  onSwitchToManualMode?: () => void;
  /** onSwitchToManualMode 사용 시 토스트 문구 (미지정 시 공통 문구) */
  switchToManualToastMessage?: string;
};

export function GenericItemSelectModal(props: GenericItemSelectModalProps) {
  const { config, onSwitchToManualMode, switchToManualToastMessage, ...selectProps } = props;
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
    addNewItem,
  } = useGenericItemSelect(selectProps);

  // ★ 수동입력 바 — 로컬 상태
  const [newName, setNewName] = useState('');
  const newNameRef = useRef<HTMLInputElement>(null);

  const handleAddNew = () => {
    if (!newName.trim()) return;
    const success = addNewItem(newName.trim());
    if (success) setNewName('');
  };

  const { position: modalPosition, handleMouseDown } = useDraggableModal({
    initialPosition: { top: 160, right: 360 },
    modalWidth: 400,
    modalHeight: 700,
  });

  if (!props.isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* 배경 — 클릭 통과 (다른 항목 클릭 시 자동 전환) */}
      <div className="fixed inset-0 z-[9998] pointer-events-none" />
      <div
        className="fixed bg-white rounded-lg shadow-2xl w-[400px] max-w-[400px] min-w-[400px] flex flex-col overflow-hidden max-h-[calc(100vh-40px)] cursor-move z-[9999] pointer-events-auto"
        style={{
          top: `${modalPosition.top}px`,
          right: `${modalPosition.right}px`,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* ===== 헤더 — 드래그 가능 ===== */}
        <div
          className={`flex items-center justify-between ${MODAL_COMPACT.header.padding} bg-gradient-to-r ${config.headerGradient} text-white cursor-move select-none`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <span className={`${config.headerAccent} text-[11px] font-bold`}>
              선택입력 :
            </span>
            <span className="text-sm">{config.emoji}</span>
            <h2 className="text-[11px] font-bold">{config.title}</h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="text-[10px] px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded font-bold"
          >
            ✕ 닫기
          </button>
        </div>

        {/* ===== ★ 상위항목(Parent) 고정 표시 ===== */}
        {config.parentLabel && config.parentValue && (
          <div className={`${MODAL_COMPACT.parentInfo.padding} border-b bg-gradient-to-r from-red-50 to-orange-50 flex items-center gap-2`}>
            <span className="text-[11px] font-bold text-red-700 shrink-0">
              ★ 상위항목(Parent):
            </span>
            <span className="text-[9px] text-gray-600 font-bold">
              {config.parentLabel}
            </span>
            <span
              className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded truncate max-w-[200px]"
              title={config.parentValue}
            >
              {config.parentValue || '(없음)'}
            </span>
          </div>
        )}

        {/* ===== ▼ 하위항목(Child) 라벨 + 데이터 소스 ===== */}
        <div className="px-3 py-1 border-b bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-green-700">
            ▼ 하위항목(Child): {config.title}
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded bg-blue-100 text-blue-700">
            📂 Master FMEA (DB) ({elements.length}개)
          </span>
        </div>

        {/* ===== +수동입력 바 (구조분석 모달과 동일 UX) ===== */}
        <div className="px-3 py-1.5 border-b flex items-center gap-1 bg-green-50">
          <button
            type="button"
            onClick={() => newNameRef.current?.focus()}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSwitchToManualMode?.();
              toast.info(
                switchToManualToastMessage?.trim() ||
                  '수동(Manual) 모드로 전환되었습니다. 항목명을 입력한 뒤 저장하세요.',
              );
              newNameRef.current?.focus();
            }}
            className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded border text-green-800 border-green-400 bg-white hover:bg-green-100 cursor-pointer select-none"
            title={
              onSwitchToManualMode
                ? '클릭: 항목명 입력란 포커스 | 더블클릭: 해당 탭 수동(Manual) 모드로 전환'
                : '클릭: 항목명 입력란 포커스'
            }
          >
            +수동입력
          </button>
          <input
            ref={newNameRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleAddNew();
              }
            }}
            placeholder="항목명 입력..."
            className="flex-1 px-2 py-0.5 text-[10px] border rounded focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            type="button"
            onClick={handleAddNew}
            disabled={!newName.trim()}
            className="px-2 py-0.5 text-[10px] font-bold text-white rounded bg-green-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            저장
          </button>
        </div>

        {/* ===== 검색 ===== */}
        <div className={`${MODAL_COMPACT.searchBar.padding} border-b bg-gray-50`}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.searchPlaceholder}
            className={`w-full px-2 py-0.5 ${MODAL_COMPACT.searchBar.fontSize} border rounded focus:ring-1 ${config.searchRingColor} outline-none`}
            autoFocus
          />
        </div>

        {/* ===== 아이템 목록 — ProcessSelectModal 동일 레이아웃 ===== */}
        <div className="overflow-auto p-2 flex-1 min-h-[400px]">
          {elements.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg mb-2">📭</p>
                <p className="text-xs text-gray-500 mb-2">
                  등록된 항목이 없습니다(No items registered)
                </p>
                <p className="text-[10px] text-gray-400">
                  위 입력창에서 직접 추가해주세요(Add manually above)
                </p>
              </div>
            </div>
          ) : (() => {
            return (
              <div>
                {/* ✅ 적용됨 */}
                {appliedElements.length > 0 && (
                  <div className="mb-2">
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-green-50 px-2 py-1 rounded mb-1">
                      <span className="text-[10px] font-bold text-green-700">
                        ✅ 적용됨 ({appliedElements.length}개)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={selectAppliedElements}
                          className="text-[11px] px-2.5 py-1 font-bold bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          전체
                        </button>
                        <button
                          type="button"
                          onClick={deselectAppliedElements}
                          className="text-[11px] px-2.5 py-1 font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          해제
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="text-[11px] px-2.5 py-1 font-bold bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <div
                      className={`overflow-y-auto ${
                        notAppliedElements.length > 0
                          ? 'max-h-[180px]'
                          : 'max-h-[400px]'
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-1">
                        {appliedElements.map((elem) => (
                          <ItemRow
                            key={elem.id}
                            elem={elem}
                            isSelected={selectedIds.has(elem.id)}
                            toggleSelect={toggleSelect}
                            isCurrent={true}
                            isHighlighted={
                              exactMatch?.id === elem.id ||
                              (filteredElements.length === 1 &&
                                filteredElements[0].id === elem.id)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 미적용 */}
                {notAppliedElements.length > 0 && (
                  <div>
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-100 px-2 py-1 rounded mb-1">
                      <span className="text-[10px] font-bold text-gray-500">
                        미적용 ({notAppliedElements.length}개)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={selectNotAppliedElements}
                          className="text-[11px] px-2.5 py-1 font-bold bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          전체
                        </button>
                        <button
                          type="button"
                          onClick={deselectNotAppliedElements}
                          className="text-[11px] px-2.5 py-1 font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          해제
                        </button>
                        <button
                          type="button"
                          onClick={handleApply}
                          className="text-[11px] px-2.5 py-1 font-bold bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          적용
                        </button>
                      </div>
                    </div>
                    <div
                      className={`overflow-y-auto ${
                        appliedElements.length > 0
                          ? 'max-h-[220px]'
                          : 'max-h-[400px]'
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-1">
                        {notAppliedElements.map((elem) => (
                          <ItemRow
                            key={elem.id}
                            elem={elem}
                            isSelected={selectedIds.has(elem.id)}
                            toggleSelect={toggleSelect}
                            isCurrent={false}
                            isHighlighted={
                              exactMatch?.id === elem.id ||
                              (filteredElements.length === 1 &&
                                filteredElements[0].id === elem.id)
                            }
                            onRemove={handleRemoveFromList}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 검색 결과가 모두 비어있을 때 (필터에 의해) */}
                {appliedElements.length === 0 &&
                  notAppliedElements.length === 0 && (
                    <div className="grid grid-cols-2 gap-1">
                      {Array.from({ length: 12 }).map((_, idx) => (
                        <div
                          key={`empty-${idx}`}
                          className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-100 bg-gray-50/50"
                        >
                          <div className="w-4 h-4 rounded border border-gray-200 bg-white shrink-0" />
                          <span className="text-[10px] font-bold text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded min-w-[28px] text-center">
                            --
                          </span>
                          <span className="flex-1 text-xs text-gray-300">-</span>
                        </div>
                      ))}
                    </div>
                  )}

                {/* 새 항목 추가 힌트 */}
                {inputValue.trim() && filteredElements.length === 0 && (
                  <div className="mt-2 col-span-2 flex items-center gap-2 px-2 py-2 rounded border-2 border-dashed border-amber-400 bg-amber-50">
                    <span className="text-amber-600 font-bold">+</span>
                    <span className="text-[10px] text-amber-800 font-medium">
                      &quot;{inputValue}&quot; 새로 추가
                    </span>
                    <span className="text-[9px] text-gray-400 ml-auto">
                      Enter
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ===== 푸터 — 선택 수 표시 ===== */}
        <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-center">
          <span className="text-xs font-bold text-blue-600">
            ✓ {selectedIds.size}개 선택
          </span>
        </div>
      </div>
    </>,
    document.body,
  );
}

/** ===== 아이템 행 — ProcessSelectModal renderRow 완전 클론 ===== */
function ItemRow({
  elem,
  isSelected,
  toggleSelect,
  isCurrent,
  isHighlighted,
  onRemove,
}: {
  elem: GenericItem;
  isSelected: boolean;
  toggleSelect: (id: string) => void;
  isCurrent: boolean;
  isHighlighted?: boolean;
  onRemove?: (id: string) => void;
}) {
  let borderClass = isSelected
    ? isCurrent
      ? 'bg-green-50 border-green-400'
      : 'bg-blue-50 border-blue-400'
    : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30';

  if (isHighlighted && !isSelected) {
    borderClass = 'bg-yellow-50 border-yellow-400 ring-1 ring-yellow-300';
  }

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
      className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-all ${borderClass}`}
    >
      {/* 체크박스 */}
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
          isSelected
            ? isCurrent
              ? 'bg-green-500 border-green-500'
              : 'bg-blue-500 border-blue-500'
            : 'bg-white border-gray-300'
        }`}
      >
        {isSelected && (
          <span className="text-white text-[8px] font-bold">✓</span>
        )}
      </div>
      {/* 카테고리 뱃지 (YP/SP/USER 등) */}
      {elem.category && (
        <span className={`shrink-0 px-1 py-0.5 text-[8px] font-bold rounded ${
          elem.category.toUpperCase() === 'YP' ? 'bg-blue-100 text-blue-700' :
          elem.category.toUpperCase() === 'SP' ? 'bg-green-100 text-green-700' :
          elem.category.toUpperCase() === 'USER' ? 'bg-orange-100 text-orange-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {elem.category.toUpperCase()}
        </span>
      )}
      {/* 이름 */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-xs truncate block ${
            isSelected
              ? isCurrent
                ? 'text-green-800 font-medium'
                : 'text-blue-800 font-medium'
              : 'text-gray-700'
          }`}
        >
          {elem.name}
        </span>
      </div>
      {/* 미적용 항목 X 삭제 */}
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

export default GenericItemSelectModal;
