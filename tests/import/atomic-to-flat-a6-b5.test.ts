/**
 * @file atomic-to-flat-a6-b5.test.ts
 * @description A6(검출관리) / B5(예방관리) flatData 생성 + FK 검증
 *  - A6: L2 시트 FailureMode.detectionControl → flatData (parentItemId = FM.id)
 *  - B5: L3 시트 FailureCause.preventionControl → flatData (parentItemId = FC.id)
 *  - A6: FM당 1행(동일 DC 문자열이 여러 FM이면 여러 A6). B5: 복합키 dedup
 */
import { describe, it, expect } from 'vitest';
import { atomicToFlatData } from '@/lib/fmea/position-parser';
import { verifyFK } from '@/app/(fmea-core)/pfmea/import/utils/import-verification-columns';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import type { PositionAtomicData } from '@/types/position-import';

function minimalPositionData(overrides: Partial<PositionAtomicData>): PositionAtomicData {
  const base: PositionAtomicData = {
    fmeaId: 'pfm26-m-test',
    l1Structure: { id: 'L1-STRUCT', fmeaId: 'pfm26-m-test', name: 'L1' },
    l1Functions: [],
    l1Requirements: [],
    l1Scopes: [],
    l2Structures: [],
    l2Functions: [],
    l2ProcessNos: [],
    l2ProcessNames: [],
    l2SpecialChars: [],
    l3Structures: [],
    l3Functions: [],
    l3ProcessChars: [],
    l3ProcessNos: [],
    l3FourMs: [],
    l3WorkElements: [],
    l3SpecialChars: [],
    processProductChars: [],
    failureEffects: [],
    failureModes: [],
    failureCauses: [],
    failureLinks: [],
    riskAnalyses: [],
    stats: {},
  };
  return { ...base, ...overrides };
}

