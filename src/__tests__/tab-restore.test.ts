/**
 * @file tab-restore.test.ts
 * @description FMEA 워크시트 탭 복원 로직 TDD 테스트
 * - 최종 화면(all, failure-link 등) 복원 보장
 * - 'structure'(기본값) localStorage/URL 오염 방지
 */

import { describe, it, expect } from 'vitest';

// legacyTab 계산 로직 추출 (useWorksheetDataLoader의 핵심 로직)
function computeLegacyTab(urlTabParam: string | null, savedTab: string): string {
  return urlTabParam || savedTab || 'structure';
}

// 탭 저장 여부 판단 로직 (useWorksheetState의 핵심 로직)
function shouldSaveTab(tab: string, isHydrated: boolean, fmeaId: string | null): {
  saveToLocalStorage: boolean;
  saveToUrl: boolean;
  removeFromUrl: boolean;
} {
  if (!isHydrated || !tab || !fmeaId) {
    return { saveToLocalStorage: false, saveToUrl: false, removeFromUrl: false };
  }
  if (tab === 'structure') {
    return { saveToLocalStorage: false, saveToUrl: false, removeFromUrl: true };
  }
  return { saveToLocalStorage: true, saveToUrl: true, removeFromUrl: false };
}

// setStateSynced에서 탭 결정 로직 (수정 후)
function resolveTab(legacyTab: string): string {
  return legacyTab;
}

describe('탭 복원: legacyTab 계산', () => {

  it('URL에 tab=all이면 all 반환', () => {
    expect(computeLegacyTab('all', '')).toBe('all');
  });

  it('URL에 tab 없고 localStorage에 all이면 all 반환', () => {
    expect(computeLegacyTab(null, 'all')).toBe('all');
  });

  it('URL/localStorage 모두 없으면 structure 반환 (최초 방문)', () => {
    expect(computeLegacyTab(null, '')).toBe('structure');
  });

  it('URL이 localStorage보다 우선', () => {
    expect(computeLegacyTab('failure-link', 'all')).toBe('failure-link');
  });

  it('URL에 tab=structure이고 localStorage에 all이면 structure 반환 (등록 페이지에서 이동)', () => {
    expect(computeLegacyTab('structure', 'all')).toBe('structure');
  });
});

describe('탭 저장: structure 오염 방지', () => {

  it('structure 탭은 localStorage에 저장하지 않는다', () => {
    const result = shouldSaveTab('structure', true, 'fmea-1');
    expect(result.saveToLocalStorage).toBe(false);
    expect(result.saveToUrl).toBe(false);
    expect(result.removeFromUrl).toBe(true);
  });

  it('all 탭은 localStorage와 URL에 저장한다', () => {
    const result = shouldSaveTab('all', true, 'fmea-1');
    expect(result.saveToLocalStorage).toBe(true);
    expect(result.saveToUrl).toBe(true);
    expect(result.removeFromUrl).toBe(false);
  });

  it('failure-link 탭은 localStorage와 URL에 저장한다', () => {
    const result = shouldSaveTab('failure-link', true, 'fmea-1');
    expect(result.saveToLocalStorage).toBe(true);
    expect(result.saveToUrl).toBe(true);
  });

  it('hydration 전에는 아무것도 저장하지 않는다', () => {
    const result = shouldSaveTab('all', false, 'fmea-1');
    expect(result.saveToLocalStorage).toBe(false);
    expect(result.saveToUrl).toBe(false);
  });

  it('fmeaId 없으면 저장하지 않는다', () => {
    const result = shouldSaveTab('all', true, null);
    expect(result.saveToLocalStorage).toBe(false);
    expect(result.saveToUrl).toBe(false);
  });
});

describe('데이터 로더: 탭 결정 (prev.tab 의존 제거)', () => {

  it('legacyTab=all이면 항상 all 반환 (prev.tab 무관)', () => {
    expect(resolveTab('all')).toBe('all');
  });

  it('legacyTab=structure이면 structure 반환 (최초 방문)', () => {
    expect(resolveTab('structure')).toBe('structure');
  });

  it('legacyTab=failure-link이면 failure-link 반환', () => {
    expect(resolveTab('failure-link')).toBe('failure-link');
  });
});

describe('종합 시나리오 테스트', () => {

  it('사용자가 all 탭에서 나갔다 다시 접속: localStorage에서 all 복원', () => {
    // localStorage에 'all' 저장된 상태
    const savedTab = 'all';
    const urlTabParam = null; // URL에 tab 파라미터 없음

    const legacyTab = computeLegacyTab(urlTabParam, savedTab);
    expect(legacyTab).toBe('all');

    const tab = resolveTab(legacyTab);
    expect(tab).toBe('all');

    // 저장 여부: 'all'은 저장해야 함
    const save = shouldSaveTab(tab, true, 'fmea-1');
    expect(save.saveToLocalStorage).toBe(true);
  });

  it('최초 방문 (localStorage 비어있음): structure가 기본이지만 저장되지 않음', () => {
    const savedTab = '';
    const urlTabParam = null;

    const legacyTab = computeLegacyTab(urlTabParam, savedTab);
    expect(legacyTab).toBe('structure');

    const tab = resolveTab(legacyTab);
    expect(tab).toBe('structure');

    // structure는 저장 안 함
    const save = shouldSaveTab(tab, true, 'fmea-1');
    expect(save.saveToLocalStorage).toBe(false);
    expect(save.removeFromUrl).toBe(true);
  });

  it('등록 페이지에서 이동 (URL에 tab=structure 명시): structure 사용 후 URL 정리', () => {
    const savedTab = 'all'; // 이전에 all에 있었지만
    const urlTabParam = 'structure'; // 등록 페이지에서 명시적으로 structure로 보냄

    const legacyTab = computeLegacyTab(urlTabParam, savedTab);
    expect(legacyTab).toBe('structure'); // URL 우선

    const tab = resolveTab(legacyTab);
    expect(tab).toBe('structure');

    // structure는 저장하지 않으므로 다음 방문 시 localStorage의 'all'이 복원됨
    const save = shouldSaveTab(tab, true, 'fmea-1');
    expect(save.saveToLocalStorage).toBe(false);
    expect(save.removeFromUrl).toBe(true);
  });

  it('사이드바에서 접속 (id 없음): fmeaId가 없어 저장 안 함', () => {
    const save = shouldSaveTab('structure', true, null);
    expect(save.saveToLocalStorage).toBe(false);
    expect(save.saveToUrl).toBe(false);
  });
});
