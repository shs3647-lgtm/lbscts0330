/**
 * @file allTabConstants.ts
 * @description ALL 화면 색상, 컬럼 정의 및 유틸리티
 * 
 * ★★★ 레벨별 색상 체계 (2026-01-25 통일) ★★★
 * - 1L (레벨1): 파란색 계열 (#1976d2 ~ #42a5f5)
 * - 2L (레벨2): 녹색 계열 (#388e3c ~ #66bb6a)
 * - 3L (레벨3): 주황색 계열 (#f57c00 ~ #ff9800)
 * 
 * 색상 변경 시 LEVEL_COLORS만 수정하면 전체 화면에 반영됨
 */

import { L1, L2, L3 } from '@/styles/worksheet';

// ============ 플레이스홀더/마커 문자열 (중앙 집중 관리) ============
/** 해당 없음 (Not Applicable) — 개선추천 불필요 시 사용 */
export const PLACEHOLDER_NA = 'N/A';
/** 빈값/미입력 대체 문자열 — 표시용 폴백 및 빈값 판별에 사용 */
export const PLACEHOLDER_DASH = '-';
/** 미분류 항목 기본값 — FE 카테고리 등 분류 미지정 시 사용 */
export const PLACEHOLDER_UNCLASSIFIED = '미분류';
/** 자동추천 접두사 — 산업DB 기반 자동생성 값 식별에 사용 */
export const RECOMMEND_PREFIX = '[추천]';

// ============ 레벨별 표준 색상 (중앙 집중 관리) ============
// ★★★ 색상 변경은 여기서만 수정 ★★★
// cell = 연한줄무늬 (2단계 연함), cellAlt = 진한줄무늬 (1단계 연함)
export const LEVEL_COLORS = {
  // 1L: 파란색 (완제품/완제품기능/1L 고장영향)
  L1: {
    header: L1.header,           // #1976d2
    headerLight: L1.headerLight, // #42a5f5
    cell: '#f0f7ff',             // ★ 2단계 연한 파랑
    cellAlt: '#e3f2fd',          // ★ 1단계 연한 파랑 (기존 cell)
  },
  // 2L: 녹색 (메인공정/공정기능/2L 고장형태)
  L2: {
    header: L2.header,           // #388e3c
    headerLight: L2.headerLight, // #66bb6a
    cell: '#f1f9f2',             // ★ 2단계 연한 녹색
    cellAlt: '#e8f5e9',          // ★ 1단계 연한 녹색 (기존 cell)
  },
  // 3L: 주황색 (작업요소/작업요소기능/3L 고장원인)
  L3: {
    header: L3.header,           // #f57c00
    headerLight: L3.headerLight, // #ff9800
    cell: '#fffaf5',             // ★ 2단계 연한 주황
    cellAlt: '#fff3e0',          // ★ 1단계 연한 주황 (기존 cell)
  },
  // 지표용 색상 (S, O, D 등)
  indicator: {
    header: '#e65100',
    headerLight: '#ff9800',
    cell: '#fffaf5',             // ★ 2단계 연한 주황
    cellAlt: '#fff3e0',          // ★ 1단계 연한 주황
  },
  // 네이비 (고장형태 등 강조)
  navy: {
    header: '#303f9f',
    headerLight: '#5c6bc0',
    cell: '#f0f1f9',             // ★ 2단계 연한 네이비
    cellAlt: '#e8eaf6',          // ★ 1단계 연한 네이비
  },
  // 노란색 (FE 등)
  yellow: {
    header: '#f9a825',
    headerLight: '#fdd835',
    cell: '#fffef5',             // ★ 2단계 연한 노랑
    cellAlt: '#fffde7',          // ★ 1단계 연한 노랑
  },
};

// ============ Import 자동보완 하이라이트 ============
// 자동 채움된 셀을 적색으로 표시 → 사용자가 검토/수정 가능
export const IMPORTED_HIGHLIGHT = {
  bg: '#fff0f0',
  text: '#c62828',
  border: '1px solid #ef9a9a',
} as const;

