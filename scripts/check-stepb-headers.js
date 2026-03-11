/**
 * STEP B "fmea result" 시트 상세 헤더 분석
 */
const XLSX = require('xlsx');
const path = require('path');

const file = 'docs/PFMEA_STEP_B_티앤에프.xls';
const fullPath = path.join(__dirname, '..', file);
const wb = XLSX.readFile(fullPath);
const ws = wb.Sheets['fmea result'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('전체 행 수: ' + data.length);

// 처음 15행 모두 표시 (헤더 구조 파악)
console.log('\n[처음 15행 전체 내용]');
for (let i = 0; i < Math.min(15, data.length); i++) {
  const row = data[i];
  if (!row || row.length === 0) {
    console.log('[행 ' + i + '] (빈 행)');
    continue;
  }
  console.log('[행 ' + i + '] ' + row.length + '열:');
  for (let j = 0; j < row.length; j++) {
    if (row[j] !== undefined && row[j] !== null && row[j] !== '') {
      console.log('  [' + j + '] "' + String(row[j]).substring(0, 80) + '"');
    }
  }
}

// 전체에서 '요구' 또는 'requirement' 포함 셀 검색
console.log('\n[전체 데이터에서 "요구" 검색]');
let found = 0;
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  for (let j = 0; j < row.length; j++) {
    const cell = String(row[j] || '');
    if (cell.includes('요구')) {
      console.log('  행=' + i + ' 열=' + j + ' 값="' + cell.substring(0, 80) + '"');
      found++;
      if (found > 20) { console.log('  ...생략'); break; }
    }
  }
  if (found > 20) break;
}
if (found === 0) console.log('  ❌ "요구" 포함 셀 없음');
