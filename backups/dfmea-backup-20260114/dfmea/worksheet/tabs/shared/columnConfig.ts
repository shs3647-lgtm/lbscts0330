/**
 * @file columnConfig.ts
 * @description 40열 FMEA 컬럼 정의 (공용)
 * 구조분석(4) + 기능분석(8) + 고장분석(6) + 리스크분석(8) + 최적화(14) = 40열
 * 
 * 약어 정의 (참조: terminology.ts):
 * - 4M: Man(MN,사람) / Machine(MC,설비) / In-Material(IM,부자재) / Environment(EN,환경)
 * - 구분: Your Plant(자사) / Ship to Plant(고객사) / User(사용자) ※EU 사용금지
 * - FE: Failure Effect (고장영향)
 * - FM: Failure Mode (고장형태)
 * - FC: Failure Cause (고장원인)
 * - PC: Prevention Control (예방관리)
 * - DC: Detection Control (검출관리)
 * - S/O/D: Severity/Occurrence/Detection (심각도/발생도/검출도)
 * - AP: Action Priority (조치우선순위)
 * - RPN: Risk Priority Number (위험우선순위)
 * - SC: Special Characteristic (특별특성)
 */

// 컬럼 타입 정의
export interface ColumnDef {
  id: string;
  label: string;
  width: string;
  step: number;
  align?: 'left' | 'center' | 'right';
}

// 서브그룹 타입 정의
export interface SubGroup {
  label: string;
  cols: number;
  step: number;
}

// 단계 그룹 타입 정의
export interface StepGroup {
  step: number;
  name: string;
  count: number;
  bg: string;
  headerBg: string;
  cellBg: string;
}

// ============ 40열 컬럼 정의 ============

// 구조분석 2단계 (4열)
export const STRUCTURE_COLUMNS: ColumnDef[] = [
  { id: 'l1Name', label: '완제품 공정명', width: '80px', step: 2 },  // L1 Structure
  { id: 'l2Name', label: 'NO+공정명', width: '90px', step: 2 },      // L2 Structure (공정번호+공정명)
  { id: 'm4', label: '4M', width: '80px', step: 2, align: 'center' }, // 4M: MN(Man)/MC(Machine)/IM(Input Material)/EN(Environment)
  { id: 'l3Name', label: '작업요소', width: '80px', step: 2 },       // L3 Structure
];

// 기능분석 3단계 (8열)
export const FUNCTION_COLUMNS: ColumnDef[] = [
  { id: 'l1Type', label: '구분', width: '50px', step: 3, align: 'center' },
  { id: 'l1Function', label: '완제품기능', width: '100px', step: 3 },
  { id: 'l1Requirement', label: '요구사항', width: '80px', step: 3 },
  { id: 'l2Function', label: '공정기능', width: '90px', step: 3 },
  { id: 'l2ProductChar', label: '제품특성', width: '70px', step: 3 },
  { id: 'l3Type', label: '작업요소', width: '50px', step: 3, align: 'center' },
  { id: 'l3Function', label: '작업요소기능', width: '90px', step: 3 },
  { id: 'l3ProcessChar', label: '공정특성', width: '70px', step: 3 },
];

// 고장분석 4단계 (6열)
export const FAILURE_COLUMNS: ColumnDef[] = [
  { id: 'feType', label: '구분', width: '50px', step: 4, align: 'center' },
  { id: 'failureEffect', label: '고장영향(FE)', width: '100px', step: 4 },
  { id: 'severity', label: '심각도', width: '35px', step: 4, align: 'center' },
  { id: 'failureMode', label: '고장형태(FM)', width: '90px', step: 4 },
  { id: 'fcType', label: '작업요소', width: '50px', step: 4, align: 'center' },
  { id: 'failureCause', label: '고장원인(FC)', width: '90px', step: 4 },
];

// 리스크분석 5단계 (8열)
export const RISK_COLUMNS: ColumnDef[] = [
  { id: 'prevention', label: '예방관리(PC)', width: '90px', step: 5 },
  { id: 'occurrence', label: '발생도', width: '35px', step: 5, align: 'center' },
  { id: 'detection', label: '검출관리(DC)', width: '90px', step: 5 },
  { id: 'detectability', label: '검출도', width: '35px', step: 5, align: 'center' },
  { id: 'ap', label: 'AP', width: '30px', step: 5, align: 'center' },
  { id: 'rpn', label: 'RPN', width: '35px', step: 5, align: 'center' },
  { id: 'specialChar', label: '특별특성', width: '50px', step: 5, align: 'center' },
  { id: 'lessonLearned', label: '습득교훈', width: '80px', step: 5 },
];

