/**
 * ★9: 저장 직후 flat 기대 vs verify-counts 스타일 DB 카운트 비교 (이름매칭 없음)
 */
import { describe, expect, it } from 'vitest';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import {
  countFlatRowsByItemCode,
  mergeImportExpectedCounts,
  mapCountsToPgsql,
  formatPgsqlCodeMismatchLines,
  countTripleFkFailureLinks,
} from '@/app/(fmea-core)/pfmea/import/utils/import-verification-columns';

function makeFlat(code: string, id: string, value: string): ImportedFlatData {
  return {
    id,
    itemCode: code,
    value,
    processNo: '1',
    createdAt: new Date(),
  } as ImportedFlatData;
}

describe('post-save PG alignment (★9)', () => {
  it('countFlatRowsByItemCode matches TemplatePreviewContent rules (id + trimmed value)', () => {
    const flat = [
      makeFlat('A1', 'u1', 'x'),
      makeFlat('A1', 'u2', 'y'),
      makeFlat('A1', 'u3', '  '), // skip empty trim
      makeFlat('A1', '', 'z'), // skip no id
    ];
    expect(countFlatRowsByItemCode(flat)).toEqual({ A1: 2 });
  });

  it('mapCountsToPgsql flags mismatch when actual !== expected', () => {
    const expected = mergeImportExpectedCounts({ A1: 5, B1: 3 }, undefined);
    const db = {
      A1: 4,
      A2: 4,
      A3: 0,
      A4: 0,
      A5: 0,
      A6: 0,
      B1: 3,
      B2: 0,
      B3: 0,
      B4: 0,
      B5: 0,
      C1: 0,
      C2: 0,
      C3: 0,
      C4: 0,
    };
    const pgsql = mapCountsToPgsql(db, expected);
    expect(pgsql.A1.match).toBe(false);
    expect(pgsql.B1.match).toBe(true);
    const lines = formatPgsqlCodeMismatchLines(pgsql);
    expect(lines.some(l => l.includes('A1'))).toBe(true);
    expect(lines.some(l => l.includes('B1'))).toBe(false);
  });

  it('countTripleFkFailureLinks counts only fmId+feId+fcId', () => {
    const links = [
      { fmId: 'a', feId: 'b', fcId: 'c' },
      { fmId: 'a', feId: '', fcId: 'c' },
      { fmId: '', feId: 'b', fcId: 'c' },
    ];
    expect(countTripleFkFailureLinks(links)).toBe(1);
  });
});
