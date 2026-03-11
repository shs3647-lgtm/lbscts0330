/**
 * STEP A 엑셀 읽기 — C3(요구사항), A4(제품특성), B3(공정특성) 등 확인
 */
const XLSX = require('xlsx');

const file = 'D:\\00 SMART FMEA TUTOR\\티앤에프\\PFMEA STEP A (2).xls';
const wb = XLSX.readFile(file);

console.log('=== STEP A 엑셀 분석 ===');
console.log('시트 목록:', wb.SheetNames.join(', '));
console.log('시트 수:', wb.SheetNames.length);

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log('\n' + '='.repeat(60));
  console.log('[시트] "' + sheetName + '" — ' + data.length + '행');
  console.log('='.repeat(60));

  // 처음 15행 표시
  const showRows = Math.min(15, data.length);
  for (let i = 0; i < showRows; i++) {
    const row = data[i];
    if (!row || row.length === 0) {
      console.log('  [' + i + '] (빈 행)');
      continue;
    }
    console.log('  [' + i + '] ' + row.length + '열:');
    for (let j = 0; j < row.length; j++) {
      if (row[j] !== undefined && row[j] !== null && row[j] !== '') {
        const val = String(row[j]).substring(0, 80);
        console.log('    [' + j + '] "' + val + '"');
      }
    }
  }

  // 키워드 검색
  const keywords = ['요구사항', '제품특성', '공정특성', 'C3', 'A4', 'B3'];
  for (const kw of keywords) {
    let found = false;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      for (let j = 0; j < row.length; j++) {
        if (String(row[j] || '').includes(kw)) {
          if (!found) {
            console.log('\n  [검색: "' + kw + '"]');
            found = true;
          }
          console.log('    행=' + i + ' 열=' + j + ' "' + String(row[j]).substring(0, 80) + '"');
        }
      }
    }
  }
}
