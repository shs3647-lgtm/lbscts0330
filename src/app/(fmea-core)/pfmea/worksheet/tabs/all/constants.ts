/**
 * @file constants.ts
 * @description AllTab 전용 색상 및 상수 정의
 */

export const BORDER = '1px solid #b0bec5';

/** 
 * 고급스럽고 차분한 색상 시스템
 * - 주황색: S, O, D, AP, RPN 핵심 지표에만 사용
 * - 일반 컬럼: 파란색, 네이비, 녹색 계열
 */
export const ALL_TAB_COLORS = {
  // 구조분석 (2단계) - 블루 계열
  structure: {
    main: '#1565c0',
    header: '#90caf9',
    cell: '#e3f2fd',
    l1: { h2: '#1976d2', h3: '#90caf9', cell: '#e3f2fd' },
    l2: { h2: '#3949ab', h3: '#9fa8da', cell: '#e8eaf6' },
    l3: { h2: '#388e3c', h3: '#a5d6a7', cell: '#e8f5e9' },
  },
  // 기능분석 (3단계) - 그린 계열
  function: {
    main: '#2e7d32',
    header: '#a5d6a7',
    cell: '#e8f5e9',
    l1: { h2: '#1e88e5', h3: '#90caf9', cell: '#e3f2fd' },
    l2: { h2: '#5c6bc0', h3: '#b3b9e8', cell: '#e8eaf6' },
    l3: { h2: '#43a047', h3: '#a5d6a7', cell: '#e8f5e9' },
  },
  // 고장분석 (4단계) - ★ 주황색 계열로 변경 (남색 → 주황)
  failure: {
    main: '#f57c00',  // ★ 남색(#1a237e) → 주황색(#f57c00)
    header: '#ffe0b2',
    cell: '#fff3e0',
    l1: { h2: '#1976d2', h3: '#90caf9', cell: '#e3f2fd' },
    l2: { h2: '#388e3c', h3: '#a5d6a7', cell: '#e8f5e9' },
    l3: { h2: '#f57c00', h3: '#ffe0b2', cell: '#fff3e0' },
  },
  // 리스크분석 (5단계) - ★ 파란색 계열로 변경 (남색 → 파랑)
  risk: {
    main: '#1976d2',  // ★ 남색(#1a237e) → 파란색(#1976d2)
    prevention: { header: '#90caf9', h2: '#1976d2', h3: '#90caf9', cell: '#e3f2fd' },  // ★ L1 파란색
    detection: { header: '#a5d6a7', h2: '#388e3c', h3: '#a5d6a7', cell: '#e8f5e9' },   // ★ L2 녹색
    evaluation: { header: '#ffe0b2', h2: '#f57c00', h3: '#ffe0b2', cell: '#fff3e0' },  // ★ L3 주황색
  },
  // 최적화 (6단계) - 그린 계열
  opt: {
    main: '#1b5e20',
    plan: { header: '#81c784', h2: '#2e7d32', h3: '#81c784', cell: '#e8f5e9' },
    monitor: { header: '#a5d6a7', h2: '#388e3c', h3: '#a5d6a7', cell: '#f1f8e9' },
    effect: { header: '#c8e6c9', h2: '#43a047', h3: '#c8e6c9', cell: '#f9fbe7' }
  },
  // 핵심 지표 강조색
  indicator: {
    severity: { bg: '#ffccbc', text: '#bf360c' },
    occurrence: { bg: '#ffe0b2', text: '#e65100' },
    detection: { bg: '#fff3e0', text: '#ff6f00' },
    ap: { bg: '#fff8e1', text: '#ff8f00' },
    rpn: { bg: '#ffebee', text: '#c62828' },
    rpnHigh: { bg: '#ffcdd2', text: '#b71c1c' },
  },
  // 구분/4M 컬럼
  special: {
    scope: { h3: '#78909c', cell: '#eceff1' },
    m4: { h3: '#546e7a', cell: '#cfd8dc' },
  }
};

/** AP 색상 (배경=3레벨 주황, 글씨=H빨강/M노랑/L녹색) */
export const AP_COLORS: Record<'H' | 'M' | 'L' | '', { bg: string; text: string }> = {
  H: { bg: '#fff3e0', text: '#c62828' },  // ★ 배경=3레벨 연주황, 글씨=빨강
  M: { bg: '#fff3e0', text: '#f57f17' },  // ★ 배경=3레벨 연주황, 글씨=노랑
  L: { bg: '#fff3e0', text: '#2e7d32' },  // ★ 배경=3레벨 연주황, 글씨=녹색
  '': { bg: '#fff3e0', text: '#666' },    // 미입력
};

/** 컬럼 수 (단계별) */
export const COL_COUNTS = { 2: 4, 3: 8, 4: 6, 5: 8, 6: 14 };

/** Tailwind 클래스 정의 */
export const TW_CLASSES = {
  container: '', // ⚠️ 스크롤은 page.tsx에서 처리 - 여기서 overflow 제거
  table: 'border-collapse', // table-fixed 제거 - min-width가 적용되도록
  stickyHead: 'sticky top-0 z-20 bg-white border-b-2 border-black', // 헤더 고정, z-index 높임
};


