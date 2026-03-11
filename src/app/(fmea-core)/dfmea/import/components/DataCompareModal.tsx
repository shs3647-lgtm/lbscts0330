// CODEFREEZE
/**
 * @file DataCompareModal.tsx
 * @description 기초정보 변경 비교 모달 - 변경전/변경후 데이터를 보여주고 선택적 적용
 * @author AI Assistant
 * @created 2026-01-18
 */

'use client';

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, AlertTriangle, Plus, Minus, RefreshCw } from 'lucide-react';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

/** 변경 타입 */
export type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

/** 변경 항목 */
export interface ChangeItem {
  id: string;
  processNo: string;
  itemCode: string;
  itemLabel: string;
  changeType: ChangeType;
  oldValue: string;
  newValue: string;
  selected: boolean;
}

/** 비교 결과 요약 */
export interface CompareSummary {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  total: number;
}

interface DataCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedChanges: ChangeItem[]) => void;
  changes: ChangeItem[];
  title?: string;
  description?: string;
}

/** 아이템 코드 → 레이블 매핑 */
const ITEM_LABELS: Record<string, string> = {
  A1: '공정번호',
  A2: '공정명',
  A3: '공정기능',
  A4: '제품특성',
  A5: '고장형태',
  A6: '검출관리',
  B1: '작업요소',
  B2: '요소기능',
  B3: '공정특성',
  B4: '고장원인',
  B5: '예방관리',
  C1: '구분',
  C2: '제품기능',
  C3: '요구사항',
  C4: '고장영향',
};

/** 변경 타입별 스타일 */
const CHANGE_STYLES: Record<ChangeType, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  added: {
    bg: 'bg-green-50 border-green-300',
    text: 'text-green-700',
    icon: <Plus className="w-4 h-4" />,
    label: '추가'
  },
  removed: {
    bg: 'bg-red-50 border-red-300',
    text: 'text-red-700',
    icon: <Minus className="w-4 h-4" />,
    label: '삭제'
  },
  modified: {
    bg: 'bg-yellow-50 border-yellow-300',
    text: 'text-yellow-700',
    icon: <RefreshCw className="w-4 h-4" />,
    label: '수정'
  },
  unchanged: {
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-500',
    icon: <Check className="w-4 h-4" />,
    label: '동일'
  },
};

