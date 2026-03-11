/**
 * @file DocTabStyles.ts
 * @description DocTab 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 컨테이너 스타일 */
export const containerStyle: CSSProperties = {
  padding: '16px',
  background: '#fff',
};

/** 섹션 제목 스타일 */
export const sectionTitleStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  marginBottom: '8px',
  color: '#00587a',
};

/** 문서 아이템 스타일 */
export const docItemStyle: CSSProperties = {
  padding: '8px 12px',
  background: '#f5f5f5',
  border: '1px solid #ddd',
  borderRadius: '4px',
  marginBottom: '8px',
  fontSize: '12px',
};

/** 문서 제목 스타일 */
export const docTitleStyle: CSSProperties = {
  fontWeight: 600,
  marginBottom: '4px',
};

/** 문서 설명 스타일 */
export const docDescStyle: CSSProperties = {
  fontSize: '11px',
  color: '#666',
};

/** 버튼 스타일 */
export const buttonStyle: CSSProperties = {
  padding: '6px 12px',
  background: '#00587a',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
};

/** 업로드 영역 스타일 */
export const uploadAreaStyle: CSSProperties = {
  border: '2px dashed #ccc',
  borderRadius: '4px',
  padding: '24px',
  textAlign: 'center',
  background: '#fafafa',
  cursor: 'pointer',
  marginTop: '12px',
};



