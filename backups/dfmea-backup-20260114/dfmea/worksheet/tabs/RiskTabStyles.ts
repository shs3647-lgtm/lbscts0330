/**
 * @file RiskTabStyles.ts
 * @description RiskTab 전용 스타일 함수 (인라인 스타일 제거)
 */

import type { CSSProperties } from 'react';
import { FONT_SIZES, FONT_WEIGHTS } from '@/app/dfmea/worksheet/constants';

const BORDER = '1px solid #b0bec5';

/** 리스크 메인 헤더 */
export const riskMainHeader: CSSProperties = {
  background: '#6a1b9a',
  color: '#fff',
  border: BORDER,
  padding: '6px',
  height: '28px',
  fontWeight: 900,
  fontSize: '12px',
  textAlign: 'center',
};

/** 리스크 서브 헤더 */
export const riskSubHeader = (bg: string): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '4px',
  height: '24px',
  fontWeight: 700,
  fontSize: '12px',
  textAlign: 'center',
});

/** 리스크 컬럼 헤더 */
export const riskColHeader = (bg: string, options?: { cursor?: string }): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '3px',
  height: '22px',
  fontWeight: 600,
  fontSize: '12px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  ...(options?.cursor && { cursor: options.cursor }),
});

/** 리스크 데이터 셀 */
export const riskDataCell = (options?: { textAlign?: 'center' | 'left' | 'right'; background?: string }): CSSProperties => ({
  border: BORDER,
  padding: '2px 4px',
  fontSize: '12px',
  background: options?.background || '#fafafa',
  ...(options?.textAlign && { textAlign: options.textAlign }),
});

/** 테이블 컬럼 설정 */
export const riskColStyle = (width: string): CSSProperties => ({
  width,
});

/** 스티키 헤더 컨테이너 */
export const riskStickyHeader: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  background: '#fff',
};

/** 리스크 통합 탭 대분류 헤더 */
export const riskFullMainHeader = (bg: string): CSSProperties => ({
  background: bg,
  color: '#fff',
  border: BORDER,
  padding: '4px',
  height: '24px',
  fontWeight: 900,
  fontSize: '12px',
  textAlign: 'center',
});

/** 리스크 통합 탭 서브그룹 헤더 */
export const riskFullSubHeader = (bg: string): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '2px',
  fontSize: '9px',
  textAlign: 'center',
});

/** 리스크 통합 탭 컬럼 헤더 */
export const riskFullColHeader = (bg: string, options?: { cursor?: string }): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '2px',
  fontSize: '8px',
  textAlign: 'center',
  ...(options?.cursor && { cursor: options.cursor }),
});

/** 리스크 통합 탭 데이터 행 */
export const riskFullRowStyle = (bg: string): CSSProperties => ({
  height: '22px',
  background: bg,
});

/** 리스크 통합 탭 데이터 셀 */
export const riskFullDataCell = (bg: string, options?: { textAlign?: 'center' | 'left' | 'right' }): CSSProperties => ({
  border: BORDER,
  padding: '2px 3px',
  fontSize: '8px',
  background: bg,
  ...(options?.textAlign && { textAlign: options.textAlign }),
});



