/**
 * @file types.ts
 * @description AP 개선관리 타입 정의
 * @author AI Assistant
 * @created 2026-01-03
 */

/** AP 등급 타입 */
export type APLevel = 'H' | 'M' | 'L';

/** 상태 타입 */
export type APStatus = '대기' | '진행중' | '완료';

/** AP 데이터 인터페이스 */
export interface APItem {
  id: string;
  ap5: APLevel;
  ap6: APLevel;
  specialChar: string;
  preventiveControl: string;
  severity: number;
  failureMode: string;
  failureCause: string;
  occurrence: number;
  detectionControl: string;
  detection: number;
  preventionAction: string;
  detectionAction: string;
  responsible: string;
  status: APStatus;
  dueDate: string;
}

/** 통계 인터페이스 */
export interface APStats {
  total: number;
  high: number;
  medium: number;
  low: number;
  pending: number;
  inProgress: number;
  completed: number;
}

















