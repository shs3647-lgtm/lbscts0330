/**
 * @file FailureTabStyles.ts
 * @description 고장분석 탭 공통 스타일 함수 (인라인 스타일 제거)
 */

import type { CSSProperties } from 'react';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../../constants';

const BORDER = `1px solid ${COLORS.line}`;

// 색상 정의
export const STEP_COLORS = {
  structure: { header1: '#1565c0', header2: '#1976d2', header3: '#e3f2fd', cell: '#f5f9ff' },
  function: { header1: '#2e7d32', header2: '#388e3c', header3: '#e8f5e9', cell: '#f5fbf6' },
  failure: { header1: '#1a237e', header2: '#3949ab', header3: '#e8eaf6', cell: '#f5f6fc' },
  indicator: { bg: '#ffccbc', text: '#bf360c' },
};

/** 컨테이너 스타일 */
export const containerStyle: CSSProperties = {
  padding: '0',
  overflow: 'auto',
  height: '100%',
};

/** 테이블 스타일 */
export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

/** 컬럼 스타일 */
export const colStyle = (width: string): CSSProperties => ({
  width,
});

/** 헤더 메인 (1행) */
export const headerMainRow = (bg: string, fontWeight = 800): CSSProperties => ({
  background: bg,
  color: 'white',
  border: BORDER,
  padding: '4px 6px',
  fontSize: FONT_SIZES.header1,
  fontWeight,
  textAlign: 'center',
  whiteSpace: 'nowrap',
});

/** 헤더 서브 (2행) */
export const headerSubRow = (bg: string, fontWeight = FONT_WEIGHTS.semibold): CSSProperties => ({
  background: bg,
  color: 'white',
  border: BORDER,
  padding: '6px',
  fontSize: FONT_SIZES.header1,
  fontWeight,
  textAlign: 'center',
  whiteSpace: 'nowrap',
});

/** 컬럼 헤더 (3행) */
export const colHeaderRow = (bg: string, fontSize: string = FONT_SIZES.header1): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '6px',
  fontSize,
  fontWeight: FONT_WEIGHTS.semibold,
  textAlign: 'center',
  whiteSpace: 'nowrap',
});

/** 헤더 내부 플렉스 컨테이너 */
export const headerFlexContainer: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  flexWrap: 'nowrap',
};

/** 헤더 내부 버튼 그룹 */
export const headerButtonGroup: CSSProperties = {
  display: 'flex',
  gap: '6px',
};

/** 확정/수정 버튼 스타일 */
export const confirmButtonStyle = (bg: string): CSSProperties => ({
  background: bg,
  color: 'white',
  border: 'none',
  padding: '3px 10px',
  borderRadius: '3px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
  cursor: 'pointer',
});

/** 확정 배지 스타일 */
export const confirmBadgeStyle: CSSProperties = {
  background: '#4caf50',
  color: 'white',
  padding: '3px 10px',
  borderRadius: '3px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
};

/** 누락 배지 스타일 */
export const missingBadgeStyle = (isMissing: boolean): CSSProperties => ({
  background: isMissing ? '#f57c00' : '#4caf50',
  color: 'white',
  padding: '3px 10px',
  borderRadius: '3px',
  fontSize: FONT_SIZES.header1,
  fontWeight: FONT_WEIGHTS.semibold,
});

/** 누락 알림 작은 배지 */
export const missingPillStyle: CSSProperties = {
  marginLeft: '8px',
  background: '#fff',
  color: '#f57c00',
  padding: '2px 8px',
  borderRadius: '10px',
  fontSize: FONT_SIZES.header2,
  fontWeight: FONT_WEIGHTS.semibold,
};

/** 누락 알림 작은 배지 (인라인) */
export const missingPillInlineStyle: CSSProperties = {
  marginLeft: '4px',
  background: '#fff',
  color: '#f57c00',
  padding: '1px 5px',
  borderRadius: '8px',
  fontSize: FONT_SIZES.small,
  fontWeight: FONT_WEIGHTS.semibold,
};

/** 헤더 행 배경 */
export const headerRowBg: CSSProperties = {
  background: '#e8f5e9',
};

/** 데이터 행 스타일 */
export const dataRowStyle = (bg: string): CSSProperties => ({
  background: bg,
});

/** 데이터 셀 스타일 */
export const dataCellStyle = (bg: string, options?: { padding?: string; textAlign?: 'center' | 'left' | 'right'; fontWeight?: number; verticalAlign?: 'middle' | 'top' | 'bottom'; color?: string; fontSize?: string; whiteSpace?: string; overflow?: string; textOverflow?: string; cursor?: string }): CSSProperties => ({
  border: BORDER,
  background: bg,
  padding: options?.padding || '4px 6px',
  ...(options?.textAlign && { textAlign: options.textAlign }),
  ...(options?.fontWeight && { fontWeight: options.fontWeight }),
  ...(options?.verticalAlign && { verticalAlign: options.verticalAlign }),
  ...(options?.color && { color: options.color }),
  ...(options?.fontSize && { fontSize: options.fontSize }),
  ...(options?.whiteSpace && { whiteSpace: options.whiteSpace }),
  ...(options?.overflow && { overflow: options.overflow }),
  ...(options?.textOverflow && { textOverflow: options.textOverflow }),
  ...(options?.cursor && { cursor: options.cursor }),
});

/** 빈 상태 메시지 스타일 */
export const emptyMessageStyle: CSSProperties = {
  border: BORDER,
  padding: '30px',
  textAlign: 'center',
  color: '#999',
  fontSize: FONT_SIZES.header1,
};

/** 경고 메시지 컨테이너 스타일 */
export const warningContainerStyle: CSSProperties = {
  padding: '20px',
  background: '#fff3e0',
  borderBottom: BORDER,
  textAlign: 'center',
};

/** 경고 메시지 텍스트 스타일 */
export const warningTextStyle: CSSProperties = {
  fontSize: FONT_SIZES.header1,
  color: '#e65100',
  fontWeight: FONT_WEIGHTS.semibold,
};

/** 심각도 선택 박스 스타일 */
export const severitySelectStyle: CSSProperties = {
  width: '100%',
  padding: '4px',
  border: '1px solid #ccc',
  borderRadius: '3px',
  fontSize: FONT_SIZES.cell,
  background: 'white',
};

/** 심각도 옵션 스타일 */
export const severityOptionStyle: CSSProperties = {
  padding: '4px',
  fontSize: FONT_SIZES.cell,
};

/** 심각도 텍스트 스타일 */
export const severityTextStyle = (severity?: number): CSSProperties => ({
  fontWeight: FONT_WEIGHTS.semibold,
  fontSize: FONT_SIZES.pageHeader,
  color: severity && severity >= 8 ? COLORS.failure.text : severity && severity >= 5 ? '#f57f17' : COLORS.text,
});

/** FAIL_COLORS 상수 (FailureTab에서 사용) */
export const FAIL_COLORS = {
  header1: '#1a237e',
  header2: '#3949ab',
  cell: '#e8eaf6',
  cellAlt: '#c5cae9',
  text: '#1a237e',
  dark: '#0d47a1',
};
