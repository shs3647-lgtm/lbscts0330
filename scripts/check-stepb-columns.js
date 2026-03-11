/**
 * STEP B "fmea result" 시트의 컬럼 구조 확인 — C3(요구사항) 열 존재 여부
 */
const XLSX = require('xlsx');
const path = require('path');

const file = 'docs/PFMEA_STEP_B_티앤에프.xls';
const fullPath = path.join(__dirname, '..', file);
const wb = XLSX.readFile(fullPath);
const ws = wb.Sheets['fmea result'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('=== ' + file + ' — "fmea result" 시트 ===');
console.log('전체 행 수: ' + data.length);

// 첫 2행 (헤더) 확인
console.log('\n[헤더 행]');
for (let i = 0; i < Math.min(3, data.length); i++) {
  const row = data[i];
  console.log('[행 ' + i + '] ' + (row ? row.length : 0) + '열');
  if (row) {
    row.forEach((cell, j) => {
      if (cell !== undefined && cell !== null && cell !== '') {
        console.log('  [' + j + '] "' + String(cell).substring(0, 50) + '"');
      }
    });
  }
}

// C3 관련 열 검색 (요구사항, requirement, L1-3)
console.log('\n[C3 관련 열 검색]');
let c3Found = false;
for (let i = 0; i < Math.min(5, data.length); i++) {
  const row = data[i];
  if (!row) continue;
  for (let j = 0; j < row.length; j++) {
    const cell = String(row[j] || '').toLowerCase();
    if (cell.includes('요구사항') || cell.includes('requirement') || cell.includes('l1-3') || cell.includes('c3')) {
      console.log('  ✅ 발견! 행=' + i + ' 열=' + j + ' 값="' + row[j] + '"');
      c3Found = true;
    }
  }
}
if (!c3Found) {
  console.log('  ❌ C3 관련 열 없음');
}

// 전체 헤더 키워드 목록 (excel-parser.ts의 headerKeywords와 대조)
console.log('\n[전체 열 키워드 (행0+행1 병합)]');
const headerRow = data[0] || [];
const subHeaderRow = data[1] || [];
for (let j = 0; j < Math.max(headerRow.length, subHeaderRow.length); j++) {
  const h1 = headerRow[j] ? String(headerRow[j]).trim() : '';
  const h2 = subHeaderRow[j] ? String(subHeaderRow[j]).trim() : '';
  const combined = (h1 + ' | ' + h2).trim();
  if (h1 || h2) {
    console.log('  [' + j + '] ' + combined);
  }
}
