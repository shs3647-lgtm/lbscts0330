/**
 * @file types.ts
 * @description 웰컴보드 타입 정의
 * @author AI Assistant
 * @created 2026-01-03
 */

/** 프로젝트 상태 타입 */
export interface ProjectStats {
  inProgress: number;
  completed: number;
  delayed: number;
}

/** AP 등급 타입 */
export type APLevel = 'H' | 'M' | 'L';

/** AP 상태 타입 */
export type APStatus = '대기' | '진행중' | '완료';

/** AP 요약 데이터 인터페이스 */
export interface APSummaryItem {
  id: string;
  ap5: APLevel;
  ap6: APLevel | null;
  severity: number;
  occurrence: number;
  detection: number;
  prn5: number;
  prn6: number | null;
  specialChar: string;
  preventiveControl: string;
  failureMode: string;
  failureCause: string;
  detectionControl: string;
  preventionAction: string;
  detectionAction: string;
  responsible: string;
  status: APStatus;
  dueDate: string;
}

/** AP 통계 인터페이스 */
export interface APStats {
  total: number;
  high: number;
  medium: number;
  low: number;
  completed: number;
}

/** 바로가기 링크 인터페이스 */
export interface QuickLinkItem {
  id: string;
  title: string;
  badge: string | null;
  desc: string;
  href: string;
}





