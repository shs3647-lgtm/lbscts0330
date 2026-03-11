/**
 * @file FunctionTabStyles.ts
 * @description 기능 분석 탭 공통 스타일 함수 (인라인 스타일 제거)
 */

import type { CSSProperties } from 'react';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../../constants';

const BORDER = `1px solid ${COLORS.line}`;

export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

export const colStyle = (width: string, minWidth?: string): CSSProperties => ({
  width,
  ...(minWidth ? { minWidth } : {}),
});

export const headerMain = (bg: string, padding = '8px'): CSSProperties => ({
  background: bg,
  color: 'white',
  border: BORDER,
  padding,
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
  textAlign: 'center',
});

export const headerSub = (bg: string, padding = '6px', options?: { fontWeight?: number; gap?: string }): CSSProperties => ({
  background: bg,
  color: 'white',
  border: BORDER,
  padding,
  fontSize: FONT_SIZES.header1,
  fontWeight: options?.fontWeight ?? FONT_WEIGHTS.semibold,
  textAlign: 'center',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: options?.gap ?? '8px',
});

export const badgeStyle = (bg: string): CSSProperties => ({
  background: bg,
  color: 'white',
  padding: '3px 10px',
  borderRadius: '3px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
});

export const pillStyle = (bg: string): CSSProperties => ({
  background: bg,
  color: 'white',
  padding: '2px 8px',
  borderRadius: '10px',
  fontSize: FONT_SIZES.cell,
  fontWeight: FONT_WEIGHTS.semibold,
});

export const colHeaderStyle = (bg: string): CSSProperties => ({
  background: bg,
  color: 'white',
  border: BORDER,
  padding: '6px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
  textAlign: 'center',
});

export const colHeaderSubStyle = (bg: string): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '8px',
  fontSize: FONT_SIZES.header1,
  fontWeight: 800,
  textAlign: 'center',
});

export const rowCellStyle = (bg: string, options?: { textAlign?: CSSProperties['textAlign'] }): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '4px 6px',
  fontSize: FONT_SIZES.cell,
  verticalAlign: 'middle',
  ...(options?.textAlign && { textAlign: options.textAlign }),
});

export const rowCellTight = (bg: string): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '3px',
  fontSize: '12px',
  textAlign: 'center',
});

export const specialCharBadgeStyle = (bg: string): CSSProperties => ({
  background: bg,
  color: 'white',
  padding: '2px 6px',
  borderRadius: '3px',
  fontSize: FONT_SIZES.cell,
  fontWeight: FONT_WEIGHTS.semibold,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
  whiteSpace: 'nowrap',
});

export const specialCharIconStyle: CSSProperties = { fontSize: FONT_SIZES.small };

export const specialCharButtonStyle = (bgColor: string): CSSProperties => ({
  backgroundColor: bgColor,
});

/** 컨테이너 스타일 */
export const containerStyle: CSSProperties = {
  padding: '0',
  overflow: 'auto',
  height: '100%',
};

/** 헤더 메인 (1행) */
export const headerMainRow = (bg: string, fontWeight = 800): CSSProperties => ({
  background: bg,
  color: 'white',
  border: BORDER,
  padding: '8px',
  fontSize: FONT_SIZES.header1,
  fontWeight,
  textAlign: 'center',
});

/** 헤더 내부 플렉스 컨테이너 */
export const headerFlexContainer: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '20px',
};

/** 헤더 내부 버튼 그룹 */
export const headerButtonGroup: CSSProperties = {
  display: 'flex',
  gap: '6px',
};

/** 확정/수정 버튼 스타일 */
export const confirmButtonStyle = (bg: string): CSSProperties => ({
  background: bg,
  color: 'white',
  border: 'none',
  padding: '3px 10px',
  borderRadius: '3px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
  cursor: 'pointer',
});

/** 확정 배지 스타일 */
export const confirmBadgeStyle: CSSProperties = {
  background: '#4caf50',
  color: 'white',
  padding: '3px 10px',
  borderRadius: '3px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
};

/** 누락 배지 스타일 */
export const missingBadgeStyle = (isMissing: boolean): CSSProperties => ({
  background: isMissing ? '#f57c00' : '#4caf50',
  color: 'white',
  padding: '3px 10px',
  borderRadius: '3px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
});

/** 헤더 서브 (2행) */
export const headerSubRow = (bg: string): CSSProperties => ({
  background: bg,
  color: 'white',
  border: BORDER,
  padding: '6px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
  textAlign: 'center',
});

/** 누락 알림 작은 배지 */
export const missingPillStyle: CSSProperties = {
  marginLeft: '8px',
  background: '#f57c00',
  color: 'white',
  padding: '2px 8px',
  borderRadius: '10px',
  fontSize: FONT_SIZES.cell,
};

