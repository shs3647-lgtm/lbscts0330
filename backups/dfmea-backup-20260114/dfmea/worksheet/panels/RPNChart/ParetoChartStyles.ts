/**
 * @file ParetoChartStyles.ts
 * @description ParetoChart 동적 스타일 함수
 */

import type { CSSProperties } from 'react';

/** 차트 컨테이너 스타일 */
export const chartContainerStyle: CSSProperties = {
  width: '100%',
  height: '280px',
  background: '#fafafa',
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '12px',
  boxSizing: 'border-box',
};

/** 범례 아이템 스타일 */
export const legendItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
};

/** 범례 색상 박스 스타일 */
export const legendColorBoxStyle = (color: string): CSSProperties => ({
  width: '12px',
  height: '12px',
  background: color,
  border: '1px solid rgba(0,0,0,0.2)',
});

/** 파레토 바 스타일 */
export const paretoBarStyle = (color: string, barHeight: number): CSSProperties => ({
  position: 'absolute',
  bottom: '30px',
  width: '36px',
  height: `${barHeight}px`,
  background: color,
  border: '1px solid rgba(0,0,0,0.2)',
  borderRadius: '2px 2px 0 0',
});

/** 파레토 라인 포인트 스타일 */
export const paretoLinePointStyle = (color: string): CSSProperties => ({
  width: '6px',
  height: '6px',
  background: color,
  border: '1px solid rgba(0,0,0,0.3)',
  borderRadius: '50%',
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
});



