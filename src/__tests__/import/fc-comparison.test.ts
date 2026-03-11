/**
 * @file fc-comparison.test.ts
 * @description FC(고장사슬) 비교/검증 유틸 TDD 테스트
 * @created 2026-02-21
 *
 * 비교 키: processNo + normalize(fmValue) + normalize(fcValue)
 * 검증 항목: existence, SOD completeness, AP correctness
 */

import { describe, it, expect } from 'vitest';
import {
  compareFCChains,
  validateFCCompleteness,
  type FCComparisonResult,
} from '@/app/(fmea-core)/pfmea/import/utils/fcComparison';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';

// ─── 테스트 헬퍼 ───

function makeChain(overrides: Partial<MasterFailureChain> = {}): MasterFailureChain {
  return {
    id: 'fc-0',
    processNo: '10',
    fmValue: '미조립',
    fcValue: '토크 부족',
    feValue: '안전 위험',
    ...overrides,
  };
}

function makeChainWithSOD(overrides: Partial<MasterFailureChain> = {}): MasterFailureChain {
  return makeChain({
    severity: 8,
    occurrence: 4,
    detection: 6,
    ap: 'M',
    ...overrides,
  });
}

// ─── compareFCChains 테스트 ───

describe('FC 비교 유틸', () => {
  describe('compareFCChains', () => {
    it('1. 자동도출 = 기존FC → 일치 100%', () => {
      const derived = [
        makeChain({ id: 'd1', processNo: '10', fmValue: '미조립', fcValue: '토크 부족' }),
        makeChain({ id: 'd2', processNo: '20', fmValue: '변형', fcValue: '과압' }),
      ];
      const existing = [
        makeChain({ id: 'e1', processNo: '10', fmValue: '미조립', fcValue: '토크 부족' }),
        makeChain({ id: 'e2', processNo: '20', fmValue: '변형', fcValue: '과압' }),
      ];

      const result = compareFCChains(derived, existing);

      expect(result.matched).toHaveLength(2);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
      expect(result.stats.matchRate).toBe(100);
    });

    it('2. 자동도출에 있고 기존FC에 없으면 → missing 배열', () => {
      const derived = [
        makeChain({ id: 'd1', processNo: '10', fmValue: '미조립', fcValue: '토크 부족' }),
        makeChain({ id: 'd2', processNo: '20', fmValue: '변형', fcValue: '과압' }),
      ];
      const existing = [
        makeChain({ id: 'e1', processNo: '10', fmValue: '미조립', fcValue: '토크 부족' }),
      ];

      const result = compareFCChains(derived, existing);

      expect(result.matched).toHaveLength(1);
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].processNo).toBe('20');
      expect(result.missing[0].fmValue).toBe('변형');
    });

    it('3. 기존FC에 있고 자동도출에 없으면 → extra 배열', () => {
      const derived = [
        makeChain({ id: 'd1', processNo: '10', fmValue: '미조립', fcValue: '토크 부족' }),
      ];
      const existing = [
        makeChain({ id: 'e1', processNo: '10', fmValue: '미조립', fcValue: '토크 부족' }),
        makeChain({ id: 'e2', processNo: '30', fmValue: '균열', fcValue: '피로' }),
      ];

      const result = compareFCChains(derived, existing);

      expect(result.matched).toHaveLength(1);
      expect(result.extra).toHaveLength(1);
      expect(result.extra[0].processNo).toBe('30');
    });

    it('4. SOD 누락된 체인 → incomplete 배열', () => {
      const chains = [
        makeChainWithSOD({ id: 'c1', fcValue: '토크 부족' }),
        makeChain({ id: 'c2', fcValue: '마모', severity: 8 }), // O, D 누락
        makeChain({ id: 'c3', fcValue: '균열' }), // SOD 전부 누락
      ];

      const result = compareFCChains(chains, chains);

      expect(result.incomplete).toHaveLength(2);
      expect(result.incomplete.map(c => c.id)).toContain('c2');
      expect(result.incomplete.map(c => c.id)).toContain('c3');
    });

    it('5. AP 값 불일치 → apMismatch 배열', () => {
      // calculateAP(2, 2, 2) = 'L', 하지만 existing은 ap='H'로 잘못 기입
      const derived = [
        makeChainWithSOD({ id: 'd1', severity: 2, occurrence: 2, detection: 2, ap: 'L' }),
      ];
      const existing = [
        makeChainWithSOD({ id: 'e1', severity: 2, occurrence: 2, detection: 2, ap: 'H' }), // 잘못된 AP
      ];

      const result = compareFCChains(derived, existing);

      expect(result.apMismatch).toHaveLength(1);
      expect(result.apMismatch[0].expected).toBe('L');
      expect(result.apMismatch[0].actual).toBe('H');
    });

    it('6. 빈 배열 입력 → 결과도 빈 배열', () => {
      const result = compareFCChains([], []);

      expect(result.matched).toHaveLength(0);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
      expect(result.incomplete).toHaveLength(0);
      expect(result.apMismatch).toHaveLength(0);
      expect(result.stats.total).toBe(0);
    });
  });

  describe('validateFCCompleteness', () => {
    it('7. 모든 체인에 SOD 있으면 → isComplete=true', () => {
      const chains = [
        makeChainWithSOD({ id: 'c1' }),
        makeChainWithSOD({ id: 'c2', processNo: '20' }),
      ];

      const result = validateFCCompleteness(chains);

      expect(result.isComplete).toBe(true);
      expect(result.incompleteCount).toBe(0);
    });

    it('8. SOD 누락 체인 존재 → isComplete=false + 누락 목록', () => {
      const chains = [
        makeChainWithSOD({ id: 'c1' }),
        makeChain({ id: 'c2', severity: 8 }), // O, D 누락
        makeChain({ id: 'c3' }), // 전부 누락
      ];

      const result = validateFCCompleteness(chains);

      expect(result.isComplete).toBe(false);
      expect(result.incompleteCount).toBe(2);
      expect(result.details).toHaveLength(2);
    });
  });
});
