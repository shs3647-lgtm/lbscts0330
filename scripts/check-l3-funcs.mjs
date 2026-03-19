import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('data/test-import-m066-v4.xlsx');

const sheets = wb.worksheets;
// Find L3 sheet (contains B1-B5)
const l3 = sheets.find(s => s.name.includes('B1-B5'));
if (!l3) { console.error('L3 sheet not found'); process.exit(1); }

let lastPNo = '', lastM4 = '', lastWE = '';
const groups = {};

l3.eachRow((row, n) => {
  if (n === 1) return;
  const rawPNo = String(row.getCell(1).value || '').trim();
  const rawM4 = String(row.getCell(2).value || '').trim();
  const rawWE = String(row.getCell(3).value || '').trim();
  const func = String(row.getCell(4).value || '').trim();
  const pc = String(row.getCell(5).value || '').trim();
  const fc = String(row.getCell(7).value || '').trim();

  if (rawPNo) lastPNo = rawPNo;
  if (rawM4) lastM4 = rawM4;
  if (rawWE) lastWE = rawWE;

  const key = `${lastPNo}|${lastM4}|${lastWE}`;
  if (!groups[key]) groups[key] = { pNo: lastPNo, m4: lastM4, we: lastWE, funcs: [], pcs: [], fcs: [], rows: [] };
  if (func) groups[key].funcs.push(func);
  if (pc) groups[key].pcs.push(pc);
  if (fc) groups[key].fcs.push(fc);
  groups[key].rows.push(n);
});

const all = Object.values(groups);
const noFunc = all.filter(g => g.funcs.length === 0);
console.log(`Total WE groups: ${all.length}`);
console.log(`WEs without B2 (function): ${noFunc.length}`);
for (const g of noFunc) {
  console.log(`  ${g.pNo} [${g.m4}] "${g.we}" rows=${g.rows.join(',')} fcs=${g.fcs.length}`);
}

// Also check: WEs with B4 but no B2
const b4NoB2 = all.filter(g => g.fcs.length > 0 && g.funcs.length === 0);
console.log(`WEs with B4 but no B2: ${b4NoB2.length}`);
for (const g of b4NoB2) {
  console.log(`  ${g.pNo} [${g.m4}] "${g.we}" fcs=${g.fcs.length}`);
}
