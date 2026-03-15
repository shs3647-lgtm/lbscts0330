/**
 * @file constants.ts
 * @description FMEA 워크시트 상수 정의 (데이터 원자성 강화 버전)
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

// ============ 원자적 데이터 유닛 (Atomic Units) ============

export interface AtomicUnit {
  id: string;
  name: string;
  description?: string;
  isRevised?: boolean; // true = 엑셀에서 적색으로 표기된 수정 항목
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
  isRevised?: boolean; // true = 엑셀에서 적색으로 표기된 수정 항목
  // 원자적 기능 정의 (각 기능에 공정특성 포함)
  functions: L3Function[];
  processChars?: L3ProcessChar[]; // 하위호환용 (deprecated, 기능별로 관리)
  failureCause?: string; // 나중에 Atomic 연계 예정
  // 고장분석: 원자적 고장원인 배열
  failureCauses?: L3FailureCause[];
}

// L3 고장원인 (공정 레벨에서 관리되는 확장 타입)
export interface L3FailureCauseExtended extends L3FailureCause {
  processCharId?: string; // [원자성] 상위 공정특성 FK
}

export interface Process {
  id: string;
  no: string;
  name: string;
  order: number;
  isRevised?: boolean; // true = 엑셀에서 적색으로 표기된 수정 항목
  l3: WorkElement[];
  // 원자적 기능 정의 (각 기능에 제품특성 포함)
  functions: L2Function[];
  productChars?: L2ProductChar[]; // 하위호환용 (deprecated, 기능별로 관리)
  failureMode?: string; // 나중에 Atomic 연계 예정
  // 고장분석: 원자적 고장형태 배열
  failureModes?: L2FailureMode[];
  // 고장분석: 원자적 고장원인 배열 (공정 레벨에서 관리)
  failureCauses?: L3FailureCauseExtended[];
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

/** 고장연결 결과 (state.failureLinks 항목 타입) */
export interface WorksheetFailureLink {
  id?: string;
  fmId: string;
  fmText?: string;
  fmProcess?: string;
  fmProcessNo?: string;
  fmProcessName?: string;
  fmProcessFunction?: string;
  fmProductChar?: string;
  fmProductCharSC?: string;
  feId?: string;
  feScope?: string;
  feCategory?: string;
  feText?: string;
  feFunctionName?: string;
  feRequirement?: string;
  severity?: number;
  fcId?: string;
  fcText?: string;
  fcWorkFunction?: string;
  fcProcessChar?: string;
  fcProcessCharSC?: string;
  fcWorkElem?: string;
  fcProcess?: string;
  fcM4?: string;
}

export interface WorksheetState {
  l1: L1Data;
  l2: Process[];
  selected: { type: 'L1' | 'L2' | 'L3'; id: string | null };
  tab: string;
  levelView: string;
  search: string;
  visibleSteps: number[];
  // ★ FMEA 프로젝트 ID (워크시트 로드 시 설정)
  fmeaId?: string;
  // 확정 상태
  structureConfirmed?: boolean;
  l1Confirmed?: boolean;
  l2Confirmed?: boolean;
  l3Confirmed?: boolean;
  // 고장분석 확정 상태
  failureL1Confirmed?: boolean;
  failureL2Confirmed?: boolean;
  failureL3Confirmed?: boolean;
  // 고장연결 확정 상태
  failureLinkConfirmed?: boolean;
  // 고장연결 결과
  failureLinks?: WorksheetFailureLink[];
  // 리스크 분석 데이터 (SOD 점수 + 예방/검출관리 저장)
  riskData?: { [key: string]: number | string };
  // 확정 상태 추가
  riskConfirmed?: boolean;
  optimizationConfirmed?: boolean;
  // ★ 고장연결검증 모드 (null = 일반 ALL view, 'FE'|'FM'|'FC' = 검증 뷰)
  verificationMode?: 'FE' | 'FM' | 'FC' | null;
  // ★ 검증 뷰 → 분석 탭 이동 후 복귀용
  previousTab?: string;
  previousVerificationMode?: string;
  // ★ 검증 뷰 더블클릭 → 분석 탭 해당 항목 스크롤용
  scrollToItemId?: string;
  // ★★★ 2026-02-10: FMEA 4판 데이터 ★★★
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fmea4Rows?: any[];
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
  fmeaInfo?: {
    subject?: string;
    fmeaRevisionDate?: string;  // ★★★ 2026-02-03: 등록화면 목표완료일 연동 ★★★
    customerName?: string;      // ★ 등록화면 고객명 (특별특성 필터용)
  };
  project?: { productName?: string };
}

