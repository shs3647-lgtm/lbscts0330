/**
 * PFMEA 개별 시트(레거시 15탭) 엑셀 → ImportedFlatData
 * excel-template.ts ITEM_TO_SHEET / 시트 열 구조와 대응 (다운로드 역방향)
 */
import type { Workbook, Worksheet, Row } from 'exceljs';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import { repairUtf8Mojibake } from '@/lib/text/repair-utf8-mojibake';

/** 템플릿과 동일한 시트명 (공백 차이는 findWorksheet에서 허용) */
export const LEGACY_BASIC_SHEET_NAMES = [
  'L2-1(A1) 공정번호',
  'L2-2(A2) 공정명',
  'L2-3(A3) 공정기능',
  'L2-4(A4) 제품특성',
  'L2-5(A5) 고장형태',
  'L2-6(A6) 검출관리',
  'L3-1(B1) 작업요소',
  'L3-2(B2) 요소기능',
  'L3-3(B3) 공정특성',
  'L3-4(B4) 고장원인',
  'L3-5(B5) 예방관리',
  'L1-1(C1) 구분',
  'L1-2(C2) 제품기능',
  'L1-3(C3) 요구사항',
  'L1-4(C4) 고장영향',
] as const;

function strVal(v: unknown): string {
  if (v === null || v === undefined) return '';
  let raw = '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') raw = String(v).trim();
  else if (typeof v === 'object' && 'text' in (v as object)) raw = String((v as { text: string }).text ?? '').trim();
  else if (typeof v === 'object' && 'result' in (v as object)) return strVal((v as { result: unknown }).result);
  else raw = String(v).trim();
  return repairUtf8Mojibake(raw);
}

function compact(s: string): string {
  return s.replace(/\s+/g, '');
}

/** 시트명: 정확 일치 → 공백 무시 일치 → 핵심 토큰 부분 일치 */
export function findLegacySheet(wb: Workbook, canonical: string): Worksheet | undefined {
  const c0 = compact(canonical);
  for (const ws of wb.worksheets) {
    if (ws.name === canonical) return ws;
  }
  for (const ws of wb.worksheets) {
    if (compact(ws.name) === c0) return ws;
  }
  const need = canonical.replace(/[()]/g, ' ').split(/\s+/).filter(t => t.length >= 2);
  let best: Worksheet | undefined;
  let bestN = 0;
  for (const ws of wb.worksheets) {
    const n = need.filter(t => ws.name.includes(t)).length;
    if (n > bestN) {
      bestN = n;
      best = ws;
    }
  }
  return bestN >= Math.min(3, need.length) ? best : undefined;
}

function rowPno(row: Row, col: number): string {
  return strVal(row.getCell(col).value);
}

/** Count non-empty header columns in row 1 to auto-detect column layout */
function countHeaderCols(ws: Worksheet): number {
  const hdr = ws.getRow(1);
  let count = 0;
  for (let c = 1; c <= 10; c++) {
    const v = hdr.getCell(c).value;
    if (v !== null && v !== undefined && String(v).trim()) count++;
    else break;
  }
  return count;
}

type RowAdd = Omit<ImportedFlatData, 'id' | 'createdAt'>;

