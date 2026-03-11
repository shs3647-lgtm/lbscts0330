/**
 * table-colors.ts
 * 
 * 목적: 프로젝트 테이블 표준 색상 및 행 높이 정의
 * 적용: 모든 프로젝트 관련 테이블 (등록/CFT/개정/리스트)
 */

import React from 'react';

// ✅ 표준 행 높이
export const STANDARD_ROW_HEIGHT = {
  PADDING: '3px',
  FONT_SIZE: '13px',
  LINE_HEIGHT: '1.5',
  TOTAL_HEIGHT: '32px',
} as const;

// ✅ 표준 테이블 색상
export const TABLE_COLORS = {
  HEADER_BG: '#00587a',
  HEADER_TEXT: '#ffffff',
  EVEN_ROW: '#e0f2fb',
  ODD_ROW: '#ffffff',
  BORDER: '#999',
  TEXT: '#000',
} as const;

// ✅ 표준 테이블 스타일
export const standardTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

// ✅ 모든 셀 공통 스타일
export const cellStyle: React.CSSProperties = {
  border: `1px solid ${TABLE_COLORS.BORDER}`,
  padding: STANDARD_ROW_HEIGHT.PADDING,
  textAlign: 'center',
  fontSize: STANDARD_ROW_HEIGHT.FONT_SIZE,
  lineHeight: STANDARD_ROW_HEIGHT.LINE_HEIGHT,
  height: STANDARD_ROW_HEIGHT.TOTAL_HEIGHT,
  verticalAlign: 'middle',
};

// ✅ 헤더 셀 스타일
export const headerCellStyle: React.CSSProperties = {
  ...cellStyle,
  backgroundColor: TABLE_COLORS.HEADER_BG,
  color: TABLE_COLORS.HEADER_TEXT,
  fontWeight: 'bold',
};

// ✅ 좌측 첫 번째 열 셀 스타일 (행 헤더)
export const rowHeaderCellStyle: React.CSSProperties = {
  ...cellStyle,
  backgroundColor: TABLE_COLORS.HEADER_BG,
  color: TABLE_COLORS.HEADER_TEXT,
  fontWeight: 'bold',
};

// ✅ 바디 셀 스타일 (짝수 행)
export const evenRowCellStyle: React.CSSProperties = {
  ...cellStyle,
  backgroundColor: TABLE_COLORS.EVEN_ROW,
  color: TABLE_COLORS.TEXT,
};

// ✅ 바디 셀 스타일 (홀수 행)
export const oddRowCellStyle: React.CSSProperties = {
  ...cellStyle,
  backgroundColor: TABLE_COLORS.ODD_ROW,
  color: TABLE_COLORS.TEXT,
};

// ✅ 헬퍼 함수: 행 인덱스에 따라 셀 스타일 반환
export const getBodyCellStyle = (rowIndex: number): React.CSSProperties => {
  return rowIndex % 2 === 0 ? evenRowCellStyle : oddRowCellStyle;
};

// ✅ 입력 필드 스타일 (셀 안)
export const cellInputStyle = (rowIndex: number): React.CSSProperties => ({
  width: '100%',
  padding: STANDARD_ROW_HEIGHT.PADDING,
  border: 'none',
  background: rowIndex % 2 === 0 ? TABLE_COLORS.EVEN_ROW : TABLE_COLORS.ODD_ROW,
  color: TABLE_COLORS.TEXT,
  fontSize: STANDARD_ROW_HEIGHT.FONT_SIZE,
  lineHeight: STANDARD_ROW_HEIGHT.LINE_HEIGHT,
  height: STANDARD_ROW_HEIGHT.TOTAL_HEIGHT,
  boxSizing: 'border-box' as const,
  outline: 'none',
  textAlign: 'center' as const,
});















