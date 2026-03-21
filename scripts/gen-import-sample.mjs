/**
 * m066 DB에서 완벽한 Import 엑셀 샘플 생성
 * Usage: node scripts/gen-import-sample.mjs
 *
 * 소스: data/master-fmea/pfm26-m066.json (마스터 JSON)
 * 출력: data/m066_완벽_Import_Sample.xlsx
 */
import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const d = JSON.parse(readFileSync('data/master-fmea/pfm26-m066.json', 'utf8'));
const db = d.atomicDB;
const chains = d.chains;
const wb = XLSX.utils.book_new();

// === 공통 맵 구성 ===
const l2Map = new Map(db.l2Structures.map(x => [x.id, x]));

// chains에서 WE→4M 역매핑 (l3Structure.m4Code가 비어있으므로)
const weToM4 = new Map();
for (const ch of chains) {
  if (ch.m4 && ch.workElement && ch.processNo) {
    weToM4.set(`${ch.processNo}|${ch.workElement}`, ch.m4);
  }
}

// chains에서 공정번호+FM별 productChar/specialChar/DC 매핑
const fmPC = new Map(); // processNo|fm → { productChar, specialChar }
const fmDC = new Map(); // processNo|fm → dcValue
for (const ch of chains) {
  const k = `${ch.processNo}|${ch.fmValue}`;
  if (ch.productChar && !fmPC.has(k)) {
    fmPC.set(k, { productChar: ch.productChar, specialChar: ch.specialChar || '' });
  }
  if (ch.dcValue && !fmDC.has(k)) fmDC.set(k, ch.dcValue);
}

// === L1 시트 (C1-C4) ===
const l1H = ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)'];
const l1R = [];
const l1Set = new Set();
for (const ch of chains) {
  const s = ch.feScope || '';
  const fe = ch.feValue || '';
  for (const f of db.l1Functions.filter(x => x.category === s)) {
    const k = `${s}|${f.functionName}|${f.requirement || ''}|${fe}`;
    if (!l1Set.has(k)) {
      l1Set.add(k);
      l1R.push([s, f.functionName, f.requirement || '', fe]);
    }
  }
}
// C1 순서: YP → SP → USER
l1R.sort((a, b) => {
  const order = { YP: 0, SP: 1, USER: 2 };
  return (order[a[0]] ?? 9) - (order[b[0]] ?? 9);
});
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([l1H, ...l1R]), 'L1 통합(C1-C4)');

// === L2 시트 (A1-A6) — FM 기준 26행 ===
const l2H = ['A1.공정번호', 'A2.공정명', 'A3.공정기능', 'A4.제품특성', '특별특성', 'A5.고장형태', 'A6.검출관리'];
const l2R = [];
// chains에서 공정번호+FM별 L2Function 매핑
const fmL2F = new Map(); // processNo|fm → l2Function
for (const ch of chains) {
  const k = `${ch.processNo}|${ch.fmValue}`;
  if (ch.l2Function && !fmL2F.has(k)) fmL2F.set(k, ch.l2Function);
}
// FM 기준으로 행 생성 (1FM = 1행)
const l2Seen = new Set();
for (const fm of db.failureModes) {
  const l2 = l2Map.get(fm.l2StructId);
  if (!l2) continue;
  const pno = l2.no || '';
  const pn = l2.name || '';
  const k = `${pno}|${fm.mode}`;
  if (l2Seen.has(k)) continue;
  l2Seen.add(k);
  const fn = fmL2F.get(k) || '';
  const pc = fmPC.get(k);
  const dc = fmDC.get(k) || '';
  l2R.push([pno, pn, fn, pc?.productChar || '', pc?.specialChar || '', fm.mode, dc]);
}
l2R.sort((a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0));
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([l2H, ...l2R]), 'L2 통합(A1-A6)');

// === L3 시트 (B1-B5) ===
const l3H = ['공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성', '고장원인(B4)', '예방관리(B5)'];
const l3R = [];
const l3S = new Set();
for (const ch of chains) {
  const k = `${ch.processNo}|${ch.m4}|${ch.workElement}|${ch.fcValue}`;
  if (!l3S.has(k) && ch.fcValue) {
    l3S.add(k);
    l3R.push([
      ch.processNo || '', ch.m4 || '', ch.workElement || '',
      ch.l3Function || '', ch.processChar || '', ch.specialChar || '',
      ch.fcValue || '', ch.pcValue || '',
    ]);
  }
}
// FC 없는 WE 보충 (chains에서 — DB L3의 l2StructId가 불완전하므로 chains 기준)
const weWithFC = new Set(l3R.map(r => `${r[0]}|${r[2]}`));
const allWE = new Set();
for (const ch of chains) {
  const k = `${ch.processNo}|${ch.workElement}`;
  if (!weWithFC.has(k) && !allWE.has(k)) {
    allWE.add(k);
    l3R.push([
      ch.processNo || '', ch.m4 || '', ch.workElement || '',
      ch.l3Function || '', '', '', '', '',
    ]);
  }
}
l3R.sort((a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0));
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([l3H, ...l3R]), 'L3 통합(B1-B5)');

// === FC 시트 (고장사슬, fill-down 완전) ===
const fcH = [
  'FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)',
  '4M', '작업요소(WE)', 'FC(고장원인)',
  'B5.예방관리(발생 전 방지)', 'A6.검출관리(발생 후 검출)',
  'O', 'D', 'AP',
];
const fcR = [];
for (const ch of chains) {
  const s = ch.severity || 1;
  const o = ch.occurrence || 1;
  const det = ch.detection || 1;
  const rpn = s * o * det;
  const ap = rpn >= 100 ? 'H' : rpn >= 40 ? 'M' : 'L';
  fcR.push([
    ch.feScope || '', ch.feValue || '', ch.processNo || '', ch.fmValue || '',
    ch.m4 || '', ch.workElement || '', ch.fcValue || '',
    ch.pcValue || '', ch.dcValue || '',
    o, det, ap,
  ]);
}
fcR.sort((a, b) => (parseInt(a[2]) || 0) - (parseInt(b[2]) || 0));
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([fcH, ...fcR]), 'FC 고장사슬');

// === 저장 + 결과 출력 ===
const outPath = 'data/m066_완벽_Import_Sample.xlsx';
XLSX.writeFile(wb, outPath);

console.log(`✅ Saved: ${outPath}`);
console.log(`   L1: ${l1R.length}행, L2: ${l2R.length}행, L3: ${l3R.length}행, FC: ${fcR.length}행`);
console.log(`   기대: L1=133, L2=26, L3=104, FC=111`);

// 검증
const l2ok = l2R.length === 26 ? '✅' : '❌';
const fcOk = fcR.length === 111 ? '✅' : '❌';
const dcNull = fcR.filter(r => !r[8]).length;
const pcNull = fcR.filter(r => !r[7]).length;
console.log(`   ${l2ok} L2=${l2R.length}/26, ${fcOk} FC=${fcR.length}/111`);
console.log(`   DC NULL: ${dcNull}, PC NULL: ${pcNull}`);
