/**
 * @file fc-comparison.test.ts
 * @description FC(고장사슬) 비교 — FK 우선, 플랜C는 산업DB 키워드(무FK)만
 */

import { describe, it, expect } from 'vitest';
import {
  compareFCChains,
  validateFCCompleteness,
} from '@/app/(fmea-core)/pfmea/import/utils/fcComparison';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';

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

describe('FC 비교 유틸', () => {
  describe('compareFCChains', () => {
    it('1. 동일 FK 3키 → 일치 100%', () => {
      const derived = [
        makeChain({ id: 'd1', feId: 'fe-1', fmId: 'fm-1', fcId: 'fc-1', processNo: '10' }),
        makeChain({ id: 'd2', feId: 'fe-2', fmId: 'fm-2', fcId: 'fc-2', processNo: '20' }),
      ];
      const existing = [
        makeChain({ id: 'e1', feId: 'fe-1', fmId: 'fm-1', fcId: 'fc-1', processNo: '10' }),
        makeChain({ id: 'e2', feId: 'fe-2', fmId: 'fm-2', fcId: 'fc-2', processNo: '20' }),
      ];

      const result = compareFCChains(derived, existing, { industryAnchors: null });

      expect(result.matched).toHaveLength(2);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
      expect(result.stats.matchRate).toBe(100);
    });

    it('2. FK 일치 1건만 → missing 1건', () => {
      const derived = [
        makeChain({ id: 'd1', feId: 'fe-1', fmId: 'fm-1', fcId: 'fc-1' }),
        makeChain({ id: 'd2', feId: 'fe-2', fmId: 'fm-2', fcId: 'fc-2', processNo: '20' }),
      ];
      const existing = [
        makeChain({ id: 'e1', feId: 'fe-1', fmId: 'fm-1', fcId: 'fc-1' }),
      ];

      const result = compareFCChains(derived, existing, { industryAnchors: null });

      expect(result.matched).toHaveLength(1);
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].id).toBe('d2');
    });

    it('3. extra — existing만 FK 보유', () => {
      const derived = [
        makeChain({ id: 'd1', feId: 'fe-1', fmId: 'fm-1', fcId: 'fc-1' }),
      ];
      const existing = [
        makeChain({ id: 'e1', feId: 'fe-1', fmId: 'fm-1', fcId: 'fc-1' }),
        makeChain({ id: 'e2', feId: 'fe-9', fmId: 'fm-9', fcId: 'fc-9', processNo: '30' }),
      ];

      const result = compareFCChains(derived, existing, { industryAnchors: null });

      expect(result.matched).toHaveLength(1);
      expect(result.extra).toHaveLength(1);
      expect(result.extra[0].id).toBe('e2');
    });

    it('4. SOD 누락 → incomplete', () => {
      const chains = [
        makeChainWithSOD({ id: 'c1', feId: 'fe-a', fmId: 'fm-a', fcId: 'fc-a', fcValue: '토크 부족' }),
        makeChain({ id: 'c2', feId: 'fe-b', fmId: 'fm-b', fcId: 'fc-b', fcValue: '마모', severity: 8 }),
        makeChain({ id: 'c3', feId: 'fe-c', fmId: 'fm-c', fcId: 'fc-c', fcValue: '균열' }),
      ];

      const result = compareFCChains(chains, chains, { industryAnchors: null });

      expect(result.incomplete).toHaveLength(2);
      expect(result.incomplete.map(c => c.id)).toContain('c2');
      expect(result.incomplete.map(c => c.id)).toContain('c3');
    });

    it('5. AP 불일치 → apMismatch', () => {
      const derived = [
        makeChainWithSOD({ id: 'd1', feId: 'fe-1', fmId: 'fm-1', fcId: 'fc-1', severity: 2, occurrence: 2, detection: 2, ap: 'L' }),
      ];
      const existing = [
        makeChainWithSOD({ id: 'e1', feId: 'fe-1', fmId: 'fm-1', fcId: 'fc-1', severity: 2, occurrence: 2, detection: 2, ap: 'H' }),
      ];

      const result = compareFCChains(derived, existing, { industryAnchors: null });

      expect(result.apMismatch).toHaveLength(1);
      expect(result.apMismatch[0].expected).toBe('L');
      expect(result.apMismatch[0].actual).toBe('H');
    });

    it('6. 빈 derived → 빈 결과', () => {
      const result = compareFCChains([], [], { industryAnchors: null });

      expect(result.matched).toHaveLength(0);
      expect(result.stats.total).toBe(0);
    });

    it('7. 플랜C: 무FK + 산업 키워드(토크+숙련도) 동일 시 매칭', () => {
      const derived = [
        makeChain({
          id: 'd1',
          processNo: '10',
          fmValue: '체결 토크 불량',
          fcValue: '작업자 숙련도 부족',
        }),
      ];
      const existing = [
        makeChain({
          id: 'e1',
          processNo: '10',
          fmValue: '토크 미달',
          fcValue: '숙련도 미달',
        }),
      ];
      const result = compareFCChains(derived, existing);
      expect(result.matched).toHaveLength(1);
      expect(result.missing).toHaveLength(0);
    });
  });

  describe('validateFCCompleteness', () => {
    it('8. SOD 완전 → isComplete', () => {
      const chains = [
        makeChainWithSOD({ id: 'c1', feId: 'fe-1', fmId: 'fm-1', fcId: 'fc-1' }),
      ];
      expect(validateFCCompleteness(chains).isComplete).toBe(true);
    });
  });
});
