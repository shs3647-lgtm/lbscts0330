/**
 * §12 6ST O/D 산업DB·키워드 캡(4) + 단조 감소
 */
import { describe, it, expect } from 'vitest';
import {
  OPT_OD_TARGET_CAP,
  computeOptimizedOccurrence,
  computeOptimizedDetection,
  findBestPcForSixStep,
  findBestDcForSixStep,
  type ScoredPCIndustry,
  type ScoredDCIndustry,
} from '@/app/(fmea-core)/pfmea/worksheet/utils/optimizationOdIndustry';

describe('computeOptimizedOccurrence', () => {
  it('caps at OPT_OD_TARGET_CAP vs industry default', () => {
    expect(computeOptimizedOccurrence(8, 6, null)).toBe(OPT_OD_TARGET_CAP);
    expect(computeOptimizedOccurrence(8, 3, null)).toBe(3);
  });

  it('never above current (monotone)', () => {
    expect(computeOptimizedOccurrence(3, 2, 1)).toBe(2);
    expect(computeOptimizedOccurrence(2, 10, 10)).toBe(2);
  });

  it('prefers industry over keyword when both present', () => {
    expect(computeOptimizedOccurrence(9, 3, 8)).toBe(3);
  });

  it('falls back to keyword when industry invalid', () => {
    expect(computeOptimizedOccurrence(9, null, 5)).toBe(Math.min(9, Math.min(5, OPT_OD_TARGET_CAP)));
  });
});

describe('computeOptimizedDetection', () => {
  it('mirrors occurrence rules for D', () => {
    expect(computeOptimizedDetection(7, 5, null)).toBe(Math.min(7, Math.min(5, OPT_OD_TARGET_CAP)));
    expect(computeOptimizedDetection(2, 1, 1)).toBe(1);
  });
});

describe('findBestPcForSixStep / findBestDcForSixStep', () => {
  const pcs: ScoredPCIndustry[] = [
    { method: 'A', industryO: 6, keywordO: 5 },
    { method: 'B', industryO: null, keywordO: 3 },
  ];
  const dcs: ScoredDCIndustry[] = [
    { method: 'X', industryD: 5, keywordD: 4 },
    { method: 'Y', industryD: null, keywordD: 2 },
  ];

  it('picks lowest newO within AP target', () => {
    const r = findBestPcForSixStep(8, pcs, 4);
    expect(r).not.toBeNull();
    expect(r!.newO).toBeLessThanOrEqual(4);
    expect(r!.method).toBe('B');
  });

  it('picks lowest newD within AP target', () => {
    const r = findBestDcForSixStep(8, dcs, 4);
    expect(r).not.toBeNull();
    expect(r!.newD).toBeLessThanOrEqual(4);
    expect(r!.method).toBe('Y');
  });

  it('returns null for empty scored list', () => {
    expect(findBestPcForSixStep(5, [], 3)).toBeNull();
    expect(findBestDcForSixStep(5, [], 3)).toBeNull();
  });
});
