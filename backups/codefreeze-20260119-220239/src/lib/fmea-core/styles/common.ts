/**
 * @file fmea-core/styles/common.ts
 * @description FMEA 공용 스타일 함수 (인라인 스타일 제거용)
 */

import type { CSSProperties } from 'react';
import { FONT_SIZES, FONT_WEIGHTS } from './index';

// ============ 컨테이너 스타일 ============
export const containerStyle = (bg: string, color?: string): CSSProperties => ({
  background: bg,
  ...(color && { color }),
});

export const flexContainerStyle = (flex?: string, borderRight?: string): CSSProperties => ({
  ...(flex && { flex }),
  ...(borderRight && { borderRight }),
});

// ============ 테이블 스타일 ============
export const tableStyle = (width: string = '100%', borderCollapse: 'collapse' | 'separate' = 'collapse'): CSSProperties => ({
  width,
  borderCollapse,
  tableLayout: 'fixed',
});

export const tableFullStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

// ============ 헤더 스타일 ============
export const headerStyle = (bg: string, color: string = '#fff'): CSSProperties => ({
  background: bg,
  color,
  padding: '4px',
  fontWeight: FONT_WEIGHTS.semibold,
  fontSize: FONT_SIZES.cell,
  textAlign: 'center',
});

// ============ 셀 스타일 ============
export const cellStyle = (
  bg: string,
  border: string = '1px solid white',
  padding: string = '4px'
): CSSProperties => ({
  background: bg,
  border,
  padding,
  fontSize: FONT_SIZES.cell,
});

// ============ 버튼 스타일 ============
export const buttonStyle = (
  bg: string,
  color: string = '#fff',
  border?: string
): CSSProperties => ({
  background: bg,
  color,
  ...(border && { border }),
  padding: '4px 8px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: FONT_SIZES.cell,
  fontWeight: FONT_WEIGHTS.semibold,
});

// ============ 패널 스타일 ============
export const panelStyle = (borderColor: string, flex?: string): CSSProperties => ({
  ...(flex && { flex }),
  border: `2px solid ${borderColor}`,
  borderRadius: '4px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

// ============ 스크롤 영역 ============
export const scrollAreaStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
};

// ============ 스티키 헤더 ============
export const stickyHeaderStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 10,
  background: '#fff',
};

