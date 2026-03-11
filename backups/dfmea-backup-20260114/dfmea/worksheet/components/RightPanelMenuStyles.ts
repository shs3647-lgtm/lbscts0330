/**
 * @file RightPanelMenuStyles.ts
 * @description RightPanelMenu 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 메뉴 컨테이너 스타일 */
export const rightPanelMenuStyle = (bgColor: string): CSSProperties => ({
  height: '32px',
  background: bgColor,
  borderTop: '1px solid rgba(255,255,255,0.4)',
  borderBottom: '1px solid rgba(255,255,255,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingRight: '8px',
  gap: '6px',
  position: 'sticky',
  top: '64px',
  zIndex: 70,
});

/** 패널 버튼 스타일 */
export const panelButtonStyle = (isActive: boolean): CSSProperties => ({
  background: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
  border: 'none',
  color: '#fff',
  fontSize: '12px',
  fontWeight: isActive ? 600 : 400,
  cursor: 'pointer',
});