// ============ 4M 정렬 순서 (MN→MC→IM→EN 고정) ============
/** 4M 렌더링/정렬 순서: MN(사람) → MC(설비) → IM(부자재) → EN(환경) */
export const M4_SORT_ORDER: Record<string, number> = { MN: 0, MC: 1, IM: 2, EN: 3 };

/** 4M 값에 대한 정렬 우선순위 반환 (알 수 없는 값은 99) */
export function m4SortValue(m4: string | undefined): number {
  return M4_SORT_ORDER[(m4 || '').toUpperCase()] ?? 99;
}

/** WorkElement 배열을 4M 순서(MN→MC→IM→EN)로 정렬 (원본 불변, 새 배열 반환) */
export function sortWorkElementsByM4<T extends { m4?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => m4SortValue(a.m4) - m4SortValue(b.m4));
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

// ============ 폰트 표준 (2026-01-25 업데이트: 1행=12px, 2행~입력셀=11px) ============
export const FONT_SIZES = {
  pageHeader: '12px',    // 페이지 헤더 / 1행 헤더: 12px
  header1: '12px',       // 1단 헤더: 12px
  header2: '11px',       // 2단 헤더: 11px
  header3: '11px',       // 3단 헤더: 11px
  cell: '11px',          // ★ 데이터 셀: 12px → 11px
  small: '10px',         // 작은 텍스트 (배지 등)
} as const;

export const FONT_WEIGHTS = {
  normal: 400,           // ★ 입력셀: normal (400)
  semibold: 600,         // 헤더: semibold (600)
  bold: 700,             // 특별 강조
} as const;

export const HEIGHTS = {
  pageHeader: 'auto',    // 페이지 헤더
  header1: '28px',       // 1단 헤더
  header2: '26px',       // 2단 헤더
  header3: '24px',       // 3단 헤더
  header: '24px',        // 헤더 통일
  row: '22px',           // 데이터 행 (컴팩트)
} as const;

// 분석 탭 (Analysis) - 개별 단계별 분석
export const ANALYSIS_TABS = [
  { id: 'structure', label: 'Structure(구조)', step: 2 },
  { id: 'function-l1', label: '1L Function(기능)', step: 3 },
  { id: 'function-l2', label: '2L Function(기능)', step: 3 },
  { id: 'function-l3', label: '3L Function(기능)', step: 3 },
  { id: 'failure-l1', label: '1L영향(FE)', step: 4 },
  { id: 'failure-l2', label: '2L형태(FM)', step: 4 },
  { id: 'failure-l3', label: '3L원인(FC)', step: 4 },
  { id: 'failure-link', label: 'Failure Link(고장연결)', step: 4 },
] as const;

// 평가 탭 (Evaluation) - 전체 40열 화면
export const EVALUATION_TABS = [
  { id: 'eval-structure', label: '구조분석(Structure)', step: 2 },
  { id: 'eval-function', label: '기능분석(Function)', step: 3 },
  { id: 'eval-failure', label: '고장분석(Failure)', step: 4 },
  { id: 'risk', label: '리스크분석(Risk)', step: 5 },
  { id: 'opt', label: '최적화(Optimization)', step: 6 },
] as const;

// 전체 탭 (하위 호환)
export const TABS = [...ANALYSIS_TABS, ...EVALUATION_TABS.filter(t => t.id === 'risk' || t.id === 'opt')] as const;

export const ALL_VIEW_TAB = { id: 'all', label: '전체보기(All View)' } as const;

// LEVELS는 더 이상 사용하지 않음 (삭제됨)
export const LEVELS = [] as const;

// P7+: canonical source import (crypto.getRandomValues 기반)
import { uid as _uid } from './schema/utils/uid';
export const uid = _uid;

/**
 * ★★★ 하이브리드 ID 시스템 (v2.0) ★★★
 * 
 * 설계 원칙:
 * 1. ID로 대략적 위치 파악 (디버깅 용이)
 * 2. parentId로 모자관계 추적 (계층 탐색)
 * 3. mergeGroupId로 병합 데이터 동기화 (같은 그룹 = 같은 데이터)
 * 4. 고장연결에 FM-FE-FC ID 포함 (연결 관계 명확)
 * 
 * ID 포맷: {FMEA_SEQ}-{TYPE}-{PATH}-{SEQ}
 * 
 * 예시:
 *   L1S: M001-L1S-000                  완제품 구조
 *   L1F: M001-L1F-T1F1R1-001           구분1.기능1.요구사항1
 *   FE:  M001-FE-T1R1-001              구분1.요구사항1의 고장영향
 *   
 *   L2S: M001-L2S-P01-001              공정1
 *   L2F: M001-L2F-P01F1C1-001          공정1.기능1.특성1
 *   FM:  M001-FM-P01C1-001             공정1.특성1의 고장형태
 *   
 *   L3S: M001-L3S-P01W1-001            공정1.작업요소1
 *   L3F: M001-L3F-P01W1F1C1-001        공정1.작업요소1.기능1.특성1
 *   FC:  M001-FC-P01W1C1-001           공정1.작업요소1.특성1의 고장원인
 *   
 *   LK:  M001-LK-FM001-FE001-FC001     고장연결 (FM-FE-FC)
 */

