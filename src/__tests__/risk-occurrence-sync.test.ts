/**
 * @file risk-occurrence-sync.test.ts
 * @description riskData → riskAnalysis 발생도/검출도 동기화 테스트
 */

import { buildRiskAnalysisFromData } from '../app/(fmea-core)/pfmea/worksheet/utils/riskDataSync';

describe('buildRiskAnalysisFromData', () => {
  const failureLinks = [
    { id: 'link1', fmId: 'fm1', fcId: 'fc1', feId: 'fe1', severity: 5, fmText: 'FM1', fcText: 'FC1', feText: 'FE1' },
    { id: 'link2', fmId: 'fm1', fcId: 'fc2', feId: 'fe1', severity: 5, fmText: 'FM1', fcText: 'FC2', feText: 'FE1' },
    { id: 'link3', fmId: 'fm2', fcId: 'fc3', feId: 'fe2', severity: 7, fmText: 'FM2', fcText: 'FC3', feText: 'FE2' },
  ];

  const riskData: Record<string, unknown> = {
    'risk-fm1-fc1-O': 3,
    'risk-fm1-fc1-D': 4,
    'risk-fm1-fc1-PC': '관리절차 수립',
    'risk-fm1-fc1-DC': '육안 검사',
    'risk-fm1-fc2-O': 6,
    'risk-fm1-fc2-D': 5,
    'risk-fm2-fc3-O': 4,
    'risk-fm2-fc3-D': 7,
    'risk-fm2-fc3-PC': '교육 실시',
    'risk-fm2-fc3-DC': '치수측정기',
  };

  it('failureLinks 기반으로 riskAnalysis 항목을 생성해야 함', () => {
    const result = buildRiskAnalysisFromData(failureLinks, riskData, []);
    expect(result).toHaveLength(3);
  });

  it('riskData에서 발생도(O)를 올바르게 매핑해야 함', () => {
    const result = buildRiskAnalysisFromData(failureLinks, riskData, []);
    const fc1 = result.find(r => r.id === 'fc1');
    expect(fc1?.occurrence).toBe(3);

    const fc2 = result.find(r => r.id === 'fc2');
    expect(fc2?.occurrence).toBe(6);

    const fc3 = result.find(r => r.id === 'fc3');
    expect(fc3?.occurrence).toBe(4);
  });

  it('riskData에서 검출도(D)를 올바르게 매핑해야 함', () => {
    const result = buildRiskAnalysisFromData(failureLinks, riskData, []);
    const fc1 = result.find(r => r.id === 'fc1');
    expect(fc1?.detection).toBe(4);
  });

  it('riskData에서 PC/DC를 올바르게 매핑해야 함', () => {
    const result = buildRiskAnalysisFromData(failureLinks, riskData, []);
    const fc1 = result.find(r => r.id === 'fc1');
    expect(fc1?.preventionControl).toBe('관리절차 수립');
    expect(fc1?.detectionControl).toBe('육안 검사');
  });

  it('기존 riskAnalysis가 있으면 보존해야 함', () => {
    const existingAnalysis = [
      { id: 'fc1', preventionControl: '기존PC', occurrence: 9, detectionControl: '기존DC', detection: 8, ap: 0, rpn: 0, specialChar: '', lessonLearned: '교훈' },
    ];
    const result = buildRiskAnalysisFromData(failureLinks, riskData, existingAnalysis);
    const fc1 = result.find(r => r.id === 'fc1');
    expect(fc1?.preventionControl).toBe('기존PC');
    expect(fc1?.occurrence).toBe(9);
    expect(fc1?.lessonLearned).toBe('교훈');
  });

  it('riskData가 비어있으면 빈 값으로 초기화해야 함', () => {
    const result = buildRiskAnalysisFromData(failureLinks, {}, []);
    expect(result).toHaveLength(3);
    const fc1 = result.find(r => r.id === 'fc1');
    expect(fc1?.occurrence).toBe(0);
    expect(fc1?.detection).toBe(0);
  });

  it('동일 fcId 중복 failureLinks가 있어도 하나만 생성해야 함', () => {
    const dupeLinks = [
      ...failureLinks,
      { id: 'link4', fmId: 'fm3', fcId: 'fc1', feId: 'fe3', severity: 3, fmText: 'FM3', fcText: 'FC1', feText: 'FE3' },
    ];
    const result = buildRiskAnalysisFromData(dupeLinks, riskData, []);
    const fc1Items = result.filter(r => r.id === 'fc1');
    expect(fc1Items).toHaveLength(1);
    expect(fc1Items[0].occurrence).toBe(3);
  });
});
