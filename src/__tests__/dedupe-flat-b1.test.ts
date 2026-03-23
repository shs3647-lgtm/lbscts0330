import { describe, it, expect } from 'vitest';
import { dedupeFlatB1ByWorkElement } from '@/app/(fmea-core)/pfmea/import/utils/dedupeFlatB1ByWorkElement';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

describe('dedupeFlatB1ByWorkElement', () => {
  it('동일 공정+4M+작업요소명 B1 중복 시 첫 id 유지·B2 parent 리맵', () => {
    const flat: ImportedFlatData[] = [
      { id: 'p10-A1', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: new Date() },
      { id: 'b1-a', processNo: '10', category: 'B', itemCode: 'B1', value: 'FFU', m4: 'EN', createdAt: new Date() },
      { id: 'b1-b', processNo: '10', category: 'B', itemCode: 'B1', value: 'FFU', m4: 'EN', createdAt: new Date() },
      {
        id: 'b2-0',
        processNo: '10',
        category: 'B',
        itemCode: 'B2',
        value: 'f',
        m4: 'EN',
        parentItemId: 'b1-b',
        createdAt: new Date(),
      },
    ];
    const out = dedupeFlatB1ByWorkElement(flat);
    const b1s = out.filter(d => d.itemCode === 'B1');
    expect(b1s.length).toBe(1);
    expect(b1s[0].id).toBe('b1-a');
    const b2 = out.find(d => d.itemCode === 'B2');
    expect(b2?.parentItemId).toBe('b1-a');
  });
});
