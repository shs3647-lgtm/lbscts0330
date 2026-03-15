/**
 * @file parentItemId UUID 매핑 테스트
 * @description excelRow+rowSpan 기반 inferParent + FC chain 기반 매핑 검증
 * TDD RED 단계: 이 테스트가 먼저 실패해야 한다
 */
import { describe, it, expect } from 'vitest';
import {
  inferParent,
  assignParentsByRowSpan,
  buildParentMapFromChains,
} from '../../app/(fmea-core)/pfmea/import/utils/parentItemId-mapper';

// ── inferParent 단위 테스트 ──
describe('inferParent — 단일 자식의 부모 찾기', () => {
  const parents = [
    { id: 'a3-0', excelRow: 5, rowSpan: 3 },   // 행 5~7
    { id: 'a3-1', excelRow: 8, rowSpan: 2 },   // 행 8~9
    { id: 'a3-2', excelRow: 10, rowSpan: 1 },  // 행 10
  ];

  it('자식 excelRow=5 → 부모 a3-0 (범위 5~7)', () => {
    expect(inferParent(5, parents)).toBe('a3-0');
  });

  it('자식 excelRow=7 → 부모 a3-0 (범위 5~7)', () => {
    expect(inferParent(7, parents)).toBe('a3-0');
  });

  it('자식 excelRow=8 → 부모 a3-1 (범위 8~9)', () => {
    expect(inferParent(8, parents)).toBe('a3-1');
  });

  it('자식 excelRow=10 → 부모 a3-2 (rowSpan=1, 행 10 정확히)', () => {
    expect(inferParent(10, parents)).toBe('a3-2');
  });

  it('범위 밖 excelRow=4 → undefined', () => {
    expect(inferParent(4, parents)).toBeUndefined();
  });

  it('범위 밖 excelRow=11 → undefined', () => {
    expect(inferParent(11, parents)).toBeUndefined();
  });

  it('부모 배열이 비면 undefined', () => {
    expect(inferParent(5, [])).toBeUndefined();
  });
});

// ── assignParentsByRowSpan 통합 테스트 ──
describe('assignParentsByRowSpan — 같은 공정 내 excelRow+rowSpan 기반 매핑', () => {
  it('A3→A4: A3 1개 rowSpan=3 → A4 3개 모두 해당 A3에 매핑', () => {
    const parents = [
      { id: 'a3-uuid-0', processNo: '10', excelRow: 5, rowSpan: 3 },
    ];
    const children = [
      { id: 'a4-0', processNo: '10', excelRow: 5 },
      { id: 'a4-1', processNo: '10', excelRow: 6 },
      { id: 'a4-2', processNo: '10', excelRow: 7 },
    ];

    const result = assignParentsByRowSpan(parents, children);

    expect(result.get('a4-0')).toBe('a3-uuid-0');
    expect(result.get('a4-1')).toBe('a3-uuid-0');
    expect(result.get('a4-2')).toBe('a3-uuid-0');
  });

  it('A3 2개 → A4 5개 — 다음 A3 시작행부터 새 부모로 전환', () => {
    const parents = [
      { id: 'a3-uuid-0', processNo: '10', excelRow: 5, rowSpan: 3 },  // 행 5~7
      { id: 'a3-uuid-1', processNo: '10', excelRow: 8, rowSpan: 2 },  // 행 8~9
    ];
    const children = [
      { id: 'a4-0', processNo: '10', excelRow: 5 },
      { id: 'a4-1', processNo: '10', excelRow: 6 },
      { id: 'a4-2', processNo: '10', excelRow: 7 },
      { id: 'a4-3', processNo: '10', excelRow: 8 },
      { id: 'a4-4', processNo: '10', excelRow: 9 },
    ];

    const result = assignParentsByRowSpan(parents, children);

    expect(result.get('a4-0')).toBe('a3-uuid-0');
    expect(result.get('a4-1')).toBe('a3-uuid-0');
    expect(result.get('a4-2')).toBe('a3-uuid-0');
    expect(result.get('a4-3')).toBe('a3-uuid-1');
    expect(result.get('a4-4')).toBe('a3-uuid-1');
  });

  it('공정번호 경계 — 다른 공정의 부모에 매핑되지 않음', () => {
    const parents = [
      { id: 'a3-p10', processNo: '10', excelRow: 5, rowSpan: 2 },
      { id: 'a3-p20', processNo: '20', excelRow: 10, rowSpan: 2 },
    ];
    const children = [
      { id: 'a4-p10', processNo: '10', excelRow: 5 },
      { id: 'a4-p20', processNo: '20', excelRow: 10 },
      { id: 'a4-p20-b', processNo: '20', excelRow: 11 },
    ];

    const result = assignParentsByRowSpan(parents, children);

    expect(result.get('a4-p10')).toBe('a3-p10');
    expect(result.get('a4-p20')).toBe('a3-p20');
    expect(result.get('a4-p20-b')).toBe('a3-p20');
  });

  it('rowSpan 미지정(undefined) 부모 → rowSpan=1로 처리', () => {
    const parents = [
      { id: 'p0', processNo: '10', excelRow: 5, rowSpan: undefined },
      { id: 'p1', processNo: '10', excelRow: 6, rowSpan: undefined },
    ];
    const children = [
      { id: 'c0', processNo: '10', excelRow: 5 },
      { id: 'c1', processNo: '10', excelRow: 6 },
    ];

    const result = assignParentsByRowSpan(parents, children);

    expect(result.get('c0')).toBe('p0');
    expect(result.get('c1')).toBe('p1');
  });

  it('부모 미발견 자식 → Map에 포함되지 않음 (throw 금지)', () => {
    const parents = [
      { id: 'p0', processNo: '10', excelRow: 5, rowSpan: 2 },
    ];
    const children = [
      { id: 'c0', processNo: '10', excelRow: 5 },    // 매핑됨
      { id: 'c-orphan', processNo: '10', excelRow: 99 }, // 범위 밖
    ];

    const result = assignParentsByRowSpan(parents, children);

    expect(result.get('c0')).toBe('p0');
    expect(result.has('c-orphan')).toBe(false);  // 에러 없이 미포함
  });

  it('excelRow 없는 자식 → Map에 포함되지 않음', () => {
    const parents = [
      { id: 'p0', processNo: '10', excelRow: 5, rowSpan: 3 },
    ];
    const children = [
      { id: 'c-no-row', processNo: '10', excelRow: undefined },
    ];

    const result = assignParentsByRowSpan(parents, children);

    expect(result.has('c-no-row')).toBe(false);
  });
});

