/**
 * @file controlPlan.ts
 * @description Control Plan (관리계획서) 타입 정의
 *
 * CP 양식 구조:
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │                    공정현황                    │        관리항목        │  관리기준  │ 조치기준 │
 * ├───────┬──────┬────┬────────┬──────┬──┬────┬──┬──────┬──────┬────┬──────┬────┬────┬────┬──┬──┬────┤
 * │공정번호│공정명│형태│공정설명│작업요소│EP│자동│NO│제품특성│공정특성│특별│규격/공차│측정│샘플│주기│관리│생산│품질│조치│
 * └───────┴──────┴────┴────────┴──────┴──┴────┴──┴──────┴──────┴────┴──────┴────┴────┴────┴──┴──┴────┘
 *
 * PFMEA 연동 필드:
 * - 공정번호/공정명 ↔ PFMEA L2.no/name (processNo, processName)
 * - 공정설명(D열) ↔ PFMEA L2 메인공정 기능 (processDesc)
 * - 작업요소 ↔ PFMEA L3 [4M + 작업요소명] (workElement)
 * - 제품특성 ↔ PFMEA L2.functions.productChars (productChar)
 * - 공정특성 ↔ PFMEA L3.functions.processChars (processChar)
 * - 특별특성 ↔ PFMEA specialChar (specialChar)
 * - 관리방법 ↔ PFMEA 예방관리/검출관리 (controlMethod)
 */

// CP 행 데이터
export interface CPRow {
  id: string;
  
  // ===== 공정현황 (PFMEA 연동) =====
  processNo: string;        // 공정번호 ↔ PFMEA L2.no
  processName: string;      // 공정명 ↔ PFMEA L2.name
  processType: string;      // 형태 (메인/서브)
  processDesc: string;      // 공정설명(D열) ↔ PFMEA L2 메인공정 기능
  workElement: string;      // 작업요소 ↔ PFMEA L3 [4M + 작업요소명]
  equipmentM4?: string;     // 원본 4M 코드 (MC/MD/JG/IM/EN/MN) — 정규화 전 값 보존

  // ===== 관리항목 =====
  ep: boolean;              // EP (Error Proofing) ●
  autoInspect: boolean;     // 자동검사
  itemNo: string;           // NO (관리항목 번호)
  productChar: string;      // 제품특성 ↔ PFMEA 제품특성
  processChar: string;      // 공정특성 ↔ PFMEA 공정특성
  specialChar: string;      // 특별특성 (CC/SC/IC) ↔ PFMEA 특별특성
  specTolerance: string;    // 규격/공차
  
  // ===== 관리기준 =====
  measureMethod: string;    // 평가측정방법
  sampleSize: string;       // 샘플크기
  frequency: string;        // 주기 (LOT/전수/셋업시)
  controlMethod: string;    // 관리방법 ↔ PFMEA 예방관리/검출관리
  
  // ===== 조치기준 =====
  production: boolean;      // 생산 ●
  quality: boolean;         // 품질 ●
  actionMethod: string;     // 조치방법
  
  // ===== FMEA 위험분석 참조 (P0-2) =====
  refSeverity?: number;     // 참조 심각도 (FMEA S)
  refOccurrence?: number;   // 참조 발생도 (FMEA O)
  refDetection?: number;    // 참조 검출도 (FMEA D)
  refAp?: string;           // 참조 조치우선순위 (FMEA AP: H/M/L)

  // ===== 연동 메타데이터 =====
  pfmeaProcessId?: string;  // 연결된 PFMEA 공정 ID
  pfmeaWorkElemId?: string; // 연결된 PFMEA 작업요소 ID
  syncStatus: 'synced' | 'modified' | 'new';  // 동기화 상태
  lastSyncAt?: string;      // 마지막 동기화 시간
}

// CP 문서 전체
export interface CPDocument {
  id: string;
  
  // 헤더 정보
  header: {
    cpNo: string;           // CP 번호
    partName: string;       // 품명
    partNo: string;         // 품번
    revNo: string;          // Rev No
    revDate: string;        // Rev 일자
    customer: string;       // 고객
    preparedBy: string;     // 작성자
    approvedBy: string;     // 승인자
  };
  
  // 데이터 행들
  rows: CPRow[];
  
