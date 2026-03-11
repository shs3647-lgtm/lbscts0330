const XLSX = require('xlsx');
const wb = XLSX.readFile('docs/PFMEA_STEP_B_티앤에프.xls');
const ws = wb.Sheets['fmea result'];

function getVal(r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  return cell ? String(cell.v).trim() : '';
}

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║   STEP B 고장사슬 연결 오류 분석                                   ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// Forward Fill 실행 + chain 생성
const chains = [];
const FF = { processNo: '', fe: '', fm: '', scope: '', m4struct: '', we: '',
             m4fail: '', weFail: '' };

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
    _origFE: getVal(r, 14),
    _origFM: getVal(r, 16),
    _origScope: getVal(r, 13),
    _origPN: getVal(r, 4),
    _origM4s: getVal(r, 5),
    _origWE: getVal(r, 6),
    _origM4f: getVal(r, 17),
    _origWEf: getVal(r, 18),
  };

  if (raw.processNo) FF.processNo = raw.processNo; else raw.processNo = FF.processNo;
  if (raw.fe) FF.fe = raw.fe; else raw.fe = FF.fe;
  if (raw.fm) FF.fm = raw.fm; else raw.fm = FF.fm;
  if (raw.scope) FF.scope = raw.scope; else raw.scope = FF.scope;
  if (raw.m4struct) FF.m4struct = raw.m4struct; else raw.m4struct = FF.m4struct;
  if (raw.we) FF.we = raw.we; else raw.we = FF.we;
  if (raw.m4fail) FF.m4fail = raw.m4fail; else raw.m4fail = FF.m4fail;
  if (raw.weFail) FF.weFail = raw.weFail; else raw.weFail = FF.weFail;

  if (raw.fc) {
    chains.push({
      ...raw,
      m4struct: raw.m4struct || FF.m4struct,
      we: raw.we || FF.we,
      m4fail: raw.m4fail || FF.m4fail,
      weFail: raw.weFail || FF.weFail,
    });
  }
}

console.log('총 chain: ' + chains.length + '개\n');

// ═══════════════════════════════════════════════════
// 오류 8: 같은 FC가 여러 FM에 연결된 경우 (같은 공정)
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [8] 같은 FC가 다른 FM에 연결 (같은 공정 내)');
console.log('      → 사람 실수: 같은 원인인데 다른 고장형태에 넣음?');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const fcToFMs = {};
for (const c of chains) {
  const pn = c.processNo.split('-')[0];
  const key = pn + '|' + c.fc;
  if (!fcToFMs[key]) fcToFMs[key] = new Set();
  fcToFMs[key].add(c.fm);
}
let err8 = 0;
for (const [key, fms] of Object.entries(fcToFMs)) {
  if (fms.size > 1) {
    err8++;
    const [pn, fc] = key.split('|');
    console.log('  공정' + pn + ' | FC="' + fc.substring(0, 40) + '"');
    for (const fm of fms) {
      console.log('    → FM="' + fm.substring(0, 50) + '"');
    }
  }
}
console.log('  → 총 ' + err8 + '건\n');

// ═══════════════════════════════════════════════════
// 오류 9: 같은 FM이 다른 FE에 연결된 경우 (Forward Fill 결과)
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [9] 같은 FM이 다른 FE에 연결 (Forward Fill 후)');
console.log('      → P-FMEA 3열 구조(자사/고객/사용자)에 의한 정상 패턴 vs 실수');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const fmToFEs = {};
for (const c of chains) {
  const pn = c.processNo.split('-')[0];
  const key = pn + '|' + c.fm;
  if (!fmToFEs[key]) fmToFEs[key] = {};
  if (!fmToFEs[key][c.fe]) fmToFEs[key][c.fe] = [];
  fmToFEs[key][c.fe].push(c.row);
}
let err9 = 0;
for (const [key, feMap] of Object.entries(fmToFEs)) {
  const feCount = Object.keys(feMap).length;
  if (feCount > 1) {
    err9++;
    const [pn, fm] = key.split('|');
    const totalChains = Object.values(feMap).flat().length;
    if (err9 <= 15) {
      console.log('  공정' + pn + ' | FM="' + fm.substring(0, 40) + '" → FE ' + feCount + '개, chain ' + totalChains + '개');
      for (const [fe, rows] of Object.entries(feMap)) {
        const prefix = fe.substring(0, 2);
        const label = prefix === 'Y1' || prefix === 'Y2' || prefix === 'Y3' || prefix === 'Y4' || prefix === 'Y5' || prefix === 'Y6'
          ? '[자사]' : prefix === 'C2' || prefix === 'C3' || prefix === 'C4' ? '[고객]' : prefix === 'U5' || prefix === 'U6' ? '[사용자]' : '[?]';
        console.log('    ' + label + ' FE="' + fe.substring(0, 55) + '" (Row ' + rows.slice(0, 5).join(',') + (rows.length > 5 ? '...' : '') + ')');
      }
    }
  }
}
console.log('  → 총 ' + err9 + '건\n');

