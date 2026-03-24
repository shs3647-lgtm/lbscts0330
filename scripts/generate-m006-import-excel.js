/**
 * pfm26-m006 Import Excel 생성 스크립트
 * 4시트 위치기반 포맷: L1 통합(C1-C4), L2 통합(A1-A6), L3 통합(B1-B5), FC 고장사슬
 */
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const EXPORT_JSON = 'c:/autom-fmea/exports/pfm26-m006/pfm26-m006.json';
const OUTPUT_DIR = 'C:/Users/Administrator/Desktop/importdatadesign';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'pfm26-m006_import.xlsx');

// ─── Load Data ───
const raw = JSON.parse(fs.readFileSync(EXPORT_JSON, 'utf8'));
const dat = raw.data;

// ─── Build Lookup Maps ───
const l1FuncMap = new Map(dat.l1Functions.map(f => [f.id, f]));
const feMap = new Map(dat.failureEffects.map(f => [f.id, f]));
const l2Map = new Map(dat.l2Structures.map(s => [s.id, s]));
const l2FuncMap = new Map(dat.l2Functions.map(f => [f.id, f]));
const fmMap = new Map(dat.failureModes.map(f => [f.id, f]));
const l3Map = new Map(dat.l3Structures.map(s => [s.id, s]));
const l3FuncMap = new Map(dat.l3Functions.map(f => [f.id, f]));
const fcMap = new Map(dat.failureCauses.map(f => [f.id, f]));
const raMap = new Map(dat.riskAnalyses.map(r => [r.linkId, r]));

// ─── Sort helpers ───
const catOrder = { SP: 0, YP: 1, USER: 2 };
const sortedL2 = [...dat.l2Structures].sort((a, b) => parseInt(a.no) - parseInt(b.no));

// ─── Build L1 Rows (C1-C4) ───
// Group: each FailureEffect = 1 row. Sort by category, then function, then requirement
const l1Rows = dat.failureEffects.map(fe => {
  const l1f = l1FuncMap.get(fe.l1FuncId);
  return {
    feId: fe.id,
    c1: l1f?.category || '',
    c2: l1f?.functionName || '',
    c3: l1f?.requirement || '',
    c4: fe.effect || ''
  };
});
l1Rows.sort((a, b) =>
  (catOrder[a.c1] ?? 99) - (catOrder[b.c1] ?? 99) ||
  a.c2.localeCompare(b.c2) ||
  a.c3.localeCompare(b.c3) ||
  a.c4.localeCompare(b.c4)
);

// feId → L1 sheet excel row (1-based, header=1, data starts at 2)
const feIdToL1Row = new Map();
l1Rows.forEach((r, i) => feIdToL1Row.set(r.feId, i + 2));

// ─── Build L2 Rows (A1-A6) ───
// One row per FailureMode, sorted by processNo
const l2Rows = [];
for (const l2s of sortedL2) {
  const fms = dat.failureModes
    .filter(f => f.l2StructId === l2s.id)
    .sort((a, b) => {
      // Sort by L2Function order (original row index from ID)
      const rowA = parseInt((a.id.match(/R(\d+)/) || [])[1] || '0');
      const rowB = parseInt((b.id.match(/R(\d+)/) || [])[1] || '0');
      return rowA - rowB;
    });
  for (const fm of fms) {
    const l2f = l2FuncMap.get(fm.l2FuncId);
    l2Rows.push({
      fmId: fm.id,
      l2StructId: l2s.id,
      a1: l2s.no,
      a2: l2s.name,
      a3: l2f?.functionName || '',
      a4: l2f?.productChar || '',
      sc: (l2f?.specialChar === '★' || l2f?.specialChar === 'CC') ? '★' :
          (l2f?.specialChar === '◇' || l2f?.specialChar === 'SC') ? '◇' : '',
      a5: fm.mode || '',
      a6: '' // DC — default empty (not yet populated for m006)
    });
  }
}

const fmIdToL2Row = new Map();
l2Rows.forEach((r, i) => fmIdToL2Row.set(r.fmId, i + 2));

