/**
 * 연결표 JSON + m002 Atomic DB → 정제된 5시트 Import 엑셀 생성
 * 
 * Sheet 1: L1(C1-C4) — FE 엔티티 (20개, scope+effect 정제)
 * Sheet 2: L2(A1-A6) — FM 엔티티 (26개)
 * Sheet 3: L3(B1-B3) — WE+기능+공정특성 (91개, B4 없음)
 * Sheet 4: B4(FC)    — 고장원인 별도 (111개, 독립 엔티티)
 * Sheet 5: FL(고장사슬) — FM↔FC↔FE 연결 (251개, FK 기반)
 */
import * as fs from 'fs';
import ExcelJS from 'exceljs';

function main() {
  const conn = JSON.parse(fs.readFileSync('data/master-fmea/m002-connection-table.json', 'utf8'));
  const pos = JSON.parse(fs.readFileSync('data/master-fmea/m102-position-based.json', 'utf8'));

  const wb = new ExcelJS.Workbook();

  // ── Sheet 1: L1 (FE 엔티티, 정제 20개) ──
  const l1ws = wb.addWorksheet('L1 통합(C1-C4)');
  const l1h = ['No', '구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)'];
  l1ws.addRow(l1h);
  styleHeader(l1ws, l1h.length);

  const feEntities = conn.entities.fe;
  for (let i = 0; i < feEntities.length; i++) {
    const fe = feEntities[i];
    l1ws.addRow([i + 1, fe.scope, fe.functionName, fe.requirement, fe.effect]);
  }

  // ── Sheet 2: L2 (FM 엔티티, 26개) ──
  const l2ws = wb.addWorksheet('L2 통합(A1-A6)');
  const l2h = ['No', '공정번호(A1)', '공정명(A2)', '공정기능(A3)', '제품특성(A4)', '특별특성', '고장형태(A5)', '검출관리(A6)'];
  l2ws.addRow(l2h);
  styleHeader(l2ws, l2h.length);

  const fmEntities = conn.entities.fm;
  // A6: FM별 첫 번째 DC
  const dcByFm = new Map<string, string>();
  for (const lk of conn.links) {
    if (lk.detectionControl && !dcByFm.has(lk.fmId)) {
      dcByFm.set(lk.fmId, lk.detectionControl);
    }
  }

  for (let i = 0; i < fmEntities.length; i++) {
    const fm = fmEntities[i];
    // A3: processFunction from position data
    const l2Row = pos.sheets.L2.rows.find((r: any) => r.fk?.origFmId === fm.id);
    l2ws.addRow([
      i + 1,
      fm.processNo,
      fm.processName,
      l2Row?.cells?.A3 || fm.processName,
      fm.productChar || '-',
      '비지정',
      fm.mode,
      dcByFm.get(fm.id) || '',
    ]);
  }

  // ── Sheet 3: L3 (B1-B3, WE 91개, B4 없음) ──
  const l3ws = wb.addWorksheet('L3 통합(B1-B3)');
  const l3h = ['No', '공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성'];
  l3ws.addRow(l3h);
  styleHeader(l3ws, l3h.length);

  // Unique WEs from position data (91개)
  const l3Seen = new Set<string>();
  const l3Rows: any[] = [];
  for (const row of pos.sheets.L3.rows) {
    const key = `${row.cells.processNo}|${row.cells.m4}|${row.cells.B1}`;
    if (l3Seen.has(key)) continue;
    l3Seen.add(key);
    l3Rows.push(row);
  }

  for (let i = 0; i < l3Rows.length; i++) {
    const r = l3Rows[i];
    l3ws.addRow([
      i + 1,
      r.cells.processNo,
      r.cells.m4,
      r.cells.B1,
      r.cells.B2 || r.cells.B1,
      r.cells.B3 || r.cells.B2 || r.cells.B1,
      '비지정',
    ]);
  }

  // ── Sheet 4: B4 (FC 별도 엔티티, 111개) ──
  const b4ws = wb.addWorksheet('B4 고장원인(FC)');
  const b4h = ['No', '공정번호', '4M', 'WE(작업요소)', '고장원인(B4)', '공정특성', '예방관리(B5)'];
  b4ws.addRow(b4h);
  styleHeader(b4ws, b4h.length);

  const fcEntities = conn.entities.fc;
  // B5(PC) by FC
  const pcByFc = new Map<string, string>();
  for (const lk of conn.links) {
    if (lk.preventionControl && !pcByFc.has(lk.fcId)) {
      pcByFc.set(lk.fcId, lk.preventionControl);
    }
  }

  for (let i = 0; i < fcEntities.length; i++) {
    const fc = fcEntities[i];
    b4ws.addRow([
      i + 1,
      fc.processNo,
      fc.m4,
      fc.workElement,
      fc.cause,
      fc.processChar,
      pcByFc.get(fc.id) || '',
    ]);
  }

  // ── Sheet 5: FL (고장사슬, 251개) ──
  const flws = wb.addWorksheet('FL 고장사슬');
  const flh = [
    'No', 'FM-ID', 'FC-ID', 'FE-ID',
    'FE구분', 'FE(고장영향)',
    '공정번호', 'FM(고장형태)',
    '4M', '작업요소', 'FC(고장원인)',
    'PC(예방관리)', 'DC(검출관리)',
    'S', 'O', 'D', 'AP',
    'L1행(FE)', 'L2행(FM)', 'B4행(FC)',
  ];
  flws.addRow(flh);
  styleHeader(flws, flh.length);

  // Entity index lookups (for row references)
  const feIdx = new Map(feEntities.map((f: any, i: number) => [f.id, i + 2]));
  const fmIdx = new Map(fmEntities.map((f: any, i: number) => [f.id, i + 2]));
  const fcIdx = new Map(fcEntities.map((f: any, i: number) => [f.id, i + 2]));

  const fmMap = new Map(fmEntities.map((f: any) => [f.id, f]));
  const fcMap = new Map(fcEntities.map((f: any) => [f.id, f]));
  const feMap = new Map(feEntities.map((f: any) => [f.id, f]));

  for (let i = 0; i < conn.links.length; i++) {
    const lk = conn.links[i];
    const fm = fmMap.get(lk.fmId);
    const fc = fcMap.get(lk.fcId);
    const fe = feMap.get(lk.feId);

    flws.addRow([
      i + 1,
      lk.fmId,
      lk.fcId,
      lk.feId,
      fe?.scope || '',
      fe?.effect || '',
      fm?.processNo || '',
      fm?.mode || '',
      fc?.m4 || '',
      fc?.workElement || '',
      fc?.cause || '',
      lk.preventionControl || '',
      lk.detectionControl || '',
      lk.severity || '',
      lk.occurrence || '',
      lk.detection || '',
      lk.ap || '',
      feIdx.get(lk.feId) || '',
      fmIdx.get(lk.fmId) || '',
      fcIdx.get(lk.fcId) || '',
    ]);
  }

  // 컬럼 너비
  for (const ws of [l1ws, l2ws, l3ws, b4ws, flws]) {
    ws.columns.forEach(col => { col.width = 20; });
  }

  const outPath = 'data/m102_clean_import.xlsx';
  wb.xlsx.writeFile(outPath).then(() => {
    console.log(`→ ${outPath}`);
    console.log(`L1(FE): ${feEntities.length}, L2(FM): ${fmEntities.length}, L3(WE): ${l3Rows.length}`);
    console.log(`B4(FC): ${fcEntities.length}, FL: ${conn.links.length}`);

    // 빈셀 검증
    let empty = 0;
    for (const ws of [l1ws, l2ws, l3ws, b4ws]) {
      ws.eachRow((row, rn) => {
        if (rn === 1) return;
        row.eachCell({ includeEmpty: true }, (cell, cn) => {
          if (cn === 1) return;
          const v = String(cell.value || '').trim();
          if (!v && cn <= (ws === l1ws ? 5 : ws === l2ws ? 7 : ws === l3ws ? 5 : 5)) empty++;
        });
      });
    }
    console.log(`빈셀(핵심컬럼): ${empty}`);
  });
}

function styleHeader(ws: ExcelJS.Worksheet, colCount: number) {
  const row = ws.getRow(1);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B579A' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  }
}

main();
