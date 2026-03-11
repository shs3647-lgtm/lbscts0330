/**
 * @file fmea-core/styles/index.ts
 * @description FMEA 공용 스타일 함수 (Tailwind 우선, 동적 스타일만 함수화)
 */

import type { CSSProperties } from 'react';
import type { APLevel } from '../utils';

// ============ 폰트 표준 ============
export const FONT_SIZES = {
  header: '12px',
  cell: '12px',
  small: '11px',
  tiny: '10px',
} as const;

export const FONT_WEIGHTS = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// ============ 높이 표준 ============
export const HEIGHTS = {
  header: 48,
  actionBar: 40,
  tabMenu: 36,
  statusBar: 28,
  padding: 5,
  treePanel: 350,
} as const;

// ============ 테이블 스타일 함수 ============

/** 테이블 헤더 스타일 */
export const headerStyle = (bg: string, color: string = '#fff'): CSSProperties => ({
  background: bg,
  color,
  padding: '6px 4px',
  fontWeight: FONT_WEIGHTS.semibold,
  fontSize: FONT_SIZES.header,
  textAlign: 'center',
  border: '1px solid white',
});

/** 테이블 서브헤더 스타일 */
export const subHeaderStyle = (bg: string): CSSProperties => ({
  background: bg,
  padding: '4px',
  fontWeight: FONT_WEIGHTS.medium,
  fontSize: FONT_SIZES.cell,
  textAlign: 'center',
  border: '1px solid white',
});

/** 테이블 컬럼 헤더 스타일 */
export const colHeaderStyle = (width: string, bg: string): CSSProperties => ({
  width,
  background: bg,
  padding: '4px',
  fontWeight: FONT_WEIGHTS.semibold,
  fontSize: FONT_SIZES.cell,
  textAlign: 'center',
  border: '1px solid white',
});

/** 테이블 셀 스타일 (줄무늬) */
export const cellStyle = (
  isOdd: boolean,
  lightColor: string,
  zebraColor: string,
  isSelected: boolean = false
): CSSProperties => ({
  background: isSelected ? '#fff3cd' : isOdd ? zebraColor : lightColor,
  padding: '4px',
  fontSize: FONT_SIZES.cell,
  border: '1px solid white',
  verticalAlign: 'middle',
});

/** 테이블 셀 스타일 (중앙 정렬) */
export const cellCenterStyle = (
  isOdd: boolean,
  lightColor: string,
  zebraColor: string
): CSSProperties => ({
  ...cellStyle(isOdd, lightColor, zebraColor),
  textAlign: 'center',
});

/** 병합 셀 스타일 */
export const mergedCellStyle = (bg: string, rowSpan?: number): CSSProperties => ({
  background: bg,
  padding: '4px',
  fontSize: FONT_SIZES.cell,
  border: '1px solid white',
  verticalAlign: 'middle',
  ...(rowSpan && rowSpan > 1 ? { fontWeight: FONT_WEIGHTS.medium } : {}),
});

// ============ 패널 스타일 함수 ============

/** 패널 컨테이너 스타일 */
export const panelStyle = (borderColor: string): CSSProperties => ({
  flex: '0 0 25%',
  border: `2px solid ${borderColor}`,
  borderRadius: '4px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

/** 패널 헤더 스타일 */
export const panelHeaderStyle = (bg: string): CSSProperties => ({
  padding: '6px 8px',
  fontWeight: FONT_WEIGHTS.semibold,
  fontSize: FONT_SIZES.cell,
  background: bg,
  color: 'white',
  textAlign: 'center',
});

// ============ 버튼 스타일 함수 ============

/** 기본 버튼 스타일 */
export const buttonStyle = (bg: string, color: string = '#fff'): CSSProperties => ({
  background: bg,
  color,
  padding: '6px 12px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  fontSize: FONT_SIZES.cell,
  fontWeight: FONT_WEIGHTS.medium,
});

/** 아웃라인 버튼 스타일 */
export const outlineButtonStyle = (borderColor: string, textColor: string): CSSProperties => ({
  background: 'transparent',
  color: textColor,
  padding: '6px 12px',
  borderRadius: '4px',
  border: `1px solid ${borderColor}`,
  cursor: 'pointer',
  fontSize: FONT_SIZES.cell,
});

// ============ 배지 스타일 함수 ============

export interface BadgeColors {
  bg: string;
  border: string;
  color: string;
}

/** 속성 배지 스타일 (4M / 인터페이스) */
export const badgeStyle = (colors: BadgeColors): CSSProperties => ({
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  color: colors.color,
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: FONT_SIZES.small,
  fontWeight: FONT_WEIGHTS.medium,
  display: 'inline-block',
});

/** AP 배지 스타일 */
export const apBadgeStyle = (ap: 'H' | 'M' | 'L'): CSSProperties => {
  const colors: Record<APLevel, { bg: string; text: string }> = {
    H: { bg: '#f87171', text: '#7f1d1d' },
    M: { bg: '#fde047', text: '#713f12' },
    L: { bg: '#86efac', text: '#14532d' },
  };
  return {
    background: colors[ap].bg,
    color: colors[ap].text,
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: FONT_SIZES.small,
    fontWeight: FONT_WEIGHTS.semibold,
  };
};

// ============ Tailwind 클래스 헬퍼 ============

/** 조건부 클래스 결합 */
export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/** 줄무늬 클래스 */
export const zebraClass = (index: number, lightClass: string, zebraClassName: string): string => {
  return index % 2 === 0 ? lightClass : zebraClassName;
};
