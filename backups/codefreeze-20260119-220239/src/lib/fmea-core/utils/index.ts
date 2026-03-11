/**
 * @file fmea-core/utils/index.ts
 * @description FMEA 공용 유틸리티 함수
 */

export { uid } from '../hooks/useUID';

// ============ AP 계산 함수 ============

export type APLevel = 'H' | 'M' | 'L';

export interface APCalculationResult {
  ap5: APLevel | null;
  ap6: APLevel | null;
}

/** 5단계 AP 계산 */
export const calculateAP5 = (
  severity: number | undefined,
  occurrence: number | undefined,
  detection: number | undefined
): APLevel | null => {
  if (!severity || !occurrence || !detection) return null;
  
  // AP 매트릭스 기준
  if (severity >= 9) return 'H';
  if (severity >= 7 && occurrence >= 4) return 'H';
  if (severity >= 5 && occurrence >= 6 && detection >= 5) return 'H';
  if (severity >= 5 && occurrence >= 4) return 'M';
  if (severity >= 3 && occurrence >= 4 && detection >= 4) return 'M';
  return 'L';
};

/** 6단계 AP 계산 (조치 후) */
export const calculateAP6 = (
  severity: number | undefined,
  occurrence: number | undefined,
  detection: number | undefined
): APLevel | null => {
  return calculateAP5(severity, occurrence, detection);
};

// ============ 텍스트 유틸리티 ============

/** 텍스트 truncate */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/** 빈 값 체크 */
export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

// ============ 숫자 유틸리티 ============

/** SOD 값 범위 체크 (1-10) */
export const isValidSOD = (value: number | undefined): boolean => {
  if (value === undefined) return false;
  return Number.isInteger(value) && value >= 1 && value <= 10;
};

/** 숫자 포맷 (천 단위 콤마) */
export const formatNumber = (value: number): string => {
  return value.toLocaleString('ko-KR');
};

// ============ 날짜 유틸리티 ============

/** 현재 날짜 포맷 (YYYY-MM-DD) */
export const formatDate = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

/** 현재 시간 포맷 (YYYY-MM-DD HH:mm:ss) */
export const formatDateTime = (date: Date = new Date()): string => {
  return date.toISOString().replace('T', ' ').slice(0, 19);
};

// ============ 배열 유틸리티 ============

/** 배열에서 중복 제거 */
export const uniqueArray = <T>(arr: T[], key?: keyof T): T[] => {
  if (!key) return [...new Set(arr)];
  const seen = new Set<T[keyof T]>();
  return arr.filter((item) => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

/** 배열 정렬 */
export const sortByKey = <T>(arr: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};
