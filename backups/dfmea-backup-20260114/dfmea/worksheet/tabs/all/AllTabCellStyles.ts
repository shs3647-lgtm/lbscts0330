/**
 * @file AllTabCellStyles.ts
 * @description AllTabRenderer 동적 셀 스타일 함수
 */

import type { CSSProperties } from 'react';
import { FONT_SIZES, FONT_WEIGHTS } from '@/app/dfmea/worksheet/constants';

const BORDER = '1px solid #ccc';

/** 기본 셀 스타일 */
export const baseCellStyle = (bg: string, zebraBg: string, idx: number): CSSProperties => ({
  border: BORDER,
  padding: '2px',
  fontSize: FONT_SIZES.small,
  verticalAlign: 'middle',
  background: idx % 2 === 1 ? zebraBg : bg,
});

/** 구조분석 셀 스타일 */
export const structureCellStyle = (bg: string, idx: number, zebraBg: string, options?: { textAlign?: 'left' | 'center' | 'right'; fontWeight?: number }): CSSProperties => ({
  ...baseCellStyle(bg, zebraBg, idx),
  ...(options?.textAlign && { textAlign: options.textAlign }),
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
});

/** 기능분석 셀 스타일 (연결 여부에 따라) */
export const functionCellStyle = (bg: string, idx: number, zebraBg: string, isLinked: boolean, options?: { textAlign?: 'left' | 'center' | 'right'; fontWeight?: number }): CSSProperties => ({
  ...baseCellStyle(isLinked ? bg : '#fafafa', zebraBg, idx),
  ...(isLinked ? {} : { color: '#999', fontStyle: 'italic' }),
  ...(options?.textAlign && { textAlign: options.textAlign }),
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
});

/** 고장분석 셀 스타일 */
export const failureCellStyle = (bg: string, idx: number, zebraBg: string, options?: { textAlign?: 'left' | 'center' | 'right'; fontWeight?: number }): CSSProperties => ({
  ...baseCellStyle(bg, zebraBg, idx),
  ...(options?.textAlign && { textAlign: options.textAlign }),
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
});

/** 심각도 셀 스타일 (동적 배경색) */
export const severityCellStyle = (severity: number, idx: number, zebraBg: string): CSSProperties => {
  const bg = severity >= 8 ? '#ffebee' : severity >= 5 ? '#ffcdd2' : severity >= 1 ? '#fff5f5' : '#fff';
  const color = severity >= 8 ? '#b71c1c' : severity >= 5 ? '#c62828' : severity >= 1 ? '#d32f2f' : '#000';
  return {
    ...baseCellStyle(bg, zebraBg, idx),
    color,
    textAlign: 'center',
    fontWeight: FONT_WEIGHTS.bold,
    cursor: 'pointer',
  };
};

/** 리스크분석 셀 스타일 */
export const riskCellStyle = (bg: string, idx: number, zebraBg: string, color: string, options?: { textAlign?: 'left' | 'center' | 'right'; fontWeight?: number; cursor?: 'pointer' | 'default' }): CSSProperties => ({
  ...baseCellStyle(bg, zebraBg, idx),
  color,
  ...(options?.textAlign && { textAlign: options.textAlign }),
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
  ...(options?.cursor && { cursor: options.cursor }),
});

/** 최적화 셀 스타일 */
export const optCellStyle = (bg: string, idx: number, zebraBg: string, padding: string = '2px'): CSSProperties => ({
  ...baseCellStyle(bg, zebraBg, idx),
  padding,
});

/** RPN 셀 스타일 */
export const rpnCellStyle = (rpn: number, idx: number, zebraBg: string, colors: any): CSSProperties => ({
  ...baseCellStyle(rpn >= 100 ? colors.indicator.rpnHigh.bg : colors.indicator.rpn.bg, zebraBg, idx),
  color: rpn >= 100 ? colors.indicator.rpnHigh.text : colors.indicator.rpn.text,
  textAlign: 'center',
  fontWeight: FONT_WEIGHTS.bold,
});

/** 입력 필드 스타일 */
export const inputFieldStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'transparent',
  fontSize: FONT_SIZES.cell,
  padding: '4px',
  outline: 'none',
};

/** 날짜 입력 필드 스타일 */
export const dateInputStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'transparent',
  fontSize: '10px',
  padding: '2px',
  outline: 'none',
};

/** 셀렉트 필드 스타일 */
export const selectFieldStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'transparent',
  fontSize: FONT_SIZES.cell,
  padding: '2px',
  outline: 'none',
  cursor: 'pointer',
};

