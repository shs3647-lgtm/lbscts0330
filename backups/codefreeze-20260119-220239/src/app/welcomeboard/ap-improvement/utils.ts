/**
 * @file utils.ts
 * @description AP 개선관리 유틸리티 함수
 * @author AI Assistant
 * @created 2026-01-03
 */

import { APLevel, APItem, APStats } from './types';

/**
 * AP 등급에 따른 배지 클래스 반환
 */
export const getAPBadgeClass = (ap: APLevel): string => {
  switch (ap) {
    case 'H':
      return 'bg-red-600 text-white hover:bg-red-700';
    case 'M':
      return 'bg-yellow-500 text-white hover:bg-yellow-600';
    case 'L':
      return 'bg-green-600 text-white hover:bg-green-700';
  }
};

/**
 * 상태에 따른 배지 클래스 반환
 */
export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case '완료':
      return 'bg-blue-600 text-white';
    case '진행중':
      return 'bg-orange-500 text-white';
    case '대기':
      return 'bg-gray-400 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
};

/**
 * AP 데이터 통계 계산
 */
export const calculateStats = (data: APItem[]): APStats => ({
  total: data.length,
  high: data.filter((d) => d.ap5 === 'H').length,
  medium: data.filter((d) => d.ap5 === 'M').length,
  low: data.filter((d) => d.ap5 === 'L').length,
  pending: data.filter((d) => d.status === '대기').length,
  inProgress: data.filter((d) => d.status === '진행중').length,
  completed: data.filter((d) => d.status === '완료').length,
});

/**
 * AP 데이터 필터링
 */
export const filterAPData = (
  data: APItem[],
  filterStatus: string,
  filterAP: string,
  searchTerm: string
): APItem[] => {
  return data.filter((item) => {
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchAP = filterAP === 'all' || item.ap5 === filterAP;
    const matchSearch =
      searchTerm === '' ||
      item.failureMode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.failureCause.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.responsible.includes(searchTerm);
    return matchStatus && matchAP && matchSearch;
  });
};

















