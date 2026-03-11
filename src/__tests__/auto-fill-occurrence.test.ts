/**
 * @file auto-fill-occurrence.test.ts
 * @description TDD: PC(예방관리) 텍스트 기반 발생도(O) 자동채움 유틸리티 검증
 *
 * 문제: failureLinks에 593개 FM-FC 쌍이 있으나, riskData에 risk-{uk}-O 키가 510개만 존재 → 83개 누락
 *       누락된 83개 모두 prevention-{uk} (PC 텍스트)는 존재
 * 해결: PC 텍스트에서 correctOccurrence()로 O값을 산정해 자동 채움
 */

import { autoFillMissingOccurrence, type AutoFillResult } from '../app/(fmea-core)/pfmea/worksheet/utils/autoFillOccurrence';

describe('autoFillMissingOccurrence', () => {

  test('PC 텍스트가 있고 O가 누락된 경우 자동 채움', () => {
    const riskData: Record<string, unknown> = {
      'prevention-fm1-fc1': 'P:바코드 스캔 확인',
      'detection-fm1-fc1': 'D:바코드 스캐너',
      'risk-fm1-fc1-D': 3,
    };
    const failureLinks = [
      { fmId: 'fm1', fcId: 'fc1' },
    ];

    const result = autoFillMissingOccurrence(riskData, failureLinks);

    expect(result.filledCount).toBe(1);
    expect(result.updatedRiskData['risk-fm1-fc1-O']).toBeDefined();
    expect(result.updatedRiskData['risk-fm1-fc1-O']).toBeGreaterThanOrEqual(1);
    expect(result.updatedRiskData['risk-fm1-fc1-O']).toBeLessThanOrEqual(10);
  });

  test('이미 O값이 있으면 덮어쓰지 않음', () => {
    const riskData: Record<string, unknown> = {
      'prevention-fm1-fc1': 'P:바코드 스캔 확인',
      'risk-fm1-fc1-O': 5,
      'risk-fm1-fc1-D': 3,
    };
    const failureLinks = [
      { fmId: 'fm1', fcId: 'fc1' },
    ];

    const result = autoFillMissingOccurrence(riskData, failureLinks);

    expect(result.filledCount).toBe(0);
    expect(result.updatedRiskData['risk-fm1-fc1-O']).toBe(5);
  });

  test('PC 텍스트가 없으면 채우지 않음', () => {
    const riskData: Record<string, unknown> = {
      'risk-fm1-fc1-D': 3,
    };
    const failureLinks = [
      { fmId: 'fm1', fcId: 'fc1' },
    ];

    const result = autoFillMissingOccurrence(riskData, failureLinks);

    expect(result.filledCount).toBe(0);
    expect(result.updatedRiskData['risk-fm1-fc1-O']).toBeUndefined();
  });

  test('바코드 스캔 → O=3 (자동식별)', () => {
    const riskData: Record<string, unknown> = {
      'prevention-fm1-fc1': 'P:바코드/QR 스캔 확인',
      'risk-fm1-fc1-D': 3,
    };
    const failureLinks = [{ fmId: 'fm1', fcId: 'fc1' }];

    const result = autoFillMissingOccurrence(riskData, failureLinks);

    expect(result.updatedRiskData['risk-fm1-fc1-O']).toBe(3);
  });

  test('★ v2.1: 센서 교정/Calibration → O=3 (검교정 PC 이동)', () => {
    const riskData: Record<string, unknown> = {
      'prevention-fm1-fc1': 'P:센서 교정(Calibration) 주기 관리',
      'risk-fm1-fc1-D': 3,
    };
    const failureLinks = [{ fmId: 'fm1', fcId: 'fc1' }];

    const result = autoFillMissingOccurrence(riskData, failureLinks);

    expect(result.updatedRiskData['risk-fm1-fc1-O']).toBe(3);
  });

  test('★ v3.0: 교육/훈련 → O=5 (사람 의존 — AIAG-VDA 보수적 기준)', () => {
    const riskData: Record<string, unknown> = {
      'prevention-fm1-fc1': 'P:작업자 교육 및 숙련도 강화',
      'risk-fm1-fc1-D': 3,
    };
    const failureLinks = [{ fmId: 'fm1', fcId: 'fc1' }];

    const result = autoFillMissingOccurrence(riskData, failureLinks);

    expect(result.updatedRiskData['risk-fm1-fc1-O']).toBe(5);
  });

  test('복수 누락 시 모두 채움', () => {
    const riskData: Record<string, unknown> = {
      'prevention-fm1-fc1': 'P:바코드 스캔 확인',
      'prevention-fm2-fc2': 'P:센서 교정 관리',
      'prevention-fm3-fc3': 'P:작업자 교육',
      'risk-fm1-fc1-D': 3,
      'risk-fm2-fc2-D': 4,
      'risk-fm3-fc3-D': 5,
    };
    const failureLinks = [
      { fmId: 'fm1', fcId: 'fc1' },
      { fmId: 'fm2', fcId: 'fc2' },
      { fmId: 'fm3', fcId: 'fc3' },
    ];

    const result = autoFillMissingOccurrence(riskData, failureLinks);

    expect(result.filledCount).toBe(3);
    expect(result.updatedRiskData['risk-fm1-fc1-O']).toBe(3);
    expect(result.updatedRiskData['risk-fm2-fc2-O']).toBe(3);
    expect(result.updatedRiskData['risk-fm3-fc3-O']).toBe(5);
  });

  test('빈 failureLinks → 변경 없음', () => {
    const riskData: Record<string, unknown> = { 'risk-x-y-O': 5 };
    const result = autoFillMissingOccurrence(riskData, []);

    expect(result.filledCount).toBe(0);
    expect(result.updatedRiskData).toEqual(riskData);
  });

  test('★ v2.1: 키워드 미매칭 PC 텍스트 → 추천 없음 (채우지 않음)', () => {
    const riskData: Record<string, unknown> = {
      'prevention-fm1-fc1': 'P:외주 업체 정기 실사 확인',
      'risk-fm1-fc1-D': 3,
    };
    const failureLinks = [{ fmId: 'fm1', fcId: 'fc1' }];

    const result = autoFillMissingOccurrence(riskData, failureLinks);

    expect(result.filledCount).toBe(0);
    expect(result.updatedRiskData['risk-fm1-fc1-O']).toBeUndefined();
  });

  test('기존 riskData의 다른 키는 보존됨', () => {
    const riskData: Record<string, unknown> = {
      'prevention-fm1-fc1': 'P:바코드 스캔',
      'risk-fm1-fc1-D': 3,
      'risk-fm2-fc2-O': 7,
      'risk-fm2-fc2-D': 4,
      'some-other-key': 'value',
    };
    const failureLinks = [
      { fmId: 'fm1', fcId: 'fc1' },
      { fmId: 'fm2', fcId: 'fc2' },
    ];

    const result = autoFillMissingOccurrence(riskData, failureLinks);

    expect(result.updatedRiskData['risk-fm2-fc2-O']).toBe(7);
    expect(result.updatedRiskData['some-other-key']).toBe('value');
    expect(result.filledCount).toBe(1);
  });

  test('결과에 채워진 항목 상세 정보 포함', () => {
    const riskData: Record<string, unknown> = {
      'prevention-fm1-fc1': 'P:바코드 스캔 확인',
      'risk-fm1-fc1-D': 3,
    };
    const failureLinks = [{ fmId: 'fm1', fcId: 'fc1' }];

    const result = autoFillMissingOccurrence(riskData, failureLinks);

    expect(result.details.length).toBe(1);
    expect(result.details[0].uniqueKey).toBe('fm1-fc1');
    expect(result.details[0].oValue).toBe(3);
    expect(result.details[0].reason).toBeDefined();
  });
});
