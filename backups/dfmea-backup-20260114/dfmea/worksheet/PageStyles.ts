/**
 * @file PageStyles.ts
 * @description Worksheet page 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 동적 배경색 스타일 */
export const dynamicBgStyle = (bg: string): CSSProperties => ({
  backgroundColor: bg,
});



