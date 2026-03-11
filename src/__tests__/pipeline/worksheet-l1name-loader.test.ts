/**
 * @file worksheet-l1name-loader.test.ts
 * @description useWorksheetDataLoader의 ensureL1Types + projectL1Name 적용 로직 검증
 *
 * 수정 배경 (커밋 1289cf4a):
 *   projectL1Name이 있으면 기존 l1.name을 덮어쓰는 로직이 추가됨.
 *   기존 데이터가 placeholder인 경우만 덮어쓰는 것이 아니라,
 *   등록정보 partName 기반 projectL1Name을 항상 우선 적용.
 *
 * 검증 항목:
 *   1. ensureL1Types — projectL1Name이 있으면 우선 적용
 *   2. ensureL1Types — projectL1Name이 없으면 기존 name 유지
 *   3. ensureL1Types — l1이 null이면 초기 상태 생성
 *   4. ensureL1Types — types가 비어있으면 기본 3개(YP/SP/USER) 자동 생성
 *   5. ensureL1Types — types가 있으면 types 유지
 *   6. placeholder 감지 로직 정확성
 *   7. failureLinks 폴백 — 선택 후보에 없으면 dbLegacy에서 복원
 *   8. placeholder 공정 정리 — 실제 공정 있으면 placeholder 제거
 *
 * @created 2026-03-10
 */

import { describe, it, expect } from 'vitest';

// useWorksheetDataLoader.ts:222-246 ensureL1Types 로직 재현
function ensureL1Types(
  l1: { name?: string; types?: any[]; failureScopes?: any[] } | null,
  projectL1Name: string,
): { name: string; types: any[]; failureScopes: any[] } {
  const createInitialL1 = () => ({ name: '', types: [], failureScopes: [] });

  if (!l1) return { ...createInitialL1(), name: projectL1Name };

  const currentName = l1.name || '';
  const isPlaceholder = !currentName || currentName.includes('입력') || currentName.trim() === '';
  const finalL1Name = projectL1Name || (isPlaceholder ? '' : currentName);

  const types = l1.types || [];
  if (types.length === 0) {
    const ts = Date.now();
    return {
      ...l1,
      name: finalL1Name,
      types: [
        { id: `type-${ts}-yp`, name: 'YP', functions: [{ id: `func-${ts}-yp`, name: '', requirements: [] }] },
        { id: `type-${ts}-sp`, name: 'SP', functions: [{ id: `func-${ts}-sp`, name: '', requirements: [] }] },
        { id: `type-${ts}-user`, name: 'USER', functions: [{ id: `func-${ts}-user`, name: '', requirements: [] }] },
      ],
      failureScopes: l1.failureScopes || [],
    };
  }

  return { ...l1, name: finalL1Name, types, failureScopes: l1.failureScopes || [] };
}

// useWorksheetDataLoader.ts:294-301 placeholder 공정 정리 로직 재현
function cleanPlaceholderProcesses(l2: Array<{ name?: string }>): Array<{ name?: string }> {
  const realProcesses = l2.filter(p => {
    const n = (p.name || '').trim();
    return n && !n.includes('클릭하여') && !n.includes('공정 선택');
  });
  if (realProcesses.length > 0 && realProcesses.length < l2.length) {
    return realProcesses;
  }
  return l2;
}

// ---- ensureL1Types 테스트 ----

