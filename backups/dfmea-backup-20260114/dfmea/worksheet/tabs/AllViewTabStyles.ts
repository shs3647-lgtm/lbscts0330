/**
 * @file AllViewTabStyles.ts
 * @description AllViewTab 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 컨테이너 스타일 */
export const containerStyle: CSSProperties = {
  width: '100%',
  overflowX: 'auto',
  overflowY: 'visible',
  paddingBottom: '16px',
};

/** 테이블 스타일 */
export const tableStyle: CSSProperties = {
  width: 'max-content',
  minWidth: '100%',
  borderCollapse: 'collapse',
  fontSize: '11px',
};

/** 헤더 셀 스타일 */
export const headerCellStyle = (bg: string, minWidth?: string): CSSProperties => ({
  position: 'sticky',
  top: 0,
  background: bg,
  border: '1px solid #b0bec5',
  padding: '4px 6px',
  textAlign: 'center',
  fontWeight: 600,
  fontSize: '10px',
  whiteSpace: 'nowrap',
  zIndex: 10,
  ...(minWidth && { minWidth }),
});

/** 데이터 셀 스타일 */
export const dataCellStyle = (bg: string): CSSProperties => ({
  border: '1px solid #ddd',
  padding: '4px 6px',
  fontSize: '11px',
  background: bg,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

/** Sticky 첫 열 스타일 */
export const stickyFirstColStyle = (bg: string): CSSProperties => ({
  position: 'sticky',
  left: 0,
  zIndex: 5,
  background: bg,
  border: '1px solid #ddd',
  padding: '4px 6px',
  fontSize: '11px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
});



