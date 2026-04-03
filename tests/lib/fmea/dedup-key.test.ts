import { describe, expect, it } from 'vitest';
import {
  deduplicateForRendering,
  dedupKey_FL_FC,
  dedupKey_FL_FE,
  dedupKey_FL_FM,
  dedupKey_FN_L1,
  dedupKey_FN_L2,
  dedupKey_FN_L3,
  dedupKey_ST_L1,
  dedupKey_ST_L2,
  dedupKey_ST_L3,
  normalize,
} from '@/lib/fmea/utils/dedup-key';

describe('normalize', () => {
  it('empty → __EMPTY__', () => {
    expect(normalize(undefined)).toBe('__EMPTY__');
    expect(normalize(null)).toBe('__EMPTY__');
    expect(normalize('')).toBe('__EMPTY__');
  });
  it('collapses whitespace and newlines', () => {
    expect(normalize('  a\nb\t c  ')).toBe('a b c');
  });
});

describe('dedupKey_*', () => {
  it('ST_L1', () => {
    expect(dedupKey_ST_L1('proj-1', 'My FMEA')).toBe('proj-1::My FMEA');
  });
  it('ST_L2', () => {
    expect(dedupKey_ST_L2('l1-uuid', '05')).toBe('l1-uuid::05');
  });
  it('ST_L3', () => {
    expect(dedupKey_ST_L3('l2-uuid', 'MN', '작업자')).toBe('l2-uuid::MN::작업자');
  });
  it('FN_L1', () => {
    expect(dedupKey_FN_L1('l1s', 'YP', '기능A')).toBe('l1s::YP::기능A');
  });
  it('FN_L2 uses raw productCharId (FK)', () => {
    const pc = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(dedupKey_FN_L2('l2s', '공정기능', pc)).toBe(`l2s::공정기능::${pc}`);
  });
  it('FN_L3', () => {
    expect(dedupKey_FN_L3('l3s', '요소기능', 'B3텍스트')).toBe('l3s::요소기능::B3텍스트');
  });
  it('FL_FE / FL_FM / FL_FC', () => {
    expect(dedupKey_FL_FE('fn1', '영향')).toBe('fn1::영향');
    expect(dedupKey_FL_FM('fn2', '형태')).toBe('fn2::형태');
    expect(dedupKey_FL_FC('fn3', '원인')).toBe('fn3::원인');
  });
});

describe('deduplicateForRendering', () => {
  it('keeps first occurrence per dedupKey', () => {
    const rows = [
      { id: 'a', dedupKey: 'k1' },
      { id: 'b', dedupKey: 'k1' },
      { id: 'c', dedupKey: 'k2' },
    ];
    expect(deduplicateForRendering(rows)).toEqual([
      { id: 'a', dedupKey: 'k1' },
      { id: 'c', dedupKey: 'k2' },
    ]);
  });
});
