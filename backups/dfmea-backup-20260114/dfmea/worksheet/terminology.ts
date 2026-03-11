/**
 * @file terminology.ts
 * @description PFMEA 표준 용어 정의 (약어, 원어, 한글)
 * @version 1.0.0
 * @created 2025-12-29
 * 
 * ⚠️ 모든 컬럼명, 모달, 화면에서 이 파일의 용어를 참조할 것
 * ⚠️ 약어 사용 시 반드시 원어 주석 포함
 */

// ============ 4M 분류 (Man, Machine, Input Material, Environment) ============

/**
 * 4M 분류 정의
 * - MN: Man (사람) - 작업자 관련 원인
 * - MC: Machine (설비) - 설비/장비 관련 원인
 * - IM: In-Material (부자재) - 원자재/부자재 관련 원인
 * - EN: Environment (환경) - 작업환경 관련 원인
 */
export const M4_CATEGORIES = {
  MN: { abbr: 'MN', en: 'Man', ko: '사람', description: '작업자 관련 원인' },
  MC: { abbr: 'MC', en: 'Machine', ko: '설비', description: '설비/장비 관련 원인' },
  IM: { abbr: 'IM', en: 'In-Material', ko: '부자재', description: '원자재/부자재 관련 원인' },
  EN: { abbr: 'EN', en: 'Environment', ko: '환경', description: '작업환경 관련 원인' },
} as const;

export type M4Type = keyof typeof M4_CATEGORIES;

export const M4_OPTIONS: M4Type[] = ['MN', 'MC', 'IM', 'EN'];

export const M4_COLORS: Record<M4Type, { bg: string; text: string }> = {
  MN: { bg: '#ffebee', text: '#d32f2f' }, // 빨강 (사람)
  MC: { bg: '#e3f2fd', text: '#1565c0' }, // 파랑 (설비)
  IM: { bg: '#e8f5e9', text: '#2e7d32' }, // 녹색 (자재)
  EN: { bg: '#fff3e0', text: '#f57c00' }, // 주황 (환경)
};

// ============ 구분 (Category: Your Plant, Ship to Plant, End User) ============

/**
 * 구분 (고장영향 범위) 정의
 * - Your Plant: 자사 공정 내 영향
 * - Ship to Plant: 고객 공장 영향
 * - User: 최종 사용자 영향
 * 
 * ⚠️ EU 사용 금지 (유럽연합과 혼동) → User 그대로 사용
 */
export const CATEGORY_TYPES = {
  'Your Plant': { abbr: 'Your Plant', en: 'Your Plant', ko: '자사', description: '자사 공정 내 영향' },
  'Ship to Plant': { abbr: 'Ship to Plant', en: 'Ship to Plant', ko: '고객사', description: '고객 공장 영향' },
  'User': { abbr: 'User', en: 'User', ko: '사용자', description: '최종 사용자 영향' },
} as const;

export type CategoryType = keyof typeof CATEGORY_TYPES;

export const CATEGORY_OPTIONS: CategoryType[] = ['Your Plant', 'Ship to Plant', 'User'];

export const CATEGORY_COLORS: Record<CategoryType, { bg: string; light: string; text: string }> = {
  'Your Plant': { bg: '#1976d2', light: '#bbdefb', text: '#0d47a1' },      // 파란색 (자사)
  'Ship to Plant': { bg: '#f57c00', light: '#ffe0b2', text: '#e65100' },   // 주황색 (고객사)
  'User': { bg: '#7b1fa2', light: '#e1bee7', text: '#4a148c' },            // 보라색 (사용자)
};

// ============ FMEA 약어 정의 ============

/**
 * FMEA 분석 단계 약어
 */
export const FMEA_ABBREVIATIONS = {
  // 고장분석 (4단계)
  FE: { abbr: 'FE', en: 'Failure Effect', ko: '고장영향', description: '고장으로 인해 발생하는 영향' },
  FM: { abbr: 'FM', en: 'Failure Mode', ko: '고장형태', description: '고장이 나타나는 형태/방식' },
  FC: { abbr: 'FC', en: 'Failure Cause', ko: '고장원인', description: '고장을 유발하는 근본 원인' },
  
  // 리스크분석 (5단계)
  PC: { abbr: 'PC', en: 'Prevention Control', ko: '예방관리', description: '고장 발생 예방을 위한 관리' },
  DC: { abbr: 'DC', en: 'Detection Control', ko: '검출관리', description: '고장 검출을 위한 관리' },
  S: { abbr: 'S', en: 'Severity', ko: '심각도', description: '고장영향의 심각한 정도 (1-10)' },
  O: { abbr: 'O', en: 'Occurrence', ko: '발생도', description: '고장원인의 발생 빈도 (1-10)' },
  D: { abbr: 'D', en: 'Detection', ko: '검출도', description: '고장 검출 능력 (1-10)' },
  AP: { abbr: 'AP', en: 'Action Priority', ko: '조치우선순위', description: 'H(High)/M(Medium)/L(Low)' },
  RPN: { abbr: 'RPN', en: 'Risk Priority Number', ko: '위험우선순위', description: 'S × O × D' },
  SC: { abbr: 'SC', en: 'Special Characteristic', ko: '특별특성', description: 'CC/SC/HC 등' },
} as const;

// ============ 특별특성 정의 ============

/**
 * 특별특성 종류
 * - CC: Critical Characteristic (중요 특성) - 안전/법규 관련
 * - SC: Significant Characteristic (중점 특성) - 기능/성능 관련
 * - HC: High Control (중점 관리) - 집중 관리 필요
 * 
 * ⚠️ 미지정 표시 규칙:
 * - ★ 사용 금지 (현대차 특별특성 기호와 혼동)
 * - "- 미지정" 사용 권장
 */
