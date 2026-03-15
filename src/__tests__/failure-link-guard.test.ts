/**
 * @file failure-link-guard.test.ts
 * @description FailureLinks 3중 보호 자동화 테스트
 *
 * 검증 대상:
 * 1. preserveFailureLinks — 빈 배열 POST 시 기존 링크 보존
 * 2. filterValidLinks — FK 검증 필터
 * 3. computeCompletenessScore — 후보 가중치 (failureLinks +100)
 *
 * @created 2026-02-24
 */

import { describe, it, expect } from 'vitest';
import {
  preserveFailureLinks,
  filterValidLinks,
  computeCompletenessScore,
} from '@/lib/failure-link-utils';

// ─── 테스트 헬퍼 ───

let _uid = 0;
function uid(): string { return `test_${++_uid}`; }

function makeLink(overrides: Record<string, unknown> = {}) {
  return { id: uid(), fmId: uid(), feId: uid(), fcId: uid(), fmText: 'FM', feText: 'FE', fcText: 'FC', ...overrides };
}

// ─── 1. POST 빈 배열 보존 ───

describe('preserveFailureLinks — 빈 배열 POST 보존', () => {
  it('빈 incoming + 기존 5개 → 기존 5개 유지', () => {
    const existing = [makeLink(), makeLink(), makeLink(), makeLink(), makeLink()];
    const result = preserveFailureLinks([], existing);
    expect(result).toBe(existing); // 참조 동일 (복사 아님)
    expect(result.length).toBe(5);
  });

  it('비어있지 않은 incoming → incoming 그대로', () => {
    const incoming = [makeLink(), makeLink()];
    const existing = [makeLink(), makeLink(), makeLink()];
    const result = preserveFailureLinks(incoming, existing);
    expect(result).toBe(incoming);
    expect(result.length).toBe(2);
  });

  it('둘 다 비어있으면 빈 배열 반환', () => {
    const result = preserveFailureLinks([], []);
    expect(result.length).toBe(0);
  });

  it('incoming 1개 + existing 0개 → incoming 반환', () => {
    const incoming = [makeLink()];
    const result = preserveFailureLinks(incoming, []);
    expect(result).toBe(incoming);
    expect(result.length).toBe(1);
  });
});

// ─── 2. FK 검증 필터 ───

describe('filterValidLinks — FK 검증 필터', () => {
  it('유효한 fmId/feId/fcId 조합만 통과', () => {
    const fmIds = new Set(['fm1', 'fm2']);
    const feIds = new Set(['fe1']);
    const fcIds = new Set(['fc1', 'fc2']);

    const links = [
      { fmId: 'fm1', feId: 'fe1', fcId: 'fc1' },  // valid
      { fmId: 'fm2', feId: 'fe1', fcId: 'fc2' },  // valid
      { fmId: 'fm3', feId: 'fe1', fcId: 'fc1' },  // invalid fmId
      { fmId: 'fm1', feId: 'fe2', fcId: 'fc1' },  // invalid feId
      { fmId: 'fm1', feId: 'fe1', fcId: 'fc3' },  // invalid fcId
    ];

    const { valid, dropped } = filterValidLinks(links, fmIds, feIds, fcIds);
    expect(valid.length).toBe(2);
    expect(dropped).toBe(3);
  });

  it('빈 ID 필드가 있는 링크 제외 (feId는 선택적)', () => {
    const fmIds = new Set(['fm1']);
    const feIds = new Set(['fe1']);
    const fcIds = new Set(['fc1']);

    const links = [
      { fmId: '', feId: 'fe1', fcId: 'fc1' },     // empty fmId → 제외
      { fmId: 'fm1', feId: '', fcId: 'fc1' },      // empty feId → 허용 (FMEA 표준: FE 선택적)
      { fmId: 'fm1', feId: 'fe1', fcId: '' },      // empty fcId → 제외
      { fmId: 'fm1', feId: 'fe1', fcId: 'fc1' },   // valid
    ];

    const { valid, dropped, feIdEmpty } = filterValidLinks(links, fmIds, feIds, fcIds);
    expect(valid.length).toBe(2);  // feId 빈 링크 + 완전 유효 링크
    expect(dropped).toBe(2);       // empty fmId + empty fcId
    expect(feIdEmpty).toBe(1);     // feId 미지정 1건
  });

  it('모든 링크가 유효하면 dropped=0', () => {
    const fmIds = new Set(['fm1']);
    const feIds = new Set(['fe1']);
    const fcIds = new Set(['fc1']);

    const links = [
      { fmId: 'fm1', feId: 'fe1', fcId: 'fc1' },
      { fmId: 'fm1', feId: 'fe1', fcId: 'fc1' },
    ];

    const { valid, dropped } = filterValidLinks(links, fmIds, feIds, fcIds);
    expect(valid.length).toBe(2);
    expect(dropped).toBe(0);
  });

  it('빈 배열 입력 시 빈 결과', () => {
    const { valid, dropped } = filterValidLinks([], new Set(), new Set(), new Set());
    expect(valid.length).toBe(0);
    expect(dropped).toBe(0);
  });

  it('undefined ID 필드도 제외', () => {
    const links = [
      { fmId: undefined, feId: 'fe1', fcId: 'fc1' },
    ];
    const { valid } = filterValidLinks(links as any, new Set(), new Set(['fe1']), new Set(['fc1']));
    expect(valid.length).toBe(0);
  });
});

