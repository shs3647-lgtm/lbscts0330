/**
 * @file constants.ts
 * @description FMEA 워크시트 상수 정의 (데이터 원자성 강화 버전)
 */

// ============ 원자적 데이터 유닛 (Atomic Units) ============

export interface AtomicUnit {
  id: string;
  name: string;
  description?: string;
}

// L1 트리 구조 (기능분석)
export interface L1Requirement extends AtomicUnit {
  failureEffect?: string;
  severity?: number;
}
export interface L1Function extends AtomicUnit {
  requirements: L1Requirement[];
}
export interface L1Type extends AtomicUnit {
  functions: L1Function[];
}

// L1 고장분석 구조
export interface L1FailureEffect extends AtomicUnit {
  severity?: number;
}
// 1L 고장영향 데이터 구조 (요구사항 -> 구분 -> 고장영향 -> 심각도)
export interface L1FailureScope extends AtomicUnit {
  reqId?: string; // FK: 요구사항 ID
  requirement?: string; // 연결된 요구사항 (텍스트)
  scope?: string; // Your Plant / Ship to Plant / User
  effect?: string; // 고장영향 내용
  severity?: number; // 심각도
  effects?: L1FailureEffect[]; // 하위호환용 (deprecated)
}

// L2 메인공정 기능/특성
export interface L2ProductChar extends AtomicUnit {
  specialChar?: string;
}
export interface L2Function extends AtomicUnit {
  productChars: L2ProductChar[];
}

// L2 고장분석 구조
export interface L2FailureMode extends AtomicUnit {
  sc?: boolean; // 특별특성
  productCharId?: string; // [원자성] 상위 제품특성 FK - 고장형태는 특정 제품특성에 연결됨
}

// L3 작업요소 기능/특성
export interface L3ProcessChar extends AtomicUnit {
  specialChar?: string;
}
export interface L3Function extends AtomicUnit {
  processChars: L3ProcessChar[];
}

// L3 고장분석 구조
export interface L3FailureCause extends AtomicUnit {
  occurrence?: number; // 발생도
}

// ============ 구조 요소 (Structure Elements) ============

export interface WorkElement {
  id: string;
  m4: string;
  name: string;
  order: number;
  // 원자적 기능 정의 (각 기능에 공정특성 포함)
  functions: L3Function[];
  processChars?: L3ProcessChar[]; // 하위호환용 (deprecated, 기능별로 관리)
  failureCause?: string; // 나중에 Atomic 연계 예정
  // 고장분석: 원자적 고장원인 배열
  failureCauses?: L3FailureCause[];
}

export interface Process {
  id: string;
  no: string;
  name: string;
  order: number;
  l3: WorkElement[];
  // 원자적 기능 정의 (각 기능에 제품특성 포함)
  functions: L2Function[];
  productChars?: L2ProductChar[]; // 하위호환용 (deprecated, 기능별로 관리)
  failureMode?: string; // 나중에 Atomic 연계 예정
  // 고장분석: 원자적 고장형태 배열
  failureModes?: L2FailureMode[];
}

export interface L1Data {
  id: string;
  name: string;
  types: L1Type[]; 
  failureEffect?: string; // 나중에 Atomic 연계 예정
  severity?: number;
  // 고장분석: 원자적 고장영향 스코프/효과 배열
  failureScopes?: L1FailureScope[];
}

// ============ 워크시트 상태 ============

export interface WorksheetState {
  l1: L1Data;
  l2: Process[];
  selected: { type: 'L1' | 'L2' | 'L3'; id: string | null };
  tab: string;
  levelView: string;
  search: string;
  visibleSteps: number[];
  // 확정 상태
  structureConfirmed?: boolean;
  l1Confirmed?: boolean;
  l2Confirmed?: boolean;
  l3Confirmed?: boolean;
  // 고장분석 확정 상태
  failureL1Confirmed?: boolean;
  failureL2Confirmed?: boolean;
  failureL3Confirmed?: boolean;
  // 고장연결 결과
  failureLinks?: any[];
  // 리스크 분석 데이터 (SOD 점수 + 예방/검출관리 저장)
  riskData?: { [key: string]: number | string };
}

export interface FlatRow {
  l1Id: string;
  l1Name: string;
  l1TypeId: string;
  l1Type: string;
  l1FunctionId: string;
  l1Function: string;
  l1RequirementId: string;
  l1Requirement: string;
  l1FailureEffect: string;
  l1Severity: string;
  l2Id: string;
  l2No: string;
  l2Name: string;
  l2Functions: L2Function[];
  l2ProductChars: L2ProductChar[];
  l2FailureMode: string;
  l3Id: string;
  m4: string;
  l3Name: string;
  l3Functions: L3Function[];
  l3ProcessChars: L3ProcessChar[];
  l3FailureCause: string;
}

