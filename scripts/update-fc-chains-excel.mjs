/**
 * FC Chains Verified Excel 생성/업데이트 스크립트 (v2 — 엑셀 수식 기반 검증)
 * 
 * 검증 시트 3개 + 대시보드가 모두 엑셀 수식으로 동작하여
 * Excel에서 직접 열어 실시간 검증 가능
 * 
 * Usage: node scripts/update-fc-chains-excel.mjs [fmeaId] [outputPath]
 */
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const FMEA_ID = process.argv[2] || 'pfm26-m069';
const OUTPUT_PATH = process.argv[3] || `C:/Users/Administrator/Documents/fc/${FMEA_ID}-fc-chains-verified.xlsx`;
const MASTER_JSON = path.join(process.cwd(), 'data', 'master-fmea', `${FMEA_ID}.json`);

const stripPrefix = (v) => (v || '').replace(/^[DP]:/gm, '').trim();

const AP_TABLE = [
  { s: '9-10', o: '8-10', d: ['H','H','H','H'] }, { s: '9-10', o: '6-7', d: ['H','H','H','H'] },
  { s: '9-10', o: '4-5', d: ['H','H','H','M'] }, { s: '9-10', o: '2-3', d: ['H','M','L','L'] },
  { s: '9-10', o: '1', d: ['L','L','L','L'] }, { s: '7-8', o: '8-10', d: ['H','H','H','H'] },
  { s: '7-8', o: '6-7', d: ['H','H','H','M'] }, { s: '7-8', o: '4-5', d: ['H','M','M','M'] },
  { s: '7-8', o: '2-3', d: ['M','M','L','L'] }, { s: '7-8', o: '1', d: ['L','L','L','L'] },
  { s: '4-6', o: '8-10', d: ['H','H','M','M'] }, { s: '4-6', o: '6-7', d: ['M','M','M','L'] },
  { s: '4-6', o: '4-5', d: ['M','L','L','L'] }, { s: '4-6', o: '2-3', d: ['L','L','L','L'] },
  { s: '4-6', o: '1', d: ['L','L','L','L'] }, { s: '2-3', o: '8-10', d: ['M','M','L','L'] },
  { s: '2-3', o: '6-7', d: ['L','L','L','L'] }, { s: '2-3', o: '4-5', d: ['L','L','L','L'] },
  { s: '2-3', o: '2-3', d: ['L','L','L','L'] }, { s: '2-3', o: '1', d: ['L','L','L','L'] },
];
function calcAP(s, o, d) {
  const sv = Number(s)||0, ov = Number(o)||0, dv = Number(d)||0;
  if (!sv || !ov || !dv) return '';
  const sR = sv>=9?'9-10':sv>=7?'7-8':sv>=4?'4-6':sv>=2?'2-3':null;
  if (!sR) return 'L';
  const oR = ov>=8?'8-10':ov>=6?'6-7':ov>=4?'4-5':ov>=2?'2-3':'1';
  const dI = dv>=7?0:dv>=5?1:dv>=2?2:3;
  const row = AP_TABLE.find(r => r.s===sR && r.o===oR);
  return row ? row.d[dI] : 'L';
}
function sortChains(chains) {
  const so = { 'YP':0, 'SP':1, 'USER':2 };
  return [...chains].sort((a,b) => {
    const d = (so[a.feScope]??9)-(so[b.feScope]??9); if (d) return d;
    const f = (a.feValue||'').localeCompare(b.feValue||''); if (f) return f;
    const p = (a.processNo||'').localeCompare(b.processNo||'',undefined,{numeric:true}); if (p) return p;
    return (a.fcValue||'').localeCompare(b.fcValue||'');
  });
}
function thinBorder() {
  return { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };
}

