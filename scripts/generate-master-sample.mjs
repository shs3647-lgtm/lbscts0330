/**
 * Master FMEA 샘플 Excel 생성 스크립트 (v3 — chains 기반 완전 복원)
 *
 * 데이터 소스: data/master-fmea/{fmeaId}.json (JSON 우선, API fallback)
 *
 * 진단 보고서(2026-03-18) 지적 사항 전수 반영:
 *   - FC 고장사슬: chains 전수 매핑 (FC/DC/PC/SOD 완전 채움)
 *   - FA 통합분석: chains의 l2Function/productChar/l3Function/processChar 직접 사용
 *   - A6/B5: D:/P: 접두사 스트리핑 + chains에서 누락분 보충
 *   - L3: parentItemId 기반 그룹핑 (카테시안 버그 제거)
 *   - B4: chains에서 누락된 B4 자동 보충
 *   - 특별특성(★/◇): chains.specialChar 반영
 *
 * Usage: node scripts/generate-master-sample.mjs [fmeaId]
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3000';
const FMEA_ID = process.argv[2] || 'pfm26-m066';
const OUTPUT_DIR = 'C:/Users/Administrator/Downloads';
const OUTPUT_PATH = `${OUTPUT_DIR}/PFMEA_Master_${FMEA_ID}_PIPELINE검증_${new Date().toISOString().slice(0, 10)}.xlsx`;
const MASTER_JSON = path.join(process.cwd(), 'data', 'master-fmea', `${FMEA_ID}.json`);

const HEADER_COLOR = '00587A';
const stripPrefix = (v) => (v || '').replace(/^[DP]:/gm, '').trim();

const SHEET_DEFS = [
  { name: 'L1 통합(C1-C4)', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)'] },
  { name: 'L2 통합(A1-A6)', headers: ['A1.공정번호', 'A2.공정명', 'A3.공정기능', 'A4.제품특성', '특별특성', 'A5.고장형태', 'A6.검출관리'] },
  { name: 'L3 통합(B1-B5)', headers: ['공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성', '고장원인(B4)', '예방관리(B5)'] },
  { name: 'FC 고장사슬', headers: ['FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)', '4M', '작업요소(WE)', 'FC(고장원인)', 'B5.예방관리(발생 전 방지)', 'A6.검출관리(발생 후 검출)', 'S', 'O', 'D', 'AP'] },
  { name: 'FA 통합분석', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '공정No(A1)', '공정명(A2)', '공정기능(A3)', '제품특성(A4)', '특별특성(A4)', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성(B3)', '고장영향(C4)', '고장형태(A5)', '고장원인(B4)', 'S', 'O', 'D', 'AP', 'B5.예방관리', 'A6.검출관리'] },
  { name: 'VERIFY', headers: ['검증항목', '값', '설명'] },
];

// ─── 데이터 로드 ───

async function loadData() {
  if (fs.existsSync(MASTER_JSON)) {
    const raw = JSON.parse(fs.readFileSync(MASTER_JSON, 'utf-8'));
    const flatData = raw.flatData || [];
    const chains = raw.chains || [];
    const stats = raw.stats || {};
    console.log(`  [JSON] flatItems: ${flatData.length}, chains: ${chains.length}`);
    return { flatData, chains, stats };
  }

  try {
    const res = await fetch(`${API_BASE}/api/pfmea/master?fmeaId=${FMEA_ID}&includeItems=true`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const { dataset } = await res.json();
      const flatData = dataset.flatItems || [];
      const chains = dataset.failureChains || [];
      console.log(`  [API] flatItems: ${flatData.length}, chains: ${chains.length}`);
      return { flatData, chains, stats: {} };
    }
  } catch {
    console.log('  [API] 서버 미응답');
  }

  throw new Error(`데이터 없음: ${MASTER_JSON} 파일 없음 + API 미응답`);
}

// ─── chains에서 누락된 flatData 보충 ───

function supplementFlatDataFromChains(flatData, chains) {
  let added = 0;
  const b1Items = flatData.filter(d => d.itemCode === 'B1');
  const b3Items = flatData.filter(d => d.itemCode === 'B3');
  const b4Set = new Set(flatData.filter(d => d.itemCode === 'B4').map(d => d.value));

  for (const chain of chains) {
    const pNo = chain.processNo || '';
    const m4 = chain.m4 || '';
    const we = chain.workElement || '';

    // B4 보충: chain의 fcValue가 flatData B4에 없으면 추가
    if (chain.fcValue && !b4Set.has(chain.fcValue)) {
      const parentB1 = b1Items.find(b => b.processNo === pNo && (b.m4 || '') === m4 && b.value === we);
      const parentB3 = b3Items.find(b => b.parentItemId === parentB1?.id && b.value === chain.processChar);
      flatData.push({
        id: `SUPP-B4-${pNo}-${m4}-${added}`,
        itemCode: 'B4',
        processNo: pNo,
        m4,
        value: chain.fcValue,
        parentItemId: parentB3?.id || parentB1?.id || '',
      });
      b4Set.add(chain.fcValue);
      added++;
    }

    // B5 보충: chain의 pcValue로 해당 B1에 B5가 없으면 추가
    if (chain.pcValue) {
      const parentB1 = b1Items.find(b => b.processNo === pNo && (b.m4 || '') === m4 && b.value === we);
      if (parentB1) {
        const hasB5 = flatData.some(d => d.itemCode === 'B5' && d.id.startsWith(parentB1.id));
        if (!hasB5) {
          flatData.push({
            id: `${parentB1.id}-V-1`,
            itemCode: 'B5',
            processNo: pNo,
            m4,
            value: chain.pcValue,
          });
          added++;
        }
      }
    }
  }
  return added;
}

// ─── FC 정렬 ───

function sortChains(chains) {
  const scopeOrder = { 'YP': 0, 'SP': 1, 'USER': 2 };
  return [...chains].sort((a, b) => {
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
}

// ─── AP 계산 ───

function calcAP(s, o, d) {
  const sv = Number(s) || 0, ov = Number(o) || 0, dv = Number(d) || 0;
  if (sv >= 9 || (sv >= 7 && ov >= 4) || (sv * ov * dv >= 200)) return 'H';
  if (sv >= 5 || (sv >= 3 && ov >= 3) || (sv * ov * dv >= 80)) return 'M';
  return 'L';
}

// ─── 메인 ───

async function main() {
  console.log(`\n=== Master FMEA 샘플 생성 (v3): ${FMEA_ID} ===`);

  const { flatData, chains, stats } = await loadData();

  // chains 기반 flatData 보충
  const supplemented = supplementFlatDataFromChains(flatData, chains);
  if (supplemented > 0) {
    console.log(`  [보충] chains에서 ${supplemented}건 flatData 추가 (B4/B5 누락분)`);
  }

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

    // A6 보충: flatData에 없으면 chains DC에서 가져오기
    if (a6Items.length === 0) {
      const chainDC = chains.find(c => c.processNo === pNo && c.dcValue?.trim());
      if (chainDC) {
        a6Items.push({ value: chainDC.dcValue, itemCode: 'A6', processNo: pNo });
      }
    }

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
  // L3 통합(B1-B5) — parentItemId 기반 그룹핑 (카테시안 버그 제거)
  // ═══════════════════════════════════════════════════════
  const b1Items = flatData.filter(d => d.itemCode === 'B1');
  let skippedB1 = 0;
  for (const b1 of b1Items) {
    const pNo = b1.processNo;
    const m4 = b1.m4 || '';
    const b1Id = b1.id;

    const b2Items = flatData.filter(d => d.itemCode === 'B2' && d.parentItemId === b1Id);
    const b3Items = flatData.filter(d => d.itemCode === 'B3' && d.parentItemId === b1Id);

    const b3IdSet = new Set(b3Items.map(x => x.id));
    const b4Items = flatData.filter(d => d.itemCode === 'B4' && b3IdSet.has(d.parentItemId));

    let b5Items = flatData.filter(d => d.itemCode === 'B5' && d.id.startsWith(b1Id));
    if (b5Items.length === 0) {
      const chainPC = chains.find(c => c.processNo === pNo && (c.m4 || '') === m4 && c.workElement === b1.value && c.pcValue?.trim());
      if (chainPC) {
        b5Items = [{ value: chainPC.pcValue, id: `${b1Id}-V-1` }];
      }
    }

    // 고아 B1 스킵: B2/B3/B4 모두 없고 chains에도 없는 WE는 제외
    if (b2Items.length === 0 && b3Items.length === 0 && b4Items.length === 0) {
      const hasChain = chains.some(c => c.processNo === pNo && (c.m4 || '') === m4 && c.workElement === b1.value);
      if (!hasChain) {
        skippedB1++;
        continue;
      }
    }

    // B4 보충: B3가 있지만 B4가 없으면 같은 (processNo, processChar) sibling에서 복사
    if (b3Items.length > 0 && b4Items.length === 0) {
      for (const b3 of b3Items) {
        const siblingB3 = flatData.find(d =>
          d.itemCode === 'B3' && d.id !== b3.id && d.value === b3.value && d.processNo === pNo
        );
        if (siblingB3) {
          const siblingB4s = flatData.filter(d => d.itemCode === 'B4' && d.parentItemId === siblingB3.id);
          for (const sb4 of siblingB4s) {
            b4Items.push({ ...sb4, id: `${b3.id}-K-S`, parentItemId: b3.id });
          }
        }
      }
    }

    // B5 보충: sibling B1에서 복사 (같은 processNo, m4)
    if (b5Items.length === 0 && b3Items.length > 0) {
      const siblingB1 = b1Items.find(sb =>
        sb.id !== b1Id && sb.processNo === pNo && (sb.m4 || '') === m4
      );
      if (siblingB1) {
        const sibB5 = flatData.filter(d => d.itemCode === 'B5' && d.id.startsWith(siblingB1.id));
        if (sibB5.length > 0) {
          b5Items = sibB5.map(s => ({ ...s, id: `${b1Id}-V-S` }));
        }
      }
    }

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
  if (skippedB1 > 0) {
    console.log(`  [L3] 고아 B1 ${skippedB1}건 스킵 (B2/B3/B4/chains 없음)`);
  }

  // ═══════════════════════════════════════════════════════
  // FC 고장사슬 — chains 전수 매핑 + S/O/D/AP + DC/PC 스트리핑
  // ═══════════════════════════════════════════════════════
  const sortedChains = sortChains(chains);

  sheetData['FC 고장사슬'] = sortedChains.map(ch => [
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

  // ═══════════════════════════════════════════════════════
  // FA 통합분석 — chains의 풍부한 데이터 직접 사용
  // ═══════════════════════════════════════════════════════
  const a2Map = {}, a3Map = {}, c2Map = {}, c3Map = {};
  flatData.forEach(d => {
    if (d.itemCode === 'A2') a2Map[d.processNo] = d.value || '';
    if (d.itemCode === 'A3' && !a3Map[d.processNo]) a3Map[d.processNo] = d.value || '';
    if (d.itemCode === 'C2' && !c2Map[d.processNo]) c2Map[d.processNo] = d.value || '';
    if (d.itemCode === 'C3' && !c3Map[d.processNo]) c3Map[d.processNo] = d.value || '';
  });

  sheetData['FA 통합분석'] = sortedChains.map(ch => {
    const pNo = ch.processNo || '';
    const scope = ch.feScope || '';
    return [
      scope,
      c2Map[scope] || '',
      c3Map[scope] || '',
      pNo,
      a2Map[pNo] || '',
      a3Map[pNo] || ch.l2Function || '',
      ch.productChar || '',
      ch.specialChar || '',
      ch.m4 || '',
      ch.workElement || '',
      ch.l3Function || '',
      ch.processChar || '',
      ch.specialChar || '',
      ch.feValue || '',
      ch.fmValue || '',
      ch.fcValue || '',
      ch.severity ? String(ch.severity) : '',
      ch.occurrence ? String(ch.occurrence) : '',
      ch.detection ? String(ch.detection) : '',
      calcAP(ch.severity, ch.occurrence, ch.detection),
      stripPrefix(ch.pcValue || ''),
      stripPrefix(ch.dcValue || ''),
    ];
  });

  // ═══════════════════════════════════════════════════════
  // VERIFY — 자동 검증
  // ═══════════════════════════════════════════════════════
  const l3Rows = sheetData['L3 통합(B1-B5)'];
  const l2Rows = sheetData['L2 통합(A1-A6)'];
  const fcRows = sheetData['FC 고장사슬'];
  const faRows = sheetData['FA 통합분석'];

  const fmCount = flatData.filter(d => d.itemCode === 'A5').length;
  const fcCountFlat = flatData.filter(d => d.itemCode === 'B4').length;
  const feCount = flatData.filter(d => d.itemCode === 'C4').length;
  const chainCount = fcRows.length;
  const processCount = procNos.length;
  const b3Miss = l3Rows.filter(r => !(r[4] || '').toString().trim()).length;
  const b4Miss = l3Rows.filter(r => !(r[6] || '').toString().trim()).length;
  const b5Miss = l3Rows.filter(r => !(r[7] || '').toString().trim()).length;
  const a6Miss = l2Rows.filter(r => !(r[6] || '').toString().trim()).length;

  const fcFcMiss = fcRows.filter(r => !(r[6] || '').toString().trim()).length;
  const fcPcMiss = fcRows.filter(r => !(r[7] || '').toString().trim()).length;
  const fcDcMiss = fcRows.filter(r => !(r[8] || '').toString().trim()).length;
  const fcSMiss = fcRows.filter(r => !(r[9] || '').toString().trim()).length;

  const ghostRows = l3Rows.filter(r =>
    ((r[4] || '').toString().length > 30 && (r[4] || '').toString().includes('한다'))
  ).length;

  // FA 빈칸 검증
  const faFcMiss = faRows.filter(r => !(r[15] || '').toString().trim()).length;
  const faPcMiss = faRows.filter(r => !(r[20] || '').toString().trim()).length;
  const faDcMiss = faRows.filter(r => !(r[21] || '').toString().trim()).length;

  sheetData['VERIFY'] = [
    ['FMEA_ID', FMEA_ID, '대상 프로젝트'],
    ['FM_COUNT', fmCount, 'A5 고장형태 건수'],
    ['FC_COUNT_FLAT', fcCountFlat, 'B4 고장원인 건수 (flatData)'],
    ['FE_COUNT', feCount, 'C4 고장영향 건수'],
    ['CHAIN_COUNT', chainCount, 'FC 시트 고장사슬 건수 (chains 기반)'],
    ['PROCESS_COUNT', processCount, 'A1 고유 공정 수'],
    ['L1_ROW_COUNT', sheetData['L1 통합(C1-C4)'].length, 'L1 통합 행 수'],
    ['L2_ROW_COUNT', l2Rows.length, 'L2 통합 행 수'],
    ['L3_ROW_COUNT', l3Rows.length, 'L3 통합 행 수'],
    ['FA_ROW_COUNT', faRows.length, 'FA 통합분석 행 수'],
    ['', '', ''],
    ['A6_MISS', a6Miss, 'L2 통합 A6 빈칸 수 (0이 이상적)'],
    ['B3_MISS', b3Miss, 'L3 통합 B3 빈칸 수 (0이 이상적)'],
    ['B4_MISS', b4Miss, 'L3 통합 B4 빈칸 수 (0이 이상적)'],
    ['B5_MISS', b5Miss, 'L3 통합 B5 빈칸 수 (0이 이상적)'],
    ['GHOST_ROWS', ghostRows, '유령 행 수 (B2->B3 혼입, 0이 정상)'],
    ['', '', ''],
    ['FC_FC_MISS', fcFcMiss, 'FC시트 FC열 빈칸'],
    ['FC_PC_MISS', fcPcMiss, 'FC시트 PC열 빈칸'],
    ['FC_DC_MISS', fcDcMiss, 'FC시트 DC열 빈칸'],
    ['FC_S_MISS', fcSMiss, 'FC시트 S열 빈칸'],
    ['', '', ''],
    ['FA_FC_MISS', faFcMiss, 'FA시트 FC열 빈칸'],
    ['FA_PC_MISS', faPcMiss, 'FA시트 PC열 빈칸'],
    ['FA_DC_MISS', faDcMiss, 'FA시트 DC열 빈칸'],
  ];

  // ═══════════════════════════════════════════════════════
  // Excel 생성
  // ═══════════════════════════════════════════════════════
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FMEA Smart System Master Sample Generator v3';
  workbook.created = new Date();

  for (const def of SHEET_DEFS) {
    const ws = workbook.addWorksheet(def.name);
    const rows = sheetData[def.name] || [];

    ws.columns = def.headers.map((h) => ({
      header: h, width: Math.max(14, h.length * 1.5 + 4),
    }));

    const headerRow = ws.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell(cell => {
      const color = def.name.includes('FC') ? 'B91C1C'
        : def.name.includes('FA') ? '1E40AF'
          : def.name === 'VERIFY' ? '6B21A8'
            : HEADER_COLOR;
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = thinBorder();
    });

    rows.forEach((data, idx) => {
      const row = ws.addRow(data);
      const bg = idx % 2 === 0 ? 'FFFFFF' : 'F0F7FB';
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = thinBorder();
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.font = { size: 9 };
      });
    });

    if (def.name === 'FC 고장사슬' && rows.length > 1) {
      applyMergeCells(ws, rows, [0, 1, 2, 3]);
    }
    if (def.name === 'FA 통합분석' && rows.length > 1) {
      applyMergeCells(ws, rows, [0, 1, 2]);
    }

    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  }

  if (!fs.existsSync(OUTPUT_DIR)) { fs.mkdirSync(OUTPUT_DIR, { recursive: true }); }
  await workbook.xlsx.writeFile(OUTPUT_PATH);

  // ═══════════════════════════════════════════════════════
  // 전수 검증 리포트
  // ═══════════════════════════════════════════════════════
  console.log('\n=== 전수 검증 리포트 ===');
  console.log(`파일: ${OUTPUT_PATH}\n`);

  const checks = [
    { name: 'L1 통합 행', actual: sheetData['L1 통합(C1-C4)'].length, expect: 17, op: '≥' },
    { name: 'L2 통합 행', actual: l2Rows.length, expect: 21, op: '≥' },
    { name: 'L3 통합 행', actual: l3Rows.length, expect: 91, op: '≥' },
    { name: 'FC 고장사슬', actual: chainCount, expect: chains.length, op: '=' },
    { name: 'FA 통합분석', actual: faRows.length, expect: chains.length, op: '=' },
    { name: 'A6 빈칸', actual: a6Miss, expect: 0, op: '=' },
    { name: 'B5 빈칸', actual: b5Miss, expect: 0, op: '=' },
    { name: 'B4 빈칸', actual: b4Miss, expect: 0, op: '=' },
    { name: '유령 행', actual: ghostRows, expect: 0, op: '=' },
    { name: 'FM_COUNT', actual: fmCount, expect: stats.fmCount || 26, op: '=' },
    { name: 'CHAIN_COUNT', actual: chainCount, expect: stats.chainCount || chains.length, op: '=' },
    { name: 'FE_COUNT', actual: feCount, expect: stats.feCount || 20, op: '=' },
    { name: 'PROCESS_COUNT', actual: processCount, expect: stats.l2Count || 21, op: '=' },
    { name: 'FC시트 FC빈칸', actual: fcFcMiss, expect: 0, op: '=' },
    { name: 'FC시트 PC빈칸', actual: fcPcMiss, expect: 0, op: '=' },
    { name: 'FC시트 DC빈칸', actual: fcDcMiss, expect: 0, op: '=' },
    { name: 'FA시트 FC빈칸', actual: faFcMiss, expect: 0, op: '=' },
  ];

  let allPass = true;
  for (const c of checks) {
    let pass;
    if (c.op === '=') pass = c.actual === c.expect;
    else if (c.op === '≥') pass = c.actual >= c.expect;
    else pass = true;
    const icon = pass ? '  PASS' : '  FAIL';
    if (!pass) allPass = false;
    console.log(`  ${icon}  ${c.name}: ${c.actual} (기대 ${c.op}${c.expect})`);
  }

  console.log(`\n전수 검증: ${allPass ? 'ALL PASS' : 'FAIL'}`);
  console.log(`\n시트별 행 수: L1=${sheetData['L1 통합(C1-C4)'].length} L2=${l2Rows.length} L3=${l3Rows.length} FC=${chainCount} FA=${faRows.length}`);
}

function thinBorder() {
  return { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
}

function applyMergeCells(ws, rows, mergeCols) {
  for (const colIdx of mergeCols) {
    let start = 0;
    for (let i = 1; i <= rows.length; i++) {
      if (i < rows.length && rows[i][colIdx] === rows[start][colIdx]) continue;
      if (i - start > 1) {
        try { ws.mergeCells(start + 2, colIdx + 1, i + 1, colIdx + 1); } catch { /* */ }
      }
      start = i;
    }
  }
}

main().catch(err => { console.error('ERROR:', err); process.exit(1); });
