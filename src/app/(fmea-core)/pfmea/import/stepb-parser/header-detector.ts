/**
 * @file header-detector.ts
 * @description STEP B 엑셀 헤더 자동 감지 — 키워드 기반 컬럼 위치 탐색
 * Python COLUMN_SPECS + detect_columns() 포팅
 * @created 2026-03-05
 */

import type ExcelJS from 'exceljs';
import type { StepBColumnSpec, StepBColumnMap, WarningCollector } from './types';

// ── STEP B 컬럼 스펙: (field, keywords[], occurrence) ──
// 키워드는 세부헤더 행에서 정확 일치 또는 부분 포함으로 감지
// 중복 헤더('4M', '작업요소', '구분')는 출현 순서(좌→우)로 구분
export const COLUMN_SPECS: StepBColumnSpec[] = [
  { field: 'l1_name',      keywords: ['완제품  공정명', '완제품공정명', '완제품 공정명'], occurrence: 1 },
  { field: 'proc_name',    keywords: ['NO+공정명', 'NO＋공정명', '공정 NO+공정명', '메인 공정명', '메인공정명'], occurrence: 1 },
  { field: 'l1_4m',        keywords: ['4M'],                                            occurrence: 1 },
  { field: 'l1_we',        keywords: ['작업요소', '작업 요소'],                            occurrence: 1 },
  { field: 'l1_scope',     keywords: ['구분', '자사/고객/사용자', '자사/고객'],             occurrence: 1 },
  { field: 'l1_func',      keywords: ['완제품기능', '완제품 기능', '제품기능', '제품 기능', '완제품의 기능'], occurrence: 1 },
  { field: 'l2_func',      keywords: ['공정 기능/제품특성', '공정기능/제품특성', '공정 기능', '공정기능', '메인공정기능'], occurrence: 1 },
  { field: 'l2_4m',        keywords: ['4M'],                                            occurrence: 2 },
  { field: 'l2_we',        keywords: ['작업요소', '작업 요소'],                            occurrence: 2 },
  { field: 'l2_elem_func', keywords: ['작업요소 기능/공정특성', '작업요소기능/공정특성', '작업요소의 기능', '작업요소 기능', '작업요소기능', '요소기능', '공정특성'], occurrence: 1 },
  { field: 'fe_scope',     keywords: ['구분'],                                           occurrence: 2 },
  { field: 'fe',           keywords: ['고장영향(FE)', '고장영향', '고장의 영향', '고장의영향', '고장 영향', '영향(FE)', 'FE', '영향'], occurrence: 1 },
  { field: 's',            keywords: ['심각도'],                                         occurrence: 1 },
  { field: 'fm',           keywords: ['고장형태(FM)', '고장형태'],                        occurrence: 1 },
  { field: 'fc_4m',        keywords: ['4M'],                                            occurrence: 3 },
  { field: 'fc_we',        keywords: ['작업요소', '작업 요소'],                            occurrence: 3 },
  { field: 'fc',           keywords: ['고장원인(FC)', '고장원인'],                        occurrence: 1 },
  { field: 'pc',           keywords: ['예방관리(PC)', '예방관리', '예방 관리'],             occurrence: 1 },
  { field: 'o',            keywords: ['발생도'],                                         occurrence: 1 },
  { field: 'dc',           keywords: ['검출관리(DC)', '검출관리', '검출 관리'],             occurrence: 1 },
  { field: 'd',            keywords: ['검출도'],                                         occurrence: 1 },
  { field: 'ap',           keywords: ['AP'],                                            occurrence: 1 },
  { field: 'sc',           keywords: ['특별특성'],                                       occurrence: 1 },
];

// 컬럼 감지 실패 시 fallback 기본값 (JG1 STEP B 실측값, 0-based → 1-based column)
const FALLBACK_COLS: Record<string, number> = {
  l1_name: 3, proc_name: 4, l1_4m: 5, l1_we: 6,
  l1_scope: 7, l1_func: 8, l2_func: 9, l2_4m: 10,
  l2_we: 11, l2_elem_func: 12, fe_scope: 13, fe: 14,
  s: 15, fm: 16, fc_4m: 17, fc_we: 18, fc: 19,
  pc: 20, o: 21, dc: 22, d: 23, ap: 24, sc: 25,
};

