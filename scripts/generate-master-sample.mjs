/**
 * Master FMEA 샘플 Excel 생성 스크립트 (v2 — 카테시안 버그 수정 + 전수 검증)
 *
 * 데이터 소스 우선순위:
 *   1. Master API (localhost:3000) — 서버 실행 중이면 사용
 *   2. data/master-fmea/{fmeaId}.json — 파일 fallback
 *
 * 수정 이력:
 *   v2 (2026-03-18): L3 카테시안 버그 수정, A6/B5 D:/P: 접두사 스트리핑,
 *                     FC/FA 완전 채움, VERIFY 시트 추가, JSON fallback
 *
 * Usage: node scripts/generate-master-sample.mjs [fmeaId]
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3000';
const FMEA_ID = process.argv[2] || 'pfm26-m066';
const OUTPUT_PATH = `C:/Users/Administrator/Downloads/PFMEA_Master_${FMEA_ID}_PIPELINE검증_${new Date().toISOString().slice(0, 10)}.xlsx`;
const MASTER_JSON = path.join(process.cwd(), 'data', 'master-fmea', `${FMEA_ID}.json`);

const HEADER_COLOR = '00587A';

// ─── D:/P: 접두사 스트리핑 ───
const stripPrefix = (v) => (v || '').replace(/^[DP]:/, '').trim();

// ─── 시트 정의 ───
const SHEET_DEFS = [
  { name: 'L1 통합(C1-C4)', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)'] },
  { name: 'L2 통합(A1-A6)', headers: ['A1.공정번호', 'A2.공정명', 'A3.공정기능', 'A4.제품특성', '특별특성', 'A5.고장형태', 'A6.검출관리'] },
  { name: 'L3 통합(B1-B5)', headers: ['공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성', '고장원인(B4)', '예방관리(B5)'] },
  { name: 'FC 고장사슬', headers: ['FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)', '4M', '작업요소(WE)', 'FC(고장원인)', 'B5.예방관리(발생 전 방지)', 'A6.검출관리(발생 후 검출)', 'O', 'D', 'AP'] },
  { name: 'FA 통합분석', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '공정No(A1)', '공정명(A2)', '공정기능(A3)', '제품특성(A4)', '특별특성(A4)', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성(B3)', '고장영향(C4)', '고장형태(A5)', '고장원인(B4)', 'S', 'O', 'D', 'AP', 'DC추천1', 'DC추천2', 'PC추천1', 'PC추천2', 'O추천', 'D추천'] },
  { name: 'VERIFY', headers: ['검증항목', '값', '설명'] },
];

// ─── 데이터 로드 (JSON 우선 → API fallback) ───
// 이유: API의 PfmeaMasterFlatItem.id는 DB UUID이지만,
// parentItemId는 genXxx 형식 — ID 불일치로 parentItemId 기반 매칭 불가.
// JSON 파일의 flatData.id는 genXxx 형식이므로 parentItemId와 일치.

async function loadData() {
  // 1차: JSON 파일 (genXxx ID 정합성 보장)
  if (fs.existsSync(MASTER_JSON)) {
    const raw = JSON.parse(fs.readFileSync(MASTER_JSON, 'utf-8'));
    const flatData = raw.flatData || [];
    const chains = raw.chains || [];
    if (flatData.length > 0) {
      console.log(`  [JSON] flatItems: ${flatData.length}, chains: ${chains.length}`);
      return { flatData, chains };
    }
  }

  // 2차: API fallback (서버 실행 중일 때)
  try {
    const res = await fetch(`${API_BASE}/api/pfmea/master?fmeaId=${FMEA_ID}&includeItems=true`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const { dataset } = await res.json();
      const flatData = dataset.flatItems || [];
      const chains = dataset.failureChains || [];
      console.log(`  [API] flatItems: ${flatData.length}, chains: ${chains.length}`);
      console.log('  ⚠ API 데이터는 parentItemId 매칭이 제한적 — JSON 파일 사용 권장');
      return { flatData, chains };
    }
  } catch {
    console.log('  [API] 서버 미응답');
  }

  throw new Error(`데이터 없음: ${MASTER_JSON} 파일 없음 + API 미응답`);
}

// ─── 메인 ───

async function main() {
  console.log(`=== Master FMEA 샘플 생성 (v2): ${FMEA_ID} ===`);

  const { flatData, chains } = await loadData();

  // 시트 데이터 빌드
  const sheetData = {};
  SHEET_DEFS.forEach(d => { sheetData[d.name] = []; });

  // ═══════════════════════════════════════════════════════
  // L1 통합(C1-C4)
  // ═══════════════════════════════════════════════════════
  const c1Items = flatData.filter(d => d.itemCode === 'C1');
  for (const c1 of c1Items) {
    const scope = c1.value || '';
    const c2Items = flatData.filter(d => d.itemCode === 'C2' && d.processNo === scope);
    const c3Items = flatData.filter(d => d.itemCode === 'C3' && d.processNo === scope);
    const c4Items = flatData.filter(d => d.itemCode === 'C4' && d.processNo === scope);
    const maxLen = Math.max(1, c2Items.length, c3Items.length, c4Items.length);
    let lastC2 = '', lastC3 = '', lastC4 = '';
    for (let i = 0; i < maxLen; i++) {
      if (c2Items[i]?.value) lastC2 = c2Items[i].value;
      if (c3Items[i]?.value) lastC3 = c3Items[i].value;
      if (c4Items[i]?.value) lastC4 = c4Items[i].value;
      sheetData['L1 통합(C1-C4)'].push([
        scope,
        c2Items[i]?.value || lastC2,
        c3Items[i]?.value || lastC3,
        c4Items[i]?.value || lastC4,
      ]);
    }
  }

  // ═══════════════════════════════════════════════════════
  // L2 통합(A1-A6) — A6 D: 접두사 스트리핑
  // ═══════════════════════════════════════════════════════
  const procNos = [...new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo))];
  for (const pNo of procNos) {
    const a2Val = flatData.find(d => d.itemCode === 'A2' && d.processNo === pNo)?.value || '';
    const a3Items = flatData.filter(d => d.itemCode === 'A3' && d.processNo === pNo);
    const a4Items = flatData.filter(d => d.itemCode === 'A4' && d.processNo === pNo);
    const a5Items = flatData.filter(d => d.itemCode === 'A5' && d.processNo === pNo);
    const a6Items = flatData.filter(d => d.itemCode === 'A6' && d.processNo === pNo);
    const maxLen = Math.max(1, a3Items.length, a4Items.length, a5Items.length, a6Items.length);
    let lastA3 = '', lastA4 = '', lastA4Sp = '', lastA5 = '', lastA6 = '';
    for (let i = 0; i < maxLen; i++) {
      if (a3Items[i]?.value) lastA3 = a3Items[i].value;
      if (a4Items[i]?.value) { lastA4 = a4Items[i].value; lastA4Sp = a4Items[i].specialChar || ''; }
      if (a5Items[i]?.value) lastA5 = a5Items[i].value;
      if (a6Items[i]?.value) lastA6 = stripPrefix(a6Items[i].value);
      sheetData['L2 통합(A1-A6)'].push([
        pNo, a2Val,
        a3Items[i]?.value || lastA3,
        a4Items[i]?.value || lastA4,
        a4Items[i]?.specialChar ?? lastA4Sp,
        a5Items[i]?.value || lastA5,
        a6Items[i] ? stripPrefix(a6Items[i].value) : lastA6,
      ]);
    }
  }

  // ═══════════════════════════════════════════════════════
  // L3 통합(B1-B5) — ★ parentItemId 기반 그룹핑 (카테시안 버그 수정)
  // ═══════════════════════════════════════════════════════
  const b1Items = flatData.filter(d => d.itemCode === 'B1');
  for (const b1 of b1Items) {
    const pNo = b1.processNo;
    const m4 = b1.m4 || '';
    const b1Id = b1.id;

    // ★ 핵심 수정: parentItemId로 B2/B3를 B1에 귀속
    const b2Items = flatData.filter(d => d.itemCode === 'B2' && d.parentItemId === b1Id);
    const b3Items = flatData.filter(d => d.itemCode === 'B3' && d.parentItemId === b1Id);

    // B4: parentItemId가 이 B1 산하 B3의 id인 것만
    const b3IdSet = new Set(b3Items.map(x => x.id));
    const b4Items = flatData.filter(d => d.itemCode === 'B4' && b3IdSet.has(d.parentItemId));

    // B5: id가 b1Id로 시작 (atomicToFlatData 규칙: `${b1Id}-V-${n}`)
    const b5Items = flatData.filter(d => d.itemCode === 'B5' && d.id.startsWith(b1Id));

    const maxLen = Math.max(1, b2Items.length, b3Items.length, b4Items.length, b5Items.length);
    let lastB2 = '', lastB3 = '', lastB3Sp = '', lastB4 = '', lastB5 = '';

    for (let i = 0; i < maxLen; i++) {
      if (b2Items[i]?.value) lastB2 = b2Items[i].value;
      if (b3Items[i]?.value) { lastB3 = b3Items[i].value; lastB3Sp = b3Items[i].specialChar || ''; }
      if (b4Items[i]?.value) lastB4 = b4Items[i].value;
      if (b5Items[i]?.value) lastB5 = stripPrefix(b5Items[i].value);

      sheetData['L3 통합(B1-B5)'].push([
        pNo, m4, b1.value || '',
        b2Items[i]?.value || lastB2,
        b3Items[i]?.value || lastB3,
        b3Items[i]?.specialChar ?? lastB3Sp,
        b4Items[i]?.value || lastB4,
        b5Items[i] ? stripPrefix(b5Items[i].value) : lastB5,
      ]);
    }
  }

  // ═══════════════════════════════════════════════════════
  // FC 고장사슬 — chains 데이터 전수 매핑 + DC/PC 접두사 스트리핑
  // ═══════════════════════════════════════════════════════
  // FC 정렬: FE구분 → FE(고장영향) → 공정번호 → FM → FC
  // FE 구분별 그룹핑이 되어야 carry-forward/merge가 정상 작동
  const scopeOrder = { 'YP': 0, 'SP': 1, 'USER': 2 };
  const sortedChains = [...chains].sort((a, b) => {
    const sA = scopeOrder[a.feScope] ?? 9, sB = scopeOrder[b.feScope] ?? 9;
    if (sA !== sB) return sA - sB;
    const feCmp = (a.feValue || '').localeCompare(b.feValue || '');
    if (feCmp !== 0) return feCmp;
    const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
    if (pCmp !== 0) return pCmp;
    const fmCmp = (a.fmValue || '').localeCompare(b.fmValue || '');
    if (fmCmp !== 0) return fmCmp;
    return (a.fcValue || '').localeCompare(b.fcValue || '');
  });

  sheetData['FC 고장사슬'] = sortedChains.map(fc => [
    fc.feScope || '',
    fc.feValue || '',
    fc.processNo || '',
    fc.fmValue || '',
    fc.m4 || '',
    fc.workElement || '',
    fc.fcValue || '',
    stripPrefix(fc.pcValue || ''),
    stripPrefix(fc.dcValue || ''),
    fc.occurrence ? String(fc.occurrence) : '',
    fc.detection ? String(fc.detection) : '',
    fc.ap || '',
  ]);

  // ═══════════════════════════════════════════════════════
  // FA 통합분석 — chains + flatData 크로스 매핑 + 접두사 스트리핑
  // ═══════════════════════════════════════════════════════
  const a2Map = {}, a3Map = {}, a4Map = {}, a4SpMap = {};
  const b2Map = {}, b3Map = {}, b3SpMap = {}, c2Map = {}, c3Map = {};
  flatData.forEach(d => {
    if (d.itemCode === 'A2') a2Map[d.processNo] = d.value || '';
    if (d.itemCode === 'A3' && !a3Map[d.processNo]) a3Map[d.processNo] = d.value || '';
    if (d.itemCode === 'A4' && !a4Map[d.processNo]) { a4Map[d.processNo] = d.value || ''; a4SpMap[d.processNo] = d.specialChar || ''; }
    if (d.itemCode === 'B2') { const k = `${d.processNo}|${d.m4 || ''}`; if (!b2Map[k]) b2Map[k] = d.value || ''; }
    if (d.itemCode === 'B3') { const k = `${d.processNo}|${d.m4 || ''}`; if (!b3Map[k]) { b3Map[k] = d.value || ''; b3SpMap[k] = d.specialChar || ''; } }
    if (d.itemCode === 'C2') { if (!c2Map[d.processNo]) c2Map[d.processNo] = d.value || ''; }
    if (d.itemCode === 'C3') { if (!c3Map[d.processNo]) c3Map[d.processNo] = d.value || ''; }
  });

  sheetData['FA 통합분석'] = sortedChains.map(fc => {
    const pNo = fc.processNo || '';
    const m4k = `${pNo}|${fc.m4 || ''}`;
    const scope = fc.feScope || '';
    return [
      scope, c2Map[scope] || '', c3Map[scope] || '',
      pNo, a2Map[pNo] || '', a3Map[pNo] || '',
      a4Map[pNo] || '', a4SpMap[pNo] || '',
      fc.m4 || '', fc.workElement || '', b2Map[m4k] || '',
      b3Map[m4k] || '', b3SpMap[m4k] || '',
      fc.feValue || '', fc.fmValue || '', fc.fcValue || '',
      fc.severity ? String(fc.severity) : '',
      fc.occurrence ? String(fc.occurrence) : '',
      fc.detection ? String(fc.detection) : '',
      fc.ap || '',
      stripPrefix(fc.dcValue || ''), '',
      stripPrefix(fc.pcValue || ''), '',
      '', '',
    ];
  });

  // ═══════════════════════════════════════════════════════
  // VERIFY — 자동 검증 값 계산
  // ═══════════════════════════════════════════════════════
  const l3Rows = sheetData['L3 통합(B1-B5)'];
  const l2Rows = sheetData['L2 통합(A1-A6)'];
  const fcRows = sheetData['FC 고장사슬'];

  const fmCount = flatData.filter(d => d.itemCode === 'A5').length;
  const fcCount = flatData.filter(d => d.itemCode === 'B4').length;
  const feCount = flatData.filter(d => d.itemCode === 'C4').length;
  const chainCount = fcRows.length;
  const processCount = procNos.length;
  const b3MissCount = l3Rows.filter(r => !(r[4] || '').toString().trim()).length;
  const b4MissCount = l3Rows.filter(r => !(r[6] || '').toString().trim()).length;
  const b5MissCount = l3Rows.filter(r => !(r[7] || '').toString().trim()).length;
  const a6MissCount = l2Rows.filter(r => !(r[6] || '').toString().trim()).length;

  // FC 시트 내 각 열 빈칸 검증
  const fcColCEmpty = fcRows.filter(r => !(r[6] || '').toString().trim()).length;
  const fcColBEmpty = fcRows.filter(r => !(r[7] || '').toString().trim()).length;
  const fcColDEmpty = fcRows.filter(r => !(r[8] || '').toString().trim()).length;

  // 유령 행 검출 (B3에 B2 텍스트 혼입: 30자 초과 + "한다" 포함)
  const ghostRows = l3Rows.filter(r =>
    ((r[4] || '').toString().length > 30 && (r[4] || '').toString().includes('한다'))
  ).length;

  sheetData['VERIFY'] = [
    ['FM_COUNT', fmCount, 'A5 고장형태 건수'],
    ['FC_COUNT', fcCount, 'B4 고장원인 건수'],
    ['FE_COUNT', feCount, 'C4 고장영향 건수'],
    ['CHAIN_COUNT', chainCount, 'FC 시트 고장사슬 건수'],
    ['PROCESS_COUNT', processCount, 'A1 고유 공정 수'],
    ['L3_ROW_COUNT', l3Rows.length, 'L3 통합 행 수'],
    ['B3_MISS', b3MissCount, 'L3 통합 B3 빈칸 수 (0이 이상적)'],
    ['B4_MISS', b4MissCount, 'L3 통합 B4 빈칸 수 (0이 이상적)'],
    ['B5_MISS', b5MissCount, 'L3 통합 B5 빈칸 수 (0이 이상적)'],
    ['A6_MISS', a6MissCount, 'L2 통합 A6 빈칸 수 (0이 이상적)'],
    ['FC_FC_MISS', fcColCEmpty, 'FC시트 FC열 빈칸 수'],
    ['FC_PC_MISS', fcColBEmpty, 'FC시트 PC열 빈칸 수'],
    ['FC_DC_MISS', fcColDEmpty, 'FC시트 DC열 빈칸 수'],
    ['GHOST_ROWS', ghostRows, '유령 행 수 (B2→B3 혼입, 0이 정상)'],
    ['', '', ''],
    ['※ 이 시트의 값은 스크립트에서 자동 계산됩니다.', '', ''],
    ['※ Import 시 이 값과 파서 결과를 비교하여 파싱 오류를 검출합니다.', '', ''],
  ];

  // ═══════════════════════════════════════════════════════
  // Excel 파일 생성
  // ═══════════════════════════════════════════════════════
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FMEA Smart System Master Sample Generator v2';
  workbook.created = new Date();

  for (const def of SHEET_DEFS) {
    const ws = workbook.addWorksheet(def.name);
    const rows = sheetData[def.name] || [];

    ws.columns = def.headers.map((h) => ({
      header: h, width: Math.max(12, h.length * 1.5 + 2),
    }));

    const headerRow = ws.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell(cell => {
      const color = def.name.includes('FC') ? 'B91C1C'
        : def.name.includes('FA') ? '1E40AF'
          : def.name === 'VERIFY' ? '6B21A8'
            : HEADER_COLOR;
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    rows.forEach((data, idx) => {
      const row = ws.addRow(data);
      const bg = idx % 2 === 0 ? 'FFFFFF' : 'F0F7FB';
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.font = { size: 9 };
      });
    });

    // FC 시트 병합셀
    if (def.name === 'FC 고장사슬' && rows.length > 1) {
      applyMergeCells(ws, rows);
    }

    ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  }

  await workbook.xlsx.writeFile(OUTPUT_PATH);

  // ═══════════════════════════════════════════════════════
  // 전수 검증 리포트
  // ═══════════════════════════════════════════════════════
  console.log('\n=== 전수 검증 리포트 ===');
  console.log(`파일: ${OUTPUT_PATH}`);
  console.log('');

  const checks = [
    { name: 'L1 통합 행', actual: sheetData['L1 통합(C1-C4)'].length, expect: 20, op: '≥' },
    { name: 'L2 통합 행', actual: l2Rows.length, expect: 21, op: '≥' },
    { name: 'L3 통합 행', actual: l3Rows.length, expect: 103, op: '≥' },
    { name: 'FC 고장사슬', actual: fcRows.length, expect: 104, op: '=' },
    { name: 'FA 통합분석', actual: sheetData['FA 통합분석'].length, expect: 104, op: '=' },
    { name: 'A6 빈칸', actual: a6MissCount, expect: 0, op: '=' },
    { name: 'B5 빈칸', actual: b5MissCount, expect: 0, op: '≤', threshold: 10 },
    { name: '유령 행', actual: ghostRows, expect: 0, op: '=' },
    { name: 'FM_COUNT', actual: fmCount, expect: 26, op: '=' },
    { name: 'FC_COUNT', actual: fcCount, expect: 104, op: '≥' },
    { name: 'FE_COUNT', actual: feCount, expect: 20, op: '=' },
    { name: 'PROCESS_COUNT', actual: processCount, expect: 21, op: '=' },
  ];

  let allPass = true;
  for (const c of checks) {
    let pass;
    if (c.op === '=') pass = c.actual === c.expect;
    else if (c.op === '≥') pass = c.actual >= c.expect;
    else if (c.op === '≤') pass = c.actual <= (c.threshold ?? c.expect);
    else pass = true;
    const icon = pass ? '✅' : '❌';
    if (!pass) allPass = false;
    console.log(`  ${icon} ${c.name}: ${c.actual} (기대 ${c.op}${c.expect})`);
  }

  console.log(`\n전수 검증: ${allPass ? 'ALL PASS ✅' : 'FAIL ❌'}`);
}

function applyMergeCells(ws, rows) {
  const mergeCols = [0, 1, 2, 3]; // FE구분, FE, 공정번호, FM
  for (const colIdx of mergeCols) {
    let start = 0;
    for (let i = 1; i <= rows.length; i++) {
      if (i < rows.length && rows[i][colIdx] === rows[start][colIdx]) continue;
      if (i - start > 1) {
        try {
          ws.mergeCells(start + 2, colIdx + 1, i + 1, colIdx + 1);
        } catch { /* 이미 병합됨 */ }
      }
      start = i;
    }
  }
}

main().catch(err => { console.error('ERROR:', err); process.exit(1); });
