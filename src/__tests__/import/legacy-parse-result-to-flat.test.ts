import { describe, expect, it } from 'vitest';

describe('legacy ParseResult to flatData conversion', () => {
  it('레거시 parse 결과를 flatData로 변환해 B4/A6/B5까지 보존해야 한다', async () => {
    const { convertLegacyParseResultToFlatData } = await import('@/app/(fmea-core)/pfmea/import/utils/legacyParseResultToFlatData');

    const result = {
      success: true,
      errors: [],
      processes: [
        {
          processNo: '10',
          processName: '도금',
          processDesc: ['도금 수행'],
          productChars: ['두께'],
          productCharsSpecialChar: ['SC'],
          failureModes: ['도금 불량'],
          detectionCtrls: ['최종검사'],
          workElements: ['설비'],
          workElements4M: ['MC'],
          elementFuncs: ['도금 기능'],
          elementFuncs4M: ['MC'],
          elementFuncsWE: ['설비'],
          processChars: ['전류'],
          processChars4M: ['MC'],
          processCharsWE: ['설비'],
          processCharsSpecialChar: ['CC'],
          failureCauses: ['전류 편차'],
          failureCauses4M: ['MC'],
          failureCausesWE: ['설비'],
          preventionCtrls: ['표준작업'],
          preventionCtrls4M: ['MC'],
          itemMeta: {},
        },
      ],
      products: [
        {
          productProcessName: 'YP',
          productFuncs: ['완제품 기능'],
          requirements: ['요구사항'],
          failureEffects: ['고장영향'],
          itemMeta: {},
        },
      ],
    } as any;

    const flat = convertLegacyParseResultToFlatData(result);

    expect(flat.length).toBeGreaterThan(0);
    expect(flat.some(item => item.itemCode === 'B4' && item.value === '전류 편차')).toBe(true);
    expect(flat.some(item => item.itemCode === 'A6' && item.value === '최종검사')).toBe(true);
    expect(flat.some(item => item.itemCode === 'B5' && item.value === '표준작업')).toBe(true);

    const b1 = flat.find(item => item.itemCode === 'B1' && item.value === '설비');
    const b2 = flat.find(item => item.itemCode === 'B2' && item.value === '도금 기능');
    const b3 = flat.find(item => item.itemCode === 'B3' && item.value === '전류');
    const b4 = flat.find(item => item.itemCode === 'B4' && item.value === '전류 편차');

    expect(b1?.id).toBeTruthy();
    expect(b2?.parentItemId).toBe(b1?.id);
    expect(b3?.parentItemId).toBe(b1?.id);
    expect(b4?.parentItemId).toBe(b1?.id);
  });
});
