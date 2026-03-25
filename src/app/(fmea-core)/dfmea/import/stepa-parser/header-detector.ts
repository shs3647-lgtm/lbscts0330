/**
 * @file header-detector.ts
 * @description STEP A 엑셀 헤더 자동 감지 — 키워드 기반 컬럼 위치 탐색
 * STEP A = 구조/기능분석 (고장/리스크 데이터 없음)
 * @created 2026-03-05
 */

import type ExcelJS from 'exceljs';
import type { StepBColumnSpec, StepBColumnMap } from '../stepb-parser/types';
import { WarningCollector } from '../stepb-parser/types';

// ── STEP A 컬럼 스펙: 13개 ──
// STEP B와 공유하는 구조/기능 컬럼 + C2/C3 신규 컬럼
export const STEP_A_COLUMN_SPECS: StepBColumnSpec[] = [
  { field: 'l1_name',      keywords: ['완제품  공정명', '완제품공정명', '완제품 공정명'],      occurrence: 1 },
  { field: 'proc_name',    keywords: ['NO+공정명', 'NO＋공정명', '공정 NO+공정명'],          occurrence: 1 },
  { field: 'l1_4m',        keywords: ['4M'],                                                 occurrence: 1 },
  { field: 'l1_we',        keywords: ['작업요소'],                                            occurrence: 1 },
  { field: 'l1_scope',     keywords: ['구분'],                                                occurrence: 1 },
  { field: 'l1_func',      keywords: ['완제품기능', '완제품 기능'],                            occurrence: 1 },
  { field: 'l2_func',      keywords: ['공정 기능/제품특성', '공정기능/제품특성', '공정 기능', '공정기능'], occurrence: 1 },
  { field: 'l2_4m',        keywords: ['4M'],                                                 occurrence: 2 },
  { field: 'l2_we',        keywords: ['작업요소'],                                            occurrence: 2 },
  { field: 'l2_elem_func', keywords: ['작업요소 기능/공정특성', '작업요소기능/공정특성', '작업요소 기능', '작업요소기능'], occurrence: 1 },
  { field: 'c2_func',      keywords: ['제품기능', '제품(반)기능', '제품(반) 기능'],            occurrence: 1 },
  { field: 'c3_req',       keywords: ['요구사항', '제품(반)요구사항', '제품(반) 요구사항'],     occurrence: 1 },
  { field: 'sc',           keywords: ['특별특성'],                                            occurrence: 1 },
];

// STEP A fallback 기본값 (감지 실패 시)
const STEP_A_FALLBACK: Record<string, number> = {
  l1_name: 3, proc_name: 4, l1_4m: 5, l1_we: 6,
  l1_scope: 7, l1_func: 8, l2_func: 9, l2_4m: 10,
  l2_we: 11, l2_elem_func: 12, c2_func: 13, c3_req: 14, sc: 15,
};

/** ExcelJS 셀 값을 문자열로 변환 */
function cellToString(cell: ExcelJS.Cell | undefined): string {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  const val = cell.value;
  if (typeof val === 'object' && 'richText' in val) {
    return (val.richText as Array<{ text: string }>).map(r => r.text).join('').trim();
  }
  return String(val).trim();
}

/**
 * STEP A 시트 감지: "공정기능"/"제품특성" 존재 && "고장형태"/"고장원인" 부재
 */
export function isStepASheet(worksheet: ExcelJS.Worksheet): boolean {
  const maxScanRows = Math.min(20, worksheet.rowCount);
  let hasStructure = false;
  let hasFailure = false;

  for (let r = 1; r <= maxScanRows; r++) {
    const row = worksheet.getRow(r);
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      values.push(cellToString(cell));
    });

    const joined = values.join(' ');
    if (joined.includes('공정기능') || joined.includes('제품특성') || joined.includes('작업요소기능')) {
      hasStructure = true;
    }
    if (joined.includes('고장형태') || joined.includes('고장원인')) {
      hasFailure = true;
    }
  }

  return hasStructure && !hasFailure;
}

/**
 * STEP A 워크시트에서 헤더 행을 자동 감지하고 field→column 매핑 반환
 *
 * 감지 기준: "공정기능" 또는 "작업요소기능" 키워드가 있는 가장 아래 행
 */
export function detectStepAColumns(
  worksheet: ExcelJS.Worksheet,
  warn: WarningCollector,
): { colMap: StepBColumnMap; headerRow: number } {
  const maxScanRows = Math.min(20, worksheet.rowCount);
  let headerRowNum: number | null = null;

  for (let r = 1; r <= maxScanRows; r++) {
    const row = worksheet.getRow(r);
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      values.push(cellToString(cell));
    });

    const hasFunc = values.some(v => v.includes('공정기능') || v.includes('공정 기능'));
    const hasElem = values.some(v => v.includes('작업요소기능') || v.includes('작업요소 기능'));
    if (hasFunc || hasElem) {
      headerRowNum = r;
    }
  }

  if (headerRowNum === null) {
    warn.error('STEPA_NO_HEADER', 'STEP A 헤더 행 감지 실패 → fallback 기본값 사용');
    return { colMap: { ...STEP_A_FALLBACK }, headerRow: 5 };
  }

  // 헤더 행 셀 수집
  const headerRow = worksheet.getRow(headerRowNum);
  const headers: string[] = [];
  const colCount = headerRow.cellCount || worksheet.columnCount || 20;

  for (let c = 1; c <= colCount + 5; c++) {
    headers[c] = cellToString(headerRow.getCell(c));
  }

  // 키워드 매칭
  const colMap: StepBColumnMap = {};
  const failed: string[] = [];

  for (const spec of STEP_A_COLUMN_SPECS) {
    const found: number[] = [];
    for (let c = 1; c < headers.length; c++) {
      const h = headers[c] || '';
      if (!h) continue;
      const matched = spec.keywords.some(kw => kw === h || h.includes(kw));
      if (matched) {
        found.push(c);
      }
    }

    if (found.length >= spec.occurrence) {
      colMap[spec.field] = found[spec.occurrence - 1];
    } else {
      colMap[spec.field] = STEP_A_FALLBACK[spec.field];
      failed.push(spec.field);
    }
  }

  if (failed.length > 0) {
    warn.warn('STEPA_COL_FALLBACK', `STEP A 감지 실패 → fallback: ${failed.join(', ')}`);
  } else {
    warn.info('STEPA_HEADER_DETECTED', `STEP A 헤더 ${headerRowNum}행, ${Object.keys(colMap).length}개 컬럼 감지`);
  }

  return { colMap, headerRow: headerRowNum };
}
