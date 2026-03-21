/**
 * L1 통합(C1–C4) 시트: 구분(C1) 열의 `-`/빈칸/N/A 를 YP/SP/USER 로 채움(위·아래 맥락).
 * Rich Text/수식 객체로 읽히는 C2~C4 셀은 평문 문자열로 정리(Import 누락 방지).
 *
 * 사용:
 *   INPUT_XLSX=data/your.xlsx npx tsx scripts/fill-l1-unified-excel.ts
 *   OUTPUT_XLSX=data/your_filled.xlsx  (미지정 시 *_l1filled.xlsx)
 */
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { getMergedCellValue } from '@/lib/excel-data-range';
import { cellValueToString } from '@/app/(fmea-core)/pfmea/import/excel-parser-utils';

const DASH = /^-+$|^[—–]$/u;

function isDashOrEmpty(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (DASH.test(t)) return true;
  if (/^n\/a$/i.test(t)) return true;
  return false;
}

/** 구분값 → YP / SP / USER (짧은 약어) */
function abbreviateScope(raw: string): string {
  const t = raw.trim();
  if (!t || isDashOrEmpty(t)) return '';
  const u = t.toUpperCase();
  if (u === 'YP' || u.includes('YOUR PLANT')) return 'YP';
  if (u === 'SP' || u.includes('SHIP TO PLANT')) return 'SP';
  if (u === 'USER' || u === 'US' || u.includes('USER')) return 'USER';
  return t;
}

/** C1 열 배열(데이터 행만) → 전/후방으로 빈 구분 채움 */
function fillScopeColumn(values: string[]): string[] {
  const norm = values.map((v) => abbreviateScope(v));
  const n = norm.length;
  const out = [...norm];
  for (let i = 0; i < n; i++) {
    if (!out[i] && i > 0) out[i] = out[i - 1];
  }
  for (let i = n - 1; i >= 0; i--) {
    if (!out[i] && i < n - 1) out[i] = out[i + 1];
  }
  for (let i = 0; i < n; i++) {
    if (!out[i] && i > 0) out[i] = out[i - 1];
  }
  return out;
}

function findL1UnifiedSheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet | null {
  let found: ExcelJS.Worksheet | null = null;
  wb.eachSheet((ws) => {
    const h1 = ws.getRow(1);
    const parts: string[] = [];
    h1.eachCell({ includeEmpty: true }, (c, colNumber) => {
      if (colNumber <= 12) parts[colNumber] = cellValueToString(c.value);
    });
    const joined = parts.join('');
    const noSp = joined.replace(/\s/g, '');
    if (
      noSp.includes('구분') &&
      noSp.includes('제품기능') &&
      noSp.includes('요구사항') &&
      noSp.includes('고장영향')
    ) {
      found = ws;
    }
  });
  return found;
}

function findHeaderColIndex(ws: ExcelJS.Worksheet, keyword: string): number {
  const row = ws.getRow(1);
  let maxCol = 0;
  row.eachCell({ includeEmpty: true }, (_c, colNumber) => {
    if (colNumber > maxCol) maxCol = colNumber;
  });
  for (let c = 1; c <= maxCol; c++) {
    const h = cellValueToString(row.getCell(c).value).replace(/\s/g, '');
    if (h.includes(keyword)) return c;
  }
  return 0;
}

function setCellPlain(ws: ExcelJS.Worksheet, row: number, col: number, text: string): void {
  const cell = ws.getRow(row).getCell(col);
  cell.value = text;
}

function getMasterCellForMerged(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
): { row: number; col: number } {
  const merges: string[] = (sheet.model as { merges?: string[] }).merges || [];
  for (const mergeRange of merges) {
    const parts = mergeRange.split(':');
    if (parts.length !== 2) continue;
    const parseRef = (ref: string): { row: number; col: number } => {
      const m = ref.match(/^([A-Z]+)(\d+)$/i);
      if (!m) return { row: 1, col: 1 };
      const colStr = m[1].toUpperCase();
      const r = parseInt(m[2], 10);
      let c = 0;
      for (let i = 0; i < colStr.length; i++) {
        c = c * 26 + (colStr.charCodeAt(i) - 64);
      }
      return { row: r, col: c };
    };
    const tl = parseRef(parts[0]);
    const br = parseRef(parts[1]);
    if (row >= tl.row && row <= br.row && col >= tl.col && col <= br.col) {
      return { row: tl.row, col: tl.col };
    }
  }
  return { row, col };
}

async function main() {
  const input = process.env.INPUT_XLSX || 'data/master-fmea/master_import_12inch_AuBump.xlsx';
  if (!fs.existsSync(input)) {
    console.error('파일 없음:', input);
    process.exit(1);
  }
  const outPath =
    process.env.OUTPUT_XLSX ||
    (() => {
      const dir = path.dirname(input);
      const base = path.basename(input, '.xlsx');
      return path.join(dir, `${base}_l1filled.xlsx`);
    })();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(input);
  const ws = findL1UnifiedSheet(wb);
  if (!ws) {
    console.error('L1 통합(구분·제품기능·요구사항·고장영향) 시트를 찾지 못했습니다.');
    process.exit(1);
  }

  const scopeCol = findHeaderColIndex(ws, '구분');
  const c2Col = findHeaderColIndex(ws, '제품기능');
  const c3Col = findHeaderColIndex(ws, '요구사항');
  const c4Col = findHeaderColIndex(ws, '고장영향');
  if (!scopeCol || !c2Col || !c3Col || !c4Col) {
    console.error('헤더 열 매핑 실패:', { scopeCol, c2Col, c3Col, c4Col });
    process.exit(1);
  }

  const dataStartRow = 2;
  const rawScopes: string[] = [];
  const rowIndices: number[] = [];
  for (let r = dataStartRow; r <= ws.rowCount; r++) {
    const raw = getMergedCellValue(ws, r, scopeCol).trim();
    rawScopes.push(raw);
    rowIndices.push(r);
  }

  const filled = fillScopeColumn(rawScopes);
  let changed = 0;
  for (let i = 0; i < rowIndices.length; i++) {
    const r = rowIndices[i];
    const after = filled[i];
    // 원본이 `-`/빈칸일 때만 채움 — 이미 YP/SP/USER 가 있으면 덮어쓰지 않음
    if (after && isDashOrEmpty(rawScopes[i])) {
      const { row: mr, col: mc } = getMasterCellForMerged(ws, r, scopeCol);
      setCellPlain(ws, mr, mc, after);
      changed++;
    }
  }

  let flatRich = 0;
  for (let i = 0; i < rowIndices.length; i++) {
    const r = rowIndices[i];
    for (const col of [c2Col, c3Col, c4Col]) {
      const cell = ws.getRow(r).getCell(col);
      const v = cell.value;
      if (v !== null && v !== undefined && typeof v === 'object') {
        const plain = cellValueToString(v).trim();
        const { row: mr, col: mc } = getMasterCellForMerged(ws, r, col);
        setCellPlain(ws, mr, mc, plain);
        flatRich++;
      }
    }
  }

  await wb.xlsx.writeFile(outPath);
  console.info(
    `[fill-l1-unified-excel] ${input} → ${outPath} (구분 보정: ${changed}행, RichText→평문: ${flatRich}셀)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
