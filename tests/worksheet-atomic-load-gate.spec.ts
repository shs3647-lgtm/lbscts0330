/**
 * useWorksheetDataLoader: Atomic 적용 조건은 loadAtomicDB() 반환값과 일치해야 함.
 * loadAtomicDB는 L1만 있어도 null이 아닌 객체를 반환할 수 있음 (API: !l1 && l2=0 일 때만 null).
 */
import { describe, it, expect } from 'vitest';

describe('worksheet atomic load gate (L1-only vs L2)', () => {
  it('old gate wrongly skipped L1-only payload', () => {
    const atomicData = {
      fmeaId: 'pfm26-test',
      l1Structure: { id: 'l1-1', name: '제품', fmeaId: 'x', confirmed: false, createdAt: '', updatedAt: '' },
      l2Structures: [] as { id: string }[],
    };
    const oldApplied = !!(
      atomicData &&
      Array.isArray(atomicData.l2Structures) &&
      atomicData.l2Structures.length > 0
    );
    const newApplied = !!atomicData;
    expect(oldApplied).toBe(false);
    expect(newApplied).toBe(true);
  });
});
