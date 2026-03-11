// CODEFREEZE
/**
 * ProcessSelectModal - 공정 선택 모달 (다중선택 지원)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface ProcessItem {
  id: string;
  no: string;
  name: string;
}

interface ProcessSelectModalProps {
  isOpen: boolean;
  title: string;
  items: ProcessItem[];
  selectedIds: string[];
  multiSelect?: boolean;
  onSelect: (selectedItems: ProcessItem[]) => void;
  onClose: () => void;
}

export const ProcessSelectModal: React.FC<ProcessSelectModalProps> = ({
  isOpen,
  title,
  items,
  selectedIds,
  multiSelect = false,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: 500, height: 500, minWidth: 400, minHeight: 350
  });

  useEffect(() => {
    setSelected(new Set(selectedIds));
  }, [selectedIds, isOpen]);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return `${item.no} ${item.name}`.toLowerCase().includes(q);
  });

  const handleToggle = (id: string) => {
    if (multiSelect) {
      const newSelected = new Set(selected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelected(newSelected);
    } else {
      // 단일 선택 시 즉시 선택
      const item = items.find((i) => i.id === id);
      if (item) {
        onSelect([item]);
      }
    }
  };

  const handleConfirm = () => {
    const selectedItems = items.filter((item) => selected.has(item.id));
    onSelect(selectedItems);
  };

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      onKeyDown={e => e.stopPropagation()}
    >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-[#00587a] text-white rounded-t-lg cursor-move shrink-0" onMouseDown={onDragStart}>
          <h3 className="text-sm font-bold">🔍 {title}</h3>
          <button
            onClick={onClose}
            onMouseDown={e => e.stopPropagation()}
            className="text-white hover:text-gray-200 text-lg"
          >
            ✕
          </button>
        </div>

        {/* 검색 */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#2b78c5]"
            autoFocus
          />
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-400 text-sm">
              검색 결과가 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    selected.has(item.id)
                      ? 'bg-[#e3f2fd]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {multiSelect && (
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => {}}
                      className="w-4 h-4 text-[#2b78c5] rounded border-gray-300"
                    />
                  )}
                  <span className="text-sm font-bold text-[#00587a] w-12">
                    {item.no}
                  </span>
                  <span className="flex-1 text-sm text-gray-700">
                    {item.name}
                  </span>
                  {!multiSelect && (
                    <span className="text-xs text-gray-400">클릭하여 선택</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg shrink-0">
          <span className="text-xs text-gray-500">
            {multiSelect ? `선택: ${selected.size}개` : '항목을 클릭하여 선택하세요'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              취소
            </button>
            {multiSelect && (
              <button
                onClick={handleConfirm}
                disabled={selected.size === 0}
                className="px-4 py-2 text-xs text-white bg-[#1976d2] rounded hover:bg-[#1565c0] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ 선택 완료
              </button>
            )}
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
};

export default ProcessSelectModal;















