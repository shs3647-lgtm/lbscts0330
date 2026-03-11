/**
 * @file TabMenuStyles.ts
 * @description TabMenu 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 탭 메뉴 컨테이너 스타일 */
export const tabMenuContainerStyle: CSSProperties = {
  background: 'transparent',
  paddingLeft: '8px',
  paddingRight: '12px',
  height: '36px',
  fontFamily: '"Segoe UI", "Malgun Gothic", Arial, sans-serif',
};

/** 탭 버튼 스타일 */
export const tabButtonStyle = (isActive: boolean, isEnabled: boolean): CSSProperties => ({
  padding: '5px 14px',
  fontSize: '12px',
  fontWeight: isActive ? 700 : 500,
  background: isActive ? '#3949ab' : 'transparent',
  border: isActive ? '1px solid #ffd600' : '1px solid transparent',
  borderRadius: '4px',
  color: isActive ? '#ffd600' : '#fff',
  cursor: isEnabled ? 'pointer' : 'not-allowed',
  opacity: isEnabled ? 1 : 0.6,
  whiteSpace: 'nowrap',
  transition: 'all 0.2s ease',
  textShadow: isActive ? '0 0 8px rgba(255,214,0,0.5)' : 'none',
});



