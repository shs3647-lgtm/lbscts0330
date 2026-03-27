/**
 * @file excel-parser-verification.ts
 * @description 엑셀 수식 검증 타입 스텁 — 실제 파서는 position-parser.ts로 통합됨 (2026-03-27)
 * faValidation.ts 등의 import 호환을 위해 타입만 유지
 */

export interface ExcelFormulaVerify {
  hasVerifySheet?: boolean;
  chainCount?: number;
  processCount?: number;
  fmCount?: number;
  fcCount?: number;
  feCount?: number;
  s3Miss?: number;
  s4Miss?: number;
  s5Miss?: number;
}
