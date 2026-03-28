/**
 * @file atomic-to-flat-c1c4-fk.test.ts
 * @description PositionAtomicData → atomicToFlatData → verifyFK (C1~C4 L1 체인)
 */
import { describe, it, expect } from 'vitest';
import { atomicToFlatData, type ImportedFlatDataCompat } from '@/lib/fmea/position-parser';
import { verifyFK } from '@/app/(fmea-core)/pfmea/import/utils/import-verification-columns';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import type { PositionAtomicData } from '@/types/position-import';

function minimalPositionData(overrides: Partial<PositionAtomicData>): PositionAtomicData {
  const base: PositionAtomicData = {
    fmeaId: 'pfm26-m-test',
    l1Structure: { id: 'L1-STRUCT', fmeaId: 'pfm26-m-test', name: 'L1' },
    l1Functions: [],
    l1Requirements: [],
    l1Scopes: [],
    l2Structures: [],
    l2Functions: [],
    l2ProcessNos: [],
    l2ProcessNames: [],
    l2SpecialChars: [],
    l3Structures: [],
    l3Functions: [],
    l3ProcessChars: [],
    l3ProcessNos: [],
    l3FourMs: [],
    l3WorkElements: [],
    l3SpecialChars: [],
    processProductChars: [],
    failureEffects: [],
    failureModes: [],
    failureCauses: [],
    failureLinks: [],
    riskAnalyses: [],
    stats: {},
  };
  return { ...base, ...overrides };
}

describe('atomicToFlatData L1 FK (verifyFK)', () => {
  it('동일 functionName의 서로 다른 L1Function → C2 행도 각각 1행, C3는 자기 C2(f.id)를 parent로 (verifyFK 통과)', () => {
    const data = minimalPositionData({
      l1Functions: [
        {
          id: 'lf-a',
          fmeaId: 'pfm26-m-test',
          l1StructId: 'L1-STRUCT',
          parentId: 'L1-STRUCT',
          category: 'YP',
          functionName: '동일기능',
          requirement: '요구1',
        },
        {
          id: 'lf-b',
          fmeaId: 'pfm26-m-test',
          l1StructId: 'L1-STRUCT',
          parentId: 'L1-STRUCT',
          category: 'YP',
          functionName: '동일기능',
          requirement: '요구2',
        },
      ],
      failureEffects: [
        {
          id: 'fe-1',
          fmeaId: 'pfm26-m-test',
          l1FuncId: 'lf-a',
          parentId: 'lf-a',
          category: 'YP',
          effect: '영향1',
          severity: 1,
        },
        {
          id: 'fe-2',
          fmeaId: 'pfm26-m-test',
          l1FuncId: 'lf-b',
          parentId: 'lf-b',
          category: 'YP',
          effect: '영향2',
          severity: 1,
        },
      ],
    });

    const flat = atomicToFlatData(data) as ImportedFlatDataCompat[];
    const fk = verifyFK(flat as unknown as ImportedFlatData[]);

    expect(fk.C2?.orphans).toBe(0);
    expect(fk.C3?.orphans).toBe(0);
    expect(fk.C4?.orphans).toBe(0);
    expect(fk.C2?.valid).toBe(fk.C2?.total);
    expect(fk.C3?.valid).toBe(fk.C3?.total);
    expect(fk.C4?.valid).toBe(fk.C4?.total);

    const c2Rows = flat.filter((x) => x.itemCode === 'C2');
    expect(c2Rows.length).toBe(2);

    const c3b = flat.find((x) => x.id === 'lf-b-C3');
    expect(c3b?.parentItemId).toBe('lf-b');
  });
});
