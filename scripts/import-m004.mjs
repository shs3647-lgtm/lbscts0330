/**
 * pfm26-m004 Excel Import 스크립트
 * Excel → position-parser → save-position-import API → DB 저장
 */
import ExcelJS from 'exceljs';
import fs from 'fs';

const FMEA_ID = 'pfm26-m004';
const EXCEL_PATH = 'C:\\Users\\Administrator\\Desktop\\LB쎄미콘\\aubump\\N260323_pfm26-m004_import_FC_completed_2.xlsx';
const API_URL = 'http://localhost:3000/api/fmea/save-position-import';

// 1. Read Excel
console.log('=== Step 1: Excel Read ===');
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(EXCEL_PATH);
const sheetNames = wb.worksheets.map(ws => ws.name);
console.log('Sheets:', sheetNames.join(', '));

// 2. Dynamic import position-parser
console.log('\n=== Step 2: Parse with position-parser ===');

// Since position-parser is TypeScript, we need to call it via API or tsx
// Instead, let's convert workbook to JSON and call the API
// We'll use the same pattern as the UI: build workbook JSON → call API

// Convert ExcelJS workbook to parseable JSON structure
function workbookToJSON(wb) {
  const result = {};
  for (const ws of wb.worksheets) {
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cells.push({ col: colNumber, value: cell.value != null ? String(cell.value) : '' });
      });
      rows.push({ row: rowNumber, cells });
    });
    result[ws.name] = { rowCount: ws.rowCount, columnCount: ws.columnCount, rows };
  }
  return result;
}

const wbJson = workbookToJSON(wb);

// Save workbook JSON for tsx parsing
fs.writeFileSync('scripts/m004-workbook.json', JSON.stringify(wbJson, null, 0));
console.log('Workbook JSON saved: scripts/m004-workbook.json');
console.log('Sheet stats:');
for (const [name, data] of Object.entries(wbJson)) {
  console.log(`  ${name}: ${data.rows.length} rows`);
}

console.log('\n=== Step 3: Call save-position-import via tsx ===');
console.log('Run the following command to import:');
console.log('npx tsx scripts/import-m004-parse.ts');
