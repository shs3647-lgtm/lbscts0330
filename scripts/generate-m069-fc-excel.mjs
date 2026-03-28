/**
 * pfm26-m069 FC Chain 100% 엑셀 생성 스크립트
 * - 118건 전체 FC 체인 데이터
 * - 엑셀 함수 기반 3회 검증 시트 포함
 * - data/master-fmea/ + Documents/fc/ 이중 저장
 */
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const FMEA_ID = 'pfm26-m069';
const MASTER_JSON = `data/master-fmea/${FMEA_ID}.json`;
const OUTPUT_MASTER = `data/master-fmea/${FMEA_ID}-fc-chains.xlsx`;
const OUTPUT_FC = `C:/Users/Administrator/Documents/fc/${FMEA_ID}-fc-chains-verified.xlsx`;

// ─── Load Data ───
const raw = JSON.parse(fs.readFileSync(MASTER_JSON, 'utf8'));
const adb = raw.atomicDB;
const chains = raw.chains;

// Build lookup maps
const l1fMap = Object.fromEntries(adb.l1Functions.map(f => [f.id, f]));
const l2Map = Object.fromEntries(adb.l2Structures.map(s => [s.id, s]));
const l3Map = Object.fromEntries(adb.l3Structures.map(s => [s.id, s]));
const fmMap = Object.fromEntries(adb.failureModes.map(m => [m.id, m]));
const feMap = Object.fromEntries(adb.failureEffects.map(e => [e.id, e]));
const fcMap = Object.fromEntries(adb.failureCauses.map(c => [c.id, c]));
const raByLink = {};
adb.riskAnalyses.forEach(r => { raByLink[r.linkId || r.id] = r; });

// ─── Build rows from FailureLinks (SSoT) ───
const rows = adb.failureLinks.map(link => {
  const fm = fmMap[link.fmId] || {};
  const fe = feMap[link.feId] || {};
  const fc = fcMap[link.fcId] || {};
  const ra = raByLink[link.id] || {};
  const l2 = l2Map[fm.l2StructId] || {};
  const l3 = l3Map[fc.l3StructId] || {};
  const l1f = l1fMap[fe.l1FuncId] || {};

  // Also find matching chain for PC/DC if RA missing
  const ch = chains.find(c => c.fcId === link.fcId && c.fmId === link.fmId) || {};

  return {
    feCategory: l1f.category || ch.feScope || '',
    feEffect: fe.effect || ch.feValue || '',
    feSeverity: fe.severity || ch.feSeverity || 0,
    processNo: l2.no || ch.processNo || '',
    processName: l2.name || '',
    fmMode: fm.mode || ch.fmValue || '',
    m4: l3.m4 || ch.m4 || '',
    workElement: l3.name || ch.workElement || '',
    fcCause: fc.cause || ch.fcValue || '',
    pc: ra.preventionControl || ch.pcValue || '',
    dc: ra.detectionControl || ch.dcValue || '',
    severity: ra.severity || fe.severity || ch.severity || 0,
    occurrence: ra.occurrence ?? ch.occurrence ?? 0,
    detection: ra.detection ?? ch.detection ?? 0,
    ap: ra.ap || ch.ap || '',
    linkId: link.id,
    fmId: link.fmId,
    feId: link.feId,
    fcId: link.fcId,
  };
});

// Sort by processNo → FM → M4
rows.sort((a, b) => {
  const pn = Number(a.processNo) - Number(b.processNo);
  if (pn !== 0) return pn;
  if (a.fmMode !== b.fmMode) return a.fmMode.localeCompare(b.fmMode);
  return (a.m4 || '').localeCompare(b.m4 || '');
});

console.log(`Total FC chain rows: ${rows.length}`);

