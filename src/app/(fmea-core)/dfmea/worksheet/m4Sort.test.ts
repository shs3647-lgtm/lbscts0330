/**
 * @file m4Sort.test.ts
 * @description 4M 정렬 유틸리티 단위 테스트
 *
 * 4M 렌더링 순서 규칙: MN(사람) → MC(설비) → IM(부자재) → EN(환경)
 * - 알 수 없는 값은 맨 뒤(99)
 * - 원본 배열 불변 (새 배열 반환)
 * - 대소문자 무관 (mn = MN)
 */

import { describe, it, expect } from 'vitest';
import { M4_SORT_ORDER, m4SortValue, sortWorkElementsByM4 } from './constants';

// ============ M4_SORT_ORDER 상수 ============

describe('M4_SORT_ORDER', () => {
  it('MN=0, MC=1, IM=2, EN=3', () => {
    expect(M4_SORT_ORDER['MN']).toBe(0);
    expect(M4_SORT_ORDER['MC']).toBe(1);
    expect(M4_SORT_ORDER['IM']).toBe(2);
    expect(M4_SORT_ORDER['EN']).toBe(3);
  });

  it('정의된 4M 값은 정확히 4개', () => {
    expect(Object.keys(M4_SORT_ORDER).length).toBe(4);
  });
});

// ============ m4SortValue ============

describe('m4SortValue', () => {
  it('유효한 4M 값에 대해 올바른 순서 반환', () => {
    expect(m4SortValue('MN')).toBe(0);
    expect(m4SortValue('MC')).toBe(1);
    expect(m4SortValue('IM')).toBe(2);
    expect(m4SortValue('EN')).toBe(3);
  });

  it('대소문자 무관 (mn, Mn, mN → 모두 0)', () => {
    expect(m4SortValue('mn')).toBe(0);
    expect(m4SortValue('Mn')).toBe(0);
    expect(m4SortValue('mN')).toBe(0);
    expect(m4SortValue('mc')).toBe(1);
    expect(m4SortValue('im')).toBe(2);
    expect(m4SortValue('en')).toBe(3);
  });

  it('알 수 없는 값 → 99', () => {
    expect(m4SortValue('XX')).toBe(99);
    expect(m4SortValue('unknown')).toBe(99);
    expect(m4SortValue('MD')).toBe(99); // MD는 파서에서 MC로 변환됨
    expect(m4SortValue('JG')).toBe(99); // JG도 파서에서 MC로 변환됨
  });

  it('undefined → 99', () => {
    expect(m4SortValue(undefined)).toBe(99);
  });

  it('빈 문자열 → 99', () => {
    expect(m4SortValue('')).toBe(99);
  });

  it('공백 문자열 → 99 (toUpperCase 적용 후에도 맞지 않음)', () => {
    expect(m4SortValue('  ')).toBe(99);
  });
});

// ============ sortWorkElementsByM4 ============

describe('sortWorkElementsByM4', () => {
  const makeWE = (m4: string) => ({ id: `we-${m4}`, m4, name: `WE-${m4}`, order: 0 });

  it('역순 입력 → MN→MC→IM→EN 순서로 정렬', () => {
    const input = [makeWE('EN'), makeWE('IM'), makeWE('MC'), makeWE('MN')];
    const sorted = sortWorkElementsByM4(input);
    expect(sorted.map(w => w.m4)).toEqual(['MN', 'MC', 'IM', 'EN']);
  });

  it('랜덤 순서 입력 → MN→MC→IM→EN', () => {
    const input = [makeWE('IM'), makeWE('MN'), makeWE('EN'), makeWE('MC')];
    const sorted = sortWorkElementsByM4(input);
    expect(sorted.map(w => w.m4)).toEqual(['MN', 'MC', 'IM', 'EN']);
  });

  it('이미 정렬된 입력 → 순서 유지', () => {
    const input = [makeWE('MN'), makeWE('MC'), makeWE('IM'), makeWE('EN')];
    const sorted = sortWorkElementsByM4(input);
    expect(sorted.map(w => w.m4)).toEqual(['MN', 'MC', 'IM', 'EN']);
  });

  it('같은 4M이 여러 개 → 상대 순서 유지 (안정 정렬)', () => {
    const we1 = { ...makeWE('MN'), name: 'MN-first' };
    const we2 = { ...makeWE('MC'), name: 'MC-only' };
    const we3 = { ...makeWE('MN'), name: 'MN-second' };
    const sorted = sortWorkElementsByM4([we1, we2, we3]);
    expect(sorted[0].name).toBe('MN-first');
    expect(sorted[1].name).toBe('MN-second');
    expect(sorted[2].name).toBe('MC-only');
  });

  it('알 수 없는 m4 값은 맨 뒤로', () => {
    const input = [makeWE('XX'), makeWE('MN'), makeWE('EN')];
    const sorted = sortWorkElementsByM4(input);
    expect(sorted.map(w => w.m4)).toEqual(['MN', 'EN', 'XX']);
  });

  it('빈 m4도 맨 뒤로', () => {
    const input = [makeWE(''), makeWE('MC'), makeWE('MN')];
    const sorted = sortWorkElementsByM4(input);
    expect(sorted.map(w => w.m4)).toEqual(['MN', 'MC', '']);
  });

  describe('원본 불변성 (immutability)', () => {
    it('원본 배열은 변경되지 않음', () => {
      const original = [makeWE('EN'), makeWE('MN')];
      const originalCopy = [...original]; // shallow copy for comparison
      sortWorkElementsByM4(original);
      expect(original.map(w => w.m4)).toEqual(originalCopy.map(w => w.m4));
    });

    it('반환된 배열은 새 배열 (참조 다름)', () => {
      const original = [makeWE('MN'), makeWE('MC')];
      const sorted = sortWorkElementsByM4(original);
      expect(sorted).not.toBe(original);
    });

    it('내부 객체는 참조 공유 (shallow copy)', () => {
      const original = [makeWE('EN'), makeWE('MN')];
      const sorted = sortWorkElementsByM4(original);
      // shallow copy이므로 내부 객체 참조는 같아야 함
      expect(sorted[0]).toBe(original[1]); // MN 객체가 동일 참조
    });
  });

  it('빈 배열 → 빈 배열', () => {
    expect(sortWorkElementsByM4([])).toEqual([]);
  });

  it('단일 요소 → 그대로 반환', () => {
    const input = [makeWE('EN')];
    const sorted = sortWorkElementsByM4(input);
    expect(sorted.length).toBe(1);
    expect(sorted[0].m4).toBe('EN');
  });
});