// ─── 3. 후보 가중치 ───

describe('computeCompletenessScore — 후보 가중치', () => {
  it('failureLinks 있는 후보 > 없는 후보 (최소 100점 차이)', () => {
    const withLinks = { failureLinks: [makeLink()] };
    const withoutLinks = { failureLinks: [] };

    const scoreWith = computeCompletenessScore(withLinks);
    const scoreWithout = computeCompletenessScore(withoutLinks);

    expect(scoreWith).toBeGreaterThan(scoreWithout);
    expect(scoreWith - scoreWithout).toBeGreaterThanOrEqual(100);
  });

  it('L1 이름 있으면 +50', () => {
    const withName = { l1: { name: '완제품' } };
    const withoutName = { l1: { name: '' } };

    expect(computeCompletenessScore(withName) - computeCompletenessScore(withoutName)).toBe(50);
  });

  it('L2 공정 있으면 공정 수 × 20', () => {
    const twoProcs = { l2: [{ name: '공정1' }, { name: '공정2' }] };
    const noProcs = { l2: [] };

    expect(computeCompletenessScore(twoProcs) - computeCompletenessScore(noProcs)).toBe(40);
  });

  it('빈 후보(null/undefined)는 점수 0', () => {
    expect(computeCompletenessScore(null)).toBe(0);
    expect(computeCompletenessScore(undefined)).toBe(0);
    expect(computeCompletenessScore({})).toBe(0);
  });

  it('FM+FC 각 2점, FE 2점', () => {
    const withFMFC = {
      l2: [{
        name: 'P1',
        failureModes: [{ id: '1' }, { id: '2' }],
        failureCauses: [{ id: '3' }],
      }],
      l1: { failureScopes: [{ id: '4' }] },
    };
    // FM 2개 × 2 + FC 1개 × 2 + FE 1개 × 2 + 공정 1개 × 20 = 28
    const base = computeCompletenessScore({ l2: [{ name: 'P1' }] }); // 공정만
    expect(computeCompletenessScore(withFMFC) - base).toBe(8); // (2+1)*2 + 1*2
  });

  it('복합 시나리오: 모든 요소 포함', () => {
    const full = {
      l1: {
        name: '완제품',
        functions: [{ id: 'f1' }],
        failureScopes: [{ id: 'fs1' }, { id: 'fs2' }],
      },
      l2: [{
        name: '공정1', no: '10',
        l3: [{ functions: [{ id: 'l3f1' }] }],
        functions: [{ id: 'l2f1' }],
        failureModes: [{ id: 'fm1' }],
        failureCauses: [{ id: 'fc1' }],
      }],
      failureLinks: [{ id: 'link1' }],
    };
    const score = computeCompletenessScore(full);
    // L1 name: 50 + L2 proc: 20 + L3 count: 5 + L1 func: 10 + L2 func: 10
    // + L3 func: 5 + (FM+FC): 4 + FE: 4 + links: 100 = 208
    expect(score).toBe(208);
  });
});
