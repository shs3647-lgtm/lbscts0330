/**
 * @file types.ts
 * @description 통계검증 페이지 타입 정의
 */

/** 탭별 DB 카운트 — 17개 항목 */
export interface TabCounts {
  // 구조분석 (Step 2)
  l1Structure: number;
  l2Structure: number;
  l3Structure: number;

  // 1L 기능 (Step 3.1)
  l1Category: number;       // DISTINCT category (YP/SP/USER)
  l1Function: number;       // DISTINCT functionName
  l1Requirement: number;    // 요구사항 수

  // 2L 기능 (Step 3.2)
  l2Function: number;       // DISTINCT(l2StructId, functionName)
  productChar: number;      // ProcessProductChar 수

  // 3L 기능 (Step 3.3)
  l3Function: number;       // DISTINCT(l3StructId, functionName)
  l3ProcessChar: number;    // DISTINCT(l3StructId, processChar)

  // 고장분석 (Step 4)
  failureEffect: number;    // FE
  failureMode: number;      // FM
  failureCause: number;     // FC

  // 고장연결 (Step 4.5)
  failureLink: number;      // FailureLink (active)
  failureAnalysis: number;  // FailureAnalysis

  // 위험/최적화 (Step 5-6)
  riskAnalysis: number;
  optimization: number;
}

/** FK 정합성 검사 결과 — 개별 FK 관계 */
export interface FKCheckItem {
  relation: string;       // 예: "L2→L1 (l1Id)"
  table: string;          // 예: "L2Structure"
  field: string;          // 예: "l1Id"
  targetTable: string;    // 예: "L1Structure"
  orphanCount: number;
  sampleIds: string[];    // 최대 5개 샘플 ID
}

/** FK 정합성 검사 전체 결과 */
export interface FKIntegrityResult {
  checks: FKCheckItem[];
  totalOrphans: number;
}

/** Import vs DB 비교 항목 */
export interface ImportComparisonItem {
  code: string;           // A1, A2, B1, ...
  label: string;          // 공정번호, 공정명, ...
  importCount: number;
  dbCount: number;
  diff: number;           // import - db
  status: 'OK' | 'MISMATCH' | 'N/A';
}

/** Import vs DB 비교 전체 결과 */
export interface ImportComparisonResult {
  items: ImportComparisonItem[];
  totalMismatch: number;
}

/** 카테시안 중복 탐지 그룹 */
export interface CartesianGroup {
  table: string;
  groupKey: string;       // 예: "l2Id-xxx|제품특성A"
  count: number;          // 해당 그룹 내 레코드 수 (2 이상이면 중복)
}

/** 카테시안 중복 탐지 전체 결과 */
export interface CartesianResult {
  duplicateProductChars: number;
  duplicateFailureModes: number;
  groups: CartesianGroup[];
}

/** 종합 점수 */
export type IntegrityScore = 'A' | 'B' | 'C' | 'D';

/** API 응답 전체 구조 */
export interface VerifyIntegrityResponse {
  success: boolean;
  fmeaId: string;
  fmeaName?: string;
  counts: TabCounts;
  fkIntegrity: FKIntegrityResult;
  importComparison: ImportComparisonResult;
  cartesian: CartesianResult;
  linkDiag: {
    active: number;
    softDeleted: number;
    total: number;
    importChains: number;
  };
  score: IntegrityScore;
  totalIssues: number;
}

/** 탭별 카운트 표시 행 (UI용) */
export interface CountDisplayRow {
  section: string;        // 섹션 제목 (구조분석, 1L 기능, ...)
  label: string;          // 항목명 (L1 완제품, L2 공정, ...)
  labelEn: string;        // 영문 (L1Structure, L2Structure, ...)
  dbCount: number;
  status: 'ok' | 'warn' | 'error' | 'info';
  note?: string;
}

/** 검증 페이지 내부 탭 */
export type VerifyTab = 'counts' | 'fk' | 'import' | 'cartesian';
