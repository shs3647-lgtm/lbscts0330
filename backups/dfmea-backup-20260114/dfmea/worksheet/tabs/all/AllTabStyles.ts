/**
 * @file AllTabStyles.ts
 * @description AllTabRenderer 스타일 함수 (인라인 스타일 제거)
 */

import type { CSSProperties } from 'react';
import { FONT_SIZES, FONT_WEIGHTS } from '@/app/dfmea/worksheet/constants';

// ============ 컬럼 헤더 스타일 ============
const BORDER = '1px solid #ccc';

export const colHeaderStyle = (width: string, bg: string, color: string = 'inherit'): CSSProperties => ({
  width,
  background: bg,
  color,
  border: BORDER,
  borderBottom: '2px solid #333',
  padding: '2px',
  fontSize: FONT_SIZES.small,
});

export const colHeaderStyleWithOptions = (
  width: string,
  bg: string,
  color: string = 'inherit',
  options?: { fontWeight?: number; whiteSpace?: string; cursor?: string }
): CSSProperties => ({
  ...colHeaderStyle(width, bg, color),
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
  ...(options?.whiteSpace && { whiteSpace: options.whiteSpace }),
  ...(options?.cursor && { cursor: options.cursor }),
});

export const stickyTheadStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 10,
  background: '#fff',
};

// ============ 셀 스타일 ============
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

export const cellCenterStyle = (
  isOdd: boolean,
  lightColor: string,
  zebraColor: string
): CSSProperties => ({
  ...cellStyle(isOdd, lightColor, zebraColor),
  textAlign: 'center',
});

// ============ 병합 셀 스타일 ============
export const mergedCellStyle = (bg: string, rowSpan?: number): CSSProperties => ({
  background: bg,
  padding: '4px',
  fontSize: FONT_SIZES.cell,
  border: '1px solid white',
  verticalAlign: 'middle',
  ...(rowSpan && rowSpan > 1 ? { fontWeight: FONT_WEIGHTS.semibold } : {}),
});

// ============ 테이블 컨테이너 스타일 ============
export const tableContainerStyle = (isAllView: boolean): CSSProperties => ({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: FONT_SIZES.cell,
  ...(isAllView ? { overflowX: 'auto' } : {}),
});

// ============ 헤더 행 스타일 ============
export const headerRowStyle = (bg: string, color: string = '#fff'): CSSProperties => ({
  background: bg,
  color,
  fontWeight: FONT_WEIGHTS.semibold,
  fontSize: FONT_SIZES.header1,
  textAlign: 'center',
});
