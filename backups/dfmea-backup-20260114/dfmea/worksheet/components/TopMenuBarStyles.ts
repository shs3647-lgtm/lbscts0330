/**
 * @file TopMenuBarStyles.ts
 * @description TopMenuBar 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 메인 컨테이너 스타일 */
export const topMenuBarStyle: CSSProperties = {
  position: 'fixed',
  top: '32px',
  left: '53px',
  right: 0,
  height: '32px',
  background: 'linear-gradient(to right, #1a237e, #283593, #1a237e)',
  paddingLeft: '8px',
  paddingRight: '0',
  fontFamily: '"Segoe UI", "Malgun Gothic", Arial, sans-serif',
  borderTop: '1px solid rgba(255,255,255,0.3)',
  borderBottom: '1px solid rgba(255,255,255,0.3)',
  zIndex: 99,
};

/** 저장 버튼 스타일 */
export const saveButtonStyle = (isSaving: boolean, dirty: boolean): CSSProperties => ({
  background: isSaving ? '#ff9800' : dirty ? '#4caf50' : 'rgba(255,255,255,0.15)',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 600,
});

/** Import 메뉴 스타일 */
export const importMenuStyle: CSSProperties = {
  minWidth: '160px',
};

/** Import 결과 메시지 스타일 */
export const importMessageStyle = (type: 'success' | 'error'): CSSProperties => ({
  background: type === 'success' ? '#4caf50' : '#f44336',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 600,
});

/** 5단계 AP 컨테이너 스타일 */
export const apContainerStyle: CSSProperties = {
  position: 'absolute',
  right: '0px',
  top: '0px',
  width: '270px',
  height: '32px',
  display: 'flex',
  alignItems: 'stretch',
  borderLeft: '1px solid #ffd600',
  background: 'linear-gradient(to right, #1a237e, #283593)',
  boxSizing: 'border-box',
};

/** AP 셀 스타일 */
export const apCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRight: '1px solid rgba(255,255,255,0.25)',
  boxSizing: 'border-box',
  flexShrink: 0,
  height: '32px',
};

/** AP 셀 스타일 (width 지정) */
export const apCellStyleWithWidth = (width: string): CSSProperties => ({
  ...apCellStyle,
  width,
});

