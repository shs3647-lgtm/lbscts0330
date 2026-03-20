/**
 * @file types.ts
 * @description PFD 워크시트 타입 정의
 */

// ============ PFD Item 타입 ============
export interface PfdItem {
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
  // FMEA FK 연동 필드 (sync-cp-pfd에서 설정, 워크시트 저장 시 반드시 보존)
  fmeaL2Id?: string | null;        // L2Structure.id (공정)
  fmeaL3Id?: string | null;        // L3Structure.id (작업요소)
  productCharId?: string | null;   // ProcessProductChar.id (제품특성)
  cpItemId?: string | null;        // ControlPlanItem.id (CP 행 참조)
  unifiedItemId?: string | null;   // UnifiedProcessItem.id (공유 공정 행)
  equipmentM4?: string | null;     // 4M 원본 코드
  // PFMEA 연동 필드
  fmeaId?: string | null;
  cpNo?: string | null;
  linkStatus?: 'linked' | 'unlinked';
}

// ============ PFD State 타입 ============
export interface PfdState {
  pfdNo: string;
  fmeaId: string;
  cpNo: string;
  partName: string;
  customer: string;
  items: PfdItem[];
  dirty: boolean;
  status?: 'draft' | 'review' | 'approved' | 'obsolete';
  partNameMode?: 'A' | 'B';  // 연동 CP에서 상속: A=부품명 숨김(기본), B=표시
  // ★ 마스터 데이터 (모달 관리용)
  equipmentTools?: string[];
  partItems?: { name: string; quantity: number }[];
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