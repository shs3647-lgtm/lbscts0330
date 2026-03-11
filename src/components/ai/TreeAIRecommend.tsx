/**
 * @file TreeAIRecommend.tsx
 * @description 트리뷰 인라인 AI 추천 컴포넌트 - TOP 3 추천 즉시 표시
 * @version 1.0.0
 * @created 2026-01-04
 * 
 * 사용법:
 * - 트리 노드 하위에 삽입하여 AI 추천 TOP 3 표시
 * - [+] 클릭: 추천 항목 즉시 추가
 * - 더블클릭: 인라인 편집
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  getAIRecommendations,
  getAIStatus,
  RankedItem,
  RecommendContext
} from '@/lib/ai-recommendation';
import { getDefaultRecommendations } from './defaultRules';

// =====================================================
// 타입 정의
// =====================================================

interface TreeAIRecommendProps {
  context: {
    processName?: string;
    workElement?: string;
    m4Category?: string;
    parentItem?: string;
    requirement?: string;
    productChar?: string;
  };
  type: 'cause' | 'mode' | 'effect' | 'requirement' | 'workElement';
  onAccept: (value: string) => void;
  onModify?: (original: string, modified: string) => void;
  onAddNew?: (value: string) => void;
  maxItems?: number;
  existingItems?: string[];
}

// 유형별 설정
const TYPE_CONFIG = {
  cause: {
    title: '고장원인',
    icon: '🔧',
    colorClass: 'orange',
  },
  mode: {
    title: '고장형태',
    icon: '⚠️',
    colorClass: 'red',
  },
  effect: {
    title: '고장영향',
    icon: '💥',
    colorClass: 'blue',
  },
  requirement: {
    title: '요구사항',
    icon: '📋',
    colorClass: 'green',
  },
  workElement: {
    title: '작업요소',
    icon: '🛠️',
    colorClass: 'purple',
  },
};

// =====================================================
// 메인 컴포넌트
// =====================================================

export default function TreeAIRecommend({
  context,
  type,
  onAccept,
  onModify,
  onAddNew,
  maxItems = 3,
  existingItems = [],
}: TreeAIRecommendProps) {
  const [recommendations, setRecommendations] = useState<RankedItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newItemMode, setNewItemMode] = useState(false);
  const [newItemValue, setNewItemValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const config = TYPE_CONFIG[type];

  // 추천 데이터 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const status = getAIStatus();
    let items: RankedItem[] = [];

    // AI 데이터가 충분하면 AI 추천 사용
    if (status.isReady) {
      const result = getAIRecommendations({
        processName: context.processName,
        workElement: context.workElement,
        m4Category: context.m4Category,
        requirement: context.requirement,
      });

      switch (type) {
        case 'mode':
          items = result.failureModes;
          break;
        case 'cause':
          items = result.failureCauses;
          break;
        case 'effect':
          items = result.failureEffects;
          break;
        default:
          items = [];
      }
    }

    // AI 추천이 부족하면 기본 규칙으로 보완
    if (items.length < maxItems) {
      const defaults = getDefaultRecommendations(context, type);
      const existingValues = new Set(items.map(i => i.value));

      for (const def of defaults) {
        if (!existingValues.has(def.value) && items.length < maxItems) {
          items.push(def);
        }
      }
    }

    // 이미 추가된 항목 제외
    const existingSet = new Set(existingItems.map(e => e.toLowerCase().trim()));
    items = items.filter(item => !existingSet.has(item.value.toLowerCase().trim()));

    setRecommendations(items.slice(0, maxItems));
  }, [context, type, maxItems, existingItems]);

  // 편집 모드 시 포커스
  useEffect(() => {
    if (editingIdx !== null && editInputRef.current) {
      editInputRef.current.focus();
      setTimeout(() => {
        editInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [editingIdx]);

  useEffect(() => {
    if (newItemMode && newInputRef.current) {
      newInputRef.current.focus();
      setTimeout(() => {
        newInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [newItemMode]);

  // 추천 항목 수용
  const handleAccept = (item: RankedItem) => {
    onAccept(item.value);
    // 추천 목록에서 제거
    setRecommendations(prev => prev.filter(r => r.value !== item.value));
  };

  // 더블클릭으로 편집 시작
  const handleDoubleClick = (idx: number, value: string) => {
    setEditingIdx(idx);
    setEditValue(value);
  };

  // 편집 완료
  const handleEditConfirm = () => {
    if (editingIdx === null) return;

    const original = recommendations[editingIdx].value;
    if (editValue.trim() && editValue !== original) {
      if (onModify) {
        onModify(original, editValue.trim());
      } else {
        onAccept(editValue.trim());
      }
    }

    setEditingIdx(null);
    setEditValue('');
    // 편집한 항목 제거
    setRecommendations(prev => prev.filter((_, i) => i !== editingIdx));
  };

  // 새 항목 추가
  const handleAddNew = () => {
    if (newItemValue.trim()) {
      if (onAddNew) {
        onAddNew(newItemValue.trim());
      } else {
        onAccept(newItemValue.trim());
      }
      setNewItemValue('');
      setNewItemMode(false);
    }
  };

  // 추천 없음
  if (recommendations.length === 0 && !newItemMode) {
    return null;
  }

  return (
    <div className="ml-4 mt-1 mb-2">
      {/* 헤더 */}
      <div
        className="flex items-center gap-1 cursor-pointer text-[11px] text-gray-500 hover:text-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-purple-500">🤖</span>
        <span>AI 추천 {config.title}</span>
        <span className="text-[9px] px-1 bg-purple-100 text-purple-700 rounded">
          {recommendations.length}건
        </span>
        <span className="text-[9px]">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {/* 추천 목록 */}
      {isExpanded && (
        <div className="mt-1 space-y-0.5">
          {recommendations.map((item, idx) => (
            <div
              key={`${item.value}-${idx}`}
              className="flex items-center gap-1 group"
            >
              {/* 순위 배지 */}
              <span className={`text-[9px] font-bold px-1 rounded ${idx === 0 ? 'bg-yellow-300 text-yellow-800' :
                  idx === 1 ? 'bg-gray-300 text-gray-700' :
                    'bg-orange-200 text-orange-700'
                }`}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
              </span>

              {/* 편집 모드 */}
              {editingIdx === idx ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditConfirm();
                      if (e.key === 'Escape') {
                        setEditingIdx(null);
                        setEditValue('');
                      }
                    }}
                    className="flex-1 text-[11px] px-1 py-0.5 border border-blue-400 rounded outline-none"
                  />
                  <button
                    onClick={handleEditConfirm}
                    className="text-[10px] px-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <>
                  {/* 추천 텍스트 */}
                  <span
                    className="text-[11px] text-gray-700 cursor-pointer hover:text-blue-600"
                    onDoubleClick={() => handleDoubleClick(idx, item.value)}
                    title="더블클릭하여 수정"
                  >
                    {item.value}
                  </span>

                  {/* 신뢰도 시각화 (진행바 + 퍼센트) */}
                  <div className="flex items-center gap-1">
                    <div className="w-[40px] h-[4px] bg-gray-200 rounded-sm overflow-hidden">
                      <div
                        className={`h-full rounded-sm ${item.confidence >= 0.7 ? 'bg-green-500' :
                            item.confidence >= 0.5 ? 'bg-yellow-500' :
                              'bg-orange-400'
                          }`}
                        style={{ width: `${Math.round(item.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400">
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </div>

                  {/* 추가 버튼 */}
                  <button
                    onClick={() => handleAccept(item)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 bg-green-500 text-white rounded hover:bg-green-600"
                    title="추가"
                  >
                    +
                  </button>
                </>
              )}
            </div>
          ))}

          {/* 직접 입력 */}
          {newItemMode ? (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-gray-400">➕</span>
              <input
                ref={newInputRef}
                type="text"
                value={newItemValue}
                onChange={(e) => setNewItemValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNew();
                  if (e.key === 'Escape') {
                    setNewItemMode(false);
                    setNewItemValue('');
                  }
                }}
                placeholder="직접 입력..."
                className="flex-1 text-[11px] px-1 py-0.5 border border-gray-300 rounded outline-none focus:border-blue-400"
              />
              <button
                onClick={handleAddNew}
                className="text-[10px] px-1.5 bg-green-500 text-white rounded hover:bg-green-600"
              >
                추가
              </button>
              <button
                onClick={() => {
                  setNewItemMode(false);
                  setNewItemValue('');
                }}
                className="text-[10px] px-1 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setNewItemMode(true)}
              className="text-[10px] text-gray-400 hover:text-blue-500 mt-1"
            >
              ➕ 직접 입력...
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// 미니 버전 (테이블 셀용)
// =====================================================

interface TreeAIMiniProps {
  context: RecommendContext;
  type: 'cause' | 'mode' | 'effect';
  onSelect: (value: string) => void;
}

export function TreeAIMini({ context, type, onSelect }: TreeAIMiniProps) {
  const [items, setItems] = useState<RankedItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const status = getAIStatus();
    if (!status.isReady) {
      setItems(getDefaultRecommendations(context, type));
      return;
    }

    const result = getAIRecommendations(context);
    let recs: RankedItem[] = [];
    switch (type) {
      case 'mode': recs = result.failureModes; break;
      case 'cause': recs = result.failureCauses; break;
      case 'effect': recs = result.failureEffects; break;
    }

    if (recs.length < 3) {
      const defaults = getDefaultRecommendations(context, type);
      const existingValues = new Set(recs.map(r => r.value));
      for (const def of defaults) {
        if (!existingValues.has(def.value)) recs.push(def);
      }
    }

    setItems(recs.slice(0, 3));
  }, [isOpen, context, type]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-[10px] px-1 py-0.5 bg-purple-100 text-purple-600 rounded hover:bg-purple-200"
        title="AI 추천"
      >
        🤖
      </button>

      {isOpen && items.length > 0 && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg p-1 min-w-[150px]">
          <div className="text-[9px] text-gray-400 px-1 mb-1">AI 추천 TOP 3</div>
          {items.map((item, idx) => (
            <div
              key={item.value}
              onClick={() => {
                onSelect(item.value);
                setIsOpen(false);
              }}
              className="text-[11px] px-2 py-1 hover:bg-purple-50 cursor-pointer rounded flex items-center gap-1"
            >
              <span className={`text-[9px] ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-orange-400'
                }`}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
              </span>
              <span>{item.value}</span>
              <div className="flex items-center gap-1 ml-auto">
                <div className="w-[30px] h-[3px] bg-gray-200 rounded-sm overflow-hidden">
                  <div
                    className={`h-full rounded-sm ${item.confidence >= 0.7 ? 'bg-green-500' :
                        item.confidence >= 0.5 ? 'bg-yellow-500' :
                          'bg-orange-400'
                      }`}
                    style={{ width: `${Math.round(item.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] text-gray-400">
                  {Math.round(item.confidence * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}




