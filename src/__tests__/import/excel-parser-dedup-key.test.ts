/**
 * 멀티시트 processMap 병합 dedup — 작업요소(WE)별로 동일 FC/B5 텍스트도 별도 행 유지 (2026-03-23)
 */
import { describe, expect, it } from 'vitest';
import { buildMultiSheetDedupKey } from '@/app/(fmea-core)/pfmea/import/excel-parser';

describe('buildMultiSheetDedupKey', () => {
  const base = { key: '10', value: '동일한 고장원인 텍스트' };

  it('B4: 동일 공정·m4·값이어도 extra(WE)가 다르면 서로 다른 키', () => {
    const k1 = buildMultiSheetDedupKey('B4', { ...base, m4: 'MC', extra: '지그A' });
    const k2 = buildMultiSheetDedupKey('B4', { ...base, m4: 'MC', extra: '지그B' });
    expect(k1).not.toBe(k2);
  });

  it('B4: WE가 같으면 동일 키(진짜 중복)', () => {
    const k1 = buildMultiSheetDedupKey('B4', { ...base, m4: 'MC', extra: '지그A' });
    const k2 = buildMultiSheetDedupKey('B4', { ...base, m4: 'MC', extra: '지그A' });
    expect(k1).toBe(k2);
  });

  it('B4: 동일 excelRow·동일 텍스트라도 시트 순번(i)이 다르면 별도 키 — 병합셀 FC 누락 완화', () => {
    const row = { ...base, m4: 'MC', extra: '지그A', excelRow: 12 };
    const k0 = buildMultiSheetDedupKey('B4', row, 0);
    const k1 = buildMultiSheetDedupKey('B4', row, 1);
    expect(k0).not.toBe(k1);
    expect(k0).toContain('@r12_i0');
    expect(k1).toContain('@r12_i1');
  });

  it('B5: 동일 값이어도 WE(extra)가 다르면 서로 다른 키', () => {
    const k1 = buildMultiSheetDedupKey('B5', { ...base, extra: 'WE-1' });
    const k2 = buildMultiSheetDedupKey('B5', { ...base, extra: 'WE-2' });
    expect(k1).not.toBe(k2);
  });

  it('A6: 동일 검출관리 값이어도 WE가 다르면 서로 다른 키', () => {
    const k1 = buildMultiSheetDedupKey('A6', { ...base, extra: '검사대A' });
    const k2 = buildMultiSheetDedupKey('A6', { ...base, extra: '검사대B' });
    expect(k1).not.toBe(k2);
  });

  it('A5: excelRow 없음 — 행 태그 없음', () => {
    const k = buildMultiSheetDedupKey('A5', { key: '20', value: ' 표면 불량 ', m4: '' });
    expect(k).toBe('20|A5||표면 불량');
  });

  it('A5: excelRow 있음 — @r 접미', () => {
    const k = buildMultiSheetDedupKey('A5', { key: '20', value: '표면 불량', m4: '', excelRow: 42 });
    expect(k).toBe('20|A5||표면 불량|@r42');
  });
});
