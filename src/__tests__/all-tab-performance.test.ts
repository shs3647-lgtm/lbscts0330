/**
 * @file all-tab-performance.test.ts
 * @description ALL 탭 성능 최적화 — FM 단위 격리 + 공정별 지연 로딩 테스트
 *
 * TDD Red Phase: 이 테스트가 실패하는 것을 먼저 확인 후 구현 시작
 *
 * @created 2026-03-01
 */

import { describe, it, expect } from 'vitest';
import type { ProcessedFMGroup } from
  '@/app/(fmea-core)/pfmea/worksheet/tabs/all/processFailureLinks';
import {
  expandFMGroupRows,
  buildFMOptCountKeys,
  buildProcessGroups,
} from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/fmGroupUtils';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 테스트 픽스처 (Fixtures)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** FM-A: 공정1, FE 2개 × FC 2개 (2행) */
const FM_A: ProcessedFMGroup = {
  fmId: 'fm-a',
  fmNo: 'M1',
  fmText: '고장형태A',
  fmRowSpan: 2,
  maxSeverity: 8,
  maxSeverityFeText: '효과A',
  l1ProductName: '완제품1',
  fmProcessNo: '1',
  fmProcessName: '공정1',
  fmProcessFunction: '기능1',
  fmProductChar: '특성1',
  fmProductCharSC: '',
  rows: [
    {
      feId: 'fe-a1', feText: '효과A1', feSeverity: 8,
      fcId: 'fc-a1', fcText: '원인A1',
      feRowSpan: 1, fcRowSpan: 1, isFirstRow: true,
      feCategory: '', feFunctionName: '', feRequirement: '',
      fcWorkFunction: '', fcProcessChar: '', fcProcessCharSC: '',
      fcM4: 'MN', fcWorkElem: '요소1',
    },
    {
      feId: 'fe-a2', feText: '효과A2', feSeverity: 6,
      fcId: 'fc-a2', fcText: '원인A2',
      feRowSpan: 1, fcRowSpan: 1, isFirstRow: false,
      feCategory: '', feFunctionName: '', feRequirement: '',
      fcWorkFunction: '', fcProcessChar: '', fcProcessCharSC: '',
      fcM4: 'MC', fcWorkElem: '요소2',
    },
  ],
};

/** FM-B: 공정1, FE 1개 × FC 1개 (1행) */
const FM_B: ProcessedFMGroup = {
  fmId: 'fm-b',
  fmNo: 'M2',
  fmText: '고장형태B',
  fmRowSpan: 1,
  maxSeverity: 5,
  maxSeverityFeText: '효과B',
  l1ProductName: '완제품1',
  fmProcessNo: '1',
  fmProcessName: '공정1',
  fmProcessFunction: '기능1',
  fmProductChar: '특성2',
  fmProductCharSC: '',
  rows: [
    {
      feId: 'fe-b1', feText: '효과B1', feSeverity: 5,
      fcId: 'fc-b1', fcText: '원인B1',
      feRowSpan: 1, fcRowSpan: 1, isFirstRow: true,
      feCategory: '', feFunctionName: '', feRequirement: '',
      fcWorkFunction: '', fcProcessChar: '', fcProcessCharSC: '',
      fcM4: 'MN', fcWorkElem: '요소3',
    },
  ],
};

