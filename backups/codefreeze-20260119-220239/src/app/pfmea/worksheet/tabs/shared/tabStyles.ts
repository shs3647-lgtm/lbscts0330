// @ts-nocheck
/**
 * @file tabStyles.ts
 * @description L1~L3 탭 공용 스타일 정의
 * @created 2026-01-19
 * @note FunctionL1~L3Tab, FailureL1~L3Tab에서 공용 사용
 */

import { FONT_SIZES, FONT_WEIGHTS } from '../../constants';

// 공용 테두리
export const BORDER = '1px solid #b0bec5';

// 셀 기본 스타일
export const cellBase: React.CSSProperties = { 
  border: BORDER, 
  padding: '4px 6px', 
  fontSize: FONT_SIZES.cell, 
  verticalAlign: 'middle' 
};

// 헤더 스타일 생성 함수
export const headerStyle = (bg: string, color = '#fff'): React.CSSProperties => ({ 
  ...cellBase, 
  background: bg, 
  color, 
  fontWeight: FONT_WEIGHTS.bold, 
  textAlign: 'center' 
});

// 데이터 셀 스타일 생성 함수
export const dataCell = (bg: string): React.CSSProperties => ({ 
  ...cellBase, 
  background: bg 
});

// 구조분석 색상
export const STRUCTURE_COLORS = {
  header1: '#1565c0',
  header2: '#1976d2',
  header3: '#e3f2fd',
  cell: '#f5f9ff'
};

// 기능분석 색상
export const FUNCTION_COLORS = {
  header1: '#2e7d32',
  header2: '#388e3c',
  header3: '#e8f5e9',
  cell: '#f5fbf6'
};

// 고장분석 색상
export const FAILURE_COLORS = {
  header1: '#1a237e',
  header2: '#3949ab',
  header3: '#e8eaf6',
  cell: '#f5f6fc'
};

// 지표 색상
export const INDICATOR_COLORS = {
  bg: '#ffccbc',
  text: '#bf360c'
};
