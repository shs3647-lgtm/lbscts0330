/**
 * POST /api/pfmea/master dataMap 키 — Prisma @@unique 와 동일 척도 (회귀 방지).
 */
import { describe, it, expect } from 'vitest';
import { pfmeaMasterFlatDataMapKey } from '@/lib/fmea/master-flat-save-dedup';

describe('pfmeaMasterFlatDataMapKey', () => {
  it('동일 공정·동일 A6 문구라도 parentItemId(FM) 다르면 별도 키', () => {
    const k1 = pfmeaMasterFlatDataMapKey({
      processNo: '10',
      itemCode: 'A6',
      value: 'SPC',
      parentItemId: 'fm-a',
    });
    const k2 = pfmeaMasterFlatDataMapKey({
      processNo: '10',
      itemCode: 'A6',
      value: 'SPC',
      parentItemId: 'fm-b',
    });
    expect(k1).not.toBe(k2);
  });

  it('parentItemId 없으면 동일 triple은 동일 키', () => {
    const k1 = pfmeaMasterFlatDataMapKey({ processNo: '1', itemCode: 'A1', value: '10' });
    const k2 = pfmeaMasterFlatDataMapKey({ processNo: '1', itemCode: 'A1', value: '10' });
    expect(k1).toBe(k2);
  });
});
