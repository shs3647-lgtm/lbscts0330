import { describe, expect, it } from 'vitest';
import { deepRepairUtf8Mojibake, repairUtf8Mojibake } from '@/lib/text/repair-utf8-mojibake';

describe('repairUtf8Mojibake', () => {
  it('leaves normal Korean unchanged', () => {
    expect(repairUtf8Mojibake('캠 컴파운드 미니멈도: ML1+4(100°C) 55±5')).toBe(
      '캠 컴파운드 미니멈도: ML1+4(100°C) 55±5',
    );
  });

  it('leaves ASCII unchanged', () => {
    expect(repairUtf8Mojibake('ML1+4 55')).toBe('ML1+4 55');
  });

  it('repairs UTF-8 misread as Latin-1 code units', () => {
    const korean = '캠 테스트';
    const utf8 = new TextEncoder().encode(korean);
    const mojibake = String.fromCharCode(...utf8);
    expect(mojibake).not.toBe(korean);
    expect(repairUtf8Mojibake(mojibake)).toBe(korean);
  });

  it('deepRepair maps nested objects', () => {
    const inner = new TextEncoder().encode('요구사항');
    const bad = String.fromCharCode(...inner);
    const o = deepRepairUtf8Mojibake({ a: { b: bad }, c: 1 });
    expect(o).toEqual({ a: { b: '요구사항' }, c: 1 });
  });
});
