import { describe, it, expect } from 'vitest';
import { derivePfmeaIdFromPfdNo, derivePfdNoFromFmeaId } from '@/lib/utils/derivePfdNo';

describe('derivePfmeaIdFromPfdNo', () => {
  it('maps standard PFD no to PFMEA base', () => {
    expect(derivePfmeaIdFromPfdNo('pfd26-p006-01')).toBe('pfm26-p006');
    expect(derivePfmeaIdFromPfdNo('PFD26-P006-I06')).toBe('pfm26-p006');
    expect(derivePfmeaIdFromPfdNo('pfd26-m002-02')).toBe('pfm26-m002');
  });

  it('returns null for non-matching ids', () => {
    expect(derivePfmeaIdFromPfdNo('')).toBeNull();
    expect(derivePfmeaIdFromPfdNo('cp26-m001')).toBeNull();
  });
});

describe('derivePfdNoFromFmeaId + PFMEA instance suffix', () => {
  it('strips linkage suffix to canonical PFD', () => {
    expect(derivePfdNoFromFmeaId('pfm26-p006-i06')).toBe('pfd26-p006-01');
  });
});
