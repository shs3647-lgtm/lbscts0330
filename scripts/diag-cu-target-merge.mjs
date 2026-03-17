import ExcelJS from 'exceljs';
import fs from 'fs';

const FILE = 'data/master-fmea/master_import_12inch_AuBump.xlsx';
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(fs.readFileSync(FILE));

// L3 통합 시트에서 공정 40 행들을 상세 확인
const ws = wb.worksheets.find(w => w.name.includes('L3'));
if (!ws) { console.log('L3 sheet not found'); process.exit(1); }

console.log('=== Sheet:', ws.name, '===');
console.log('Merged cells:', JSON.stringify(ws.model?.merges || []));

// 헤더 확인
const headerRow = ws.getRow(1);
const headers = [];
headerRow.eachCell((cell, ci) => {
  headers.push({ col: ci, header: String(cell.value || '') });
});
console.log('\nHeaders:', headers.map(h => `${h.col}:${h.header}`).join(' | '));

// 공정 40 관련 행 상세 (Ti Target, Cu Target)
console.log('\n=== Process 40 rows (around Ti/Cu Target) ===');
let lastProcessNo = '';
for (let ri = 2; ri <= ws.rowCount; ri++) {
  const row = ws.getRow(ri);
  const pNo = String(row.getCell(1).value || '').trim();
  if (pNo) lastProcessNo = pNo;
  if (lastProcessNo !== '40') continue;
  
  const cells = [];
  for (let ci = 1; ci <= 8; ci++) {
    const cell = row.getCell(ci);
    const isMerged = cell.isMerged;
    const master = cell.master;
    const val = String(cell.value || '');
    const masterInfo = (isMerged && master) ? ` [merged→R${master.row}C${master.col}]` : '';
    cells.push(`C${ci}=${val.substring(0, 35)}${masterInfo}`);
  }
  console.log(`  Row ${ri}: ${cells.join(' | ')}`);
}
