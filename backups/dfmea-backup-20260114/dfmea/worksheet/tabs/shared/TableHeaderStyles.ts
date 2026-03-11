/**
 * @file TableHeaderStyles.ts
 * @description TableHeader 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

const BORDER = '1px solid #b0bec5';

/** 1행 메인 그룹 헤더 스타일 */
export const mainGroupHeaderStyle = (bg: string): CSSProperties => ({
  background: bg,
  color: '#fff',
  border: BORDER,
  padding: '4px 6px',
  height: '28px',
  fontWeight: 900,
  fontSize: '12px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
});

/** 2행 서브그룹 헤더 스타일 */
export const subGroupHeaderStyle = (bg: string): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '3px 4px',
  height: '24px',
  fontWeight: 700,
  fontSize: '12px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
});

/** 3행 컬럼 헤더 스타일 */
export const columnHeaderStyle = (bg: string, minWidth?: string, cursor: 'pointer' | 'default' = 'default'): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '2px 3px',
  height: '22px',
  fontWeight: 600,
  fontSize: '9px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  ...(minWidth && { minWidth }),
  cursor,
});



