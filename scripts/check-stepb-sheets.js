/**
 * STEP B 엑셀 시트 구조 확인 — C3 시트 존재 여부 및 데이터 확인
 */
const XLSX = require('xlsx');
const path = require('path');

// 모든 STEP B 엑셀 파일 확인
const files = [
  'docs/PFMEA_STEP_B_티앤에프.xls',
  'docs/PFMEA_STEP_B_GOLDEN_TEST.xls',
  'docs/PFMEA_STEP_B_완벽버전.xlsx',
];

for (const file of files) {
  const fullPath = path.join(__dirname, '..', file);
  try {
    const wb = XLSX.readFile(fullPath);
    console.log('\n=== ' + file + ' ===');
    console.log('시트 목록:', wb.SheetNames.join(', '));

    // C3 관련 시트 찾기
    const c3Sheet = wb.SheetNames.find(name =>
      name.includes('요구사항') || name.includes('C3') || name.includes('L1-3') || name.includes('l1-3')
    );

    if (c3Sheet) {
      console.log('✅ C3 시트 발견: "' + c3Sheet + '"');
      const ws = wb.Sheets[c3Sheet];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      console.log('  행 수: ' + data.length);
      data.slice(0, 5).forEach((row, i) => {
        console.log('  [' + i + '] ' + JSON.stringify(row));
      });
    } else {
      console.log('❌ C3 시트 없음');

      // C 관련 시트 모두 표시
      const cSheets = wb.SheetNames.filter(name =>
        name.includes('C') || name.includes('구분') || name.includes('제품') || name.includes('요구') || name.includes('고장영향') || name.includes('L1')
      );
      if (cSheets.length > 0) {
        console.log('  C 관련 시트:', cSheets.join(', '));
      }
    }

    // C2 시트도 확인 (함수 데이터)
    const c2Sheet = wb.SheetNames.find(name =>
      name.includes('제품기능') || name.includes('C2') || name.includes('L1-2') || name.includes('l1-2')
    );
    if (c2Sheet) {
      console.log('\n  [C2 시트] "' + c2Sheet + '"');
      const ws = wb.Sheets[c2Sheet];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      console.log('  행 수: ' + data.length);
      data.forEach((row, i) => {
        console.log('  [' + i + '] ' + JSON.stringify(row));
      });
    }

    // C4 시트도 확인
    const c4Sheet = wb.SheetNames.find(name =>
      name.includes('고장영향') || name.includes('C4') || name.includes('L1-4') || name.includes('l1-4')
    );
    if (c4Sheet) {
      console.log('\n  [C4 시트] "' + c4Sheet + '"');
      const ws = wb.Sheets[c4Sheet];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      console.log('  행 수: ' + data.length);
      data.slice(0, 5).forEach((row, i) => {
        console.log('  [' + i + '] ' + JSON.stringify(row));
      });
    }

  } catch (e) {
    console.log('\n=== ' + file + ' ===');
    console.log('❌ 읽기 실패:', e.message);
  }
}
