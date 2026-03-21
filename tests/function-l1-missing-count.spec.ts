import { describe, it, expect } from 'vitest';
import { calculateMissingCounts, normalizeL1TypeNameToKey } from '@/app/(fmea-core)/pfmea/worksheet/tabs/function/functionL1Utils';
import { isMissing } from '@/app/(fmea-core)/pfmea/worksheet/tabs/shared/tabUtils';

describe('L1 누락 — 구분명 풀네임 vs 약어', () => {
  it('normalizeL1TypeNameToKey maps full English names', () => {
    expect(normalizeL1TypeNameToKey('Your Plant')).toBe('YP');
    expect(normalizeL1TypeNameToKey('Ship to Plant')).toBe('SP');
    expect(normalizeL1TypeNameToKey('User')).toBe('USER');
    expect(normalizeL1TypeNameToKey('US')).toBe('USER');
  });

  it('calculateMissingCounts: Your Plant / Ship to Plant / User does not falsely add 3 missing categories', () => {
    const types = [
      {
        name: 'Your Plant',
        functions: [{ name: 'F1', requirements: [{ name: 'R1' }] }],
      },
      {
        name: 'Ship to Plant',
        functions: [{ name: 'F2', requirements: [{ name: 'R2' }] }],
      },
      {
        name: 'User',
        functions: [{ name: 'N/A', requirements: [{ name: 'N/A' }] }],
      },
    ];
    const r = calculateMissingCounts(types, isMissing);
    expect(r.functionCount).toBe(0);
    expect(r.requirementCount).toBe(0);
    expect(r.total).toBe(0);
  });

  it('calculateMissingCounts: US-only type satisfies USER slot (no triple missing)', () => {
    const types = [
      { name: 'YP', functions: [{ name: 'F', requirements: [{ name: 'R' }] }] },
      { name: 'SP', functions: [{ name: 'G', requirements: [{ name: 'S' }] }] },
      { name: 'US', functions: [{ name: 'H', requirements: [{ name: 'T' }] }] },
    ];
    const r = calculateMissingCounts(types, isMissing);
    expect(r.functionCount).toBe(0);
    expect(r.total).toBe(0);
  });

  it('calculateMissingCounts: still flags when a category is absent', () => {
    const types = [
      { name: 'YP', functions: [{ name: 'A', requirements: [{ name: 'B' }] }] },
      { name: 'SP', functions: [{ name: 'C', requirements: [{ name: 'D' }] }] },
    ];
    const r = calculateMissingCounts(types, isMissing);
    expect(r.functionCount).toBe(1);
    expect(r.total).toBeGreaterThanOrEqual(1);
  });
});
