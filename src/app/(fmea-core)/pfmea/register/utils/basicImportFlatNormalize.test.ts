import { describe, it, expect } from 'vitest';
import { normalizeFlatProcessNosForBasicImport } from './basicImportFlatNormalize';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

function row(partial: Partial<ImportedFlatData>): ImportedFlatData {
  return {
    id: '1',
    processNo: '',
    category: 'A',
    itemCode: 'A1',
    value: 'v',
    createdAt: new Date(),
    ...partial,
  };
}

describe('normalizeFlatProcessNosForBasicImport', () => {
  it('pads numeric processNo for category A/B', () => {
    const out = normalizeFlatProcessNosForBasicImport([
      row({ category: 'A', processNo: '20', itemCode: 'A2' }),
      row({ category: 'B', processNo: '5', itemCode: 'B1' }),
    ]);
    expect(out[0].processNo).toBe('020');
    expect(out[1].processNo).toBe('005');
  });

  it('leaves category C processNo unchanged', () => {
    const out = normalizeFlatProcessNosForBasicImport([
      row({ category: 'C', processNo: 'YP', itemCode: 'C1' }),
    ]);
    expect(out[0].processNo).toBe('YP');
  });

  it('sets A1 value to padded processNo for display/sort', () => {
    const out = normalizeFlatProcessNosForBasicImport([
      row({ category: 'A', processNo: '20', itemCode: 'A1', value: '20' }),
    ]);
    expect(out[0].processNo).toBe('020');
    expect(out[0].value).toBe('020');
  });
});
