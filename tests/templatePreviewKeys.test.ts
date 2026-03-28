import { describe, expect, it } from 'vitest';
import {
  crossTabKeyTail4,
  l1ItemKeyCellTooltip,
  l1ItemKeyDisplayTail4,
  l2ItemKeyCellTooltip,
  l3ItemKeyCellTooltip,
} from '@/app/(fmea-core)/pfmea/import/utils/templatePreviewKeys';
import type { ARow, BRow, CRow } from '@/app/(fmea-core)/pfmea/import/utils/template-delete-logic';

describe('templatePreviewKeys', () => {
  it('crossTabKeyTail4 shows last 4 or full short id', () => {
    expect(crossTabKeyTail4(undefined)).toBe('—');
    expect(crossTabKeyTail4('')).toBe('—');
    expect(crossTabKeyTail4('ab')).toBe('ab');
    expect(crossTabKeyTail4('xxxxxxxx-aaaa-bbbb-cccc-1234567890ab')).toBe('90ab');
  });

  it('L1 key tail and tooltip include category|code|value and full UUID', () => {
    const r: CRow = {
      category: 'YP',
      C1: '구분값',
      C2: '',
      C3: '',
      C4: '',
      _ids: { C1: 'uuid-c1-full-0001' },
    };
    expect(l1ItemKeyDisplayTail4(r, 'C1')).toBe('0001');
    const tip = l1ItemKeyCellTooltip(r, 'C1');
    expect(tip).toContain('텍스트 눈금: YP|C1|구분값');
    expect(tip).toContain('uuid-c1-full-0001');
  });

  it('L2 tooltip uses processNo|code|value', () => {
    const r: ARow = {
      processNo: '10',
      A1: '',
      A2: '공정명',
      A3: '',
      A4: '',
      A5: '',
      A6: '',
      _ids: { A2: 'id-a2' },
    };
    const tip = l2ItemKeyCellTooltip(r, 'A2');
    expect(tip).toContain('텍스트 눈금: 10|A2|공정명');
    expect(tip).toContain('id-a2');
  });

  it('L3 tooltip uses processNo|m4|code|value and lists B1–B5 ids', () => {
    const r: BRow = {
      processNo: '20',
      m4: 'MC',
      B1: 'WE',
      B2: '',
      B3: '',
      B4: '',
      B5: '',
      _ids: { B1: 'b1x', B2: 'b2x', B3: 'b3x', B4: 'b4x', B5: 'b5x' },
    };
    const tip = l3ItemKeyCellTooltip(r, 'B1');
    expect(tip).toContain('텍스트 눈금: 20|MC|B1|WE');
    expect(tip).toContain('B1: b1x');
    expect(tip).toContain('B5: b5x');
  });
});