// 간소화 포맷에서 존재하지 않는 비필수 컬럼: 감지 실패 시 0(skip)으로 설정
// FALLBACK_COLS 대신 0을 사용하면 row-parser가 빈 문자열을 반환 (garbage 방지)
const NON_CRITICAL_SKIP = new Set([
  'l1_4m', 'l2_4m', 'fc_4m',   // 4M 컬럼: 간소화 포맷에 없음
  'l2_we', 'fc_we',             // 작업요소 occurrence 2,3: 간소화 포맷에 없음
  'sc',                          // 특별특성: 간소화 포맷에 없음
]);

/** ExcelJS 셀 값을 문자열로 변환 */
function cellToString(cell: ExcelJS.Cell | undefined): string {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  // ExcelJS richText 처리
  const val = cell.value;
  if (typeof val === 'object' && 'richText' in val) {
    return (val.richText as Array<{ text: string }>).map(r => r.text).join('').trim();
  }
  return String(val).trim();
}

/**
 * ExcelJS 워크시트에서 헤더 행을 자동 감지하고 field→column 매핑을 반환
 *
 * 감지 기준: '고장형태'+'고장원인'이 함께 있는 가장 아래 행
 * STEP B는 2행 헤더 구조 — 세부 컬럼명 행을 찾음
 *
 * @returns { colMap, headerRow } — colMap: field→1-based column, headerRow: 1-based row
 */