// ============ SOD 점수별 글씨 색상 ============
// 점수가 높을수록 진한 빨강(위험), 낮을수록 녹색(안전)
export const getSODTextColor = (score: number | undefined): string => {
  if (!score || score <= 0) return '#666';     // 미입력: 회색
  if (score <= 3) return '#2e7d32';            // 1-3: 녹색 (안전)
  if (score <= 6) return '#f57f17';            // 4-6: 주황색 (주의)
  return '#c62828';                             // 7-10: 빨강 (위험)
};

// ============ 특별특성 색상 (배경=3레벨 주황, 글씨=파란색 통일) ============
export const SPECIAL_CHAR_COLOR = '#1565c0';  // ★ 파란색 통일

export const getSpecialCharColor = (value: string | undefined): string => {
  if (!value || value === PLACEHOLDER_DASH) return '#666';  // 빈값/없음: 회색
  return SPECIAL_CHAR_COLOR;                   // 모든 특성값: 파란색
};

// ============ 색상 정의 (레벨 색상 사용) ============
export const COLORS = {
  // 2단계: 구조분석 (1L=파랑, 2L=녹색, 3L=주황)
  structure: {
    product: { header: LEVEL_COLORS.L1.header, headerLight: LEVEL_COLORS.L1.headerLight, cell: LEVEL_COLORS.L1.cell, cellAlt: LEVEL_COLORS.L1.cellAlt },
    main: { header: LEVEL_COLORS.L2.header, headerLight: LEVEL_COLORS.L2.headerLight, cell: LEVEL_COLORS.L2.cell, cellAlt: LEVEL_COLORS.L2.cellAlt },
    m4: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt },
    workElement: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt },
  },
  // 3단계: 기능분석 (1L=파랑, 2L=녹색, 3L=주황)
  function: {
    // ★ 1L 완제품: 구분, 완제품기능, 요구사항 모두 파란색 계열
    division: { header: LEVEL_COLORS.L1.header, headerLight: LEVEL_COLORS.L1.headerLight, cell: LEVEL_COLORS.L1.cell, cellAlt: LEVEL_COLORS.L1.cellAlt },
    productFunc: { header: LEVEL_COLORS.L1.header, headerLight: LEVEL_COLORS.L1.headerLight, cell: LEVEL_COLORS.L1.cell, cellAlt: LEVEL_COLORS.L1.cellAlt },
    requirement: { header: LEVEL_COLORS.L1.header, headerLight: LEVEL_COLORS.L1.headerLight, cell: LEVEL_COLORS.L1.cell, cellAlt: LEVEL_COLORS.L1.cellAlt }, // ★ 파란색으로 변경
    // ★ 2L 메인공정: 녹색 계열
    processFunc: { header: LEVEL_COLORS.L2.header, headerLight: LEVEL_COLORS.L2.headerLight, cell: LEVEL_COLORS.L2.cell, cellAlt: LEVEL_COLORS.L2.cellAlt },
    productChar: { header: LEVEL_COLORS.L2.header, headerLight: LEVEL_COLORS.L2.headerLight, cell: LEVEL_COLORS.L2.cell, cellAlt: LEVEL_COLORS.L2.cellAlt },
    // ★ 3L 작업요소: 주황색 계열
    workFunc: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt },
    processChar: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt },
  },
  // 4단계: 고장분석 (FE=1L 파랑, FM=2L 녹색, FC=3L 주황)
  failure: {
    fe: { header: LEVEL_COLORS.L1.header, headerLight: LEVEL_COLORS.L1.headerLight, cell: LEVEL_COLORS.L1.cell, cellAlt: LEVEL_COLORS.L1.cellAlt }, // ★ 1L 파란색
    fm: { header: LEVEL_COLORS.L2.header, headerLight: LEVEL_COLORS.L2.headerLight, cell: LEVEL_COLORS.L2.cell, cellAlt: LEVEL_COLORS.L2.cellAlt }, // ★ 2L 녹색
    fc: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt }, // ★ 3L 주황색
  },
  // 5단계: 리스크분석 (예방=1L파랑, 검출=2L녹색, 평가=3L주황)
  risk: {
    prevention: { header: LEVEL_COLORS.L1.header, headerLight: LEVEL_COLORS.L1.headerLight, cell: LEVEL_COLORS.L1.cell, cellAlt: LEVEL_COLORS.L1.cellAlt },
    detection: { header: LEVEL_COLORS.L2.header, headerLight: LEVEL_COLORS.L2.headerLight, cell: LEVEL_COLORS.L2.cell, cellAlt: LEVEL_COLORS.L2.cellAlt },
    evaluation: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt }, // ★ L3 주황색
  },
  // 6단계: 최적화 (계획=1L 파랑, 모니터링=2L 녹색, 효과평가=3L 주황)
  optimization: {
    // ★ 1. 계획 (1L 파란색)
    prevention: { header: LEVEL_COLORS.L1.header, headerLight: LEVEL_COLORS.L1.headerLight, cell: LEVEL_COLORS.L1.cell, cellAlt: LEVEL_COLORS.L1.cellAlt },
    detection: { header: LEVEL_COLORS.L1.header, headerLight: LEVEL_COLORS.L1.headerLight, cell: LEVEL_COLORS.L1.cell, cellAlt: LEVEL_COLORS.L1.cellAlt },
    person: { header: LEVEL_COLORS.L1.header, headerLight: LEVEL_COLORS.L1.headerLight, cell: LEVEL_COLORS.L1.cell, cellAlt: LEVEL_COLORS.L1.cellAlt },
    date: { header: LEVEL_COLORS.L1.header, headerLight: LEVEL_COLORS.L1.headerLight, cell: LEVEL_COLORS.L1.cell, cellAlt: LEVEL_COLORS.L1.cellAlt },
    status: { header: LEVEL_COLORS.L1.header, headerLight: LEVEL_COLORS.L1.headerLight, cell: LEVEL_COLORS.L1.cell, cellAlt: LEVEL_COLORS.L1.cellAlt },
    // ★ 2. 모니터링 (2L 녹색)
    result: { header: LEVEL_COLORS.L2.header, headerLight: LEVEL_COLORS.L2.headerLight, cell: LEVEL_COLORS.L2.cell, cellAlt: LEVEL_COLORS.L2.cellAlt },
    complete: { header: LEVEL_COLORS.L2.header, headerLight: LEVEL_COLORS.L2.headerLight, cell: LEVEL_COLORS.L2.cell, cellAlt: LEVEL_COLORS.L2.cellAlt },
    monitoring: { header: LEVEL_COLORS.L2.header, headerLight: LEVEL_COLORS.L2.headerLight, cell: LEVEL_COLORS.L2.cell, cellAlt: LEVEL_COLORS.L2.cellAlt },
    // ★ 3. 효과 평가 (3L 주황색)
    severity: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt },
    occurrence: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt },
    detection2: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt },
    special: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt }, // ★ 배경=3레벨, 글씨=파랑
    ap: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt },
    note: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt },
    evaluation: { header: LEVEL_COLORS.L3.header, headerLight: LEVEL_COLORS.L3.headerLight, cell: LEVEL_COLORS.L3.cell, cellAlt: LEVEL_COLORS.L3.cellAlt },
  },
};

