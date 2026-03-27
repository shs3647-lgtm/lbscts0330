/**
 * 엑셀 파싱 → JSON → import-to-raw API (save=true) → API 검증
 * exceljs로 직접 읽어서 PositionBasedJSON 생성
 */
const ExcelJS = require('exceljs');
const path = require('path');

const FMEA_ID = 'pfm26-m005';
const BASE_URL = 'http://localhost:3000';
const EXCEL_PATH = String.raw`D:\00 fmea개발\00_LB세미콘FMEA\등록양식\new115_00_260327_PFMEA_Master_v5.xlsx`;

function cellStr(row, col) {
  const v = row.getCell(col).value;
  if (v == null) return '';
  if (typeof v === 'object' && v.richText) return v.richText.map(r => r.text).join('');
  return String(v).trim();
}

async function buildPositionJSON() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  
  const sheets = {};
  const sheetMap = {};
  wb.eachSheet(ws => {
    const n = ws.name;
    if (n.includes('L1') && n.includes('통합')) sheetMap.L1 = ws;
    if (n.includes('L2') && n.includes('통합')) sheetMap.L2 = ws;
    if (n.includes('L3') && n.includes('통합')) sheetMap.L3 = ws;
    if (n.includes('FC') && n.includes('고장사슬')) sheetMap.FC = ws;
  });
  
  for (const [key, ws] of Object.entries(sheetMap)) {
    const rows = [];
    const headers = [];
    ws.getRow(1).eachCell((cell, col) => headers.push(cellStr(ws.getRow(1), col)));
    
    ws.eachRow((row, rn) => {
      if (rn === 1) return;
      const cells = {};
      headers.forEach((h, i) => {
        const col = i + 1;
        const val = cellStr(row, col);
        // 매핑: 헤더 → 키
        if (key === 'L1') {
          if (i === 0) cells.C1 = val;
          if (i === 1) cells.C2 = val;
          if (i === 2) cells.C3 = val;
          if (i === 3) cells.C4 = val;
        } else if (key === 'L2') {
          if (i === 0) { cells.A1 = val; cells.processNo = val; }  // 양쪽 키
          if (i === 1) { cells.A2 = val; cells.processName = val; }
          if (i === 2) cells.A3 = val;
          if (i === 3) cells.A4 = val;
          if (i === 4) cells.SC = val;
          if (i === 5) cells.A5 = val;
          if (i === 6) cells.A6 = val;
        } else if (key === 'L3') {
          if (i === 0) cells.processNo = val;
          if (i === 1) cells.m4 = val;
          if (i === 2) cells.B1 = val;
          if (i === 3) cells.B2 = val;
          if (i === 4) cells.B3 = val;
          if (i === 5) cells.SC = val;
          if (i === 6) cells.B4 = val;
          if (i === 7) cells.B5 = val;
        } else if (key === 'FC') {
          if (i === 0) cells.FE_scope = val;
          if (i === 1) cells.FE = val;
          if (i === 2) cells.processNo = val;
          if (i === 3) cells.FM = val;
          if (i === 4) cells.m4 = val;
          if (i === 5) cells.WE = val;
          if (i === 6) cells.FC = val;
          if (i === 7) cells.PC = val;
          if (i === 8) cells.DC = val;
          if (i === 9) cells.O = val;
          if (i === 10) cells.D = val;
          if (i === 11) cells.AP = val;
        }
      });
      rows.push({ excelRow: rn, posId: `${key}-R${rn}`, cells });
    });
    
    sheets[key] = { sheetName: ws.name, headers, rows };
  }
  
  return { targetId: FMEA_ID, sourceId: FMEA_ID, sheets };
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log(`📁 ${path.basename(EXCEL_PATH)}`);
  
  // 1. 엑셀 → JSON
  console.log('\n[1/3] 엑셀 → PositionBasedJSON...');
  const json = await buildPositionJSON();
  console.log(`  L1: ${json.sheets.L1?.rows.length}행, L2: ${json.sheets.L2?.rows.length}행, L3: ${json.sheets.L3?.rows.length}행, FC: ${json.sheets.FC?.rows.length}행`);
  
  // 2. import-to-raw API (save=true)
  console.log('\n[2/3] import-to-raw (파싱+저장)...');
  const res = await fetch(`${BASE_URL}/api/fmea/import-to-raw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID, json, save: true, force: true }),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`import-to-raw 실패 (${res.status}): ${err.substring(0, 500)}`);
  }
  
  const data = await res.json();
  console.log(`  ✅ 파싱: ${JSON.stringify(data.stats || {})}`);
  console.log(`  ✅ 품질: ${data.quality?.status}`);
  if (data.counts) console.log(`  ✅ 저장: ${JSON.stringify(data.counts)}`);
  
  // 3. GET API 검증
  console.log('\n[3/3] GET API 최종 검증...');
  const getRes = await fetch(`${BASE_URL}/api/fmea?id=${FMEA_ID}`);
  const fmea = await getRes.json();
  const c = {
    FM: (fmea.failureModes || []).length,
    FC: (fmea.failureCauses || []).length,
    FE: (fmea.failureEffects || []).length,
    FL: (fmea.failureLinks || []).length,
    RA: (fmea.riskAnalyses || []).length,
  };
  console.log(`\n📊 FM=${c.FM} FC=${c.FC} FE=${c.FE} FL=${c.FL} RA=${c.RA}`);
  
  const pass = c.FE >= 20 && c.FM >= 28 && c.FC >= 115 && c.FL >= 115 && c.RA >= 115;
  console.log(`\n${pass ? '✅ PASS' : '❌ FAIL — 기대: FE≥20, FM≥28, FC≥115, FL≥115, RA≥115'}`);
  return c;
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
