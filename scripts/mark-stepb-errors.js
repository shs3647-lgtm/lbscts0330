/**
 * STEP B 오류 표시 스크립트
 * - 원본 티앤에프 STEP B 읽기
 * - 오류 셀에 노란색 배경 + 빨간색 글자 표시
 * - 새 파일로 저장
 */

const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

async function main() {
  // ═══ 1단계: SheetJS로 원본 읽기 (데이터 추출) ═══
  const wb0 = XLSX.readFile('docs/PFMEA_STEP_B_티앤에프.xls');
  const ws0 = wb0.Sheets['fmea result'];

  function getVal(r, c) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws0[addr];
    return cell ? String(cell.v).trim() : '';
  }

  // ═══ 2단계: Forward Fill + 오류 탐지 ═══
  const errors = new Map(); // key = "r,c" → { reason, errorType }

  function markError(r, c, reason, errorType) {
    const key = r + ',' + c;
    if (!errors.has(key)) {
      errors.set(key, { reason, errorType, r, c });
    }
  }

  // Forward Fill 실행
  const rows = [];
  const FF = { processNo: '', fe: '', fm: '', scope: '', m4struct: '', we: '', s: '' };

  for (let r = 11; r <= 609; r++) {
    const raw = {
      row: r,
      processNo: getVal(r, 4),
      m4struct: getVal(r, 5),
      we: getVal(r, 6),
      scope: getVal(r, 13),
      fe: getVal(r, 14),
      s: getVal(r, 15),
      fm: getVal(r, 16),
      m4fail: getVal(r, 17),
      weFail: getVal(r, 18),
      fc: getVal(r, 19),
      pc: getVal(r, 20),
      o: getVal(r, 21),
      dc: getVal(r, 22),
      d: getVal(r, 23),
      ap: getVal(r, 24),
      specialChar: getVal(r, 25),
      _origFE: getVal(r, 14),
      _origFM: getVal(r, 16),
      _origProcessNo: getVal(r, 4),
      _origScope: getVal(r, 13),
      _origS: getVal(r, 15),
    };

    if (raw.processNo) FF.processNo = raw.processNo; else raw.processNo = FF.processNo;
    if (raw.fe) { FF.fe = raw.fe; FF.s = raw.s; } else { raw.fe = FF.fe; raw.s = FF.s || raw.s; }
    if (raw.fm) FF.fm = raw.fm; else raw.fm = FF.fm;
    if (raw.scope) FF.scope = raw.scope; else raw.scope = FF.scope;
    if (raw.m4struct) FF.m4struct = raw.m4struct; else raw.m4struct = FF.m4struct;
    if (raw.we) FF.we = raw.we; else raw.we = FF.we;
    if (raw.s) FF.s = raw.s;

    rows.push(raw);
  }

  // ─── [1] S 누락 (FC 있는데 S 없음) ───
  for (const r of rows) {
    if (r.fc && !r._origS && !r.s) {
      markError(r.row, 15, '[1] S 누락 (FC 있는데 S 없음)', 'S_MISS');
    }
  }

  // ─── [3] FC 빈행 ───
  for (const r of rows) {
    if (!r.fc) {
      markError(r.row, 19, '[3] FC 빈행 (chain 미생성)', 'FC_EMPTY');
    }
  }

  // ─── [5] 동일 FC 텍스트 중복 (같은 공정) ───
  const fcByProcess = {};
  for (const r of rows) {
    if (!r.fc) continue;
    const pn = r.processNo.split('-')[0] || r.processNo;
    if (!fcByProcess[pn]) fcByProcess[pn] = {};
    if (!fcByProcess[pn][r.fc]) fcByProcess[pn][r.fc] = [];
    fcByProcess[pn][r.fc].push(r.row);
  }
  for (const pn of Object.keys(fcByProcess)) {
    for (const fc of Object.keys(fcByProcess[pn])) {
      const rowList = fcByProcess[pn][fc];
      if (rowList.length > 1) {
        for (const row of rowList) {
          markError(row, 19, '[5] 동일 FC 중복 (' + rowList.length + '회)', 'FC_DUP');
        }
      }
    }
  }

  // ─── [8] 같은 FC → 다른 FM ───
  const fcToFMs = {};
  for (const r of rows) {
    if (!r.fc) continue;
    const pn = r.processNo.split('-')[0] || r.processNo;
    const key = pn + '|||' + r.fc;
    if (!fcToFMs[key]) fcToFMs[key] = { fms: new Set(), rows: [] };
    fcToFMs[key].fms.add(r.fm);
    fcToFMs[key].rows.push(r.row);
  }
  for (const key of Object.keys(fcToFMs)) {
    if (fcToFMs[key].fms.size > 1) {
      for (const row of fcToFMs[key].rows) {
        markError(row, 19, '[8] 같은FC→' + fcToFMs[key].fms.size + '개FM', 'FC_MULTI_FM');
      }
    }
  }

  // ─── [11] 구조4M ≠ 고장4M ───
  for (const r of rows) {
    if (!r.fc) continue;
    if (r.m4struct && r.m4fail && r.m4struct !== r.m4fail) {
      markError(r.row, 17, '[11] 구조4M(' + r.m4struct + ')≠고장4M(' + r.m4fail + ')', 'M4_MISMATCH');
      markError(r.row, 5, '[11] 구조4M(' + r.m4struct + ')≠고장4M(' + r.m4fail + ')', 'M4_MISMATCH');
    }
  }

  // ─── [12] 구조WE ≠ 고장WE ───
  for (const r of rows) {
    if (!r.fc) continue;
    if (r.we && r.weFail && r.we !== r.weFail) {
      markError(r.row, 18, '[12] 구조WE≠고장WE', 'WE_MISMATCH');
      markError(r.row, 6, '[12] 구조WE≠고장WE', 'WE_MISMATCH');
    }
  }

  // ─── [13] FC 공정번호 접두어 ≠ 소속 공정번호 ───
  for (const r of rows) {
    if (!r.fc) continue;
    const procNum = r.processNo.match(/^(\d+)번/);
    if (!procNum) continue;
    const fcNum = r.fc.match(/^(\d+)번/);
    if (fcNum && fcNum[1] !== procNum[1]) {
      markError(r.row, 19, '[13] FC접두어(' + fcNum[1] + '번)≠공정(' + procNum[1] + '번)', 'FC_PROC_MISMATCH');
    }
  }

  console.log('오류 셀 총 ' + errors.size + '개 발견');

  // ═══ 3단계: ExcelJS로 원본 복사 + 오류 표시 ═══
  const ejsWb = new ExcelJS.Workbook();
  const ejsWs = ejsWb.addWorksheet('fmea result');

  // 원본 데이터 복사 (모든 셀)
  const range = XLSX.utils.decode_range(ws0['!ref']);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws0[addr];
      if (cell) {
        // ExcelJS는 1-indexed
        const ejsCell = ejsWs.getCell(r + 1, c + 1);
        ejsCell.value = cell.v;
      }
    }
  }

  // 컬럼 너비 설정
  ejsWs.getColumn(4).width = 18;  // C3: 완제품공정명
  ejsWs.getColumn(5).width = 18;  // C4: NO+공정명
  ejsWs.getColumn(6).width = 6;   // C5: 4M
  ejsWs.getColumn(7).width = 24;  // C6: 작업요소
  ejsWs.getColumn(14).width = 16; // C13: 구분
  ejsWs.getColumn(15).width = 50; // C14: FE
  ejsWs.getColumn(16).width = 6;  // C15: S
  ejsWs.getColumn(17).width = 35; // C16: FM
  ejsWs.getColumn(18).width = 6;  // C17: 4M(고장)
  ejsWs.getColumn(19).width = 24; // C18: 작업요소(고장)
  ejsWs.getColumn(20).width = 40; // C19: FC
  ejsWs.getColumn(21).width = 35; // C20: PC
  ejsWs.getColumn(22).width = 6;  // C21: O
  ejsWs.getColumn(23).width = 20; // C22: DC
  ejsWs.getColumn(24).width = 6;  // C23: D
  ejsWs.getColumn(25).width = 5;  // C24: AP
  ejsWs.getColumn(26).width = 5;  // C25: 특별특성

  // 오류 유형별 스타일 정의
  const errorFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFF00' }  // 노란색 배경
  };

  const errorFont = {
    color: { argb: 'FFFF0000' },  // 빨간색 글자
    bold: true
  };

  // 오류 셀에 스타일 적용
  let markedCount = 0;
  for (const [key, info] of errors) {
    const ejsCell = ejsWs.getCell(info.r + 1, info.c + 1);
    ejsCell.fill = errorFill;
    ejsCell.font = errorFont;

    // 코멘트로 오류 이유 추가
    ejsCell.note = info.reason;
    markedCount++;
  }

  // 헤더 행 스타일 (Row 11 = r=10 → ExcelJS row 11)
  for (let c = 1; c <= 36; c++) {
    const headerCell = ejsWs.getCell(11, c);
    if (headerCell.value) {
      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }  // 파란색 배경
      };
      headerCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    }
  }

  // 범례 추가 (Row 1~5)
  ejsWs.getCell('A1').value = '★ STEP B 오류 분석 결과 ★';
  ejsWs.getCell('A1').font = { size: 14, bold: true };
  ejsWs.getCell('A2').value = '노란색 배경 + 빨간색 글자 = 오류 셀 (셀 메모에 오류 사유)';
  ejsWs.getCell('A2').fill = errorFill;
  ejsWs.getCell('A2').font = errorFont;
  ejsWs.getCell('A3').value = '[1]S누락 [3]FC빈행 [5]FC중복 [8]FC→다중FM [11]4M불일치 [12]WE불일치 [13]FC공정불일치';
  ejsWs.getCell('A4').value = '총 오류 셀: ' + markedCount + '개';
  ejsWs.getCell('A5').value = '원본 파일: PFMEA STEP B.xls (티앤에프 JG1 HUD)';

  // 오류 유형별 통계
  const typeCounts = {};
  for (const [key, info] of errors) {
    typeCounts[info.errorType] = (typeCounts[info.errorType] || 0) + 1;
  }

  let statsRow = 6;
  ejsWs.getCell('A' + statsRow).value = '── 오류 유형별 통계 ──';
  ejsWs.getCell('A' + statsRow).font = { bold: true };
  statsRow++;
  const typeLabels = {
    'S_MISS': '[1] S 누락',
    'FC_EMPTY': '[3] FC 빈행',
    'FC_DUP': '[5] FC 중복',
    'FC_MULTI_FM': '[8] 같은FC→다중FM',
    'M4_MISMATCH': '[11] 4M 불일치',
    'WE_MISMATCH': '[12] WE 불일치',
    'FC_PROC_MISMATCH': '[13] FC공정 불일치'
  };
  for (const [type, count] of Object.entries(typeCounts)) {
    ejsWs.getCell('A' + statsRow).value = (typeLabels[type] || type) + ': ' + count + '셀';
    statsRow++;
  }

  // 파일 저장
  const outPath = 'docs/PFMEA_STEP_B_티앤에프_오류표시.xlsx';
  await ejsWb.xlsx.writeFile(outPath);

  console.log('═══════════════════════════════════════════');
  console.log(' 오류 표시 엑셀 생성 완료!');
  console.log('═══════════════════════════════════════════');
  console.log(' 파일: ' + outPath);
  console.log(' 표시된 오류 셀: ' + markedCount + '개');
  console.log('');
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log('  ' + (typeLabels[type] || type) + ': ' + count + '셀');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
