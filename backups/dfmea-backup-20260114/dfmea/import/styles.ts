import { CSSProperties } from 'react';

/**
 * Import 페이지 공통 스타일
 */

// 섹션 제목 스타일
export const sectionTitleStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 'bold',
  color: '#00587a',
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

// 테이블 wrapper 스타일
export const tableWrapperStyle: CSSProperties = {
  border: '1px solid #999',
  borderRadius: '4px',
  overflow: 'hidden',
  marginBottom: '15px'
};

// 테이블 헤더 스타일
export const headerStyle: CSSProperties = {
  padding: '6px 8px',
  background: '#e0f2fb',
  borderBottom: '1px solid #999',
  borderRight: '1px solid #ddd',
  fontWeight: 'bold',
  fontSize: '11px',
  color: '#00587a',
  textAlign: 'center'
};

// 네이비 헤더 스타일
export const navyHeaderStyle: CSSProperties = {
  ...headerStyle,
  background: '#00587a',
  color: 'white'
};

// 테이블 셀 스타일
export const cellStyle: CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid #e0e0e0',
  borderRight: '1px solid #e0e0e0',
  fontSize: '11px',
  verticalAlign: 'middle'
};

// 행 헤더 스타일
export const rowHeaderStyle: CSSProperties = {
  ...cellStyle,
  background: '#f5f5f5',
  fontWeight: 'bold',
  color: '#333'
};

// 입력 가능 셀 스타일
export const editableCellStyle: CSSProperties = {
  ...cellStyle,
  padding: '2px',
  background: '#fffef0'
};

// 버튼 스타일
export const BUTTON_STYLES = {
  primary: {
    padding: '4px 12px',
    background: '#00587a',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold'
  } as CSSProperties,
  danger: {
    padding: '4px 8px',
    background: '#EF4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px'
  } as CSSProperties,
  warning: {
    padding: '4px 8px',
    background: '#F59E0B',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px'
  } as CSSProperties,
  success: {
    padding: '4px 12px',
    background: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold'
  } as CSSProperties
};












