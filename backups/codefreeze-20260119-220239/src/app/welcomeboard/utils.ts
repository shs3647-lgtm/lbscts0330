/**
 * @file utils.ts
 * @description 웰컴보드 유틸리티 함수
 * @author AI Assistant
 * @created 2026-01-03
 */

import { APLevel, APSummaryItem, APStats } from './types';

/**
 * AP 등급에 따른 배지 클래스 반환
 */
export const getAPBadge = (level: APLevel): string => {
  switch (level) {
    case 'H': return 'bg-red-500 text-white';
    case 'M': return 'bg-yellow-500 text-white';
    case 'L': return 'bg-green-500 text-white';
    default: return 'bg-gray-400 text-white';
  }
};

/**
 * 상태 배지 색상 및 텍스트 변환
 */
export const getStatusInfo = (status: string): { text: string; style: string } => {
  switch (status) {
    case '완료': return { text: '완료', style: 'bg-green-500 text-white' };
    case '진행중': return { text: '진행', style: 'bg-blue-500 text-white' };
    case '대기': return { text: '지연', style: 'bg-gray-400 text-white' };
    default: return { text: '지연', style: 'bg-gray-400 text-white' };
  }
};

/**
 * AP 데이터 통계 계산
 */
export const calculateAPStats = (data: APSummaryItem[]): APStats => ({
  total: data.length,
  high: data.filter(a => a.ap5 === 'H').length,
  medium: data.filter(a => a.ap5 === 'M').length,
  low: data.filter(a => a.ap5 === 'L').length,
  completed: data.filter(a => a.status === '완료').length,
});





