/**
 * @file FailureLinkStyles.ts
 * @description FailureLinkTab 전용 스타일 함수 (인라인 스타일 제거)
 */

import type { CSSProperties } from 'react';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/app/dfmea/worksheet/constants';

/** 메인 컨테이너 */
export const containerStyle: CSSProperties = {
  display: 'flex',
  height: '100%',
  overflow: 'hidden',
  background: COLORS.bg,
};

/** 우측 패널 컨테이너 */
export const rightPanelStyle: CSSProperties = {
  flex: '40',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

/** 우측 패널 헤더 */
export const rightHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '4px 8px',
  background: COLORS.failure.light,
  borderBottom: `1px solid ${COLORS.line}`,
  gap: '4px',
};

/** 모드 토글 버튼 */
export const modeButtonStyle = (isActive: boolean): CSSProperties => ({
  padding: '4px 10px',
  fontSize: FONT_SIZES.header2,
  fontWeight: FONT_WEIGHTS.semibold,
  border: '1px solid #1976d2',
  borderRadius: '3px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  background: isActive ? '#1976d2' : '#fff',
  color: isActive ? '#fff' : '#1976d2',
});

/** 분석결과 버튼 (유동적 너비) */
export const resultButtonStyle = (isActive: boolean): CSSProperties => ({
  flex: 1,
  padding: '4px 8px',
  fontSize: FONT_SIZES.header2,
  fontWeight: FONT_WEIGHTS.semibold,
  border: '1px solid #1976d2',
  borderRadius: '3px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  minWidth: 0,
  background: isActive ? '#1976d2' : '#fff',
  color: isActive ? '#fff' : '#1976d2',
});

/** FMEA 이름 표시 영역 */
export const fmeaNameStyle: CSSProperties = {
  flex: 1,
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
  color: '#333',
  padding: '4px 8px',
  background: '#fff',
  border: '1px solid #ccc',
  borderRadius: '3px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** 상단 버튼 그룹 컨테이너 */
export const actionButtonGroupStyle: CSSProperties = {
  display: 'flex',
  gap: '3px',
  flexShrink: 0,
};

/** 기능 버튼 (연결확정, 수정, 역전개, 초기화 등) */
export const actionButtonStyle = (options: { bg: string; color: string; border?: string; opacity?: number; cursor?: string }): CSSProperties => ({
  padding: '4px 8px',
  fontSize: FONT_SIZES.header2,
  fontWeight: FONT_WEIGHTS.semibold,
  border: options.border || '1px solid #999',
  borderRadius: '3px',
  cursor: options.cursor || 'pointer',
  background: options.bg,
  color: options.color,
  opacity: options.opacity ?? 1,
  whiteSpace: 'nowrap',
});

/** 다이어그램 영역 */
export const diagramAreaStyle: CSSProperties = {
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '15px',
  position: 'relative',
};

/** SVG 캔버스 */
export const svgCanvasStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
};

/** 다이어그램 폴백 (선택 전) */
export const diagramFallbackStyle: CSSProperties = {
  color: '#999',
  fontSize: FONT_SIZES.pageHeader,
  textAlign: 'center',
};

/** 다이어그램 메인 콘텐츠 */
export const diagramMainStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  position: 'relative',
  zIndex: 2,
};

/** 다이어그램 라벨 행 */
export const diagramLabelRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr 110px 1fr 110px',
  width: '100%',
  marginBottom: '8px',
};

/** 다이어그램 라벨 */
export const diagramLabelStyle: CSSProperties = {
  textAlign: 'center',
  fontWeight: FONT_WEIGHTS.semibold,
  fontSize: FONT_SIZES.header1,
  color: COLORS.failure.text,
  background: COLORS.failure.light,
  padding: '3px 0',
  borderRadius: '3px',
};

/** 다이어그램 카드 그리드 */
export const diagramGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr 110px 1fr 110px',
  width: '100%',
  flex: 1,
  gap: 0,
};

/** 다이어그램 카드 컬럼 (FE/FM/FC) */
export const diagramColumnStyle = (align: 'flex-start' | 'center' | 'flex-end'): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: align,
  justifyContent: 'center',
  gap: '4px',
});

/** 다이어그램 카드 아이템 */
export const diagramCardStyle = (width: string, options?: { border?: string }): CSSProperties => ({
  background: '#fff',
  border: options?.border || `2px solid ${COLORS.failure.dark}`,
  borderRadius: '4px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  width,
  overflow: 'hidden',
  fontSize: FONT_SIZES.small,
});

