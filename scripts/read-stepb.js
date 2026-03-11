const XLSX = require('xlsx');
const wb = XLSX.readFile('docs/PFMEA_STEP_B_티앤에프.xls');
const ws = wb.Sheets['fmea result'];

function getVal(r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  return cell ? String(cell.v).trim() : '';
}

// 컬럼 매핑 (Row 10 헤더)
// C3=완제품공정명, C4=NO+공정명, C5=4M(구조), C6=작업요소(구조)
// C7=구분(기능), C8=완제품기능, C9=공정기능/제품특성
// C10=4M(기능), C11=작업요소(기능), C12=작업요소기능/공정특성
// C13=구분(고장), C14=FE, C15=S, C16=FM
// C17=4M(고장), C18=작업요소(고장), C19=FC
// C20=PC, C21=O, C22=DC, C23=D, C24=AP, C25=특별특성

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║   STEP B 고장사슬 오류 분석 리포트                            ║');
console.log('║   파일: PFMEA STEP B.xls (티앤에프 JG1 HUD)                  ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ═══ Forward Fill 실행 ═══
const rows = [];
const FF = { processNo: '', fe: '', fm: '', scope: '', m4struct: '', we: '' };

for (let r = 11; r <= 609; r++) {
  const raw = {
    row: r,
    processNo: getVal(r, 4),   // NO+공정명
    m4struct: getVal(r, 5),    // 4M(구조)
    we: getVal(r, 6),          // 작업요소(구조)
    scope: getVal(r, 13),      // 구분(고장) — Your Plant / Ship to Plant / User
    fe: getVal(r, 14),         // FE
    s: getVal(r, 15),          // S
    fm: getVal(r, 16),         // FM
    m4fail: getVal(r, 17),     // 4M(고장)
    weFail: getVal(r, 18),     // 작업요소(고장)
    fc: getVal(r, 19),         // FC
    pc: getVal(r, 20),         // PC
    o: getVal(r, 21),          // O
    dc: getVal(r, 22),         // DC
    d: getVal(r, 23),          // D
    ap: getVal(r, 24),         // AP
    specialChar: getVal(r, 25) // 특별특성
  };

  // Forward Fill
  if (raw.processNo) FF.processNo = raw.processNo; else raw.processNo = FF.processNo;
  if (raw.fe) FF.fe = raw.fe; else raw.fe = FF.fe;
  if (raw.fm) FF.fm = raw.fm; else raw.fm = FF.fm;
  if (raw.scope) FF.scope = raw.scope; else raw.scope = FF.scope;
  if (raw.m4struct) FF.m4struct = raw.m4struct; else raw.m4struct = FF.m4struct;
  if (raw.we) FF.we = raw.we; else raw.we = FF.we;

  // 원본값 보존 (Forward Fill 전)
  raw._origFE = getVal(r, 14);
  raw._origFM = getVal(r, 16);
  raw._origProcessNo = getVal(r, 4);
  raw._origScope = getVal(r, 13);

  rows.push(raw);
}

// ═══════════════════════════════════════════════════
// 오류 1: S(심각도) 누락 — FC가 있는데 S가 없는 행
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [1] S(심각도) 누락 — FC 있는데 S 없음');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
let sMissCount = 0;
for (const r of rows) {
  if (r.fc && !r.s) {
    sMissCount++;
    if (sMissCount <= 30) {
      console.log('  Row ' + r.row + ' | ' + r.processNo.substring(0, 12) + ' | FC=' + r.fc.substring(0, 30) + ' | S=(빈)');
    }
  }
}
console.log('  → 총 ' + sMissCount + '건\n');

// ═══════════════════════════════════════════════════
// 오류 2: O(발생도) 누락
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [2] O(발생도) 누락 — FC 있는데 O 없음');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
let oMissCount = 0;
for (const r of rows) {
  if (r.fc && !r.o) {
    oMissCount++;
    if (oMissCount <= 10) {
      console.log('  Row ' + r.row + ' | ' + r.processNo.substring(0, 12) + ' | FC=' + r.fc.substring(0, 30) + ' | O=(빈)');
    }
  }
}
console.log('  → 총 ' + oMissCount + '건\n');

// ═══════════════════════════════════════════════════
// 오류 3: FC 없는 행 (빈행) — Forward Fill 비대상
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [3] FC(B4) 없는 행 — chain 미생성 (스킵)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
let fcEmptyCount = 0;
for (const r of rows) {
  if (!r.fc) {
    fcEmptyCount++;
    const hasFE = r._origFE ? 'FE=' + r._origFE.substring(0, 25) : '';
    const hasFM = r._origFM ? 'FM=' + r._origFM.substring(0, 25) : '';
    const hasScope = r._origScope ? 'scope=' + r._origScope : '';
    const info = [hasFE, hasFM, hasScope].filter(x => x).join(' | ');
    console.log('  Row ' + r.row + ' | ' + r.processNo.substring(0, 12) + ' | FC=(빈) | ' + (info || '전체 빈행'));
  }
}
console.log('  → 총 ' + fcEmptyCount + '건\n');

// ═══════════════════════════════════════════════════
// 오류 4: 같은 FM 그룹 내 FE 변화 상세 (scope별)
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [4] FM 그룹 내 FE 다중값 (scope별 FE 변화)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
let lastFMraw = '';
let fmGroupRows = [];
let multiFeGroups = 0;

function analyzeGroup(fmName, groupRows) {
  const uniqueFEs = [];
  const seen = new Set();
  for (const r of groupRows) {
    if (r._origFE && !seen.has(r._origFE)) {
      seen.add(r._origFE);
      uniqueFEs.push({ fe: r._origFE, scope: r._origScope, row: r.row, s: r.s });
    }
  }
  if (uniqueFEs.length >= 2) {
    multiFeGroups++;
    console.log('  FM: ' + fmName.substring(0, 45));
    for (const item of uniqueFEs) {
      const prefix = item.fe.substring(0, 2);
      const scopeLabel = prefix === 'Y1' || prefix === 'Y2' || prefix === 'Y3' || prefix === 'Y4' || prefix === 'Y5' || prefix === 'Y6'
        ? '자사' : prefix === 'C2' || prefix === 'C3' || prefix === 'C4' ? '고객' : prefix === 'U5' || prefix === 'U6' ? '사용자' : '?';
      console.log('    Row ' + item.row + ': [' + scopeLabel + '] S=' + (item.s || '?') + ' | ' + item.fe.substring(0, 60));
    }
    // FC 개수
    const fcCount = groupRows.filter(r => r.fc).length;
    console.log('    → FC ' + fcCount + '개, Forward Fill 시 마지막 FE가 나머지에 전파');
    console.log('');
  }
}

for (const r of rows) {
  const origFM = getVal(r.row, 16);
  if (origFM) {
    if (fmGroupRows.length > 0) {
      analyzeGroup(lastFMraw, fmGroupRows);
    }
    lastFMraw = origFM;
    fmGroupRows = [r];
  } else {
    fmGroupRows.push(r);
  }
}
// 마지막 그룹
if (fmGroupRows.length > 0) {
  analyzeGroup(lastFMraw, fmGroupRows);
}
console.log('  → FM 그룹 내 FE 다중값: ' + multiFeGroups + '건\n');

// ═══════════════════════════════════════════════════
// 오류 5: 동일 FC 텍스트 중복 (같은 공정 내)
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [5] 동일 FC 텍스트 중복 (같은 공정)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const fcByProcess = {};
for (const r of rows) {
  if (!r.fc) continue;
  const pn = r.processNo.split('-')[0] || r.processNo;
  if (!fcByProcess[pn]) fcByProcess[pn] = {};
  if (!fcByProcess[pn][r.fc]) fcByProcess[pn][r.fc] = [];
  fcByProcess[pn][r.fc].push(r.row);
}
let dupFcCount = 0;
for (const pn of Object.keys(fcByProcess)) {
  for (const fc of Object.keys(fcByProcess[pn])) {
    const rowList = fcByProcess[pn][fc];
    if (rowList.length > 1) {
      dupFcCount++;
      if (dupFcCount <= 20) {
        console.log('  공정' + pn + ' | FC="' + fc.substring(0, 40) + '" → ' + rowList.length + '회 (Row ' + rowList.join(',') + ')');
      }
    }
  }
}
console.log('  → 총 ' + dupFcCount + '건\n');

// ═══════════════════════════════════════════════════
// 오류 6: Forward Fill 후 FE가 이전 공정 것인 경우 (공정 경계 오류)
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [6] 공정 경계에서 FE/FM 전파 체크');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
let lastPN = '';
let boundaryIssues = 0;
for (const r of rows) {
  if (r._origProcessNo && r._origProcessNo !== lastPN) {
    // 새 공정 시작
    if (!r._origFE) {
      boundaryIssues++;
      console.log('  ⚠ Row ' + r.row + ': 공정 "' + r._origProcessNo.substring(0, 15) + '" 시작인데 FE 원본 없음 → FF=' + r.fe.substring(0, 30));
    }
    if (!getVal(r.row, 16)) {
      console.log('  ⚠ Row ' + r.row + ': 공정 "' + r._origProcessNo.substring(0, 15) + '" 시작인데 FM 원본 없음 → FF=' + r.fm.substring(0, 30));
    }
    lastPN = r._origProcessNo;
  }
}
console.log('  → 공정 경계 FE 누락: ' + boundaryIssues + '건\n');

// ═══════════════════════════════════════════════════
// 오류 7: AP 값 검증 (SOD 모두 있는데 AP 없음 또는 불일치)
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [7] AP 값 이상');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
let apIssueCount = 0;
for (const r of rows) {
  if (!r.fc) continue;
  if (r.s && r.o && r.d && !r.ap) {
    apIssueCount++;
    if (apIssueCount <= 10) {
      console.log('  Row ' + r.row + ': S=' + r.s + ' O=' + r.o + ' D=' + r.d + ' AP=(빈) ← SOD 있는데 AP 없음');
    }
  }
}
console.log('  → SOD 있는데 AP 없음: ' + apIssueCount + '건\n');

// ═══════════════════════════════════════════════════
// 통계 요약
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [요약] 전체 통계');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const chainCount = rows.filter(r => r.fc).length;
console.log('  chain 생성 예정: ' + chainCount + '개 (FC 유효 행)');
console.log('  S 누락: ' + sMissCount + '건 (' + (sMissCount * 100 / chainCount).toFixed(1) + '%)');
console.log('  O 누락: ' + oMissCount + '건');
console.log('  FC 빈행(스킵): ' + fcEmptyCount + '건');
console.log('  FM내 FE 다중값: ' + multiFeGroups + '건');
console.log('  동일 FC 중복: ' + dupFcCount + '건');
console.log('  공정경계 FE 누락: ' + boundaryIssues + '건');
console.log('  AP 누락: ' + apIssueCount + '건');