export function detectStepBColumns(
  worksheet: ExcelJS.Worksheet,
  warn: WarningCollector,
): { colMap: StepBColumnMap; headerRow: number } {
  const maxScanRows = Math.min(20, worksheet.rowCount);
  let headerRowNum: number | null = null;

  // 행 스캔: '고장형태'+'고장원인' 동시 존재하는 가장 아래 행
  for (let r = 1; r <= maxScanRows; r++) {
    const row = worksheet.getRow(r);
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      values.push(cellToString(cell));
    });

    const hasFM = values.some(v => v.includes('고장형태'));
    const hasFC = values.some(v => v.includes('고장원인'));
    if (hasFM && hasFC) {
      headerRowNum = r;
    }
  }

  if (headerRowNum === null) {
    warn.error('NO_HEADER', '헤더 행 감지 실패 → fallback 기본값 사용');
    return { colMap: { ...FALLBACK_COLS }, headerRow: 10 };
  }

  // 2행 헤더 병합 스캔: 하단(세부) 행 + 상단(주) 행 결합
  // STEP B는 2행 헤더 구조 — 병합셀은 상단 행에만 값이 있고 하단은 빈 셀
  const detailRow = worksheet.getRow(headerRowNum);
  const mainRow = headerRowNum > 1 ? worksheet.getRow(headerRowNum - 1) : null;
  const headers: string[] = [];
  const colCount = detailRow.cellCount || worksheet.columnCount || 30;

  for (let c = 1; c <= colCount + 5; c++) {
    const detailVal = cellToString(detailRow.getCell(c));
    const mainVal = mainRow ? cellToString(mainRow.getCell(c)) : '';
    // 하단 행 값 우선, 없으면 상단 행 값 사용 (병합셀 대응)
    headers[c] = detailVal || mainVal;
  }

  // 키워드 매칭으로 컬럼 위치 결정 (2-pass: 필수 필드 먼저 → 비필수 나중)
  // 이유: l2_we(비필수)가 l2_elem_func(필수)보다 먼저 처리되면 같은 컬럼을 뺏김
  const colMap: StepBColumnMap = {};
  const failed: string[] = [];
  const skippedFields: string[] = [];  // 간소화 포맷에서 존재하지 않는 필드
  const claimedCols = new Set<number>(); // 이미 할당된 컬럼 추적

  // 각 spec의 매칭 결과를 미리 계산
  const specResults = COLUMN_SPECS.map(spec => {
    const found: number[] = [];
    for (let c = 1; c < headers.length; c++) {
      const h = headers[c] || '';
      if (!h) continue;
      const matched = spec.keywords.some(kw => kw === h || h.includes(kw));
      if (matched) found.push(c);
    }
    return { spec, found };
  });

  // Pass 1: 필수(critical) 필드 먼저 할당
  for (const { spec, found } of specResults) {
    if (NON_CRITICAL_SKIP.has(spec.field)) continue; // 비필수는 Pass 2에서
    if (found.length >= spec.occurrence) {
      colMap[spec.field] = found[spec.occurrence - 1];
      claimedCols.add(found[spec.occurrence - 1]);
    } else {
      colMap[spec.field] = FALLBACK_COLS[spec.field];
      failed.push(spec.field);
    }
  }

  // Pass 2: 비필수(NON_CRITICAL_SKIP) 필드 — 이미 점유된 컬럼이면 0(skip)
  for (const { spec, found } of specResults) {
    if (!NON_CRITICAL_SKIP.has(spec.field)) continue;
    if (found.length >= spec.occurrence) {
      const candidate = found[spec.occurrence - 1];
      if (claimedCols.has(candidate)) {
        colMap[spec.field] = 0;
        skippedFields.push(spec.field);
      } else {
        colMap[spec.field] = candidate;
        claimedCols.add(candidate);
      }
    } else {
      colMap[spec.field] = 0;
      skippedFields.push(spec.field);
    }
  }

  // 위치 기반 fallback: 심각도(s) 감지 성공 시, 인접 컬럼으로 fe/fe_scope 추론
  if (failed.includes('fe') && colMap['s'] && !failed.includes('s')) {
    colMap['fe'] = colMap['s'] - 1;
    failed.splice(failed.indexOf('fe'), 1);
    warn.info('FE_POS_FALLBACK', `fe 컬럼: 심각도(${colMap['s']})의 왼쪽(${colMap['fe']})으로 추론`);
  }
  if (failed.includes('fe_scope') && colMap['fe']) {
    colMap['fe_scope'] = colMap['fe'] - 1;
    failed.splice(failed.indexOf('fe_scope'), 1);
    warn.info('FE_SCOPE_POS', `fe_scope 컬럼: fe(${colMap['fe']})의 왼쪽(${colMap['fe_scope']})으로 추론`);
  }

  // 디버그: 헤더 행의 실제 셀 값 로그
  const headerSummary = headers
    .map((h, i) => h ? `${i}:${h.substring(0, 15)}` : '')
    .filter(Boolean)
    .join(' | ');
  warn.info('HEADER_VALUES', `[${headerRowNum}행] ${headerSummary}`);

  // 비필수 필드 건너뛰기 로그 (INFO — 간소화 포맷에서 정상)
  if (skippedFields.length > 0) {
    warn.info('COL_SKIP', `간소화 포맷: ${skippedFields.join(', ')} 컬럼 없음 (정상)`);
  }

  // 필수 필드 감지 실패 경고
  if (failed.length > 0) {
    warn.warn('COL_FALLBACK', `감지 실패 → fallback 적용: ${failed.join(', ')}`);
    const criticalFields = ['fe', 'fm', 'fc', 'l2_elem_func', 'l1_func'];
    const criticalMissing = failed.filter(f => criticalFields.includes(f));
    if (criticalMissing.length > 0) {
      warn.error('CRITICAL_COL_MISSING',
        `핵심 컬럼 감지 실패: ${criticalMissing.join(', ')} → fallback 적용됨. 엑셀 헤더를 확인해주세요.`);
    }
  }

  if (failed.length === 0) {
    warn.info('HEADER_DETECTED', `헤더 ${headerRowNum}행, ${Object.keys(colMap).length}개 컬럼 감지 완료 (비필수 ${skippedFields.length}개 skip)`);
  }

  return { colMap, headerRow: headerRowNum };
}
