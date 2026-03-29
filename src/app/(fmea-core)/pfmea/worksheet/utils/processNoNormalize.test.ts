import { describe, it, expect } from 'vitest';
import { normalizeL2ProcessNo } from './processNoNormalize';

describe('normalizeL2ProcessNo', () => {
  it('pads 1–2 digit leading numbers to 3 digits', () => {
    expect(normalizeL2ProcessNo('01')).toBe('001');
    expect(normalizeL2ProcessNo('1')).toBe('001');
    expect(normalizeL2ProcessNo('20')).toBe('020');
    expect(normalizeL2ProcessNo('99')).toBe('099');
  });

  it('keeps 3+ digit numbers as zero-padded numeric width', () => {
    expect(normalizeL2ProcessNo('100')).toBe('100');
    expect(normalizeL2ProcessNo('140')).toBe('140');
    expect(normalizeL2ProcessNo('1200')).toBe('1200');
  });

  it('preserves non-numeric leading process numbers', () => {
    expect(normalizeL2ProcessNo('A1')).toBe('A1');
  });

  it('handles suffix after digits', () => {
    expect(normalizeL2ProcessNo('12A')).toBe('012A');
  });

  it('trims whitespace', () => {
    expect(normalizeL2ProcessNo('  10  ')).toBe('010');
  });

  it('empty returns empty', () => {
    expect(normalizeL2ProcessNo('')).toBe('');
    expect(normalizeL2ProcessNo(null)).toBe('');
  });
});