  // 연결된 PFMEA ID
  linkedFmeaId?: string;
  
  // 메타데이터
  createdAt: string;
  updatedAt: string;
}

// 빈 CP 행 생성
export function createEmptyCPRow(processNo: string = '', processName: string = ''): CPRow {
  return {
    id: `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    processNo,
    processName,
    processType: '',
    processDesc: '',
    workElement: '',
    ep: false,
    autoInspect: false,
    itemNo: '',
    productChar: '',
    processChar: '',
    specialChar: '',
    specTolerance: '',
    measureMethod: '',
    sampleSize: '',
    frequency: '',
    controlMethod: '',
    production: false,
    quality: false,
    actionMethod: '',
    syncStatus: 'new',
  };
}

// CP 열 정의
export const CP_COLUMNS = [
  // 공정현황 (5열)
  { key: 'processNo', label: '공정번호', width: 60, group: '공정현황', pfmeaSync: true },
  { key: 'processName', label: '공정명', width: 80, group: '공정현황', pfmeaSync: true },
  { key: 'processType', label: '형태', width: 50, group: '공정현황' },
  { key: 'processDesc', label: '공정설명', width: 200, group: '공정현황', pfmeaSync: true },
  { key: 'workElement', label: '작업요소', width: 100, group: '공정현황', pfmeaSync: true },
  
  // 관리항목 (7열)
  { key: 'ep', label: 'EP', width: 50, group: '관리항목' },
  { key: 'autoInspect', label: '자동검사', width: 70, group: '관리항목' },
  { key: 'itemNo', label: 'NO', width: 40, group: '관리항목' },
  { key: 'productChar', label: '제품특성', width: 100, group: '관리항목', pfmeaSync: true },
  { key: 'processChar', label: '공정특성', width: 50, group: '관리항목', pfmeaSync: true },
  { key: 'specialChar', label: '특별특성', width: 50, group: '관리항목', pfmeaSync: true },
  { key: 'specTolerance', label: '규격/공차', width: 80, group: '관리항목' },
  
  // 관리기준 (4열)
  { key: 'measureMethod', label: '평가측정방법', width: 100, group: '관리기준' },
  { key: 'sampleSize', label: '샘플크기', width: 60, group: '관리기준' },
  { key: 'frequency', label: '주기', width: 60, group: '관리기준' },
  { key: 'controlMethod', label: '관리방법', width: 80, group: '관리기준', pfmeaSync: true },
  
  // 조치기준 (3열)
  { key: 'production', label: '생산', width: 40, group: '조치기준' },
  { key: 'quality', label: '품질', width: 40, group: '조치기준' },
  { key: 'actionMethod', label: '조치방법', width: 120, group: '조치기준' },
];

// CP 헤더 그룹
export const CP_HEADER_GROUPS = [
  { label: '공정현황', colspan: 5, bg: '#1565c0' },
  { label: '관리항목', colspan: 7, bg: '#2e7d32' },
  { label: '관리기준', colspan: 4, bg: '#f57c00' },
  { label: '조치기준', colspan: 3, bg: '#c62828' },
];

// 특별특성 옵션
export const SPECIAL_CHAR_OPTIONS = [
  { value: 'CC', label: 'CC (Critical)', color: '#dc2626' },
  { value: 'SC', label: 'SC (Significant)', color: '#ea580c' },
  { value: 'IC', label: 'IC (Important)', color: '#ca8a04' },
  { value: '', label: '-', color: '#6b7280' },
];

// 주기 옵션
export const FREQUENCY_OPTIONS = [
  'LOT', '전수', '셋업시', '1회/H', '1회/Shift', '1회/Day', '1회/Week', '1회/Month'
];

// 측정방법 옵션
export const MEASURE_METHOD_OPTIONS = [
  '버니어캘리퍼스', '마이크로미터', '하이트게이지', '다이얼게이지',
  '줄차', '설비판넬', '카운터', '육안검사', 'SPC', 'CMM', '3D스캐너'
];

// 조치방법 옵션
export const ACTION_METHOD_OPTIONS = [
  '재작업', '폐기', '재작업 또는 폐기', '조건조정', '설비정지', '작업정지', '품질팀 통보'
];