// ============ 높이 정의 ============
export const HEIGHTS = {
  header1: 28,
  header2: 20,  // ★ 16→20 버튼 가독성 확보
  header3: 24,
  body: 22,
};

// ============ 글씨 크기/스타일 표준화 (2026-01-25) ============
// ★★★ 1행=12px, 2행~입력셀=11px, 헤더=bold, 입력셀=normal ★★★
export const FONT_STANDARD = {
  // 크기
  header1: '12px',        // ★ 1행 헤더: 12px
  header2: '11px',        // ★ 2행 헤더: 11px
  header3: '11px',        // ★ 3행 헤더: 11px
  cell: '11px',           // ★ 입력셀: 11px
  // 굵기
  headerWeight: 700,      // ★ 헤더: bold
  cellWeight: 400,        // ★ 입력셀: normal
};

// ============ 셀 스타일 최적화 (2026-01-11) ============
export const CELL_STYLE = {
  padding: '1px 2px',           // 최소 패딩 (가로 2px, 세로 1px)
  fontSize: FONT_STANDARD.cell, // ★ 표준 폰트 크기 (11px)
  fontSizeCompact: '10px',      // 컴팩트 폰트 크기
  lineHeight: 1.2,              // 120% 줄 높이
  maxLines: 2,                  // 최대 2줄 (120% 이상 시 줄바꿈)
};

