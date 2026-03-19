/**
 * @file generate-import-compatible.mjs
 * @description 기존 Import 성공 구조에 맞는 FMEA Master Excel 생성
 *
 * 데이터 소스: data/master-fmea/{fmeaId}.json (flatData + chains)
 * 
 * 기존 성공 파일(m069 REF) 구조와 100% 동일:
 *   Sheet1: L1 통합(C1-C4) — 4열
 *   Sheet2: L2 통합(A1-A6) — 7열 (carry-forward A5)
 *   Sheet3: L3 통합(B1-B5) — 8열 (chains-driven B3-B4 매칭)
 *   Sheet4: FC 고장사슬    — 13열 (S/O/D/AP 포함)
 *   Sheet5: FA 통합분석    — 26열 (DC/PC 추천 포함)
 *   Sheet6: VERIFY         — 3열 (엑셀 수식)
 *
 * Usage: node scripts/generate-import-compatible.mjs [fmeaId]
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const FMEA_ID = process.argv[2] || 'pfm26-m066';
const MASTER_JSON = path.join(process.cwd(), 'data', 'master-fmea', `${FMEA_ID}.json`);
const OUTPUT_DIR = 'C:/Users/Administrator/Documents/fc';
const OUTPUT_PATH = `${OUTPUT_DIR}/PFMEA_Master_Import_${FMEA_ID}_${new Date().toISOString().slice(0, 10)}.xlsx`;

const HEADER_BG = '00587A';
const FC_BG = 'B91C1C';
const FA_BG = '1E40AF';
const VER_BG = '6B21A8';
const stripPrefix = (v) => (v || '').replace(/^[PD]:/gm, '').trim();

const AP_TABLE = [
  { s: '9-10', o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '6-7', d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '4-5', d: ['H', 'H', 'H', 'M'] },
  { s: '9-10', o: '2-3', d: ['H', 'M', 'L', 'L'] },
  { s: '9-10', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '7-8', o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '7-8', o: '6-7', d: ['H', 'H', 'H', 'M'] },
  { s: '7-8', o: '4-5', d: ['H', 'M', 'M', 'M'] },
  { s: '7-8', o: '2-3', d: ['M', 'M', 'L', 'L'] },
  { s: '7-8', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '4-6', o: '8-10', d: ['H', 'H', 'M', 'M'] },
  { s: '4-6', o: '6-7', d: ['M', 'M', 'M', 'L'] },
  { s: '4-6', o: '4-5', d: ['M', 'L', 'L', 'L'] },
  { s: '4-6', o: '2-3', d: ['L', 'L', 'L', 'L'] },
  { s: '4-6', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '8-10', d: ['M', 'M', 'L', 'L'] },
  { s: '2-3', o: '6-7', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '4-5', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '2-3', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '1', d: ['L', 'L', 'L', 'L'] },
];

function calcAP(s, o, d) {
  const sv = Number(s) || 0, ov = Number(o) || 0, dv = Number(d) || 0;
  if (sv === 0 || ov === 0 || dv === 0) return '';
  const sRange = sv >= 9 ? '9-10' : sv >= 7 ? '7-8' : sv >= 4 ? '4-6' : sv >= 2 ? '2-3' : null;
  if (!sRange) return 'L';
  const oRange = ov >= 8 ? '8-10' : ov >= 6 ? '6-7' : ov >= 4 ? '4-5' : ov >= 2 ? '2-3' : '1';
  const dIdx = dv >= 7 ? 0 : dv >= 5 ? 1 : dv >= 2 ? 2 : 3;
  const row = AP_TABLE.find(r => r.s === sRange && r.o === oRange);
  return row ? row.d[dIdx] : 'L';
}

function sortChains(chains) {
  const scopeOrder = { YP: 0, SP: 1, USER: 2 };
  return [...chains].sort((a, b) => {
    const sA = scopeOrder[a.feScope] ?? 9, sB = scopeOrder[b.feScope] ?? 9;
    if (sA !== sB) return sA - sB;
    const feCmp = (a.feValue || '').localeCompare(b.feValue || '');
    if (feCmp !== 0) return feCmp;
    const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
    if (pCmp !== 0) return pCmp;
    return (a.fcValue || '').localeCompare(b.fcValue || '');
  });
}

async function main() {
  console.log(`\n=== Import 호환 Master FMEA 생성: ${FMEA_ID} ===`);

  if (!fs.existsSync(MASTER_JSON)) {
    throw new Error(`Master JSON 없음: ${MASTER_JSON}\n먼저 export-master 실행: Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/export-master" -Method POST -Body '{"fmeaId":"${FMEA_ID}"}' -ContentType "application/json"`);
  }

  const raw = JSON.parse(fs.readFileSync(MASTER_JSON, 'utf-8'));
  const flatData = raw.flatData || [];
  const chains = raw.chains || [];
  console.log(`  flatData: ${flatData.length}, chains: ${chains.length}`);

  // chains에서 누락된 B4/B5 보충
  const b1Items = flatData.filter(d => d.itemCode === 'B1');
  const b4Set = new Set(flatData.filter(d => d.itemCode === 'B4').map(d => d.value));
  let supplemented = 0;
  for (const chain of chains) {
    const pNo = chain.processNo || '';
    const m4 = chain.m4 || '';
    const we = chain.workElement || '';
    if (chain.fcValue && !b4Set.has(chain.fcValue)) {
      const parentB1 = b1Items.find(b => b.processNo === pNo && (b.m4 || '') === m4 && b.value === we);
      const b3Items = flatData.filter(d => d.itemCode === 'B3' && d.parentItemId === parentB1?.id);
      const parentB3 = b3Items.find(b => b.value === chain.processChar);
      flatData.push({
        id: `SUPP-B4-${pNo}-${m4}-${supplemented}`,
        itemCode: 'B4', processNo: pNo, m4,
        value: chain.fcValue,
        parentItemId: parentB3?.id || parentB1?.id || '',
      });
      b4Set.add(chain.fcValue);
      supplemented++;
    }
    if (chain.pcValue) {
      const parentB1 = b1Items.find(b => b.processNo === pNo && (b.m4 || '') === m4 && b.value === we);
      if (parentB1 && !flatData.some(d => d.itemCode === 'B5' && d.id.startsWith(parentB1.id))) {
        flatData.push({
          id: `${parentB1.id}-V-1`, itemCode: 'B5', processNo: pNo, m4,
          value: chain.pcValue,
        });
        supplemented++;
      }
    }
  }
  if (supplemented > 0) console.log(`  [보충] chains에서 ${supplemented}건 flatData 추가`);

  // ═══ Sheet1: L1 통합(C1-C4) ═══
  const l1Rows = [];
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
      l1Rows.push([
        scope,
        c2Items[i]?.value || lastC2,
        c3Items[i]?.value || lastC3,
        c4Items[i]?.value || lastC4,
      ]);
    }
  }

  // ═══ Sheet2: L2 통합(A1-A6) — carry-forward (generate-master-sample 동일 로직) ═══
  const l2Rows = [];
  const procNos = [...new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo))];
  for (const pNo of procNos) {
    const a2Val = flatData.find(d => d.itemCode === 'A2' && d.processNo === pNo)?.value || '';
    const a3Items = flatData.filter(d => d.itemCode === 'A3' && d.processNo === pNo);
    const a4Items = flatData.filter(d => d.itemCode === 'A4' && d.processNo === pNo);
    const a5Items = flatData.filter(d => d.itemCode === 'A5' && d.processNo === pNo);
    const a6Items = flatData.filter(d => d.itemCode === 'A6' && d.processNo === pNo);

    if (a6Items.length === 0) {
      const chainDC = chains.find(c => c.processNo === pNo && c.dcValue?.trim());
      if (chainDC) a6Items.push({ value: chainDC.dcValue, itemCode: 'A6', processNo: pNo });
    }

    // A6은 행 확장 기준에서 제외 (REF 구조: A6은 첫 행에만, A4/A5가 행수 결정)
    const maxLen = Math.max(1, a3Items.length, a4Items.length, a5Items.length);
    let lastA3 = '', lastA4 = '', lastA4Sp = '', lastA5 = '';
    const a6First = a6Items.length > 0 ? stripPrefix(a6Items[0].value) : '';
    for (let i = 0; i < maxLen; i++) {
      if (a3Items[i]?.value) lastA3 = a3Items[i].value;
      if (a4Items[i]?.value) { lastA4 = a4Items[i].value; lastA4Sp = a4Items[i].specialChar || ''; }
      if (a5Items[i]?.value) lastA5 = a5Items[i].value;
      l2Rows.push([
        pNo, a2Val,
        a3Items[i]?.value || lastA3,
        a4Items[i]?.value || lastA4,
        a4Items[i]?.specialChar ?? lastA4Sp,
        a5Items[i]?.value || lastA5,
        i === 0 ? a6First : '',
      ]);
    }
  }

  // ═══ Sheet3: L3 통합(B1-B5) — CHAIN-DRIVEN (generate-master-sample v4 동일) ═══
  const l3Rows = [];
  const chainsByB1Key = new Map();
  for (const ch of chains) {
    const key = `${ch.processNo || ''}|${ch.m4 || ''}|${ch.workElement || ''}`;
    if (!chainsByB1Key.has(key)) chainsByB1Key.set(key, []);
    chainsByB1Key.get(key).push(ch);
  }

  const processedB1Keys = new Set();
  for (const b1 of b1Items) {
    const pNo = b1.processNo;
    const m4 = b1.m4 || '';
    const key = `${pNo}|${m4}|${b1.value || ''}`;
    if (processedB1Keys.has(key)) continue;
    processedB1Keys.add(key);

    const b1Chains = chainsByB1Key.get(key) || [];
    if (b1Chains.length > 0) {
      for (const ch of b1Chains) {
        let pc = ch.processChar || '';
        if (!pc.trim() && ch.fcValue) {
          pc = ch.fcValue.replace(/\s*부적합$/, '') + ' 관리 특성';
        }
        l3Rows.push([
          pNo, m4,
          b1.value || ch.workElement || '',
          ch.l3Function || '',
          pc,
          ch.specialChar || '',
          ch.fcValue || '',
          stripPrefix(ch.pcValue || ''),
        ]);
      }
    } else {
      const b1Id = b1.id;
      const b2Items = flatData.filter(d => d.itemCode === 'B2' && d.parentItemId === b1Id);
      const b3Items = flatData.filter(d => d.itemCode === 'B3' && d.parentItemId === b1Id);
      const b3IdSet = new Set(b3Items.map(x => x.id));
      const b4Items = flatData.filter(d => d.itemCode === 'B4' && b3IdSet.has(d.parentItemId));
      const b5Items = flatData.filter(d => d.itemCode === 'B5' && d.id.startsWith(b1Id));

      if (b3Items.length > 0 && b4Items.length === 0) {
        for (const b3 of b3Items) {
          const matchChain = chains.find(c => c.processNo === pNo && (c.m4 || '') === m4 && c.processChar === b3.value);
          if (matchChain) {
            b4Items.push({ value: matchChain.fcValue });
            if (b5Items.length === 0 && matchChain.pcValue) b5Items.push({ value: matchChain.pcValue });
          }
        }
      }

      if (b2Items.length === 0 && b3Items.length === 0 && b4Items.length === 0) continue;
      // B4 > B3 → B3 자동보충 (B4 기반 공정특성 생성)
      while (b3Items.length < b4Items.length) {
        const fc = b4Items[b3Items.length]?.value || '';
        b3Items.push({ value: fc.replace(/\s*부적합$/, '') + ' 관리 특성', specialChar: '' });
      }
      const maxLen = Math.max(1, b2Items.length, b3Items.length, b4Items.length, b5Items.length);
      for (let i = 0; i < maxLen; i++) {
        l3Rows.push([
          pNo, m4,
          b1.value || '',
          b2Items[i]?.value || '',
          b3Items[i]?.value || '',
          b3Items[i]?.specialChar || '',
          b4Items[i]?.value || '',
          b5Items[i] ? stripPrefix(b5Items[i].value) : '',
        ]);
      }
    }
  }
  for (const [key, chArr] of chainsByB1Key) {
    if (processedB1Keys.has(key)) continue;
    processedB1Keys.add(key);
    for (const ch of chArr) {
      let pc = ch.processChar || '';
      if (!pc.trim() && ch.fcValue) {
        pc = ch.fcValue.replace(/\s*부적합$/, '') + ' 관리 특성';
      }
      l3Rows.push([
        ch.processNo || '', ch.m4 || '',
        ch.workElement || '', ch.l3Function || '',
        pc, ch.specialChar || '',
        ch.fcValue || '', stripPrefix(ch.pcValue || ''),
      ]);
    }
  }

  // ═══ Sheet4: FC 고장사슬 — 13열 (S/O/D/AP 포함, master-sample 동일) ═══
  const sortedChains = sortChains(chains);
  const fcRows = sortedChains.map(ch => [
    ch.feScope || '',
    ch.feValue || '',
    ch.processNo || '',
    ch.fmValue || '',
    ch.m4 || '',
    ch.workElement || '',
    ch.fcValue || '',
    stripPrefix(ch.pcValue || ''),
    stripPrefix(ch.dcValue || ''),
    ch.severity ? String(ch.severity) : '',
    ch.occurrence ? String(ch.occurrence) : '',
    ch.detection ? String(ch.detection) : '',
    calcAP(ch.severity, ch.occurrence, ch.detection),
  ]);

  // ═══ Sheet5: FA 통합분석 — 26열 (REF 구조: DC/PC 추천 포함) ═══
  const a2Map = {}, a3Map = {}, c2Map = {}, c3Map = {};
  flatData.forEach(d => {
    if (d.itemCode === 'A2') a2Map[d.processNo] = d.value || '';
    if (d.itemCode === 'A3' && !a3Map[d.processNo]) a3Map[d.processNo] = d.value || '';
    if (d.itemCode === 'C2' && !c2Map[d.processNo]) c2Map[d.processNo] = d.value || '';
    if (d.itemCode === 'C3' && !c3Map[d.processNo]) c3Map[d.processNo] = d.value || '';
  });

  const faRows = sortedChains.map(ch => {
    const pNo = ch.processNo || '';
    const scope = ch.feScope || '';
    return [
      scope,                                                  // C1
      c2Map[scope] || '',                                     // C2
      c3Map[scope] || '',                                     // C3
      pNo,                                                    // A1
      a2Map[pNo] || '',                                       // A2
      a3Map[pNo] || ch.l2Function || '',                     // A3
      ch.productChar || '',                                   // A4
      ch.specialChar || '',                                   // A4 특별특성
      ch.m4 || '',                                            // 4M
      ch.workElement || '',                                   // B1
      ch.l3Function || '',                                    // B2
      ch.processChar || '',                                   // B3
      ch.specialChar || '',                                   // B3 특별특성
      ch.feValue || '',                                       // C4
      ch.fmValue || '',                                       // A5
      ch.fcValue || '',                                       // B4
      ch.severity ? String(ch.severity) : '',                // S
      ch.occurrence ? String(ch.occurrence) : '',             // O
      ch.detection ? String(ch.detection) : '',              // D
      calcAP(ch.severity, ch.occurrence, ch.detection),      // AP
      stripPrefix(ch.dcValue || ''),                          // DC추천1
      '',                                                     // DC추천2
      stripPrefix(ch.pcValue || ''),                          // PC추천1
      '',                                                     // PC추천2
      '',                                                     // O추천
      '',                                                     // D추천
    ];
  });

  // ═══ Excel 생성 ═══
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FMEA Import Compatible Generator';
  wb.created = new Date();

  const sheets = [
    { name: 'L1 통합(C1-C4)', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)'], data: l1Rows, bg: HEADER_BG },
    { name: 'L2 통합(A1-A6)', headers: ['A1.공정번호', 'A2.공정명', 'A3.공정기능', 'A4.제품특성', '특별특성', 'A5.고장형태', 'A6.검출관리'], data: l2Rows, bg: HEADER_BG },
    { name: 'L3 통합(B1-B5)', headers: ['공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성', '고장원인(B4)', '예방관리(B5)'], data: l3Rows, bg: HEADER_BG },
    { name: 'FC 고장사슬', headers: ['FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)', '4M', '작업요소(WE)', 'FC(고장원인)', 'B5.예방관리(발생 전 방지)', 'A6.검출관리(발생 후 검출)', 'S', 'O', 'D', 'AP'], data: fcRows, bg: FC_BG },
    {
      name: 'FA 통합분석',
      headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '공정No(A1)', '공정명(A2)', '공정기능(A3)', '제품특성(A4)', '특별특성(A4)', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성(B3)', '고장영향(C4)', '고장형태(A5)', '고장원인(B4)', 'S', 'O', 'D', 'AP', 'DC추천1', 'DC추천2', 'PC추천1', 'PC추천2', 'O추천', 'D추천'],
      data: faRows, bg: FA_BG,
    },
  ];

  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    ws.columns = s.headers.map(h => ({ header: h, width: Math.max(14, h.length * 1.5 + 4) }));
    const hr = ws.getRow(1);
    hr.height = 24;
    hr.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + s.bg } };
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      c.border = thinBorder();
    });
    for (const [idx, row] of s.data.entries()) {
      const r = ws.addRow(row);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF0F7FB';
      r.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        c.alignment = { vertical: 'top', wrapText: true };
        c.font = { size: 9 };
        c.border = thinBorder();
      });
    }
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  }

  // VERIFY 시트 (엑셀 수식)
  const vws = wb.addWorksheet('VERIFY');
  vws.columns = [
    { header: '검증항목', width: 20 },
    { header: '엑셀수식값', width: 15 },
    { header: '설명', width: 50 },
  ];
  const vhr = vws.getRow(1);
  vhr.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + VER_BG } };
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.border = thinBorder();
  });

  const LAST_L2 = l2Rows.length + 1;
  const LAST_L3 = l3Rows.length + 1;
  const LAST_FC = fcRows.length + 1;
  const LAST_L1 = l1Rows.length + 1;

  const verifyData = [
    ['FM_COUNT', { formula: `COUNTA('L2 통합(A1-A6)'!F2:F${LAST_L2})-COUNTBLANK('L2 통합(A1-A6)'!F2:F${LAST_L2})` }, 'A5 고장형태 건수 (헤더 제외)'],
    ['FC_COUNT', { formula: `COUNTA('L3 통합(B1-B5)'!G2:G${LAST_L3})-COUNTBLANK('L3 통합(B1-B5)'!G2:G${LAST_L3})` }, 'B4 고장원인 건수 (헤더 제외)'],
    ['FE_COUNT', { formula: `COUNTA('L1 통합(C1-C4)'!D2:D${LAST_L1})-COUNTBLANK('L1 통합(C1-C4)'!D2:D${LAST_L1})` }, 'C4 고장영향 건수 (헤더 제외)'],
    ['CHAIN_COUNT', { formula: `COUNTA('FC 고장사슬'!G2:G${LAST_FC})-COUNTBLANK('FC 고장사슬'!G2:G${LAST_FC})` }, 'FC 고장사슬 행수 — 고장원인(FC/G열) 기준'],
    ['L1_ROWS', l1Rows.length, 'L1 통합 데이터 행 수'],
    ['L2_ROWS', l2Rows.length, 'L2 통합 데이터 행 수'],
    ['L3_ROWS', l3Rows.length, 'L3 통합 데이터 행 수'],
    ['FC_ROWS', fcRows.length, 'FC 고장사슬 데이터 행 수'],
    ['FA_ROWS', faRows.length, 'FA 통합분석 데이터 행 수'],
    ['PROCESS_COUNT', procNos.length, 'L2 공정 수'],
    ['', '', ''],
    ['B3_EMPTY', { formula: `COUNTBLANK('L3 통합(B1-B5)'!E2:E${LAST_L3})` }, 'L3 B3(공정특성) 빈칸 수 (0 필수)'],
    ['B4_EMPTY', { formula: `COUNTBLANK('L3 통합(B1-B5)'!G2:G${LAST_L3})` }, 'L3 B4(고장원인) 빈칸 수 (0 필수)'],
    ['B5_EMPTY', { formula: `COUNTBLANK('L3 통합(B1-B5)'!H2:H${LAST_L3})` }, 'L3 B5(예방관리) 빈칸 수'],
    ['A6_EMPTY', { formula: `COUNTBLANK('L2 통합(A1-A6)'!G2:G${LAST_L2})` }, 'L2 A6(검출관리) 빈칸 수'],
    ['FC_FC_EMPTY', { formula: `COUNTBLANK('FC 고장사슬'!G2:G${LAST_FC})` }, 'FC시트 FC열 빈칸 (0 필수)'],
    ['FC_S_EMPTY', { formula: `COUNTBLANK('FC 고장사슬'!J2:J${LAST_FC})` }, 'FC시트 S(심각도) 빈칸 (0 권장)'],
    ['FC_O_EMPTY', { formula: `COUNTBLANK('FC 고장사슬'!K2:K${LAST_FC})` }, 'FC시트 O(발생도) 빈칸 (0 권장)'],
    ['FC_D_EMPTY', { formula: `COUNTBLANK('FC 고장사슬'!L2:L${LAST_FC})` }, 'FC시트 D(검출도) 빈칸 (0 권장)'],
  ];

  for (const [label, val, desc] of verifyData) {
    vws.addRow([label, val, desc]);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  await wb.xlsx.writeFile(OUTPUT_PATH);

  // 검증 리포트
  console.log('\n=== 전수 검증 리포트 ===');
  console.log(`파일: ${OUTPUT_PATH}\n`);

  const b3Miss = l3Rows.filter(r => !(r[4] || '').toString().trim()).length;
  const b4Miss = l3Rows.filter(r => !(r[6] || '').toString().trim()).length;
  const fcFcMiss = fcRows.filter(r => !(r[6] || '').toString().trim()).length;
  const fcPcMiss = fcRows.filter(r => !(r[7] || '').toString().trim()).length;
  const fcDcMiss = fcRows.filter(r => !(r[8] || '').toString().trim()).length;
  const fcSMiss = fcRows.filter(r => !(r[9] || '').toString().trim()).length;
  const fcOMiss = fcRows.filter(r => !(r[10] || '').toString().trim()).length;
  const fcDMiss = fcRows.filter(r => !(r[11] || '').toString().trim()).length;

  const checks = [
    { name: 'L1 행', a: l1Rows.length, e: 17, op: '≥' },
    { name: 'L2 행', a: l2Rows.length, e: 21, op: '≥' },
    { name: 'L3 행', a: l3Rows.length, e: 91, op: '≥' },
    { name: 'FC 행', a: fcRows.length, e: chains.length, op: '=' },
    { name: 'FA 행', a: faRows.length, e: chains.length, op: '=' },
    { name: 'B3 빈칸', a: b3Miss, e: 0, op: '=' },
    { name: 'B4 빈칸', a: b4Miss, e: 0, op: '=' },
    { name: 'FC-FC 빈칸', a: fcFcMiss, e: 0, op: '=' },
    { name: 'FC-PC 빈칸', a: fcPcMiss, e: 0, op: '=' },
    { name: 'FC-DC 빈칸', a: fcDcMiss, e: 0, op: '=' },
    { name: 'FC-S 빈칸', a: fcSMiss, e: 0, op: '=' },
    { name: 'FC-O 빈칸', a: fcOMiss, e: 0, op: '=' },
    { name: 'FC-D 빈칸', a: fcDMiss, e: 0, op: '=' },
  ];

  let allPass = true;
  for (const c of checks) {
    const pass = c.op === '=' ? c.a === c.e : c.a >= c.e;
    if (!pass) allPass = false;
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${c.name}: ${c.a} (기대 ${c.op}${c.e})`);
  }
  console.log(`\n${allPass ? 'ALL PASS' : 'FAIL'}`);
  console.log(`시트: L1=${l1Rows.length} L2=${l2Rows.length} L3=${l3Rows.length} FC=${fcRows.length} FA=${faRows.length}`);
}

function thinBorder() {
  return { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
}

main().catch(e => { console.error(e); process.exit(1); });
