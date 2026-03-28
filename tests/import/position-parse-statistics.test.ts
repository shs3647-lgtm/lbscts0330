import { describe, it, expect } from 'vitest';
import { parseStatisticsFromPositionAtomic } from '@/app/(fmea-core)/pfmea/import/utils/position-parse-statistics';
import type { PositionAtomicData } from '@/types/position-import';

function minimalAtomic(over: Partial<PositionAtomicData> = {}): PositionAtomicData {
  return {
    fmeaId: 'pfm26-t',
    l1Structure: { id: 'L1-STRUCT', fmeaId: 'pfm26-t', name: 'P' },
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
    stats: { excelL1Rows: 1, excelL2Rows: 2, excelL3Rows: 3, excelFCRows: 4 },
    ...over,
  };
}

describe('parseStatisticsFromPositionAtomic', () => {
  it('sets source, dataSourceLine, itemStats length, chainCount', () => {
    const a = minimalAtomic({
      l1Functions: [{ id: 'x', fmeaId: 'f', l1StructId: 'L1', parentId: 'L1', category: 'YP', functionName: 'fn', requirement: '' }],
      failureEffects: [{ id: 'fe1', fmeaId: 'f', l1FuncId: 'x', parentId: 'x', category: 'YP', effect: 'e', severity: 1 }],
      failureLinks: [{ id: 'fl1', fmeaId: 'f', fmId: 'm', feId: 'fe1', fcId: 'c' }],
    });
    const ps = parseStatisticsFromPositionAtomic(a);
    expect(ps.source).toBe('position-import');
    expect(ps.dataSourceLine).toContain('위치기반');
    expect(ps.itemStats?.length).toBe(15);
    expect(ps.chainCount).toBe(1);
    expect(ps.totalRawRows).toBe(10);
  });
});
