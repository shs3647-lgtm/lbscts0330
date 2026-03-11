/**
 * @file AllTabCellStyles.ts
 * @description AllTabRenderer 동적 셀 스타일 함수
 * ★★★ 2026-01-25: 글씨 크기/스타일 표준화 ★★★
 * - 1행 헤더: 12px, bold
 * - 2행~입력셀: 11px
 * - 헤더: bold
 * - 입력셀: normal
 */

import type { CSSProperties } from 'react';
import { FONT_STANDARD } from './allTabConstants';

const BORDER = '1px solid #ccc';

/** 기본 셀 스타일 - 표준화 적용 */
export const baseCellStyle = (bg: string, zebraBg: string, idx: number): CSSProperties => ({
  border: BORDER,
  padding: '2px',
  fontSize: FONT_STANDARD.cell,        // ★ 표준 11px
  fontWeight: FONT_STANDARD.cellWeight, // ★ 입력셀: normal (400)
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

/** 심각도 셀 스타일 (동적 배경색) - ★ 표준화: 배경=레벨색, 글씨=점수별 */
export const severityCellStyle = (severity: number, idx: number, zebraBg: string): CSSProperties => {
  // ★ 글씨색만 점수별 구분 (1-3녹색, 4-6주황, 7-10빨강)
  const color = severity >= 7 ? '#c62828' : severity >= 4 ? '#f57f17' : severity >= 1 ? '#2e7d32' : '#666';
  return {
    ...baseCellStyle(zebraBg, zebraBg, idx),  // ★ 배경=레벨 색상
    color,
    textAlign: 'center',
    fontWeight: severity > 0 ? 700 : 400,  // ★ 값 있으면 bold
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

/** RPN 셀 스타일 - ★ 표준화: 배경=레벨색, 글씨=값 기반 */
export const rpnCellStyle = (rpn: number, idx: number, zebraBg: string, _colors: Record<string, string>): CSSProperties => ({
  ...baseCellStyle(zebraBg, zebraBg, idx),  // ★ 배경=레벨 색상
  color: rpn >= 100 ? '#c62828' : rpn >= 50 ? '#f57f17' : rpn >= 1 ? '#2e7d32' : '#666',
  textAlign: 'center',
  fontWeight: rpn > 0 ? 700 : 400,  // ★ 값 있으면 bold
});

/** 입력 필드 스타일 - 표준화 적용 */
export const inputFieldStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'transparent',
  fontSize: FONT_STANDARD.cell,        // ★ 표준 11px
  fontWeight: FONT_STANDARD.cellWeight, // ★ 입력셀: normal (400)
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
  fontSize: FONT_STANDARD.cell,  // ★ 표준 11px
  fontWeight: FONT_STANDARD.cellWeight,  // ★ 입력셀: normal (400)
  padding: '2px',
  outline: 'none',
  cursor: 'pointer',
};