export interface FMEAProject {
  id: string;
  fmeaInfo?: { subject?: string };
  project?: { productName?: string };
}

// ============ 색상 및 설정 ============
// ============ 색상 표준 v2.0 (단순화, 부드러운 톤) ============
export const COLORS = {
  // 공통 색상
  bg: '#f5f7fb',
  text: '#333',
  line: '#e0e0e0',
  white: '#fff',
  gray: '#9e9e9e',
  warn: '#ffe1e1',
  
  // 4M 색상 (유지)
  mn: { bg: '#eef7ff', border: '#cfe0f4', color: '#1f4f86' },
  mc: { bg: '#fff3e6', border: '#ffd2a6', color: '#8a4f00' },
  im: { bg: '#f0fff2', border: '#bdeac5', color: '#1b6b2a' },
  en: { bg: '#fef0ff', border: '#f0bdf5', color: '#7a1a88' },
  
  // ============ 3가지 메인 색상 (v2.0) ============
  // 1. 구조분석 (밝은 파란색)
  structure: { 
    main: '#42a5f5',      // 부드러운 파란색
    light: '#e3f2fd',     // 배경 (짝수행)
    dark: '#1976d2',      // 테두리/강조
    text: '#0d47a1',      // 텍스트
    zebra: '#bbdefb'      // 홀수행 (더 진한 파란색)
  },
  
  // 2. 기능분석 (밝은 초록색)
  function: { 
    main: '#66bb6a',      // 부드러운 초록색
    light: '#e8f5e9',     // 배경 (짝수행)
    dark: '#388e3c',      // 테두리/강조
    text: '#1b5e20',      // 텍스트
    zebra: '#c8e6c9'      // 홀수행 (더 진한 초록색)
  },
  
  // 3. 고장분석 (부드러운 주황색) ⭐ 붉은색 대체
  failure: { 
    main: '#ffa726',      // 부드러운 주황색 (빨간색 제거)
    light: '#fff3e0',     // 배경 (짝수행)
    dark: '#f57c00',      // 테두리/강조
    text: '#e65100',      // 텍스트
    zebra: '#ffe0b2'      // 홀수행 (더 진한 주황색)
  },
  
  // 리스크/최적화는 고장분석 색상 재사용
  risk: { 
    main: '#ffa726',      // 고장분석과 동일
    prevention: { header: '#fff3e0', cell: '#ffe0b2' },
    detection: { header: '#e3f2fd', cell: '#bbdefb' },
    evaluation: { header: '#fff3e0', cell: '#ffecb3' }
  },
  opt: {
    main: '#ffa726',      // 고장분석과 동일
    plan: { header: '#e3f2fd', cell: '#bbdefb' },
    monitor: { header: '#fff3e0', cell: '#ffe0b2' },
    effect: { header: '#e8f5e9', cell: '#c8e6c9' }
  },
} as const;

// ============ 폰트 표준 (최종 확정 2025-12-30, 데이터 12px로 증가) ============
export const FONT_SIZES = {
  pageHeader: '13px',    // 페이지 헤더 (P-FMEA 구조분석)
  header1: '12px',       // 1단 헤더 (1. 완제품 공정명)
  header2: '12px',       // 2단 헤더 (완제품명+라인)
  cell: '12px',          // 데이터 셀
  small: '11px',         // 작은 텍스트 (배지 등) - 10px → 11px
} as const;

export const FONT_WEIGHTS = {
  normal: 400,           // 일반 (페이지 헤더, 데이터)
  semibold: 600,         // 헤더, 강조
  bold: 700,             // 특별 강조 (최소 사용)
} as const;

export const HEIGHTS = {
  pageHeader: 'auto',    // 페이지 헤더
  header: '24px',        // 1단, 2단 헤더 통일
  row: '26px',           // 데이터 행
} as const;

// 분석 탭 (Analysis) - 개별 단계별 분석
export const ANALYSIS_TABS = [
  { id: 'structure', label: '구조분석', step: 2 },
  { id: 'function-l1', label: '1L기능', step: 3 },
  { id: 'function-l2', label: '2L기능', step: 3 },
  { id: 'function-l3', label: '3L기능', step: 3 },
  { id: 'failure-l1', label: '1L영향', step: 4 },
  { id: 'failure-l2', label: '2L형태', step: 4 },
  { id: 'failure-l3', label: '3L원인', step: 4 },
  { id: 'failure-link', label: '고장연결', step: 4 },
] as const;

