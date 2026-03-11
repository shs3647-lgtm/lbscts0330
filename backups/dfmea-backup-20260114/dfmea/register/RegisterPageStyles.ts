/**
 * @file RegisterPageStyles.ts
 * @description Register Page 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 컨테이너 스타일 */
export const containerStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
};

/** 폼 카드 스타일 */
export const formCardStyle: CSSProperties = {
  background: 'white',
  borderRadius: '12px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
  padding: '40px',
  width: '100%',
  maxWidth: '500px',
};

/** 제목 스타일 */
export const titleStyle: CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  marginBottom: '8px',
  color: '#333',
  textAlign: 'center',
};

/** 서브타이틀 스타일 */
export const subtitleStyle: CSSProperties = {
  fontSize: '14px',
  color: '#666',
  marginBottom: '32px',
  textAlign: 'center',
};

/** 입력 그룹 스타일 */
export const inputGroupStyle: CSSProperties = {
  marginBottom: '20px',
};

/** 라벨 스타일 */
export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '8px',
  color: '#333',
};

/** 입력 필드 스타일 */
export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontSize: '14px',
  transition: 'border-color 0.2s',
};

/** 버튼 스타일 */
export const buttonStyle: CSSProperties = {
  width: '100%',
  padding: '14px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'transform 0.2s',
  marginTop: '24px',
};

/** 링크 스타일 */
export const linkStyle: CSSProperties = {
  textAlign: 'center',
  marginTop: '20px',
  fontSize: '14px',
  color: '#666',
};



