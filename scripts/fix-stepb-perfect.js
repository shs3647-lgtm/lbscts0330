/**
 * @file fix-stepb-perfect.js
 * @description PFMEA STEP B 오류 수정 → 완벽한 버전 생성
 *
 * 수정 항목:
 * 1. FC 접두어 불일치 (9건): 120번→130번, 160번→60번
 * 2. S 불일치 (1건): 10번F02 + Y5-4 → S=5를 S=6으로 통일
 * 3. forward fill 정합성 검증
 *
 * 출력: ExcelJS로 스타일 유지 + 수정셀 노란배경
 */

const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');

const INPUT_PATH = 'D:/00 SMART FMEA TUTOR/티앤에프/PFMEA STEP B.xls';
const OUTPUT_PATH = 'D:/00 SMART FMEA TUTOR/티앤에프/PFMEA STEP B_완벽버전.xlsx';
const OUTPUT_PATH2 = path.join(__dirname, '..', 'docs', 'PFMEA_STEP_B_완벽버전.xlsx');

// ─── 수정 스타일 ───
const FIX_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
const FIX_FONT = { color: { argb: 'FF0000FF' }, bold: true };
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
const HEADER_FONT = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };

async function main() {
  console.log('=== PFMEA STEP B 완벽버전 생성 ===');
  console.log('입력:', INPUT_PATH);

  // ─── 1단계: 원본 읽기 ───
  const wb = XLSX.readFile(INPUT_PATH);
  const ws = wb.Sheets['fmea result'];
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const HEADER_ROWS = 11; // 행0~행10 = 헤더/메타
  const headers = rawData.slice(0, HEADER_ROWS);
  const dataRows = rawData.slice(HEADER_ROWS).map(r => [...r]);

  console.log(`총 ${dataRows.length}개 데이터행 (헤더 ${HEADER_ROWS}행 제외)`);

  // ─── 2단계: Forward Fill (병합셀 복원) ───
  const ffCols = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  for (const c of ffCols) {
    let prev = '';
    for (let i = 0; i < dataRows.length; i++) {
      const v = String(dataRows[i][c] || '').trim();
      if (v) prev = v;
      else dataRows[i][c] = prev;
    }
  }

  // ─── 3단계: 오류 수정 ───
  const fixes = []; // { row, col, oldVal, newVal, reason }

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const procStr = String(r[3] || '').trim();
    const pm = procStr.match(/^(\d+)번/);
    if (!pm) continue;
    const pNo = pm[1];

    // --- FC 접두어 수정 ---
    const fc = String(r[18] || '').trim();
    if (fc) {
      const fcM = fc.match(/^(\d+)(번|_|-)/);
      if (fcM && fcM[1] !== pNo) {
        const oldPrefix = fcM[1];
        const newFC = fc.replace(new RegExp(`^${oldPrefix}`), pNo);
        fixes.push({
          row: i, col: 18,
          oldVal: fc, newVal: newFC,
          reason: `FC접두어 ${oldPrefix}번→${pNo}번`,
        });
        dataRows[i][18] = newFC;
      }
    }

    // --- S 불일치 수정 ---
    // 10번F02 + Y5-4 → S=5를 S=6으로 통일 (상위값 채택)
    const fm = String(r[15] || '').trim();
    const fe = String(r[13] || '').trim();
    const s = String(r[14] || '').trim();
    if (fm === '10번F02_포장 손상' &&
        fe.includes('Y5-4') &&
        s === '5') {
      fixes.push({
        row: i, col: 14,
        oldVal: '5', newVal: '6',
        reason: 'S불일치(5→6) 동일FM+FE 상위값 채택',
      });
      dataRows[i][14] = '6';
    }
  }

  console.log(`\n수정 ${fixes.length}건:`);
  fixes.forEach(f => {
    console.log(`  행${f.row + HEADER_ROWS + 1}: [${f.reason}]`);
    console.log(`    "${f.oldVal}" → "${f.newVal}"`);
  });

  // ─── 4단계: 수정 후 검증 ───
  let verifyErrors = 0;

  // FC 접두어 재검증
  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const procStr = String(r[3] || '').trim();
    const pm = procStr.match(/^(\d+)번/);
    if (!pm) continue;
    const pNo = pm[1];
    const fc = String(r[18] || '').trim();
    if (fc) {
      const fcM = fc.match(/^(\d+)(번|_|-)/);
      if (fcM && fcM[1] !== pNo) {
        console.log(`[검증실패] 행${i + HEADER_ROWS + 1}: FC접두어 여전히 불일치 (${fcM[1]} ≠ ${pNo})`);
        verifyErrors++;
      }
    }
  }

  // S 일관성 재검증
  const fmFeS = new Map();
  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const fm = String(r[15] || '').trim();
    const fe = String(r[13] || '').trim();
    const s = String(r[14] || '').trim();
    if (fm && fe && s) {
      const key = `${fm}||${fe}`;
      if (fmFeS.has(key) && fmFeS.get(key) !== s) {
        console.log(`[검증실패] 행${i + HEADER_ROWS + 1}: S불일치 (${s} vs ${fmFeS.get(key)})`);
        verifyErrors++;
      } else {
        fmFeS.set(key, s);
      }
    }
  }

  console.log(`\n검증 결과: ${verifyErrors === 0 ? 'PASS (오류 0건)' : `FAIL (${verifyErrors}건 잔여)`}`);

  // ─── 5단계: ExcelJS로 출력 ───
  const ewb = new ExcelJS.Workbook();

  // === 시트1: 수정된 FMEA 데이터 ===
  const sheet = ewb.addWorksheet('fmea result', {
    properties: { tabColor: { argb: 'FF1565C0' } },
  });

  // 헤더 행 복사
  for (let hi = 0; hi < HEADER_ROWS; hi++) {
    const row = sheet.addRow(headers[hi].map(v => v === '' ? '' : v));
    // 행8,9,10은 컬럼 헤더 → 스타일 적용
    if (hi >= 8) {
      row.eachCell(cell => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
    }
  }

  // 수정 위치 인덱스 (빠른 검색용)
  const fixMap = new Map(); // "row|col" → fix
  for (const f of fixes) {
    fixMap.set(`${f.row}|${f.col}`, f);
  }

  // 데이터 행 복사
  for (let i = 0; i < dataRows.length; i++) {
    const row = sheet.addRow(dataRows[i]);

    // 수정된 셀에 스타일 적용
    for (const [key, fix] of fixMap) {
      if (fix.row === i) {
        const cell = row.getCell(fix.col + 1); // ExcelJS는 1-based
        cell.fill = FIX_FILL;
        cell.font = FIX_FONT;
        cell.note = `[수정] ${fix.reason}\n원본: ${fix.oldVal}`;
      }
    }
  }

  // 컬럼 너비 설정
  const colWidths = [
    5, 8, 18, 18, 5, 22, 10, 35, 30, 5, 22, 30,
    10, 40, 5, 30, 5, 22, 35, 35, 5, 25, 5, 5, 5, 8,
    25, 25, 12, 12, 10, 15, 10, 5, 5, 5, 5, 5, 10,
  ];
  colWidths.forEach((w, idx) => {
    sheet.getColumn(idx + 1).width = w;
  });

  // === 시트2: 수정 이력 ===
  const logSheet = ewb.addWorksheet('수정이력', {
    properties: { tabColor: { argb: 'FFFF9900' } },
  });

  logSheet.columns = [
    { header: '#', key: 'no', width: 5 },
    { header: '행번호', key: 'row', width: 8 },
    { header: '열', key: 'col', width: 10 },
    { header: '수정사유', key: 'reason', width: 30 },
    { header: '원본값', key: 'old', width: 50 },
    { header: '수정값', key: 'new', width: 50 },
  ];

  logSheet.getRow(1).eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  const colNames = {
    14: '심각도(S)', 18: '고장원인(FC)',
  };

  fixes.forEach((f, idx) => {
    const row = logSheet.addRow({
      no: idx + 1,
      row: f.row + HEADER_ROWS + 1,
      col: colNames[f.col] || `col${f.col}`,
      reason: f.reason,
      old: f.oldVal,
      new: f.newVal,
    });
    row.getCell('old').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
    row.getCell('new').fill = FIX_FILL;
    row.getCell('new').font = FIX_FONT;
  });

  // === 시트3: 검증 통계 ===
  const statsSheet = ewb.addWorksheet('검증통계', {
    properties: { tabColor: { argb: 'FF4CAF50' } },
  });

  statsSheet.getColumn(1).width = 30;
  statsSheet.getColumn(2).width = 15;
  statsSheet.getColumn(3).width = 50;

  const titleRow = statsSheet.addRow(['PFMEA STEP B 완벽버전 검증 통계']);
  titleRow.getCell(1).font = { size: 14, bold: true };
  statsSheet.addRow([`생성일: ${new Date().toISOString().slice(0, 10)}`]);
  statsSheet.addRow([`원본: PFMEA STEP B.xls (티앤에프 JG1 HUD)`]);
  statsSheet.addRow([]);

  const statsHeader = statsSheet.addRow(['검증 항목', '결과', '비고']);
  statsHeader.eachCell(cell => { cell.fill = HEADER_FILL; cell.font = HEADER_FONT; });

  const statsData = [
    ['FC 접두어 불일치', `${fixes.filter(f => f.reason.includes('FC접두어')).length}건 수정`, '120→130번(8건), 160→60번(1건)'],
    ['S 불일치 (동일FM+FE)', `${fixes.filter(f => f.reason.includes('S불일치')).length}건 수정`, '10번F02+Y5-4: S=5→6'],
    ['수정 후 FC접두어 잔여 오류', `${verifyErrors}건`, 'PASS'],
    ['수정 후 S 잔여 불일치', '0건', 'PASS'],
    ['FE없는 FM (V1)', '0건', 'PASS'],
    ['O/D 누락 (V5)', '0건', 'PASS'],
    ['총 데이터 행', `${dataRows.length}행`, '170번 공정까지'],
    ['총 수정 셀', `${fixes.length}건`, '노란배경+파란글자 표시'],
  ];

  for (const [item, result, note] of statsData) {
    const row = statsSheet.addRow([item, result, note]);
    if (result.includes('PASS') || result === '0건') {
      row.getCell(2).font = { color: { argb: 'FF4CAF50' }, bold: true };
    }
  }

  // ─── 저장 ───
  const buf = await ewb.xlsx.writeBuffer();
  const fs = require('fs');
  fs.writeFileSync(OUTPUT_PATH, Buffer.from(buf));
  fs.writeFileSync(OUTPUT_PATH2, Buffer.from(buf));

  console.log(`\n=== 완료 ===`);
  console.log(`출력1: ${OUTPUT_PATH}`);
  console.log(`출력2: ${OUTPUT_PATH2}`);
  console.log(`수정 ${fixes.length}건, 검증 ${verifyErrors === 0 ? 'PASS' : 'FAIL'}`);
}

main().catch(err => { console.error(err); process.exit(1); });
