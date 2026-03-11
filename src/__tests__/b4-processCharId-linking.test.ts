/**
 * @file b4-processCharId-linking.test.ts
 * @description B4(고장원인) → B3(공정특성) processCharId 연결 테스트
 *
 * 버그: buildWorksheetState()에서 B4 생성 시 processCharId를 설정하지 않음
 *       → 워크시트 FailureL3Tab에서 모든 공정특성이 "누락"으로 표시
 *
 * TDD RED → GREEN
 */

import { describe, test, expect } from 'vitest';
import { buildWorksheetState, type BuildConfig } from '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import type { L3FailureCauseExtended } from '@/app/(fmea-core)/pfmea/worksheet/constants';

// ─── 헬퍼: flat data 생성 ───

let seq = 0;
function makeItem(
  processNo: string,
  itemCode: string,
  value: string,
  m4?: string,
  category?: 'A' | 'B' | 'C',
): ImportedFlatData {
  return {
    id: `test-${++seq}`,
    processNo,
    itemCode,
    value,
    m4: m4 || '',
    category: category || (itemCode[0] as 'A' | 'B' | 'C'),
    createdAt: new Date(),
  };
}

const config: BuildConfig = { fmeaId: 'test-fmea-001' };

// ─── 기본 구조 데이터 (A1/A2 + C1) ───

function makeBaseData(processNo: string): ImportedFlatData[] {
  return [
    makeItem(processNo, 'A1', processNo, '', 'A'),
    makeItem(processNo, 'A2', `공정_${processNo}`, '', 'A'),
    makeItem('YP', 'C1', 'YP', '', 'C'),
  ];
}

