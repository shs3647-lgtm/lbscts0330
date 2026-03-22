/**
 * @file row-parser.ts
 * @description STEP A 행 파싱 — carry-forward + prefix 제거 + 특별특성 파싱
 * STEP A는 구조/기능 데이터만 포함 (고장/리스크 없음)
 * @created 2026-03-05
 */

import type ExcelJS from 'exceljs';
import type { StepBColumnMap, WarningCollector } from '../stepb-parser/types';
import { normalizeScope } from '@/lib/fmea/scope-constants';
import type { StepARawRow } from './index';
// prefix-utils 삭제됨 (2026-03-22) — 인라인 유틸로 대체 (extra args 무시)
function stripPrefix(val: string, ..._args: any[]): string { return val.replace(/^[A-Z]\d+[_.\s-]+/i, '').trim(); }
function normalizeSC(raw: string, ..._args: any[]): string { const t = (raw || '').trim(); if (t === '◇' || t === '◆' || t === '△' || t === '○') return t; return ''; }

// carry-forward 대상 필드 (병합셀 누락 보완) — STEP A용
const CARRY_FIELDS = [
  'l1_name', 'proc_name', 'l1_4m', 'l1_we', 'l1_scope', 'l1_func',
  'l2_func', 'l2_4m', 'l2_we', 'l2_elem_func', 'c2_func', 'c3_req',
] as const;

/** ExcelJS 셀 값을 문자열로 변환 */
function cellToString(row: ExcelJS.Row, col: number | undefined): string {
  if (!col) return '';
  const cell = row.getCell(col);
  if (!cell || cell.value === null || cell.value === undefined) return '';
  const val = cell.value;
  if (typeof val === 'object' && 'richText' in val) {
    return (val.richText as Array<{ text: string }>).map(r => r.text).join('').trim();
  }
  return String(val).trim();
}

/**
 * STEP A 워크시트에서 데이터 행을 파싱
 *
 * STEP B와 달리:
 * - FC 없으므로 **모든 행을 파싱** (빈 행만 skip)
 * - C2(제품기능), C3(요구사항) 추가 파싱
 * - 특별특성(SC) 심볼 파싱 (◇, ◆, △, ○)
 */
export function parseStepARows(
  worksheet: ExcelJS.Worksheet,
  colMap: StepBColumnMap,
  headerRow: number,
  warn: WarningCollector,
): StepARawRow[] {
  const dataStart = headerRow + 1;
  const rows: StepARawRow[] = [];
  const prev: Record<string, string> = {};

  for (let r = dataStart; r <= worksheet.rowCount; r++) {
    const excelRow = worksheet.getRow(r);

    // 각 필드 값 읽기
    const raw: Record<string, string> = {};
    for (const field of Object.keys(colMap)) {
      raw[field] = cellToString(excelRow, colMap[field]);
    }

    // 공정번호 추출: "10번 조립" → "10" (carry-forward 전에 먼저 확인)
    const procNameRaw = raw['proc_name'] || '';
    const procMatch = procNameRaw.match(/^(\d+)번/);
    const procNo = procMatch ? procMatch[1] : (prev['proc_no'] || '');

    // ★ P2: 공정 경계에서 carry state 초기화
    // 새 공정번호가 감지되면 기능 관련 필드를 리셋하여 이전 공정 데이터 침투 방지
    if (procNo && prev['proc_no'] && procNo !== prev['proc_no']) {
      for (const resetField of ['l2_func', 'l2_elem_func', 'c2_func', 'c3_req'] as const) {
        delete prev[resetField];
      }
    }

    // carry-forward: 빈 값은 이전 행에서 채움
    for (const f of CARRY_FIELDS) {
      if (!raw[f] && prev[f]) {
        raw[f] = prev[f];
      }
    }
    raw['proc_no'] = procNo;

    // 빈 행 skip (공정번호도 없고 데이터도 없으면)
    const hasData = procNo || raw['l2_func'] || raw['l2_elem_func'] || raw['c2_func'] || raw['c3_req'];
    if (!hasData) {
      continue;
    }

    // prefix 제거 + 정규화
    const l2Func = raw['l2_func'] || '';
    const cleanL2Func = l2Func.replace(new RegExp(`^${procNo}번[-\\s]*`), '').trim();

    const l2ElemFunc = raw['l2_elem_func'] || '';
    const cleanElemFunc = l2ElemFunc.replace(new RegExp(`^${procNo}번[-\\s]*`), '').trim();

    const scopeNorm = normalizeScope(raw['l1_scope'] || '');
    const scNorm = normalizeSC(raw['sc'], '');

    const parsedRow: StepARawRow = {
      excelRow: r,
      procNo,
      procName: procNameRaw,
      l1Name: raw['l1_name'] || '',
      l1Func: raw['l1_func'] || '',
      l1_4m: raw['l1_4m'] || '',
      l1We: raw['l1_we'] || '',
      l1Scope: raw['l1_scope'] || '',
      l1ScopeNorm: scopeNorm,
      l2Func: cleanL2Func,
      l2_4m: raw['l2_4m'] || '',
      l2We: raw['l2_we'] || '',
      l2ElemFunc: cleanElemFunc,
      c2Func: (raw['c2_func'] || '').trim(),
      c3Req: (raw['c3_req'] || '').trim(),
      sc: raw['sc'] || '',
      scNorm,
    };

    rows.push(parsedRow);

    // prev 갱신
    for (const f of CARRY_FIELDS) {
      if (raw[f]) prev[f] = raw[f];
    }
    if (procNo) prev['proc_no'] = procNo;
  }

  const uniqueProcesses = new Set(rows.map(r => r.procNo).filter(Boolean));
  warn.info('STEPA_PARSE_DONE', `STEP A 파싱 완료: ${rows.length}행, 공정 ${uniqueProcesses.size}개`);

  return rows;
}