// ============ ★ Compact 모드 (≤3 step 한화면 보기) ============
// 3개 이하 탭 표시 시 글씨/패딩 축소 + 줄바꿈 허용
export const COMPACT_CELL_STYLE = {
  padding: '1px 2px',
  fontSize: '9px',
  lineHeight: 1.2,
};

export const COMPACT_FONT = {
  header1: '10px',
  header2: '9px',
  header3: '9px',
  cell: '9px',
  headerWeight: 700,
  cellWeight: 400,
};

export const COMPACT_HEIGHTS = {
  header1: 24,
  header2: 20,  // ★ 14→20 버튼 가독성 확보
  header3: 20,
  body: 22,
};

// ★★★ 2026-02-03: 동적 정렬 헬퍼 함수 ★★★
// 긴 텍스트(10자 이상)는 좌측정렬, 짧은 텍스트는 중앙정렬
export const getDynamicAlign = (text: string | undefined | null, threshold = 10): 'left' | 'center' => {
  if (!text) return 'center';
  return text.length >= threshold ? 'left' : 'center';
};

// ============ FM 구분선 스타일 (2026-01-11) ============
export const FM_DIVIDER = {
  borderWidth: '2px',
  borderColor: '#5c6bc0',   // FM 헤더 색상과 동일
  borderStyle: 'solid',
};

// ============ 단계별 세로 구분선 (2026-01-11) ============
export const STEP_DIVIDER = {
  borderWidth: '2px',
  borderColor: '#333',      // 진한 회색
  borderStyle: 'solid',
};

// 각 단계의 첫 번째 컬럼 ID (세로 구분선 적용 대상)
export const STEP_FIRST_COLUMN_IDS = [1, 5, 12, 16, 23]; // 구조분석, 기능분석, 고장분석, 리스크분석, 최적화

// ============ 컬럼 정의 ============
export interface ColumnDef {
  id: number;
  step: string;
  group: string;
  name: string;
  width: number;
  headerColor: string;
  cellColor: string;
  cellAltColor: string;
  align: 'left' | 'center' | 'right';
  isRPN?: boolean;
  isDark?: boolean;
}

