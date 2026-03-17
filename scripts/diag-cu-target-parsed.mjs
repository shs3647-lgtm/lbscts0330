import ExcelJS from 'exceljs';
import fs from 'fs';

// 원본 엑셀을 직접 파싱하여 sheetDataMap B3에 Cu Target 데이터가 들어가는지 시뮬레이션
const FILE = 'data/master-fmea/master_import_12inch_AuBump.xlsx';
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(fs.readFileSync(FILE));

const ws = wb.worksheets.find(w => w.name.includes('L3') && w.name.includes('통합'));
if (!ws) { console.log('L3 통합 시트 없음'); process.exit(1); }

// 헤더 매핑
const headers = [];
const row1 = ws.getRow(1);
for (let ci = 1; ci <= 10; ci++) {
  const val = String(row1.getCell(ci).value || '').replace(/\s/g, '').toLowerCase();
  headers.push({ col: ci, raw: String(row1.getCell(ci).value || ''), norm: val });
}
console.log('Headers:', headers.map(h => `${h.col}:${h.raw}`).join(' | '));

// B3 컬럼 찾기
const b3Col = headers.find(h => h.norm.includes('공정특성'));
const b1Col = headers.find(h => h.norm.includes('작업요소'));
const m4Col = headers.find(h => h.norm.includes('4m') || h.norm.includes('m4'));
const keyCol = headers.find(h => h.norm.includes('공정번호'));

console.log(`\nB3 col=${b3Col?.col}, B1 col=${b1Col?.col}, 4M col=${m4Col?.col}, KEY col=${keyCol?.col}`);

// 모든 행에서 B3 추출 시뮬레이션
const b3Items = [];
let lastKey = '';
for (let ri = 2; ri <= ws.rowCount; ri++) {
  const row = ws.getRow(ri);
  const keyVal = String(row.getCell(keyCol.col).value || '').trim();
  if (keyVal) lastKey = keyVal;
  if (!lastKey) continue; // 파서와 동일: keyVal 없으면 skip? 아님 — 파서는 keyVal만 체크

  const b3Val = String(row.getCell(b3Col.col).value || '').trim();
  const b1Val = String(row.getCell(b1Col.col).value || '').trim();
  const m4Val = String(row.getCell(m4Col.col).value || '').trim().toUpperCase();

  if (b3Val && b3Val !== 'null') {
    b3Items.push({ row: ri, key: keyVal || lastKey, b3: b3Val, b1: b1Val, m4: m4Val });
  }

  // Cu Target 행은 특별히 표시
  if (b1Val.includes('Cu Target') || b1Val.includes('Ti Target')) {
    console.log(`Row ${ri}: key="${keyVal}" lastKey="${lastKey}" m4="${m4Val}" B1="${b1Val}" B3="${b3Val}" → ${b3Val ? 'EXTRACTED' : 'SKIPPED (empty B3)'}`);
  }
}

console.log(`\nTotal B3 items extracted: ${b3Items.length}`);
const proc40B3 = b3Items.filter(i => i.key === '40');
console.log(`Process 40 B3 items: ${proc40B3.length}`);
proc40B3.forEach(i => console.log(`  Row ${i.row}: m4=${i.m4} B1=${i.b1} B3=${i.b3}`));

// Cu Target이 있는지 확인
const cuTarget = b3Items.find(i => i.b1.includes('Cu Target'));
console.log(`\nCu Target B3 in extracted: ${cuTarget ? 'YES → ' + cuTarget.b3 : 'NO — MISSING!'}`);
