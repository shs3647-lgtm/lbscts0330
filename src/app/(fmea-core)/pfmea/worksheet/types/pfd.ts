/**
 * @file pfd.ts
 * @description PFD (Process Flow Diagram) 타입 정의
 * 
 * PFD 양식 구조:
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │  순번  │ 공정번호 │  공정명  │ 공정설명 │ 입력 │ 출력 │ 4M │ 특별특성 │ 비고 │
 * └───────────────────────────────────────────────────────────────────────────┘
 * 
 * PFMEA 연동 필드:
 * - 공정번호/공정명 ↔ PFMEA L2 공정 (processNo, processName)
 * - 공정설명 ↔ PFMEA L2 functions
 * - 4M ↔ PFMEA L3 4M
 * - 특별특성 ↔ PFMEA 특별특성 (specialChar)
 */

// PFD 행 데이터
export interface PFDRow {
  id: string;
  
  // ===== 기본정보 (PFMEA 연동) =====
  seqNo: number;              // 순번
  processNo: string;          // 공정번호 ↔ PFMEA L2.no
  processName: string;        // 공정명 ↔ PFMEA L2.name
  processDesc: string;        // 공정설명 ↔ PFMEA L2.functions
  
  // ===== 입출력 =====
  input: string;              // 입력 (원재료/반제품)
  output: string;             // 출력 (반제품/완제품)
  
  // ===== 4M 분류 =====
  fourM: 'MAN' | 'MACHINE' | 'MATERIAL' | 'METHOD' | '';  // 4M
  
  // ===== 공정특성 =====
  specialChar: string;        // 특별특성 (CC/SC/IC) ↔ PFMEA 특별특성
  processType: 'main' | 'sub' | 'inspection' | 'transport' | 'storage' | '';  // 공정유형
  
  // ===== 플로우차트 =====
  symbol: 'operation' | 'inspection' | 'transport' | 'delay' | 'storage' | 'decision' | '';  // 기호
  
  // ===== 비고 =====
  remarks: string;
  
  // ===== 연동 메타데이터 =====
  pfmeaProcessId?: string;    // 연결된 PFMEA 공정 ID
  syncStatus: 'synced' | 'modified' | 'new';  // 동기화 상태
  lastSyncAt?: string;        // 마지막 동기화 시간
}

// PFD 문서 전체
export interface PFDDocument {
  id: string;
  
  // 헤더 정보
  header: {
    pfdNo: string;            // PFD 번호
    partName: string;         // 품명
    partNo: string;           // 품번
    revNo: string;            // Rev No
    revDate: string;          // Rev 일자
    customer: string;         // 고객
    preparedBy: string;       // 작성자
    approvedBy: string;       // 승인자
  };
  
  // 데이터 행들
  rows: PFDRow[];
  
  // 연결된 PFMEA ID
  linkedFmeaId?: string;
  
  // 메타데이터
  createdAt: string;
  updatedAt: string;
}

// 빈 PFD 행 생성
export function createEmptyPFDRow(processNo: string = '', processName: string = ''): PFDRow {
  return {
    id: `pfd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    seqNo: 0,
    processNo,
    processName,
    processDesc: '',
    input: '',
    output: '',
    fourM: '',
    specialChar: '',
    processType: '',
    symbol: '',
    remarks: '',
    syncStatus: 'new',
  };
}

// PFD 열 정의
export const PFD_COLUMNS = [
  { key: 'seqNo', label: '순번', width: 50, pfmeaSync: false },
  { key: 'processNo', label: '공정번호', width: 80, pfmeaSync: true },
  { key: 'processName', label: '공정명', width: 120, pfmeaSync: true },
  { key: 'processDesc', label: '공정설명', width: 200, pfmeaSync: true },
  { key: 'input', label: '입력', width: 120, pfmeaSync: false },
  { key: 'output', label: '출력', width: 120, pfmeaSync: false },
  { key: 'symbol', label: '기호', width: 60, pfmeaSync: false },
  { key: 'fourM', label: '4M', width: 80, pfmeaSync: true },
  { key: 'specialChar', label: '특별특성', width: 70, pfmeaSync: true },
  { key: 'processType', label: '공정유형', width: 80, pfmeaSync: false },
  { key: 'remarks', label: '비고', width: 150, pfmeaSync: false },
];

// PFD 헤더 그룹
export const PFD_HEADER_GROUPS = [
  { label: '기본정보', colspan: 4, bg: '#0d9488' },
  { label: '입출력', colspan: 2, bg: '#0891b2' },
  { label: '분류', colspan: 4, bg: '#7c3aed' },
  { label: '', colspan: 1, bg: '#6b7280' },
];

// 공정 기호 옵션
export const SYMBOL_OPTIONS = [
  { value: 'operation', label: '○ 가공', icon: '○' },
  { value: 'inspection', label: '□ 검사', icon: '□' },
  { value: 'transport', label: '→ 운반', icon: '→' },
  { value: 'delay', label: 'D 대기', icon: 'D' },
  { value: 'storage', label: '▽ 저장', icon: '▽' },
  { value: 'decision', label: '◇ 판정', icon: '◇' },
];

// 4M 옵션
export const FOURM_OPTIONS = [
  { value: 'MAN', label: 'Man (작업자)', color: '#3b82f6' },
  { value: 'MACHINE', label: 'Machine (설비)', color: '#22c55e' },
  { value: 'MATERIAL', label: 'Material (재료)', color: '#f59e0b' },
  { value: 'METHOD', label: 'Method (방법)', color: '#8b5cf6' },
];

// 공정유형 옵션
export const PROCESS_TYPE_OPTIONS = [
  { value: 'main', label: '주요공정' },
  { value: 'sub', label: '보조공정' },
  { value: 'inspection', label: '검사공정' },
  { value: 'transport', label: '운반공정' },
  { value: 'storage', label: '보관공정' },
];

// 특별특성 옵션 (CP와 동일)
export const SPECIAL_CHAR_OPTIONS = [
  { value: '', label: '-', color: '#6b7280' },
  { value: 'CC', label: 'CC (Critical)', color: '#dc2626' },
  { value: 'SC', label: 'SC (Significant)', color: '#ea580c' },
  { value: 'IC', label: 'IC (Important)', color: '#ca8a04' },
];



