// 최적화 6단계 (14열)
export const OPT_COLUMNS: ColumnDef[] = [
  { id: 'preventionImprove', label: '예방관리개선', width: '80px', step: 6 },
  { id: 'detectionImprove', label: '검출관리개선', width: '80px', step: 6 },
  { id: 'responsible', label: '책임자성명', width: '60px', step: 6, align: 'center' },
  { id: 'targetDate', label: '목표완료일자', width: '70px', step: 6, align: 'center' },
  { id: 'status', label: '상태', width: '40px', step: 6, align: 'center' },
  { id: 'resultEvidence', label: '개선결과근거', width: '80px', step: 6 },
  { id: 'completionDate', label: '완료일자', width: '70px', step: 6, align: 'center' },
  { id: 'newSeverity', label: '심각도', width: '35px', step: 6, align: 'center' },
  { id: 'newOccurrence', label: '발생도', width: '35px', step: 6, align: 'center' },
  { id: 'newDetectability', label: '검출도', width: '35px', step: 6, align: 'center' },
  { id: 'newSpecialChar', label: '특별특성', width: '50px', step: 6, align: 'center' },
  { id: 'newAP', label: 'AP', width: '30px', step: 6, align: 'center' },
  { id: 'newRPN', label: 'RPN', width: '35px', step: 6, align: 'center' },
  { id: 'remarks', label: '비고', width: '80px', step: 6 },
];

// 전체 40열
export const ALL_COLUMNS: ColumnDef[] = [
  ...STRUCTURE_COLUMNS,
  ...FUNCTION_COLUMNS,
  ...FAILURE_COLUMNS,
  ...RISK_COLUMNS,
  ...OPT_COLUMNS,
];

// ============ 단계 그룹 정의 ============

export const STEP_GROUPS: StepGroup[] = [
  { step: 2, name: 'P-FMEA 구조분석(2단계)', count: 4, bg: '#1565c0', headerBg: '#bbdefb', cellBg: '#e3f2fd' },
  { step: 3, name: 'P-FMEA 기능분석(3단계)', count: 8, bg: '#1b5e20', headerBg: '#c8e6c9', cellBg: '#e8f5e9' },
  { step: 4, name: 'P-FMEA 고장분석(4단계)', count: 6, bg: '#c62828', headerBg: '#fff9c4', cellBg: '#fffde7' },
  { step: 5, name: 'P-FMEA 리스크분석(5단계)', count: 8, bg: '#6a1b9a', headerBg: '#e1bee7', cellBg: '#f3e5f5' },
  { step: 6, name: 'P-FMEA 최적화(6단계)', count: 14, bg: '#e65100', headerBg: '#ffe0b2', cellBg: '#fff3e0' },
];

// ============ 서브그룹 정의 ============

export const SUB_GROUPS: SubGroup[] = [
  // 구조분석 (3개 서브그룹)
  { label: '1. 완제품 공정명', cols: 1, step: 2 },
  { label: '2. 메인 공정명', cols: 1, step: 2 },
  { label: '3. 작업 요소명', cols: 2, step: 2 },
  // 기능분석 (3개 서브그룹)
  { label: '1. 완제품 공정기능/요구사항', cols: 3, step: 3 },
  { label: '2. 메인공정기능 및 제품특성', cols: 2, step: 3 },
  { label: '3. 작업요소의 기능 및 공정특성', cols: 3, step: 3 },
  // 고장분석 (3개 서브그룹)
  { label: '1. 자사/고객/사용자 고장영향(FE)', cols: 3, step: 4 },
  { label: '2. 메인공정 고장형태(FM)', cols: 1, step: 4 },
  { label: '3. 작업요소 고장원인(FC)', cols: 2, step: 4 },
  // 리스크분석 (3개 서브그룹)
  { label: '현재 예방관리', cols: 2, step: 5 },
  { label: '현재 검출관리', cols: 2, step: 5 },
  { label: '리스크 평가', cols: 4, step: 5 },
  // 최적화 (3개 서브그룹)
  { label: '계획', cols: 4, step: 6 },
  { label: '결과 모니터링', cols: 3, step: 6 },
  { label: '효과 평가', cols: 7, step: 6 },
];

// 단계별 컬럼 가져오기
export const getColumnsByStep = (step: number): ColumnDef[] => {
  switch (step) {
    case 2: return STRUCTURE_COLUMNS;
    case 3: return FUNCTION_COLUMNS;
    case 4: return FAILURE_COLUMNS;
    case 5: return RISK_COLUMNS;
    case 6: return OPT_COLUMNS;
    default: return [];
  }
};

// 단계별 서브그룹 가져오기
export const getSubGroupsByStep = (step: number): SubGroup[] => {
  return SUB_GROUPS.filter(sg => sg.step === step);
};

// 단계별 그룹 정보 가져오기
export const getStepGroup = (step: number): StepGroup | undefined => {
  return STEP_GROUPS.find(g => g.step === step);
};