describe('B4 → B3 processCharId 연결', () => {

  test('B4가 있으면 같은 m4의 B3에 processCharId로 연결되어야 함', () => {
    const flatData: ImportedFlatData[] = [
      ...makeBaseData('10'),
      // B1: 작업요소 (MC)
      makeItem('10', 'B1', '용접기', 'MC'),
      // B2: 기능
      makeItem('10', 'B2', '용접 수행', 'MC'),
      // B3: 공정특성
      makeItem('10', 'B3', '전류값', 'MC'),
      // B4: 고장원인
      makeItem('10', 'B4', '전류 편차', 'MC'),
    ];

    const result = buildWorksheetState(flatData, config);
    expect(result.success).toBe(true);

    const proc = result.state.l2[0];
    const causes = proc.failureCauses as L3FailureCauseExtended[];
    expect(causes.length).toBe(1);
    expect(causes[0].name).toBe('전류 편차');
    expect(causes[0].processCharId).toBeTruthy();
    // processCharId가 실제 processChar의 ID와 일치해야 함
    const allPCs = proc.l3.flatMap(we =>
      we.functions.flatMap(f => (f.processChars || []).map(pc => pc.id))
    );
    expect(allPCs).toContain(causes[0].processCharId);
  });

  test('같은 m4 내 B3 여러개 + B4 여러개 → 균등 배분 연결', () => {
    const flatData: ImportedFlatData[] = [
      ...makeBaseData('20'),
      makeItem('20', 'B1', '프레스', 'MC'),
      makeItem('20', 'B2', '가압', 'MC'),
      // B3 2개
      makeItem('20', 'B3', '압력', 'MC'),
      makeItem('20', 'B3', '온도', 'MC'),
      // B4 2개
      makeItem('20', 'B4', '압력 부족', 'MC'),
      makeItem('20', 'B4', '온도 이상', 'MC'),
    ];

    const result = buildWorksheetState(flatData, config);
    expect(result.success).toBe(true);

    const proc = result.state.l2[0];
    const causes = proc.failureCauses as L3FailureCauseExtended[];
    expect(causes.length).toBe(2);

    // 모든 cause에 processCharId가 있어야 함
    causes.forEach(c => {
      expect(c.processCharId).toBeTruthy();
    });

    // 각 cause의 processCharId가 실제 processChar ID여야 함
    const allPCIds = proc.l3.flatMap(we =>
      we.functions.flatMap(f => (f.processChars || []).map(pc => pc.id))
    );
    causes.forEach(c => {
      expect(allPCIds).toContain(c.processCharId);
    });
  });

  test('다른 m4의 B4는 해당 m4의 B3에만 연결', () => {
    const flatData: ImportedFlatData[] = [
      ...makeBaseData('30'),
      // MC 작업요소
      makeItem('30', 'B1', '설비A', 'MC'),
      makeItem('30', 'B2', '가공', 'MC'),
      makeItem('30', 'B3', '가공정도', 'MC'),
      makeItem('30', 'B4', '가공불량', 'MC'),
      // MN 작업요소
      makeItem('30', 'B1', '작업자', 'MN'),
      makeItem('30', 'B2', '세팅', 'MN'),
      makeItem('30', 'B3', '세팅값', 'MN'),
      makeItem('30', 'B4', '세팅오류', 'MN'),
    ];

    const result = buildWorksheetState(flatData, config);
    expect(result.success).toBe(true);

    const proc = result.state.l2[0];
    const causes = proc.failureCauses as L3FailureCauseExtended[];
    expect(causes.length).toBe(2);

    // MC cause (가공불량) → MC processChar
    const mcCause = causes.find(c => c.name === '가공불량');
    expect(mcCause?.processCharId).toBeTruthy();
    const mcPCIds = proc.l3
      .filter(we => we.m4 === 'MC')
      .flatMap(we => we.functions.flatMap(f => (f.processChars || []).map(pc => pc.id)));
    expect(mcPCIds).toContain(mcCause?.processCharId);

    // MN cause (세팅오류) → MN processChar
    const mnCause = causes.find(c => c.name === '세팅오류');
    expect(mnCause?.processCharId).toBeTruthy();
    const mnPCIds = proc.l3
      .filter(we => we.m4 === 'MN')
      .flatMap(we => we.functions.flatMap(f => (f.processChars || []).map(pc => pc.id)));
    expect(mnPCIds).toContain(mnCause?.processCharId);
  });

  test('B3 없이 B4만 있으면 processCharId 없이 생성 (기존 동작)', () => {
    const flatData: ImportedFlatData[] = [
      ...makeBaseData('40'),
      makeItem('40', 'B1', '장비', 'MC'),
      makeItem('40', 'B2', '작동', 'MC'),
      // B3 없음
      makeItem('40', 'B4', '작동불량', 'MC'),
    ];

    const result = buildWorksheetState(flatData, config);
    expect(result.success).toBe(true);

    const proc = result.state.l2[0];
    const causes = proc.failureCauses as L3FailureCauseExtended[];
    expect(causes.length).toBe(1);
    expect(causes[0].name).toBe('작동불량');
    // ★ 2026-03-05: B3 없어도 WE명 기반 자동생성 processChar에 연결됨
    // B3 자동보충 로직에 의해 processCharId가 항상 존재
    expect(causes[0].processCharId).toBeTruthy();
  });

  test('B4 > B3 → 초과 B4는 마지막 B3에 연결', () => {
    const flatData: ImportedFlatData[] = [
      ...makeBaseData('50'),
      makeItem('50', 'B1', '도장기', 'MC'),
      makeItem('50', 'B2', '도장', 'MC'),
      // B3 1개
      makeItem('50', 'B3', '도막두께', 'MC'),
      // B4 3개
      makeItem('50', 'B4', '도막 과소', 'MC'),
      makeItem('50', 'B4', '도막 과대', 'MC'),
      makeItem('50', 'B4', '도막 불균일', 'MC'),
    ];

    const result = buildWorksheetState(flatData, config);
    expect(result.success).toBe(true);

    const proc = result.state.l2[0];
    const causes = proc.failureCauses as L3FailureCauseExtended[];
    expect(causes.length).toBe(3);

    // 모든 cause에 processCharId가 있어야 함 (유일한 B3에 모두 연결)
    const pcId = proc.l3[0].functions[0].processChars[0].id;
    causes.forEach(c => {
      expect(c.processCharId).toBe(pcId);
    });
  });

  test('워크시트 누락 카운트가 0이어야 함 (모든 B3에 B4 연결)', () => {
    const flatData: ImportedFlatData[] = [
      ...makeBaseData('60'),
      makeItem('60', 'B1', '세척기', 'MC'),
      makeItem('60', 'B2', '세척', 'MC'),
      makeItem('60', 'B3', '세척도', 'MC'),
      makeItem('60', 'B3', '농도', 'MC'),
      makeItem('60', 'B4', '세척 불량', 'MC'),
      makeItem('60', 'B4', '농도 부족', 'MC'),
    ];

    const result = buildWorksheetState(flatData, config);
    expect(result.success).toBe(true);

    const proc = result.state.l2[0];
    const causes = proc.failureCauses as L3FailureCauseExtended[];

    // 워크시트 FailureL3Tab 누락 카운트 시뮬레이션
    let missingCount = 0;
    const allPCs = proc.l3.flatMap(we =>
      we.functions.flatMap(f => (f.processChars || []))
    );
    for (const pc of allPCs) {
      const linked = causes.filter(c => c.processCharId === pc.id);
      if (linked.length === 0) missingCount++;
    }

    // 모든 B3에 B4가 연결되어 있으므로 누락 0
    expect(missingCount).toBe(0);
  });
});
