import ExcelJS from 'exceljs';
import fs from 'fs';

// 원본 엑셀에서 B3 개별 시트 vs L3 통합시트 비교
const FILE = 'data/master-fmea/master_import_12inch_AuBump.xlsx';
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(fs.readFileSync(FILE));

console.log('=== 시트 목록 ===');
wb.eachSheet(ws => console.log(`  ${ws.name} (${ws.rowCount} rows)`));

// 개별 B3 시트 존재 여부
const b3Individual = wb.worksheets.find(w => {
  const n = w.name.replace(/\s/g,'').toLowerCase();
  return n.includes('b3') || (n.includes('공정특성') && !n.includes('통합') && !n.includes('l3'));
});

console.log('\n=== 개별 B3 시트 ===');
if (b3Individual) {
  console.log(`Found: ${b3Individual.name}`);
  // 공정 40 행 확인
  b3Individual.eachRow((row, ri) => {
    const pNo = String(row.getCell(1).value||'').trim();
    if (pNo === '40' || (ri > 1 && String(row.getCell(3).value||'').includes('Target'))) {
      const cells = [];
      for (let ci = 1; ci <= 8; ci++) cells.push(String(row.getCell(ci).value||''));
      console.log(`  Row ${ri}: ${cells.join(' | ')}`);
    }
  });
} else {
  console.log('NOT FOUND - 개별 B3 시트 없음');
}

// L3 통합시트에서 B3 컬럼 (공정특성) 확인
const l3Unified = wb.worksheets.find(w => w.name.includes('L3') && w.name.includes('통합'));
console.log('\n=== L3 통합시트 B3 컬럼 ===');
if (l3Unified) {
  console.log(`Found: ${l3Unified.name}`);
  const h1 = l3Unified.getRow(1);
  for (let ci = 1; ci <= 10; ci++) {
    console.log(`  Col ${ci}: ${String(h1.getCell(ci).value||'')}`);
  }
  // Ti Target, Cu Target 행
  l3Unified.eachRow((row, ri) => {
    const we = String(row.getCell(3).value||'');
    if (we.includes('Ti Target') || we.includes('Cu Target')) {
      console.log(`  Row ${ri}: pNo=${row.getCell(1).value} m4=${row.getCell(2).value} WE=${we} B3=${row.getCell(5).value} B4=${row.getCell(7).value}`);
    }
  });
}

// 결론: 파서에서 B3 개별시트가 있으므로 통합시트가 스킵됨
// → 통합시트에만 있는 B3 데이터(Cu Target)가 누락됨
console.log('\n=== 결론 ===');
console.log('개별 B3 시트 존재:', !!b3Individual);
console.log('통합 L3 시트 존재:', !!l3Unified);
if (b3Individual && l3Unified) {
  console.log('→ 파서가 개별시트 우선으로 통합시트를 스킵');
  console.log('→ 통합시트에만 Cu Target B3 값이 있으면 누락됨');
}
