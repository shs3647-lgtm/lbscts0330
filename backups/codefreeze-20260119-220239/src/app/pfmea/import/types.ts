/**
 * @file types.ts
 * @description PFMEA Import 타입 정의 (3단계 프로세스)
 * @author AI Assistant
 * @created 2025-12-26
 * @updated 2025-12-26 - 3단계 프로세스로 변경
 * 
 * 프로세스:
 * Step 1: Excel Import → Flat 데이터 저장
 * Step 2: L1-L2-L3 관계형 DB 확정 (FMEA 워크시트)
 * Step 3: 고장 연결 (FC → FM → FE 인과관계)
 */

/** 공통 기초정보 카테고리 */
export interface CommonCategory {
  code: 'MN' | 'EN' | 'IM';
  name: string;
  icon: string;
  description: string;
  color?: string;
}

/** 공통 카테고리 정의 */
export const COMMON_CATEGORIES: CommonCategory[] = [
  { code: 'MN', name: '사람(Man)', icon: '👤', description: '작업자, 엔지니어 등', color: 'bg-blue-600' },
  { code: 'EN', name: '환경(Environment)', icon: '🌡️', description: '온도, 습도, 이물 등', color: 'bg-green-600' },
  { code: 'IM', name: '부자재(Indirect Material)', icon: '🧴', description: '그리스, 윤활유 등', color: 'bg-orange-600' },
];

/** 공통 기초정보 아이템 */
export interface CommonItem {
  id: string;
  category: 'MN' | 'EN' | 'IM';  // Man, Environment, Indirect Material
  categoryName?: string;
  name: string;
  description?: string;
  failureCauses?: string[];  // 관련 고장원인 목록
}

/** Import된 Flat 데이터 (Step 1) */
export interface ImportedFlatData {
  id: string;
  processNo: string;
  category: 'A' | 'B' | 'C';
  itemCode: string;  // A1~A6, B1~B5, C1~C4
  value: string;
  createdAt: Date;
}

/** 공정 마스터 */
export interface ProcessMaster {
  processNo: string;
  processName: string;
  processDesc?: string;
}

// ========================================
// Step 2: L1-L2-L3 관계형 (계층 구조)
// ========================================

/** L1 완제품 레벨 (Import 전용) */
export interface ImportL1Product {
  id: string;
  productProcessName: string;  // C1
  productFunc: string;         // C2
  requirement: string;         // C3
}

/** L2 공정 레벨 (Import 전용) */
export interface ImportL2Process {
  id: string;
  processNo: string;           // A1
  processName: string;         // A2
  processDesc: string;         // A3
  productChar: string;         // A4
}

/** L3 작업요소 레벨 (Import 전용) */
export interface ImportL3WorkElement {
  id: string;
  processNo: string;
  workElement: string;         // B1
  elementFunc: string;         // B2
  processChar: string;         // B3
}

/** L1-L2-L3 계층 관계 (Step 2에서 사용자가 지정) */
export interface LevelRelation {
  id: string;
  l1Id: string;
  l2Id: string;
  l3Id?: string;  // L3는 선택적
  createdAt: Date;
  createdBy: string;
}

// ========================================
// Step 3: 고장 인과관계 (FC → FM → FE)
// ========================================

/** 고장형태 (Failure Mode) */
export interface FailureMode {
  id: string;
  processNo: string;
  code: string;       // FM-001
  description: string; // A5에서 가져옴
}

/** 고장원인 (Failure Cause) */
export interface FailureCause {
  id: string;
  processNo: string;
  code: string;       // FC-001
  description: string; // B4에서 가져옴
}

/** 고장영향 (Failure Effect) */
export interface FailureEffect {
  id: string;
  code: string;       // FE-001
  description: string; // C4에서 가져옴
  level: 'L1' | 'L2' | 'L3'; // 영향 레벨
}

/** 고장 인과관계 (Step 3에서 사용자가 지정) */
export interface FailureChain {
  id: string;
  // 인과관계: FC → FM → FE
  failureCauseId: string;   // 고장원인
  failureModeId: string;    // 고장형태
  failureEffectId: string;  // 고장영향
  
  // 관련 관리방법
  preventionCtrlId?: string; // 예방관리 (B5)
  detectionCtrlId?: string;  // 검출관리 (A6)
  
  createdAt: Date;
  createdBy: string;
}

// ========================================
// 팝업 상태 타입
// ========================================

/** Step 2: L1-L2-L3 관계 지정 팝업 */
export interface LevelRelationState {
  selectedL1: ImportL1Product | null;
  selectedL2: ImportL2Process | null;
  selectedL3: ImportL3WorkElement | null;
  existingRelations: LevelRelation[];
}

/** Step 3: 고장 인과관계 지정 팝업 */
export interface FailureChainState {
  selectedFM: FailureMode | null;
  selectedFC: FailureCause | null;
  selectedFE: FailureEffect | null;
  existingChains: FailureChain[];
}

// ========================================
// 아이템 코드 라벨
// ========================================