/** 누락 알림 작은 배지 (인라인) */
export const missingPillInlineStyle: CSSProperties = {
  marginLeft: '4px',
  background: '#f57c00',
  color: 'white',
  padding: '1px 5px',
  borderRadius: '8px',
  fontSize: FONT_SIZES.small,
};

/** 컬럼 헤더 (3행) */
export const colHeaderRow = (bg: string): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '6px',
  fontSize: FONT_SIZES.cell,
  fontWeight: FONT_WEIGHTS.semibold,
});

/** 헤더 행 배경 */
export const headerRowBg: CSSProperties = {
  background: '#e8f5e9',
};

/** 데이터 행 스타일 */
export const dataRowStyle = (bg: string): CSSProperties => ({
  background: bg,
});

/** 데이터 셀 스타일 */
export const dataCellStyle = (bg: string, options?: { padding?: string; textAlign?: 'center' | 'left' | 'right'; fontWeight?: number; verticalAlign?: 'middle' | 'top' | 'bottom'; color?: string; fontSize?: string; borderRight?: string; borderLeft?: string }): CSSProperties => ({
  border: BORDER,
  background: bg,
  padding: options?.padding || '4px',
  ...(options?.textAlign && { textAlign: options.textAlign }),
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
  ...(options?.verticalAlign && { verticalAlign: options.verticalAlign }),
  ...(options?.color && { color: options.color }),
  ...(options?.fontSize && { fontSize: options.fontSize }),
  ...(options?.borderRight && { borderRight: options.borderRight }),
  ...(options?.borderLeft && { borderLeft: options.borderLeft }),
});

/** 헤더 내부 플렉스 컨테이너 (L1용) */
export const headerFlexContainerL1: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/** 헤더 내부 버튼 그룹 (L1용) */
export const headerButtonGroupL1: CSSProperties = {
  display: 'flex',
  gap: '4px',
  position: 'absolute',
  right: '8px',
};

/** 확정/수정 버튼 스타일 (L1용) */
export const confirmButtonStyleL1 = (bg: string, disabled: boolean): CSSProperties => ({
  padding: '4px 12px',
  background: disabled ? '#9e9e9e' : bg,
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.7 : 1,
});

/** 누락 배지 스타일 (L1용) */
export const missingBadgeStyleL1 = (isMissing: boolean): CSSProperties => ({
  padding: '4px 10px',
  background: isMissing ? '#f57c00' : '#4caf50',
  color: 'white',
  borderRadius: '4px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
});

/** 헤더 메인 (L1용 - position relative) */
export const headerMainRowL1 = (bg: string): CSSProperties => ({
  background: bg,
  color: 'white',
  border: BORDER,
  padding: '8px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
  textAlign: 'center',
  position: 'relative',
});

/** 헤더 플렉스 스팬 (L1용) */
export const headerFlexSpan: CSSProperties = {
  flex: 1,
  textAlign: 'center',
};

/** 컬럼 헤더 (L1용 - header2) */
export const colHeaderRowL1 = (bg: string, color?: string): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '6px',
  fontSize: FONT_SIZES.header2,
  fontWeight: FONT_WEIGHTS.semibold,
  ...(color && { color }),
});

/** 컬럼 헤더 (L3용 - borderRight) */
export const colHeaderRowL3 = (bg: string, options?: { borderRight?: string; borderLeft?: string; color?: string; textAlign?: 'center' }): CSSProperties => ({
  background: bg,
  border: BORDER,
  ...(options?.borderRight && { borderRight: options.borderRight }),
  ...(options?.borderLeft && { borderLeft: options.borderLeft }),
  padding: '6px',
  fontSize: FONT_SIZES.cell,
  fontWeight: FONT_WEIGHTS.semibold,
  ...(options?.color && { color: options.color }),
  ...(options?.textAlign && { textAlign: options.textAlign }),
});

/** 데이터 셀 스타일 (L3용 - 추가 옵션) */
export const dataCellStyleL3 = (bg: string, options?: { padding?: string; textAlign?: 'center' | 'left' | 'right'; fontWeight?: number; verticalAlign?: 'middle' | 'top' | 'bottom'; color?: string; fontSize?: string; borderRight?: string; borderLeft?: string }): CSSProperties => ({
  border: BORDER,
  background: bg,
  padding: options?.padding || '4px',
  ...(options?.textAlign && { textAlign: options.textAlign }),
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
  ...(options?.verticalAlign && { verticalAlign: options.verticalAlign }),
  ...(options?.color && { color: options.color }),
  ...(options?.fontSize && { fontSize: options.fontSize }),
  ...(options?.borderRight && { borderRight: options.borderRight }),
  ...(options?.borderLeft && { borderLeft: options.borderLeft }),
});

