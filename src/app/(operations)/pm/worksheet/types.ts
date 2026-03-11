/**
 * @file types.ts
 * @description PFD 워크시트 타입 정의
 */

// ============ PFD Item 타입 ============
export interface PmItem {
  id: string;
  pfdId: string;
  processNo: string;
  processName: string;
  processLevel: string;
  processDesc: string;
  partName: string;       // ★ 부품명 추가 (CP와 동일)
  workElement?: string;   // 작업요소 (FMEA 연동용, optional)
  equipment: string;
  productSC: string;      // 제품SC (CC/SC)
  productChar: string;    // 제품특성
  processSC: string;      // 공정SC (CC/SC)
  processChar: string;    // 공정특성
  charIndex: number;      // 원자성 인덱스: 동일 공정 내 특성 순서
  sortOrder: number;
  // ★ 공정흐름 심볼 (4개)
  flowWork?: boolean;     // ○ 작업
  flowTransport?: boolean; // ◁ 운반
  flowStorage?: boolean;  // △ 저장
  flowInspect?: boolean;  // □ 검사
  // PFMEA 연동 필드
  fmeaId?: string | null;
  cpNo?: string | null;
  linkStatus?: 'linked' | 'unlinked';
}

// ============ PFD State 타입 ============
export interface PmState {
  pmNo: string;
  pfdNo?: string;    // ★ 2026-02-07: 하위호환 (hooks에서 state.pfdNo 참조)
  fmeaId: string;
  cpNo: string;
  partName: string;
  customer: string;
  items: PmItem[];
  dirty: boolean;
  status?: 'draft' | 'review' | 'approved' | 'obsolete'; // PFD 상태
}

// ============ RowSpan 정보 ============
export interface SpanInfo {
  isFirst: boolean;
  span: number;
}

// ============ 컨텍스트 메뉴 상태 ============
export type ContextMenuType = 'process' | 'work' | 'equipment' | 'char' | 'general';

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

// ★★★ 2026-02-07: 하위호환 alias (hooks에서 PfdItem/PfdState 참조) ★★★
export type PfdItem = PmItem;
export type PfdState = PmState;