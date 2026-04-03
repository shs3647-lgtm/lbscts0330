import { describe, expect, it } from 'vitest';
import {
  buildPpcIdByL2AndCharName,
  dedupKeyFailureLink,
  dedupKeyProcessProductChar,
} from '@/lib/fmea-core/atomic-dedup-sync';

describe('atomic-dedup-sync', () => {
  it('buildPpcIdByL2AndCharName maps l2+normalized name to id', () => {
    const m = buildPpcIdByL2AndCharName([
      { id: 'pc-1', l2StructId: 'l2-a', name: '  Thickness  ' },
    ]);
    expect(m.get('l2-a|Thickness')).toBe('pc-1');
  });

  it('dedupKeyProcessProductChar uses A4 segment', () => {
    expect(dedupKeyProcessProductChar('l2-x', 'A')).toBe('l2-x::A4::A');
  });

  it('dedupKeyFailureLink tolerates null fe/fc', () => {
    expect(dedupKeyFailureLink('fm1', null, 'fc1')).toBe('fm1|_|fc1');
  });
});
