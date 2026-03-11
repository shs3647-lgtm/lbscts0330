/**
 * @file types.ts
 * @description Control Plan 워크시트 타입 정의
 */

// ============ CP Item 타입 ============
export interface CPItem {
  id: string;
  cpId: string;
  processNo: string;
  processName: string;
  processLevel: string;
  processDesc: string;
  workElement: string;
  detectorNo: boolean;
  detectorEp: boolean;
  detectorAuto: boolean;
  productChar: string;  // 원자성: 한 셀에 하나만
  processChar: string;  // 원자성: 한 셀에 하나만
  specialChar: string;
  charIndex: number;    // 원자성 인덱스: 동일 공정 내 특성 순서
  specTolerance: string;
  evalMethod: string;
  sampleSize: string;
  sampleFreq: string;
  controlMethod: string;
  owner1: string;
  owner2: string;
  reactionPlan: string;
  sortOrder: number;
  // FMEA 연동 필드
  refSeverity?: number | null;
  linkStatus?: 'linked' | 'unlinked';
}

// ============ CP State 타입 ============
export interface CPState {
  cpNo: string;
  fmeaId: string;
  fmeaNo: string;
  partName: string;
  customer: string;
  items: CPItem[];
  dirty: boolean;
}

// ============ RowSpan 정보 ============
export interface SpanInfo {
  isFirst: boolean;
  span: number;
}

// ============ 컨텍스트 메뉴 상태 ============
export type ContextMenuType = 'process' | 'work' | 'char' | 'general';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  rowIdx: number;
  type: ContextMenuType;
  colKey?: string; // 컬럼 키 (A, B열 구분용)
}

// ============ 자동 입력 모달 상태 ============
export interface AutoModalState {
  visible: boolean;
  rowIdx: number;
  type: ContextMenuType;
  position: 'above' | 'below';
}

// ============ 저장 상태 ============
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';



