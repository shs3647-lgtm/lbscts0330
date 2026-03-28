#!/usr/bin/env node
/**
 * pfm26-m006 DB에서 고장연결 741건 완전 반영된 Import 엑셀 생성
 * 출력: C:\Users\Administrator\Desktop\importdatadesign\pfm26-m006-complete.xlsx
 */
const ExcelJS = require('exceljs');
const path = require('path');

const BASE = 'http://localhost:3000/api';
const FMEA_ID = 'pfm26-m006';
const OUT_DIR = 'C:\\Users\\Administrator\\Desktop\\importdatadesign';
const OUT_FILE = path.join(OUT_DIR, 'pfm26-m006-complete.xlsx');

async function main() {
  console.log('=== pfm26-m006 Import 엑셀 생성 (FL 741건 반영) ===\n');

  // 1. DB 데이터 로드
  const r = await fetch(`${BASE}/fmea?fmeaId=${FMEA_ID}`);
  const db = await r.json();

  const l1Funcs = db.l1Functions || [];
  const l2s = db.l2Structures || [];
  const l2Funcs = db.l2Functions || [];
  const l3s = db.l3Structures || [];
  const l3Funcs = db.l3Functions || [];
  const fes = db.failureEffects || [];
  const fms = db.failureModes || [];
  const fcs = db.failureCauses || [];
  const ppcs = db.processProductChars || [];
  const fls = db.failureLinks || [];
  const ras = db.riskAnalyses || [];

  // ID → 엔티티 맵
  const l1FuncById = new Map(l1Funcs.map(f => [f.id, f]));
  const l2ById = new Map(l2s.map(s => [s.id, s]));
  const l2FuncById = new Map(l2Funcs.map(f => [f.id, f]));
  const l3ById = new Map(l3s.map(s => [s.id, s]));
  const l3FuncById = new Map(l3Funcs.map(f => [f.id, f]));
  const feById = new Map(fes.map(fe => [fe.id, fe]));
  const fmById = new Map(fms.map(fm => [fm.id, fm]));
  const fcById = new Map(fcs.map(fc => [fc.id, fc]));
  const ppcById = new Map(ppcs.map(p => [p.id, p]));
  const raByLinkId = new Map(ras.map(ra => [ra.linkId, ra]));

  // 행번호 매핑 (엑셀 행 2부터 시작)
  const feToRow = new Map(); fes.forEach((fe, i) => feToRow.set(fe.id, i + 2));
  const fmToRow = new Map(); fms.forEach((fm, i) => fmToRow.set(fm.id, i + 2));
  const fcToRow = new Map(); fcs.forEach((fc, i) => fcToRow.set(fc.id, i + 2));

  // 엑셀 생성
  const wb = new ExcelJS.Workbook();

  // ─── Sheet 1: L1 통합(C1-C4) ───
  const s1 = wb.addWorksheet('L1 통합(C1-C4)');
  s1.addRow(['C1(구분)', 'C2(제품기능)', 'C3(요구사항)', 'C4(고장영향)']);
  // 헤더 스타일
  s1.getRow(1).eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; });

  for (const fe of fes) {
    const l1f = fe.l1FuncId ? l1FuncById.get(fe.l1FuncId) : null;
    s1.addRow([
      l1f?.category || 'YP',
      l1f?.functionName || '',
      l1f?.requirement || '',
      fe.effect || '',
    ]);
  }
  console.log(`L1 시트: ${fes.length}행 (FE ${fes.length}건)`);

  // ─── Sheet 2: L2 통합(A1-A6) ───
  const s2 = wb.addWorksheet('L2 통합(A1-A6)');
  s2.addRow(['A1(공정번호)', 'A2(공정명)', 'A3(공정기능)', 'A4(제품특성)', 'SC(특별특성)', 'A5(고장형태)', 'A6(검출관리)']);
  s2.getRow(1).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; });

  // FM별 1행 (FM → L2Structure → L2Function → PPC)
  for (const fm of fms) {
    const l2 = fm.l2StructId ? l2ById.get(fm.l2StructId) : null;
    const l2f = fm.l2FuncId ? l2FuncById.get(fm.l2FuncId) : null;
    const ppc = fm.productCharId ? ppcById.get(fm.productCharId) : null;

    // DC: 이 FM과 연결된 RA에서 detectionControl 추출
    const fmFLs = fls.filter(fl => fl.fmId === fm.id);
    let dc = '';
    for (const fl of fmFLs) {
      const ra = raByLinkId.get(fl.id);
      if (ra?.detectionControl) { dc = ra.detectionControl; break; }
    }

    s2.addRow([
      l2?.no || l2?.processNo || '',
      l2?.name || '',
      l2f?.functionName || '',
      ppc?.name || l2f?.productChar || '',
      ppc?.specialChar || '',
      fm.mode || '',
      dc,
    ]);
  }
  console.log(`L2 시트: ${fms.length}행 (FM ${fms.length}건)`);

  // ─── Sheet 3: L3 통합(B1-B5) ───
  const s3 = wb.addWorksheet('L3 통합(B1-B5)');
  s3.addRow(['공정번호', '4M', 'B1(작업요소)', 'B2(요소기능)', 'B3(공정특성)', 'SC(특별특성)', 'B4(고장원인)', 'B5(예방관리)']);
  s3.getRow(1).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } }; c.font = { bold: true }; });

  // FC별 1행
  for (const fc of fcs) {
    const l3 = fc.l3StructId ? l3ById.get(fc.l3StructId) : null;
    const l3f = fc.l3FuncId ? l3FuncById.get(fc.l3FuncId) : null;
    const l2 = fc.l2StructId ? l2ById.get(fc.l2StructId) : null;

    // PC: 이 FC와 연결된 RA에서 preventionControl 추출
    const fcFLs = fls.filter(fl => fl.fcId === fc.id);
    let pc = '';
    for (const fl of fcFLs) {
      const ra = raByLinkId.get(fl.id);
      if (ra?.preventionControl) { pc = ra.preventionControl; break; }
    }

    s3.addRow([
      l2?.no || l2?.processNo || '',
      l3?.fourM || l3?.m4 || 'MC',
      l3?.name || '',
      l3f?.functionName || '',
      l3f?.processChar || '',
      l3f?.specialChar || '',
      fc.cause || '',
      pc,
    ]);
  }
  console.log(`L3 시트: ${fcs.length}행 (FC ${fcs.length}건)`);

  // ─── Sheet 4: FC 고장사슬 ───
  const s4 = wb.addWorksheet('FC 고장사슬');
  s4.addRow(['FE구분', 'FE(고장영향)', '공정번호', 'FM(고장형태)', '4M', 'WE(작업요소)', 'FC(고장원인)',
    'B5(예방관리)', 'A6(검출관리)', 'S', 'O', 'D', 'AP', 'L1원본행', 'L2원본행', 'L3원본행']);
  s4.getRow(1).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; });

  let flWritten = 0;
  for (const fl of fls) {
    const fe = feById.get(fl.feId);
    const fm = fmById.get(fl.fmId);
    const fc = fcById.get(fl.fcId);
    const ra = raByLinkId.get(fl.id);
    const l2 = fm?.l2StructId ? l2ById.get(fm.l2StructId) : null;
    const l3 = fc?.l3StructId ? l3ById.get(fc.l3StructId) : null;
    const l1f = fe?.l1FuncId ? l1FuncById.get(fe.l1FuncId) : null;

    const l1Row = feToRow.get(fl.feId) || 0;
    const l2Row = fmToRow.get(fl.fmId) || 0;
    const l3Row = fcToRow.get(fl.fcId) || 0;

    if (!l1Row || !l2Row || !l3Row) continue;

    // AP 계산
    const s = ra?.severity || 1;
    const o = ra?.occurrence || 1;
    const d = ra?.detection || 1;
    const sod = s * o * d;
    const ap = sod >= 100 ? 'H' : sod >= 40 ? 'M' : 'L';

    s4.addRow([
      l1f?.category || fe?.category || 'YP',
      fe?.effect || '',
      l2?.no || l2?.processNo || '',
      fm?.mode || '',
      l3?.fourM || '',
      l3?.name || '',
      fc?.cause || '',
      ra?.preventionControl || '',
      ra?.detectionControl || '',
      s, o, d, ap,
      l1Row, l2Row, l3Row,
    ]);
    flWritten++;
  }
  console.log(`FC 시트: ${flWritten}행 (FL ${fls.length}건 중 ${flWritten}건 기록)`);

  // 컬럼 너비 자동 조정
  [s1, s2, s3, s4].forEach(ws => {
    ws.columns.forEach(col => {
      let maxLen = 10;
      col.eachCell({ includeEmpty: false }, cell => {
        const len = String(cell.value || '').length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 2, 40);
    });
  });

  // 저장
  const fs = require('fs');
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  await wb.xlsx.writeFile(OUT_FILE);
  console.log(`\n✅ 저장: ${OUT_FILE}`);
  console.log(`   L1: ${fes.length}행, L2: ${fms.length}행, L3: ${fcs.length}행, FC: ${flWritten}행`);
}

main().catch(e => { console.error(e); process.exit(1); });
