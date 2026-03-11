/**
 * @file typography.ts
 * @description FMEA 시스템 공통 타이포그래피 모듈
 * 
 * 표준 폰트 설정:
 * - 기본 폰트: Malgun Gothic (맑은 고딕)
 * - 선명도: antialiased
 * - All 화면 스타일 기준으로 표준화
 * 
 * @version 1.0.0
 * @created 2026-01-23
 */

// ============================================
// 폰트 패밀리 정의
// ============================================

/** 기본 폰트 스택 */
export const FONT_FAMILY = {
  /** 기본 폰트 (한글 최적화) */
  primary: '"Malgun Gothic", "맑은 고딕", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  /** 숫자/코드용 모노스페이스 */
  mono: '"Consolas", "Monaco", "Courier New", monospace',
  /** 시스템 기본 */
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;

// ============================================
// 폰트 사이즈 정의 (px)
// ============================================

export const FONT_SIZE = {
  /** 8px - 아주 작은 텍스트 */
  xs2: '8px',
  /** 9px - 매우 작은 텍스트 */
  xs: '9px',
  /** 10px - 작은 텍스트, 테이블 데이터 */
  sm: '10px',
  /** 11px - 기본 테이블 텍스트 (All 화면 기준) */
  base: '11px',
  /** 12px - 일반 텍스트 */
  md: '12px',
  /** 13px - 중간 크기 */
  lg: '13px',
  /** 14px - 헤더, 라벨 */
  xl: '14px',
  /** 16px - 큰 제목 */
  xl2: '16px',
  /** 18px - 섹션 제목 */
  xl3: '18px',
  /** 20px - 페이지 제목 */
  xl4: '20px',
} as const;

// ============================================
// 폰트 두께 정의
// ============================================

export const FONT_WEIGHT = {
  /** 300 - 가는 글씨 (선명, All 화면 데이터) */
  light: 300,
  /** 400 - 기본 (선명한 기본 스타일) */
  normal: 400,
  /** 500 - 약간 굵게 */
  medium: 500,
  /** 600 - 굵게 (헤더, 라벨) */
  semibold: 600,
  /** 700 - 매우 굵게 */
  bold: 700,
} as const;

// ============================================
// 줄 높이 정의
// ============================================

export const LINE_HEIGHT = {
  /** 1.0 - 촘촘한 */
  tight: 1.0,
  /** 1.2 - 테이블용 */
  snug: 1.2,
  /** 1.4 - 기본 */
  normal: 1.4,
  /** 1.5 - 읽기 편한 */
  relaxed: 1.5,
  /** 1.6 - 넉넉한 */
  loose: 1.6,
} as const;

// ============================================
// 선명도 스타일 (CSS-in-JS용)
// ============================================

/** 선명한 렌더링을 위한 CSS 속성 */
export const FONT_SMOOTHING = {
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'optimizeLegibility',
} as const;

// ============================================
// 사전 정의된 텍스트 스타일
// ============================================

/** 테이블 데이터 셀 스타일 (가장 선명, All 화면 기준) */
export const textStyles = {
  /** 테이블 데이터 - 가늘고 선명 */
  tableData: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.snug,
    ...FONT_SMOOTHING,
  },
  
  /** 테이블 헤더 */
  tableHeader: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.snug,
    ...FONT_SMOOTHING,
  },
  
  /** 테이블 라벨 (행/열 제목) */
  tableLabel: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: LINE_HEIGHT.snug,
    ...FONT_SMOOTHING,
  },
  
  /** 입력 필드 */
  input: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.normal,
    ...FONT_SMOOTHING,
  },
  
  /** 본문 텍스트 */
  body: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.relaxed,
    ...FONT_SMOOTHING,
  },
  
  /** 작은 설명 텍스트 */
  caption: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: LINE_HEIGHT.normal,
    ...FONT_SMOOTHING,
  },
  
  /** 페이지 제목 */
  pageTitle: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: FONT_SIZE.xl3,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.tight,
    ...FONT_SMOOTHING,
  },
  
  /** 섹션 제목 */
  sectionTitle: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.snug,
    ...FONT_SMOOTHING,
  },
  
  /** 버튼 텍스트 */
  button: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: LINE_HEIGHT.tight,
    ...FONT_SMOOTHING,
  },
  
  /** 배지/태그 */
  badge: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.tight,
    ...FONT_SMOOTHING,
  },
  
  /** 숫자 (S/O/D, RPN 등) */
  number: {
    fontFamily: FONT_FAMILY.primary,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: LINE_HEIGHT.tight,
    ...FONT_SMOOTHING,
  },
} as const;

// ============================================
// CSS 클래스명 (Tailwind 호환)
// ============================================

/** Tailwind CSS 클래스 조합 */
export const textClasses = {
  /** 테이블 데이터 */
  tableData: 'text-[11px] font-normal leading-snug',
  /** 테이블 헤더 */
  tableHeader: 'text-[10px] font-semibold leading-snug',
  /** 테이블 라벨 */
  tableLabel: 'text-[10px] font-medium leading-snug',
  /** 입력 필드 */
  input: 'text-[11px] font-normal leading-normal',
  /** 본문 */
  body: 'text-xs font-normal leading-relaxed',
  /** 작은 텍스트 */
  caption: 'text-[9px] font-normal leading-normal',
  /** 페이지 제목 */
  pageTitle: 'text-lg font-semibold leading-tight',
  /** 섹션 제목 */
  sectionTitle: 'text-sm font-semibold leading-snug',
  /** 버튼 */
  button: 'text-xs font-medium leading-tight',
  /** 배지 */
  badge: 'text-[9px] font-semibold leading-tight',
  /** 숫자 */
  number: 'text-[11px] font-medium leading-tight',
} as const;

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 인라인 스타일 객체를 반환 (CSS-in-JS용)
 * @param styleName - textStyles의 키
 * @returns CSSProperties 객체
 */
export function getTextStyle(styleName: keyof typeof textStyles): React.CSSProperties {
  return textStyles[styleName] as React.CSSProperties;
}

/**
 * 커스텀 텍스트 스타일 생성
 * @param overrides - 오버라이드할 속성
 * @returns CSSProperties 객체
 */
export function createTextStyle(overrides: Partial<typeof textStyles.body>): React.CSSProperties {
  return {
    ...textStyles.body,
    ...overrides,
  } as React.CSSProperties;
}

// ============================================
// 기본 내보내기
// ============================================

export default {
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  FONT_SMOOTHING,
  textStyles,
  textClasses,
  getTextStyle,
  createTextStyle,
};