// 기본화면 35컬럼 (RPN 제외)
export const COLUMNS_BASE: ColumnDef[] = [
  // ■ 2단계: 구조분석 (4컬럼)
  {
    id: 1, step: '구조분석', group: '1. 완제품 공정명', name: '완제품 공정명', width: 160,
    headerColor: COLORS.structure.product.headerLight, cellColor: COLORS.structure.product.cell, cellAltColor: COLORS.structure.product.cellAlt, align: 'left'
  },
  {
    id: 2, step: '구조분석', group: '2. 메인 공정명', name: 'NO+공정명', width: 140,
    headerColor: COLORS.structure.main.headerLight, cellColor: COLORS.structure.main.cell, cellAltColor: COLORS.structure.main.cellAlt, align: 'left'
  },
  {
    id: 3, step: '구조분석', group: '3. 작업 요소명', name: '4M', width: 50,
    headerColor: COLORS.structure.m4.headerLight, cellColor: COLORS.structure.m4.cell, cellAltColor: COLORS.structure.m4.cellAlt, align: 'center'
  },
  {
    id: 4, step: '구조분석', group: '3. 작업 요소명', name: '작업요소', width: 140,
    headerColor: COLORS.structure.workElement.headerLight, cellColor: COLORS.structure.workElement.cell, cellAltColor: COLORS.structure.workElement.cellAlt, align: 'left'
  },

  // ■ 3단계: 기능분석 (7컬럼)
  {
    id: 5, step: '기능분석', group: '1. 완제품 공정기능/요구사항', name: '구분', width: 50,
    headerColor: COLORS.function.division.headerLight, cellColor: COLORS.function.division.cell, cellAltColor: COLORS.function.division.cellAlt, align: 'center'
  },
  {
    id: 6, step: '기능분석', group: '1. 완제품 공정기능/요구사항', name: '완제품기능', width: 170,
    headerColor: COLORS.function.productFunc.headerLight, cellColor: COLORS.function.productFunc.cell, cellAltColor: COLORS.function.productFunc.cellAlt, align: 'left'
  },
  {
    id: 7, step: '기능분석', group: '1. 완제품 공정기능/요구사항', name: '요구사항', width: 160,
    headerColor: COLORS.function.requirement.headerLight, cellColor: COLORS.function.requirement.cell, cellAltColor: COLORS.function.requirement.cellAlt, align: 'left'
  },
  {
    id: 8, step: '기능분석', group: '2. 메인공정기능 및 제품특성', name: '공정 기능', width: 140,
    headerColor: COLORS.function.processFunc.headerLight, cellColor: COLORS.function.processFunc.cell, cellAltColor: COLORS.function.processFunc.cellAlt, align: 'left'
  },
  {
    id: 9, step: '기능분석', group: '2. 메인공정기능 및 제품특성', name: '제품특성', width: 110,
    headerColor: COLORS.function.productChar.headerLight, cellColor: COLORS.function.productChar.cell, cellAltColor: COLORS.function.productChar.cellAlt, align: 'left'
  },
  {
    id: 10, step: '기능분석', group: '3. 작업요소 기능 및 공정특성', name: '작업요소 기능', width: 140,
    headerColor: COLORS.function.workFunc.headerLight, cellColor: COLORS.function.workFunc.cell, cellAltColor: COLORS.function.workFunc.cellAlt, align: 'left'
  },
  {
    id: 11, step: '기능분석', group: '3. 작업요소 기능 및 공정특성', name: '공정특성', width: 110,
    headerColor: COLORS.function.processChar.headerLight, cellColor: COLORS.function.processChar.cell, cellAltColor: COLORS.function.processChar.cellAlt, align: 'left'
  },

  // ■ 4단계: 고장분석 (4컬럼)
  {
    id: 12, step: '고장분석', group: '1. 고장영향(FE)', name: '고장영향(FE)', width: 160,
    headerColor: COLORS.failure.fe.headerLight, cellColor: COLORS.failure.fe.cell, cellAltColor: COLORS.failure.fe.cellAlt, align: 'left'
  },
  {
    id: 13, step: '고장분석', group: '1. 고장영향(FE)', name: '심각도(S)', width: 50,
    headerColor: '#a5d6a7', cellColor: '#e8f5e9', cellAltColor: '#c8e6c9', align: 'center'
  },
  {
    id: 14, step: '고장분석', group: '2. 고장형태(FM)', name: '고장형태(FM)', width: 155,
    headerColor: COLORS.failure.fm.headerLight, cellColor: '#c8e6c9', cellAltColor: '#b2dfb4', align: 'left', isDark: true
  },
  {
    id: 15, step: '고장분석', group: '3. 고장원인(FC)', name: '고장원인(FC)', width: 160,
    headerColor: COLORS.failure.fc.headerLight, cellColor: COLORS.failure.fc.cell, cellAltColor: COLORS.failure.fc.cellAlt, align: 'left'
  },

  // ■ 5단계: 리스크분석 (7컬럼)
  {
    id: 16, step: '리스크분석', group: '1. 현재 예방관리', name: '예방관리(PC)', width: 140,
    headerColor: COLORS.risk.prevention.headerLight, cellColor: COLORS.risk.prevention.cell, cellAltColor: COLORS.risk.prevention.cellAlt, align: 'left'
  },
  {
    id: 17, step: '리스크분석', group: '1. 현재 예방관리', name: '발생도(O)', width: 50,
    headerColor: COLORS.risk.prevention.headerLight, cellColor: COLORS.risk.prevention.cell, cellAltColor: COLORS.risk.prevention.cellAlt, align: 'center'
  },
  {
    id: 18, step: '리스크분석', group: '2. 현재 검출관리', name: '검출관리(DC)', width: 140,
    headerColor: COLORS.risk.detection.headerLight, cellColor: COLORS.risk.detection.cell, cellAltColor: COLORS.risk.detection.cellAlt, align: 'left'
  },
  {
    id: 19, step: '리스크분석', group: '2. 현재 검출관리', name: '검출도(D)', width: 50,
    headerColor: COLORS.risk.detection.headerLight, cellColor: COLORS.risk.detection.cell, cellAltColor: COLORS.risk.detection.cellAlt, align: 'center'
  },
  {
    id: 20, step: '리스크분석', group: '3. 리스크 평가', name: 'AP', width: 30,
    headerColor: COLORS.risk.evaluation.headerLight, cellColor: COLORS.risk.evaluation.cell, cellAltColor: COLORS.risk.evaluation.cellAlt, align: 'center'
  },
  {
    id: 21, step: '리스크분석', group: '3. 리스크 평가', name: '특별특성(SC)', width: 50,
    headerColor: COLORS.risk.evaluation.headerLight, cellColor: COLORS.risk.evaluation.cell, cellAltColor: COLORS.risk.evaluation.cellAlt, align: 'center'
  },
  {
    id: 22, step: '리스크분석', group: '3. 리스크 평가', name: 'LLD', width: 65,
    headerColor: COLORS.risk.evaluation.headerLight, cellColor: COLORS.risk.evaluation.cell, cellAltColor: COLORS.risk.evaluation.cellAlt, align: 'left'
  },

  // ■ 6단계: 최적화 (13컬럼)
  {
    id: 23, step: '최적화', group: '1. 계획', name: '예방관리개선', width: 140,
    headerColor: COLORS.optimization.prevention.headerLight, cellColor: COLORS.optimization.prevention.cell, cellAltColor: COLORS.optimization.prevention.cellAlt, align: 'left'
  },
  {
    id: 24, step: '최적화', group: '1. 계획', name: '검출관리개선', width: 140,
    headerColor: COLORS.optimization.detection.headerLight, cellColor: COLORS.optimization.detection.cell, cellAltColor: COLORS.optimization.detection.cellAlt, align: 'left'
  },
  {
    id: 25, step: '최적화', group: '1. 계획', name: '책임자성명', width: 80,
    headerColor: COLORS.optimization.person.headerLight, cellColor: COLORS.optimization.person.cell, cellAltColor: COLORS.optimization.person.cellAlt, align: 'center'
  },
  {
    id: 26, step: '최적화', group: '1. 계획', name: '목표완료일자', width: 70,
    headerColor: COLORS.optimization.date.headerLight, cellColor: COLORS.optimization.date.cell, cellAltColor: COLORS.optimization.date.cellAlt, align: 'center'
  },
  {
    id: 27, step: '최적화', group: '1. 계획', name: '상태', width: 50,
    headerColor: COLORS.optimization.status.headerLight, cellColor: COLORS.optimization.status.cell, cellAltColor: COLORS.optimization.status.cellAlt, align: 'center'
  },
  {
    id: 28, step: '최적화', group: '2. 모니터링', name: '개선결과근거', width: 100,
    headerColor: COLORS.optimization.result.headerLight, cellColor: COLORS.optimization.result.cell, cellAltColor: COLORS.optimization.result.cellAlt, align: 'left'
  },
  {
    id: 29, step: '최적화', group: '2. 모니터링', name: '완료일자', width: 70,
    headerColor: COLORS.optimization.complete.headerLight, cellColor: COLORS.optimization.complete.cell, cellAltColor: COLORS.optimization.complete.cellAlt, align: 'center'
  },
  {
    id: 30, step: '최적화', group: '3. 효과 평가', name: '심각도(S)', width: 50,
    headerColor: COLORS.optimization.severity.headerLight, cellColor: COLORS.optimization.severity.cell, cellAltColor: COLORS.optimization.severity.cellAlt, align: 'center'
  },
  {
    id: 31, step: '최적화', group: '3. 효과 평가', name: '발생도(O)', width: 50,
    headerColor: COLORS.optimization.occurrence.headerLight, cellColor: COLORS.optimization.occurrence.cell, cellAltColor: COLORS.optimization.occurrence.cellAlt, align: 'center'
  },
  {
    id: 32, step: '최적화', group: '3. 효과 평가', name: '검출도(D)', width: 50,
    headerColor: COLORS.optimization.detection2.headerLight, cellColor: COLORS.optimization.detection2.cell, cellAltColor: COLORS.optimization.detection2.cellAlt, align: 'center'
  },
  {
    id: 33, step: '최적화', group: '3. 효과 평가', name: '특별특성(SC)', width: 50,
    headerColor: COLORS.optimization.special.headerLight, cellColor: COLORS.optimization.special.cell, cellAltColor: COLORS.optimization.special.cellAlt, align: 'center'
  },
  {
    id: 34, step: '최적화', group: '3. 효과 평가', name: 'AP', width: 30,
    headerColor: COLORS.optimization.ap.headerLight, cellColor: COLORS.optimization.ap.cell, cellAltColor: COLORS.optimization.ap.cellAlt, align: 'center'
  },
  {
    id: 35, step: '최적화', group: '3. 효과 평가', name: '비고', width: 80,
    headerColor: COLORS.optimization.note.headerLight, cellColor: COLORS.optimization.note.cell, cellAltColor: COLORS.optimization.note.cellAlt, align: 'left'
  },
];

