/**
 * @file ImportPreviewGridStyles.ts
 * @description ImportPreviewGrid 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 컨테이너 스타일 */
export const containerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  overflowX: 'auto',
  overflowY: 'auto',
  background: '#fff',
};

/** 테이블 스타일 */
export const tableStyle: CSSProperties = {
  width: '100%',
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
  fontWeight: 700,
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

/** 에러 셀 스타일 */
export const errorCellStyle: CSSProperties = {
  border: '1px solid #ddd',
  padding: '4px 6px',
  fontSize: '11px',
  background: '#ffebee',
  color: '#c62828',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

/** 빈 데이터 메시지 스타일 */
export const emptyMessageStyle: CSSProperties = {
  textAlign: 'center',
  padding: '40px',
  color: '#999',
  fontSize: '12px',
};



