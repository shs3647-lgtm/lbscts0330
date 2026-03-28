/**
 * @file b2b3-completeness-guard.test.ts
 * @description B2/B3 완전성 검증 단위 테스트
 * - 자동모드 구조 임포트 시 B2/B3 누락 작업요소(B1) 차단 로직 검증
 * - 14개 시나리오: 정상, 부분누락, 전체누락, m4 null, 대소문자, 공백, 엣지케이스
 * @created 2026-02-20
 */

import { describe, test, expect } from 'vitest';
import {
  makeB2B3Key,
  filterB1ByCompleteness,
  type B2B3CheckItem,
} from '@/app/api/fmea/master-structure/b2b3-guard';

// ─── 테스트 헬퍼 ───

function mkB1(id: string, processNo: string, m4: string | null, value: string): B2B3CheckItem {
  return { id, processNo, m4, value };
}

function mkRef(processNo: string, m4: string | null): { processNo: string; m4: string | null } {
  return { processNo, m4 };
}

// ═══════════════════════════════════════
// 1. makeB2B3Key 함수 테스트
// ═══════════════════════════════════════

describe('makeB2B3Key', () => {
  test('1-1. 기본 키 생성: processNo + m4 조합', () => {
    expect(makeB2B3Key('10', 'MC')).toBe('10|MC');
    expect(makeB2B3Key('20', 'MN')).toBe('20|MN');
    expect(makeB2B3Key('30', 'IM')).toBe('30|IM');
  });

  test('1-2. m4 null/undefined → 빈문자열 처리', () => {
    expect(makeB2B3Key('10', null)).toBe('10|');
    expect(makeB2B3Key('10', undefined)).toBe('10|');
  });

  test('1-3. 앞뒤 공백 제거 (trim)', () => {
    expect(makeB2B3Key(' 10 ', ' MC ')).toBe('10|MC');
    expect(makeB2B3Key('  20  ', '  mn  ')).toBe('20|MN');
  });

  test('1-4. 대소문자 통일 (toUpperCase)', () => {
    expect(makeB2B3Key('10', 'mc')).toBe('10|MC');
    expect(makeB2B3Key('10', 'Mn')).toBe('10|MN');
    expect(makeB2B3Key('10', 'im')).toBe('10|IM');
    expect(makeB2B3Key('10', 'en')).toBe('10|EN');
  });

  test('1-5. 빈 processNo', () => {
    expect(makeB2B3Key('', 'MC')).toBe('|MC');
    expect(makeB2B3Key('', null)).toBe('|');
  });
});

// ═══════════════════════════════════════
// 2. filterB1ByCompleteness — 정상 케이스
// ═══════════════════════════════════════

describe('filterB1ByCompleteness — 정상 (B2+B3 모두 존재)', () => {
  test('2-1. B1/B2/B3 완전 매칭 → 전체 통과', () => {
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-1', '10', 'MC', 'CNC 절단기'),
      mkB1('b1-2', '20', 'MN', '용접공'),
      mkB1('b1-3', '20', 'MC', '용접 지그'),
    ];
    const b2Refs = [mkRef('10', 'MC'), mkRef('20', 'MN'), mkRef('20', 'MC')];
    const b3Refs = [mkRef('10', 'MC'), mkRef('20', 'MN'), mkRef('20', 'MC')];

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(3);
    expect(filtered).toBe(0);
  });

  test('2-2. 빈 B1 배열 → 빈 결과', () => {
    const { passed, filtered } = filterB1ByCompleteness([], [], []);
    expect(passed).toHaveLength(0);
    expect(filtered).toBe(0);
  });
});

// ═══════════════════════════════════════
// 3. filterB1ByCompleteness — B2 누락
// ═══════════════════════════════════════

describe('filterB1ByCompleteness — B2 누락', () => {
  test('3-1. B2 없는 B1 제외 (B3만 있음)', () => {
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-1', '10', 'MC', 'CNC 절단기'),
      mkB1('b1-2', '20', 'MN', '용접공'),
    ];
    // B2: 10-MC만 있음 (20-MN 누락)
    const b2Refs = [mkRef('10', 'MC')];
    const b3Refs = [mkRef('10', 'MC'), mkRef('20', 'MN')];

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(1);
    expect(passed[0].id).toBe('b1-1');
    expect(filtered).toBe(1);
  });

  test('3-2. B2 전체 누락 → B1 전체 제외', () => {
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-1', '10', 'MC', 'CNC 절단기'),
      mkB1('b1-2', '20', 'MN', '용접공'),
    ];
    const b2Refs: { processNo: string; m4: string | null }[] = [];
    const b3Refs = [mkRef('10', 'MC'), mkRef('20', 'MN')];

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(0);
    expect(filtered).toBe(2);
  });
});

// ═══════════════════════════════════════
// 4. filterB1ByCompleteness — B3 누락
// ═══════════════════════════════════════

describe('filterB1ByCompleteness — B3 누락', () => {
  test('4-1. B3 없는 B1 제외 (B2만 있음)', () => {
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-1', '10', 'MC', 'CNC 절단기'),
      mkB1('b1-2', '20', 'MN', '용접공'),
    ];
    const b2Refs = [mkRef('10', 'MC'), mkRef('20', 'MN')];
    // B3: 10-MC만 있음 (20-MN 누락)
    const b3Refs = [mkRef('10', 'MC')];

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(1);
    expect(passed[0].id).toBe('b1-1');
    expect(filtered).toBe(1);
  });

  test('4-2. B3 전체 누락 → B1 전체 제외', () => {
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-1', '10', 'MC', 'CNC 절단기'),
    ];
    const b2Refs = [mkRef('10', 'MC')];
    const b3Refs: { processNo: string; m4: string | null }[] = [];

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(0);
    expect(filtered).toBe(1);
  });
});

