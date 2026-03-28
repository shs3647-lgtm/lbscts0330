import { describe, it, expect } from 'vitest';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

/** master-api.ts keepRowForPfmeaMasterSave 와 동일 규칙(복제) */
function keepRowForPfmeaMasterSave(d: ImportedFlatData): boolean {
  const processNo = String(d.processNo ?? '').trim();
  const itemCode = String(d.itemCode ?? '').trim().toUpperCase();
  const value = String(d.value ?? '').trim();
  const rowId = String(d.id ?? '').trim();
  if (!processNo || !itemCode) return false;
  if (!value && !(itemCode === 'B3' && rowId)) return false;
  return true;
}

describe('PFMEA master save client filter', () => {
  it('B3 빈 value + id 는 유지', () => {
    const d = {
      id: 'b3-x',
      processNo: '10',
      category: 'B' as const,
      itemCode: 'B3',
      value: '',
      createdAt: new Date(),
    } as ImportedFlatData;
    expect(keepRowForPfmeaMasterSave(d)).toBe(true);
  });

  it('A1 빈 value 는 제외', () => {
    const d = {
      id: 'a1',
      processNo: '10',
      category: 'A' as const,
      itemCode: 'A1',
      value: '',
      createdAt: new Date(),
    } as ImportedFlatData;
    expect(keepRowForPfmeaMasterSave(d)).toBe(false);
  });
});
