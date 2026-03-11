/**
 * @file StructureTabStyles.ts
 * @description StructureTab 전용 스타일 함수 (인라인 스타일 제거)
 */

import type { CSSProperties } from 'react';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, HEIGHTS } from '@/app/dfmea/worksheet/constants';

const BORDER = `1px solid ${COLORS.line}`;

/** 헤더 메인 스타일 */
export const structHeaderMain = (bg: string, options?: { zIndex?: number; left?: number; position?: 'sticky' }): CSSProperties => ({
  width: '30%',
  background: bg,
  color: 'white',
  border: BORDER,
  padding: '1px 4px',
  height: HEIGHTS.header,
  fontWeight: FONT_WEIGHTS.semibold,
  textAlign: 'center',
  fontSize: FONT_SIZES.header1,
  ...(options?.position && { position: options.position }),
  ...(options?.left !== undefined && { left: options.left }),
  ...(options?.zIndex !== undefined && { zIndex: options.zIndex }),
});

/** 헤더 서브 스타일 (2행) */
export const structHeaderSub = (bg: string, options?: { borderBottom?: string; width?: string; color?: string; fontWeight?: number; fontSize?: string }): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '1px 4px',
  height: HEIGHTS.header,
  fontWeight: options?.fontWeight || FONT_WEIGHTS.semibold,
  fontSize: options?.fontSize || FONT_SIZES.header2,
  textAlign: 'center',
  ...(options?.borderBottom && { borderBottom: options.borderBottom }),
  ...(options?.width && { width: options.width, maxWidth: options.width, minWidth: options.width }),
  ...(options?.color && { color: options.color }),
});

/** 데이터 셀 공통 스타일 */
export const structDataCell = (bg: string, options?: { rowSpan?: number; textAlign?: 'center' | 'left' | 'right'; wordBreak?: 'break-word' | 'break-all'; cursor?: string; zIndex?: number; position?: 'sticky'; left?: number; padding?: string; border?: string }): CSSProperties => ({
  border: options?.border || BORDER,
  padding: options?.padding || '4px',
  background: bg,
  verticalAlign: 'middle',
  ...(options?.textAlign && { textAlign: options.textAlign }),
  ...(options?.wordBreak && { wordBreak: options.wordBreak }),
  ...(options?.cursor && { cursor: options.cursor }),
  ...(options?.position && { position: options.position }),
  ...(options?.left !== undefined && { left: options.left }),
  ...(options?.zIndex !== undefined && { zIndex: options.zIndex }),
});

/** 누락 알림 뱃지 스타일 */
export const missingBadgeStyle: CSSProperties = {
  marginLeft: '6px',
  background: '#fff',
  color: '#f57c00',
  padding: '1px 6px',
  borderRadius: '8px',
  fontSize: FONT_SIZES.small,
  fontWeight: FONT_WEIGHTS.semibold,
};

/** 4M 셀 특화 스타일 */
export const m4CellStyle = (zebraBg: string): CSSProperties => ({
  border: BORDER,
  padding: '4px 6px',
  fontSize: FONT_SIZES.cell,
  verticalAlign: 'middle',
  width: '80px',
  maxWidth: '80px',
  minWidth: '80px',
  textAlign: 'center',
  fontWeight: FONT_WEIGHTS.bold,
  background: zebraBg,
  color: COLORS.structure.text,
});

/** 작업요소 에디터 셀 스타일 */
export const l3EditableStyle = (isPlaceholder: boolean, zebraBg: string, failureLight: string): CSSProperties => ({
  border: BORDER,
  padding: '2px 4px',
  background: isPlaceholder 
    ? `repeating-linear-gradient(45deg, ${zebraBg}, ${zebraBg} 4px, ${failureLight} 4px, ${failureLight} 8px)` 
    : zebraBg,
  wordBreak: 'break-word',
  fontSize: FONT_SIZES.cell,
  fontFamily: 'inherit',
});

/** 완제품명 입력 필드 스타일 */
export const l1InputStyle: CSSProperties = {
  minHeight: '24px',
  background: 'rgba(255,255,255,0.95)',
  borderRadius: '3px',
  padding: '4px',
};

/** 스티키 헤더 컨테이너 */
export const structStickyHeader: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  background: '#fff',
};