/** FM-C: 공정2, FE 2개 × FC 1개 (FE 병합 — feRowSpan=2) */
const FM_C: ProcessedFMGroup = {
  fmId: 'fm-c',
  fmNo: 'M3',
  fmText: '고장형태C',
  fmRowSpan: 2,
  maxSeverity: 7,
  maxSeverityFeText: '효과C',
  l1ProductName: '완제품1',
  fmProcessNo: '2',
  fmProcessName: '공정2',
  fmProcessFunction: '기능2',
  fmProductChar: '특성3',
  fmProductCharSC: '',
  rows: [
    {
      feId: 'fe-c1', feText: '효과C1', feSeverity: 7,
      fcId: 'fc-c1', fcText: '원인C1',
      feRowSpan: 2, fcRowSpan: 1, isFirstRow: true,
      feCategory: '', feFunctionName: '', feRequirement: '',
      fcWorkFunction: '', fcProcessChar: '', fcProcessCharSC: '',
      fcM4: 'MC', fcWorkElem: '요소4',
    },
    {
      feId: 'fe-c1', feText: '효과C1', feSeverity: 7,
      fcId: 'fc-c2', fcText: '원인C2',
      feRowSpan: 0, fcRowSpan: 1, isFirstRow: false,
      feCategory: '', feFunctionName: '', feRequirement: '',
      fcWorkFunction: '', fcProcessChar: '', fcProcessCharSC: '',
      fcM4: 'IM', fcWorkElem: '요소5',
    },
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. expandFMGroupRows — FM 단위 행확장
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('expandFMGroupRows', () => {
  it('opt 없는 기본 FM — 행 수 = fmRowSpan', () => {
    const rows = expandFMGroupRows(FM_A, [1, 1]);
    expect(rows).toHaveLength(2);
    expect(rows[0].optIdx).toBe(0);
    expect(rows[0].optCount).toBe(1);
    expect(rows[1].optIdx).toBe(0);
    expect(rows[1].optCount).toBe(1);
  });

  it('FC-A1에 opt 2행 → 총 3행 (optIdx 0,1 + 기본행 1)', () => {
    const rows = expandFMGroupRows(FM_A, [2, 1]);
    expect(rows).toHaveLength(3);
    // FC-A1: optIdx=0, optIdx=1
    expect(rows[0]).toMatchObject({ optIdx: 0, optCount: 2, rowInFM: 0 });
    expect(rows[1]).toMatchObject({ optIdx: 1, optCount: 2, rowInFM: 0 });
    // FC-A2: optIdx=0
    expect(rows[2]).toMatchObject({ optIdx: 0, optCount: 1, rowInFM: 1 });
  });

  it('FC-A1 opt=3, FC-A2 opt=2 → 총 5행', () => {
    const rows = expandFMGroupRows(FM_A, [3, 2]);
    expect(rows).toHaveLength(5);
    // FC-A1: 3 rows
    expect(rows[0]).toMatchObject({ optIdx: 0, optCount: 3 });
    expect(rows[1]).toMatchObject({ optIdx: 1, optCount: 3 });
    expect(rows[2]).toMatchObject({ optIdx: 2, optCount: 3 });
    // FC-A2: 2 rows
    expect(rows[3]).toMatchObject({ optIdx: 0, optCount: 2 });
    expect(rows[4]).toMatchObject({ optIdx: 1, optCount: 2 });
  });

  it('adjusted fmRowSpan = sum(rowOptCounts)', () => {
    const rows = expandFMGroupRows(FM_A, [2, 1]);
    // fmRowSpan: 원래 2 + extra 1 = 3
    expect(rows[0].fmGroup.fmRowSpan).toBe(3);
  });

  it('FE 병합 rowSpan 보정 — feRowSpan=2인 FM에서 opt 추가', () => {
    // FM-C: feRowSpan=2 (FE 1개가 FC 2개를 병합)
    // fc-c1 opt=2, fc-c2 opt=1 → feRowSpan = 2+1 = 3
    const rows = expandFMGroupRows(FM_C, [2, 1]);
    expect(rows).toHaveLength(3);
    // 첫 행: feRowSpan = 3 (2 opt + 1 기본), fcRowSpan = 2 (opt 확장)
    expect(rows[0].row.feRowSpan).toBe(3);
    expect(rows[0].row.fcRowSpan).toBe(2);
    // 두 번째 행 (opt row): merged
    expect(rows[1].optIdx).toBe(1);
    // 세 번째 행: fc-c2, feRowSpan=0 (병합됨)
    expect(rows[2].row.feRowSpan).toBe(0);
    expect(rows[2].row.fcRowSpan).toBe(1);
  });

  it('isLastRowOfFM — 마지막 행만 true', () => {
    const rows = expandFMGroupRows(FM_A, [2, 1]);
    expect(rows[0].isLastRowOfFM).toBe(false);
    expect(rows[1].isLastRowOfFM).toBe(false);
    expect(rows[2].isLastRowOfFM).toBe(true);
  });

  it('merged 캐시 — 첫 행은 모두 false, 이후 행은 fmMerged=true', () => {
    const rows = expandFMGroupRows(FM_A, [1, 1]);
    expect(rows[0].merged).toEqual({ fe: false, fc: false, fm: false });
    // row 1: fm은 항상 merged (fmRowSpan>1)
    expect(rows[1].merged.fm).toBe(true);
  });

  it('baseFcRowSpan 보존 — 원본 fcRowSpan 유지', () => {
    const rows = expandFMGroupRows(FM_A, [2, 1]);
    // baseFcRowSpan = 원본 (1), adjusted fcRowSpan = 2 (opt 확장)
    expect(rows[0].baseFcRowSpan).toBe(1);
    expect(rows[0].row.fcRowSpan).toBe(2); // adjusted
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. buildFMOptCountKeys — FM별 opt 카운트 문자열
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('buildFMOptCountKeys', () => {
  it('opt 없으면 모든 FM의 키 = "1,1,..." 형태', () => {
    const map = buildFMOptCountKeys([FM_A, FM_B], {});
    expect(map.get('fm-a')).toBe('1,1');
    expect(map.get('fm-b')).toBe('1');
  });

  it('opt-rows 값 반영', () => {
    const rd = { 'opt-rows-fm-a-fc-a1': '3', 'opt-rows-fm-a-fc-a2': '2' };
    const map = buildFMOptCountKeys([FM_A, FM_B], rd);
    expect(map.get('fm-a')).toBe('3,2');
    expect(map.get('fm-b')).toBe('1'); // FM-B는 변경 없음
  });

  it('fcRowSpan=0인 행은 항상 1', () => {
    // FM-C: row[1].fcRowSpan=0 (병합됨)
    const rd = { 'opt-rows-fm-c-fc-c1': '2' };
    const map = buildFMOptCountKeys([FM_C], rd);
    expect(map.get('fm-c')).toBe('2,1'); // fc-c1=2, fc-c2(merged)=1
  });

  it('FM-A의 opt 변경이 FM-B 키에 영향 없음 (격리)', () => {
    const rd1 = {};
    const rd2 = { 'opt-rows-fm-a-fc-a1': '2' };
    const map1 = buildFMOptCountKeys([FM_A, FM_B], rd1);
    const map2 = buildFMOptCountKeys([FM_A, FM_B], rd2);
    // FM-A 변경
    expect(map1.get('fm-a')).not.toBe(map2.get('fm-a'));
    // FM-B 격리
    expect(map1.get('fm-b')).toBe(map2.get('fm-b'));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. buildProcessGroups — 공정별 그룹핑
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('buildProcessGroups', () => {
  it('동일 공정 FM들을 하나의 그룹으로 묶음', () => {
    const groups = buildProcessGroups([FM_A, FM_B, FM_C]);
    expect(groups).toHaveLength(2); // 공정1, 공정2
  });

  it('공정번호 순서 유지', () => {
    const groups = buildProcessGroups([FM_A, FM_B, FM_C]);
    expect(groups[0].processNo).toBe('1');
    expect(groups[1].processNo).toBe('2');
  });

  it('각 그룹에 올바른 FM이 포함됨', () => {
    const groups = buildProcessGroups([FM_A, FM_B, FM_C]);
    expect(groups[0].fmGroups).toHaveLength(2); // FM-A, FM-B (공정1)
    expect(groups[1].fmGroups).toHaveLength(1); // FM-C (공정2)
    expect(groups[0].fmGroups[0].fmId).toBe('fm-a');
    expect(groups[0].fmGroups[1].fmId).toBe('fm-b');
    expect(groups[1].fmGroups[0].fmId).toBe('fm-c');
  });

  it('estimatedHeight = sum(fmRowSpan × 22)', () => {
    const groups = buildProcessGroups([FM_A, FM_B, FM_C]);
    // 공정1: FM-A(2행) + FM-B(1행) = 3 × 22 = 66
    expect(groups[0].estimatedHeight).toBe(66);
    // 공정2: FM-C(2행) = 2 × 22 = 44
    expect(groups[1].estimatedHeight).toBe(44);
  });

  it('공정명 포함', () => {
    const groups = buildProcessGroups([FM_A, FM_B, FM_C]);
    expect(groups[0].processName).toBe('공정1');
    expect(groups[1].processName).toBe('공정2');
  });

  it('빈 배열 → 빈 결과', () => {
    const groups = buildProcessGroups([]);
    expect(groups).toHaveLength(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. 기존 tbodyRows와 동일 결과 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('기존 tbodyRows 로직과 동일 결과', () => {
  it('전체 FM 확장 행 수 = 기존 계산과 일치', () => {
    // FM-A: opt=[2,1] → 3행, FM-B: opt=[1] → 1행, FM-C: opt=[1,1] → 2행
    const rowsA = expandFMGroupRows(FM_A, [2, 1]);
    const rowsB = expandFMGroupRows(FM_B, [1]);
    const rowsC = expandFMGroupRows(FM_C, [1, 1]);
    const total = rowsA.length + rowsB.length + rowsC.length;
    expect(total).toBe(6); // 3 + 1 + 2
  });

  it('fmDividerStyle — 마지막 행에만 border 스타일 존재', () => {
    const rows = expandFMGroupRows(FM_A, [2, 1]);
    const lastRow = rows[rows.length - 1];
    const otherRows = rows.slice(0, -1);
    // 마지막 행: borderBottom 존재
    expect(lastRow.fmDividerStyle).toHaveProperty('borderBottom');
    // 나머지: 빈 객체
    for (const r of otherRows) {
      expect(Object.keys(r.fmDividerStyle)).toHaveLength(0);
    }
  });
});
