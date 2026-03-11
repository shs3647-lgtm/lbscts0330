/**
 * @file fmea-core/types/index.ts
 * @description FMEA 공용 타입 정의 (PFMEA/DFMEA 공통)
 */

// ============ 기본 타입 ============
export interface AtomicUnit {
  id: string;
  name: string;
  description?: string;
}

// ============ L1/L2/L3 구조 타입 ============
export interface L1Data {
  id: string;
  name: string;
  types: L1Type[];
  failureEffect: string;
  severity?: number;
  failureScopes: FailureScope[];
}

export interface L1Type {
  id: string;
  name: string;
  functions: L1Function[];
}

export interface L1Function {
  id: string;
  text: string;
  requirements: Requirement[];
}

export interface Requirement {
  id: string;
  text: string;
  productChars: ProductChar[];
}

export interface ProductChar {
  id: string;
  text: string;
  specialChar?: string;
}

export interface FailureScope {
  id: string;
  reqId: string;
  effect: string;
}

// ============ L2 (Process/Subsystem) ============
export interface L2Data {
  id: string;
  no: string;
  name: string;
  order: number;
  functions: L2Function[];
  productChars: ProductChar[];
  failureModes: FailureMode[];
  l3: L3Data[];
}

export interface L2Function {
  id: string;
  text: string;
}

export interface FailureMode {
  id: string;
  text: string;
}

// ============ L3 (WorkElement/Component) ============
export interface L3Data {
  id: string;
  m4: string;  // 4M(PFMEA) or Interface(DFMEA)
  name: string;
  order: number;
  functions: L3Function[];
  processChars: ProcessChar[];
  failureCauses: FailureCause[];
}

export interface L3Function {
  id: string;
  text: string;
}

export interface ProcessChar {
  id: string;
  text: string;
  specialChar?: string;
}

export interface FailureCause {
  id: string;
  text: string;
}

// ============ 워크시트 상태 ============
export interface WorksheetState {
  l1: L1Data;
  l2: L2Data[];
  selected: { type: 'L1' | 'L2' | 'L3'; id: string | null };
  tab: string;
  levelView: string;
  search: string;
  visibleSteps: number[];
  failureLinks: FailureLink[];
  structureConfirmed: boolean;
  l1Confirmed: boolean;
  l2Confirmed: boolean;
  l3Confirmed: boolean;
  failureL1Confirmed: boolean;
  failureL2Confirmed: boolean;
  failureL3Confirmed: boolean;
  riskData: Record<string, RiskDataItem>;
}

export interface FailureLink {
  fmId: string;
  feId: string;
  fcId: string;
  feNo: string;
  feScope: string;
  feText: string;
  severity: number;
  fmText: string;
  fmProcess: string;
  fcNo: string;
  fcProcess: string;
  fcM4: string;
  fcWorkElem: string;
  fcText: string;
}

export interface RiskDataItem {
  severity?: number;
  occurrence?: number;
  detection?: number;
  ap?: 'H' | 'M' | 'L';
}

// ============ FMEA 설정 인터페이스 ============
export interface FMEAConfig {
  type: 'PFMEA' | 'DFMEA';
  labels: {
    l1: string;
    l2: string;
    l3: string;
    l3Attr: string;
  };
  colors: FMEAColors;
  attributeOptions: AttributeOption[];
  storageKeyPrefix: string;
}

export interface FMEAColors {
  bg: string;
  text: string;
  line: string;
  white: string;
  structure: ColorSet;
  function: ColorSet;
  failure: ColorSet;
  risk: RiskColors;
  opt: OptColors;
}

export interface ColorSet {
  main: string;
  light: string;
  dark: string;
  text: string;
  zebra: string;
}

export interface RiskColors {
  main: string;
  prevention: { header: string; cell: string };
  detection: { header: string; cell: string };
  evaluation: { header: string; cell: string };
}

export interface OptColors {
  main: string;
  plan: { header: string; cell: string };
  monitor: { header: string; cell: string };
  effect: { header: string; cell: string };
}

export interface AttributeOption {
  code: string;
  label: string;
  color: { bg: string; border: string; color: string };
}

// ============ 탭 정의 ============
export interface TabDefinition {
  id: string;
  label: string;
  step: number;
}

// ============ 유틸리티 타입 ============
export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;



