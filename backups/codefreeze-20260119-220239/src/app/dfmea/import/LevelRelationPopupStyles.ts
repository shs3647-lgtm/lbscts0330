/**
 * @file LevelRelationPopupStyles.ts
 * @description LevelRelationPopup 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 오버레이 스타일 */
export const overlayStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

/** 팝업 컨테이너 스타일 */
export const popupContainerStyle: CSSProperties = {
  background: 'white',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  width: '90%',
  maxWidth: '1200px',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
};

/** 헤더 스타일 */
export const headerStyle: CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #e0e0e0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

/** 제목 스타일 */
export const titleStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#333',
};

/** 컨텐츠 스타일 */
export const contentStyle: CSSProperties = {
  padding: '20px',
  overflowY: 'auto',
  flex: 1,
};

/** 테이블 스타일 */
export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '12px',
};

/** 헤더 셀 스타일 */
export const headerCellStyle = (bg: string): CSSProperties => ({
  background: bg,
  color: 'white',
  border: '1px solid #b0bec5',
  padding: '8px 12px',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: '11px',
  whiteSpace: 'nowrap',
});

/** 데이터 셀 스타일 */
export const dataCellStyle = (bg: string): CSSProperties => ({
  border: '1px solid #ddd',
  padding: '6px 10px',
  fontSize: '11px',
  background: bg,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

/** 푸터 스타일 */
export const footerStyle: CSSProperties = {
  padding: '12px 20px',
  borderTop: '1px solid #e0e0e0',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
};

/** 버튼 스타일 */
export const buttonStyle = (bg: string, color: string): CSSProperties => ({
  padding: '8px 16px',
  background: bg,
  color,
  border: 'none',
  borderRadius: '4px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
});