describe('ensureL1Types — projectL1Name 적용 로직', () => {
  it('1. projectL1Name이 있으면 우선 적용 (기존 name 덮어쓰기)', () => {
    const l1 = { name: '기존이름', types: [{ id: 't1', name: 'YP', functions: [] }], failureScopes: [] };
    const result = ensureL1Types(l1, '등록정보이름');
    expect(result.name).toBe('등록정보이름');
  });

  it('2. projectL1Name이 없고 기존 name이 있으면 기존 name 유지', () => {
    const l1 = { name: '커스텀이름', types: [{ id: 't1', name: 'YP', functions: [] }], failureScopes: [] };
    const result = ensureL1Types(l1, '');
    expect(result.name).toBe('커스텀이름');
  });

  it('3. projectL1Name이 없고 기존 name이 placeholder → 빈 문자열', () => {
    const l1 = { name: '', types: [{ id: 't1', name: 'YP', functions: [] }], failureScopes: [] };
    const result = ensureL1Types(l1, '');
    expect(result.name).toBe('');
  });

  it('4. projectL1Name이 없고 기존 name에 "입력" 포함 → placeholder로 판단', () => {
    const l1 = { name: '여기에 입력하세요', types: [{ id: 't1', name: 'YP', functions: [] }], failureScopes: [] };
    const result = ensureL1Types(l1, '');
    expect(result.name).toBe('');
  });

  it('5. l1이 null → 초기 상태 생성 + projectL1Name 적용', () => {
    const result = ensureL1Types(null, '신규품명');
    expect(result.name).toBe('신규품명');
    expect(result.types).toEqual([]);
    expect(result.failureScopes).toEqual([]);
  });

  it('6. l1이 null + projectL1Name 없음 → name 빈 문자열', () => {
    const result = ensureL1Types(null, '');
    expect(result.name).toBe('');
  });

  it('7. types가 비어있으면 기본 3개(YP/SP/USER) 자동 생성', () => {
    const l1 = { name: '품명', types: [], failureScopes: [] };
    const result = ensureL1Types(l1, '등록품명');
    expect(result.types).toHaveLength(3);
    expect(result.types[0].name).toBe('YP');
    expect(result.types[1].name).toBe('SP');
    expect(result.types[2].name).toBe('USER');
    // 각 타입에 placeholder 함수 1개
    expect(result.types[0].functions).toHaveLength(1);
    expect(result.types[0].functions[0].name).toBe('');
  });

  it('8. types가 있으면 types 유지 (덮어쓰기 안 함)', () => {
    const existingTypes = [
      { id: 't1', name: 'YP', functions: [{ id: 'f1', name: '기능1', requirements: [] }] },
    ];
    const l1 = { name: '품명', types: existingTypes, failureScopes: [] };
    const result = ensureL1Types(l1, '등록품명');
    expect(result.types).toBe(existingTypes); // 동일 참조
    expect(result.types[0].functions[0].name).toBe('기능1');
  });

  it('9. failureScopes 보존', () => {
    const scopes = [{ id: 's1', scope: '안전', effects: [] }];
    const l1 = { name: '품명', types: [{ id: 't1', name: 'YP', functions: [] }], failureScopes: scopes };
    const result = ensureL1Types(l1, '등록품명');
    expect(result.failureScopes).toBe(scopes);
  });

  it('10. projectL1Name으로 name 업데이트해도 원본 l1 불변', () => {
    const l1 = { name: '원본', types: [{ id: 't1', name: 'YP', functions: [] }], failureScopes: [] };
    const result = ensureL1Types(l1, '새이름');
    expect(result.name).toBe('새이름');
    expect(l1.name).toBe('원본'); // 원본 불변
  });
});

// ---- placeholder 공정 정리 테스트 ----

describe('placeholder 공정 정리', () => {
  it('1. placeholder만 있으면 그대로 유지 (전부 삭제하면 안 됨)', () => {
    const l2 = [{ name: '(클릭하여 공정 선택)' }];
    expect(cleanPlaceholderProcesses(l2)).toEqual(l2);
  });

  it('2. 실제 공정 + placeholder 혼합 → placeholder만 제거', () => {
    const l2 = [
      { name: '10번 드릴링' },
      { name: '(클릭하여 공정 선택)' },
      { name: '20번 탭핑' },
    ];
    const result = cleanPlaceholderProcesses(l2);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('10번 드릴링');
    expect(result[1].name).toBe('20번 탭핑');
  });

  it('3. 실제 공정만 있으면 그대로 유지', () => {
    const l2 = [{ name: '10번 드릴링' }, { name: '20번 탭핑' }];
    expect(cleanPlaceholderProcesses(l2)).toBe(l2); // 동일 참조
  });

  it('4. 빈 이름은 placeholder로 취급', () => {
    const l2 = [
      { name: '10번 드릴링' },
      { name: '' },
    ];
    const result = cleanPlaceholderProcesses(l2);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('10번 드릴링');
  });

  it('5. 빈 배열 → 빈 배열', () => {
    expect(cleanPlaceholderProcesses([])).toEqual([]);
  });
});

// ---- failureLinks 폴백 로직 테스트 ----

describe('failureLinks 폴백 — dbLegacy에서 복원', () => {
  function applyFailureLinksFallback(
    stateLinks: any[] | undefined,
    dbLegacyLinks: any[] | undefined,
  ): any[] {
    const links = stateLinks || [];
    if (links.length === 0 && dbLegacyLinks && dbLegacyLinks.length > 0) {
      return dbLegacyLinks;
    }
    return links;
  }

  it('1. state에 links가 있으면 그대로 사용', () => {
    const stateLinks = [{ id: 'l1', fmId: 'fm1', feId: 'fe1', fcId: 'fc1' }];
    const dbLinks = [{ id: 'l2', fmId: 'fm2', feId: 'fe2', fcId: 'fc2' }];
    expect(applyFailureLinksFallback(stateLinks, dbLinks)).toBe(stateLinks);
  });

  it('2. state에 links가 비어있고 dbLegacy에 있으면 dbLegacy 복원', () => {
    const dbLinks = [{ id: 'l2', fmId: 'fm2', feId: 'fe2', fcId: 'fc2' }];
    expect(applyFailureLinksFallback([], dbLinks)).toBe(dbLinks);
  });

  it('3. 둘 다 비어있으면 빈 배열', () => {
    expect(applyFailureLinksFallback([], [])).toEqual([]);
  });

  it('4. state undefined + dbLegacy 있으면 dbLegacy 복원', () => {
    const dbLinks = [{ id: 'l2' }];
    expect(applyFailureLinksFallback(undefined, dbLinks)).toBe(dbLinks);
  });

  it('5. state undefined + dbLegacy undefined → 빈 배열', () => {
    expect(applyFailureLinksFallback(undefined, undefined)).toEqual([]);
  });
});
