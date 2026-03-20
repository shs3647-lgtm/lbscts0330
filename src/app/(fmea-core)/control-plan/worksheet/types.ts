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
  partName: string;        // ✅ 부품명 (CP↔PFD 연동)
  equipment: string;       // ✅ 설비/금형/JIG (PFD와 동일)
  workElement?: string;    // PFMEA 작업요소 (4M=MC 연동용, optional)
  detectorNo: boolean;
  detectorEp: boolean;
  detectorAuto: boolean;
  epDeviceIds?: string;    // EP 선택 장치 ID (comma-separated)
  autoDeviceIds?: string;  // 자동검사 선택 장치 ID (comma-separated)
  productChar: string;  // 원자성: 한 셀에 하나만
  processChar: string;  // 원자성: 한 셀에 하나만
  specialChar: string;
  charIndex: number;    // 원자성 인덱스: 동일 공정 내 특성 순서
  charNo?: string;      // ✅ 2026-01-25: 특성번호
  specTolerance: string;
  evalMethod: string;
  sampleSize: string;
  sampleFreq: string;
  controlMethod: string;
  owner1: string;
  owner2: string;
  reactionPlan: string;
  sortOrder: number;
  // FMEA FK 연동 필드 (sync-cp-pfd에서 설정, 워크시트 저장 시 반드시 보존)
  productCharId?: string | null;   // ProcessProductChar.id
  processCharId?: string | null;   // L3Function.id
  linkId?: string | null;          // FailureLink.id
  pfmeaProcessId?: string | null;  // L2Structure.id
  pfmeaWorkElemId?: string | null; // L3Structure.id
  unifiedItemId?: string | null;   // UnifiedProcessItem.id
  equipmentM4?: string | null;     // 4M 원본 코드
  rowType?: string | null;         // product | process | structure
  // FMEA 위험분석 참조 필드
  refSeverity?: number | null;
  refOccurrence?: number | null;
  refDetection?: number | null;
  refAp?: string | null;
  linkStatus?: 'linked' | 'unlinked';
}

// ============ CP State 타입 ============
export interface CPState {
  cpNo: string;
  fmeaId: string;
  fmeaNo: string;
  linkedPfdNo: string;
  partName: string;
  customer: string;
  items: CPItem[];
  dirty: boolean;
  status?: 'draft' | 'review' | 'approved' | 'obsolete';
  partNameMode?: 'A' | 'B';  // A=부품명 숨김(기본), B=부품명 표시(DFMEA연동)
}

// ============ RowSpan 정보 ============
export interface SpanInfo {
  isFirst: boolean;
  span: number;
}

// ============ 컨텍스트 메뉴 상태 ============
export type ContextMenuType = 'process' | 'work' | 'char' | 'part' | 'general';

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



