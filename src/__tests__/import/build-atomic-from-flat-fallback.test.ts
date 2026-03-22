import { describe, expect, it } from 'vitest';
import { buildAtomicFromFlat } from '@/app/(fmea-core)/pfmea/import/utils/buildAtomicFromFlat';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import type { StepBMasterChain } from '@/app/(fmea-core)/pfmea/import/stepb-parser/types';

function item(partial: Partial<ImportedFlatData> & Pick<ImportedFlatData, 'id' | 'processNo' | 'itemCode' | 'value'>): ImportedFlatData {
  return {
    category: partial.itemCode[0] as 'A' | 'B' | 'C',
    createdAt: new Date(),
    ...partial,
  };
}

describe('buildAtomicFromFlat fallback hardening', () => {
  it('복구용 fallback: B2/B3 parentItemId가 없어도 processNo+m4로 L3Function을 생성해야 한다', () => {
    const flatData: ImportedFlatData[] = [
      item({ id: 'a1-10', processNo: '10', itemCode: 'A1', value: '10' }),
      item({ id: 'a2-10', processNo: '10', itemCode: 'A2', value: '공정10' }),
      item({ id: 'a3-10', processNo: '10', itemCode: 'A3', value: '공정기능' }),
      item({ id: 'a4-10', processNo: '10', itemCode: 'A4', value: '제품특성', parentItemId: 'a3-10' }),
      item({ id: 'a5-10', processNo: '10', itemCode: 'A5', value: '고장형태' }),
      item({ id: 'b1-mc', processNo: '10', itemCode: 'B1', value: '설비', m4: 'MC' }),
      item({ id: 'b2-mc', processNo: '10', itemCode: 'B2', value: '설비 동작', m4: 'MC' }),
      item({ id: 'b3-mc', processNo: '10', itemCode: 'B3', value: '온도 편차', m4: 'MC' }),
      item({ id: 'c2-yp', processNo: 'YP', itemCode: 'C2', value: '완제품 기능' }),
      item({ id: 'c3-yp', processNo: 'YP', itemCode: 'C3', value: '요구사항', parentItemId: 'c2-yp' }),
      item({ id: 'c4-yp', processNo: 'YP', itemCode: 'C4', value: '고장영향', parentItemId: 'c3-yp' }),
    ];

    const atomic = buildAtomicFromFlat({
      fmeaId: 'pfm26-test-fallback-01',
      flatData,
      chains: [],
      l1Name: '테스트',
    });

    expect(atomic.l3Functions).toHaveLength(1);
    expect(atomic.l3Functions[0].l3StructId).toBe('b1-mc');
    expect(atomic.l3Functions[0].functionName).toBe('설비 동작');
    expect(atomic.l3Functions[0].processChar).toBe('온도 편차');
  });

  it('복구용 fallback: B4.parentItemId 형식이 달라도 processNo+m4로 FC/FL/RA를 생성해야 한다', () => {
    const flatData: ImportedFlatData[] = [
      item({ id: 'a1-10', processNo: '10', itemCode: 'A1', value: '10' }),
      item({ id: 'a2-10', processNo: '10', itemCode: 'A2', value: '공정10' }),
      item({ id: 'a3-10', processNo: '10', itemCode: 'A3', value: '공정기능' }),
      item({ id: 'a4-10', processNo: '10', itemCode: 'A4', value: '제품특성', parentItemId: 'a3-10' }),
      item({ id: 'a5-10', processNo: '10', itemCode: 'A5', value: '고장형태' }),
      item({ id: 'b1-mc', processNo: '10', itemCode: 'B1', value: '설비', m4: 'MC' }),
      item({ id: 'b2-mc', processNo: '10', itemCode: 'B2', value: '설비 동작', m4: 'MC' }),
      item({ id: 'b3-mc', processNo: '10', itemCode: 'B3', value: '온도 편차', m4: 'MC' }),
      item({
        id: 'b4-mc',
        processNo: '10',
        itemCode: 'B4',
        value: '온도 부족',
        m4: 'MC',
        parentItemId: 'L3-R2-C5-B3',
      }),
      item({ id: 'c2-yp', processNo: 'YP', itemCode: 'C2', value: '완제품 기능' }),
      item({ id: 'c3-yp', processNo: 'YP', itemCode: 'C3', value: '요구사항', parentItemId: 'c2-yp' }),
      item({ id: 'c4-yp', processNo: 'YP', itemCode: 'C4', value: '고장영향', parentItemId: 'c3-yp' }),
    ];

    const chains: StepBMasterChain[] = [
      {
        id: 'chain-1',
        processNo: '10',
        m4: 'MC',
        fmValue: '고장형태',
        fcValue: '온도 부족',
        feValue: '고장영향',
        feScope: 'YP',
        s: 8,
        o: 4,
        d: 6,
        pcValue: '예방관리',
        dcValue: '검출관리',
      } as StepBMasterChain,
    ];

    const atomic = buildAtomicFromFlat({
      fmeaId: 'pfm26-test-fallback-02',
      flatData,
      chains,
      l1Name: '테스트',
    });

    expect(atomic.failureCauses).toHaveLength(1);
    expect(atomic.failureCauses[0].l3StructId).toBe('b1-mc');
    expect(atomic.failureCauses[0].l3FuncId).toBe('b3-mc');
    expect(atomic.failureLinks).toHaveLength(1);
    expect(atomic.failureLinks[0].fcId).toBe('b4-mc');
    expect(atomic.riskAnalyses).toHaveLength(1);
    expect(atomic.riskAnalyses[0].preventionControl).toBe('예방관리');
    expect(atomic.riskAnalyses[0].detectionControl).toBe('검출관리');
  });
});
