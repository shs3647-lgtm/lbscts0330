/**
 * @file hooks/revision/types.ts
 * @description 변경 히스토리 모듈 타입 정의 (SOD + 고장확정 + 6ST확정)
 * @module revision
 * @created 2026-01-19
 * @updated 2026-01-19 - 고장확정, 6ST확정 타입 추가
 * @lines ~120 (500줄 미만 원칙)
 */

// ============================================================================
// 변경 타입 정의
// ============================================================================

/** SOD 변경 타입 */
export type SODChangeType = 'S' | 'O' | 'D'; // Severity, Occurrence, Detection

/** 확정 변경 타입 */
export type ConfirmChangeType = 
  | 'FAILURE_LINK_CONFIRM'  // 고장연결 전체확정
  | 'STEP6_CONFIRM'         // 6ST(최적화) 확정
  | 'ORPHAN_CLEAN';         // 고아 데이터 정리

/** 전체 변경 타입 */
export type ChangeType = SODChangeType | ConfirmChangeType;

/** SOD 변경 타입 레이블 */
export const SOD_TYPE_LABELS: Record<SODChangeType, string> = {
  S: '심각도',
  O: '발생도',
  D: '검출도',
};

/** 확정 변경 타입 레이블 */
export const CONFIRM_TYPE_LABELS: Record<ConfirmChangeType, string> = {
  FAILURE_LINK_CONFIRM: '고장연결 확정',
  STEP6_CONFIRM: '6ST 확정',
  ORPHAN_CLEAN: '고아 정리',
};

/** 전체 변경 타입 레이블 */
export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  ...SOD_TYPE_LABELS,
  ...CONFIRM_TYPE_LABELS,
};

// ============================================================================
// SOD 히스토리 레코드
// ============================================================================

/** SOD 히스토리 레코드 (DB 모델과 1:1 매핑) */
export interface SODHistoryRecord {
  id: string;
  fmeaId: string;
  revMajor: number;
  revMinor: number;
  fmId: string;
  fmNo?: string | null;
  fmText?: string | null;
  fcId?: string | null;
  fcNo?: string | null;
  fcText?: string | null;
  changeType: SODChangeType;
  oldValue: number;
  newValue: number;
  changeNote?: string | null;
  changedBy?: string | null;
  changedAt: Date | string;
}

/** 확정 히스토리 레코드 (고장확정, 6ST확정) */
export interface ConfirmHistoryRecord {
  id: string;
  fmeaId: string;
  revMajor: number;
  revMinor: number;
  changeType: ConfirmChangeType;
  summary: string;           // 확정 요약 (예: "FM 4개, FE 12개, FC 20개 연결")
  details?: {                // 상세 정보
    fmCount?: number;
    feCount?: number;
    fcCount?: number;
    linkCount?: number;
    orphanFmCount?: number;
    orphanFeCount?: number;
    orphanFcCount?: number;
  };
  changeNote?: string | null;
  changedBy?: string | null;
  changedAt: Date | string;
}

/** 통합 변경 히스토리 (SOD + 확정) */
export type ChangeHistoryRecord = SODHistoryRecord | ConfirmHistoryRecord;

/** SOD 레코드인지 확인 */
export function isSODRecord(record: ChangeHistoryRecord): record is SODHistoryRecord {
  return ['S', 'O', 'D'].includes(record.changeType);
}

/** 확정 레코드인지 확인 */
export function isConfirmRecord(record: ChangeHistoryRecord): record is ConfirmHistoryRecord {
  return ['FAILURE_LINK_CONFIRM', 'STEP6_CONFIRM', 'ORPHAN_CLEAN'].includes(record.changeType);
}

// ============================================================================
// API 요청/응답 타입
// ============================================================================

/** SOD 히스토리 생성 요청 */
export interface CreateSODHistoryRequest {
  fmeaId: string;
  fmId: string;
  fmNo?: string;
  fmText?: string;
  fcId?: string;
  fcNo?: string;
  fcText?: string;
  changeType: SODChangeType;
  oldValue: number;
  newValue: number;
  changeNote?: string;
  changedBy?: string;
}

/** SOD 히스토리 조회 응답 */
export interface SODHistoryResponse {
  success: boolean;
  data?: SODHistoryRecord[];
  revMajor?: number;
  revMinor?: number;
  error?: string;
}

/** 정식개정 요청 */
export interface OfficialRevisionRequest {
  fmeaId: string;
  revisionNote?: string;
  revisedBy?: string;
}

// ============================================================================
// SOD 값 상태 (변경 감지용)
// ============================================================================

/** SOD 값 */
export interface SODValues {
  severity: number;
  occurrence: number;
  detection: number;
}

/** SOD 스냅샷 (변경 전 값 저장) */
export interface SODSnapshot {
  fmId: string;
  fmNo?: string;
  fmText?: string;
  fcId?: string;
  fcNo?: string;
  fcText?: string;
  values: SODValues;
}

// ============================================================================
// 훅 상태 타입
// ============================================================================

/** SOD 히스토리 훅 상태 */
export interface SODHistoryState {
  isLoading: boolean;
  histories: SODHistoryRecord[];
  revMajor: number;
  revMinor: number;
  error?: string;
}

/** SOD 히스토리 훅 반환 타입 */
export interface UseSODHistoryReturn {
  state: SODHistoryState;
  loadHistories: () => Promise<void>;
  recordChange: (change: CreateSODHistoryRequest) => Promise<boolean>;
  deleteHistory: (historyId: string) => Promise<boolean>;
  clearHistoriesForRevision: (revMajor: number) => Promise<boolean>;
}
