/**
 * @file RPNAnalysisStyles.ts
 * @description RPNAnalysis 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 컨테이너 스타일 */
export const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: '#f8fafc',
};

/** 헤더 스타일 */
export const headerStyle: CSSProperties = {
  background: '#6c757d',
  color: 'white',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 700,
  flexShrink: 0,
};

/** 컨텐츠 스타일 */
export const contentStyle: CSSProperties = {
  flex: 1,
  padding: '12px',
  overflowY: 'auto',
};

/** 그리드 스타일 */
export const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '12px',
  marginBottom: '12px',
};

/** 카드 스타일 */
export const cardStyle = (bg: string): CSSProperties => ({
  background: bg,
  borderRadius: '8px',
  padding: '12px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
});

/** 카드 라벨 스타일 */
export const cardLabelStyle: CSSProperties = {
  fontSize: '11px',
  color: '#666',
  marginBottom: '4px',
  fontWeight: 600,
};

/** 카드 값 스타일 */
export const cardValueStyle = (color: string, fontSize: string = '24px'): CSSProperties => ({
  fontSize,
  fontWeight: 700,
  color,
});

/** 테이블 컨테이너 스타일 */
export const tableContainerStyle: CSSProperties = {
  background: 'white',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
};

/** 테이블 스타일 */
export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '11px',
};

/** 테이블 헤더 셀 스타일 */
export const tableHeaderCellStyle = (bg: string): CSSProperties => ({
  background: bg,
  color: 'white',
  border: '1px solid rgba(255,255,255,0.2)',
  padding: '6px 8px',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: '10px',
  whiteSpace: 'nowrap',
});

/** 테이블 데이터 셀 스타일 */
export const tableDataCellStyle = (bg: string, align: 'left' | 'center' | 'right' = 'left'): CSSProperties => ({
  border: '1px solid #ddd',
  padding: '6px 8px',
  fontSize: '10px',
  background: bg,
  textAlign: align,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

/** RPN 값 스타일 */
export const rpnValueStyle = (color: string): CSSProperties => ({
  fontWeight: 700,
  fontSize: '11px',
  color,
});

/** 빈 메시지 스타일 */
export const emptyMessageStyle: CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: '#999',
  fontSize: '11px',
};



