/**
 * @file excel-parser.ts
 * @description 타입 전용 스텁 — 실제 파서는 position-parser.ts로 통합됨 (2026-03-27)
 * UI 컴포넌트 호환을 위한 최소 타입 정의 + 레거시 함수 스텁 유지
 */

export interface ItemCodeStat {
  itemCode: string;
  label: string;
  rawCount: number;
  uniqueCount: number;
  dupSkipped: number;
}

export interface ProcessItemStat {
  processNo: string;
  processName: string;
  items: Record<string, { raw: number; unique: number }>;
}

export interface RawFingerprintProcess {
  processNo: string;
  processName: string;
  fmCount: number;
  fcByFm: Record<string, number>;
  feByFm: Record<string, number>;
  chainRows: number;
}

export interface VerificationMismatch {
  processNo: string;
  type: string;
  rawCount: number;
  parsedCount: number;
}

export interface VerificationResult {
  pass: boolean;
  mismatches: VerificationMismatch[];
}

export interface ParseStatistics {
  itemStats: ItemCodeStat[];
  processStats?: ProcessItemStat[];
  chainCount?: number;
  verification?: VerificationResult;
  excelFormulas?: Record<string, number | undefined>;
  rawFingerprint?: {
    processes: RawFingerprintProcess[];
    totalFM: number;
    totalFC: number;
    totalFE: number;
    totalChainRows: number;
    excelFormulas: Record<string, number | undefined>;
  };
  [key: string]: unknown;
}

export interface ProcessData {
  processNo: string;
  processName: string;
  processDesc: string[];
  functions: string[];
  failureModes: string[];
  failureCauses: string[];
  specialChars: string[];
  workElements: string[];
  workElements4M: string[];
  elementFuncs: string[];
  elementFuncs4M: string[];
  elementFuncsWE: string[];
  processChars: string[];
  processChars4M: string[];
  processCharsWE: string[];
  failureCauses4M: string[];
  productChars: string[];
}

export interface ProductData {
  category: string;
  functions: string[];
  failureEffects: string[];
  requirements: string[];
  productProcessName: string;
  productFuncs: string[];
}

export type ProcessRelation = ProcessData;
export type ProductRelation = ProductData;

export interface ParseResult {
  success: boolean;
  errors: string[];
  processes: ProcessData[];
  products: ProductData[];
  failureChains?: Array<Record<string, unknown>>;
  statistics?: ParseStatistics;
}

/**
 * Legacy parser stub — position-parser로 대체됨.
 * CODEFREEZE 파일(useDataCompare 등)의 import 호환을 위해 유지.
 */
export async function parseMultiSheetExcel(_file: File): Promise<ParseResult> {
  console.warn('[excel-parser] Legacy parser removed. Use position-based import.');
  return {
    success: false,
    errors: ['Legacy parser removed. Use position-based import (위치기반 Import를 사용하세요).'],
    processes: [],
    products: [],
  };
}