// ── buildParentMapFromChains — FC chain 기반 매핑 ──
describe('buildParentMapFromChains — FC chain 기반 부모-자식 매핑', () => {
  const chains = [
    { processNo: '10', l2Function: '용접', productChar: '강도', failureMode: 'FM1', failureCause: 'FC1', pcValue: 'PC1', dcValue: 'DC1' },
    { processNo: '10', l2Function: '용접', productChar: '위치', failureMode: 'FM2', failureCause: 'FC2', pcValue: 'PC2', dcValue: 'DC2' },
    { processNo: '10', l2Function: '검사', productChar: '정확도', failureMode: 'FM3', failureCause: 'FC3', pcValue: 'PC3', dcValue: 'DC3' },
    { processNo: '20', l2Function: '세척', productChar: '청정도', failureMode: 'FM4', failureCause: 'FC4', pcValue: 'PC4', dcValue: 'DC4' },
  ];

  it('A4→A3 매핑: productChar → l2Function', () => {
    const map = buildParentMapFromChains(chains);

    expect(map.a4ToA3.get('10|강도')).toBe('10|용접');
    expect(map.a4ToA3.get('10|위치')).toBe('10|용접');
    expect(map.a4ToA3.get('10|정확도')).toBe('10|검사');
    expect(map.a4ToA3.get('20|청정도')).toBe('20|세척');
  });

  it('A5→A4 매핑: failureMode → productChar', () => {
    const map = buildParentMapFromChains(chains);

    expect(map.a5ToA4.get('10|FM1')).toBe('10|강도');
    expect(map.a5ToA4.get('10|FM2')).toBe('10|위치');
    expect(map.a5ToA4.get('10|FM3')).toBe('10|정확도');
  });

  it('A6→A5 매핑: dcValue → failureMode', () => {
    const map = buildParentMapFromChains(chains);

    expect(map.a6ToA5.get('10|DC1')).toBe('10|FM1');
    expect(map.a6ToA5.get('10|DC2')).toBe('10|FM2');
  });

  it('B5→B4 매핑: pcValue → failureCause', () => {
    const map = buildParentMapFromChains(chains);

    expect(map.b5ToB4.get('10|PC1')).toBe('10|FC1');
    expect(map.b5ToB4.get('10|PC2')).toBe('10|FC2');
  });

  it('빈 chain → 빈 Map', () => {
    const map = buildParentMapFromChains([]);
    expect(map.a4ToA3.size).toBe(0);
    expect(map.a5ToA4.size).toBe(0);
    expect(map.a6ToA5.size).toBe(0);
    expect(map.b5ToB4.size).toBe(0);
  });

  it('중복 chain 행은 첫 번째 매핑 유지', () => {
    const dupChains = [
      { processNo: '10', l2Function: '용접', productChar: '강도', failureMode: 'FM1', failureCause: 'FC1', pcValue: 'PC1', dcValue: 'DC1' },
      { processNo: '10', l2Function: '검사', productChar: '강도', failureMode: 'FM1', failureCause: 'FC1', pcValue: 'PC1', dcValue: 'DC1' },
    ];
    const map = buildParentMapFromChains(dupChains);

    expect(map.a4ToA3.get('10|강도')).toBe('10|용접');
  });
});
