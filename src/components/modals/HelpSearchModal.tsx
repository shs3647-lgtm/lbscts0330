'use client';
// CODEFREEZE

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import {
  Language,
  ManualItem,
  UI_TEXT,
  MANUAL_DATA,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from './help';

/**
 * @file HelpSearchModal.tsx
 * @description 사용자 매뉴얼 플로팅 윈도우 UI 컴포넌트
 * @created 2026-02-06
 * @updated 2026-02-16 - 비모달 플로팅 윈도우 전환
 *
 * 매뉴얼 항목 추가/수정 → helpManualData.ts
 * 모달 UI/동작 수정 → 이 파일
 */

interface HelpSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearch?: string;
}

export default function HelpSearchModal({ isOpen, onClose, initialSearch }: HelpSearchModalProps) {
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState('');
  const [language] = useState<Language>('ko');
  const currentData = MANUAL_DATA[language];
  const currentUI = UI_TEXT[language];

  const [filteredItems, setFilteredItems] = useState<ManualItem[]>(currentData);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showCurrentPageOnly, setShowCurrentPageOnly] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: 900, height: 600, minWidth: 600, minHeight: 400
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedCategory(null);
      setShowCurrentPageOnly(false);
      // 기본으로 모든 카테고리 펼침
      const allCats = new Set(MANUAL_DATA[language].map(item => item.category));
      setExpandedCategories(allCats);

      if (initialSearch) {
        // initialSearch가 있으면 검색어 설정 + 첫 번째 매칭 항목 자동 선택
        setSearchTerm(initialSearch);
        const term = initialSearch.toLowerCase();
        const matchIdx = currentData.findIndex(item =>
          item.title.toLowerCase().includes(term) ||
          item.keywords.some(kw => kw.toLowerCase().includes(term))
        );
        setSelectedItemIdx(matchIdx >= 0 ? matchIdx : null);
      } else {
        setSearchTerm('');
        setSelectedItemIdx(null);
      }
    }
  }, [isOpen, language, initialSearch, currentData]);

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    let filtered = currentData;

    if (showCurrentPageOnly && pathname) {
      filtered = filtered.filter(item =>
        !item.paths || item.paths.length === 0 || item.paths.some(p => pathname.startsWith(p))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (term) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(term) ||
        item.content.toLowerCase().includes(term) ||
        item.keywords.some(kw => kw.toLowerCase().includes(term))
      );
      // 검색 시 매칭 카테고리 자동 펼침
      const matchedCats = new Set(filtered.map(item => item.category));
      setExpandedCategories(matchedCats);
    }

    setFilteredItems(filtered);
  }, [searchTerm, selectedCategory, showCurrentPageOnly, currentData, pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 카테고리별 그룹핑
  const categories = Array.from(new Set(currentData.map(item => item.category)));
  const categoryGroups: Record<string, ManualItem[]> = {};
  filteredItems.forEach(item => {
    if (!categoryGroups[item.category]) categoryGroups[item.category] = [];
    categoryGroups[item.category].push(item);
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleTreeItemClick = (item: ManualItem) => {
    const idx = currentData.indexOf(item);
    setSelectedItemIdx(idx);
    setSelectedCategory(null);
  };

  const selectedItem = selectedItemIdx !== null ? currentData[selectedItemIdx] : null;

  const highlightText = (text: string, term: string) => {
    if (!term.trim()) return text;
    try {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark> : part
      );
    } catch {
      return text;
    }
  };

  return createPortal(
    <div
      className="fixed z-[10000] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* 헤더 */}
      <div
        className="flex items-center gap-2 p-2.5 border-b bg-gradient-to-r from-indigo-600 to-blue-700 rounded-t-lg cursor-move shrink-0"
        onMouseDown={onDragStart}
      >
        <span className="text-white text-base">📖</span>
        <span className="text-white font-bold text-sm" title="Help / User Manual">도움말(Help)</span>
        <input
          ref={inputRef}
          type="text"
          placeholder={currentUI.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onMouseDown={e => e.stopPropagation()}
          className="flex-1 px-3 py-1 text-xs rounded border-0 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={() => { setShowCurrentPageOnly(!showCurrentPageOnly); setSelectedCategory(null); }}
          onMouseDown={e => e.stopPropagation()}
          className={`px-2 py-0.5 text-[9px] rounded-full transition-colors ${
            showCurrentPageOnly ? 'bg-green-400 text-white' : 'bg-white/20 text-white/80 hover:bg-white/30'
          }`}
          title="현재 화면 관련 항목만 표시"
        >
          {currentUI.currentPage}
        </button>
        <button onClick={onClose} onMouseDown={e => e.stopPropagation()} className="text-white/80 hover:text-white text-lg px-1.5">
          ✕
        </button>
      </div>

      {/* 본문: 좌측 트리 + 우측 콘텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 트리 탐색기 */}
        <div className="w-[220px] shrink-0 border-r bg-[#f7f8fa] overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
          {/* 트리 헤더 */}
          <div className="sticky top-0 bg-[#f0f1f3] px-2 py-1.5 border-b flex items-center gap-1.5 text-[10px] text-gray-600 font-semibold">
            <span>🗂️</span>
            <span>탐색기</span>
            <span className="ml-auto text-gray-400">{filteredItems.length}개</span>
          </div>

          {/* 트리 항목 */}
          <div className="py-0.5">
            {categories.map(cat => {
              const items = categoryGroups[cat];
              if (!items || items.length === 0) return null;
              const isExpanded = expandedCategories.has(cat);
              const icon = CATEGORY_ICONS[cat] || '📁';
              const colorClass = CATEGORY_COLORS[cat] || 'bg-gray-200 text-gray-700';

              return (
                <div key={cat}>
                  {/* 카테고리 폴더 */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center gap-1 px-2 py-1 text-left hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-[9px] text-gray-400 w-3 text-center">{isExpanded ? '▼' : '▶'}</span>
                    <span className="text-[10px]">{icon}</span>
                    <span className="text-[10px] font-semibold text-gray-700 truncate flex-1">{cat}</span>
                    <span className={`text-[8px] px-1 rounded ${colorClass}`}>{items.length}</span>
                  </button>

                  {/* 하위 항목 */}
                  {isExpanded && items.map((item, i) => {
                    const globalIdx = currentData.indexOf(item);
                    const isSelected = selectedItemIdx === globalIdx;
                    return (
                      <button
                        key={i}
                        onClick={() => handleTreeItemClick(item)}
                        className={`w-full flex items-center gap-1 pl-6 pr-2 py-0.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-blue-100 text-blue-800 font-semibold'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                        title={item.title}
                      >
                        <span className="text-[9px]">📄</span>
                        <span className="text-[10px] truncate">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
          {selectedItem ? (
            /* 단일 항목 상세 뷰 */
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 text-[9px] rounded-full font-semibold ${CATEGORY_COLORS[selectedItem.category] || 'bg-gray-100 text-gray-700'}`}>
                  {selectedItem.category}
                </span>
                <h2 className="font-bold text-base text-gray-800">{selectedItem.title}</h2>
                {selectedItem.paths && selectedItem.paths.length > 0 && (
                  <a
                    href={selectedItem.paths[0]}
                    className="ml-auto px-2 py-0.5 bg-blue-500 text-white text-[9px] rounded hover:bg-blue-600 transition-colors flex items-center gap-1 shrink-0"
                    title={`${selectedItem.paths[0]} 바로가기`}
                  >
                    <span>🔗</span>
                    <span>바로가기</span>
                  </a>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                  {highlightText(selectedItem.content, searchTerm)}
                </p>
              </div>
              {selectedItem.keywords.length > 0 && (
                <div className="mt-3 flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] text-gray-400">키워드:</span>
                  {selectedItem.keywords.map((kw, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{kw}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* 전체 목록 뷰 (항목 미선택 시) */
            <div className="p-2">
              {filteredItems.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <span className="text-3xl mb-2 block">📖</span>
                  <p className="text-sm">{currentUI.noResults}</p>
                  <p className="text-xs text-gray-400 mt-1">{currentUI.tryOther}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredItems.map((item, idx) => {
                    const globalIdx = currentData.indexOf(item);
                    return (
                      <div
                        key={idx}
                        className="p-2.5 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                        onClick={() => { setSelectedItemIdx(globalIdx); }}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`px-1.5 py-0.5 text-[8px] rounded ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-700'}`}>
                            {item.category}
                          </span>
                          <span className="font-semibold text-xs text-gray-800">
                            {highlightText(item.title, searchTerm)}
                          </span>
                          {item.paths && item.paths.length > 0 && (
                            <a
                              href={item.paths[0]}
                              onClick={(e) => e.stopPropagation()}
                              className="ml-auto px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[8px] rounded hover:bg-blue-200 transition-colors shrink-0"
                              title={item.paths[0]}
                            >
                              🔗 {item.paths[0]}
                            </a>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                          {item.content.substring(0, 120)}...
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 푸터 */}
      <div className="p-1.5 border-t bg-gray-50 rounded-b-lg shrink-0">
        <div className="flex items-center justify-between text-[9px] text-gray-500 px-1">
          <span>📖 {currentUI.totalItems} {filteredItems.length}{currentUI.items}{selectedItem ? ` | 선택: ${selectedItem.title}` : ''}</span>
          <div className="flex items-center gap-2">
            {selectedItem && (
              <button
                onClick={() => setSelectedItemIdx(null)}
                className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 text-[9px]"
              >
                전체 목록
              </button>
            )}
            <span>{currentUI.escToClose}</span>
          </div>
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
