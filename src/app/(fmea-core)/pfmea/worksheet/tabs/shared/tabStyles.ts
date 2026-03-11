/**
 * @file tabStyles.ts
 * @description L1~L3 탭 공용 스타일 정의
 * @updated 2026-01-25 - 색상/폰트 표준화
 * ★★★ 표준화 기준 ★★★
 * - 색상: L1=파랑, L2=녹색, L3=주황
 * - 폰트: 1행=12px, 2행~입력셀=11px
 * - 굵기: 헤더=bold(700), 입력셀=normal(400)
 */

import { FONT_SIZES, FONT_WEIGHTS } from '../../constants';

// 공용 테두리
export const BORDER = '1px solid #ccc';

// ★★★ 표준화 색상 정의 ★★★
export const LEVEL_COLORS = {
  // L1: 파란색 (완제품/FE)
  L1: {
    header: '#1976d2',      // 1행 헤더
    headerLight: '#90caf9', // 2-3행 헤더
    cell: '#e3f2fd',        // 셀 (연한줄)
    cellAlt: '#f0f7ff',     // 셀 (진한줄)
  },
  // L2: 녹색 (메인공정/FM)
  L2: {
    header: '#388e3c',      // 1행 헤더
    headerLight: '#a5d6a7', // 2-3행 헤더
    cell: '#e8f5e9',        // 셀 (연한줄)
    cellAlt: '#f1f9f2',     // 셀 (진한줄)
  },
  // L3: 주황색 (작업요소/FC)
  L3: {
    header: '#f57c00',      // 1행 헤더
    headerLight: '#ffe0b2', // 2-3행 헤더
    cell: '#fff3e0',        // 셀 (연한줄)
    cellAlt: '#fffaf5',     // 셀 (진한줄)
  },
};

// ★★★ 표준화 폰트 크기 ★★★
const FONT_STD = {
  header1: '12px',   // 1행 헤더
  header2: '11px',   // 2행 헤더
  header3: '11px',   // 3행 헤더
  cell: '11px',      // 입력셀
};

// 셀 기본 스타일 (입력셀: 11px, normal)
export const cellBase: React.CSSProperties = {
  border: BORDER,
  padding: '4px 6px',
  fontSize: FONT_STD.cell,
  fontWeight: FONT_WEIGHTS.normal,  // ★ 입력셀: normal (400)
  verticalAlign: 'middle'
};

// 헤더 스타일 생성 함수 (헤더: bold)
export const headerStyle = (bg: string, color = '#fff', fontSize = FONT_STD.header2): React.CSSProperties => ({
  ...cellBase,
  background: bg,
  color,
  fontSize,
  fontWeight: FONT_WEIGHTS.bold,    // ★ 헤더: bold (700)
  textAlign: 'center'
});

// 데이터 셀 스타일 생성 함수 (11px, normal)
export const dataCell = (bg: string, isAlt = false): React.CSSProperties => ({
  ...cellBase,
  background: bg
});

// 구조분석 색상 (L1=파랑, L2=녹색, L3=주황)
export const STRUCTURE_COLORS = {
  header1: LEVEL_COLORS.L1.header,       // ★ L1 파란색
  header2: LEVEL_COLORS.L2.header,       // ★ L2 녹색
  header3: LEVEL_COLORS.L3.headerLight,  // ★ L3 주황 연한색
  cell: LEVEL_COLORS.L1.cell
};

// 기능분석 색상 (L1=파랑, L2=녹색, L3=주황)
export const FUNCTION_COLORS = {
  L1: LEVEL_COLORS.L1,
  L2: LEVEL_COLORS.L2,
  L3: LEVEL_COLORS.L3,
  header1: LEVEL_COLORS.L1.header,
  header2: LEVEL_COLORS.L2.header,
  header3: LEVEL_COLORS.L3.headerLight,
  cell: LEVEL_COLORS.L2.cell
};

// 고장분석 색상 (FE=L1파랑, FM=L2녹색, FC=L3주황)
export const FAILURE_COLORS = {
  FE: LEVEL_COLORS.L1,  // ★ 고장영향: L1 파란색
  FM: LEVEL_COLORS.L2,  // ★ 고장형태: L2 녹색
  FC: LEVEL_COLORS.L3,  // ★ 고장원인: L3 주황색
  header1: LEVEL_COLORS.L1.header,
  header2: LEVEL_COLORS.L2.header,
  header3: LEVEL_COLORS.L3.headerLight,
  cell: LEVEL_COLORS.L3.cell
};

// 지표 색상 (글씨색으로 구분)
export const INDICATOR_COLORS = {
  severity: { bg: 'inherit', textHigh: '#c62828', textMid: '#f57f17', textLow: '#2e7d32' },
  occurrence: { bg: 'inherit', textHigh: '#c62828', textMid: '#f57f17', textLow: '#2e7d32' },
  detection: { bg: 'inherit', textHigh: '#c62828', textMid: '#f57f17', textLow: '#2e7d32' },
  ap: { H: '#c62828', M: '#f57f17', L: '#2e7d32' },
  special: '#1976d2',  // ★ 특별특성: 파란색
};
