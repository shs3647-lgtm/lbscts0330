/**
 * @file shared/types/worksheet.ts
 * @description PFMEA/DFMEA 공용 워크시트 타입 정의
 * @version 1.0.0
 */

// ============ 기본 타입 ============

export interface Requirement {
  id: string;
  name: string;
  order?: number;
}

export interface L1Function {
  id: string;
  name: string;
  order?: number;
  requirements: Requirement[];
}

export interface L1Type {
  id: string;
  name: string;
  order?: number;
  functions: L1Function[];
}

export interface FailureScope {
  id: string;
  scope: string;      // 범위 (고객/공장/라인)
  category: string;   // 카테고리
  effect: string;     // 고장영향
  name?: string;      // 이름 (호환성)
  severity?: number;  // 심각도
}

export interface L1Structure {
  id: string;
  name: string;
  types: L1Type[];
  failureScopes?: FailureScope[];
}

export interface ProcessFunction {
  id: string;
  name: string;
  order?: number;
  productChars?: ProductChar[];
}

export interface ProductChar {
  id: string;
  name: string;
  spec?: string;
  unit?: string;
}

export interface ProcessChar {
  id: string;
  name: string;
  spec?: string;
  unit?: string;
}

export interface WorkElementFunction {
  id: string;
  name: string;
  order?: number;
  processChars?: ProcessChar[];
}

export interface FailureMode {
  id: string;
  name: string;
  mode?: string;  // 호환성
  productCharId?: string;
  order?: number;
}

export interface FailureCause {
  id: string;
  name: string;
  cause?: string;  // 호환성
  workElementId?: string;
  processCharId?: string;
  occurrence?: number;
  order?: number;
}

export interface WorkElement {
  id: string;
  name: string;
  m4: string;
  order: number;
  functions: WorkElementFunction[];
  processChars: ProcessChar[];
  failureCauses?: FailureCause[];
}

export interface Process {
  id: string;
  no: string;
  name: string;
  order: number;
  functions: ProcessFunction[];
  productChars?: ProductChar[];
  l3: WorkElement[];
  failureModes?: FailureMode[];
  failureCauses?: FailureCause[];
}

// ============ 고장연결 타입 ============

export interface FailureLink {
  id?: string;
  fmId: string;
  fmText: string;
  fmProcess: string;
  feId: string;
  feText: string;
  feScope: string;
  fcId: string;
  fcText: string;
  fcProcess?: string;
  fcWorkElem?: string;
  severity?: number;
  cache?: {
    fmText?: string;
    feText?: string;
    feCategory?: string;
    fcText?: string;
  };
}

// ============ 평탄화 행 타입 ============

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
  l2Functions: ProcessFunction[];
  l2ProductChars: ProductChar[];
  l2FailureMode: string;
  l3Id: string;
  m4: string;
  l3Name: string;
  l3Functions: WorkElementFunction[];
  l3ProcessChars: ProcessChar[];
  l3FailureCause: string;
}

// ============ 워크시트 상태 타입 ============

export interface WorksheetState {
  tab: string;
  l1: L1Structure;
  l2: Process[];
  riskData: { [key: string]: number | string };
  selected?: { type: 'L1' | 'L2' | 'L3'; id: string | null };
  visibleSteps?: number[];
  // 확정 플래그
  structureConfirmed?: boolean;
  l1Confirmed?: boolean;
  l2Confirmed?: boolean;
  l3Confirmed?: boolean;
  failureL1Confirmed?: boolean;
  failureL2Confirmed?: boolean;
  failureL3Confirmed?: boolean;
  failureLinkConfirmed?: boolean;
  // 고장연결
  failureLinks?: FailureLink[];
}

// ============ 확정 플래그 타입 ============

export interface ConfirmedFlags {
  structureConfirmed: boolean;
  l1Confirmed: boolean;
  l2Confirmed: boolean;
  l3Confirmed: boolean;
  failureL1Confirmed: boolean;
  failureL2Confirmed: boolean;
  failureL3Confirmed: boolean;
  failureLinkConfirmed: boolean;
}

