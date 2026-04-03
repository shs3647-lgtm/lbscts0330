/**
 * PositionAtomicData → atomicToFlatData: Phase 3 dedupKey 부여
 */
import { describe, it, expect } from 'vitest';
import { atomicToFlatData } from '@/lib/fmea/position-parser';
import {
  dedupKey_FL_FE,
  dedupKey_FL_FM,
  dedupKey_FL_FC,
  dedupKey_FN_L2,
  dedupKey_FN_L3,
  dedupKey_ST_L2,
  dedupKey_ST_L3,
} from '@/lib/fmea/utils/dedup-key';
import type { PositionAtomicData } from '@/types/position-import';

function minimal(overrides: Partial<PositionAtomicData>): PositionAtomicData {
  return {
    fmeaId: 'pfm26-m-test',
    l1Structure: { id: 'L1-S', fmeaId: 'pfm26-m-test', name: 'L1' },
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
    ...overrides,
  };
}

describe('atomicToFlatData dedupKey (Phase 3)', () => {
  it('A1/A2·A4·A5·B1·B3·B4·C4에 문서형 복합키가 붙는다', () => {
    const data = minimal({
      l1Functions: [
        {
          id: 'lf-1',
          fmeaId: 'pfm26-m-test',
          l1StructId: 'L1-S',
          parentId: 'L1-S',
          category: 'YP',
          functionName: 'F',
          requirement: 'R',
        },
      ],
      l2Structures: [
        {
          id: 'l2-1',
          fmeaId: 'pfm26-m-test',
          l1Id: 'L1-S',
          parentId: 'L1-S',
          no: '10',
          name: 'P',
          order: 0,
        },
      ],
      l2Functions: [
        {
          id: 'l2f-1',
          fmeaId: 'pfm26-m-test',
          l2StructId: 'l2-1',
          parentId: 'l2-1',
          functionName: '공정기능A',
        },
      ],
      processProductChars: [
        {
          id: 'ppc-1',
          fmeaId: 'pfm26-m-test',
          l2StructId: 'l2-1',
          l2FuncId: 'l2f-1',
          parentId: 'l2f-1',
          name: '특성A',
          orderIndex: 0,
        },
      ],
      failureModes: [
        {
          id: 'fm-1',
          fmeaId: 'pfm26-m-test',
          l2StructId: 'l2-1',
          l2FuncId: 'l2f-1',
          parentId: 'ppc-1',
          productCharId: 'ppc-1',
          mode: 'FM텍스트',
        },
      ],
      l3Structures: [
        {
          id: 'l3s-1',
          fmeaId: 'pfm26-m-test',
          l1Id: 'L1-S',
          l2Id: 'l2-1',
          parentId: 'l2-1',
          m4: 'MN',
          name: '작업요소1',
          order: 0,
        },
      ],
      l3Functions: [
        {
          id: 'l3f-1',
          fmeaId: 'pfm26-m-test',
          l3StructId: 'l3s-1',
          l2StructId: 'l2-1',
          parentId: 'l3s-1',
          functionName: '요소기능',
          processChar: 'B3값',
        },
      ],
      failureCauses: [
        {
          id: 'fc-1',
          fmeaId: 'pfm26-m-test',
          l2StructId: 'l2-1',
          l3StructId: 'l3s-1',
          l3FuncId: 'l3f-1',
          parentId: 'l3f-1',
          cause: '원인텍스트',
        },
      ],
      failureEffects: [
        {
          id: 'fe-1',
          fmeaId: 'pfm26-m-test',
          l1FuncId: 'lf-1',
          parentId: 'lf-1',
          category: 'YP',
          effect: '영향텍스트',
          severity: 5,
        },
      ],
    });

    const flat = atomicToFlatData(data);

    const a1 = flat.find((r) => r.itemCode === 'A1');
    expect(a1?.dedupKey).toBe(dedupKey_ST_L2('L1-S', '10'));

    const a4 = flat.find((r) => r.itemCode === 'A4');
    expect(a4?.dedupKey).toBe(dedupKey_FN_L2('l2-1', '공정기능A', 'ppc-1'));

    const a5 = flat.find((r) => r.itemCode === 'A5');
    expect(a5?.dedupKey).toBe(dedupKey_FL_FM('l2f-1', 'FM텍스트'));

    const b1 = flat.find((r) => r.itemCode === 'B1');
    expect(b1?.dedupKey).toBe(dedupKey_ST_L3('l2-1', 'MN', '작업요소1'));

    const b3 = flat.find((r) => r.itemCode === 'B3');
    expect(b3?.dedupKey).toBe(dedupKey_FN_L3('l3s-1', '요소기능', 'B3값'));

    const b4 = flat.find((r) => r.itemCode === 'B4');
    expect(b4?.dedupKey).toBe(dedupKey_FL_FC('l3f-1', '원인텍스트'));

    const c4 = flat.find((r) => r.itemCode === 'C4');
    expect(c4?.dedupKey).toBe(dedupKey_FL_FE('lf-1', '영향텍스트'));
  });
});
