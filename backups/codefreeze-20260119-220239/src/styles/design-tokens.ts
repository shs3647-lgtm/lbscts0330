/**
 * @file design-tokens.ts
 * @description 디자인 시스템 공용 상수 - Smart System 전체 표준화
 * @version 1.0.0
 * @created 2025-12-26
 * @ref DESIGN_STANDARD.md, DESIGN_GUIDE.md
 */

// =====================================================
// 색상 팔레트 (Colors)
// =====================================================
export const COLORS = {
  // 헤더/테이블 헤더
  HEADER_BG: '#00587a',
  HEADER_TEXT: '#ffffff',
  
  // 테이블 셀
  LABEL_BG: '#b8e0e9',           // 연한 청록 (라벨 셀)
  LABEL_TEXT: '#333333',
  SCHEDULE_LABEL_BG: '#c8e6c9',  // 연한 초록 (일정 라벨)
  CELL_BG: '#ffffff',
  CELL_BG_ALT: '#e0f2fb',        // 짝수 행 배경
  CELL_BORDER: '#999999',
  
  // 일정 라벨 (그라데이션)
  SCHEDULE_PROTO: '#a5d6a7',
  SCHEDULE_P1: '#81d4fa',
  SCHEDULE_P2: '#80deea',
  SCHEDULE_PPAP: '#4db6ac',
  SCHEDULE_SOP: '#66bb6a',
  SCHEDULE_END: '#ffb74d',
  
  // 버튼
  BTN_PRIMARY: '#1976d2',
  BTN_SAVE: '#10b981',
  BTN_LOAD: '#f59e0b',
  BTN_DELETE: '#ef4444',
  BTN_CANCEL: '#6b7280',
  BTN_ADD: '#22c55e',
  
  // 상태 배지
  BADGE_HIGH: '#ef4444',
  BADGE_MEDIUM: '#f59e0b',
  BADGE_LOW: '#22c55e',
  
  // 페이지 배경
  PAGE_BG: '#f5f5f5',
  CARD_BG: '#ffffff',
  
  // 구분 셀 (승인권자 등)
  ROLE_BG: '#bbdefb',
  EMAIL_BG: '#e8f5e9',
} as const;

// =====================================================
// 크기 상수 (Sizes)
// =====================================================
export const SIZES = {
  // 테이블 행 높이
  ROW_HEIGHT: '28px',
  ROW_HEIGHT_SM: '24px',
  ROW_HEIGHT_LG: '32px',
  
  // 폰트 크기
  FONT_XS: '10px',
  FONT_SM: '11px',
  FONT_BASE: '12px',
  FONT_MD: '13px',
  FONT_LG: '14px',
  FONT_XL: '16px',
  FONT_2XL: '18px',
  
  // 패딩
  CELL_PADDING: '4px 8px',
  CELL_PADDING_SM: '2px 4px',
  CELL_PADDING_LG: '6px 12px',
  
  // 보더
  BORDER_RADIUS: '8px',
  BORDER_RADIUS_SM: '4px',
  BORDER_RADIUS_LG: '12px',
} as const;

// =====================================================
// 테이블 스타일 (Table Styles)
// =====================================================
export const TABLE_STYLES = {
  // 헤더 셀
  headerCell: {
    background: COLORS.HEADER_BG,
    color: COLORS.HEADER_TEXT,
    border: `1px solid ${COLORS.CELL_BORDER}`,
    padding: SIZES.CELL_PADDING,
    fontWeight: 600,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    height: SIZES.ROW_HEIGHT,
    fontSize: SIZES.FONT_SM,
  },
  
  // 라벨 셀 (항목명)
  labelCell: {
    background: COLORS.LABEL_BG,
    color: COLORS.LABEL_TEXT,
    border: `1px solid ${COLORS.CELL_BORDER}`,
    padding: SIZES.CELL_PADDING,
    fontWeight: 600,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    height: SIZES.ROW_HEIGHT,
    fontSize: SIZES.FONT_SM,
  },
  
  // 데이터 셀
  dataCell: {
    background: COLORS.CELL_BG,
    border: `1px solid ${COLORS.CELL_BORDER}`,
    padding: SIZES.CELL_PADDING_SM,
    height: SIZES.ROW_HEIGHT,
    fontSize: SIZES.FONT_SM,
  },
  
  // 데이터 셀 (짝수 행)
  dataCellAlt: {
    background: COLORS.CELL_BG_ALT,
    border: `1px solid ${COLORS.CELL_BORDER}`,
    padding: SIZES.CELL_PADDING_SM,
    height: SIZES.ROW_HEIGHT,
    fontSize: SIZES.FONT_SM,
  },
  
  // 테이블 래퍼
  tableWrapper: {
    borderRadius: SIZES.BORDER_RADIUS,
    overflow: 'hidden' as const,
    border: `1px solid ${COLORS.CELL_BORDER}`,
  },
  
  // 테이블 기본
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    tableLayout: 'fixed' as const,
    fontFamily: '"Malgun Gothic", sans-serif',
  },
} as const;

