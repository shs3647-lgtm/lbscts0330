/**
 * @file AIRecommendPanel.tsx
 * @description AI 추천 패널 컴포넌트 - 모달에서 AI 추천 항목 표시
 * @version 1.0.0
 * @created 2026-01-03
 */

'use client';

import React, { useEffect, useState } from 'react';
import { getAIRecommendations, getAIStatus, RankedItem, RecommendContext } from '@/lib/ai-recommendation';

interface AIRecommendPanelProps {
  context: RecommendContext;
  type: 'mode' | 'cause' | 'effect';
  onSelect: (value: string) => void;
  selectedValues?: string[];
}

const TYPE_CONFIG = {
  mode: {
    title: '고장형태(FM)',
    icon: '⚠️',
    color: 'orange',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-300',
    textClass: 'text-orange-700',
    badgeClass: 'bg-orange-100 text-orange-800',
  },
  cause: {
    title: '고장원인(FC)',
    icon: '🔧',
    color: 'red',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-300',
    textClass: 'text-red-700',
    badgeClass: 'bg-red-100 text-red-800',
  },
  effect: {
    title: '고장영향(FE)',
    icon: '💥',
    color: 'purple',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-300',
    textClass: 'text-purple-700',
    badgeClass: 'bg-purple-100 text-purple-800',
  },
};

export default function AIRecommendPanel({ context, type, onSelect, selectedValues = [] }: AIRecommendPanelProps) {
  const [recommendations, setRecommendations] = useState<RankedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState<{ isReady: boolean; historyCount: number } | null>(null);

  const config = TYPE_CONFIG[type];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsLoading(true);
    
    // AI 상태 체크
    const status = getAIStatus();
    setAiStatus(status);

    if (!status.isReady) {
      setIsLoading(false);
      return;
    }

    // 추천 가져오기
    const result = getAIRecommendations(context);
    
    let items: RankedItem[] = [];
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
    }

    setRecommendations(items);
    setIsLoading(false);
  }, [context, type]);

  const handleSelect = (item: RankedItem) => {
    if (!selectedValues.includes(item.value)) {
      onSelect(item.value);
    }
  };

  // AI 준비 안됨
  if (!aiStatus?.isReady) {
    return (
      <div className={`p-3 rounded-lg ${config.bgClass} border ${config.borderClass}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🤖</span>
          <span className={`text-xs font-bold ${config.textClass}`}>AI 추천</span>
        </div>
        <div className="text-center py-4">
          <span className="text-2xl">📚</span>
          <p className="text-xs text-gray-500 mt-2">
            학습 데이터가 부족합니다<br />
            <span className="text-[10px]">({aiStatus?.historyCount || 0}/10건)</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            FMEA를 더 많이 작성하면 AI가 학습합니다
          </p>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className={`p-3 rounded-lg ${config.bgClass} border ${config.borderClass}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg animate-spin">⚙️</span>
          <span className={`text-xs font-bold ${config.textClass}`}>AI 분석 중...</span>
        </div>
      </div>
    );
  }

  // 추천 없음
  if (recommendations.length === 0) {
    return (
      <div className={`p-3 rounded-lg ${config.bgClass} border ${config.borderClass}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{config.icon}</span>
          <span className={`text-xs font-bold ${config.textClass}`}>AI 추천 {config.title}</span>
        </div>
        <div className="text-center py-3">
          <span className="text-gray-400 text-xs">현재 컨텍스트에서 추천 없음</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg ${config.bgClass} border ${config.borderClass}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className={`text-xs font-bold ${config.textClass}`}>AI 추천 {config.title}</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.badgeClass}`}>
          {recommendations.length}건
        </span>
      </div>

      {/* 추천 목록 */}
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {recommendations.map((item, idx) => {
          const isSelected = selectedValues.includes(item.value);
          const confidencePercent = Math.round(item.confidence * 100);
          
          return (
            <div
              key={`${item.value}-${idx}`}
              onClick={() => handleSelect(item)}
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-green-100 border border-green-400' 
                  : 'bg-white border border-gray-200 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* 순위 */}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                  idx === 1 ? 'bg-gray-300 text-gray-700' :
                  idx === 2 ? 'bg-orange-300 text-orange-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {idx + 1}
                </span>
                
                {/* 값 */}
                <span className={`text-xs truncate ${isSelected ? 'font-bold text-green-700' : 'text-gray-700'}`}>
                  {item.value}
                </span>
              </div>

              {/* 신뢰도 + 빈도 */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] text-gray-400">
                  {item.frequency}회
                </span>
                <div 
                  className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden"
                  title={`신뢰도: ${confidencePercent}%`}
                >
                  <div 
                    className={`h-full rounded-full ${
                      confidencePercent >= 70 ? 'bg-green-500' :
                      confidencePercent >= 40 ? 'bg-yellow-500' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${Math.max(confidencePercent, 10)}%` }}
                  />
                </div>
                <span className="text-[9px] text-gray-500 w-6">{confidencePercent}%</span>
              </div>

              {/* 선택 아이콘 */}
              {isSelected && (
                <span className="text-green-600 ml-1">✓</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 연관 항목 표시 (첫 번째 추천의 연관 항목) */}
      {recommendations[0]?.relatedItems && recommendations[0].relatedItems.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <span className="text-[10px] text-gray-500">
            🔗 연관: {recommendations[0].relatedItems.join(', ')}
          </span>
        </div>
      )}

      {/* 컨텍스트 정보 */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="flex flex-wrap gap-1">
          {context.processName && (
            <span className="text-[9px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded">
              공정: {context.processName}
            </span>
          )}
          {context.m4Category && (
            <span className="text-[9px] px-1 py-0.5 bg-green-100 text-green-700 rounded">
              4M: {context.m4Category}
            </span>
          )}
          {context.requirement && (
            <span className="text-[9px] px-1 py-0.5 bg-orange-100 text-orange-700 rounded">
              요구: {context.requirement}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// 인라인 AI 추천 뱃지 (셀에서 사용)
// =====================================================

interface AIRecommendBadgeProps {
  context: RecommendContext;
  type: 'mode' | 'cause' | 'effect';
  topN?: number;
}

export function AIRecommendBadge({ context, type, topN = 3 }: AIRecommendBadgeProps) {
  const [recommendations, setRecommendations] = useState<RankedItem[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const status = getAIStatus();
    if (!status.isReady) return;

    const result = getAIRecommendations(context);
    
    let items: RankedItem[] = [];
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
    }

    setRecommendations(items.slice(0, topN));
  }, [context, type, topN]);

  if (recommendations.length === 0) return null;

  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[9px] text-purple-500">🤖</span>
      {recommendations.slice(0, 2).map((r, i) => (
        <span key={i} className="text-[9px] px-1 py-0.5 bg-purple-100 text-purple-700 rounded truncate max-w-[60px]">
          {r.value}
        </span>
      ))}
      {recommendations.length > 2 && (
        <span className="text-[9px] text-purple-400">+{recommendations.length - 2}</span>
      )}
    </div>
  );
}





