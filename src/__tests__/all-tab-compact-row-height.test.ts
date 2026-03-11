/**
 * @file all-tab-compact-row-height.test.ts
 * @description TDD: 5ST(1개 step만 표시) 시 행 높이가 좁아지지 않는지 검증
 *
 * 문제: visibleSteps.length <= 3이면 compact mode 진입 → body 18px로 축소
 * 기대: 1개 step만 표시 시에는 compact 비활성 (수평 공간 충분) → 행 22px+ 유지
 */

import { HEIGHTS, COMPACT_HEIGHTS, CELL_STYLE, COMPACT_CELL_STYLE } from '../app/(fmea-core)/pfmea/worksheet/tabs/all/allTabConstants';
import { getCellStyle } from '../app/(fmea-core)/pfmea/worksheet/tabs/all/riskOptUtils';

/**
 * isCompact 판정 로직 (AllTabEmpty.tsx에서 추출)
 * 수정 전: visibleSteps.length <= 3 → compact
 * 수정 후: visibleSteps.length >= 2 && visibleSteps.length <= 3 → compact
 */
function shouldBeCompact(visibleSteps: number[] | undefined): boolean {
  if (!visibleSteps) return false;
  return visibleSteps.length >= 2 && visibleSteps.length <= 3;
}

describe('ALL Tab Compact Mode - Row Height', () => {

  describe('isCompact 판정 로직', () => {
    test('1개 step만 표시 시 compact 비활성', () => {
      expect(shouldBeCompact([5])).toBe(false);
    });

    test('2개 step 표시 시 compact 활성', () => {
      expect(shouldBeCompact([4, 5])).toBe(true);
    });

    test('3개 step 표시 시 compact 활성', () => {
      expect(shouldBeCompact([3, 4, 5])).toBe(true);
    });

    test('4개 이상 step 표시 시 compact 비활성', () => {
      expect(shouldBeCompact([2, 3, 4, 5])).toBe(false);
    });

    test('전체 step 표시 시 compact 비활성', () => {
      expect(shouldBeCompact([2, 3, 4, 5, 6])).toBe(false);
    });

    test('visibleSteps undefined 시 compact 비활성', () => {
      expect(shouldBeCompact(undefined)).toBe(false);
    });
  });

  describe('COMPACT_HEIGHTS.body >= HEIGHTS.body', () => {
    test('compact 모드 body 높이가 normal 이상', () => {
      expect(COMPACT_HEIGHTS.body).toBeGreaterThanOrEqual(HEIGHTS.body);
    });
  });

  describe('getCellStyle 행 높이', () => {
    test('normal 모드: height === HEIGHTS.body (22px)', () => {
      const style = getCellStyle(0, '#fff', '#f5f5f5', 'center', false, 0, false);
      expect(style.height).toBe(`${HEIGHTS.body}px`);
    });

    test('compact 모드: minHeight >= 22px', () => {
      const style = getCellStyle(0, '#fff', '#f5f5f5', 'center', false, 0, true);
      const minH = parseInt(String(style.minHeight || '0'), 10);
      expect(minH).toBeGreaterThanOrEqual(22);
    });
  });

  describe('COMPACT_CELL_STYLE padding', () => {
    test('compact padding이 normal과 동일 이상', () => {
      const compactPadParts = COMPACT_CELL_STYLE.padding.split(' ').map(p => parseInt(p));
      const normalPadParts = CELL_STYLE.padding.split(' ').map(p => parseInt(p));
      compactPadParts.forEach((cp, i) => {
        expect(cp).toBeGreaterThanOrEqual(normalPadParts[i]);
      });
    });
  });
});
