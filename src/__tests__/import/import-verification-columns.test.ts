import { describe, it, expect } from 'vitest';
import {
  mergeImportExpectedCounts,
  verifyFK,
  mapApiToVerification,
  countsFromPositionExcelStats,
  countsFromParseStatisticsItemRaw,
  countsVerifyAlignedFromPipelineStats,
} from '@/app/(fmea-core)/pfmea/import/utils/import-verification-columns';

const ZERO_EXPECT: Record<string, number> = {
  A1: 0, A2: 0, A3: 0, A4: 0, A5: 0, A6: 0,
  B1: 0, B2: 0, B3: 0, B4: 0, B5: 0,
  C1: 0, C2: 0, C3: 0, C4: 0,
};
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

describe('countsFromPositionExcelStats', () => {
  it('maps excelA4 etc. to item codes', () => {
    const m = countsFromPositionExcelStats({
      excelA4: 26,
      excelC4: 20,
      excelB3: 101,
    });
    expect(m).not.toBeNull();
    expect(m!.A4).toBe(26);
    expect(m!.C4).toBe(20);
    expect(m!.B3).toBe(101);
    expect(m!.A1).toBe(0);
  });

  it('returns null for null/undefined stats', () => {
    expect(countsFromPositionExcelStats(null)).toBeNull();
    expect(countsFromPositionExcelStats(undefined)).toBeNull();
  });
});

describe('countsFromParseStatisticsItemRaw', () => {
  it('maps itemStats rawCount by code', () => {
    const m = countsFromParseStatisticsItemRaw({
      itemStats: [
        { itemCode: 'A4', rawCount: 17 },
        { itemCode: 'B4', rawCount: 104 },
      ],
    });
    expect(m).not.toBeNull();
    expect(m!.A4).toBe(17);
    expect(m!.B4).toBe(104);
    expect(m!.A1).toBe(0);
  });

  it('returns null when no itemStats', () => {
    expect(countsFromParseStatisticsItemRaw(null)).toBeNull();
    expect(countsFromParseStatisticsItemRaw({ itemStats: [] })).toBeNull();
  });
});

describe('mergeImportExpectedCounts', () => {
  it('uses unique when > 0 to align with entity counts', () => {
    const uuid = { C4: 198 };
    const unique = { C4: 16 };
    const m = mergeImportExpectedCounts(uuid, unique);
    expect(m.C4).toBe(16);
  });

  it('ignores unique 0 when raw rows exist (placeholder stats)', () => {
    const uuid = { C4: 50 };
    const unique = { C4: 0 };
    const m = mergeImportExpectedCounts(uuid, unique);
    expect(m.C4).toBe(50);
  });
});

describe('verifyFK inherited', () => {
  it('treats inherited rows as valid without parentItemId', () => {
    const flat: ImportedFlatData[] = [
      {
        id: 'c4a',
        processNo: 'YP',
        category: 'C',
        itemCode: 'C4',
        value: '영향1',
        inherited: true,
        createdAt: new Date(),
      },
    ];
    const fk = verifyFK(flat);
    expect(fk.C4.valid).toBe(1);
    expect(fk.C4.orphans).toBe(0);
  });
});

describe('countsVerifyAlignedFromPipelineStats', () => {
  it('maps pipeline stats to verify-counts scale (A6/B5 = RA with DC/PC)', () => {
    const m = countsVerifyAlignedFromPipelineStats({
      l2Structures: 17,
      l1Functions: 13,
      l1Requirements: 99,
      failureEffects: 16,
      l2Functions: 26,
      processProductChars: 26,
      failureModes: 26,
      l3Structures: 88,
      l3Functions: 115,
      failureCauses: 115,
      riskAnalyses: 120,
      verifyC1DistinctCategories: 3,
      verifyC3L1FuncWithRequirement: 13,
      verifyB2L3FuncNamed: 115,
      verifyA6RiskWithDc: 115,
      verifyB5RiskWithPc: 110,
    });
    expect(m).not.toBeNull();
    expect(m!.C1).toBe(3);
    expect(m!.C2).toBe(13);
    expect(m!.C3).toBe(13);
    expect(m!.A1).toBe(17);
    expect(m!.A2).toBe(17);
    expect(m!.A6).toBe(115);
    expect(m!.B5).toBe(110);
    expect(m!.B2).toBe(115);
  });

  it('returns null without verify* markers (legacy stats)', () => {
    expect(
      countsVerifyAlignedFromPipelineStats({
        l2Structures: 5,
        l1Functions: 2,
        riskAnalyses: 1,
      }),
    ).toBeNull();
  });
});

describe('mapApiToVerification expected scale', () => {
  it('C2 = L1Function 배열 길이 (verify-counts와 동일), 동일 구분|기능 중복 행 포함', () => {
    const apiData = {
      l1Functions: [
        { category: 'YP', functionName: 'F1', requirement: 'r1' },
        { category: 'YP', functionName: 'F1', requirement: 'r2' },
        { category: 'YP', functionName: 'F2', requirement: '' },
      ],
      l2Structures: [],
      l2Functions: [],
      processProductChars: [],
      failureModes: [],
      riskAnalyses: [],
      l3Structures: [],
      l3Functions: [],
      failureCauses: [],
      failureEffects: [],
    };
    const expected = { ...ZERO_EXPECT, C2: 3 };
    const r = mapApiToVerification(apiData, expected);
    expect(r.C2.apiCount).toBe(3);
    expect(r.C2.match).toBe(true);
  });

  it('uses merged expected for C4', () => {
    const apiData = {
      l2Structures: [],
      l2Functions: [],
      processProductChars: [],
      failureModes: [],
      riskAnalyses: [],
      l3Structures: [],
      l3Functions: [],
      failureCauses: [],
      l1Functions: [],
      failureEffects: Array.from({ length: 16 }, (_, i) => ({ id: `fe-${i}`, effect: `e${i}` })),
    };
    const expected = mergeImportExpectedCounts({ C4: 200 }, { C4: 16 });
    const r = mapApiToVerification(apiData, expected);
    expect(r.C4.expected).toBe(16);
    expect(r.C4.apiCount).toBe(16);
    expect(r.C4.match).toBe(true);
  });
});
