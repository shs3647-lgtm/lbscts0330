import { describe, it, expect } from 'vitest';
import {
  mergeImportExpectedCounts,
  verifyFK,
  mapApiToVerification,
  countsFromPositionExcelStats,
  countsFromParseStatisticsItemRaw,
} from '@/app/(fmea-core)/pfmea/import/utils/import-verification-columns';
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

describe('mapApiToVerification expected scale', () => {
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