// =====================================================
// 버튼 스타일 (Button Styles)
// =====================================================
export const BUTTON_STYLES = {
  // 기본 버튼
  base: {
    padding: '6px 16px',
    borderRadius: SIZES.BORDER_RADIUS_SM,
    fontSize: SIZES.FONT_BASE,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
  },
  
  // Primary 버튼 (저장)
  primary: {
    background: COLORS.BTN_SAVE,
    color: '#ffffff',
  },
  
  // Secondary 버튼 (불러오기)
  secondary: {
    background: COLORS.BTN_LOAD,
    color: '#ffffff',
  },
  
  // Danger 버튼 (삭제)
  danger: {
    background: COLORS.BTN_DELETE,
    color: '#ffffff',
  },
  
  // Ghost 버튼 (취소, 새로고침)
  ghost: {
    background: '#ffffff',
    color: '#666666',
    border: '1px solid #cccccc',
  },
  
  // 행 추가 버튼
  add: {
    background: '#e8f5e9',
    color: '#2e7d32',
    border: '1px solid #81c784',
  },
  
  // 소형 버튼
  small: {
    padding: '4px 12px',
    fontSize: SIZES.FONT_SM,
  },
} as const;

// =====================================================
// 입력 필드 스타일 (Input Styles)
// =====================================================
export const INPUT_STYLES = {
  // 기본 입력
  base: {
    width: '100%',
    height: '24px',
    border: 'none',
    background: 'transparent',
    fontSize: SIZES.FONT_SM,
    outline: 'none',
    padding: '0 4px',
  },
  
  // 중앙 정렬 입력
  centered: {
    textAlign: 'center' as const,
  },
  
  // 플레이스홀더 색상
  placeholder: {
    color: '#999999',
  },
} as const;

// =====================================================
// 섹션 스타일 (Section Styles)
// =====================================================
export const SECTION_STYLES = {
  // 섹션 헤더
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  
  // 섹션 타이틀
  title: {
    fontSize: SIZES.FONT_MD,
    fontWeight: 600,
    color: '#333333',
  },
  
  // 섹션 아이콘
  icon: {
    fontSize: SIZES.FONT_LG,
  },
} as const;

// =====================================================
// 레이아웃 스타일 (Layout Styles)
// =====================================================
export const LAYOUT_STYLES = {
  // 페이지 컨테이너
  page: {
    background: COLORS.PAGE_BG,
    minHeight: '100%',
    padding: '8px 12px',
    fontFamily: '"Malgun Gothic", sans-serif',
  },
  
  // 카드
  card: {
    background: COLORS.CARD_BG,
    borderRadius: SIZES.BORDER_RADIUS,
    padding: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  
  // 상태바
  statusBar: {
    marginTop: '8px',
    padding: '6px 12px',
    background: '#ffffff',
    borderRadius: SIZES.BORDER_RADIUS_SM,
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: SIZES.FONT_SM,
    color: '#666666',
    border: '1px solid #e0e0e0',
  },
} as const;

// =====================================================
// 유틸리티 함수
// =====================================================

/** 일정 라벨 색상 가져오기 */
export function getScheduleColor(type: string): string {
  const colors: Record<string, string> = {
    proto: COLORS.SCHEDULE_PROTO,
    p1: COLORS.SCHEDULE_P1,
    p2: COLORS.SCHEDULE_P2,
    ppap: COLORS.SCHEDULE_PPAP,
    sop: COLORS.SCHEDULE_SOP,
    end: COLORS.SCHEDULE_END,
  };
  return colors[type.toLowerCase()] || COLORS.LABEL_BG;
}

/** 버튼 스타일 병합 */
export function getButtonStyle(
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'add' = 'primary',
  size: 'base' | 'small' = 'base'
): React.CSSProperties {
  return {
    ...BUTTON_STYLES.base,
    ...BUTTON_STYLES[variant],
    ...(size === 'small' ? BUTTON_STYLES.small : {}),
  };
}

/** 테이블 셀 스타일 (행 인덱스 기반 교대 배경) */
export function getDataCellStyle(rowIndex: number): React.CSSProperties {
  return rowIndex % 2 === 0 ? TABLE_STYLES.dataCell : TABLE_STYLES.dataCellAlt;
}

export default {
  COLORS,
  SIZES,
  TABLE_STYLES,
  BUTTON_STYLES,
  INPUT_STYLES,
  SECTION_STYLES,
  LAYOUT_STYLES,
  getScheduleColor,
  getButtonStyle,
  getDataCellStyle,
};

