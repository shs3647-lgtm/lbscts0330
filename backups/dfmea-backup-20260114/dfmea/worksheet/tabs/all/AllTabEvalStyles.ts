/**
 * @file AllTabEvalStyles.ts
 * @description AllTabRenderer 평가 탭 스타일 함수
 */

import type { CSSProperties } from 'react';
import { FONT_SIZES, FONT_WEIGHTS } from '@/app/dfmea/worksheet/constants';

const BORDER = '1px solid #ccc';

/** 평가 테이블 스타일 */
export const evalTableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: FONT_SIZES.cell,
};

/** 단계별 헤더 스타일 */
export const stepHeaderStyle = (bg: string): CSSProperties => ({
  background: bg,
  color: '#fff',
  border: BORDER,
  padding: '4px',
  height: '24px',
  fontWeight: FONT_WEIGHTS.semibold,
  fontSize: FONT_SIZES.cell,
  textAlign: 'center',
});

/** 서브 헤더 스타일 */
export const subHeaderCellStyle = (bg: string, options?: { cursor?: string }): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '2px',
  fontSize: FONT_SIZES.small,
  textAlign: 'center',
  ...(options?.cursor && { cursor: options.cursor }),
});

/** 행 스타일 */
export const evalRowStyle = (bg: string, borderTop?: string): CSSProperties => ({
  height: '22px',
  background: bg,
  ...(borderTop && { borderTop }),
});

/** 빈 데이터 행 스타일 */
export const emptyDataRowStyle: CSSProperties = {
  textAlign: 'center',
  padding: '40px',
  color: '#999',
  fontSize: FONT_SIZES.header1,
};

