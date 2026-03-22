/**
 * @file row-parser.ts
 * @description STEP B 행 파싱 — carry-forward + prefix 제거 + 정규화
 * Python parse_step_b() 포팅
 * @created 2026-03-05
 */

import type ExcelJS from 'exceljs';
import type { StepBColumnMap, StepBRawRow, WarningCollector } from './types';
// prefix-utils 삭제됨 (2026-03-22) — 인라인 유틸로 대체 (extra args 무시)
function stripPrefix(val: string, ..._args: any[]): string { return val.replace(/^[A-Z]\d+[_.\s-]+/i, '').trim(); }
function stripFECode(val: string, ..._args: any[]): string { return val.replace(/^\[?[A-Z]{2,3}\d*\]?\s*/i, '').trim(); }
function normalizeScope(raw: string, ..._args: any[]): string { const u = raw.toUpperCase().trim(); if (u.includes('YOUR') || u === 'YP') return 'YP'; if (u.includes('SHIP') || u === 'SP') return 'SP'; if (u.includes('USER') || u.includes('END') || u === 'US') return 'USER'; return u || 'YP'; }
function toIntSafe(val: unknown, ..._args: any[]): number { const n = parseInt(String(val), 10); return isNaN(n) ? 0 : n; }
function normalizeSC(raw: string, ..._args: any[]): string { const t = (raw || '').trim(); if (t === '◇' || t === '◆' || t === '△' || t === '○') return t; return ''; }

