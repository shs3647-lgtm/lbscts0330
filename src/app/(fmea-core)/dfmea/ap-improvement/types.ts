/**
 * @file types.ts
 * @description AP 개선관리 타입 정의
 */

/** AP 등급 타입 */
export type APLevel = 'H' | 'M' | 'L';

/** 상태 타입 */
export type APStatus = '대기' | '진행중' | '완료';

/** AP 데이터 인터페이스 (DB 연동) */
export interface APItem {
  id: string;              // RiskAnalysis.id
  riskId: string;          // RiskAnalysis.id (API용)
  optId?: string;          // Optimization.id (있으면)
  fmeaId: string;          // FMEA 프로젝트 ID
  linkId: string;          // FailureLink.id
  ap5: APLevel;            // 5단계 AP (H/M/L)
  ap6: APLevel | '';       // 6단계 AP (최적화 후, 없으면 '')
  specialChar: string;     // 특별특성 (CC/SC/-)
  category: '예방' | '검출' | '';
  preventiveControl: string;    // 현재 예방관리 (5단계)
  severity: number;
  failureMode: string;
  failureCause: string;
  occurrence: number;
  detectionControl: string;     // 현재 검출관리 (5단계)
  detection: number;
  preventionAction: string;     // 개선 예방조치 (6단계)
  detectionAction: string;      // 개선 검출조치 (6단계)
  responsible: string;
  status: APStatus;
  dueDate: string;
  completedDate?: string;       // 완료일
  processName?: string;         // 공정명 (표시용)
  newSeverity?: number;         // 최적화 후 S
  newOccurrence?: number;       // 최적화 후 O
  newDetection?: number;        // 최적화 후 D
  remarks?: string;             // 비고
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

/** FMEA 프로젝트 (선택 드롭다운용) */
export interface FMEAProjectSimple {
  id: string;
  fmeaId: string;
  productName: string;
  fmeaType: string;
}
