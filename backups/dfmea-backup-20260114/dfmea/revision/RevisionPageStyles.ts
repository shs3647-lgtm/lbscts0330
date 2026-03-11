/**
 * @file RevisionPageStyles.ts
 * @description Revision Page 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 행 스타일 */
export const rowStyle = (height: string): CSSProperties => ({
  height,
});

/** 헤더 셀 스타일 */
export const headerCellStyle = (width?: string): CSSProperties => ({
  ...(width && { width }),
});

/** 입력 셀 스타일 */
export const inputCellStyle = (width?: string): CSSProperties => ({
  ...(width && { width }),
});

/** 버튼 컨테이너 스타일 */
export const buttonContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

/** 저장 상태 배지 스타일 */
export const savedBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  background: '#4caf50',
  color: 'white',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 600,
};