export const ITEM_CODE_LABELS: Record<string, string> = {
  // L2 레벨 (공정) - 내부 코드 A1~A6
  A1: '공정번호',
  A2: '공정명',
  A3: '공정기능(설명)',
  A4: '제품특성',
  A5: '고장형태',
  A6: '검출관리',
  // L3 레벨 (작업요소) - 내부 코드 B1~B5
  B1: '작업요소(설비)',
  B2: '요소기능',
  B3: '공정특성',
  B4: '고장원인',
  B5: '예방관리',
  // L1 레벨 (완제품) - 내부 코드 C1~C4
  C1: '구분',  // YOUR PLANT, SHIP TO PLANT, USER
  C2: '제품(반)기능',
  C3: '제품(반)요구사항',
  C4: '고장영향',
  // 신규 시트명 형식 (L2-1, L3-1, L1-1)
  'L2-1': '공정번호',
  'L2-2': '공정명',
  'L2-3': '공정기능',
  'L2-4': '제품특성',
  'L2-5': '고장형태',
  'L2-6': '검출관리',
  'L3-1': '작업요소',
  'L3-2': '요소기능',
  'L3-3': '공정특성',
  'L3-4': '고장원인',
  'L3-5': '예방관리',
  'L1-1': '구분',
  'L1-2': '제품기능',
  'L1-3': '요구사항',
  'L1-4': '고장영향',
};

/** C1 구분 값 (고장영향 수준) */
export const C1_CATEGORIES = ['YOUR PLANT', 'SHIP TO PLANT', 'USER'] as const;
export type C1CategoryType = typeof C1_CATEGORIES[number];

/** 레벨별 아이템 코드 매핑 */
export const LEVEL_ITEM_CODES = {
  L1: ['C1', 'C2', 'C3', 'C4'],  // 완제품 레벨 (L1-1 ~ L1-4)
  L2: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],  // 공정 레벨 (L2-1 ~ L2-6)
  L3: ['B1', 'B2', 'B3', 'B4', 'B5'],  // 작업요소 레벨 (L3-1 ~ L3-5)
} as const;

/** 신규 시트명 → 내부 코드 매핑 */
export const SHEET_TO_CODE_MAP: Record<string, string> = {
  'L2-1': 'A1', 'L2-2': 'A2', 'L2-3': 'A3', 'L2-4': 'A4', 'L2-5': 'A5', 'L2-6': 'A6',
  'L3-1': 'B1', 'L3-2': 'B2', 'L3-3': 'B3', 'L3-4': 'B4', 'L3-5': 'B5',
  'L1-1': 'C1', 'L1-2': 'C2', 'L1-3': 'C3', 'L1-4': 'C4',
};

/** 내부 코드 → 신규 시트명 매핑 */
export const CODE_TO_SHEET_MAP: Record<string, string> = {
  'A1': 'L2-1', 'A2': 'L2-2', 'A3': 'L2-3', 'A4': 'L2-4', 'A5': 'L2-5', 'A6': 'L2-6',
  'B1': 'L3-1', 'B2': 'L3-2', 'B3': 'L3-3', 'B4': 'L3-4', 'B5': 'L3-5',
  'C1': 'L1-1', 'C2': 'L1-2', 'C3': 'L1-3', 'C4': 'L1-4',
};

/** 고장 관련 아이템 코드 */
export const FAILURE_ITEM_CODES = {
  FM: 'A5',  // 고장형태 (Failure Mode)
  FC: 'B4',  // 고장원인 (Failure Cause)
  FE: 'C4',  // 고장영향 (Failure Effect)
  PC: 'B5',  // 예방관리 (Prevention Control)
  DC: 'A6',  // 검출관리 (Detection Control)
} as const;

// ========================================
// Import 통계
// ========================================

export interface ImportStats {
  totalItems: number;
  byCategory: {
    A: number;
    B: number;
    C: number;
  };
  byItemCode: Record<string, number>;
  processCount: number;
}

// ========================================
// 이전 호환용 타입 (기존 코드 지원)
// ========================================

export type LevelType = 'A' | 'B' | 'C' | 'D';

export interface ImportColumn {
  key: string;
  label: string;
  width: number;
  required: boolean;
  level: LevelType;
}

export interface ImportRowData {
  processNo: string;
  processName: string;
  processDesc: string;
  productChar: string;
  failureMode: string;
  detectionCtrl: string;
  workElement: string;
  elementFunc?: string;
  workElementFunc?: string;  // 하위호환: elementFunc와 동일
  processChar: string;
  failureCause: string;
  preventionCtrl: string;
  productProcessName?: string;
  productFunc?: string;
  productFunction?: string;  // 하위호환: productFunc와 동일
  requirement: string;
  failureEffect: string;
  inspectionEquip: string;
  equipment?: string;  // 하위호환
}

export interface GeneratedRelation {
  processNo: string;
  processName: string;
  l1: {
    productFunction: string;
    requirement: string;
    failureEffect: string;
  };
  l2: {
    productChars: string[];
    failureModes: string[];
    detectionCtrls: string[];
    inspectionEquips: string[];
  };
  l3: {
    workElements: { name: string; func: string }[];
    processChars: string[];
    failureCauses: string[];
    preventionCtrls: string[];
    equipments: string[];
  };
}

// 이전 호환용 (삭제 예정)
export interface RelationMapping {
  id: string;
  processNo: string;
  parentItemCode: string;
  parentItemId: string;
  parentValue: string;
  childItemCode: string;
  childItemId: string;
  childValue: string;
  createdAt: Date;
  createdBy: string;
}