// ============ DFMEA 라벨 매핑 (구조/기능 영역만) ============

/** PFMEA→DFMEA 그룹명 매핑 */
const PFMEA_TO_DFMEA_GROUP: Record<string, string> = {
  '1. 완제품 공정명': '1. 최상위 시스템명',
  '2. 메인 공정명': '2. 초점요소명',
  '3. 작업 요소명': '3. 부품(컴포넌트)명',
  '1. 완제품 공정기능/요구사항': '1. 시스템 기능/요구사항',
  '2. 메인공정기능 및 제품특성': '2. 초점요소 기능 및 제품특성',
  '3. 작업요소 기능 및 공정특성': '3. 부품 기능 및 설계특성',
};

/** PFMEA→DFMEA 컬럼명 매핑 */
const PFMEA_TO_DFMEA_NAME: Record<string, string> = {
  '완제품 공정명': '시스템명',
  'NO+공정명': 'NO+초점요소',
  '4M': 'Type',
  '작업요소': '부품',
  '완제품기능': '시스템기능',
  '공정 기능': '초점요소기능',
  '작업요소 기능': '부품기능',
  '공정특성': '설계특성',
};

/** DFMEA용 컬럼 정의 (COLUMNS_BASE에서 라벨만 교체) */
export function getColumnsForModule(isDfmea: boolean): ColumnDef[] {
  if (!isDfmea) return COLUMNS_BASE;
  return COLUMNS_BASE.map(col => ({
    ...col,
    group: PFMEA_TO_DFMEA_GROUP[col.group] || col.group,
    name: PFMEA_TO_DFMEA_NAME[col.name] || col.name,
  }));
}