// ═══════════════════════════════════════════════════
// 오류 10: S 값이 같은 FM 그룹 내에서 불일치
// (같은 FM+같은 FE인데 S가 다른 경우)
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [10] 같은 FM+FE인데 S(심각도)가 다름');
console.log('       → S는 FE가 같으면 동일해야 함 (FE=영향 → S=심각도)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const fmFeToS = {};
for (const c of chains) {
  if (!c.s) continue;
  const key = c.fm + '|' + c.fe;
  if (!fmFeToS[key]) fmFeToS[key] = new Set();
  fmFeToS[key].add(c.s);
}
let err10 = 0;
for (const [key, sSet] of Object.entries(fmFeToS)) {
  if (sSet.size > 1) {
    err10++;
    const [fm, fe] = key.split('|');
    if (err10 <= 15) {
      console.log('  FM="' + fm.substring(0, 35) + '" + FE="' + fe.substring(0, 35) + '"');
      console.log('    → S값: ' + Array.from(sSet).join(', '));
    }
  }
}
console.log('  → 총 ' + err10 + '건\n');

// ═══════════════════════════════════════════════════
// 오류 11: 구조분석 4M과 고장분석 4M 불일치
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [11] 구조분석 4M(C5) ≠ 고장분석 4M(C17) 불일치');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
let err11 = 0;
for (const c of chains) {
  if (c.m4struct && c.m4fail && c.m4struct !== c.m4fail) {
    err11++;
    if (err11 <= 15) {
      console.log('  Row ' + c.row + ' | ' + c.processNo.substring(0, 12) + ' | 구조4M=' + c.m4struct + ' ≠ 고장4M=' + c.m4fail);
      console.log('    FC="' + c.fc.substring(0, 45) + '"');
    }
  }
}
console.log('  → 총 ' + err11 + '건\n');

// ═══════════════════════════════════════════════════
// 오류 12: 구조분석 작업요소(C6) ≠ 고장분석 작업요소(C18) 불일치
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [12] 구조 작업요소(C6) ≠ 고장 작업요소(C18) 불일치');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
let err12 = 0;
for (const c of chains) {
  if (c.we && c.weFail && c.we !== c.weFail) {
    err12++;
    if (err12 <= 10) {
      console.log('  Row ' + c.row + ' | ' + c.processNo.substring(0, 12));
      console.log('    구조=' + c.we.substring(0, 30) + ' ≠ 고장=' + c.weFail.substring(0, 30));
    }
  }
}
console.log('  → 총 ' + err12 + '건\n');

// ═══════════════════════════════════════════════════
// 오류 13: FC에 공정번호 접두어가 다른 공정것인 경우
// (예: 공정10번인데 FC가 "20번-..."으로 시작)
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [13] FC 공정번호 접두어 ≠ 소속 공정번호');
console.log('       → 다른 공정의 FC를 잘못 넣은 실수');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
let err13 = 0;
for (const c of chains) {
  const pnPrefix = c.processNo.split('번')[0];
  const fcMatch = c.fc.match(/^(\d+)번/);
  if (fcMatch && fcMatch[1] !== pnPrefix) {
    err13++;
    if (err13 <= 15) {
      console.log('  Row ' + c.row + ' | 공정=' + c.processNo.substring(0, 12) + ' | FC="' + c.fc.substring(0, 45) + '"');
      console.log('    → 공정 ' + pnPrefix + '번인데 FC가 ' + fcMatch[1] + '번으로 시작');
    }
  }
}
console.log('  → 총 ' + err13 + '건\n');

// ═══════════════════════════════════════════════════
// 오류 14: FM에 공정번호 접두어가 다른 공정것인 경우
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [14] FM 공정번호 접두어 ≠ 소속 공정번호');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
let err14 = 0;
for (const c of chains) {
  const pnPrefix = c.processNo.split('번')[0];
  const fmMatch = c.fm.match(/^(\d+)번/);
  if (fmMatch && fmMatch[1] !== pnPrefix) {
    err14++;
    if (err14 <= 10) {
      console.log('  Row ' + c.row + ' | 공정=' + c.processNo.substring(0, 12) + ' | FM="' + c.fm.substring(0, 45) + '"');
    }
  }
}
console.log('  → 총 ' + err14 + '건\n');

// ═══════════════════════════════════════════════════
// 오류 15: FE scope(Y/C/U)별 S 범위 이상
// Y(자사): S는 보통 3~6, C(고객): S는 보통 3~8, U(사용자): S는 보통 5~10
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [15] FE scope와 S(심각도) 범위 체크');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const scopeS = { Y: [], C: [], U: [] };
for (const c of chains) {
  if (!c.s) continue;
  const prefix = c.fe.charAt(0);
  if (scopeS[prefix]) scopeS[prefix].push(parseInt(c.s));
}
for (const [scope, vals] of Object.entries(scopeS)) {
  if (vals.length === 0) continue;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  const label = scope === 'Y' ? '자사(Your Plant)' : scope === 'C' ? '고객(Ship to Plant)' : '사용자(User)';
  console.log('  ' + label + ': S=' + min + '~' + max + ' (평균 ' + avg + ', ' + vals.length + '건)');
}
console.log('');

// ═══════════════════════════════════════════════════
// 요약
// ═══════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [최종 요약]');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  [8]  같은 FC→다른 FM: ' + err8 + '건');
console.log('  [9]  같은 FM→다른 FE: ' + err9 + '건 (3열 구조 포함)');
console.log('  [10] 같은 FM+FE인데 S 불일치: ' + err10 + '건');
console.log('  [11] 구조4M ≠ 고장4M: ' + err11 + '건');
console.log('  [12] 구조WE ≠ 고장WE: ' + err12 + '건');
console.log('  [13] FC 공정번호 불일치: ' + err13 + '건');
console.log('  [14] FM 공정번호 불일치: ' + err14 + '건');
