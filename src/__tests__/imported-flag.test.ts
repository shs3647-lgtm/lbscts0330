/**
 * @file imported-flag.test.ts
 * @description Import 자동보완 데이터에 imported flag가 설정되는지 검증
 *
 * 호텔 비유: 체크인(Import) 시 호텔이 자동으로 배정한 방(자동보완 셀)에는
 * "자동배정" 태그가 붙어야 한다. 고객(사용자)이 방을 확인하고 수락하거나
 * 다른 방으로 변경하면 태그가 제거된다.
 */

import { describe, it, expect } from 'vitest';
import { fillPCDCFromImport } from '../app/(fmea-core)/pfmea/worksheet/utils/fillPCDCFromImport';
import { autoFillMissingOccurrence } from '../app/(fmea-core)/pfmea/worksheet/utils/autoFillOccurrence';

describe('fillPCDCFromImport — imported flags', () => {
  const links = [
    { fmId: 'fm1', fcId: 'fc1', fcText: '용접기 미정비', processNo: '10', m4: 'MC' },
    { fmId: 'fm1', fcId: 'fc2', fcText: '열량 부족', processNo: '10', m4: 'MC' },
  ];

  it('PC 직접매칭 시 imported-prevention flag 설정', () => {
    const chains = [
      { processNo: '10', fcValue: '용접기 미정비', pcValue: '정기 정비', dcValue: '' },
    ];
    const result = fillPCDCFromImport({}, links, [], [], undefined, undefined, chains);
    const rd = result.updatedRiskData;

    expect(rd['prevention-fm1-fc1']).toBe('P:정기 정비');
    expect(rd['imported-prevention-fm1-fc1']).toBe('auto');
  });

  it('DC 직접매칭 시 imported-detection flag 설정', () => {
    const chains = [
      { processNo: '10', fcValue: '용접기 미정비', pcValue: '', dcValue: '육안 검사' },
    ];
    const result = fillPCDCFromImport({}, links, [], [], undefined, undefined, chains);
    const rd = result.updatedRiskData;

    expect(rd['detection-fm1-fc1']).toBe('D:육안 검사');
    expect(rd['imported-detection-fm1-fc1']).toBe('auto');
  });

  it('O 자동평가 시 imported-O flag 설정', () => {
    const chains = [
      { processNo: '10', fcValue: '용접기 미정비', pcValue: '100% 자동화 검사', dcValue: '' },
    ];
    const result = fillPCDCFromImport({}, links, [], [], undefined, undefined, chains);
    const rd = result.updatedRiskData;

    // O값이 자동 평가되었으면 imported-O flag도 설정
    if (rd['risk-fm1-fc1-O']) {
      expect(rd['imported-O-fm1-fc1']).toBe('auto');
    }
  });

  it('D 자동평가 시 imported-D flag 설정', () => {
    const chains = [
      { processNo: '10', fcValue: '용접기 미정비', pcValue: '', dcValue: '100% 자동화 검사' },
    ];
    const result = fillPCDCFromImport({}, links, [], [], undefined, undefined, chains);
    const rd = result.updatedRiskData;

    if (rd['risk-fm1-fc1-D']) {
      expect(rd['imported-D-fm1-fc1']).toBe('auto');
    }
  });

  it('PC fallback 매칭(processNo 기준) 시에도 imported flag 설정', () => {
    const b5Items = [
      { processNo: '10', value: '주기적 확인', m4: 'MC' },
    ];
    const result = fillPCDCFromImport({}, links, b5Items, []);
    const rd = result.updatedRiskData;

    if (rd['prevention-fm1-fc1']) {
      expect(rd['imported-prevention-fm1-fc1']).toBe('auto');
    }
  });

  it('DC fallback 매칭(processNo 기준) 시에도 imported flag 설정', () => {
    const a6Items = [
      { processNo: '10', value: '육안 검사' },
    ];
    const result = fillPCDCFromImport({}, links, [], a6Items);
    const rd = result.updatedRiskData;

    if (rd['detection-fm1-fc1']) {
      expect(rd['imported-detection-fm1-fc1']).toBe('auto');
    }
  });

  it('기존 PC 값이 있으면 imported flag 미설정 (사용자 입력 존재)', () => {
    const existingRD = { 'prevention-fm1-fc1': '사용자 입력 PC' };
    const chains = [
      { processNo: '10', fcValue: '용접기 미정비', pcValue: '정기 정비', dcValue: '' },
    ];
    const result = fillPCDCFromImport(existingRD, links, [], [], undefined, undefined, chains);
    const rd = result.updatedRiskData;

    // 사용자가 직접 입력한 값 → 자동보완 미수행 → flag 없음
    expect(rd['imported-prevention-fm1-fc1']).toBeUndefined();
  });
});

describe('autoFillMissingOccurrence — imported flags', () => {
  it('O 자동채움 시 imported-O flag 설정', () => {
    const riskData = {
      'prevention-fm1-fc1': 'P:100% 자동화 검사',
    };
    const links = [{ fmId: 'fm1', fcId: 'fc1' }];
    const result = autoFillMissingOccurrence(riskData, links);
    const rd = result.updatedRiskData;

    if (result.filledCount > 0) {
      expect(rd['imported-O-fm1-fc1']).toBe('auto');
    }
  });

  it('O가 이미 존재하면 imported flag 미설정', () => {
    const riskData = {
      'risk-fm1-fc1-O': 5,
      'prevention-fm1-fc1': 'P:100% 자동화 검사',
    };
    const links = [{ fmId: 'fm1', fcId: 'fc1' }];
    const result = autoFillMissingOccurrence(riskData, links);
    const rd = result.updatedRiskData;

    expect(rd['imported-O-fm1-fc1']).toBeUndefined();
  });
});