describe('atomicToFlatData A6(검출관리)', () => {
  it('FailureMode.detectionControl → A6 flatData 생성, parentItemId = FM.id', () => {
    const data = minimalPositionData({
      l2Structures: [
        { id: 'l2-10', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', parentId: 'L1-STRUCT', no: '10', name: 'PR Coat', order: 0 },
      ],
      processProductChars: [
        { id: 'pc-10-1', fmeaId: 'pfm26-m-test', l2StructId: 'l2-10', parentId: 'l2-10', name: '두께', orderIndex: 0 },
      ],
      failureModes: [
        {
          id: 'fm-10-1', fmeaId: 'pfm26-m-test', l2FuncId: 'lf-10', l2StructId: 'l2-10',
          productCharId: 'pc-10-1', parentId: 'pc-10-1', mode: '두께 초과',
          detectionControl: 'SPC 모니터링',
        },
        {
          id: 'fm-10-2', fmeaId: 'pfm26-m-test', l2FuncId: 'lf-10', l2StructId: 'l2-10',
          productCharId: 'pc-10-1', parentId: 'pc-10-1', mode: '두께 미달',
          detectionControl: 'SPC 모니터링',  // 동일 DC → dedup
        },
      ],
    });

    const flat = atomicToFlatData(data);
    const a6Items = flat.filter(f => f.itemCode === 'A6');

    // 동일 공정·동일 DC라도 FM이 다르면 A6 행도 각각 (엑셀 L2 행·FM 수와 정합)
    expect(a6Items.length).toBe(2);
    expect(a6Items.every(a => a.value === 'SPC 모니터링')).toBe(true);
    expect(a6Items.map(a => a.parentItemId).sort()).toEqual(['fm-10-1', 'fm-10-2']);
  });

  it('다른 공정 동일 DC 텍스트 → 별도 A6 항목 생성', () => {
    const data = minimalPositionData({
      l2Structures: [
        { id: 'l2-10', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', parentId: 'L1-STRUCT', no: '10', name: 'Coat', order: 0 },
        { id: 'l2-20', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', parentId: 'L1-STRUCT', no: '20', name: 'Etch', order: 1 },
      ],
      processProductChars: [
        { id: 'pc-10', fmeaId: 'pfm26-m-test', l2StructId: 'l2-10', parentId: 'l2-10', name: '두께', orderIndex: 0 },
        { id: 'pc-20', fmeaId: 'pfm26-m-test', l2StructId: 'l2-20', parentId: 'l2-20', name: '깊이', orderIndex: 1 },
      ],
      failureModes: [
        {
          id: 'fm-10', fmeaId: 'pfm26-m-test', l2FuncId: 'lf-10', l2StructId: 'l2-10',
          productCharId: 'pc-10', parentId: 'pc-10', mode: 'FM-10',
          detectionControl: 'SPC',
        },
        {
          id: 'fm-20', fmeaId: 'pfm26-m-test', l2FuncId: 'lf-20', l2StructId: 'l2-20',
          productCharId: 'pc-20', parentId: 'pc-20', mode: 'FM-20',
          detectionControl: 'SPC',  // 같은 텍스트, 다른 공정
        },
      ],
    });

    const flat = atomicToFlatData(data);
    const a6Items = flat.filter(f => f.itemCode === 'A6');

    // 다른 공정 → 별도 항목
    expect(a6Items.length).toBe(2);
    expect(a6Items.map(a => a.processNo).sort()).toEqual(['10', '20']);
  });

  it('detectionControl 없는 FM → A6 미생성', () => {
    const data = minimalPositionData({
      l2Structures: [
        { id: 'l2-10', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', parentId: 'L1-STRUCT', no: '10', name: 'Coat', order: 0 },
      ],
      failureModes: [
        {
          id: 'fm-10', fmeaId: 'pfm26-m-test', l2FuncId: 'lf-10', l2StructId: 'l2-10',
          parentId: 'l2-10', mode: 'FM-10',
          // detectionControl 없음
        },
      ],
    });

    const flat = atomicToFlatData(data);
    const a6Items = flat.filter(f => f.itemCode === 'A6');
    expect(a6Items.length).toBe(0);
  });

  it('RiskAnalysis DC fallback: FM에 DC 없고 RA에 DC 있으면 보충', () => {
    const data = minimalPositionData({
      l2Structures: [
        { id: 'l2-10', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', parentId: 'L1-STRUCT', no: '10', name: 'Coat', order: 0 },
      ],
      failureModes: [
        {
          id: 'fm-10', fmeaId: 'pfm26-m-test', l2FuncId: 'lf-10', l2StructId: 'l2-10',
          parentId: 'l2-10', mode: 'FM-10',
          // detectionControl 없음
        },
      ],
      failureLinks: [
        { id: 'fl-1', fmeaId: 'pfm26-m-test', fmId: 'fm-10', feId: 'fe-1', fcId: 'fc-1', fmProcess: '10' },
      ],
      riskAnalyses: [
        {
          id: 'ra-1', fmeaId: 'pfm26-m-test', linkId: 'fl-1', parentId: 'fl-1',
          severity: 0, occurrence: 0, detection: 0, ap: '',
          detectionControl: 'RA 기반 DC',
        },
      ],
    });

    const flat = atomicToFlatData(data);
    const a6Items = flat.filter(f => f.itemCode === 'A6');
    // RiskAnalysis fallback → 1건
    expect(a6Items.length).toBe(1);
    expect(a6Items[0].value).toBe('RA 기반 DC');
  });

  it('FM에 L2 DC가 있으면 RA detectionControl으로 A6를 추가하지 않음', () => {
    const data = minimalPositionData({
      l2Structures: [
        { id: 'l2-10', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', parentId: 'L1-STRUCT', no: '10', name: 'Coat', order: 0 },
      ],
      failureModes: [
        {
          id: 'fm-10', fmeaId: 'pfm26-m-test', l2FuncId: 'lf-10', l2StructId: 'l2-10',
          parentId: 'l2-10', mode: 'FM-10',
          detectionControl: 'L2 DC',
        },
      ],
      failureLinks: [
        { id: 'fl-1', fmeaId: 'pfm26-m-test', fmId: 'fm-10', feId: 'fe-1', fcId: 'fc-1', fmProcess: '10' },
      ],
      riskAnalyses: [
        {
          id: 'ra-1', fmeaId: 'pfm26-m-test', linkId: 'fl-1', parentId: 'fl-1',
          severity: 0, occurrence: 0, detection: 0, ap: '',
          detectionControl: 'RA 전용 DC',
        },
      ],
    });

    const flat = atomicToFlatData(data);
    const a6Items = flat.filter(f => f.itemCode === 'A6');
    expect(a6Items.length).toBe(1);
    expect(a6Items[0].value).toBe('L2 DC');
  });
});

describe('atomicToFlatData B5(예방관리)', () => {
  it('FailureCause.preventionControl → B5 flatData 생성, parentItemId = FC.id', () => {
    const data = minimalPositionData({
      l2Structures: [
        { id: 'l2-10', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', parentId: 'L1-STRUCT', no: '10', name: 'Coat', order: 0 },
      ],
      l3Structures: [
        { id: 'l3-10-1', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', l2Id: 'l2-10', parentId: 'l2-10', m4: 'MN', name: 'Sorter', order: 0 },
      ],
      l3Functions: [
        { id: 'l3f-10-1', fmeaId: 'pfm26-m-test', l3StructId: 'l3-10-1', l2StructId: 'l2-10', parentId: 'l3-10-1', functionName: '분류', processChar: '온도' },
      ],
      failureCauses: [
        {
          id: 'fc-10-1', fmeaId: 'pfm26-m-test', l3FuncId: 'l3f-10-1', l3StructId: 'l3-10-1', l2StructId: 'l2-10',
          parentId: 'l3f-10-1', cause: '온도 초과',
          preventionControl: 'SPC 관리',
        },
        {
          id: 'fc-10-2', fmeaId: 'pfm26-m-test', l3FuncId: 'l3f-10-1', l3StructId: 'l3-10-1', l2StructId: 'l2-10',
          parentId: 'l3f-10-1', cause: '온도 미달',
          preventionControl: '정기 교정',  // 다른 PC
        },
      ],
    });

    const flat = atomicToFlatData(data);
    const b5Items = flat.filter(f => f.itemCode === 'B5');

    expect(b5Items.length).toBe(2);
    expect(b5Items[0].value).toBe('SPC 관리');
    expect(b5Items[0].parentItemId).toBe('fc-10-1');
    expect(b5Items[1].value).toBe('정기 교정');
    expect(b5Items[1].parentItemId).toBe('fc-10-2');
    // processNo 유지
    expect(b5Items[0].processNo).toBe('10');
  });

  it('동일 복합키(pno|b1|b4|b5) → dedup', () => {
    const data = minimalPositionData({
      l2Structures: [
        { id: 'l2-10', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', parentId: 'L1-STRUCT', no: '10', name: 'Coat', order: 0 },
      ],
      l3Structures: [
        { id: 'l3-10-1', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', l2Id: 'l2-10', parentId: 'l2-10', m4: 'MN', name: 'Sorter', order: 0 },
        { id: 'l3-10-2', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', l2Id: 'l2-10', parentId: 'l2-10', m4: 'MN', name: 'Sorter', order: 1 },
      ],
      l3Functions: [
        { id: 'l3f-10-1', fmeaId: 'pfm26-m-test', l3StructId: 'l3-10-1', l2StructId: 'l2-10', parentId: 'l3-10-1', functionName: '분류', processChar: '온도' },
        { id: 'l3f-10-2', fmeaId: 'pfm26-m-test', l3StructId: 'l3-10-2', l2StructId: 'l2-10', parentId: 'l3-10-2', functionName: '분류', processChar: '온도' },
      ],
      failureCauses: [
        {
          id: 'fc-a', fmeaId: 'pfm26-m-test', l3FuncId: 'l3f-10-1', l3StructId: 'l3-10-1', l2StructId: 'l2-10',
          parentId: 'l3f-10-1', cause: '온도 초과',
          preventionControl: 'SPC',
        },
        {
          id: 'fc-b', fmeaId: 'pfm26-m-test', l3FuncId: 'l3f-10-2', l3StructId: 'l3-10-2', l2StructId: 'l2-10',
          parentId: 'l3f-10-2', cause: '온도 초과',
          preventionControl: 'SPC',  // 동일 pno + 동일 b1(Sorter) + 동일 b4 + 동일 b5
        },
      ],
    });

    const flat = atomicToFlatData(data);
    const b5Items = flat.filter(f => f.itemCode === 'B5');

    // 동일 복합키 → dedup → 1건
    expect(b5Items.length).toBe(1);
    expect(b5Items[0].value).toBe('SPC');
  });

  it('preventionControl 없는 FC → B5 미생성', () => {
    const data = minimalPositionData({
      l2Structures: [
        { id: 'l2-10', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', parentId: 'L1-STRUCT', no: '10', name: 'Coat', order: 0 },
      ],
      l3Structures: [
        { id: 'l3-10', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', l2Id: 'l2-10', parentId: 'l2-10', name: 'WE', order: 0 },
      ],
      failureCauses: [
        {
          id: 'fc-1', fmeaId: 'pfm26-m-test', l3FuncId: 'l3f-1', l3StructId: 'l3-10', l2StructId: 'l2-10',
          parentId: 'l3f-1', cause: 'cause',
          // preventionControl 없음
        },
      ],
    });

    const flat = atomicToFlatData(data);
    const b5Items = flat.filter(f => f.itemCode === 'B5');
    expect(b5Items.length).toBe(0);
  });

  it('RiskAnalysis PC fallback: FC에 PC 없고 RA에 PC 있으면 보충', () => {
    const data = minimalPositionData({
      l2Structures: [
        { id: 'l2-10', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', parentId: 'L1-STRUCT', no: '10', name: 'Coat', order: 0 },
      ],
      l3Structures: [
        { id: 'l3-10', fmeaId: 'pfm26-m-test', l1Id: 'L1-STRUCT', l2Id: 'l2-10', parentId: 'l2-10', m4: 'MN', name: 'WE', order: 0 },
      ],
      failureCauses: [
        {
          id: 'fc-1', fmeaId: 'pfm26-m-test', l3FuncId: 'l3f-1', l3StructId: 'l3-10', l2StructId: 'l2-10',
          parentId: 'l3f-1', cause: 'cause-1',
          // preventionControl 없음
        },
      ],
      failureLinks: [
        { id: 'fl-1', fmeaId: 'pfm26-m-test', fmId: 'fm-1', feId: 'fe-1', fcId: 'fc-1', fmProcess: '10', fcWorkElem: 'WE' },
      ],
      riskAnalyses: [
        {
          id: 'ra-1', fmeaId: 'pfm26-m-test', linkId: 'fl-1', parentId: 'fl-1',
          severity: 0, occurrence: 0, detection: 0, ap: '',
          preventionControl: 'RA 기반 PC',
        },
      ],
    });

    const flat = atomicToFlatData(data);
    const b5Items = flat.filter(f => f.itemCode === 'B5');
    // RiskAnalysis fallback → 1건
    expect(b5Items.length).toBe(1);
    expect(b5Items[0].value).toBe('RA 기반 PC');
  });
});
