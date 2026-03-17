import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const file = process.argv[2] || 'data/master-fmea/pfm26-m066-import.xlsx';
const fullPath = path.resolve(file);

async function main() {
  if (!fs.existsSync(fullPath)) { console.error('파일 없음:', fullPath); return; }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(fullPath);
  
  console.log(`\n📄 ${path.basename(fullPath)} (${(fs.statSync(fullPath).size / 1024).toFixed(1)}KB)\n`);
  console.log('시트명'.padEnd(30) + '행수'.padStart(6) + '  샘플(2행)');
  console.log('─'.repeat(80));
  
  wb.eachSheet((ws) => {
    const rows = ws.rowCount > 1 ? ws.rowCount - 1 : 0;
    let sample = '';
    if (ws.rowCount >= 2) {
      const r = ws.getRow(2);
      const vals: string[] = [];
      r.eachCell((cell) => { vals.push(String(cell.value || '').substring(0, 20)); });
      sample = vals.join(' | ');
    }
    console.log(ws.name.padEnd(30) + String(rows).padStart(6) + '  ' + sample.substring(0, 50));
  });
}
main().catch(console.error);