export default function DataCompareModal({
  isOpen,
  onClose,
  onApply,
  changes: initialChanges,
  title = '기초정보 변경 비교',
  description = '새로 입력된 기초정보와 기존 데이터를 비교합니다. 적용할 항목을 선택하세요.',
}: DataCompareModalProps) {
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 800, height: 600, minWidth: 400, minHeight: 280 });

  const [changes, setChanges] = useState<ChangeItem[]>(initialChanges);
  const [filterType, setFilterType] = useState<ChangeType | 'all'>('all');
  const [showUnchanged, setShowUnchanged] = useState(false);

  // 변경 상태가 바뀌면 초기화
  React.useEffect(() => {
    setChanges(initialChanges);
  }, [initialChanges]);

  // 요약 통계 계산
  const summary = useMemo<CompareSummary>(() => {
    return {
      added: changes.filter(c => c.changeType === 'added').length,
      removed: changes.filter(c => c.changeType === 'removed').length,
      modified: changes.filter(c => c.changeType === 'modified').length,
      unchanged: changes.filter(c => c.changeType === 'unchanged').length,
      total: changes.length,
    };
  }, [changes]);

  // 필터링된 변경 목록
  const filteredChanges = useMemo(() => {
    let filtered = changes;

    // 변경 타입 필터
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.changeType === filterType);
    }

    // 변경 없음 숨기기
    if (!showUnchanged) {
      filtered = filtered.filter(c => c.changeType !== 'unchanged');
    }

    return filtered;
  }, [changes, filterType, showUnchanged]);

  // 개별 선택 토글
  const toggleSelect = (id: string) => {
    setChanges(prev => prev.map(c =>
      c.id === id ? { ...c, selected: !c.selected } : c
    ));
  };

  // 전체 선택/해제
  const toggleSelectAll = (selected: boolean) => {
    setChanges(prev => prev.map(c =>
      c.changeType !== 'unchanged' ? { ...c, selected } : c
    ));
  };

  // 타입별 전체 선택
  const selectByType = (type: ChangeType) => {
    setChanges(prev => prev.map(c =>
      c.changeType === type ? { ...c, selected: true } : c
    ));
  };

  // 적용
  const handleApply = () => {
    const selectedChanges = changes.filter(c => c.selected && c.changeType !== 'unchanged');
    onApply(selectedChanges);
    onClose();
  };

  // 선택된 변경 수
  const selectedCount = changes.filter(c => c.selected && c.changeType !== 'unchanged').length;
  const selectableCount = changes.filter(c => c.changeType !== 'unchanged').length;

  if (!isOpen) return null;

  return typeof document === 'undefined' ? null : createPortal(
    <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#00587a] to-[#007a9e] rounded-t-lg cursor-move" onMouseDown={onDragStart}>
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-300" />
            {title}
          </h2>
          <p className="text-xs text-white/80 mt-1">{description}</p>
        </div>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

        {/* 요약 통계 */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                filterType === 'all'
                  ? 'bg-[#00587a] text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              전체 ({summary.total})
            </button>
            <button
              onClick={() => { setFilterType('added'); selectByType('added'); }}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
                filterType === 'added'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 border border-green-300 text-green-700 hover:bg-green-100'
              }`}
            >
              <Plus className="w-3 h-3" /> 추가 ({summary.added})
            </button>
            <button
              onClick={() => { setFilterType('modified'); selectByType('modified'); }}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
                filterType === 'modified'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-50 border border-yellow-300 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              <RefreshCw className="w-3 h-3" /> 수정 ({summary.modified})
            </button>
            <button
              onClick={() => { setFilterType('removed'); selectByType('removed'); }}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
                filterType === 'removed'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 border border-red-300 text-red-700 hover:bg-red-100'
              }`}
            >
              <Minus className="w-3 h-3" /> 삭제 ({summary.removed})
            </button>
          </div>

          <div className="flex-1" />

          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
              className="rounded"
            />
            변경 없음 표시 ({summary.unchanged})
          </label>
        </div>

        {/* 선택 컨트롤 */}
        <div className="px-6 py-2 bg-white border-b border-gray-200 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedCount === selectableCount && selectableCount > 0}
              onChange={(e) => toggleSelectAll(e.target.checked)}
              className="rounded"
            />
            <span className="text-xs text-gray-600">
              전체 선택 ({selectedCount}/{selectableCount})
            </span>
          </div>
          <div className="flex-1" />
          <span className="text-xs text-blue-600 font-medium">
            💡 선택한 항목만 기존 데이터에 적용됩니다
          </span>
        </div>

        {/* 변경 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredChanges.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">표시할 변경 사항이 없습니다.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="w-10 px-2 py-2 text-xs font-bold text-gray-600 border-b border-gray-200 text-center">선택</th>
                  <th className="w-16 px-2 py-2 text-xs font-bold text-gray-600 border-b border-gray-200 text-center">상태</th>
                  <th className="w-20 px-2 py-2 text-xs font-bold text-gray-600 border-b border-gray-200 text-center">공정번호</th>
                  <th className="w-24 px-2 py-2 text-xs font-bold text-gray-600 border-b border-gray-200 text-center">항목</th>
                  <th className="px-2 py-2 text-xs font-bold text-gray-600 border-b border-gray-200 text-left">변경 전</th>
                  <th className="w-8 px-2 py-2 text-xs font-bold text-gray-600 border-b border-gray-200 text-center">→</th>
                  <th className="px-2 py-2 text-xs font-bold text-gray-600 border-b border-gray-200 text-left">변경 후</th>
                </tr>
              </thead>
              <tbody>
                {filteredChanges.map((change) => {
                  const style = CHANGE_STYLES[change.changeType];
                  return (
                    <tr
                      key={change.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        change.selected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-2 py-2 text-center">
                        {change.changeType !== 'unchanged' && (
                          <input
                            type="checkbox"
                            checked={change.selected}
                            onChange={() => toggleSelect(change.id)}
                            className="rounded cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text} border`}>
                          {style.icon}
                          {style.label}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center text-xs font-mono font-bold text-gray-700">
                        {change.processNo}
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-gray-600">
                        {change.itemLabel || ITEM_LABELS[change.itemCode] || change.itemCode}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {change.changeType === 'added' ? (
                          <span className="text-gray-400 italic">-</span>
                        ) : (
                          <span className={change.changeType === 'modified' || change.changeType === 'removed' ? 'bg-red-100 px-1 py-0.5 rounded line-through text-red-600' : ''}>
                            {change.oldValue || <span className="text-gray-400 italic">(빈 값)</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-400">→</td>
                      <td className="px-2 py-2 text-xs">
                        {change.changeType === 'removed' ? (
                          <span className="text-gray-400 italic">-</span>
                        ) : (
                          <span className={change.changeType === 'modified' || change.changeType === 'added' ? 'bg-green-100 px-1 py-0.5 rounded text-green-700 font-medium' : ''}>
                            {change.newValue || <span className="text-gray-400 italic">(빈 값)</span>}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      {/* 푸터 */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          ⚠️ 적용 후에는 되돌릴 수 없습니다. 신중하게 선택해주세요.
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleApply}
            disabled={selectedCount === 0}
            className={`px-4 py-2 text-sm font-bold rounded transition-colors flex items-center gap-2 ${
              selectedCount > 0
                ? 'bg-[#00587a] text-white hover:bg-[#004a68]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            선택 항목 적용 ({selectedCount}건)
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
