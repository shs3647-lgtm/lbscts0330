/**
 * @file types.ts
 * @description 유틸리티 함수용 타입 정의
 */

// FE (Failure Effect) 항목
export interface FEItem {
  id: string;
  no: string;
  scope: string;
  text: string;
  severity: number;
  funcData: {
    typeName: string;
    funcName: string;
    reqName: string;
  } | null;
}

// FC (Failure Cause) 항목
export interface FCItem {
  id: string;
  no: string;
  process: string;
  m4: string;
  workElem: string;
  text: string;
  funcData: {
    processName: string;
    workElemName: string;
    m4: string;
    funcName: string;
    processCharName: string;
  } | null;
}

// FM (Failure Mode) 그룹
export interface FMGroup {
  fmId: string;
  fmText: string;
  fmProcess: string;
  fmNo?: string;
  fes: FEItem[];
  fcs: FCItem[];
  l2FuncData: {
    processName: string;
    funcName: string;
    productCharName: string;
  } | null;
}

// 공정명별 그룹
export interface ProcessGroup {
  processName: string;
  fmList: FMGroup[];
  startIdx: number;
}

// 행 병합 설정
export interface RowMergeConfig {
  feRowSpan: number;
  fcRowSpan: number;
  showFe: boolean;
  showFc: boolean;
}