// ===== 타입 정의 =====
export type AtomicType =
  | 'L1S' | 'L1F' | 'FE'      // L1 레벨: 구조, 기능, 고장영향
  | 'L2S' | 'L2F' | 'FM'      // L2 레벨: 구조, 기능, 고장형태
  | 'L3S' | 'L3F' | 'FC'      // L3 레벨: 구조, 기능, 고장원인
  | 'LK';                      // 고장연결

// ===== 하이브리드 ID 생성 파라미터 =====
export interface HybridIdParams {
  fmeaSeq: string;       // FMEA 시퀀스 (예: M001)
  type: AtomicType;      // 타입
  path: string;          // 경로 (예: P01W1C1)
  seq: number;           // 순번 (1-based)
}

// ===== 하이브리드 ID 생성 함수 =====
export const createHybridId = ({ fmeaSeq, type, path, seq }: HybridIdParams): string => {
  const seqStr = seq.toString().padStart(3, '0');
  return `${fmeaSeq}-${type}-${path}-${seqStr}`;
};

// ===== 경로 생성 헬퍼 함수들 =====
export const createL1Path = (typeIdx: number, funcIdx: number, reqIdx: number): string => {
  return `T${typeIdx}F${funcIdx}R${reqIdx}`;
};

export const createL2Path = (procIdx: number, funcIdx?: number, charIdx?: number): string => {
  let path = `P${procIdx.toString().padStart(2, '0')}`;
  if (funcIdx !== undefined) path += `F${funcIdx}`;
  if (charIdx !== undefined) path += `C${charIdx}`;
  return path;
};

export const createL3Path = (procIdx: number, weIdx: number, funcIdx?: number, charIdx?: number): string => {
  let path = `P${procIdx.toString().padStart(2, '0')}W${weIdx}`;
  if (funcIdx !== undefined) path += `F${funcIdx}`;
  if (charIdx !== undefined) path += `C${charIdx}`;
  return path;
};

// ===== 고장연결 ID 생성 =====
export const createLinkId = (fmeaSeq: string, fmSeq: number, feSeq: number, fcSeq: number): string => {
  const fm = `FM${fmSeq.toString().padStart(3, '0')}`;
  const fe = `FE${feSeq.toString().padStart(3, '0')}`;
  const fc = `FC${fcSeq.toString().padStart(3, '0')}`;
  return `${fmeaSeq}-LK-${fm}-${fe}-${fc}`;
};

// ===== 병합 그룹 ID 생성 =====
export const createMergeGroupId = (fmeaSeq: string, type: AtomicType, path: string): string => {
  return `${fmeaSeq}-MG-${type}-${path}`;
};

// ===== ID 파싱 =====
export interface ParsedHybridId {
  fmeaSeq: string;
  type: string;
  path: string;
  seq: number;
}

export const parseHybridId = (id: string): ParsedHybridId | null => {
  // 포맷: {FMEA_SEQ}-{TYPE}-{PATH}-{SEQ}
  const match = id.match(/^(M\d+)-([A-Z0-9]+)-(.+)-(\d{3})$/);
  if (!match) return null;
  return {
    fmeaSeq: match[1],
    type: match[2],
    path: match[3],
    seq: parseInt(match[4], 10),
  };
};

// ===== 고장연결 ID 파싱 =====
export interface ParsedLinkId {
  fmeaSeq: string;
  fmSeq: number;
  feSeq: number;
  fcSeq: number;
}

export const parseLinkId = (id: string): ParsedLinkId | null => {
  // 포맷: {FMEA_SEQ}-LK-FM{SEQ}-FE{SEQ}-FC{SEQ}
  const match = id.match(/^(M\d+)-LK-FM(\d{3})-FE(\d{3})-FC(\d{3})$/);
  if (!match) return null;
  return {
    fmeaSeq: match[1],
    fmSeq: parseInt(match[2], 10),
    feSeq: parseInt(match[3], 10),
    fcSeq: parseInt(match[4], 10),
  };
};

// ===== FMEA ID에서 시퀀스 추출 =====
export const extractFmeaSeq = (fmeaId: string): string => {
  // PFM26-M001 → M001, pfm26-001 → M001
  const match = fmeaId.match(/[Mm]?(\d+)$/);
  if (match) {
    return `M${match[1].padStart(3, '0')}`;
  }
  return 'M001';
};