// 단계별 메인 색상 (1행 헤더용)
export const STEP_COLORS: Record<string, string> = {
  '구조분석': '#1976d2',
  '기능분석': '#388e3c',
  '고장분석': '#f57c00',
  '리스크분석': '#1976d2',  // ★ 남색(#1a237e) → 파란색(#1976d2)
  '최적화': '#558b2f',
};

// 단계명 → 표시용 텍스트 (단계 번호 포함)
export const STEP_LABELS: Record<string, string> = {
  '구조분석': '2단계 구조분석(2ST Structure)',
  '기능분석': '3단계 기능분석(3ST Function)',
  '고장분석': '4단계 고장분석(4ST Failure)',
  '리스크분석': '5단계 리스크분석(5ST Risk)',
  '최적화': '6단계 최적화(6ST Optimization)',
};

// RPN 컬럼 (옵션)
export const RPN_COLUMNS: ColumnDef[] = [
  {
    id: 0, step: '리스크분석', group: '3. 리스크 평가', name: 'RPN', width: 40,
    headerColor: COLORS.risk.evaluation.headerLight, cellColor: COLORS.risk.evaluation.cell, cellAltColor: COLORS.risk.evaluation.cellAlt, align: 'center', isRPN: true, isDark: true
  },
  {
    id: 0, step: '최적화', group: '3. 효과 평가', name: 'RPN', width: 40,
    headerColor: COLORS.optimization.evaluation.headerLight, cellColor: COLORS.optimization.evaluation.cell, cellAltColor: COLORS.optimization.evaluation.cellAlt, align: 'center', isRPN: true
  },
];