export const SPECIAL_CHAR_TYPES = {
  CC: { abbr: 'CC', en: 'Critical Characteristic', ko: '중요 특성', description: '안전/법규 관련' },
  SC: { abbr: 'SC', en: 'Significant Characteristic', ko: '중점 특성', description: '기능/성능 관련' },
  HC: { abbr: 'HC', en: 'High Control', ko: '중점 관리', description: '집중 관리 필요' },
  FFF: { abbr: 'FFF', en: 'Fit, Form, Function', ko: '적합/형상/기능', description: '조립/외관/기능 관련' },
  HI: { abbr: 'HI', en: 'High Impact', ko: '고영향', description: '높은 영향도' },
  '-': { abbr: '-', en: 'None', ko: '없음', description: '특별특성 해당 없음' },
} as const;

export const SPECIAL_CHAR_OPTIONS = ['', 'CC', 'SC', 'HC', 'FFF', 'HI', '-'];

// ============ 40열 컬럼 표준 정의 ============

/**
 * 40열 컬럼 표준명
 * 
 * 2단계 구조분석 (4열):
 * - 완제품 공정명, NO+공정명, 4M, 작업요소
 * 
 * 3단계 기능분석 (8열):
 * - 구분, 완제품기능, 요구사항, 공정기능, 제품특성, 작업요소, 작업요소기능, 공정특성
 * 
 * 4단계 고장분석 (6열):
 * - 구분, 고장영향(FE), 심각도(S), 고장형태(FM), 작업요소, 고장원인(FC)
 * 
 * 5단계 리스크분석 (8열):
 * - 예방관리(PC), 발생도(O), 검출관리(DC), 검출도(D), AP, RPN, 특별특성(SC), 습득교훈
 * 
 * 6단계 최적화 (14열):
 * - 예방관리개선, 검출관리개선, 책임자성명, 목표완료일자, 상태, 개선결과근거, 완료일자,
 *   심각도(후), 발생도(후), 검출도(후), 특별특성(후), AP(후), RPN(후), 비고
 */
export const COLUMN_STANDARD = {
  // 2단계 구조분석
  structure: {
    l1Name: '완제품 공정명',
    l2Name: 'NO+공정명',      // NO+공정명 = 공정번호 + 공정명
    m4: '4M',                  // 4M = Man/Machine/Input Material/Environment
    l3Name: '작업요소',
  },
  
  // 3단계 기능분석
  function: {
    category: '구분',          // 구분 = Your Plant / Ship to Plant / User
    l1Function: '완제품기능',
    l1Requirement: '요구사항',
    l2Function: '공정기능',
    productChar: '제품특성',
    l3WorkElement: '작업요소',
    l3Function: '작업요소기능',
    processChar: '공정특성',
  },
  
  // 4단계 고장분석
  failure: {
    feCategory: '구분',        // 구분 = Your Plant / Ship to Plant / User
    failureEffect: '고장영향(FE)',  // FE = Failure Effect
    severity: '심각도(S)',          // S = Severity
    failureMode: '고장형태(FM)',    // FM = Failure Mode
    fcWorkElement: '작업요소',
    failureCause: '고장원인(FC)',   // FC = Failure Cause
  },
  
  // 5단계 리스크분석
  risk: {
    prevention: '예방관리(PC)',     // PC = Prevention Control
    occurrence: '발생도(O)',        // O = Occurrence
    detection: '검출관리(DC)',      // DC = Detection Control
    detectability: '검출도(D)',     // D = Detection
    ap: 'AP',                       // AP = Action Priority
    rpn: 'RPN',                     // RPN = Risk Priority Number
    specialChar: '특별특성(SC)',    // SC = Special Characteristic
    lessonLearned: '습득교훈',
  },
  
  // 6단계 최적화
  optimization: {
    preventionImprove: '예방관리개선',
    detectionImprove: '검출관리개선',
    responsible: '책임자성명',
    targetDate: '목표완료일자',
    status: '상태',
    resultEvidence: '개선결과근거',
    completionDate: '완료일자',
    newSeverity: '심각도(후)',
    newOccurrence: '발생도(후)',
    newDetectability: '검출도(후)',
    newSpecialChar: '특별특성(후)',
    newAP: 'AP(후)',
    newRPN: 'RPN(후)',
    remarks: '비고',
  },
} as const;

// ============ 유틸리티 함수 ============

/**
 * 4M 약어 → 한글+영어 표시
 * @example getM4Label('MN') → 'MN(Man, 사람)'
 */
export function getM4Label(m4: M4Type): string {
  const info = M4_CATEGORIES[m4];
  return `${info.abbr}(${info.en}, ${info.ko})`;
}

/**
 * 4M 약어 → 한글만 표시
 * @example getM4Korean('MN') → '사람'
 */
export function getM4Korean(m4: M4Type): string {
  return M4_CATEGORIES[m4].ko;
}

/**
 * 구분 → 한글+영어 표시
 * @example getCategoryLabel('Your Plant') → 'YP(Your Plant, 자사)'
 */
export function getCategoryLabel(category: CategoryType): string {
  const info = CATEGORY_TYPES[category];
  return `${info.abbr}(${info.en}, ${info.ko})`;
}

/**
 * FMEA 약어 → 원어+한글 표시
 * @example getAbbrLabel('FE') → 'FE(Failure Effect, 고장영향)'
 */
export function getAbbrLabel(abbr: keyof typeof FMEA_ABBREVIATIONS): string {
  const info = FMEA_ABBREVIATIONS[abbr];
  return `${info.abbr}(${info.en}, ${info.ko})`;
}

