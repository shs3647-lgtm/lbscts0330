/**
 * Master FMEA 샘플 Excel 생성 스크립트
 * Master DB(pfm26-m066)에서 flatItems + failureChains를 가져와
 * 옵션3(Ctrl+D) 방식으로 통합시트 Excel 생성
 *
 * Usage: node scripts/generate-master-sample.mjs
 */

import ExcelJS from 'exceljs';
import fs from 'fs';

const API_BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m066';
const OUTPUT_PATH = 'tests/temp-master-sample.xlsx';

const HEADER_COLOR = '00587A';

const SHEET_DEFS = [
  { name: 'L1 통합(C1-C4)', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)'] },
  { name: 'L2 통합(A1-A6)', headers: ['A1.공정번호', 'A2.공정명', 'A3.공정기능', 'A4.제품특성', '특별특성', 'A5.고장형태', 'A6.검출관리'] },
  { name: 'L3 통합(B1-B5)', headers: ['공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성', '고장원인(B4)', '예방관리(B5)'] },
  { name: 'FC 고장사슬', headers: ['FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)', '4M', '작업요소(WE)', 'FC(고장원인)', 'B5.예방관리(발생 전 방지)', 'A6.검출관리(발생 후 검출)', 'O', 'D', 'AP'] },
  { name: 'FA 통합분석', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '공정No(A1)', '공정명(A2)', '공정기능(A3)', '제품특성(A4)', '특별특성(A4)', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성(B3)', '고장영향(C4)', '고장형태(A5)', '고장원인(B4)', 'S', 'O', 'D', 'AP', 'DC추천1', 'DC추천2', 'PC추천1', 'PC추천2', 'O추천', 'D추천'] },
];

async function main() {
  console.log(`=== Master FMEA 샘플 생성: ${FMEA_ID} ===`);

  // 1. Master API에서 데이터 로드
  const res = await fetch(`${API_BASE}/api/pfmea/master?fmeaId=${FMEA_ID}&includeItems=true`);
  if (!res.ok) throw new Error(`API 실패: ${res.status}`);
  const { dataset } = await res.json();
  const flatData = dataset.flatItems || [];
  const chains = dataset.failureChains || [];
  console.log(`  flatItems: ${flatData.length}, chains: ${chains.length}`);

  // 2. 시트 데이터 빌드
  const sheetData = {};
  SHEET_DEFS.forEach(d => { sheetData[d.name] = []; });

  // --- L2 통합 ---
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
      if (a6Items[i]?.value) lastA6 = a6Items[i].value;
      sheetData['L2 통합(A1-A6)'].push([
        pNo, a2Val,
        a3Items[i]?.value || lastA3,
        a4Items[i]?.value || lastA4,
        a4Items[i]?.specialChar ?? lastA4Sp,
        a5Items[i]?.value || lastA5,
        a6Items[i]?.value || lastA6,
      ]);
    }
  }

  // --- L3 통합 ---
  const b1Items = flatData.filter(d => d.itemCode === 'B1');
  for (const b1 of b1Items) {
    const pNo = b1.processNo, m4 = b1.m4 || '';
    const b2Items = flatData.filter(d => d.itemCode === 'B2' && d.processNo === pNo && (d.m4 || '') === m4);
    const b3Items = flatData.filter(d => d.itemCode === 'B3' && d.processNo === pNo && (d.m4 || '') === m4);
    const b4Items = flatData.filter(d => d.itemCode === 'B4' && d.processNo === pNo && (d.m4 || '') === m4);
    const b5Items = flatData.filter(d => d.itemCode === 'B5' && d.processNo === pNo && (d.m4 || '') === m4);
    const maxLen = Math.max(1, b2Items.length, b3Items.length, b4Items.length, b5Items.length);
    let lastB2 = '', lastB3 = '', lastB3Sp = '', lastB4 = '', lastB5 = '';
    for (let i = 0; i < maxLen; i++) {
      if (b2Items[i]?.value) lastB2 = b2Items[i].value;
      if (b3Items[i]?.value) { lastB3 = b3Items[i].value; lastB3Sp = b3Items[i].specialChar || ''; }
      if (b4Items[i]?.value) lastB4 = b4Items[i].value;
      if (b5Items[i]?.value) lastB5 = b5Items[i].value;
      sheetData['L3 통합(B1-B5)'].push([
        pNo, m4, b1.value || '',
        b2Items[i]?.value || lastB2,
        b3Items[i]?.value || lastB3,
        b3Items[i]?.specialChar ?? lastB3Sp,
        b4Items[i]?.value || lastB4,
        b5Items[i]?.value || lastB5,
      ]);
    }
  }

  // --- L1 통합 ---
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

  // --- FC 고장사슬 ---
  const sortedChains = [...chains].sort((a, b) => {
    const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
    if (pCmp !== 0) return pCmp;
    const fmCmp = (a.fmValue || '').localeCompare(b.fmValue || '');
    if (fmCmp !== 0) return fmCmp;
    return (a.feValue || '').localeCompare(b.feValue || '');
  });
  sheetData['FC 고장사슬'] = sortedChains.map(fc => [
    fc.feScope || '', fc.feValue || '', fc.processNo || '', fc.fmValue || '',
    fc.m4 || '', fc.workElement || '', fc.fcValue || '',
    fc.pcValue || '', fc.dcValue || '',
    fc.occurrence ? String(fc.occurrence) : '',
    fc.detection ? String(fc.detection) : '',
    fc.ap || '',
  ]);

  // --- FA 통합분석 ---
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
    const pNo = fc.processNo || '', m4k = `${pNo}|${fc.m4 || ''}`, scope = fc.feScope || '';
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
      fc.dcValue || '', '',
      fc.pcValue || '', '',
      '', '',
    ];
  });

  // 3. Excel 파일 생성
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FMEA Smart System Master Sample Generator';
  workbook.created = new Date();

  for (const def of SHEET_DEFS) {
    const ws = workbook.addWorksheet(def.name);
    const rows = sheetData[def.name] || [];

    ws.columns = def.headers.map((h, i) => ({
      header: h, key: `col${i}`, width: Math.max(12, h.length * 1.5 + 2),
    }));

    const headerRow = ws.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.name.includes('FC') ? 'B91C1C' : def.name.includes('FA') ? '1E40AF' : HEADER_COLOR } };
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
  console.log(`\n=== 완료: ${OUTPUT_PATH} ===`);

  // 4. 통계 출력
  for (const def of SHEET_DEFS) {
    console.log(`  ${def.name}: ${(sheetData[def.name] || []).length}행`);
  }
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