export function parseLegacyIndividualSheetsToFlat(wb: Workbook): ImportedFlatData[] {
  const now = new Date();
  const out: ImportedFlatData[] = [];
  const add = (r: RowAdd) => {
    out.push({
      ...r,
      id: crypto.randomUUID(),
      createdAt: now,
    });
  };

  const hasDedicatedA2 = !!findLegacySheet(wb, 'L2-2(A2) 공정명');
  const wsA1 = findLegacySheet(wb, 'L2-1(A1) 공정번호');
  if (wsA1) {
    wsA1.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const pno = rowPno(row, 1);
      const name = rowPno(row, 2);
      if (!pno) return;
      add({ category: 'A', itemCode: 'A1', processNo: pno, value: pno });
      if (!hasDedicatedA2 && name) add({ category: 'A', itemCode: 'A2', processNo: pno, value: name });
    });
  }

  const wsA2only = findLegacySheet(wb, 'L2-2(A2) 공정명');
  if (wsA2only) {
    wsA2only.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const pno = rowPno(row, 1);
      const name = rowPno(row, 2);
      if (!pno) return;
      add({ category: 'A', itemCode: 'A2', processNo: pno, value: name });
    });
  }

  const twoColA = (sheetLabel: string, code: 'A3' | 'A5' | 'A6') => {
    const ws = findLegacySheet(wb, sheetLabel);
    if (!ws) return;
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const pno = rowPno(row, 1);
      const val = rowPno(row, 2);
      if (!pno || !val) return;
      add({ category: 'A', itemCode: code, processNo: pno, value: val });
    });
  };
  twoColA('L2-3(A3) 공정기능', 'A3');
  twoColA('L2-5(A5) 고장형태', 'A5');
  twoColA('L2-6(A6) 검출관리', 'A6');

  const wsA4 = findLegacySheet(wb, 'L2-4(A4) 제품특성');
  if (wsA4) {
    wsA4.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const pno = rowPno(row, 1);
      const val = rowPno(row, 2);
      const sp = rowPno(row, 3);
      if (!pno || !val) return;
      add({ category: 'A', itemCode: 'A4', processNo: pno, value: val, specialChar: sp || undefined });
    });
  }

  const wsB1 = findLegacySheet(wb, 'L3-1(B1) 작업요소');
  if (wsB1) {
    wsB1.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const pno = rowPno(row, 1);
      const m4 = rowPno(row, 2);
      const val = rowPno(row, 3);
      if (!pno || !val) return;
      add({ category: 'B', itemCode: 'B1', processNo: pno, m4: m4 || undefined, value: val });
    });
  }

  const wsB2 = findLegacySheet(wb, 'L3-2(B2) 요소기능');
  if (wsB2) {
    // Auto-detect: 3-col (pno,m4,val) vs 4-col (pno,m4,belongsTo,val)
    const b2ColCount = countHeaderCols(wsB2);
    wsB2.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const pno = rowPno(row, 1);
      const m4 = rowPno(row, 2);
      let bel = '';
      let val = '';
      if (b2ColCount >= 4) {
        bel = rowPno(row, 3);
        val = rowPno(row, 4);
      } else {
        val = rowPno(row, 3);
      }
      if (!pno || !val) return;
      add({
        category: 'B',
        itemCode: 'B2',
        processNo: pno,
        m4: m4 || undefined,
        belongsTo: bel || undefined,
        value: val,
      });
    });
  }

  const wsB3 = findLegacySheet(wb, 'L3-3(B3) 공정특성');
  if (wsB3) {
    // Auto-detect: 4-col (pno,m4,val,sp) vs 5-col (pno,m4,belongsTo,val,sp)
    const b3ColCount = countHeaderCols(wsB3);
    wsB3.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const pno = rowPno(row, 1);
      const m4 = rowPno(row, 2);
      let bel = '';
      let val = '';
      let sp = '';
      if (b3ColCount >= 5) {
        bel = rowPno(row, 3);
        val = rowPno(row, 4);
        sp = rowPno(row, 5);
      } else {
        val = rowPno(row, 3);
        sp = rowPno(row, 4);
      }
      if (!pno || !val) return;
      add({
        category: 'B',
        itemCode: 'B3',
        processNo: pno,
        m4: m4 || undefined,
        belongsTo: bel || undefined,
        value: val,
        specialChar: sp || undefined,
      });
    });
  }

  const threeColB = (label: string, code: 'B4') => {
    const ws = findLegacySheet(wb, label);
    if (!ws) return;
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const pno = rowPno(row, 1);
      const m4 = rowPno(row, 2);
      const val = rowPno(row, 3);
      if (!pno || !val) return;
      add({ category: 'B', itemCode: code, processNo: pno, m4: m4 || undefined, value: val });
    });
  };
  threeColB('L3-4(B4) 고장원인', 'B4');

  const wsB5 = findLegacySheet(wb, 'L3-5(B5) 예방관리');
  if (wsB5) {
    // Auto-detect: 3-col (pno,m4,val) vs 4-col (pno,m4,belongsTo,val)
    const b5ColCount = countHeaderCols(wsB5);
    wsB5.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const pno = rowPno(row, 1);
      const m4 = rowPno(row, 2);
      let bel = '';
      let val = '';
      if (b5ColCount >= 4) {
        bel = rowPno(row, 3);
        val = rowPno(row, 4);
      } else {
        val = rowPno(row, 3);
      }
      if (!pno || !val) return;
      add({
        category: 'B',
        itemCode: 'B5',
        processNo: pno,
        m4: m4 || undefined,
        belongsTo: bel || undefined,
        value: val,
      });
    });
  }

  const wsC1 = findLegacySheet(wb, 'L1-1(C1) 구분');
  if (wsC1) {
    wsC1.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const v = rowPno(row, 1);
      if (!v) return;
      add({ category: 'C', itemCode: 'C1', processNo: v, value: v });
    });
  }

  const c234 = (label: string, code: 'C2' | 'C3' | 'C4') => {
    const ws = findLegacySheet(wb, label);
    if (!ws) return;
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const scope = rowPno(row, 1);
      const val = rowPno(row, 2);
      if (!scope || !val) return;
      add({ category: 'C', itemCode: code, processNo: scope, value: val });
    });
  };
  c234('L1-2(C2) 제품기능', 'C2');
  c234('L1-3(C3) 요구사항', 'C3');
  c234('L1-4(C4) 고장영향', 'C4');

  return out;
}

function sheetMatchesCanonical(actual: string, canonical: string): boolean {
  const a = compact(actual);
  const b = compact(canonical);
  if (a === b) return true;
  const parts = canonical
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (parts.length < 2) return false;
  return parts.every((p) => a.includes(compact(p)));
}

/** 개별 기초정보 시트명이 템플릿과 다수 일치하면 레거시 15탭 계열로 간주 (시트 수는 13~15 등 가변) */
export function isLegacyIndividualBasicInfoWorkbook(sheetNames: string[]): boolean {
  let matched = 0;
  for (const canon of LEGACY_BASIC_SHEET_NAMES) {
    if (sheetNames.some((sn) => sheetMatchesCanonical(sn, canon))) matched++;
  }
  return matched >= 3;
}
