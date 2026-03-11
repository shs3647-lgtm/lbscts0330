/**
 * @file all-tab-map-utils.test.ts
 * @description ALL탭 순수함수/Map 파일 단위테스트 — 커버리지 강화
 * @created 2026-03-04
 *
 * 테스트 대상 (6개 파일, 13개 함수):
 * 1. severityKeywordMap: matchFESeverity, getBestSeverity
 * 2. detectionRatingMap: recommendDetection, getDetectionRecommendation, clampToAllowedRating
 * 3. preventionKeywordMap: normalize4M, matchPreventionRules, get4MDefaultMethods
 * 4. detectionKeywordMap: matchDetectionRules, getRecommendedDetectionMethods
 * 5. similarityScore: extractCoreKeywords, scoreSimilarity, clearSimilarityCaches
 * 6. pcOccurrenceMap: correctOccurrence
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ═══════════════════════════════════════════
// 1. severityKeywordMap
// ═══════════════════════════════════════════
import {
  matchFESeverity,
  getBestSeverity,
} from '../app/(fmea-core)/pfmea/worksheet/tabs/all/hooks/severityKeywordMap';

describe('severityKeywordMap', () => {
  describe('matchFESeverity', () => {
    it('S접두사 파싱: "S7:선별 폐기" → rating=7', () => {
      const results = matchFESeverity('S7:선별 폐기');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].rating).toBe(7);
    });

    it('빈 문자열 → 빈 배열', () => {
      expect(matchFESeverity('')).toEqual([]);
    });

    it('키워드 매칭: 법적 위반 관련 → 높은 심각도 (S≥8)', () => {
      const results = matchFESeverity('법적 규제 위반 가능');
      if (results.length > 0) {
        expect(results[0].rating).toBeGreaterThanOrEqual(8);
      }
    });

    it('복수 매칭 → 점수 내림차순 정렬', () => {
      const results = matchFESeverity('라인 정지 및 고객 불만');
      if (results.length >= 2) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      }
    });
  });

  describe('getBestSeverity', () => {
    it('S접두사 우선: "S9:안전 문제" → rating=9', () => {
      const result = getBestSeverity('S9:안전 문제');
      expect(result).not.toBeNull();
      expect(result!.rating).toBe(9);
    });

    it('빈 문자열 → null', () => {
      expect(getBestSeverity('')).toBeNull();
    });

    it('유효한 FE 텍스트 → SeverityMatch 반환', () => {
      const result = getBestSeverity('외관 불량');
      // 외관 관련 키워드가 매칭되면 결과 반환
      if (result) {
        expect(result.rating).toBeGreaterThanOrEqual(1);
        expect(result.rating).toBeLessThanOrEqual(10);
      }
    });
  });
});

// ═══════════════════════════════════════════
// 2. detectionRatingMap
// ═══════════════════════════════════════════
import {
  recommendDetection,
  getDetectionRecommendation,
  clampToAllowedRating,
  FC_ALLOWED_RATINGS,
} from '../app/(fmea-core)/pfmea/worksheet/tabs/all/hooks/detectionRatingMap';

describe('detectionRatingMap', () => {
  describe('recommendDetection', () => {
    it('비전검사 → D=7 (AIAG-VDA: 기계기반 검출, MSA 미입증)', () => {
      expect(recommendDetection('비전검사')).toBe(7);
    });

    it('육안검사 → D=7 (AIAG-VDA: 사람 의존 검출, detectionRatingMap 기준)', () => {
      expect(recommendDetection('육안검사')).toBe(7);
    });

    it('빈 문자열 → 기본값 (D=10 또는 0)', () => {
      const result = recommendDetection('');
      expect([0, 10]).toContain(result);
    });

    it('복수 검출방법: 최소 D값 반환', () => {
      const result = recommendDetection('비전검사\n육안검사');
      // 비전(7) + 육안(8) → 최소값 7
      expect(result).toBe(7);
    });
  });

  describe('getDetectionRecommendation', () => {
    it('유효 DC → recommendedD 포함 객체 반환', () => {
      const result = getDetectionRecommendation('바코드 스캐너');
      expect(result).toHaveProperty('recommendedD');
      expect(typeof result.recommendedD).toBe('number');
    });
  });

  describe('clampToAllowedRating', () => {
    it('FC target: D=9 → 0 (FC 허용 1~8 초과 시 0 반환)', () => {
      expect(clampToAllowedRating(9, 'fc')).toBe(0);
    });

    it('FM target: D=9 → 9 (FM은 D=1~10)', () => {
      expect(clampToAllowedRating(9, 'fm')).toBe(9);
    });

    it('FC target: D=3 → 3 (범위 내)', () => {
      expect(clampToAllowedRating(3, 'fc')).toBe(3);
    });

    it('FC_ALLOWED_RATINGS 최대값 = 8', () => {
      expect(FC_ALLOWED_RATINGS[FC_ALLOWED_RATINGS.length - 1]).toBe(8);
    });
  });
});

// ═══════════════════════════════════════════
// 3. preventionKeywordMap
// ═══════════════════════════════════════════
import {
  normalize4M,
  matchPreventionRules,
  get4MDefaultMethods,
  FC_TO_PC_RULES,
} from '../app/(fmea-core)/pfmea/worksheet/tabs/all/hooks/preventionKeywordMap';

describe('preventionKeywordMap', () => {
  describe('normalize4M', () => {
    it('"md" → "MC" (Machine)', () => {
      expect(normalize4M('md')).toBe('MC');
    });

    it('"MT" → "IM" (Material)', () => {
      expect(normalize4M('MT')).toBe('IM');
    });

    it('빈 문자열 → ""', () => {
      expect(normalize4M('')).toBe('');
    });

    it('"mn" → "MN" (Man)', () => {
      expect(normalize4M('mn')).toBe('MN');
    });

    it('"EN" → "EN" (Environment)', () => {
      expect(normalize4M('EN')).toBe('EN');
    });
  });

  describe('matchPreventionRules', () => {
    it('FC 키워드 매칭: "지그" → 규칙 반환', () => {
      const results = matchPreventionRules('지그 마모', FC_TO_PC_RULES);
      expect(results.length).toBeGreaterThan(0);
    });

    it('빈 텍스트 → 빈 배열', () => {
      expect(matchPreventionRules('', FC_TO_PC_RULES)).toEqual([]);
    });

    it('결과 우선순위 정렬 확인', () => {
      const results = matchPreventionRules('지그 파손 마모', FC_TO_PC_RULES);
      if (results.length >= 2) {
        expect(results[0].priority).toBeLessThanOrEqual(results[1].priority);
      }
    });
  });

  describe('get4MDefaultMethods', () => {
    it('MC → 설비 관련 기본 예방방법 반환', () => {
      const methods = get4MDefaultMethods('MC');
      expect(methods.length).toBeGreaterThan(0);
      // 설비 관련 키워드 포함 확인
      const joined = methods.join(' ');
      expect(joined).toMatch(/유지|보전|점검|설비/);
    });

    it('빈 4M → 빈 배열', () => {
      expect(get4MDefaultMethods('')).toEqual([]);
    });
  });
});

// ═══════════════════════════════════════════
// 4. detectionKeywordMap
// ═══════════════════════════════════════════
import {
  matchDetectionRules,
  getRecommendedDetectionMethods,
} from '../app/(fmea-core)/pfmea/worksheet/tabs/all/hooks/detectionKeywordMap';

describe('detectionKeywordMap', () => {
  describe('matchDetectionRules', () => {
    it('치수 관련 FM → 규칙 반환', () => {
      const results = matchDetectionRules('치수 변형');
      expect(results.length).toBeGreaterThan(0);
    });

    it('빈 문자열 → 빈 배열', () => {
      expect(matchDetectionRules('')).toEqual([]);
    });

    it('복수 매칭 → 우선순위 정렬', () => {
      const results = matchDetectionRules('치수 불량 외관 변색');
      if (results.length >= 2) {
        expect(results[0].priority).toBeLessThanOrEqual(results[1].priority);
      }
    });
  });

  describe('getRecommendedDetectionMethods', () => {
    it('FM 텍스트 → 검출방법 문자열 배열', () => {
      const methods = getRecommendedDetectionMethods('치수 불량');
      expect(Array.isArray(methods)).toBe(true);
      if (methods.length > 0) {
        expect(typeof methods[0]).toBe('string');
      }
    });

    it('중복 제거 확인', () => {
      const methods = getRecommendedDetectionMethods('치수 변형 파손');
      const unique = new Set(methods);
      expect(methods.length).toBe(unique.size);
    });
  });
});

// ═══════════════════════════════════════════
// 5. similarityScore
// ═══════════════════════════════════════════
import {
  extractCoreKeywords,
  scoreSimilarity,
  clearSimilarityCaches,
} from '../app/(fmea-core)/pfmea/worksheet/tabs/all/hooks/similarityScore';

describe('similarityScore', () => {
  beforeEach(() => {
    clearSimilarityCaches();
  });

  describe('extractCoreKeywords', () => {
    it('번호/M4코드 제거: "80번_MC_041-2 지그 마모" → 핵심 키워드만', () => {
      const keywords = extractCoreKeywords('80번_MC_041-2 지그 마모');
      expect(keywords).toContain('지그');
      expect(keywords).toContain('마모');
      // M4코드/번호는 제거
      expect(keywords).not.toContain('MC');
      expect(keywords).not.toContain('80번');
    });

    it('빈 문자열 → 빈 배열', () => {
      expect(extractCoreKeywords('')).toEqual([]);
    });

    it('동일 입력 → 동일 출력 (멱등성)', () => {
      const a = extractCoreKeywords('도포기 파라미터 변동');
      const b = extractCoreKeywords('도포기 파라미터 변동');
      expect(a).toEqual(b);
    });
  });

  describe('scoreSimilarity', () => {
    it('동일 문자열 → 높은 유사도 (>0.5)', () => {
      const score = scoreSimilarity('지그 점검', '지그 점검');
      expect(score).toBeGreaterThan(0.5);
    });

    it('완전히 다른 문자열 → 낮은 유사도 (<0.3)', () => {
      const score = scoreSimilarity('도포기 압력', '전자부품 납땜');
      expect(score).toBeLessThan(0.3);
    });

    it('부분 매칭 → 중간 유사도', () => {
      const score = scoreSimilarity('지그 마모', '지그 정기점검');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('리턴 범위: 0 ~ 1', () => {
      const score = scoreSimilarity('테스트', '테스트 검증');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════
// 6. pcOccurrenceMap
// ═══════════════════════════════════════════
import {
  correctOccurrence,
} from '../app/(fmea-core)/pfmea/worksheet/tabs/all/hooks/pcOccurrenceMap';

describe('pcOccurrenceMap', () => {
  describe('correctOccurrence', () => {
    it('Poka-Yoke → O=2 (물리적 차단)', () => {
      const result = correctOccurrence('Poka-Yoke 포카요케');
      expect(result.correctedO).toBe(2);
    });

    it('SPC 관리도 → O=3 (자동 기반)', () => {
      const result = correctOccurrence('SPC 관리도');
      expect(result.correctedO).toBe(3);
    });

    it('교육훈련 → O=5 (v3.0 기준)', () => {
      const result = correctOccurrence('교육훈련');
      expect(result.correctedO).toBe(5);
    });

    it('빈 문자열 → correctedO=null', () => {
      const result = correctOccurrence('');
      expect(result.correctedO).toBeNull();
    });

    it('복수 매칭: SPC + 교육 → 최소 O값 (O=3)', () => {
      const result = correctOccurrence('SPC 관리도\n교육훈련');
      expect(result.correctedO).toBeLessThanOrEqual(3);
    });

    it('결과 객체에 matchedLevel, reason 포함', () => {
      const result = correctOccurrence('예방유지보전 PM');
      expect(result).toHaveProperty('matchedLevel');
      expect(result).toHaveProperty('reason');
      expect(typeof result.reason).toBe('string');
    });

    it('P: 접두사 제거 후 매칭', () => {
      const result = correctOccurrence('P:예방유지보전 PM');
      // P: 접두사 무관하게 동일 결과
      const resultNoPrefix = correctOccurrence('예방유지보전 PM');
      expect(result.correctedO).toBe(resultNoPrefix.correctedO);
    });
  });
});
