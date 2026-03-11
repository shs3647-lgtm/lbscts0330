/**
 * @file types.ts
 * @description 마이그레이션 관련 타입 정의
 */

/** 기존 L1 타입 구조 */
export interface OldL1Type {
  id: string;
  name: string;
  functions: Array<{
    id: string;
    name: string;
    requirements: Array<{
      id: string;
      name: string;
      failureEffect?: string;
      severity?: number;
    }>;
  }>;
}

/** 기존 공정 구조 */
export interface OldProcess {
  id: string;
  no: string;
  name: string;
  order: number;
  functions?: Array<{
    id: string;
    name: string;
    productChars?: Array<{ id: string; name: string; specialChar?: string }>;
  }>;
  failureModes?: Array<{ id: string; name: string; sc?: boolean }>;
  l3: Array<{
    id: string;
    m4: string;
    name: string;
    order: number;
    functions?: Array<{
      id: string;
      name: string;
      processChars?: Array<{ id: string; name: string; specialChar?: string }>;
    }>;
    failureCauses?: Array<{ id: string; name: string; occurrence?: number }>;
  }>;
}

/** 기존 L1 데이터 */
export interface OldL1Data {
  id: string;
  name: string;
  types: OldL1Type[];
  failureScopes?: Array<{
    id: string;
    name: string;
    reqId?: string;
    requirement?: string;
    scope?: string;
    effect?: string;
    severity?: number;
  }>;
}

/** 기존 워크시트 데이터 */
export interface OldWorksheetData {
  fmeaId?: string;
  l1: OldL1Data;
  l2: OldProcess[];
  failureLinks?: any[];
  structureConfirmed?: boolean;
  l1Confirmed?: boolean;
  l2Confirmed?: boolean;
  l3Confirmed?: boolean;
  failureL1Confirmed?: boolean;
  failureL2Confirmed?: boolean;
  failureL3Confirmed?: boolean;
}

/** 레거시 저장 키 프리픽스 */
export const LEGACY_KEYS = {
  PFMEA: 'pfmea-worksheet-',
  DFMEA: 'dfmea-worksheet-',
  ATOMIC: 'atomic-fmea-',
};



