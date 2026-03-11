/**
 * @file FailureTabStyles.ts
 * @description FailureTab 전용 스타일 함수 (인라인 스타일 제거)
 */

import type { CSSProperties } from 'react';
import { COLORS } from '@/app/dfmea/worksheet/constants';

const BORDER = `1px solid ${COLORS.line}`;

/** 헤더 셀 공통 스타일 */
export const failureHeaderStyle = (bg: string, options?: { zIndex?: number; position?: 'sticky'; left?: number; height?: string; fontWeight?: number; fontSize?: string; textAlign?: 'center' | 'left' | 'right' }): CSSProperties => ({
  background: bg,
  color: 'white',
  border: BORDER,
  padding: '1px 4px',
  height: options?.height || '25px',
  fontWeight: options?.fontWeight || 900,
  textAlign: options?.textAlign || 'center',
  fontSize: options?.fontSize || '12px',
  ...(options?.position && { position: options.position }),
  ...(options?.left !== undefined && { left: options.left }),
  ...(options?.zIndex !== undefined && { zIndex: options.zIndex }),
});

/** 데이터 셀 공통 스타일 */
export const failureDataCell = (bg: string, options?: { zIndex?: number; position?: 'sticky'; left?: number; verticalAlign?: 'middle' | 'top' | 'bottom'; textAlign?: 'center' | 'left' | 'right'; fontSize?: string; wordBreak?: 'break-all' | 'break-word' }): CSSProperties => ({
  border: BORDER,
  padding: '2px 4px',
  background: bg,
  verticalAlign: options?.verticalAlign || 'middle',
  ...(options?.textAlign && { textAlign: options.textAlign }),
  ...(options?.fontSize && { fontSize: options.fontSize }),
  ...(options?.wordBreak && { wordBreak: options.wordBreak }),
  ...(options?.position && { position: options.position }),
  ...(options?.left !== undefined && { left: options.left }),
  ...(options?.zIndex !== undefined && { zIndex: options.zIndex }),
});

/** 에디터 셀 컨테이너 스타일 */
export const editableCellContainer: CSSProperties = {
  minHeight: '22px',
  fontSize: '12px',
  fontFamily: 'inherit',
};

/** 심각도 선택 박스 스타일 */
export const severitySelectStyle: CSSProperties = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: '12px',
  fontWeight: 700,
  height: '24px',
  cursor: 'pointer',
};

/** 4M 뱃지 스타일 */
export const m4BadgeStyle = (m4: string): CSSProperties => {
  let bg = '#fce4ec';
  if (m4 === 'MN') bg = '#e3f2fd';
  else if (m4 === 'MC') bg = '#fff3e0';
  else if (m4 === 'IM') bg = '#e8f5e9';
  
  return {
    background: bg,
    padding: '1px 4px',
    borderRadius: '3px',
    fontWeight: 600,
    fontSize: '9px',
  };
};

/** 테이블 행 스타일 */
export const failureRowStyle = (bg: string): CSSProperties => ({
  height: '28px',
  background: bg,
});

/** 스티키 헤더 컨테이너 */
export const failureStickyHeader: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  background: '#fff',
};

/** 스티키 첫 컬럼 공통 설정 */
export const stickyFirstCol: CSSProperties = {
  position: 'sticky',
  left: 0,
};

