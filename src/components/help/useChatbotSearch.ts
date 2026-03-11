/**
 * @file useChatbotSearch.ts
 * @description 챗봇 도움말 검색/매칭 로직
 *
 * 69개 ManualItem에서 키워드 매칭 + 점수 기반 순위 결정
 */

import { useMemo, useCallback } from 'react';
import { MANUAL_DATA, type ManualItem } from '@/components/modals/help';

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  items?: ManualItem[];      // bot 응답에 매칭된 항목들
  timestamp: number;
}

/** 검색 점수 계산 — title/keyword/content 가중치 */
function scoreItem(item: ManualItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const tokens = q.split(/\s+/).filter(Boolean);
  let score = 0;

  for (const tok of tokens) {
    // title 매칭 (가중치 10)
    if (item.title.toLowerCase().includes(tok)) score += 10;
    // keyword 매칭 (가중치 8)
    if (item.keywords.some(k => k.toLowerCase().includes(tok))) score += 8;
    // category 매칭 (가중치 5)
    if (item.category.toLowerCase().includes(tok)) score += 5;
    // content 매칭 (가중치 2)
    if (item.content.toLowerCase().includes(tok)) score += 2;
  }

  return score;
}

/** 쿼리에 매칭되는 ManualItem을 점수순으로 반환 */
export function searchManualItems(query: string, maxResults = 5): ManualItem[] {
  const items = MANUAL_DATA.ko;
  if (!query.trim()) return [];

  const scored = items
    .map(item => ({ item, score: scoreItem(item, query) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored.map(s => s.item);
}

/** 카테고리별 그룹핑 */
export function getCategories(): string[] {
  const items = MANUAL_DATA.ko;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (!seen.has(item.category)) {
      seen.add(item.category);
      result.push(item.category);
    }
  }
  return result;
}

/** 카테고리의 모든 항목 */
export function getItemsByCategory(category: string): ManualItem[] {
  return MANUAL_DATA.ko.filter(item => item.category === category);
}

/** content에서 첫 N글자 스니펫 추출 */
export function getSnippet(content: string, maxLen = 120): string {
  const clean = content.replace(/\\n/g, ' ').replace(/[■•▶▼]/g, '').trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean;
}

/** 고유 ID 생성 */
export function createMsgId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** 현재 경로에 맞는 추천 항목 */
export function getRecommendedForPath(pathname: string): ManualItem[] {
  return MANUAL_DATA.ko.filter(
    item => item.paths?.some(p => pathname.startsWith(p))
  ).slice(0, 4);
}

/** useChatbotSearch — 검색 모드용 훅 */
export function useChatbotSearch(query: string, category: string) {
  const results = useMemo(() => {
    if (category && !query.trim()) {
      return getItemsByCategory(category);
    }
    if (query.trim()) {
      const items = category
        ? searchManualItems(query, 20).filter(i => i.category === category)
        : searchManualItems(query, 10);
      return items;
    }
    return [];
  }, [query, category]);

  const categories = useMemo(() => getCategories(), []);

  return { results, categories };
}