// ─── Build L3 Rows (B1-B5) ───
// One row per FailureCause, sorted by processNo → L3 order → FC order
const l3Rows = [];
for (const l2s of sortedL2) {
  const l3structs = dat.l3Structures
    .filter(s => s.l2Id === l2s.id)
    .sort((a, b) => a.order - b.order);
  for (const l3s of l3structs) {
    const fcs = dat.failureCauses
      .filter(fc => fc.l3StructId === l3s.id)
      .sort((a, b) => {
        const rowA = parseInt((a.id.match(/R(\d+)/) || [])[1] || '0');
        const rowB = parseInt((b.id.match(/R(\d+)/) || [])[1] || '0');
        return rowA - rowB;
      });
    for (const fc of fcs) {
      const l3f = l3FuncMap.get(fc.l3FuncId);
      l3Rows.push({
        fcId: fc.id,
        l3StructId: l3s.id,
        l2StructId: l2s.id,
        pno: l2s.no,
        m4: l3s.m4 || '',
        b1: l3s.name || '',
        b2: l3f?.functionName || '',
        b3: l3f?.processChar || '',
        sc: (l3f?.specialChar === '★' || l3f?.specialChar === 'CC') ? '★' :
            (l3f?.specialChar === '◇' || l3f?.specialChar === 'SC') ? '◇' : '',
        b4: fc.cause || '',
        b5: '' // PC — default empty (not yet populated for m006)
      });
    }
  }
}

const fcIdToL3Row = new Map();
l3Rows.forEach((r, i) => fcIdToL3Row.set(r.fcId, i + 2));

// ─── Build FC Sheet Rows (고장사슬) ───
const fcRows = [];
for (const fl of dat.failureLinks) {
  const fe = feMap.get(fl.feId);
  const fm = fmMap.get(fl.fmId);
  const fc = fcMap.get(fl.fcId);
  const ra = raMap.get(fl.id);
  const l3s = fc ? l3Map.get(fc.l3StructId) : null;
  const l2s = fm ? l2Map.get(fm.l2StructId) : null;

  fcRows.push({
    feScope: fe?.category || '',
    feText: fe?.effect || '',
    pno: l2s?.no || '',
    fmText: fm?.mode || '',
    m4: l3s?.m4 || '',
    we: l3s?.name || '',
    fcText: fc?.cause || '',
    pc: ra?.preventionControl || '',
    dc: ra?.detectionControl || '',
    s: ra?.severity || 1,
    o: ra?.occurrence || 1,
    d: ra?.detection || 1,
    ap: ra?.ap || 'L',
    l1Row: feIdToL1Row.get(fl.feId) || '',
    l2Row: fmIdToL2Row.get(fl.fmId) || '',
    l3Row: fcIdToL3Row.get(fl.fcId) || ''
  });
}
// Sort by processNo → FM → FC for readability
fcRows.sort((a, b) =>
  parseInt(a.pno || '0') - parseInt(b.pno || '0') ||
  a.fmText.localeCompare(b.fmText) ||
  a.fcText.localeCompare(b.fcText)
);

