import ExcelJS from 'exceljs';
import fs from 'fs';

const FILE = 'data/master-fmea/PFMEA_Master_12inch_AuBump.xlsx';
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(fs.readFileSync(FILE));

console.log('=== Sheet List ===');
wb.eachSheet((ws) => {
  const dataRows = ws.rowCount - 1;
  console.log(`  ${ws.name}: ${dataRows} rows`);
});

// A6
const a6 = wb.worksheets.find(w => w.name.includes('A6'));
if (a6) {
  const vals = [];
  a6.eachRow((row, ri) => {
    if (ri > 1) {
      const v = String(row.getCell(5).value || '').trim();
      if (v) vals.push(v);
    }
  });
  console.log(`\nA6 (detection): ${vals.length} non-empty`);
  vals.slice(0, 3).forEach(v => console.log(`  ${v.substring(0, 60)}`));
}

// B5
const b5 = wb.worksheets.find(w => w.name.includes('B5'));
if (b5) {
  const vals = [];
  b5.eachRow((row, ri) => {
    if (ri > 1) {
      const v = String(row.getCell(6).value || '').trim();
      if (v) vals.push(v);
    }
  });
  console.log(`\nB5 (prevention): ${vals.length} non-empty`);
  vals.slice(0, 3).forEach(v => console.log(`  ${v.substring(0, 60)}`));
}

// C1~C4
for (const prefix of ['C1', 'C2', 'C3', 'C4']) {
  const ws = wb.worksheets.find(w => w.name.startsWith(prefix));
  if (ws) {
    console.log(`${prefix}: ${ws.rowCount - 1} rows`);
  } else {
    console.log(`${prefix}: NOT FOUND`);
  }
}

// Summary
const summary = {};
wb.eachSheet((ws) => {
  const code = ws.name.split(' ')[0];
  summary[code] = ws.rowCount - 1;
});
console.log('\n=== Summary ===');
console.log(JSON.stringify(summary, null, 2));
