/**
 * @file SectionStyles.ts
 * @description L2/L3 Section 동적 스타일 함수
 */

import type { CSSProperties } from 'react';
import { COLORS } from '../../constants';
import { FUNC_COLORS } from './constants';

const BORDER = `1px solid ${COLORS.line}`;

/** L2 셀 스타일 */
export const l2CellStyle = (bg: string): CSSProperties => ({
  borderTop: BORDER,
  borderRight: BORDER,
  borderBottom: BORDER,
  borderLeft: BORDER,
  padding: '2px 4px',
  background: bg,
  verticalAlign: 'middle',
  wordBreak: 'break-word',
});

/** L3 셀 스타일 */
export const l3CellStyle = (bg: string): CSSProperties => ({
  borderTop: BORDER,
  borderRight: BORDER,
  borderBottom: BORDER,
  borderLeft: BORDER,
  padding: '2px 4px',
  background: bg,
  wordBreak: 'break-word',
});

/** L1 셀 스타일 */
export const l1CellStyle = (bg: string): CSSProperties => ({
  borderTop: BORDER,
  borderRight: BORDER,
  borderBottom: BORDER,
  borderLeft: BORDER,
  padding: '2px 4px',
  background: bg,
  verticalAlign: 'middle',
  wordBreak: 'break-word',
});

/** 구조분석 셀 스타일 */
export const structureCellStyle = (bg: string, options?: { padding?: string; textAlign?: 'center' | 'left' | 'right'; fontSize?: string; fontWeight?: number }): CSSProperties => ({
  border: BORDER,
  background: bg,
  padding: options?.padding || '4px',
  verticalAlign: 'middle',
  textAlign: options?.textAlign || 'left',
  fontSize: options?.fontSize || '12px',
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
});

/** 4M 셀 스타일 */
export const m4CellStyle: CSSProperties = {
  border: BORDER,
  textAlign: 'center',
  fontSize: '9px',
  background: '#fff8e1',
};

/** 작업요소 셀 스타일 */
export const workElementCellStyle: CSSProperties = {
  border: BORDER,
  padding: '4px',
  fontSize: '12px',
  background: '#fff3e0',
};

/** sticky 컬럼 스타일 (zIndex 포함) */
export const stickyCellStyle = (bg: string, zIndex: number, options?: { padding?: string; textAlign?: 'center' | 'left' | 'right'; fontSize?: string; fontWeight?: number }): CSSProperties => ({
  border: BORDER,
  background: bg,
  padding: options?.padding || '4px',
  verticalAlign: 'middle',
  textAlign: options?.textAlign || 'left',
  fontSize: options?.fontSize || '12px',
  zIndex,
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
});

