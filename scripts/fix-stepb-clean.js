/**
 * @file fix-stepb-clean.js
 * @description PFMEA STEP B 오류 수정 → 클린 Import용 버전 (노란배경/셀메모 없음)
 */

const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');

const INPUT_PATH = 'D:/00 SMART FMEA TUTOR/티앤에프/PFMEA STEP B.xls';
const OUTPUT_PATH = 'D:/00 SMART FMEA TUTOR/티앤에프/PFMEA STEP B_Import용.xlsx';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
const HEADER_FONT = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };

async function main() {
  const wb = XLSX.readFile(INPUT_PATH);
  const ws = wb.Sheets['fmea result'];
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const HEADER_ROWS = 11;
  const headers = rawData.slice(0, HEADER_ROWS);
  const dataRows = rawData.slice(HEADER_ROWS).map(r => [...r]);

  // Forward Fill
  const ffCols = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  for (const c of ffCols) {
    let prev = '';
    for (let i = 0; i < dataRows.length; i++) {
      const v = String(dataRows[i][c] || '').trim();
      if (v) prev = v;
      else dataRows[i][c] = prev;
    }
  }

  // 수정
  let fixCount = 0;
  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const procStr = String(r[3] || '').trim();
    const pm = procStr.match(/^(\d+)번/);
    if (!pm) continue;
    const pNo = pm[1];

    // FC 접두어 수정
    const fc = String(r[18] || '').trim();
    if (fc) {
      const fcM = fc.match(/^(\d+)(번|_|-)/);
      if (fcM && fcM[1] !== pNo) {
        dataRows[i][18] = fc.replace(new RegExp(`^${fcM[1]}`), pNo);
        fixCount++;
      }
    }

    // S 불일치 수정
    const fm = String(r[15] || '').trim();
    const fe = String(r[13] || '').trim();
    const s = String(r[14] || '').trim();
    if (fm === '10번F02_포장 손상' && fe.includes('Y5-4') && s === '5') {
      dataRows[i][14] = '6';
      fixCount++;
    }
  }

  // ExcelJS 출력 — 클린 버전 (스타일 없음, 검은 글씨)
  const ewb = new ExcelJS.Workbook();
  const sheet = ewb.addWorksheet('fmea result');

  for (let hi = 0; hi < HEADER_ROWS; hi++) {
    const row = sheet.addRow(headers[hi].map(v => v === '' ? '' : v));
    if (hi >= 8) {
      row.eachCell(cell => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
    }
  }

  for (const dr of dataRows) {
    sheet.addRow(dr);
  }

  const colWidths = [
    5, 8, 18, 18, 5, 22, 10, 35, 30, 5, 22, 30,
    10, 40, 5, 30, 5, 22, 35, 35, 5, 25, 5, 5, 5, 8,
    25, 25, 12, 12, 10, 15, 10, 5, 5, 5, 5, 5, 10,
  ];
  colWidths.forEach((w, idx) => { sheet.getColumn(idx + 1).width = w; });

  const buf = await ewb.xlsx.writeBuffer();
  require('fs').writeFileSync(OUTPUT_PATH, Buffer.from(buf));

  console.log(`완료: ${fixCount}건 수정, 출력: ${OUTPUT_PATH}`);
}

main().catch(err => { console.error(err); process.exit(1); });
