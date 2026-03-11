/**
 * @file hooks/sync/types.ts
 * @description FMEA-CP 동기화 모듈 공통 타입 정의
 * @module sync
 */

// ============================================================================
// 동기화 방향 타입
// ============================================================================

/** 동기화 방향 */
export type SyncDirection = 
  | 'fmea-to-cp' 
  | 'cp-to-fmea';

/** 동기화 유형 */
export type SyncType = 
  | 'structure'  // 구조 동기화
  | 'data';      // 데이터 동기화

/** 동기화 상태 */
export type SyncStatus = 
  | 'idle' 
  | 'syncing' 
  | 'success' 
  | 'partial' 
  | 'conflict' 
  | 'error';

// ============================================================================
// 충돌 관련 타입
// ============================================================================

/** 충돌 정책 */
export type ConflictPolicy = 
  | 'ask'         // 사용자에게 묻기
  | 'fmea-wins'   // FMEA 우선
  | 'cp-wins'     // CP 우선
  | 'latest-wins' // 최신 수정 우선
  | 'skip';       // 건너뛰기

/** 충돌 해결 방법 */
export type ConflictResolution = 
  | 'use-fmea' 
  | 'use-cp' 
  | 'skip';

/** 충돌 정보 */
export interface SyncConflict {
  /** 충돌 필드명 */
  field: string;
  /** 필드 한글명 */
  fieldLabel: string;
  /** FMEA 값 */
  fmeaValue: string;
  /** CP 값 */
  cpValue: string;
  /** FMEA 수정 시간 */
  fmeaUpdatedAt?: Date;
  /** CP 수정 시간 */
  cpUpdatedAt?: Date;
  /** 해결 방법 (선택된 경우) */
  resolution?: ConflictResolution;
}

// ============================================================================
// 동기화 필드 매핑
// ============================================================================

/** FMEA-CP 필드 매핑 */
export interface FieldMapping {
  /** FMEA 필드명 */
  fmeaField: string;
  /** CP 필드명 */
  cpField: string;
  /** 필드 한글명 */
  label: string;
  /** 동기화 방향 */
  syncDirection: 'bidirectional' | 'fmea-only' | 'cp-only' | 'fmea-to-cp-readonly';
}

/** 동기화 대상 필드 목록 */
export const SYNC_FIELD_MAPPINGS: FieldMapping[] = [
  // 양방향 동기화 필드
  { fmeaField: 'l2No', cpField: 'processNo', label: '공정번호', syncDirection: 'bidirectional' },
  { fmeaField: 'l2Name', cpField: 'processName', label: '공정명', syncDirection: 'bidirectional' },
  { fmeaField: 'l2Function', cpField: 'processDesc', label: '공정설명', syncDirection: 'bidirectional' },
  { fmeaField: 'l3Name', cpField: 'workElement', label: '작업요소', syncDirection: 'bidirectional' },
  { fmeaField: 'equipment', cpField: 'equipment', label: '설비/금형/지그', syncDirection: 'bidirectional' },
  { fmeaField: 'productChar', cpField: 'productChar', label: '제품특성', syncDirection: 'bidirectional' },
  { fmeaField: 'processChar', cpField: 'processChar', label: '공정특성', syncDirection: 'bidirectional' },
  { fmeaField: 'specialChar', cpField: 'specialChar', label: '특별특성', syncDirection: 'bidirectional' },
  
  // FMEA 전용 필드
  { fmeaField: 'failureMode', cpField: '', label: '고장형태', syncDirection: 'fmea-only' },
  { fmeaField: 'failureEffect', cpField: '', label: '고장영향', syncDirection: 'fmea-only' },
  { fmeaField: 'failureCause', cpField: '', label: '고장원인', syncDirection: 'fmea-only' },
  
  // FMEA → CP 읽기전용
  { fmeaField: 'severity', cpField: 'refSeverity', label: '심각도', syncDirection: 'fmea-to-cp-readonly' },
  { fmeaField: 'occurrence', cpField: 'refOccurrence', label: '발생도', syncDirection: 'fmea-to-cp-readonly' },
  { fmeaField: 'detection', cpField: 'refDetection', label: '검출도', syncDirection: 'fmea-to-cp-readonly' },
  { fmeaField: 'ap', cpField: 'refAp', label: 'AP', syncDirection: 'fmea-to-cp-readonly' },
  
  // CP 전용 필드
  { fmeaField: '', cpField: 'evalMethod', label: '평가/측정방법', syncDirection: 'cp-only' },
  { fmeaField: '', cpField: 'sampleSize', label: '샘플링 크기', syncDirection: 'cp-only' },
  { fmeaField: '', cpField: 'sampleFreq', label: '샘플링 주기', syncDirection: 'cp-only' },
  { fmeaField: '', cpField: 'controlMethod', label: '관리방법', syncDirection: 'cp-only' },
  { fmeaField: '', cpField: 'reactionPlan', label: '대응계획', syncDirection: 'cp-only' },
];