// 옵션화면용 37컬럼 생성 함수
export function getColumnsWithRPN(): ColumnDef[] {
  const columns = [...COLUMNS_BASE];
  const riskRpnIdx = columns.findIndex(c => c.id === 21);
  columns.splice(riskRpnIdx, 0, { ...RPN_COLUMNS[0], id: 21 });
  for (let i = riskRpnIdx; i < columns.length; i++) {
    columns[i] = { ...columns[i], id: i + 1 };
  }
  const optRpnIdx = columns.findIndex(c => c.name === '비고' && c.step === '최적화');
  columns.splice(optRpnIdx, 0, { ...RPN_COLUMNS[1], id: optRpnIdx + 1 });
  for (let i = optRpnIdx; i < columns.length; i++) {
    columns[i] = { ...columns[i], id: i + 1 };
  }
  return columns;
}

// ============ 1행 (단계) colSpan 계산 ============
export interface StepSpan {
  step: string;
  colSpan: number;
  color: string;
}

export function calculateStepSpans(columns: ColumnDef[]): StepSpan[] {
  const spans: StepSpan[] = [];
  let currentStep = '';
  let currentSpan = 0;

  columns.forEach((col, idx) => {
    if (col.step !== currentStep) {
      if (currentSpan > 0) {
        spans.push({ step: currentStep, colSpan: currentSpan, color: STEP_COLORS[currentStep] || '#666' });
      }
      currentStep = col.step;
      currentSpan = 1;
    } else {
      currentSpan++;
    }

    if (idx === columns.length - 1) {
      spans.push({ step: currentStep, colSpan: currentSpan, color: STEP_COLORS[currentStep] || '#666' });
    }
  });

  return spans;
}

// ============ 2행 (분류) colSpan 계산 ============
export interface GroupSpan {
  group: string;
  colSpan: number;
  color: string;
  isDark?: boolean;
  startColId: number;  // ★ 2026-01-11: 단계 구분선용
}

export function calculateGroupSpans(columns: ColumnDef[]): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let currentGroup = '';
  let currentSpan = 0;
  let currentColor = '';
  let currentIsDark = false;
  let currentStartColId = 0;

  columns.forEach((col, idx) => {
    if (col.group !== currentGroup) {
      if (currentSpan > 0) {
        spans.push({ group: currentGroup, colSpan: currentSpan, color: currentColor, isDark: currentIsDark, startColId: currentStartColId });
      }
      currentGroup = col.group;
      currentSpan = 1;
      currentColor = col.headerColor;
      currentIsDark = col.isDark || false;
      currentStartColId = col.id;  // ★ 그룹 시작 컬럼 ID 저장
    } else {
      currentSpan++;
    }

    if (idx === columns.length - 1) {
      spans.push({ group: currentGroup, colSpan: currentSpan, color: currentColor, isDark: currentIsDark, startColId: currentStartColId });
    }
  });

  return spans;
}



