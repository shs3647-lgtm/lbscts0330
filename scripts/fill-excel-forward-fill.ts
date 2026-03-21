/**
 * 기존 .xlsx 모든 시트: 헤더(1행) 제외, 빈 셀을 위/아래 행 값으로 채움.
 * 병합 셀·선행 빈칸·특별특성 열까지 모두 채움 (Import 빈칸 오류 방지).
 *
 * 사용: npx tsx scripts/fill-excel-forward-fill.ts
 * 환경: INPUT_XLSX (필수), OUTPUT_XLSX (선택, 기본은 INPUT과 같은 폴더에 _filled 접미사)
 */
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { getMergedCellValue } from '@/lib/excel-data-range';
import { cellValueToString } from '@/app/(fmea-core)/pfmea/import/excel-parser-utils';
import { fillDownRows } from './forward-fill-utils';

function readCellValue(ws: ExcelJS.Worksheet, row: number, col: number): string {
  return cellValueToString(getMergedCellValue(ws, row, col)).trim();
}

async function main() {
  const input = process.env.INPUT_XLSX;
  if (!input || !fs.existsSync(input)) {
    console.error('INPUT_XLSX 환경변수에 읽을 .xlsx 경로를 지정하세요.');
    process.exit(1);
  }
  const outPath =
    process.env.OUTPUT_XLSX ||
    (() => {
      const dir = path.dirname(input);
      const base = path.basename(input, '.xlsx');
      return path.join(dir, `${base}_filled.xlsx`);
    })();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(input);

  wb.eachSheet((ws) => {
    if (ws.rowCount < 2) return;
    const headerRow = ws.getRow(1);
    let maxCol = 0;
    for (let r = 1; r <= ws.rowCount; r++) {
      ws.getRow(r).eachCell({ includeEmpty: true }, (_c, colNumber) => {
        if (colNumber > maxCol) maxCol = colNumber;
      });
    }
    if (maxCol === 0) return;

    const headers: string[] = [];
    for (let c = 1; c <= maxCol; c++) {
      headers.push(readCellValue(ws, 1, c));
    }
    const skipCols = new Set<number>();

    const rows: string[][] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const line: string[] = [];
      for (let c = 1; c <= maxCol; c++) {
        line.push(readCellValue(ws, r, c));
      }
      rows.push(line);
    }

    const filled = fillDownRows(rows, skipCols);
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const idx = r - 2;
      if (idx >= 0 && idx < filled.length) {
        for (let c = 1; c <= maxCol; c++) {
          const v = filled[idx][c - 1] ?? '';
          row.getCell(c).value = v;
        }
      }
    }
  });

  await wb.xlsx.writeFile(outPath);
  console.info(`[fill-excel-forward-fill] ${input} → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