// ============================================================================
// API 요청/응답 타입
// ============================================================================

/** 구조 동기화 요청 */
export interface StructureSyncRequest {
  direction: SyncDirection;
  sourceId: string;
  targetId?: string;  // null이면 신규 생성
  options?: {
    overwrite?: boolean;
    createEmpty?: boolean;
    preserveTarget?: string[];
  };
}

/** 데이터 동기화 요청 */
export interface DataSyncRequest {
  fmeaId: string;
  cpNo: string;
  fields?: string[];
  conflictPolicy?: ConflictPolicy;
  resolutions?: Array<{
    field: string;
    resolution: ConflictResolution;
  }>;
}

/** 동기화 응답 */
export interface SyncResponse {
  success: boolean;
  synced: number;
  conflicts: SyncConflict[];
  skipped: number;
  error?: string;
  targetId?: string;  // 신규 생성 시
}

// ============================================================================
// 훅 관련 타입
// ============================================================================

/** 동기화 훅 상태 */
export interface SyncHookState {
  status: SyncStatus;
  conflicts: SyncConflict[];
  lastSyncAt?: Date;
  error?: string;
}

/** 동기화 훅 반환 타입 */
export interface UseSyncReturn {
  state: SyncHookState;
  syncStructure: (request: StructureSyncRequest) => Promise<SyncResponse>;
  syncData: (request: DataSyncRequest) => Promise<SyncResponse>;
  resolveConflict: (field: string, resolution: ConflictResolution) => void;
  resolveAllConflicts: (resolution: ConflictResolution) => void;
  clearConflicts: () => void;
  reset: () => void;
}

// ============================================================================
// FMEA/CP 데이터 타입 (동기화용 간소화)
// ============================================================================

/** FMEA L2 구조 (동기화용) */
export interface FmeaL2ForSync {
  id: string;
  no: string;
  name: string;
  function: string;
  l3Structures?: FmeaL3ForSync[];
  productChars?: CharacteristicForSync[];
  processChars?: CharacteristicForSync[];
}

/** FMEA L3 구조 (동기화용) */
export interface FmeaL3ForSync {
  id: string;
  no: string;
  name: string;
  function: string;
  equipment?: string;
}

/** 특성 (동기화용) */
export interface CharacteristicForSync {
  id: string;
  name: string;
  specialChar?: string;
  severity?: number;
}

/** CP 항목 (동기화용) */
export interface CpItemForSync {
  id: string;
  processNo: string;
  processName: string;
  processLevel?: string;
  processDesc?: string;
  workElement?: string;
  equipment?: string;
  productChar?: string;
  processChar?: string;
  specialChar?: string;
  specTolerance?: string;
  evalMethod?: string;
  sampleSize?: string;
  sampleFreq?: string;
  controlMethod?: string;
  reactionPlan?: string;
  refSeverity?: number;
  refOccurrence?: number;
  refDetection?: number;
  refAp?: string;
  pfmeaRowUid?: string;
  pfmeaProcessId?: string;
  sortOrder?: number;
}

// ============================================================================
// 유틸리티 타입
// ============================================================================

/** 양방향 동기화 필드만 필터 */
export const getBidirectionalFields = (): FieldMapping[] => 
  SYNC_FIELD_MAPPINGS.filter(f => f.syncDirection === 'bidirectional');

/** FMEA→CP 동기화 필드 */
export const getFmeaToCpFields = (): FieldMapping[] => 
  SYNC_FIELD_MAPPINGS.filter(f => 
    f.syncDirection === 'bidirectional' || 
    f.syncDirection === 'fmea-to-cp-readonly'
  );

/** CP→FMEA 동기화 필드 */
export const getCpToFmeaFields = (): FieldMapping[] => 
  SYNC_FIELD_MAPPINGS.filter(f => f.syncDirection === 'bidirectional');
