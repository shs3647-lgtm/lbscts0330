/**
 * @file apply-occurrence-from-prevention.test.ts
 * @description 발생도 보정: O=1 + PC 텍스트 → 산업DB 또는 키워드 매트릭스
 */

import { describe, expect, it } from 'vitest';
import {
  applyOccurrenceFromPrevention,
  buildIndustryPreventionOMap,
  lookupIndustryOccurrence,
  shouldReevaluateOccurrence,
} from '@/app/(fmea-core)/pfmea/worksheet/utils/applyOccurrenceFromPrevention';

describe('shouldReevaluateOccurrence', () => {
  it('treats O=1 as needing re-evaluation', () => {
    expect(shouldReevaluateOccurrence(1)).toBe(true);
  });
  it('keeps O=2..10', () => {
    expect(shouldReevaluateOccurrence(4)).toBe(false);
  });
});

describe('buildIndustryPreventionOMap + lookup', () => {
  it('exact method match returns defaultRating', () => {
    const map = buildIndustryPreventionOMap([
      { method: '작업표준서 준수', defaultRating: 4 },
    ]);
    expect(lookupIndustryOccurrence('P:작업표준서 준수', map)).toBe(4);
  });
});

describe('applyOccurrenceFromPrevention', () => {
  it('updates O from PC keywords when O was 1', () => {
    const uk = 'fm1-fc1';
    const riskData: Record<string, string | number> = {
      [`prevention-${uk}`]: 'P:작업표준서',
      [`risk-${uk}-O`]: 1,
    };
    const { filledCount, updates } = applyOccurrenceFromPrevention(
      riskData,
      [{ fmId: 'fm1', fcId: 'fc1' }],
      undefined,
    );
    expect(filledCount).toBeGreaterThan(0);
    expect(updates[`risk-${uk}-O`]).toBeGreaterThan(1);
  });
});