// carry-forward 대상 필드 (병합셀 누락 보완)
const CARRY_FIELDS = [
  'l1_name', 'proc_name', 'l1_4m', 'l1_we', 'l1_scope', 'l1_func',
  'l2_func', 'l2_4m', 'l2_we', 'l2_elem_func', 'fe_scope', 'fe', 's', 'fm',
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
 * STEP B 워크시트에서 데이터 행을 파싱
 *
 * carry-forward: 병합셀로 인한 빈 값을 이전 행에서 보완
 * prefix 자동 제거: FM/FC/WE에서 공정번호 prefix 제거
 * 정규화: FE 코드 제거, scope 정규화, 숫자 변환
 * S값 충돌 감지: 같은 FM에 S가 여러개 → 경고
 *
 * @param worksheet ExcelJS 워크시트 (첫 번째 시트)
 * @param colMap 컬럼 매핑 (field → 1-based column)
 * @param headerRow 헤더 행 번호 (1-based)
 * @param warn 경고 수집기
 * @returns 파싱된 행 배열
 */
export function parseStepBRows(
  worksheet: ExcelJS.Worksheet,
  colMap: StepBColumnMap,
  headerRow: number,
  warn: WarningCollector,
): StepBRawRow[] {
  const dataStart = headerRow + 1;
  const rows: StepBRawRow[] = [];
  const prev: Record<string, string> = {};

  // FM → S값 추적 (같은 FM에 S 여러개 감지)
  const fmSTracker = new Map<string, Set<string>>();

  // 공정번호 자동 할당용 (간소화 포맷에서 "XX번" 패턴이 없을 때)
  const procNameToNo = new Map<string, string>();
  let autoNoCounter = 10;

  for (let r = dataStart; r <= worksheet.rowCount; r++) {
    const excelRow = worksheet.getRow(r);

    // 각 필드 값 읽기
    const raw: Record<string, string> = {};
    for (const field of Object.keys(colMap)) {
      raw[field] = cellToString(excelRow, colMap[field]);
    }
    raw['excel_row'] = String(r);

    // 공정번호 추출: "10번 조립" → "10" (carry-forward 전에 먼저 확인)
    const procNameRaw = raw['proc_name'] || '';
    const procMatch = procNameRaw.match(/^(\d+)번/);
    let procNo = procMatch ? procMatch[1] : '';

    // ★ P2: 공정 경계에서 고장 관련 carry state 초기화
    // 새 공정번호가 감지되면 FM/FC/FE/S 필드를 리셋하여 이전 공정 데이터 침투 방지
    if (procNo && prev['proc_no'] && procNo !== prev['proc_no']) {
      for (const resetField of ['fe_scope', 'fe', 's', 'fm'] as const) {
        delete prev[resetField];
      }
    }

    // carry-forward: 빈 값은 이전 행에서 채움
    for (const f of CARRY_FIELDS) {
      if (!raw[f] && prev[f]) {
        raw[f] = prev[f];
      }
    }

    // fallback: "XX번" 패턴 없으면 고유 공정명 기반 자동 번호 할당
    if (!procNo && procNameRaw.trim()) {
      const nameKey = procNameRaw.trim();
      if (procNameToNo.has(nameKey)) {
        procNo = procNameToNo.get(nameKey)!;
      } else {
        procNo = String(autoNoCounter);
        procNameToNo.set(nameKey, procNo);
        autoNoCounter += 10;
      }
    }
    if (!procNo) procNo = prev['proc_no'] || '';
    raw['proc_no'] = procNo;

    // FC 없는 행은 skip (단, prev는 갱신)
    if (!raw['fc']) {
      for (const f of CARRY_FIELDS) {
        if (raw[f]) prev[f] = raw[f];
      }
      if (procNo) prev['proc_no'] = procNo;
      continue;
    }

    // 필수 필드 누락 경고
    for (const req of ['proc_no', 'fm', 'fe', 'fc']) {
      if (!raw[req]) {
        warn.warn('MISSING_FIELD', `필수 필드 누락: ${req}`, r, String(raw[req] ?? ''));
      }
    }

    // S값 변동 감지
    const fmKey = `${procNo}|${raw['fm'] || ''}`;
    const sVal = raw['s'] || '';
    if (sVal) {
      if (!fmSTracker.has(fmKey)) {
        fmSTracker.set(fmKey, new Set());
      }
      const sSet = fmSTracker.get(fmKey)!;
      sSet.add(sVal);
      if (sSet.size > 1) {
        warn.warn('S_MISMATCH', `FM '${(raw['fm'] || '').substring(0, 30)}' S값 충돌 [${[...sSet].join(',')}]`, r);
      }
    }

    // 정규화
    const feNorm = stripFECode(raw['fe'] || '');
    const feScopeNorm = normalizeScope(raw['fe_scope'] || '', warn, r);
    const fmNorm = stripPrefix(raw['fm'] || '', procNo, warn, r, 'FM');
    const fcNorm = stripPrefix(raw['fc'] || '', procNo, warn, r, 'FC');
    const weNorm = stripPrefix(raw['fc_we'] || '', procNo, warn, r, 'WE');

    // D=1 육안검사 AIAG-VDA 위반 감지
    const dInt = toIntSafe(raw['d'], warn, r, 'D');
    const dcVal = raw['dc'] || '';
    if (dInt === 1 && dcVal && dcVal.includes('육안')) {
      warn.warn('D1_VISUAL', 'D=1 육안검사 (AIAG-VDA 위반, D=7 권장)', r, `FM=${fmNorm.substring(0, 25)}`);
    }

    const sInt = toIntSafe(raw['s'], warn, r, 'S');
    const oInt = toIntSafe(raw['o'], warn, r, 'O');
    const scNorm = normalizeSC(raw['sc'], raw['ap']);

    const parsedRow: StepBRawRow = {
      excelRow: r,
      procNo,
      l1Name: raw['l1_name'] || '',
      procName: raw['proc_name'] || '',
      l1_4m: raw['l1_4m'] || '',
      l1We: raw['l1_we'] || '',
      l1Scope: raw['l1_scope'] || '',
      l1Func: raw['l1_func'] || '',
      l2Func: raw['l2_func'] || '',
      l2_4m: raw['l2_4m'] || '',
      l2We: raw['l2_we'] || '',
      l2ElemFunc: raw['l2_elem_func'] || '',
      feScope: raw['fe_scope'] || '',
      fe: raw['fe'] || '',
      s: raw['s'] || '',
      fm: raw['fm'] || '',
      fc4m: raw['fc_4m'] || '',
      fcWe: raw['fc_we'] || '',
      fc: raw['fc'] || '',
      pc: raw['pc'] || '',
      o: raw['o'] || '',
      dc: raw['dc'] || '',
      d: raw['d'] || '',
      ap: raw['ap'] || '',
      sc: raw['sc'] || '',
      feNorm,
      feScopeNorm,
      fmNorm,
      fcNorm,
      weNorm,
      sInt,
      oInt,
      dInt,
      scNorm,
    };

    rows.push(parsedRow);

    // prev 갱신
    for (const f of CARRY_FIELDS) {
      if (raw[f]) prev[f] = raw[f];
    }
    prev['proc_no'] = procNo;
  }

  const uniqueProcesses = new Set(rows.map(r => r.procNo).filter(Boolean));
  warn.info('PARSE_DONE', `파싱 완료: ${rows.length}행, 공정 ${uniqueProcesses.size}개`);

  return rows;
}