// ============ FMEA 프로젝트 타입 ============

export interface FMEAProject {
  id: string;
  fmeaType?: 'PFMEA';
  project?: {
    productName?: string;
    modelYear?: string;
    team?: string;
  };
  fmeaInfo?: {
    subject?: string;
    startDate?: string;
    revisionDate?: string;
  };
}

// ============ Hook 반환 타입 ============

export interface UseWorksheetCoreReturn {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced: (updater: React.SetStateAction<WorksheetState>) => void;
  stateRef: React.MutableRefObject<WorksheetState>;
  dirty: boolean;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  lastSaved: string;
  setLastSaved: React.Dispatch<React.SetStateAction<string>>;
  isHydrated: boolean;
  suppressAutoSaveRef: React.MutableRefObject<boolean>;
}

export interface UseWorksheetDBReturn {
  saveToLocalStorage: () => void;
  saveToLocalStorageOnly: () => void;
  saveAtomicDB: (force?: boolean) => Promise<void>;
  loadWorksheetData: (fmeaId: string) => Promise<void>;
  normalizeFailureLinks: (links: FailureLink[], stateSnapshot: WorksheetState) => FailureLink[];
}

export interface UseWorksheetRowsReturn {
  rows: FlatRow[];
  l1Spans: number[];
  l1TypeSpans: number[];
  l1FuncSpans: number[];
  l2Spans: number[];
  flattenedRows: any[];
}

export interface UseWorksheetConfirmReturn {
  normalizeConfirmedFlags: (flags: ConfirmedFlags) => ConfirmedFlags;
}

// ============ 유틸리티 함수 ============

// P7+: canonical source import (crypto.getRandomValues 기반)
import { uid as _uid } from '@/app/(fmea-core)/pfmea/worksheet/schema/utils/uid';
export const uid = _uid;

/**
 * 확정 플래그 정규화 (하위→상위 일관성 유지)
 * - 하위 단계가 확정이면 상위 단계도 확정이었어야 함
 * - 이전 저장 버그로 플래그만 유실된 케이스 방어
 */
export function normalizeConfirmedFlags(flags: ConfirmedFlags): ConfirmedFlags {
  const out = { ...flags };

  // 고장분석 → 기능분석 연계
  if (out.failureL1Confirmed && !out.l1Confirmed) out.l1Confirmed = true;
  if (out.failureL2Confirmed && !out.l2Confirmed) out.l2Confirmed = true;
  if (out.failureL3Confirmed && !out.l3Confirmed) out.l3Confirmed = true;

  // 기능분석 단계 체인
  if (out.l3Confirmed && !out.l2Confirmed) out.l2Confirmed = true;
  if (out.l2Confirmed && !out.l1Confirmed) out.l1Confirmed = true;
  if (out.l1Confirmed && !out.structureConfirmed) out.structureConfirmed = true;

  return out;
}

/**
 * 초기 상태 생성
 */
export function createInitialState(): WorksheetState {
  return {
    tab: 'structure',
    l1: {
      id: uid(),
      name: '',
      types: [],
      failureScopes: [],
    },
    l2: [{
      id: uid(),
      no: '',
      name: '(클릭하여 공정 선택)',
      order: 10,
      functions: [],
      productChars: [],
      l3: [{
        id: uid(),
        m4: '',
        name: '(공정 선택 후 작업요소 추가)',
        order: 10,
        functions: [],
        processChars: [],
      }],
    }],
    riskData: {},
    selected: { type: 'L1', id: null },
    visibleSteps: [2, 3, 4, 5, 6],
    structureConfirmed: false,
    l1Confirmed: false,
    l2Confirmed: false,
    l3Confirmed: false,
    failureL1Confirmed: false,
    failureL2Confirmed: false,
    failureL3Confirmed: false,
    failureLinkConfirmed: false,
    failureLinks: [],
  };
}