/** 카드 헤더 */
export const cardHeaderStyle = (options?: { borderBottom?: string }): CSSProperties => ({
  padding: '3px 6px',
  fontWeight: FONT_WEIGHTS.semibold,
  background: COLORS.failure.light,
  color: COLORS.failure.text,
  textAlign: 'center',
  ...(options?.borderBottom && { borderBottom: options.borderBottom }),
});

/** 카드 본문 */
export const cardBodyStyle = (options?: { fontWeight?: number }): CSSProperties => ({
  padding: '4px 6px',
  lineHeight: 1.3,
  color: '#333',
  textAlign: 'center',
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
});

/** 결과 테이블 컨테이너 */
export const resultTableContainer: CSSProperties = {
  padding: '8px',
  height: '100%',
  overflowY: 'auto',
};

/** 결과 테이블 상단 헤더 셀 */
export const resultTableHeaderStyle = (bg: string, options?: { width?: string; verticalAlign?: string }): CSSProperties => ({
  background: bg,
  color: 'white',
  padding: '6px',
  textAlign: 'center',
  fontWeight: FONT_WEIGHTS.semibold,
  border: `1px solid ${COLORS.line}`,
  ...(options?.width && { width: options.width }),
  ...(options?.verticalAlign && { verticalAlign: options.verticalAlign }),
});

/** 결과 테이블 통계 푸터 */
export const resultFooterStyle: CSSProperties = {
  marginTop: '10px',
  padding: '8px',
  background: '#f5f5f5',
  borderRadius: '4px',
  fontSize: FONT_SIZES.header1,
  color: '#666',
};

// --- 기존 스타일 유지/보강 ---
const BORDER_GRAY = '1px solid #ccc';

export const panelStyle = (borderColor: string): CSSProperties => ({
  flex: '0 0 25%',
  border: `2px solid ${borderColor}`,
  borderRadius: '4px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

export const panelHeaderStyle = (bg: string): CSSProperties => ({
  padding: '6px 8px',
  fontWeight: FONT_WEIGHTS.semibold,
  fontSize: FONT_SIZES.cell,
  background: bg,
  color: 'white',
  textAlign: 'center',
});

export const thStyle = (bg: string, width?: string, options?: { whiteSpace?: string }): CSSProperties => ({
  width,
  background: bg,
  padding: '4px',
  border: BORDER_GRAY,
  position: 'sticky',
  top: 0,
  fontWeight: FONT_WEIGHTS.semibold,
  ...(options?.whiteSpace && { whiteSpace: options.whiteSpace }),
});

export const tdStyle = (bg: string, border: string, options?: { fontSize?: string; verticalAlign?: string; color?: string; fontWeight?: number; padding?: string }): CSSProperties => ({
  padding: options?.padding || '4px',
  border,
  background: bg,
  ...(options?.fontSize && { fontSize: options.fontSize }),
  ...(options?.verticalAlign && { verticalAlign: options.verticalAlign }),
  ...(options?.color && { color: options.color }),
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
});

export const tdCenterStyle = (bg: string, border: string, color = 'inherit', options?: { fontSize?: string; whiteSpace?: string; verticalAlign?: string; padding?: string }): CSSProperties => ({
  ...tdStyle(bg, border, options),
  textAlign: 'center',
  fontWeight: FONT_WEIGHTS.semibold,
  color,
  ...(options?.whiteSpace && { whiteSpace: options.whiteSpace }),
  ...(options?.padding && { padding: options.padding }),
});

/** Flex 컨테이너 스타일 */
export const flexContainerStyle = (flex: string, border: string): CSSProperties => ({
  flex,
  border,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
});

/** 헤더 스타일 */
export const headerStyle = (bg: string, borderBottom: string, fontSize: string): CSSProperties => ({
  background: bg,
  borderBottom,
  fontSize,
});

/** 패널 스타일 (Flex 포함) */
export const panelStyleWithFlex = (flex: string, borderColor: string): CSSProperties => ({
  flex,
  border: `2px solid ${borderColor}`,
  borderRadius: '4px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

/** 스크롤 영역 스타일 */
export const scrollAreaStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
};

/** 테이블 Full 스타일 */
export const tableFullStyle = (fontSize: string): CSSProperties => ({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize,
});
