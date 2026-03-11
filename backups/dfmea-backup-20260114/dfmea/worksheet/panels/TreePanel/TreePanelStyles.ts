/**
 * @file TreePanelStyles.ts
 * @description TreePanel 전용 스타일 함수 (인라인 스타일 제거)
 */

import type { CSSProperties } from 'react';
import { FONT_SIZES, FONT_WEIGHTS } from '@/app/dfmea/worksheet/constants';

/** 트리 패널 컨테이너 */
export const treePanelContainer = (bg?: string): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  ...(bg && { background: bg }),
});

/** 트리 패널 제목 (상단 바) */
export const treePanelTitle = (bg: string, options?: { whiteSpace?: 'nowrap' | 'normal' }): CSSProperties => ({
  background: bg,
  color: 'white',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 700,
  flexShrink: 0,
  ...(options?.whiteSpace && { whiteSpace: options.whiteSpace }),
});

/** 트리 패널 내용 영역 */
export const treePanelContent = (bg: string): CSSProperties => ({
  flex: 1,
  overflow: 'auto',
  padding: '8px',
  background: bg,
});

/** 트리 패널 하단 푸터 */
export const treePanelFooter = (options?: { bg?: string; borderTop?: string; color?: string }): CSSProperties => ({
  flexShrink: 0,
  padding: '6px 10px',
  borderTop: options?.borderTop || '1px solid #ccc',
  background: options?.bg || '#e8eaed',
  fontSize: '10px',
  color: options?.color || '#666',
});

/** 트리 아이템 기본 행 */
export const treeItemStyle = (bg: string, options?: { marginBottom?: string; border?: string }): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px',
  background: bg,
  borderRadius: '4px',
  ...(options?.marginBottom && { marginBottom: options.marginBottom }),
  ...(options?.border && { border: options.border }),
});

/** 개수 뱃지 */
export const countBadgeStyle: CSSProperties = {
  fontSize: '9px',
  color: '#888',
  marginLeft: 'auto',
  background: '#fff',
  padding: '1px 6px',
  borderRadius: '8px',
};

/** 4M 뱃지 */
export const m4BadgeStyle = (bg: string): CSSProperties => ({
  fontSize: '8px',
  fontWeight: 700,
  padding: '0 4px',
  borderRadius: '2px',
  background: bg,
});

/** 타입별 컨테이너 (구조/기능/고장) */
export const typeContainerStyle = (borderColor: string, options?: { borderLeft?: string }): CSSProperties => ({
  marginLeft: '12px',
  marginBottom: '8px',
  borderLeft: options?.borderLeft || `3px solid ${borderColor}`,
  paddingLeft: '8px',
});

/** 타입별 헤더 */
export const typeHeaderStyle = (bg: string, options?: { color?: string; fontWeight?: number; borderLeft?: string; fontSize?: string }): CSSProperties => ({
  fontSize: options?.fontSize || '11px',
  fontWeight: options?.fontWeight || 700,
  color: options?.color || 'white',
  padding: '4px 8px',
  background: bg,
  borderRadius: '3px',
  marginBottom: '4px',
  ...(options?.borderLeft && { borderLeft: options.borderLeft }),
});

/** 기능 아이템 스타일 */
export const functionItemStyle = (options?: { bg?: string; color?: string; marginBottom?: string; border?: string }): CSSProperties => ({
  fontSize: '10px',
  color: options?.color || '#000000',
  fontWeight: 600,
  padding: '2px 6px',
  background: options?.bg || '#fff3e0',
  borderRadius: '2px',
  ...(options?.marginBottom && { marginBottom: options.marginBottom }),
  ...(options?.border && { border: options.border }),
});

/** 요구사항 아이템 스타일 */
export const requirementItemStyle = (options?: { color?: string; bg?: string }): CSSProperties => ({
  marginLeft: '16px',
  fontSize: '9px',
  color: options?.color || '#e65100',
  fontWeight: 500,
  padding: '2px 4px',
  background: options?.bg || '#fff3e0',
  borderRadius: '2px',
  marginTop: '2px',
});

/** 고장 헤더 스타일 */
export const failureHeaderStyle = (bg: string): CSSProperties => ({
  fontSize: '11px',
  fontWeight: 700,
  color: 'white',
  padding: '4px 8px',
  background: bg,
  borderRadius: '3px',
  marginBottom: '6px',
});

/** 심각도 뱃지 스타일 */
export const severityBadgeStyle = (isHigh: boolean, colors: any): CSSProperties => ({
  fontSize: '9px',
  fontWeight: 700,
  padding: '0 4px',
  borderRadius: '2px',
  background: isHigh ? colors.severity.high : colors.severity.low,
  color: isHigh ? colors.severity.highText : colors.severity.lowText,
});
