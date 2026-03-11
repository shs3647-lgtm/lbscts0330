/**
 * @file FailureLinkStyles.ts
 * @description FailureLinkTab 전용 스타일 함수 (인라인 스타일 제거)
 */

import type { CSSProperties } from 'react';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../../constants';

/** 메인 컨테이너 */
export const containerStyle: CSSProperties = {
  display: 'flex',
  height: '100%',
  overflow: 'hidden',
  background: COLORS.bg,
};

/** 우측 패널 컨테이너 - 175% 줌에서도 반응형 */
export const rightPanelStyle: CSSProperties = {
  flex: '1 1 40%',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  overflow: 'hidden',
};

/** 우측 패널 헤더 - 컴팩트 + 중앙 정렬 */
export const rightHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',  // ★ 중앙 정렬
  padding: '2px 6px',
  background: COLORS.failure.light,
  borderBottom: `1px solid ${COLORS.line}`,
  gap: '3px',
  flexWrap: 'wrap',
};

/** 모드 토글 버튼 - 컴팩트 */
export const modeButtonStyle = (isActive: boolean): CSSProperties => ({
  padding: '2px 6px',
  fontSize: '10px',
  fontWeight: FONT_WEIGHTS.semibold,
  border: '1px solid #1976d2',
  borderRadius: '3px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  background: isActive ? '#1976d2' : '#fff',
  color: isActive ? '#fff' : '#1976d2',
});

/** 분석결과 버튼 - 컴팩트 */
export const resultButtonStyle = (isActive: boolean): CSSProperties => ({
  flex: 2,
  padding: '2px 4px',
  fontSize: '9px',
  fontWeight: FONT_WEIGHTS.semibold,
  border: '1px solid #0d47a1',
  borderRadius: '3px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  overflow: 'visible',
  minWidth: 'fit-content',
  background: isActive ? '#0d47a1' : '#fff',
  color: isActive ? '#fff' : '#0d47a1',
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
  flexShrink: 1,
  flexWrap: 'wrap',
};

/** 기능 버튼 (연결확정, 수정, 역전개, 초기화 등) - 컴팩트 */
export const actionButtonStyle = (options: { bg: string; color: string; border?: string; opacity?: number; cursor?: string }): CSSProperties => ({
  padding: '2px 6px',
  fontSize: '10px',
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
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '15px',
  position: 'relative',
};

/** SVG 캔버스 — 카드 위에 렌더링 (z-index: 3) */
export const svgCanvasStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 3,
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
  position: 'relative',
  zIndex: 2,
};

/** 다이어그램 라벨 행 - 컴팩트 */
export const diagramLabelRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '90px 1fr 80px 1fr 90px',
  width: '100%',
  marginBottom: '6px',
};

/** FE/FM/FC 색상 정의 (워크시트와 통일) */
export const CHAIN_COLORS = {
  FE: { bg: '#1976d2', light: '#bbdefb', text: '#ffffff', border: '#1976d2' }, // 파란색 (1L 고장영향)
  FM: { bg: '#e65100', light: '#ffe0b2', text: '#ffffff', border: '#e65100' }, // 주황색 (2L 고장형태)
  FC: { bg: '#388e3c', light: '#c8e6c9', text: '#ffffff', border: '#388e3c' }, // 녹색 (3L 고장원인)
};

/** 다이어그램 라벨 (타입별 색상) - 컴팩트 */
export const diagramLabelStyle = (type?: 'FE' | 'FM' | 'FC'): CSSProperties => {
  const colors = type ? CHAIN_COLORS[type] : { bg: COLORS.failure.light, text: COLORS.failure.text };
  return {
    textAlign: 'center',
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: '10px',  // 더 작게
    color: type ? colors.text : colors.text,
    background: type ? colors.bg : colors.bg,
    padding: '2px 4px',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
  };
};

/** 다이어그램 카드 그리드 - 컴팩트 */
export const diagramGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '90px 1fr 80px 1fr 90px',
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

/** 다이어그램 카드 아이템 (타입별 색상) - 컴팩트 */
export const diagramCardStyle = (width: string, type?: 'FE' | 'FM' | 'FC', options?: { border?: string }): CSSProperties => {
  const colors = type ? CHAIN_COLORS[type] : { border: COLORS.failure.dark };
  return {
    background: '#fff',
    border: options?.border || `2px solid ${colors.border}`,
    borderRadius: '3px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    width: '100%',  // 컬럼 너비에 맞춤
    maxWidth: width,
    overflow: 'hidden',
    fontSize: '10px',  // 더 작게
  };
};

/** 카드 헤더 (타입별 색상) - 컴팩트 */
export const cardHeaderStyle = (type?: 'FE' | 'FM' | 'FC', options?: { borderBottom?: string }): CSSProperties => {
  const colors = type ? CHAIN_COLORS[type] : { bg: COLORS.failure.light, text: COLORS.failure.text };
  return {
    padding: '2px 4px',
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: '9px',
    background: type ? colors.bg : colors.bg,
    color: type ? colors.text : colors.text,
    textAlign: 'center',
    ...(options?.borderBottom && { borderBottom: options.borderBottom }),
  };
};

/** 카드 본문 - 컴팩트 */
export const cardBodyStyle = (options?: { fontWeight?: number }): CSSProperties => ({
  padding: '2px 4px',
  lineHeight: 1.2,
  fontSize: '9px',
  color: '#333',
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
});

/** 결과 테이블 컨테이너 */
export const resultTableContainer: CSSProperties = {
  padding: 0,
  flex: 1,
  minHeight: 0,
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
  padding: '4px 8px',
  background: '#f5f5f5',
  fontSize: FONT_SIZES.header1,
  color: '#666',
  flexShrink: 0,
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
  padding: '2px 4px',
  fontWeight: FONT_WEIGHTS.semibold,
  fontSize: 'clamp(9px, 0.85vw, 11px)',
  background: bg,
  color: 'white',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const thStyle = (bg: string, width?: string, options?: { whiteSpace?: string; fontWeight?: string; fontSize?: string }): CSSProperties => ({
  width,
  background: bg,
  padding: '1px 2px',
  border: BORDER_GRAY,
  position: 'sticky',
  top: 0,
  zIndex: 2,
  fontWeight: options?.fontWeight || FONT_WEIGHTS.semibold,
  fontSize: options?.fontSize || 'clamp(8px, 0.8vw, 10px)',
  whiteSpace: options?.whiteSpace || 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const tdStyle = (bg: string, border: string, options?: Record<string, any>): CSSProperties => ({
  padding: options?.padding || '1px 2px',
  border,
  background: bg,
  fontSize: options?.fontSize || 'clamp(9px, 0.85vw, 11px)',
  lineHeight: 1.2,
  ...options,
});

export const tdCenterStyle = (bg: string, border: string, color = 'inherit', options?: Record<string, any>): CSSProperties => ({
  ...tdStyle(bg, border, options),
  textAlign: 'center',
  fontWeight: options?.fontWeight || FONT_WEIGHTS.semibold,
  color,
  ...options,
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

/** 전체화면 오버레이 */
export const fullscreenOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};
