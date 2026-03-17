/**
 * @file fc-flatmap-ordering.test.ts
 * @description flatMap.fc 인덱스 불일치 버그 재현 + 검증
 *
 * 버그: buildWorksheetState의 fillL3Data에서 causes 배열은 m4 그룹핑으로 재정렬되지만,
 *       flatMap.fc 기록은 b4Items(원본 순서)와 causes를 인덱스로 매핑 → 잘못된 FC ID 할당
 *
 * TDD: RED → GREEN
 */

import { describe, test, expect } from 'vitest';
import { buildWorksheetState, type BuildConfig, type FlatToEntityMap } from '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import type { L3FailureCauseExtended } from '@/app/(fmea-core)/pfmea/worksheet/constants';

let seq = 0;
function makeItem(
  processNo: string,
  itemCode: string,
  value: string,
  m4?: string,
  category?: 'A' | 'B' | 'C',
  parentItemId?: string,
): ImportedFlatData {
  return {
    id: `test-${++seq}`,
    processNo,
    itemCode,
    value,
    m4: m4 || '',
    category: category || (itemCode[0] as 'A' | 'B' | 'C'),
    createdAt: new Date(),
    parentItemId,
  };
}

const config: BuildConfig = { fmeaId: 'test-flatmap-fc' };

function makeBaseData(processNo: string): ImportedFlatData[] {
  return [
    makeItem(processNo, 'A1', processNo, '', 'A'),
    makeItem(processNo, 'A2', `공정_${processNo}`, '', 'A'),
    makeItem('YP', 'C1', 'YP', '', 'C'),
  ];
}

