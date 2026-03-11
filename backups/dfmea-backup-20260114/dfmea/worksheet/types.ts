/**
 * @file types.ts
 * @description PFMEA 워크시트 타입 정의
 * @version 1.0.0
 * @created 2025-12-26
 * @ref PRD-005-pfmea-worksheet.md
 */

/** 4M 카테고리 */
export type Category4M = 'MN' | 'MC' | 'IM' | 'EN';

/** 4M 코드 설명 */
export const CATEGORY_4M_LABELS: Record<Category4M, string> = {
  MN: '작업자 (Man)',
  MC: '설비 (Machine)',
  IM: '재료 (In Material)',
  EN: '환경 (Environment)',
};

/** AP (Action Priority) */
export type ActionPriority = 'H' | 'M' | 'L';

/** AP 색상 */
export const AP_COLORS: Record<ActionPriority, { bg: string; text: string }> = {
  H: { bg: '#FEE2E2', text: '#DC2626' }, // 빨강
  M: { bg: '#FEF3C7', text: '#D97706' }, // 노랑
  L: { bg: '#D1FAE5', text: '#059669' }, // 녹색
};

/** 특별특성 코드 */
export type SpecialCharType = 'CC' | 'SC' | 'FFF' | 'HI' | 'BM-C' | 'BM-L' | 'BM-S' | '';

/** 특별특성 색상 */
export const SPECIAL_CHAR_COLORS: Record<string, string> = {
  CC: '#DC2626',  // Critical - 빨강
  SC: '#D97706',  // Significant - 주황
  FFF: '#2563EB', // Fit/Form/Function - 파랑
  HI: '#F97316',  // High Impact - 오렌지
};

/** 개선조치 상태 */
export type ImprovementStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Verified';

/** PFMEA 워크시트 행 데이터 (40개 컬럼 + id) */
export interface PFMEAWorksheetRow {
  id: string;
  
  // 개정/이력 (2개)
  revisionNo: string;
  changeHistory: string;
  
  // 2단계: 구조분석 (5개)
  productName: string;        // 완제품 이름명
  processName: string;        // 공정 이름명
  workElement: string;        // 작업요소명
  category4M: Category4M | '';// 4M
  workElementDetail: string;  // 작업요소 상세
  
  // 3단계: 기능분석 (9개)
  productRequirement: string; // 완제품 요구사항
  requirement: string;        // 요구사항
  processFunction: string;    // 공정 기능
  productChar: string;        // 제품특성
  workElementFunc: string;    // 작업요소 기능
  workElementFunc2: string;   // 추가 기능 설명
  processChar: string;        // 공정특성
  processChar2: string;       // 추가 공정특성
  processChar3: string;       // 추가 공정특성
  
  // 4단계: 고장분석 (7개)
  failureNaming: string;      // 고장/영향/원인 이름명
  failureEffect: string;      // 고장영향 (FE)
  severity: number | null;    // 심각도 (1-10)
  failureMode: string;        // 고장형태 (FM)
  workElementFC: string;      // 원인 관련 작업요소
  failureCause: string;       // 고장원인 (FC)
  failureCause2: string;      // 추가 고장원인
  
  // 5단계: 리스크분석 (7개)
  preventionControl: string;  // 예방관리 (PC)
  occurrence: number | null;  // 발생도 (1-10)
  detectionControl: string;   // 검출관리 (DC)
  detection: number | null;   // 검출도 (1-10)
  ap: ActionPriority | '';    // AP
  specialChar: SpecialCharType; // 특별특성
  remarks: string;            // 비고
  
  // 6단계: 최적화 (10개)
  improvementPlan: string;    // 개선계획
  preventionAction: string;   // 예방조치내용
  detectionAction: string;    // 검출조치내용
  responsiblePerson: string;  // 책임자/소속
  targetDate: string;         // 목표완료일자
  status: ImprovementStatus | ''; // 상태
  actionTaken: string;        // 조치내용/이름명
  completionDate: string;     // 완료일자
  severityAfter: number | null;   // 심각도 (조치후)
  occurrenceAfter: number | null; // 발생도 (조치후)
  detectionAfter: number | null;  // 검출도 (조치후)
  specialCharAfter: SpecialCharType; // 특별특성 (조치후)
  apAfter: ActionPriority | ''; // AP (조치후)
  remarksAfter: string;       // 비고 (조치후)
}

/** PFMEA 헤더 정보 */
export interface PFMEAHeader {
  company: string;
  customer: string;
  plant: string;
  productProgram: string;
  fmeaId: string;
  startDate: string;
  revisionNo: number;
  responsibility: string;
  securityLevel: string;
  approvalList: string[];
}

/** 컬럼 그룹 정의 */
export interface ColumnGroup {
  name: string;
  label: string;
  color: string;
  startCol: number;
  endCol: number;
}

/** 7단계 메뉴 */
export interface Step {
  id: number;
  label: string;
  shortLabel: string;
  icon: string;
  active: boolean;
}

/** 7단계 정의 */
export const FMEA_STEPS: Step[] = [
  { id: 1, label: '1단계: 구조분석', shortLabel: '구조', icon: '🏗️', active: true },
  { id: 2, label: '2단계: 기능분석', shortLabel: '기능', icon: '⚙️', active: true },
  { id: 3, label: '3단계: 고장분석', shortLabel: '고장', icon: '⚠️', active: true },
  { id: 4, label: '4단계: 리스크분석', shortLabel: '리스크', icon: '📊', active: true },
  { id: 0, label: '고장연결', shortLabel: '연결', icon: '🔗', active: true },
  { id: 5, label: '5단계: 최적화', shortLabel: '최적화', icon: '🎯', active: true },
  { id: 6, label: '6단계: 효과확인', shortLabel: '효과', icon: '✅', active: true },
  { id: 7, label: '7단계: 문서화', shortLabel: '문서', icon: '📄', active: true },
];

/** AP 계산 함수 (VDA FMEA 기준) */
export function calculateAP(severity: number, occurrence: number): ActionPriority {
  const s = severity;
  const o = occurrence;
  
  // H (High) 조건
  if (s >= 9) return 'H';
  if (s >= 7 && o >= 4) return 'H';
  if (s >= 5 && o >= 6) return 'H';
  
  // M (Medium) 조건
  if (s >= 5 && o >= 3) return 'M';
  if (s >= 4 && o >= 4) return 'M';
  
  // L (Low)
  return 'L';
}

/** 빈 행 생성 */
export function createEmptyRow(): PFMEAWorksheetRow {
  return {
    id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    revisionNo: '',
    changeHistory: '',
    productName: '',
    processName: '',
    workElement: '',
    category4M: '',
    workElementDetail: '',
    productRequirement: '',
    requirement: '',
    processFunction: '',
    productChar: '',
    workElementFunc: '',
    workElementFunc2: '',
    processChar: '',
    processChar2: '',
    processChar3: '',
    failureNaming: '',
    failureEffect: '',
    severity: null,
    failureMode: '',
    workElementFC: '',
    failureCause: '',
    failureCause2: '',
    preventionControl: '',
    occurrence: null,
    detectionControl: '',
    detection: null,
    ap: '',
    specialChar: '',
    remarks: '',
    improvementPlan: '',
    preventionAction: '',
    detectionAction: '',
    responsiblePerson: '',
    targetDate: '',
    status: '',
    actionTaken: '',
    completionDate: '',
    severityAfter: null,
    occurrenceAfter: null,
    detectionAfter: null,
    specialCharAfter: '',
    apAfter: '',
    remarksAfter: '',
  };
}



