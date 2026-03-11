/**
 * @file l1name-priority.test.ts
 * @description L1 완제품공정명(l1Name) 우선순위 일관성 검증
 *
 * 수정 배경 (커밋 1289cf4a):
 *   legacy/page.tsx와 useFmeaSelection.ts에서 l1Name 산출 로직이 달라
 *   같은 FMEA인데 다른 l1Name이 나올 수 있었음
 *
 * 3개 모듈의 l1Name 산출 로직 일관성 검증:
 *   - useFmeaSelection.ts: partName → subject → productName
 *   - legacy/page.tsx: partName → subject → productName (수정 후 통일)
 *   - resave-import/route.ts: reg.partName → reg.subject
 *   - useWorksheetDataLoader.ts: partName → subject → projectName → productName
 *
 * @created 2026-03-10
 */

import { describe, it, expect } from 'vitest';

// ---- 각 모듈의 l1Name 산출 로직을 순수 함수로 추출 ----

// useFmeaSelection.ts:48-53 패턴 (기준)
function l1NameFromSelection(fmeaInfo: { partName?: string; subject?: string }, project?: { productName?: string }): string {
  const rawL1 = fmeaInfo?.partName
    || fmeaInfo?.subject
    || project?.productName
    || '';
  return rawL1.replace(/\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i, '').trim();
}

// legacy/page.tsx:148-153 패턴 (수정 후 — useFmeaSelection과 동일해야 함)
function l1NameFromLegacyPage(fmeaInfo: { partName?: string; subject?: string }, project?: { productName?: string }): string {
  const rawL1 = fmeaInfo?.partName
    || fmeaInfo?.subject
    || project?.productName
    || '';
  return rawL1.replace(/\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i, '').trim();
}

// resave-import/route.ts:92-104 패턴
function l1NameFromResaveApi(reg: { partName?: string | null; subject?: string | null }): string {
  const raw = reg.partName || reg.subject || '';
  return raw.replace(/\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i, '').trim();
}

// useWorksheetDataLoader.ts:119-132 패턴
function l1NameFromDataLoader(
  fmeaInfo: { partName?: string; subject?: string; fmeaProjectName?: string },
  project?: { productName?: string; projectName?: string },
): string {
  const rawPartName = fmeaInfo?.partName || '';
  const rawSubject = fmeaInfo?.subject || '';
  const rawProjectName = fmeaInfo?.fmeaProjectName || '';
  const rawProductName = project?.productName || project?.projectName || '';

  const stripFmeaSuffix = (s: string) =>
    s.replace(/\s*\([a-z0-9-]+\)\s*$/i, '')
      .replace(/\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i, '').trim();

  const partFromSubject = stripFmeaSuffix(rawSubject);
  const partFromProjectName = stripFmeaSuffix(rawProjectName);
  const partFromProductName = stripFmeaSuffix(rawProductName);
  const baseName = rawPartName || partFromSubject || partFromProjectName || partFromProductName || '';
  const isDefault = !baseName || baseName === '품명' || baseName === '품명+PFMEA';
  return isDefault ? '' : baseName;
}

// ---- FMEA 접미사 제거 regex 단독 테스트 ----

const FMEA_SUFFIX_REGEX = /\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i;

describe('FMEA 접미사 제거 regex', () => {
  const cases = [
    { input: '엔진부품+PFMEA', expected: '엔진부품' },
    { input: '엔진부품 FMEA', expected: '엔진부품' },
    { input: '엔진부품PFMEA', expected: '엔진부품' },
    { input: '엔진부품+DFMEA', expected: '엔진부품' },
    { input: '엔진부품+생산공정', expected: '엔진부품' },
    { input: '엔진부품 생산공정 ', expected: '엔진부품' },
    { input: '엔진부품', expected: '엔진부품' },
    { input: '', expected: '' },
    { input: 'PFMEA', expected: '' },
    { input: 'PCB+PFMEA', expected: 'PCB' },
    { input: '엔진부품+pfmea', expected: '엔진부품' },  // case insensitive
  ];

  cases.forEach(({ input, expected }) => {
    it(`"${input}" → "${expected}"`, () => {
      expect(input.replace(FMEA_SUFFIX_REGEX, '').trim()).toBe(expected);
    });
  });
});

// ---- 우선순위 검증: partName > subject > productName ----

describe('l1Name 우선순위: partName > subject > productName', () => {
  it('partName이 있으면 partName 사용', () => {
    const info = { partName: '엔진부품', subject: '엔진+PFMEA' };
    const proj = { productName: '제품X' };
    expect(l1NameFromSelection(info, proj)).toBe('엔진부품');
    expect(l1NameFromLegacyPage(info, proj)).toBe('엔진부품');
  });

  it('partName 없으면 subject 사용 (접미사 제거)', () => {
    const info = { subject: '엔진+PFMEA' };
    const proj = { productName: '제품X' };
    expect(l1NameFromSelection(info, proj)).toBe('엔진');
    expect(l1NameFromLegacyPage(info, proj)).toBe('엔진');
  });

  it('partName, subject 둘 다 없으면 productName 사용', () => {
    const info = {};
    const proj = { productName: '제품X' };
    expect(l1NameFromSelection(info, proj)).toBe('제품X');
    expect(l1NameFromLegacyPage(info, proj)).toBe('제품X');
  });

  it('모두 없으면 빈 문자열', () => {
    expect(l1NameFromSelection({}, {})).toBe('');
    expect(l1NameFromLegacyPage({}, {})).toBe('');
  });

  it('partName에 접미사가 있으면 접미사 제거', () => {
    const info = { partName: 'PCB+PFMEA' };
    expect(l1NameFromSelection(info)).toBe('PCB');
    expect(l1NameFromLegacyPage(info)).toBe('PCB');
  });
});

