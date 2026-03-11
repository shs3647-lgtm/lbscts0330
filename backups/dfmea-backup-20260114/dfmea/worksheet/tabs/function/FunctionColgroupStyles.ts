/**
 * @file FunctionColgroupStyles.ts
 * @description FunctionColgroup 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** col 스타일 생성 함수 */
export const colStyle = (width: string, minWidth?: string): CSSProperties => ({
  width,
  ...(minWidth && { minWidth }),
});



