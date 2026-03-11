/**
 * @file APTableInlineStyles.ts
 * @description APTableInline 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 헤더 스타일 */
export const apTableHeaderStyle = (headerBg: string): CSSProperties => ({
  background: headerBg,
});

/** AP 셀 스타일 */
export const apTableCellStyle = (bg: string, color: string): CSSProperties => ({
  background: bg,
  color,
});



