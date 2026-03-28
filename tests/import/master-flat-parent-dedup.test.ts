/**
 * POST /api/pfmea/master: 사업 키 vs 수신 행 키(id 우선) 회귀 방지.
 */
import { describe, it, expect } from 'vitest';
import {
  pfmeaMasterFlatDataMapKey,
  pfmeaMasterFlatIncomingRowDedupKey,
} from '@/lib/fmea/master-flat-save-dedup';

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

  it('동일 itemCode·value라도 processNo(구분) 다르면 별도 키', () => {
    const k1 = pfmeaMasterFlatDataMapKey({
      processNo: 'YP',
      itemCode: 'C2',
      value: '기능A',
      parentItemId: 'c1-yp',
    });
    const k2 = pfmeaMasterFlatDataMapKey({
      processNo: 'SP',
      itemCode: 'C2',
      value: '기능A',
      parentItemId: 'c1-sp',
    });
    expect(k1).not.toBe(k2);
  });

  it('parentItemId 없으면 동일 triple은 동일 키', () => {
    const k1 = pfmeaMasterFlatDataMapKey({ processNo: '1', itemCode: 'A1', value: '10' });
    const k2 = pfmeaMasterFlatDataMapKey({ processNo: '1', itemCode: 'A1', value: '10' });
    expect(k1).toBe(k2);
  });
});

describe('pfmeaMasterFlatIncomingRowDedupKey', () => {
  it('동일 C2 문구·부모여도 id 다르면 별도 키', () => {
    const base = {
      processNo: 'YP',
      itemCode: 'C2',
      value: '동일기능명',
      parentItemId: 'C1-YP',
    };
    const a = pfmeaMasterFlatIncomingRowDedupKey({ ...base, id: 'lf-1' });
    const b = pfmeaMasterFlatIncomingRowDedupKey({ ...base, id: 'lf-2' });
    expect(a).not.toBe(b);
  });

  it('id 없으면 사업 키와 동일', () => {
    const d = { processNo: '1', itemCode: 'A1', value: '10' };
    expect(pfmeaMasterFlatIncomingRowDedupKey(d)).toBe(pfmeaMasterFlatDataMapKey(d));
  });
});