// ─── Excel Generation ───
async function generateExcel() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FMEA On-Premise';
  wb.created = new Date();

  // ── Style constants ──
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: '맑은 고딕' };
  const dataFont = { size: 10, name: '맑은 고딕' };
  const thinBorder = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' }
  };
  const centerAlign = { vertical: 'middle', horizontal: 'center', wrapText: true };
  const leftAlign = { vertical: 'middle', horizontal: 'left', wrapText: true };

  function styleHeader(ws, colCount) {
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    for (let c = 1; c <= colCount; c++) {
      const cell = headerRow.getCell(c);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = centerAlign;
      cell.border = thinBorder;
    }
  }

  function styleDataRow(row, colCount, alignments) {
    row.height = 22;
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.font = dataFont;
      cell.alignment = alignments[c - 1] || leftAlign;
      cell.border = thinBorder;
    }
  }

  // Light alternating row fills
  const evenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7FC' } };
  const processChangeFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

  // ════════════════════════════════════════
  // Sheet 1: L1 통합(C1-C4)
  // ════════════════════════════════════════
  const wsL1 = wb.addWorksheet('L1 통합(C1-C4)');
  wsL1.columns = [
    { header: 'C1\n구분', key: 'c1', width: 8 },
    { header: 'C2\n제품기능', key: 'c2', width: 52 },
    { header: 'C3\n요구사항', key: 'c3', width: 38 },
    { header: 'C4\n고장영향', key: 'c4', width: 30 }
  ];
  styleHeader(wsL1, 4);

  const l1Aligns = [centerAlign, leftAlign, leftAlign, leftAlign];
  l1Rows.forEach((r, i) => {
    const row = wsL1.addRow([r.c1, r.c2, r.c3, r.c4]);
    styleDataRow(row, 4, l1Aligns);
    if (i % 2 === 1) {
      for (let c = 1; c <= 4; c++) row.getCell(c).fill = evenFill;
    }
  });

  // Freeze header
  wsL1.views = [{ state: 'frozen', ySplit: 1 }];

  // ════════════════════════════════════════
  // Sheet 2: L2 통합(A1-A6)
  // ════════════════════════════════════════
  const wsL2 = wb.addWorksheet('L2 통합(A1-A6)');
  wsL2.columns = [
    { header: 'A1\n공정번호', key: 'a1', width: 10 },
    { header: 'A2\n공정명', key: 'a2', width: 22 },
    { header: 'A3\n공정기능', key: 'a3', width: 48 },
    { header: 'A4\n제품특성', key: 'a4', width: 30 },
    { header: 'SC\n특별특성', key: 'sc', width: 6 },
    { header: 'A5\n고장형태', key: 'a5', width: 30 },
    { header: 'A6\n검출관리', key: 'a6', width: 30 }
  ];
  styleHeader(wsL2, 7);

  const l2Aligns = [centerAlign, leftAlign, leftAlign, leftAlign, centerAlign, leftAlign, leftAlign];
  let prevPno = '';
  l2Rows.forEach((r, i) => {
    const row = wsL2.addRow([r.a1, r.a2, r.a3, r.a4, r.sc, r.a5, r.a6]);
    styleDataRow(row, 7, l2Aligns);
    // Highlight process change
    if (r.a1 !== prevPno) {
      for (let c = 1; c <= 7; c++) row.getCell(c).fill = processChangeFill;
      prevPno = r.a1;
    } else if (i % 2 === 1) {
      for (let c = 1; c <= 7; c++) row.getCell(c).fill = evenFill;
    }
  });

  wsL2.views = [{ state: 'frozen', ySplit: 1 }];

  // ════════════════════════════════════════
  // Sheet 3: L3 통합(B1-B5)
  // ════════════════════════════════════════
  const wsL3 = wb.addWorksheet('L3 통합(B1-B5)');
  wsL3.columns = [
    { header: '공정번호', key: 'pno', width: 10 },
    { header: '4M', key: 'm4', width: 6 },
    { header: 'B1\n작업요소', key: 'b1', width: 24 },
    { header: 'B2\n요소기능', key: 'b2', width: 48 },
    { header: 'B3\n공정특성', key: 'b3', width: 34 },
    { header: 'SC\n특별특성', key: 'sc', width: 6 },
    { header: 'B4\n고장원인', key: 'b4', width: 34 },
    { header: 'B5\n예방관리', key: 'b5', width: 30 }
  ];
  styleHeader(wsL3, 8);

  const l3Aligns = [centerAlign, centerAlign, leftAlign, leftAlign, leftAlign, centerAlign, leftAlign, leftAlign];
  prevPno = '';
  l3Rows.forEach((r, i) => {
    const row = wsL3.addRow([r.pno, r.m4, r.b1, r.b2, r.b3, r.sc, r.b4, r.b5]);
    styleDataRow(row, 8, l3Aligns);
    if (r.pno !== prevPno) {
      for (let c = 1; c <= 8; c++) row.getCell(c).fill = processChangeFill;
      prevPno = r.pno;
    } else if (i % 2 === 1) {
      for (let c = 1; c <= 8; c++) row.getCell(c).fill = evenFill;
    }
  });

  wsL3.views = [{ state: 'frozen', ySplit: 1 }];

  // ════════════════════════════════════════
  // Sheet 4: FC 고장사슬
  // ════════════════════════════════════════
  const wsFC = wb.addWorksheet('FC 고장사슬');
  wsFC.columns = [
    { header: 'FE구분', key: 'feScope', width: 8 },
    { header: 'FE\n고장영향', key: 'feText', width: 26 },
    { header: '공정번호', key: 'pno', width: 10 },
    { header: 'FM\n고장형태', key: 'fmText', width: 28 },
    { header: '4M', key: 'm4', width: 6 },
    { header: 'WE\n작업요소', key: 'we', width: 22 },
    { header: 'FC\n고장원인', key: 'fcText', width: 30 },
    { header: 'B5\n예방관리', key: 'pc', width: 26 },
    { header: 'A6\n검출관리', key: 'dc', width: 26 },
    { header: 'S', key: 's', width: 5 },
    { header: 'O', key: 'o', width: 5 },
    { header: 'D', key: 'd', width: 5 },
    { header: 'AP', key: 'ap', width: 5 },
    { header: 'L1원본행', key: 'l1Row', width: 9 },
    { header: 'L2원본행', key: 'l2Row', width: 9 },
    { header: 'L3원본행', key: 'l3Row', width: 9 }
  ];
  styleHeader(wsFC, 16);

  const fcAligns = [
    centerAlign, leftAlign, centerAlign, leftAlign, centerAlign, leftAlign, leftAlign,
    leftAlign, leftAlign,
    centerAlign, centerAlign, centerAlign, centerAlign,
    centerAlign, centerAlign, centerAlign
  ];

  prevPno = '';
  fcRows.forEach((r, i) => {
    const row = wsFC.addRow([
      r.feScope, r.feText, r.pno, r.fmText,
      r.m4, r.we, r.fcText,
      r.pc, r.dc,
      r.s, r.o, r.d, r.ap,
      r.l1Row, r.l2Row, r.l3Row
    ]);
    styleDataRow(row, 16, fcAligns);
    if (r.pno !== prevPno) {
      for (let c = 1; c <= 16; c++) row.getCell(c).fill = processChangeFill;
      prevPno = r.pno;
    } else if (i % 2 === 1) {
      for (let c = 1; c <= 16; c++) row.getCell(c).fill = evenFill;
    }
  });

  wsFC.views = [{ state: 'frozen', ySplit: 1, xSplit: 4 }];

  // ── AutoFilter ──
  wsL1.autoFilter = { from: 'A1', to: 'D1' };
  wsL2.autoFilter = { from: 'A1', to: 'G1' };
  wsL3.autoFilter = { from: 'A1', to: 'H1' };
  wsFC.autoFilter = { from: 'A1', to: 'P1' };

  // ── Save ──
  await wb.xlsx.writeFile(OUTPUT_FILE);

  // ── Summary ──
  console.log('=== pfm26-m006 Import Excel 생성 완료 ===');
  console.log(`파일: ${OUTPUT_FILE}`);
  console.log(`L1 통합(C1-C4): ${l1Rows.length} rows (FE 56건)`);
  console.log(`L2 통합(A1-A6): ${l2Rows.length} rows (FM 129건, 20공정)`);
  console.log(`L3 통합(B1-B5): ${l3Rows.length} rows (FC 430건, 122 WE)`);
  console.log(`FC 고장사슬:     ${fcRows.length} rows (FL 591건)`);

  // Verify FK integrity
  let missingL1 = 0, missingL2 = 0, missingL3 = 0;
  fcRows.forEach(r => {
    if (!r.l1Row) missingL1++;
    if (!r.l2Row) missingL2++;
    if (!r.l3Row) missingL3++;
  });
  console.log(`\nFK 정합성 (FC시트 원본행 참조):`);
  console.log(`  L1 미연결: ${missingL1}건`);
  console.log(`  L2 미연결: ${missingL2}건`);
  console.log(`  L3 미연결: ${missingL3}건`);
  if (missingL1 + missingL2 + missingL3 === 0) {
    console.log('  ✅ 전체 FK 정합성 OK');
  }
}

generateExcel().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
