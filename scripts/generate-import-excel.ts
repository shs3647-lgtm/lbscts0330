/**
 * 위치기반 JSON → Import 엑셀 생성
 * 모든 셀에 데이터 채움 (fill-down), FC시트에 L1/L2/L3 원본행 포함.
 * 구 Smart FMEA import 포맷과 동일한 시트/컬럼 구조.
 */
import * as fs from 'fs';
import ExcelJS from 'exceljs';

interface PosRow {
  excelRow: number;
  posId: string;
  cells: Record<string, string>;
  fk: Record<string, string>;
}

interface PosSheet { sheetName: string; headers: string[]; rows: PosRow[] }

async function main() {
  const raw = fs.readFileSync('data/master-fmea/m102-position-based.json', 'utf8');
  const pos = JSON.parse(raw);

  const wb = new ExcelJS.Workbook();

  // --- L1 통합 시트 ---
  const l1ws = wb.addWorksheet('L1 통합(C1-C4)');
  const l1h = ['No', '구분', '제품기능', '요구사항', '고장영향'];
  l1ws.addRow(l1h);
  styleHeader(l1ws, 1, l1h.length);

  const l1Rows: PosRow[] = pos.sheets.L1.rows;
  for (let i = 0; i < l1Rows.length; i++) {
    const r = l1Rows[i];
    const c = r.cells;
    l1ws.addRow([
      i + 1,
      fillDown(l1Rows, i, 'C1'),
      fillDown(l1Rows, i, 'C2'),
      fillDown(l1Rows, i, 'C3'),
      c.C4 || fillDown(l1Rows, i, 'C4'),
    ]);
  }

  // --- L2 통합 시트 ---
  const l2ws = wb.addWorksheet('L2 통합(A1-A6)');
  const l2h = ['No', '공정번호', '공정명/스테이션명', '공정기능', '제품특성', '특별특성', '고장형태', '현재 검출관리'];
  l2ws.addRow(l2h);
  styleHeader(l2ws, 1, l2h.length);

  const l2Rows: PosRow[] = pos.sheets.L2.rows;
  for (let i = 0; i < l2Rows.length; i++) {
    const r = l2Rows[i];
    const c = r.cells;
    l2ws.addRow([
      i + 1,
      fillDown(l2Rows, i, 'A1'),
      fillDown(l2Rows, i, 'A2'),
      fillDown(l2Rows, i, 'A3'),
      fillDown(l2Rows, i, 'A4'),
      c.SC || '비지정',
      c.A5 || fillDown(l2Rows, i, 'A5'),
      fillDown(l2Rows, i, 'A6'),
    ]);
  }

  // --- L3 통합 시트 ---
  const l3ws = wb.addWorksheet('L3 통합(B1-B5)');
  const l3h = ['No', '공정번호', '4M', '작업요소', '요소기능', '공정특성', '특별특성', '고장원인', '현재 예방관리'];
  l3ws.addRow(l3h);
  styleHeader(l3ws, 1, l3h.length);

  const l3Rows: PosRow[] = pos.sheets.L3.rows;
  for (let i = 0; i < l3Rows.length; i++) {
    const r = l3Rows[i];
    const c = r.cells;
    l3ws.addRow([
      i + 1,
      fillDown(l3Rows, i, 'processNo'),
      fillDown(l3Rows, i, 'm4'),
      fillDown(l3Rows, i, 'B1'),
      fillDown(l3Rows, i, 'B2'),
      fillDown(l3Rows, i, 'B3'),
      c.SC || '비지정',
      c.B4 || fillDown(l3Rows, i, 'B4'),
      fillDown(l3Rows, i, 'B5'),
    ]);
  }

  // --- FC 고장사슬 시트 ---
  const fcws = wb.addWorksheet('FC 고장사슬');
  const fch = [
    'No', 'FE구분', 'FE(고장영향)', '공정번호', 'FM(고장형태)',
    '4M', 'WE(작업요소)', 'FC(고장원인)', 'PC(예방관리)', 'DC(검출관리)',
    'S', 'O', 'D', 'AP', 'L1원본행', 'L2원본행', 'L3원본행',
  ];
  fcws.addRow(fch);
  styleHeader(fcws, 1, fch.length);

  const fcRows: PosRow[] = pos.sheets.FC.rows;
  for (let i = 0; i < fcRows.length; i++) {
    const r = fcRows[i];
    const c = r.cells;
    fcws.addRow([
      i + 1,
      c.FE_scope || '',
      c.FE || '',
      c.processNo || '',
      c.FM || '',
      c.m4 || '',
      c.WE || '',
      c.FC || '',
      c.PC || '',
      c.DC || '',
      c.S || '',
      c.O || '',
      c.D || '',
      c.AP || '',
      c.L1_origRow || '',
      c.L2_origRow || '',
      c.L3_origRow || '',
    ]);
  }

  // 컬럼 너비 자동 조정
  for (const ws of [l1ws, l2ws, l3ws, fcws]) {
    ws.columns.forEach(col => { col.width = 18; });
  }

  const outPath = 'data/m102_import_position_based.xlsx';
  await wb.xlsx.writeFile(outPath);
  console.log(`→ ${outPath}`);
  console.log(`L1=${l1Rows.length} L2=${l2Rows.length} L3=${l3Rows.length} FC=${fcRows.length}`);

  // 빈셀 검증
  let emptyCount = 0;
  for (const ws of [l1ws, l2ws, l3ws]) {
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum === 1) return;
        const v = String(cell.value || '').trim();
        if (!v) emptyCount++;
      });
    });
  }
  console.log(`빈셀(L1~L3): ${emptyCount}`);
}

function fillDown(rows: PosRow[], idx: number, field: string): string {
  if (rows[idx].cells[field]) return rows[idx].cells[field];
  for (let i = idx - 1; i >= 0; i--) {
    if (rows[i].cells[field]) return rows[i].cells[field];
  }
  for (let i = idx + 1; i < rows.length; i++) {
    if (rows[i].cells[field]) return rows[i].cells[field];
  }
  return '';
}

function styleHeader(ws: ExcelJS.Worksheet, rowNum: number, colCount: number) {
  const row = ws.getRow(rowNum);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  }
}

main().catch(err => { console.error(err); process.exit(1); });
