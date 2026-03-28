/**
 * @file excel-parser-utils.ts
 * @description 엑셀 파서 유틸리티 스텁 — 실제 파서는 position-parser.ts로 통합됨 (2026-03-27)
 * CODEFREEZE 파일(excel-data-range.ts 등)의 import 호환을 위해 최소 구현만 유지
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** ExcelJS 셀 값을 문자열로 변환 */
export function cellValueToString(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((rt: any) => rt.text || '').join('');
    }
    if ('text' in value) return String(value.text);
    if ('result' in value) return cellValueToString(value.result);
    if ('error' in value) return '';
  }
  return String(value);
}

/** 시트명 정규화 (공백/특수문자 제거, 소문자) */
export function normalizeSheetName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
