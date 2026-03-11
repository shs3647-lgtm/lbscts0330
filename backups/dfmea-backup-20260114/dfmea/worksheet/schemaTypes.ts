/**
 * @file schemaTypes.ts
 * @description FMEA 원자성 관계형 DB 타입 정의
 * @refactored schema.ts에서 분리됨 (2026-01-01)
 */

// ============ 기본 원자 단위 ============
export interface AtomicRecord {
  id: string;           // 고유 ID (PK)
  createdAt?: string;   // 생성일
  updatedAt?: string;   // 수정일
}

// ============ 구조분석 (2단계) - Structure Tables ============

/**
 * 1L 완제품 공정 (최상위)
 * - 상위: 없음 (루트)
 * - 하위: L2Structure (메인공정)
 */
export interface L1Structure extends AtomicRecord {
  fmeaId: string;       // FK: FMEA 프로젝트 ID
  name: string;         // 완제품 공정명
  confirmed?: boolean;  // 확정 상태
}

/**
 * 2L 메인공정
 * - 상위: L1Structure (완제품 공정) - FK: l1Id
 * - 하위: L3Structure (작업요소)
 */
export interface L2Structure extends AtomicRecord {
  fmeaId: string;       // FK: FMEA 프로젝트 ID
  l1Id: string;         // FK: L1Structure.id (상위 완제품 공정)
  no: string;           // 공정 번호
  name: string;         // 공정명
  order: number;        // 순서
}

/**
 * 3L 작업요소
 * - 상위: L2Structure (메인공정) - FK: l2Id
 * - 하위: 없음
 */
export interface L3Structure extends AtomicRecord {
  fmeaId: string;       // FK: FMEA 프로젝트 ID
  l1Id: string;         // FK: L1Structure.id (연결용)
  l2Id: string;         // FK: L2Structure.id (상위 메인공정)
  m4: 'MN' | 'MC' | 'IM' | 'EN' | '';  // 4M 분류
  name: string;         // 작업요소명
  order: number;        // 순서
}

// ============ 기능분석 (3단계) - Function Tables ============

/**
 * 1L 완제품 기능 (구분 → 기능 → 요구사항 통합)
 */
export interface L1Function extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l1StructId: string;     // FK: L1Structure.id (상위 구조분석)
  category: 'Your Plant' | 'Ship to Plant' | 'User';  // 구분
  functionName: string;   // 기능명
  requirement: string;    // 요구사항 (원자 단위)
}

/**
 * 2L 메인공정 기능 (기능 → 제품특성 통합)
 */
export interface L2Function extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l2StructId: string;     // FK: L2Structure.id (상위 구조분석 - 메인공정)
  functionName: string;   // 기능명
  productChar: string;    // 제품특성 (원자 단위)
  specialChar?: string;   // 특별특성
}

/**
 * 3L 작업요소 기능 (기능 → 공정특성 통합)
 */
export interface L3Function extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l3StructId: string;     // FK: L3Structure.id (상위 구조분석 - 작업요소)
  l2StructId: string;     // FK: L2Structure.id (연결용 - 메인공정)
  functionName: string;   // 기능명
  processChar: string;    // 공정특성 (원자 단위)
  specialChar?: string;   // 특별특성
}

// ============ 고장분석 (4단계) - Failure Tables ============

/**
 * 1L 고장영향 (Failure Effect - FE)
 */
export interface FailureEffect extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l1FuncId: string;       // FK: L1Function.id (상위 기능분석 - 요구사항)
  category: 'Your Plant' | 'Ship to Plant' | 'User';  // 구분
  effect: string;         // 고장영향 내용
  severity: number;       // 심각도 (1-10)
}

/**
 * 2L 고장형태 (Failure Mode - FM) - 중심축
 */
export interface FailureMode extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l2FuncId: string;       // FK: L2Function.id (상위 기능분석 - 제품특성)
  l2StructId: string;     // FK: L2Structure.id (메인공정 - 역전개용)
  mode: string;           // 고장형태 내용
  specialChar?: boolean;  // 특별특성 여부
}

