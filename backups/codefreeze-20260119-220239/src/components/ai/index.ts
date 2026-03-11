/**
 * @file index.ts
 * @description AI 추천 컴포넌트 모음 내보내기
 * @version 1.0.0
 */

// 메인 컴포넌트
export { default as AIRecommendPanel } from './AIRecommendPanel';
export { AIRecommendBadge } from './AIRecommendPanel';
export { default as TreeAIRecommend } from './TreeAIRecommend';
export { TreeAIMini } from './TreeAIRecommend';

// 기본 규칙
export { 
  getDefaultRecommendations,
  getCausesByM4,
  getModesByProcess,
  getEffectsByScope,
  INDUSTRY_TEMPLATES,
} from './defaultRules';




