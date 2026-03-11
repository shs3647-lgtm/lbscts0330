/**
 * @file schema/types.ts
 * @description FMEA 원자성 관계형 DB 스키마 타입 정의
 */

// ============ 기본 원자 단위 ============
export interface AtomicRecord {
  id: string;           // 고유 ID (PK)
  createdAt?: string;   // 생성일
  updatedAt?: string;   // 수정일
}

// ============ 구조분석 (2단계) - Structure Tables ============

export interface L1Structure extends AtomicRecord {
  fmeaId: string;
  name: string;
  confirmed?: boolean;
}

export interface L2Structure extends AtomicRecord {
  fmeaId: string;
  l1Id: string;
  no: string;
  name: string;
  order: number;
}

export interface L3Structure extends AtomicRecord {
  fmeaId: string;
  l2Id: string;
  m4: string;
  name: string;
  order: number;
}

// ============ 기능분석 (3단계) - Function Tables ============

export interface L1Function extends AtomicRecord {
  fmeaId: string;
  l1StructId: string;
  category: string;
  functionName: string;
  requirement: string;
}

export interface L2Function extends AtomicRecord {
  fmeaId: string;
  l2StructId: string;
  functionName: string;
  productChar: string;
  specialChar?: string;
}

export interface L3Function extends AtomicRecord {
  fmeaId: string;
  l3StructId: string;
  functionName: string;
  processChar: string;
  specialChar?: string;
}

// ============ 고장분석 (4단계) - Failure Tables ============

export interface FailureEffect extends AtomicRecord {
  fmeaId: string;
  l1FuncId: string;
  category: string;
  effect: string;
  severity: number;
}

export interface FailureMode extends AtomicRecord {
  fmeaId: string;
  l2FuncId: string;
  mode: string;
}

export interface FailureCause extends AtomicRecord {
  fmeaId: string;
  l3StructId: string;
  l3FuncId: string;
  cause: string;
  occurrence: number;
}

// ============ 고장연결 (4단계 확장) ============

export interface FailureLink extends AtomicRecord {
  fmeaId: string;
  fmId: string;
  feId?: string;
  fcId?: string;
  cache?: {
    feNo?: string;
    feCategory?: string;
    feText?: string;
    feSeverity?: number;
    fmText?: string;
    fmProcess?: string;
    fcNo?: string;
    fcProcess?: string;
    fcM4?: string;
    fcWorkElem?: string;
    fcText?: string;
  };
}

// ============ 리스크분석 (5단계) ============

export interface RiskAnalysis extends AtomicRecord {
  fmeaId: string;
  linkId: string;
  preventionControl: string;
  detectionControl: string;
  detection: number;
  ap: string;
  rpn?: number;
}

// ============ 최적화 (6단계) ============

export interface Optimization extends AtomicRecord {
  fmeaId: string;
  riskId: string;
  action: string;
  responsible: string;
  targetDate: string;
  status: string;
  evidence?: string;
  newOccurrence?: number;
  newDetection?: number;
  newAp?: string;
  newRpn?: number;
}

// ============ 전체 DB 구조 ============

export interface FMEAWorksheetDB {
  fmeaId: string;
  fmeaName?: string;
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
  confirmedSteps: number[];
}

// ============ 유효성 검사 타입 ============

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

// ============ Flatten된 행 타입 ============

export interface FlattenedRow {
  l1StructName: string;
  l2StructNo: string;
  l2StructName: string;
  l3StructM4: string;
  l3StructName: string;
  l1Category: string;
  l1FuncName: string;
  l1Requirement: string;
  l2FuncName: string;
  l2ProductChar: string;
  l3FuncName: string;
  l3ProcessChar: string;
  feCategory: string;
  feText: string;
  feSeverity: number;
  fmText: string;
  fcText: string;
  fcOccurrence: number;
  fmId: string;
  fmRowSpan: number;
  l2RowSpan: number;
}
