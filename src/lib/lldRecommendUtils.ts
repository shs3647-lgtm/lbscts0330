/**
 * @file lldRecommendUtils.ts
 * @description 습득교훈(LLD) 키워드 기반 추천 유틸리티
 * - LLDSelectModal과 useAutoLldHandlers에서 공유
 * - 고장형태/고장원인 텍스트 키워드 매칭으로 LLD 추천
 */

// ─── 공유 타입 ───

export interface LLDItem {
  id: string;
  lldNo: string;
  vehicle: string;
  target: string;
  failureMode: string;
  cause: string;
  category: '예방관리' | '검출관리' | string;
  improvement: string;
  status: 'G' | 'Y' | 'R' | string;
  classification?: string;
}

export interface LLDRecommendContext {
  pcKeywords?: string[];
  dcKeywords?: string[];
  preferredTarget?: 'prevention' | 'detection';
}

// ─── 키워드 추출 ───

/** 불용어(stopwords) — 매칭에서 제외할 짧은/일반적 단어 */
const STOPWORDS = new Set([
  '의', '가', '이', '은', '는', '을', '를', '에', '에서', '로', '으로', '와', '과', '도',
  '및', '또는', '하여', '하고', '되어', '되는', '된', '하는', '하다', '있는', '없는',
  '것', '수', '등', '중', '시', '후', '전', '때', '대', '내', '외',
  'the', 'a', 'an', 'is', 'are', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or',
]);

/** 텍스트에서 의미있는 키워드를 추출 (2글자 이상, 불용어 제외) */
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  const tokens = text.toLowerCase()
    .replace(/[></_]/g, ' ')
    .replace(/[^\w가-힣]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
  return [...new Set(tokens)];
}

/** 두 텍스트 사이의 키워드 매칭 점수 (0~1) */
export function keywordMatchScore(sourceKeywords: string[], targetText: string): number {
  if (sourceKeywords.length === 0 || !targetText) return 0;
  const targetKeywords = extractKeywords(targetText);
  const target = targetText.toLowerCase();
  let matchWeight = 0;
  for (const kw of sourceKeywords) {
    if (targetKeywords.includes(kw)) {
      matchWeight += 1;
      continue;
    }
    if (target.includes(kw) || targetKeywords.some(t => t.includes(kw) || kw.includes(t))) {
      matchWeight += 0.6;
    }
  }
  return Math.min(1, matchWeight / sourceKeywords.length);
}

// ─── 추천 점수 계산 ───

function getItemTarget(category: string): 'prevention' | 'detection' | null {
  if (category === '예방관리') return 'prevention';
  if (category === '검출관리') return 'detection';
  return null;
}

function getStatusBoost(status: string): number {
  if (status === 'G') return 0.4;
  if (status === 'Y') return 0.15;
  if (status === 'R') return -0.1;
  return 0;
}

/** LLD 항목의 추천 점수 계산 */
export function calcRecommendScore(
  item: LLDItem,
  fmKeywords: string[],
  fcKeywords: string[],
  context: LLDRecommendContext = {},
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const itemTarget = getItemTarget(item.category);
  const pcKeywords = context.pcKeywords || [];
  const dcKeywords = context.dcKeywords || [];

  // 1. 고장형태(FM) ↔ LLD 고장형태 매칭 (가중치 3)
  const fmToFm = keywordMatchScore(fmKeywords, item.failureMode);
  if (fmToFm > 0) {
    score += fmToFm * 3;
    reasons.push('고장형태 유사');
  }

  // 2. 고장원인(FC) ↔ LLD 고장원인 매칭 (가중치 3)
  const fcToCause = keywordMatchScore(fcKeywords, item.cause);
  if (fcToCause > 0) {
    score += fcToCause * 3;
    reasons.push('고장원인 유사');
  }

  // 3. 고장형태(FM) ↔ LLD 고장원인 교차 매칭 (가중치 1)
  const fmToCause = keywordMatchScore(fmKeywords, item.cause);
  if (fmToCause > 0) {
    score += fmToCause * 1;
  }

  // 4. 고장원인(FC) ↔ LLD 고장형태 교차 매칭 (가중치 1)
  const fcToFm = keywordMatchScore(fcKeywords, item.failureMode);
  if (fcToFm > 0) {
    score += fcToFm * 1;
  }

  // 5. FM/FC ↔ LLD 개선대책 매칭 (가중치 0.5)
  const fmToImpr = keywordMatchScore(fmKeywords, item.improvement);
  const fcToImpr = keywordMatchScore(fcKeywords, item.improvement);
  if (fmToImpr > 0 || fcToImpr > 0) {
    score += (fmToImpr + fcToImpr) * 0.5;
    if (reasons.length === 0) reasons.push('개선대책 관련');
  }

  // 6. 현재 예방/검출관리 텍스트와 LLD 개선대책 정합성 반영
  if (itemTarget === 'prevention' && pcKeywords.length > 0) {
    const pcContextScore = Math.max(
      keywordMatchScore(pcKeywords, item.improvement),
      keywordMatchScore(pcKeywords, item.cause),
      keywordMatchScore(pcKeywords, item.failureMode),
    );
    if (pcContextScore > 0) {
      score += pcContextScore * 1.5;
      reasons.push('현재 예방관리와 유사');
    }
  }

  if (itemTarget === 'detection' && dcKeywords.length > 0) {
    const dcContextScore = Math.max(
      keywordMatchScore(dcKeywords, item.improvement),
      keywordMatchScore(dcKeywords, item.cause),
      keywordMatchScore(dcKeywords, item.failureMode),
    );
    if (dcContextScore > 0) {
      score += dcContextScore * 1.5;
      reasons.push('현재 검출관리와 유사');
    }
  }

  // 7. 사용자가 현재 반영하려는 대상(예방/검출)과 구분이 맞는 항목 우대
  if (context.preferredTarget && itemTarget) {
    if (context.preferredTarget === itemTarget) {
      score += 0.5;
      reasons.push('반영 대상 일치');
    } else {
      score -= 0.2;
    }
  }

  // 8. 완료된 사례를 약간 우선
  const statusBoost = getStatusBoost(item.status);
  if (score > 0 && statusBoost !== 0) {
    score += statusBoost;
    if (statusBoost > 0) reasons.push('완료 사례 우선');
  }

  return {
    score: Math.max(0, Math.round(score * 100) / 100),
    reasons: [...new Set(reasons)],
  };
}