describe('flatMap.fc 순서 정합성 (다중 m4)', () => {

  test('다중 m4 B4 항목의 flatMap.fc가 올바른 FC entity ID를 가리켜야 함', () => {
    seq = 0;
    // MC B4 2개 + MN B4 2개 + IM B4 2개 = 총 6개 B4
    // m4 그룹핑으로 causes 순서가 b4Items와 달라질 수 있음
    const flatData: ImportedFlatData[] = [
      ...makeBaseData('10'),
      // MC 작업요소
      makeItem('10', 'B1', '설비A', 'MC'),
      makeItem('10', 'B2', '가공', 'MC'),
      makeItem('10', 'B3', '치수', 'MC'),
      // MN 작업요소
      makeItem('10', 'B1', '작업자', 'MN'),
      makeItem('10', 'B2', '세팅', 'MN'),
      makeItem('10', 'B3', '세팅값', 'MN'),
      // IM 작업요소
      makeItem('10', 'B1', '자재', 'IM'),
      makeItem('10', 'B2', '투입', 'IM'),
      makeItem('10', 'B3', '원자재', 'IM'),
      // B4 (Excel 순서: MC, MN, MC, IM, MN, IM — 혼합 배치)
      makeItem('10', 'B4', '치수 과대', 'MC'),      // b4[0]
      makeItem('10', 'B4', '세팅 미스', 'MN'),       // b4[1]
      makeItem('10', 'B4', '치수 과소', 'MC'),       // b4[2]
      makeItem('10', 'B4', '자재 불량', 'IM'),       // b4[3]
      makeItem('10', 'B4', '세팅값 편차', 'MN'),     // b4[4]
      makeItem('10', 'B4', '자재 오투입', 'IM'),     // b4[5]
    ];

    const flatMap: FlatToEntityMap = { fm: new Map(), fc: new Map(), fe: new Map() };
    const result = buildWorksheetState(flatData, config, undefined, flatMap);
    expect(result.success).toBe(true);

    const proc = result.state.l2[0];
    const causes = proc.failureCauses as L3FailureCauseExtended[];
    expect(causes.length).toBe(6);

    // 핵심 검증: flatMap.fc의 각 매핑이 이름 일치하는 FC entity를 가리키는지
    const b4Items = flatData.filter(d => d.itemCode === 'B4');
    expect(flatMap.fc.size).toBe(6);

    for (const b4 of b4Items) {
      const entityId = flatMap.fc.get(b4.id);
      expect(entityId).toBeTruthy();
      // entityId가 가리키는 FC의 이름이 b4.value와 같아야 함
      const matchedCause = causes.find(c => c.id === entityId);
      expect(matchedCause).toBeTruthy();
      expect(matchedCause!.name).toBe(b4.value);
    }
  });

  test('flatMap.fc 크기가 b4Items 수와 일치해야 함 (누락 금지)', () => {
    seq = 100;
    const flatData: ImportedFlatData[] = [
      ...makeBaseData('20'),
      makeItem('20', 'B1', '설비', 'MC'),
      makeItem('20', 'B2', '조립', 'MC'),
      makeItem('20', 'B3', '토크', 'MC'),
      makeItem('20', 'B1', '작업자', 'MN'),
      makeItem('20', 'B2', '작업', 'MN'),
      makeItem('20', 'B3', '숙련도', 'MN'),
      // B4: MC 3개, MN 3개
      makeItem('20', 'B4', '토크 부족', 'MC'),
      makeItem('20', 'B4', '숙련 미달', 'MN'),
      makeItem('20', 'B4', '토크 과대', 'MC'),
      makeItem('20', 'B4', '작업 실수', 'MN'),
      makeItem('20', 'B4', '토크 편차', 'MC'),
      makeItem('20', 'B4', '교육 부족', 'MN'),
    ];

    const flatMap: FlatToEntityMap = { fm: new Map(), fc: new Map(), fe: new Map() };
    const result = buildWorksheetState(flatData, config, undefined, flatMap);
    expect(result.success).toBe(true);

    const b4Count = flatData.filter(d => d.itemCode === 'B4').length;
    expect(flatMap.fc.size).toBe(b4Count);
  });

  test('단일 m4에서는 flatMap.fc 순서가 올바름 (기존 동작 보존)', () => {
    seq = 200;
    const flatData: ImportedFlatData[] = [
      ...makeBaseData('30'),
      makeItem('30', 'B1', '설비', 'MC'),
      makeItem('30', 'B2', '가공', 'MC'),
      makeItem('30', 'B3', '치수A', 'MC'),
      makeItem('30', 'B3', '치수B', 'MC'),
      makeItem('30', 'B4', '치수A 불량', 'MC'),
      makeItem('30', 'B4', '치수B 불량', 'MC'),
    ];

    const flatMap: FlatToEntityMap = { fm: new Map(), fc: new Map(), fe: new Map() };
    const result = buildWorksheetState(flatData, config, undefined, flatMap);
    expect(result.success).toBe(true);

    const b4Items = flatData.filter(d => d.itemCode === 'B4');
    const proc = result.state.l2[0];
    const causes = proc.failureCauses as L3FailureCauseExtended[];

    for (const b4 of b4Items) {
      const entityId = flatMap.fc.get(b4.id);
      expect(entityId).toBeTruthy();
      const matchedCause = causes.find(c => c.id === entityId);
      expect(matchedCause).toBeTruthy();
      expect(matchedCause!.name).toBe(b4.value);
    }
  });

  test('m4 불일치 B4(unmatchedB4)도 flatMap.fc에 기록되어야 함', () => {
    seq = 300;
    const flatData: ImportedFlatData[] = [
      ...makeBaseData('40'),
      makeItem('40', 'B1', '설비', 'MC'),
      makeItem('40', 'B2', '가공', 'MC'),
      makeItem('40', 'B3', '치수', 'MC'),
      // EN m4의 B4 — MC/MN에만 WE가 있어서 unmatchedB4로 분류됨
      makeItem('40', 'B4', '환경오염', 'EN'),
      makeItem('40', 'B4', '치수 편차', 'MC'),
    ];

    const flatMap: FlatToEntityMap = { fm: new Map(), fc: new Map(), fe: new Map() };
    const result = buildWorksheetState(flatData, config, undefined, flatMap);
    expect(result.success).toBe(true);

    const b4Items = flatData.filter(d => d.itemCode === 'B4');
    // unmatchedB4 포함 모든 B4가 flatMap.fc에 기록되어야 함
    expect(flatMap.fc.size).toBe(b4Items.length);

    for (const b4 of b4Items) {
      const entityId = flatMap.fc.get(b4.id);
      expect(entityId).toBeTruthy();
      const proc = result.state.l2[0];
      const causes = proc.failureCauses as L3FailureCauseExtended[];
      const matchedCause = causes.find(c => c.id === entityId);
      expect(matchedCause).toBeTruthy();
      expect(matchedCause!.name).toBe(b4.value);
    }
  });
});