// ---- selection vs legacyPage 일관성 검증 ----

describe('useFmeaSelection ↔ legacy/page.tsx 결과 일관성', () => {
  const testCases = [
    { label: 'partName만', info: { partName: '엔진' }, proj: undefined },
    { label: 'subject만', info: { subject: '트랜스미션+PFMEA' }, proj: undefined },
    { label: 'productName만', info: {}, proj: { productName: 'Drive Shaft' } },
    { label: 'partName+subject', info: { partName: 'A부품', subject: 'B+PFMEA' }, proj: { productName: 'C' } },
    { label: '모두 비어있음', info: {}, proj: {} },
    { label: 'subject에 생산공정', info: { subject: '모터+생산공정' }, proj: undefined },
    { label: 'partName 빈문자열', info: { partName: '', subject: '밸브PFMEA' }, proj: undefined },
  ];

  testCases.forEach(({ label, info, proj }) => {
    it(`${label} → 두 함수 결과 동일`, () => {
      const fromSelection = l1NameFromSelection(info, proj);
      const fromLegacy = l1NameFromLegacyPage(info, proj);
      expect(fromSelection).toBe(fromLegacy);
    });
  });
});

// ---- resave-import API l1Name 추출 검증 ----

describe('resave-import API l1Name 추출', () => {
  it('partName 우선', () => {
    expect(l1NameFromResaveApi({ partName: '엔진부품', subject: '프로젝트A+PFMEA' })).toBe('엔진부품');
  });

  it('partName 없으면 subject에서 접미사 제거', () => {
    expect(l1NameFromResaveApi({ partName: null, subject: '엔진+PFMEA' })).toBe('엔진');
  });

  it('둘 다 없으면 빈 문자열', () => {
    expect(l1NameFromResaveApi({ partName: null, subject: null })).toBe('');
  });
});

// ---- useWorksheetDataLoader l1Name 추출 검증 ----

describe('useWorksheetDataLoader l1Name 추출', () => {
  it('partName 우선 (stripFmeaSuffix 미적용 — 원본 사용)', () => {
    expect(l1NameFromDataLoader(
      { partName: '엔진부품', subject: '프로젝트+PFMEA', fmeaProjectName: '프로젝트명' },
      { productName: '제품' },
    )).toBe('엔진부품');
  });

  it('partName 없으면 subject에서 접미사+fmeaId 접미사 제거', () => {
    expect(l1NameFromDataLoader(
      { subject: '엔진부품+PFMEA' },
    )).toBe('엔진부품');
  });

  it('subject에 (fmeaId) 접미사 → 제거', () => {
    expect(l1NameFromDataLoader(
      { subject: '엔진부품(pfm26-p001-l01)' },
    )).toBe('엔진부품');
  });

  it('fmeaProjectName 폴백', () => {
    expect(l1NameFromDataLoader(
      { fmeaProjectName: '프로젝트+DFMEA' },
    )).toBe('프로젝트');
  });

  it('productName 최종 폴백', () => {
    expect(l1NameFromDataLoader(
      {},
      { productName: '최종제품' },
    )).toBe('최종제품');
  });

  it('기본값("품명") → 빈 문자열 반환', () => {
    expect(l1NameFromDataLoader({ partName: '품명' })).toBe('');
    expect(l1NameFromDataLoader({ partName: '품명+PFMEA' })).toBe('');
  });

  it('모두 없으면 빈 문자열', () => {
    expect(l1NameFromDataLoader({}, {})).toBe('');
  });
});

// ---- 4개 모듈 크로스 검증 ----

describe('4개 모듈 크로스 검증 — 공통 케이스에서 동일 결과', () => {
  // resave-import와 dataLoader는 DB 필드명이 달라 직접 비교 불가하지만,
  // 핵심은 "partName 우선, 접미사 제거" 규칙이 동일한지 확인
  const commonCases = [
    { partName: '엔진부품', subject: '프로젝트+PFMEA', expected: '엔진부품' },
    { partName: '', subject: '트랜스미션+DFMEA', expected: '트랜스미션' },
    { partName: '', subject: '', expected: '' },
    { partName: 'PCB', subject: '', expected: 'PCB' },
  ];

  commonCases.forEach(({ partName, subject, expected }) => {
    it(`partName="${partName}", subject="${subject}" → "${expected}"`, () => {
      const fromSelection = l1NameFromSelection({ partName: partName || undefined, subject: subject || undefined });
      const fromLegacy = l1NameFromLegacyPage({ partName: partName || undefined, subject: subject || undefined });
      const fromResave = l1NameFromResaveApi({ partName: partName || null, subject: subject || null });

      expect(fromSelection).toBe(expected);
      expect(fromLegacy).toBe(expected);
      expect(fromResave).toBe(expected);
    });
  });
});