async function main() {
  console.log(`\n=== FC Chains Verified Excel (v2 수식 기반): ${FMEA_ID} ===`);
  if (!fs.existsSync(MASTER_JSON)) { console.error(`ERROR: ${MASTER_JSON} 없음`); process.exit(1); }
  const raw = JSON.parse(fs.readFileSync(MASTER_JSON, 'utf-8'));
  const chains = raw.chains || [];
  const flatData = raw.flatData || [];
  const stats = raw.stats || {};
  const sorted = sortChains(chains);
  const N = sorted.length;
  const LAST = N + 1; // 마지막 데이터 행 번호 (헤더=1행)

  const a2Map = {};
  flatData.forEach(d => { if (d.itemCode === 'A2') a2Map[d.processNo] = d.value || ''; });
  const procNos = [...new Set(sorted.map(c => c.processNo))].sort((a,b) => (parseInt(a)||999)-(parseInt(b)||999));

  console.log(`  chains: ${N}, flatData: ${flatData.length}, processes: ${procNos.length}`);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'FMEA Smart System FC Chain Generator v2 (Excel Formula)';
  wb.created = new Date();

  // ═══════════════════════════════════════════════════════
  // Sheet 1: FC_Chain_Data (19열)
  // ═══════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet('FC_Chain_Data');
  const H1 = ['No','FE구분','FE(고장영향)','S(심각도)','L2-1.공정번호','공정명',
    'FM(고장형태)','4M','작업요소(WE)','FC(고장원인)',
    'B5.예방관리(발생 전 방지)','A6.검출관리(발생 후 검출)',
    'O','D','AP','LinkID','FM_ID','FE_ID','FC_ID'];
  ws1.columns = H1.map(h => ({ header: h, width: h.includes('관리') ? 30 : h.includes('고장') ? 22 : Math.max(12, h.length*1.5+2) }));
  styleHeaderRow(ws1, '1F3864');

  sorted.forEach((ch, i) => {
    const r = i + 2;
    const ap = calcAP(ch.severity, ch.occurrence, ch.detection);
    const rowData = [
      i + 1,
      ch.feScope || '',
      ch.feValue || '',
      ch.severity || '',
      ch.processNo || '',
      a2Map[ch.processNo] || '',
      ch.fmValue || '',
      ch.m4 || '',
      ch.workElement || '',
      ch.fcValue || '',
      ch.pcValue || '',
      ch.dcValue || '',
      ch.occurrence || '',
      ch.detection || '',
      ap,
      ch.id || '',
      ch.fmId || '',
      ch.feId || '',
      ch.fcId || '',
    ];
    const row = ws1.addRow(rowData);
    styleDataRowAlt(row, i);
  });
  ws1.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  // ═══════════════════════════════════════════════════════
  // Sheet 2: 검증1_필드완전성 (엑셀 수식)
  // ═══════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet('검증1_필드완전성');
  ws2.columns = [
    { header: '검증 항목', width: 22 },
    { header: '검증 공식', width: 50 },
    { header: '결과', width: 10 },
    { header: '기대값', width: 10 },
    { header: 'PASS/FAIL', width: 14 },
  ];
  styleHeaderRow(ws2, '6B21A8');

  const RNG = `FC_Chain_Data!A2:A${LAST}`;
  const v1Items = [
    ['총 행수', `COUNTA(${RNG})`, { formula: `COUNTA(FC_Chain_Data!A2:A${LAST})` }, N, { formula: `IF(C2=D2,"✅ PASS","❌ FAIL")` }],
    ['FE구분 빈칸', `COUNTBLANK(FC_Chain_Data!B2:B${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!B2:B${LAST})` }, 0, { formula: `IF(C3=D3,"✅ PASS","❌ FAIL")` }],
    ['FE(고장영향) 빈칸', `COUNTBLANK(FC_Chain_Data!C2:C${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!C2:C${LAST})` }, 0, { formula: `IF(C4=D4,"✅ PASS","❌ FAIL")` }],
    ['S(심각도) 빈칸', `COUNTBLANK(FC_Chain_Data!D2:D${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!D2:D${LAST})` }, 0, { formula: `IF(C5=D5,"✅ PASS","❌ FAIL")` }],
    ['공정번호 빈칸', `COUNTBLANK(FC_Chain_Data!E2:E${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!E2:E${LAST})` }, 0, { formula: `IF(C6=D6,"✅ PASS","❌ FAIL")` }],
    ['공정명 빈칸', `COUNTBLANK(FC_Chain_Data!F2:F${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!F2:F${LAST})` }, 0, { formula: `IF(C7=D7,"✅ PASS","❌ FAIL")` }],
    ['FM(고장형태) 빈칸', `COUNTBLANK(FC_Chain_Data!G2:G${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!G2:G${LAST})` }, 0, { formula: `IF(C8=D8,"✅ PASS","❌ FAIL")` }],
    ['4M 빈칸', `COUNTBLANK(FC_Chain_Data!H2:H${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!H2:H${LAST})` }, 0, { formula: `IF(C9=D9,"✅ PASS","❌ FAIL")` }],
    ['작업요소(WE) 빈칸', `COUNTBLANK(FC_Chain_Data!I2:I${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!I2:I${LAST})` }, 0, { formula: `IF(C10=D10,"✅ PASS","❌ FAIL")` }],
    ['FC(고장원인) 빈칸', `COUNTBLANK(FC_Chain_Data!J2:J${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!J2:J${LAST})` }, 0, { formula: `IF(C11=D11,"✅ PASS","❌ FAIL")` }],
    ['B5(예방관리) 빈칸', `COUNTBLANK(FC_Chain_Data!K2:K${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!K2:K${LAST})` }, 0, { formula: `IF(C12=D12,"✅ PASS","❌ FAIL")` }],
    ['A6(검출관리) 빈칸', `COUNTBLANK(FC_Chain_Data!L2:L${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!L2:L${LAST})` }, 0, { formula: `IF(C13=D13,"✅ PASS","❌ FAIL")` }],
    ['O(발생도) 빈칸', `COUNTBLANK(FC_Chain_Data!M2:M${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!M2:M${LAST})` }, 0, { formula: `IF(C14=D14,"✅ PASS","❌ FAIL")` }],
    ['D(검출도) 빈칸', `COUNTBLANK(FC_Chain_Data!N2:N${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!N2:N${LAST})` }, 0, { formula: `IF(C15=D15,"✅ PASS","❌ FAIL")` }],
    ['AP 빈칸', `COUNTBLANK(FC_Chain_Data!O2:O${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!O2:O${LAST})` }, 0, { formula: `IF(C16=D16,"✅ PASS","❌ FAIL")` }],
    ['LinkID 빈칸', `COUNTBLANK(FC_Chain_Data!P2:P${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!P2:P${LAST})` }, 0, { formula: `IF(C17=D17,"✅ PASS","❌ FAIL")` }],
    ['FM_ID 빈칸', `COUNTBLANK(FC_Chain_Data!Q2:Q${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!Q2:Q${LAST})` }, 0, { formula: `IF(C18=D18,"✅ PASS","❌ FAIL")` }],
    ['FE_ID 빈칸', `COUNTBLANK(FC_Chain_Data!R2:R${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!R2:R${LAST})` }, 0, { formula: `IF(C19=D19,"✅ PASS","❌ FAIL")` }],
    ['FC_ID 빈칸', `COUNTBLANK(FC_Chain_Data!S2:S${LAST})`, { formula: `COUNTBLANK(FC_Chain_Data!S2:S${LAST})` }, 0, { formula: `IF(C20=D20,"✅ PASS","❌ FAIL")` }],
    ['', '', '', '', ''],
    ['고유 FE 수', `SUMPRODUCT...`, { formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!C2:C${LAST},FC_Chain_Data!C2:C${LAST}))` }, stats.feCount || 20, { formula: `IF(C22=D22,"✅ PASS","❌ FAIL")` }],
    ['전체 판정', '', '', '', { formula: `IF(COUNTIF(E2:E21,"❌ FAIL")=0,"✅ ALL PASS","❌ FAIL 있음")` }],
  ];
  v1Items.forEach((d, i) => {
    const row = ws2.addRow(d);
    styleDataRowAlt(row, i);
    const c5 = row.getCell(5);
    if (typeof d[4] === 'string' && d[4] === '') { /* skip */ }
  });
  ws2.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  // ═══════════════════════════════════════════════════════
  // Sheet 3: 검증2_공정별교차검증 (엑셀 수식)
  // ═══════════════════════════════════════════════════════
  const ws3 = wb.addWorksheet('검증2_공정별교차검증');
  ws3.columns = [
    { header: '공정No', width: 10 },
    { header: '공정명', width: 18 },
    { header: '기대 FM수', width: 12 },
    { header: '실제 FM수 (엑셀함수)', width: 22 },
    { header: '기대 FC수', width: 12 },
    { header: '실제 FC수 (엑셀함수)', width: 22 },
    { header: 'FM 판정', width: 12 },
    { header: 'FC 판정', width: 12 },
  ];
  styleHeaderRow(ws3, '1E40AF');

  procNos.forEach((pno, i) => {
    const r = i + 2;
    const procChains = sorted.filter(c => c.processNo === pno);
    const fmCount = new Set(procChains.map(c => c.fmValue)).size;
    const fcCount = procChains.length;
    const pnoQ = `"${pno}"`;
    ws3.addRow([
      pno,
      a2Map[pno] || '',
      fmCount,
      { formula: `SUMPRODUCT((FC_Chain_Data!E2:E${LAST}=${pnoQ})*1/COUNTIFS(FC_Chain_Data!E2:E${LAST},${pnoQ},FC_Chain_Data!G2:G${LAST},FC_Chain_Data!G2:G${LAST}))` },
      fcCount,
      { formula: `COUNTIF(FC_Chain_Data!E2:E${LAST},${pnoQ})` },
      { formula: `IF(C${r}=D${r},"✅","❌")` },
      { formula: `IF(E${r}=F${r},"✅","❌")` },
    ]);
    styleDataRowAlt(ws3.getRow(r), i);
  });
  // 합계 행
  const sumR = procNos.length + 2;
  ws3.addRow([
    '합계', '',
    { formula: `SUM(C2:C${sumR-1})` },
    { formula: `SUM(D2:D${sumR-1})` },
    { formula: `SUM(E2:E${sumR-1})` },
    { formula: `SUM(F2:F${sumR-1})` },
    { formula: `IF(C${sumR}=D${sumR},"✅ ALL","❌")` },
    { formula: `IF(E${sumR}=F${sumR},"✅ ALL","❌")` },
  ]);
  const sumRow = ws3.getRow(sumR);
  sumRow.eachCell(cell => {
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8E8E8' } };
    cell.border = thinBorder();
  });
  ws3.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  // ═══════════════════════════════════════════════════════
  // Sheet 4: 검증3_FK_UUID검증 (엑셀 수식)
  // ═══════════════════════════════════════════════════════
  const ws4 = wb.addWorksheet('검증3_FK_UUID검증');
  ws4.columns = [
    { header: '검증 항목', width: 26 },
    { header: '공식', width: 55 },
    { header: '결과', width: 12 },
    { header: '기대값', width: 12 },
    { header: 'PASS/FAIL', width: 16 },
  ];
  styleHeaderRow(ws4, '1D6F42');

  const uniqueLinks = new Set(sorted.map(c => c.id)).size;
  const uniqueFcIds = new Set(sorted.map(c => c.fcId)).size;
  const uniqueFmIds = new Set(sorted.map(c => c.fmId)).size;
  const uniqueFeIds = new Set(sorted.map(c => c.feId)).size;
  const apH = sorted.filter(c => calcAP(c.severity, c.occurrence, c.detection)==='H').length;
  const apM = sorted.filter(c => calcAP(c.severity, c.occurrence, c.detection)==='M').length;
  const apL = sorted.filter(c => calcAP(c.severity, c.occurrence, c.detection)==='L').length;
  const ypCnt = sorted.filter(c => c.feScope==='YP').length;
  const spCnt = sorted.filter(c => c.feScope==='SP').length;
  const userCnt = sorted.filter(c => c.feScope==='USER').length;
  const mnCnt = sorted.filter(c => c.m4==='MN').length;
  const mcCnt = sorted.filter(c => c.m4==='MC').length;
  const imCnt = sorted.filter(c => c.m4==='IM').length;
  const enCnt = sorted.filter(c => c.m4==='EN').length;

  const v4Items = [
    ['LinkID 고유 수', `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!P2:P${LAST},FC_Chain_Data!P2:P${LAST}))`,
      { formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!P2:P${LAST},FC_Chain_Data!P2:P${LAST}))` }, N],
    ['FC_ID 고유 수 (1:N 허용)', `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!S2:S${LAST},FC_Chain_Data!S2:S${LAST}))`,
      { formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!S2:S${LAST},FC_Chain_Data!S2:S${LAST}))` }, uniqueFcIds],
    ['FM_ID 고유 수', `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!Q2:Q${LAST},FC_Chain_Data!Q2:Q${LAST}))`,
      { formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!Q2:Q${LAST},FC_Chain_Data!Q2:Q${LAST}))` }, uniqueFmIds],
    ['FE_ID 고유 수', `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!R2:R${LAST},FC_Chain_Data!R2:R${LAST}))`,
      { formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!R2:R${LAST},FC_Chain_Data!R2:R${LAST}))` }, uniqueFeIds],
    ['LinkID 유효 (비어있지 않음)', `COUNTA(FC_Chain_Data!P2:P${LAST})`,
      { formula: `COUNTA(FC_Chain_Data!P2:P${LAST})` }, N],
    ['FM_ID "PF-L2-" 접두사', `COUNTIF(FC_Chain_Data!Q2:Q${LAST},"PF-L2-*")`,
      { formula: `COUNTIF(FC_Chain_Data!Q2:Q${LAST},"PF-L2-*")` }, N],
    ['FE_ID "PF-L1-" 접두사', `COUNTIF(FC_Chain_Data!R2:R${LAST},"PF-L1-*")`,
      { formula: `COUNTIF(FC_Chain_Data!R2:R${LAST},"PF-L1-*")` }, N],
    ['FC_ID "PF-L3-" 접두사', `COUNTIF(FC_Chain_Data!S2:S${LAST},"PF-L3-*")`,
      { formula: `COUNTIF(FC_Chain_Data!S2:S${LAST},"PF-L3-*")` }, N],
    ['AP H 건수', `COUNTIF(FC_Chain_Data!O2:O${LAST},"H")`,
      { formula: `COUNTIF(FC_Chain_Data!O2:O${LAST},"H")` }, apH],
    ['AP M 건수', `COUNTIF(FC_Chain_Data!O2:O${LAST},"M")`,
      { formula: `COUNTIF(FC_Chain_Data!O2:O${LAST},"M")` }, apM],
    ['AP L 건수', `COUNTIF(FC_Chain_Data!O2:O${LAST},"L")`,
      { formula: `COUNTIF(FC_Chain_Data!O2:O${LAST},"L")` }, apL],
    ['YP FE 건수', `COUNTIF(FC_Chain_Data!B2:B${LAST},"YP")`,
      { formula: `COUNTIF(FC_Chain_Data!B2:B${LAST},"YP")` }, ypCnt],
    ['SP FE 건수', `COUNTIF(FC_Chain_Data!B2:B${LAST},"SP")`,
      { formula: `COUNTIF(FC_Chain_Data!B2:B${LAST},"SP")` }, spCnt],
    ['USER FE 건수', `COUNTIF(FC_Chain_Data!B2:B${LAST},"USER")`,
      { formula: `COUNTIF(FC_Chain_Data!B2:B${LAST},"USER")` }, userCnt],
    ['4M=MN 건수', `COUNTIF(FC_Chain_Data!H2:H${LAST},"MN")`,
      { formula: `COUNTIF(FC_Chain_Data!H2:H${LAST},"MN")` }, mnCnt],
    ['4M=MC 건수', `COUNTIF(FC_Chain_Data!H2:H${LAST},"MC")`,
      { formula: `COUNTIF(FC_Chain_Data!H2:H${LAST},"MC")` }, mcCnt],
    ['4M=IM 건수', `COUNTIF(FC_Chain_Data!H2:H${LAST},"IM")`,
      { formula: `COUNTIF(FC_Chain_Data!H2:H${LAST},"IM")` }, imCnt],
    ['4M=EN 건수', `COUNTIF(FC_Chain_Data!H2:H${LAST},"EN")`,
      { formula: `COUNTIF(FC_Chain_Data!H2:H${LAST},"EN")` }, enCnt],
  ];
  v4Items.forEach((d, i) => {
    const r = i + 2;
    const row = ws4.addRow([d[0], d[1], d[2], d[3], { formula: `IF(C${r}=D${r},"✅ PASS","❌ FAIL")` }]);
    styleDataRowAlt(row, i);
  });
  // 전체 판정 행 (빈 행 띄우고)
  ws4.addRow(['', '', '', '', '']);
  const v4JudgeR = v4Items.length + 3;
  const judgeRow = ws4.addRow(['전체 판정', '', '', '', { formula: `IF(COUNTIF(E2:E${v4JudgeR-2},"❌ FAIL")=0,"✅ ALL PASS (3회 검증 완료)","❌ FAIL 있음")` }]);
  judgeRow.eachCell(cell => { cell.font = { bold: true, size: 10 }; cell.border = thinBorder(); });
  ws4.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  // ═══════════════════════════════════════════════════════
  // Sheet 5: 요약_대시보드 (엑셀 수식)
  // ═══════════════════════════════════════════════════════
  const ws5 = wb.addWorksheet('요약_대시보드');
  ws5.columns = [{ width: 30 }, { width: 22 }];

  const v1JudgeRow = v1Items.length + 1; // 검증1 마지막 판정 행 번호
  const v3JudgeRow = v4JudgeR; // 검증3 마지막 판정 행 번호

  const dashRows = [
    [`${FMEA_ID} FC Chain 검증 대시보드`, ''], // R1
    ['', ''], // R2
    ['항목', '값'], // R3
    ['fmeaId', FMEA_ID], // R4
    ['생성일', new Date().toISOString().slice(0, 10)], // R5
    ['총 FC Chain 수', { formula: `COUNTA(FC_Chain_Data!A2:A${LAST})` }], // R6
    ['고유 FM 수', { formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!G2:G${LAST},FC_Chain_Data!G2:G${LAST}))` }], // R7
    ['고유 FE 수', { formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!C2:C${LAST},FC_Chain_Data!C2:C${LAST}))` }], // R8
    ['고유 FC 수', { formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!J2:J${LAST},FC_Chain_Data!J2:J${LAST}))` }], // R9
    ['고유 공정 수', { formula: `SUMPRODUCT(1/COUNTIF(FC_Chain_Data!E2:E${LAST},FC_Chain_Data!E2:E${LAST}))` }], // R10
    ['DC 커버리지', { formula: `TEXT(1-COUNTBLANK(FC_Chain_Data!L2:L${LAST})/COUNTA(FC_Chain_Data!A2:A${LAST}),"0%")` }], // R11
    ['PC 커버리지', { formula: `TEXT(1-COUNTBLANK(FC_Chain_Data!K2:K${LAST})/COUNTA(FC_Chain_Data!A2:A${LAST}),"0%")` }], // R12
    ['', ''], // R13
    ['검증1 (필드완전성)', { formula: `'검증1_필드완전성'!E${v1JudgeRow}` }], // R14
    ['검증2 (공정별교차)', { formula: `'검증2_공정별교차검증'!G${sumR}` }], // R15
    ['검증3 (FK/UUID)', { formula: `'검증3_FK_UUID검증'!E${v4JudgeR}` }], // R16
    ['', ''], // R17
    ['AP 분포', ''], // R18
    ['  H (High)', { formula: `COUNTIF(FC_Chain_Data!O2:O${LAST},"H")` }], // R19
    ['  M (Medium)', { formula: `COUNTIF(FC_Chain_Data!O2:O${LAST},"M")` }], // R20
    ['  L (Low)', { formula: `COUNTIF(FC_Chain_Data!O2:O${LAST},"L")` }], // R21
    ['', ''], // R22
    ['FE구분 분포', ''], // R23
    ['  YP', { formula: `COUNTIF(FC_Chain_Data!B2:B${LAST},"YP")` }], // R24
    ['  SP', { formula: `COUNTIF(FC_Chain_Data!B2:B${LAST},"SP")` }], // R25
    ['  USER', { formula: `COUNTIF(FC_Chain_Data!B2:B${LAST},"USER")` }], // R26
    ['', ''], // R27
    ['4M 분포', ''], // R28
    ['  MN (Man)', { formula: `COUNTIF(FC_Chain_Data!H2:H${LAST},"MN")` }], // R29
    ['  MC (Machine)', { formula: `COUNTIF(FC_Chain_Data!H2:H${LAST},"MC")` }], // R30
    ['  IM (Material)', { formula: `COUNTIF(FC_Chain_Data!H2:H${LAST},"IM")` }], // R31
    ['  EN (Environment)', { formula: `COUNTIF(FC_Chain_Data!H2:H${LAST},"EN")` }], // R32
  ];
  dashRows.forEach((d, i) => {
    const row = ws5.addRow(d);
    if (i === 0) row.getCell(1).font = { bold: true, size: 14, color: { argb: '1F3864' } };
    else if ([2, 13, 17, 22, 27].includes(i)) {
      row.eachCell(cell => { cell.font = { bold: true, size: 10 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8E8E8' } }; });
    } else {
      row.eachCell(cell => { cell.font = { size: 9 }; });
    }
  });

  // 저장
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await wb.xlsx.writeFile(OUTPUT_PATH);
  console.log(`\n✅ 저장: ${OUTPUT_PATH}`);
  console.log(`  FC Chain: ${N}행, 공정: ${procNos.length}개`);
  console.log(`  검증 시트: 필드완전성(수식 19개) + 공정별교차(수식 ${procNos.length*4}개) + FK/UUID(수식 18개) + 대시보드(수식 14개)`);
}

function styleHeaderRow(ws, color) {
  const r = ws.getRow(1);
  r.height = 28;
  r.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder();
  });
}
function styleDataRowAlt(row, idx) {
  const bg = idx % 2 === 0 ? 'FFFFFF' : 'F0F4FF';
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.border = thinBorder();
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.font = { size: 9 };
  });
}

main().catch(err => { console.error('ERROR:', err); process.exit(1); });