// ═══════════════════════════════════════
// 5. filterB1ByCompleteness — B2+B3 모두 누락
// ═══════════════════════════════════════

describe('filterB1ByCompleteness — B2+B3 모두 누락', () => {
  test('5-1. B2/B3 모두 없는 B1 제외', () => {
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-1', '10', 'MC', 'CNC 절단기'),
      mkB1('b1-2', '20', 'MN', '용접공'),
      mkB1('b1-3', '30', 'IM', '그리스'),
    ];
    // B2/B3: 10-MC만 완전, 20-MN과 30-IM은 둘 다 없음
    const b2Refs = [mkRef('10', 'MC')];
    const b3Refs = [mkRef('10', 'MC')];

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(1);
    expect(passed[0].id).toBe('b1-1');
    expect(filtered).toBe(2);
  });
});

// ═══════════════════════════════════════
// 6. 실전 시나리오 — 사고 재현 (process 50 설비 누락)
// ═══════════════════════════════════════

describe('filterB1ByCompleteness — 실전 사고 재현', () => {
  test('6-1. 전처리 공정(50) 설비 3건 B2/B3 누락 → 제외', () => {
    // 실제 사고: pfm26-t001-l05-r01, 공정50의 MC 3건에 B2/B3 없음
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-ok1', '10', 'MN', '작업자'),
      mkB1('b1-ok2', '10', 'MC', '프레스 기계'),
      mkB1('b1-ok3', '20', 'MN', '검사원'),
      mkB1('b1-bad1', '50', 'MC', '전처리 설비'),  // 누락
      mkB1('b1-bad2', '50', 'MC', '스프레이건'),    // 누락 (같은 processNo+m4)
      mkB1('b1-ok4', '50', 'MN', '작업자'),
    ];

    const b2Refs = [
      mkRef('10', 'MN'), mkRef('10', 'MC'),
      mkRef('20', 'MN'),
      mkRef('50', 'MN'),  // 50-MN은 있음
      // 50-MC는 없음!
    ];
    const b3Refs = [
      mkRef('10', 'MN'), mkRef('10', 'MC'),
      mkRef('20', 'MN'),
      mkRef('50', 'MN'),  // 50-MN은 있음
      // 50-MC는 없음!
    ];

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(4);   // ok1, ok2, ok3, ok4
    expect(filtered).toBe(2);          // bad1, bad2 제외
    // 제외된 항목 확인
    const passedIds = passed.map(p => p.id);
    expect(passedIds).not.toContain('b1-bad1');
    expect(passedIds).not.toContain('b1-bad2');
    expect(passedIds).toContain('b1-ok4'); // 50-MN은 통과
  });

  test('6-2. 신너(희석제) IM B2 누락 → 제외', () => {
    // 실제 사고: pfm26-p001-l01, 신너(희석제) IM에 B2 없음
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-ok', '30', 'MC', '도장설비'),
      mkB1('b1-bad', '30', 'IM', '신너(희석제)'),
    ];
    const b2Refs = [mkRef('30', 'MC')]; // IM의 B2 없음
    const b3Refs = [mkRef('30', 'MC'), mkRef('30', 'IM')]; // IM의 B3은 있음

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(1);
    expect(passed[0].id).toBe('b1-ok');
    expect(filtered).toBe(1);
  });
});

// ═══════════════════════════════════════
// 7. 엣지케이스 — m4 대소문자/공백 정규화
// ═══════════════════════════════════════

describe('filterB1ByCompleteness — 대소문자/공백 정규화', () => {
  test('7-1. B1 m4="mc", B2 m4="MC" → 매칭 성공 (대소문자 무시)', () => {
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-1', '10', 'mc', '작업요소'),
    ];
    const b2Refs = [mkRef('10', 'MC')];
    const b3Refs = [mkRef('10', 'MC')];

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(1);
    expect(filtered).toBe(0);
  });

  test('7-2. processNo 앞뒤 공백 → 정규화 매칭', () => {
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-1', ' 10 ', 'MC', '작업요소'),
    ];
    const b2Refs = [mkRef('10', 'MC')];
    const b3Refs = [mkRef('10', 'MC')];

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(1);
    expect(filtered).toBe(0);
  });

  test('7-3. m4=null인 B1, B2/B3도 m4=null → 매칭 성공', () => {
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-1', '10', null, '작업요소'),
    ];
    const b2Refs = [mkRef('10', null)];
    const b3Refs = [mkRef('10', null)];

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(1);
    expect(filtered).toBe(0);
  });

  test('7-4. m4=null B1 vs m4="MC" B2/B3 → 매칭 실패 (null≠MC)', () => {
    const b1Items: B2B3CheckItem[] = [
      mkB1('b1-1', '10', null, '작업요소'),
    ];
    const b2Refs = [mkRef('10', 'MC')];
    const b3Refs = [mkRef('10', 'MC')];

    const { passed, filtered } = filterB1ByCompleteness(b1Items, b2Refs, b3Refs);
    expect(passed).toHaveLength(0);
    expect(filtered).toBe(1);
  });
});