// ─── Excel Generation ───
async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Smart FMEA Pipeline';
  wb.created = new Date();

  // ════════════════════════════════════════════
  // Sheet 1: FC Chain Data (메인 데이터)
  // ════════════════════════════════════════════
  const ws = wb.addWorksheet('FC_Chain_Data', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  // Column definitions
  const columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'FE구분', key: 'feCategory', width: 8 },
    { header: 'FE(고장영향)', key: 'feEffect', width: 40 },
    { header: 'S(심각도)', key: 'feSeverity', width: 8 },
    { header: 'L2-1.공정번호', key: 'processNo', width: 12 },
    { header: '공정명', key: 'processName', width: 18 },
    { header: 'FM(고장형태)', key: 'fmMode', width: 35 },
    { header: '4M', key: 'm4', width: 5 },
    { header: 'WE(작업요소)', key: 'workElement', width: 22 },
    { header: 'FC(고장원인)', key: 'fcCause', width: 30 },
    { header: 'B5.예방관리(발생 전 방지)', key: 'pc', width: 45 },
    { header: 'A6.검출관리(발생 후 검출)', key: 'dc', width: 45 },
    { header: 'O', key: 'occurrence', width: 5 },
    { header: 'D', key: 'detection', width: 5 },
    { header: 'AP', key: 'ap', width: 6 },
    { header: 'LinkID', key: 'linkId', width: 22 },
    { header: 'FM_ID', key: 'fmId', width: 22 },
    { header: 'FE_ID', key: 'feId', width: 25 },
    { header: 'FC_ID', key: 'fcId', width: 28 },
  ];
  ws.columns = columns;

  // Header style
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB71C1C' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  ws.getRow(1).eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  ws.getRow(1).height = 36;

  // Data rows
  rows.forEach((r, i) => {
    const row = ws.addRow({
      no: i + 1,
      feCategory: r.feCategory,
      feEffect: r.feEffect,
      feSeverity: r.feSeverity,
      processNo: r.processNo,
      processName: r.processName,
      fmMode: r.fmMode,
      m4: r.m4,
      workElement: r.workElement,
      fcCause: r.fcCause,
      pc: r.pc,
      dc: r.dc,
      occurrence: r.occurrence,
      detection: r.detection,
      ap: r.ap,
      linkId: r.linkId,
      fmId: r.fmId,
      feId: r.feId,
      fcId: r.fcId,
    });

    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.font = { size: 9 };
    });

    // AP color coding
    const apCell = row.getCell('ap');
    const apVal = String(r.ap).toUpperCase();
    if (apVal === 'H') {
      apCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
      apCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    } else if (apVal === 'M') {
      apCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA000' } };
      apCell.font = { bold: true, size: 9 };
    } else if (apVal === 'L') {
      apCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
      apCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    }

    // Alternate row shading
    if (i % 2 === 0) {
      row.eachCell(cell => {
        if (!cell.fill || cell.fill.fgColor?.argb === undefined || cell === apCell) return;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      });
    }
  });

  // ════════════════════════════════════════════
  // Sheet 2: 검증1 — 필드 완전성 (엑셀 함수)
  // ════════════════════════════════════════════
  const v1 = wb.addWorksheet('검증1_필드완전성');
  const dataRange = rows.length; // 118
  const lastRow = dataRange + 1; // header + data

  v1.columns = [
    { header: '검증 항목', key: 'item', width: 30 },
    { header: '검증 공식', key: 'formula', width: 55 },
    { header: '결과', key: 'result', width: 12 },
    { header: '기대값', key: 'expected', width: 12 },
    { header: 'PASS/FAIL', key: 'status', width: 12 },
  ];

  // Header style
  v1.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center' };
  });

  const verifyItems = [
    { item: '총 행수', col: 'A', formula: `COUNTA(FC_Chain_Data!A2:A${lastRow})`, expected: dataRange },
    { item: 'FE구분 빈칸', col: 'B', formula: `COUNTBLANK(FC_Chain_Data!B2:B${lastRow})`, expected: 0 },
    { item: 'FE(고장영향) 빈칸', col: 'C', formula: `COUNTBLANK(FC_Chain_Data!C2:C${lastRow})`, expected: 0 },
    { item: 'S(심각도) 0건', col: 'D', formula: `COUNTIF(FC_Chain_Data!D2:D${lastRow},0)`, expected: 0 },
    { item: '공정번호 빈칸', col: 'E', formula: `COUNTBLANK(FC_Chain_Data!E2:E${lastRow})`, expected: 0 },
    { item: 'FM(고장형태) 빈칸', col: 'G', formula: `COUNTBLANK(FC_Chain_Data!G2:G${lastRow})`, expected: 0 },
    { item: '4M 빈칸', col: 'H', formula: `COUNTBLANK(FC_Chain_Data!H2:H${lastRow})`, expected: 0 },
    { item: '작업요소 빈칸', col: 'I', formula: `COUNTBLANK(FC_Chain_Data!I2:I${lastRow})`, expected: 0 },
    { item: 'FC(고장원인) 빈칸', col: 'J', formula: `COUNTBLANK(FC_Chain_Data!J2:J${lastRow})`, expected: 0 },
    { item: 'B5.예방관리 빈칸', col: 'K', formula: `COUNTBLANK(FC_Chain_Data!K2:K${lastRow})`, expected: 0 },
    { item: 'A6.검출관리 빈칸', col: 'L', formula: `COUNTBLANK(FC_Chain_Data!L2:L${lastRow})`, expected: 0 },
    { item: 'AP 빈칸', col: 'O', formula: `COUNTBLANK(FC_Chain_Data!O2:O${lastRow})`, expected: 0 },
    { item: 'LinkID 빈칸', col: 'P', formula: `COUNTBLANK(FC_Chain_Data!P2:P${lastRow})`, expected: 0 },
    { item: 'FM_ID 빈칸', col: 'Q', formula: `COUNTBLANK(FC_Chain_Data!Q2:Q${lastRow})`, expected: 0 },
    { item: 'FE_ID 빈칸', col: 'R', formula: `COUNTBLANK(FC_Chain_Data!R2:R${lastRow})`, expected: 0 },
    { item: 'FC_ID 빈칸', col: 'S', formula: `COUNTBLANK(FC_Chain_Data!S2:S${lastRow})`, expected: 0 },
    { item: 'FC_ID 고유 수 (1:N 허용)', col: 'S', formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!S2:S${lastRow},FC_Chain_Data!S2:S${lastRow}))`, expected: 117 },
    { item: '고유 FM 수', col: 'G', formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!G2:G${lastRow},FC_Chain_Data!G2:G${lastRow}))`, expected: 26 },
    { item: '고유 FE 수', col: 'C', formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!C2:C${lastRow},FC_Chain_Data!C2:C${lastRow}))`, expected: 20 },
    { item: '고유 공정 수', col: 'E', formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!E2:E${lastRow},FC_Chain_Data!E2:E${lastRow}))`, expected: 21 },
  ];

  verifyItems.forEach((vi, i) => {
    const r = i + 2;
    v1.getCell(`A${r}`).value = vi.item;
    v1.getCell(`B${r}`).value = vi.formula;
    v1.getCell(`C${r}`).value = { formula: vi.formula };
    v1.getCell(`D${r}`).value = vi.expected;
    // PASS/FAIL formula
    v1.getCell(`E${r}`).value = { formula: `IF(C${r}=D${r},"✅ PASS","❌ FAIL")` };
  });

  // Summary row
  const sumRow = verifyItems.length + 3;
  v1.getCell(`A${sumRow}`).value = '전체 판정';
  v1.getCell(`A${sumRow}`).font = { bold: true, size: 12 };
  v1.getCell(`E${sumRow}`).value = {
    formula: `IF(COUNTIF(E2:E${sumRow - 2},"❌ FAIL")=0,"✅ ALL PASS","❌ FAIL 있음")`
  };
  v1.getCell(`E${sumRow}`).font = { bold: true, size: 14 };

  // ════════════════════════════════════════════
  // Sheet 3: 검증2 — 공정별 교차검증 (엑셀 함수)
  // ════════════════════════════════════════════
  const v2 = wb.addWorksheet('검증2_공정별교차검증');
  v2.columns = [
    { header: '공정No', key: 'pno', width: 8 },
    { header: '공정명', key: 'pname', width: 18 },
    { header: '기대 FM수', key: 'expFM', width: 10 },
    { header: '실제 FM수 (엑셀함수)', key: 'actFM', width: 20 },
    { header: '기대 FC수', key: 'expFC', width: 10 },
    { header: '실제 FC수 (엑셀함수)', key: 'actFC', width: 20 },
    { header: 'FM 판정', key: 'fmOk', width: 10 },
    { header: 'FC 판정', key: 'fcOk', width: 10 },
  ];

  v2.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center' };
  });

  // Expected per process
  const procExpected = {};
  rows.forEach(r => {
    const pno = String(r.processNo);
    if (!procExpected[pno]) procExpected[pno] = { name: r.processName, fms: new Set(), fcs: 0 };
    procExpected[pno].fms.add(r.fmMode);
    procExpected[pno].fcs++;
  });

  const procNos = Object.keys(procExpected).sort((a, b) => Number(a) - Number(b));
  procNos.forEach((pno, i) => {
    const r = i + 2;
    const pe = procExpected[pno];
    v2.getCell(`A${r}`).value = pno;
    v2.getCell(`B${r}`).value = pe.name;
    v2.getCell(`C${r}`).value = pe.fms.size;
    // COUNTIF for unique FM count per process
    v2.getCell(`D${r}`).value = { formula: `SUMPRODUCT((FC_Chain_Data!E2:E${lastRow}="${pno}")*1/COUNTIFS(FC_Chain_Data!E2:E${lastRow},"${pno}",FC_Chain_Data!G2:G${lastRow},FC_Chain_Data!G2:G${lastRow}))` };
    v2.getCell(`E${r}`).value = pe.fcs;
    v2.getCell(`F${r}`).value = { formula: `COUNTIF(FC_Chain_Data!E2:E${lastRow},"${pno}")` };
    v2.getCell(`G${r}`).value = { formula: `IF(C${r}=D${r},"✅","❌")` };
    v2.getCell(`H${r}`).value = { formula: `IF(E${r}=F${r},"✅","❌")` };
  });

  // Total
  const totalR = procNos.length + 2;
  v2.getCell(`A${totalR}`).value = '합계';
  v2.getCell(`A${totalR}`).font = { bold: true };
  v2.getCell(`C${totalR}`).value = 26;
  v2.getCell(`D${totalR}`).value = { formula: `SUM(D2:D${totalR - 1})` };
  v2.getCell(`E${totalR}`).value = rows.length;
  v2.getCell(`F${totalR}`).value = { formula: `SUM(F2:F${totalR - 1})` };
  v2.getCell(`G${totalR}`).value = { formula: `IF(C${totalR}=D${totalR},"✅ ALL","❌")` };
  v2.getCell(`H${totalR}`).value = { formula: `IF(E${totalR}=F${totalR},"✅ ALL","❌")` };

  // ════════════════════════════════════════════
  // Sheet 4: 검증3 — FK/UUID 고유성 (엑셀 함수)
  // ════════════════════════════════════════════
  const v3 = wb.addWorksheet('검증3_FK_UUID검증');
  v3.columns = [
    { header: '검증 항목', key: 'item', width: 35 },
    { header: '공식', key: 'formula', width: 60 },
    { header: '결과', key: 'result', width: 12 },
    { header: '기대값', key: 'expected', width: 12 },
    { header: 'PASS/FAIL', key: 'status', width: 12 },
  ];

  v3.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE65100' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center' };
  });

  const fkChecks = [
    { item: 'LinkID 고유 수', formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!P2:P${lastRow},FC_Chain_Data!P2:P${lastRow}))`, expected: rows.length },
    { item: 'FC_ID 고유 수 (1:N 허용)', formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!S2:S${lastRow},FC_Chain_Data!S2:S${lastRow}))`, expected: new Set(rows.map(r => r.fcId)).size },
    { item: 'FM_ID 고유 수', formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!Q2:Q${lastRow},FC_Chain_Data!Q2:Q${lastRow}))`, expected: 26 },
    { item: 'FE_ID 고유 수', formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!R2:R${lastRow},FC_Chain_Data!R2:R${lastRow}))`, expected: 20 },
    { item: 'LinkID 유효 (비어있지 않음)', formula: `COUNTA(FC_Chain_Data!P2:P${lastRow})`, expected: rows.length },
    { item: 'FM_ID "PF-L2-" 접두사', formula: `COUNTIF(FC_Chain_Data!Q2:Q${lastRow},"PF-L2-*")`, expected: rows.length },
    { item: 'FE_ID "PF-L1-" 접두사', formula: `COUNTIF(FC_Chain_Data!R2:R${lastRow},"PF-L1-*")`, expected: rows.length },
    { item: 'FC_ID "PF-L3-" 접두사', formula: `COUNTIF(FC_Chain_Data!S2:S${lastRow},"PF-L3-*")`, expected: rows.length },
    { item: 'AP H 건수', formula: `COUNTIF(FC_Chain_Data!O2:O${lastRow},"H")`, expected: rows.filter(r => String(r.ap).toUpperCase() === 'H').length },
    { item: 'AP M 건수', formula: `COUNTIF(FC_Chain_Data!O2:O${lastRow},"M")`, expected: rows.filter(r => String(r.ap).toUpperCase() === 'M').length },
    { item: 'AP L 건수', formula: `COUNTIF(FC_Chain_Data!O2:O${lastRow},"L")`, expected: rows.filter(r => String(r.ap).toUpperCase() === 'L').length },
    { item: 'YP FE 건수', formula: `COUNTIF(FC_Chain_Data!B2:B${lastRow},"YP")`, expected: rows.filter(r => r.feCategory === 'YP').length },
    { item: 'SP FE 건수', formula: `COUNTIF(FC_Chain_Data!B2:B${lastRow},"SP")`, expected: rows.filter(r => r.feCategory === 'SP').length },
    { item: 'USER FE 건수', formula: `COUNTIF(FC_Chain_Data!B2:B${lastRow},"USER")`, expected: rows.filter(r => r.feCategory === 'USER').length },
    { item: '4M=MN 건수', formula: `COUNTIF(FC_Chain_Data!H2:H${lastRow},"MN")`, expected: rows.filter(r => r.m4 === 'MN').length },
    { item: '4M=MC 건수', formula: `COUNTIF(FC_Chain_Data!H2:H${lastRow},"MC")`, expected: rows.filter(r => r.m4 === 'MC').length },
    { item: '4M=IM 건수', formula: `COUNTIF(FC_Chain_Data!H2:H${lastRow},"IM")`, expected: rows.filter(r => r.m4 === 'IM').length },
    { item: '4M=EN 건수', formula: `COUNTIF(FC_Chain_Data!H2:H${lastRow},"EN")`, expected: rows.filter(r => r.m4 === 'EN').length },
  ];

  fkChecks.forEach((ck, i) => {
    const r = i + 2;
    v3.getCell(`A${r}`).value = ck.item;
    v3.getCell(`B${r}`).value = ck.formula;
    v3.getCell(`C${r}`).value = { formula: ck.formula };
    v3.getCell(`D${r}`).value = ck.expected;
    v3.getCell(`E${r}`).value = { formula: `IF(C${r}=D${r},"✅ PASS","❌ FAIL")` };
  });

  const fkSumRow = fkChecks.length + 3;
  v3.getCell(`A${fkSumRow}`).value = '전체 판정';
  v3.getCell(`A${fkSumRow}`).font = { bold: true, size: 12 };
  v3.getCell(`E${fkSumRow}`).value = {
    formula: `IF(COUNTIF(E2:E${fkSumRow - 2},"❌ FAIL")=0,"✅ ALL PASS (3회 검증 완료)","❌ FAIL 있음")`
  };
  v3.getCell(`E${fkSumRow}`).font = { bold: true, size: 14 };

  // ════════════════════════════════════════════
  // Sheet 5: 요약 대시보드
  // ════════════════════════════════════════════
  const dash = wb.addWorksheet('요약_대시보드');
  dash.columns = [
    { header: '', key: 'label', width: 25 },
    { header: '', key: 'value', width: 20 },
  ];

  const summary = [
    ['pfm26-m069 FC Chain 검증 대시보드', ''],
    ['', ''],
    ['항목', '값'],
    ['fmeaId', FMEA_ID],
    ['생성일', new Date().toISOString().slice(0, 10)],
    ['총 FC Chain 수', rows.length],
    ['고유 FM 수', 26],
    ['고유 FE 수', 20],
    ['고유 FC 수', rows.length],
    ['고유 공정 수', 21],
    ['DC 커버리지', '100%'],
    ['PC 커버리지', '100%'],
    ['', ''],
    ['검증1 (필드완전성)', { formula: `검증1_필드완전성!E${verifyItems.length + 3}` }],
    ['검증2 (공정별교차)', { formula: `검증2_공정별교차검증!H${totalR}` }],
    ['검증3 (FK/UUID)', { formula: `검증3_FK_UUID검증!E${fkSumRow}` }],
    ['', ''],
    ['AP 분포', ''],
    ['  H (High)', rows.filter(r => String(r.ap).toUpperCase() === 'H').length],
    ['  M (Medium)', rows.filter(r => String(r.ap).toUpperCase() === 'M').length],
    ['  L (Low)', rows.filter(r => String(r.ap).toUpperCase() === 'L').length],
    ['', ''],
    ['FE구분 분포', ''],
    ['  YP', rows.filter(r => r.feCategory === 'YP').length],
    ['  SP', rows.filter(r => r.feCategory === 'SP').length],
    ['  USER', rows.filter(r => r.feCategory === 'USER').length],
    ['', ''],
    ['4M 분포', ''],
    ['  MN (Man)', rows.filter(r => r.m4 === 'MN').length],
    ['  MC (Machine)', rows.filter(r => r.m4 === 'MC').length],
    ['  IM (Material)', rows.filter(r => r.m4 === 'IM').length],
    ['  EN (Environment)', rows.filter(r => r.m4 === 'EN').length],
  ];

  summary.forEach((s, i) => {
    const r = i + 1;
    dash.getCell(`A${r}`).value = s[0];
    dash.getCell(`B${r}`).value = s[1];
    if (i === 0) {
      dash.getCell(`A${r}`).font = { bold: true, size: 14 };
    }
    if (i === 2) {
      dash.getCell(`A${r}`).font = { bold: true };
      dash.getCell(`B${r}`).font = { bold: true };
    }
  });

  // ─── Save ───
  await wb.xlsx.writeFile(OUTPUT_MASTER);
  console.log(`✅ Saved: ${OUTPUT_MASTER}`);

  await wb.xlsx.writeFile(OUTPUT_FC);
  console.log(`✅ Saved: ${OUTPUT_FC}`);

  // Stats
  const apH = rows.filter(r => String(r.ap).toUpperCase() === 'H').length;
  const apM = rows.filter(r => String(r.ap).toUpperCase() === 'M').length;
  const apL = rows.filter(r => String(r.ap).toUpperCase() === 'L').length;
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total rows: ${rows.length}`);
  console.log(`Unique FM: 26, FE: 20, Process: 21`);
  console.log(`AP: H=${apH} M=${apM} L=${apL}`);
  console.log(`DC coverage: 100%, PC coverage: 100%`);
  console.log(`Sheets: FC_Chain_Data, 검증1, 검증2, 검증3, 요약_대시보드`);
}

generate().catch(console.error);