// ===== 레거시 호환: 기존 createIndexedId (deprecated) =====
export interface IndexedIdParams {
  type: 'FM' | 'FE' | 'FC' | 'LK' | 'L1S' | 'L2S' | 'L3S' | 'L1F' | 'L2F' | 'L3F';
  level: 0 | 1 | 2 | 3;
  procIdx?: number;
  weIdx?: number;
  funcIdx?: number;
  charIdx?: number;
  itemIdx?: number;
  isMerged?: boolean;
  suffix?: string;
}

/** @deprecated 하이브리드 ID 사용 권장: createHybridId() */
export const createIndexedId = ({
  type,
  level,
  procIdx = 0,
  weIdx = 0,
  funcIdx = 0,
  charIdx = 0,
  itemIdx = 0,
}: IndexedIdParams): string => {
  // 레거시 호환을 위해 하이브리드 ID 포맷으로 변환
  const fmeaSeq = 'M001'; // 기본값
  let path = '';

  if (type === 'L1S' || type === 'L1F' || type === 'FE') {
    path = createL1Path(1, funcIdx + 1, charIdx + 1);
  } else if (type === 'L2S' || type === 'L2F' || type === 'FM') {
    path = createL2Path(procIdx + 1, funcIdx + 1, charIdx + 1);
  } else if (type === 'L3S' || type === 'L3F' || type === 'FC') {
    path = createL3Path(procIdx + 1, weIdx + 1, funcIdx + 1, charIdx + 1);
  } else if (type === 'LK') {
    return createLinkId(fmeaSeq, itemIdx + 1, 1, 1);
  }

  return createHybridId({ fmeaSeq, type, path, seq: itemIdx + 1 });
};

/** @deprecated 하이브리드 ID 사용 권장: parseHybridId() */
export interface ParsedIndexedId {
  type: string;
  level: number;
  procIdx: number;
  weIdx: number;
  funcIdx: number;
  charIdx: number;
  itemIdx: number;
  isMerged: boolean;
}

export const parseIndexedId = (id: string): ParsedIndexedId | null => {
  const parsed = parseHybridId(id);
  if (!parsed) return null;

  // 경로에서 인덱스 추출 시도
  const pathMatch = parsed.path.match(/P(\d+)?W?(\d+)?F?(\d+)?C?(\d+)?/);

  return {
    type: parsed.type,
    level: parsed.type.includes('1') ? 1 : parsed.type.includes('2') ? 2 : 3,
    procIdx: pathMatch?.[1] ? parseInt(pathMatch[1], 10) - 1 : 0,
    weIdx: pathMatch?.[2] ? parseInt(pathMatch[2], 10) - 1 : 0,
    funcIdx: pathMatch?.[3] ? parseInt(pathMatch[3], 10) - 1 : 0,
    charIdx: pathMatch?.[4] ? parseInt(pathMatch[4], 10) - 1 : 0,
    itemIdx: parsed.seq - 1,
    isMerged: false,
  };
};

export const getTabLabel = (tabId: string): string => TABS.find(t => t.id === tabId)?.label || tabId;
export const getTabStep = (tabId: string): number => TABS.find(t => t.id === tabId)?.step || 0;

export const createInitialState = (): WorksheetState => ({
  // ★ L1 기본 3개 구분(YP/SP/USER) — 각각 별도 행으로 렌더링
  //   functions 내 name='' 은 수동모드 입력용 placeholder (삭제 금지)
  //   사용자가 구분명을 'N/A'로 변경하면 자동모드에서 해당 행 데이터 매핑 제외
  l1: { id: uid(), name: '', types: [
    { id: uid(), name: 'YP', functions: [{ id: uid(), name: '', requirements: [] }] },
    { id: uid(), name: 'SP', functions: [{ id: uid(), name: '', requirements: [] }] },
    { id: uid(), name: 'USER', functions: [{ id: uid(), name: '', requirements: [] }] },
  ], failureEffect: '', severity: undefined, failureScopes: [] },
  l2: [{
    id: uid(), no: '', name: '(클릭하여 공정 선택)', order: 10,
    functions: [], productChars: [], failureModes: [],
    l3: [{ id: uid(), m4: '', name: '(공정 선택 후 작업요소 추가)', order: 10, functions: [], processChars: [], failureCauses: [] }]
  }],
  selected: { type: 'L2', id: null }, tab: 'structure', levelView: '2', search: '', visibleSteps: [2, 3, 4, 5, 6],
  failureLinks: [], structureConfirmed: false, l1Confirmed: false, l2Confirmed: false, l3Confirmed: false,
  failureL1Confirmed: false, failureL2Confirmed: false, failureL3Confirmed: false,
  failureLinkConfirmed: false,
  riskConfirmed: false,
  optimizationConfirmed: false,
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