// 평가 탭 (Evaluation) - 전체 40열 화면
export const EVALUATION_TABS = [
  { id: 'eval-structure', label: '구조분석', step: 2 },
  { id: 'eval-function', label: '기능분석', step: 3 },
  { id: 'eval-failure', label: '고장분석', step: 4 },
  { id: 'risk', label: '리스크분석', step: 5 },
  { id: 'opt', label: '최적화', step: 6 },
] as const;

// 전체 탭 (하위 호환)
export const TABS = [...ANALYSIS_TABS, ...EVALUATION_TABS.filter(t => t.id === 'risk' || t.id === 'opt')] as const;

export const ALL_VIEW_TAB = { id: 'all', label: '전체보기' } as const;

// LEVELS는 더 이상 사용하지 않음 (삭제됨)
export const LEVELS = [] as const;

export const uid = () => 'id_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);

export const getTabLabel = (tabId: string): string => TABS.find(t => t.id === tabId)?.label || tabId;
export const getTabStep = (tabId: string): number => TABS.find(t => t.id === tabId)?.step || 0;

export const createInitialState = (): WorksheetState => ({
  l1: { id: uid(), name: '', types: [], failureEffect: '', severity: undefined, failureScopes: [] },
  l2: [{ 
    id: uid(), no: '', name: '(클릭하여 공정 선택)', order: 10, 
    functions: [], productChars: [], failureModes: [],
    l3: [{ id: uid(), m4: '', name: '(공정 선택 후 작업요소 추가)', order: 10, functions: [], processChars: [], failureCauses: [] }] 
  }],
  selected: { type: 'L2', id: null }, tab: 'structure', levelView: '2', search: '', visibleSteps: [2, 3, 4, 5, 6],
  failureLinks: [], structureConfirmed: false, l1Confirmed: false, l2Confirmed: false, l3Confirmed: false,
  failureL1Confirmed: false, failureL2Confirmed: false, failureL3Confirmed: false,
  riskData: {}  // ✅ SOD 점수 저장용 초기값
});

export const get4MBadgeStyle = (m4: string) => {
  const colorMap: any = { MN: COLORS.mn, MC: COLORS.mc, IM: COLORS.im, EN: COLORS.en };
  return colorMap[m4] || { bg: '#f5f5f5', border: '#ddd', color: '#666' };
};

// ============ Tailwind 클래스 매핑 (인라인 스타일 대체) ============
export const TW = {
  // 컨테이너
  container: 'p-0 overflow-auto h-full',
  table: 'w-full border-collapse table-fixed',
  
  // 헤더 - 1단계 (큰 타이틀)
  h1: {
    structure: 'bg-[#1976d2] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center',
    function: 'bg-[#388e3c] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center',
    failure: 'bg-[#f57c00] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center',
  },
  
  // 헤더 - 2단계 (서브 헤더)
  h2: {
    structure: 'bg-[#e3f2fd] border border-[#ccc] p-1.5 text-xs font-semibold text-center',
    function: 'bg-[#c8e6c9] border border-[#ccc] p-1.5 text-xs font-semibold text-center',
    failure: 'bg-[#ffe0b2] border border-[#ccc] p-1.5 text-xs font-semibold text-center',
  },
  
  // 버튼
  btn: {
    confirm: 'bg-green-600 text-white border-none px-2.5 py-0.5 rounded text-xs font-semibold cursor-pointer',
    edit: 'bg-orange-500 text-white border-none px-2.5 py-0.5 rounded text-xs font-semibold cursor-pointer',
  },
  
  // 배지
  badge: {
    confirmed: 'bg-green-600 text-white px-2.5 py-0.5 rounded text-xs font-semibold',
    missing: 'bg-orange-500 text-white px-2.5 py-0.5 rounded text-xs font-semibold',
    ok: 'bg-green-600 text-white px-2.5 py-0.5 rounded text-xs font-semibold',
  },
  
  // 셀 공통
  cell: 'border border-[#ccc] p-1 text-xs align-middle',
  cellCenter: 'border border-[#ccc] p-1 text-xs align-middle text-center',
  
  // zebra 배경
  zebra: {
    structure: (odd: boolean) => odd ? 'bg-[#bbdefb]' : 'bg-[#e3f2fd]',
    function: (odd: boolean) => odd ? 'bg-[#c8e6c9]' : 'bg-[#e8f5e9]',
    failure: (odd: boolean) => odd ? 'bg-[#ffe0b2]' : 'bg-[#fff3e0]',
  },
  
  // 빈 상태
  empty: 'text-center text-gray-500 py-10 px-5 text-xs',
} as const;