/**
 * 3L 고장원인 (Failure Cause - FC)
 */
export interface FailureCause extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  l3FuncId: string;       // FK: L3Function.id (상위 기능분석 - 공정특성)
  l3StructId: string;     // FK: L3Structure.id (작업요소 - 역전개용)
  l2StructId: string;     // FK: L2Structure.id (메인공정 - 연결용)
  cause: string;          // 고장원인 내용
  occurrence?: number;    // 발생도 (1-10)
}

// ============ 고장연결 (Failure Link) - 관계 테이블 ============

/**
 * 고장연결 (FM을 중심으로 FE, FC 연결)
 */
export interface FailureLink extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  fmId: string;           // FK: FailureMode.id
  feId: string;           // FK: FailureEffect.id
  fcId: string;           // FK: FailureCause.id
  cache?: {
    fmText: string;
    fmProcess: string;
    feText: string;
    feCategory: string;
    feSeverity: number;
    fcText: string;
    fcWorkElem: string;
    fcProcess: string;
  };
}

// ============ 리스크분석/최적화 (5-6단계) ============

/**
 * 리스크 분석 결과 (AP 값)
 */
export interface RiskAnalysis extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  linkId: string;         // FK: FailureLink.id
  severity: number;       // 심각도 (1-10)
  occurrence: number;     // 발생도 (1-10)  
  detection: number;      // 검출도 (1-10)
  ap: 'H' | 'M' | 'L';    // Action Priority
  preventionControl?: string;
  detectionControl?: string;
}

/**
 * 최적화 결과 (6단계)
 */
export interface Optimization extends AtomicRecord {
  fmeaId: string;         // FK: FMEA 프로젝트 ID
  riskId: string;         // FK: RiskAnalysis.id
  recommendedAction: string;
  responsible: string;
  targetDate: string;
  newSeverity?: number;
  newOccurrence?: number;
  newDetection?: number;
  newAP?: 'H' | 'M' | 'L';
  status: 'planned' | 'in_progress' | 'completed';
  completedDate?: string;
}

// ============ 워크시트 전체 상태 (통합) ============

/**
 * FMEA 워크시트 DB (원자성 기반)
 */
export interface FMEAWorksheetDB {
  fmeaId: string;
  savedAt: string;
  l1Structure: L1Structure | null;
  l2Structures: L2Structure[];
  l3Structures: L3Structure[];
  l1Functions: L1Function[];
  l2Functions: L2Function[];
  l3Functions: L3Function[];
  failureEffects: FailureEffect[];
  failureModes: FailureMode[];
  failureCauses: FailureCause[];
  failureLinks: FailureLink[];
  riskAnalyses: RiskAnalysis[];
  optimizations: Optimization[];
  confirmed: {
    structure: boolean;
    l1Function: boolean;
    l2Function: boolean;
    l3Function: boolean;
    l1Failure: boolean;
    l2Failure: boolean;
    l3Failure: boolean;
    failureLink: boolean;
    risk: boolean;
    optimization: boolean;
  };
}

// ============ 검증 타입 ============

export interface ValidationError {
  level: 'error' | 'warning';
  field: string;
  message: string;
  itemId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  missingCount: number;
  totalCount: number;
}

// ============ FK 조회 결과 타입 ============

export interface LinkedDataRow {
  // 구조분석 (2단계)
  l1StructName: string;
  l2StructNo: string;
  l2StructName: string;
  l3StructM4: string;
  l3StructName: string;
  // 기능분석 (3단계)
  l1Category: string;
  l1FuncName: string;
  l1Requirement: string;
  l2FuncName: string;
  l2ProductChar: string;
  l3FuncName: string;
  l3ProcessChar: string;
  // 고장분석 (4단계)
  feCategory: string;
  feText: string;
  feSeverity: number;
  fmText: string;
  fcText: string;
  fcOccurrence: number;
  // 셀합치기용
  fmId: string;
  fmRowSpan: number;
  l2RowSpan: number;
}


