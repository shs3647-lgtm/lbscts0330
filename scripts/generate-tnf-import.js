/**
 * T&F STEP B_완벽버전.xlsx + STEP A → 멀티시트 Import 파일 생성
 *
 * ★ excel-template.ts의 SHEET_DEFINITIONS 양식을 100% 그대로 사용
 *   - 시트명, 헤더명, 색상, 스타일 모두 템플릿과 동일
 *   - 16개 시트 전체: A1~A6, B1~B5, C1~C4, FC 고장사슬, FA 통합분석
 *
 * 데이터 소스:
 *   - STEP B_완벽버전.xlsx → A1,A2,A3,A5,A6, B1,B2,B4,B5, C1,C2,C4, 고장사슬
 *   - _stepA_extra.json     → A4(제품특성), B3(공정특성), C3(요구사항)
 *
 * Usage: node scripts/generate-tnf-import.js
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const INPUT_FILE = 'D:/00 SMART FMEA TUTOR/티앤에프/PFMEA STEP B_완벽버전.xlsx';
const STEP_A_EXTRA = 'D:/00 SMART FMEA TUTOR/T&F/_stepA_extra.json';
const OUTPUT_DIR = 'D:/00 SMART FMEA TUTOR/T&F';

// ═══════════════════════════════════════════════════════════════
// ★ SHEET_DEFINITIONS — excel-template.ts에서 그대로 복사
// ═══════════════════════════════════════════════════════════════
const HEADER_COLOR = '00587A';

const SHEET_DEFINITIONS = [
  { name: 'L2-1(A1) 공정번호', headers: ['L2-1.공정번호', 'L2-2.공정명', '공정유형코드(선택)'], color: HEADER_COLOR, legacyName: 'A1' },
  { name: 'L2-2(A2) 공정명', headers: ['L2-1.공정번호', 'L2-2.공정명'], color: HEADER_COLOR, legacyName: 'A2' },
  { name: 'L2-3(A3) 공정기능', headers: ['L2-1.공정번호', 'L2-3.공정기능(설명)'], color: HEADER_COLOR, legacyName: 'A3' },
  { name: 'L2-4(A4) 제품특성', headers: ['L2-1.공정번호', 'L2-4.제품특성', '특별특성'], color: HEADER_COLOR, legacyName: 'A4' },
  { name: 'L2-5(A5) 고장형태', headers: ['L2-1.공정번호', 'L2-5.고장형태'], color: HEADER_COLOR, legacyName: 'A5' },
  { name: 'L2-6(A6) 검출관리', headers: ['L2-1.공정번호', 'L2-6.검출관리'], color: HEADER_COLOR, legacyName: 'A6' },
  { name: 'L3-1(B1) 작업요소', headers: ['L2-1.공정번호', '4M', 'L3-1.작업요소(설비)'], color: HEADER_COLOR, legacyName: 'B1' },
  { name: 'L3-2(B2) 요소기능', headers: ['L2-1.공정번호', '4M', 'L3-2.요소기능'], color: HEADER_COLOR, legacyName: 'B2' },
  { name: 'L3-3(B3) 공정특성', headers: ['L2-1.공정번호', '4M', 'L3-3.공정특성', '특별특성'], color: HEADER_COLOR, legacyName: 'B3' },
  { name: 'L3-4(B4) 고장원인', headers: ['L2-1.공정번호', '4M', 'L3-4.고장원인'], color: HEADER_COLOR, legacyName: 'B4' },
  { name: 'L3-5(B5) 예방관리', headers: ['L2-1.공정번호', '4M', 'L3-5.예방관리'], color: HEADER_COLOR, legacyName: 'B5' },
  { name: 'L1-1(C1) 구분', headers: ['L1-1.구분'], color: HEADER_COLOR, legacyName: 'C1' },
  { name: 'L1-2(C2) 제품기능', headers: ['L1-1.구분', 'L1-2.제품(반)기능'], color: HEADER_COLOR, legacyName: 'C2' },
  { name: 'L1-3(C3) 요구사항', headers: ['L1-1.구분', 'L1-3.제품(반)요구사항'], color: HEADER_COLOR, legacyName: 'C3' },
  { name: 'L1-4(C4) 고장영향', headers: ['L1-1.구분', 'L1-4.고장영향'], color: HEADER_COLOR, legacyName: 'C4' },
  { name: 'FC 고장사슬', headers: ['L2-1.공정번호', '4M', 'B4.고장원인', 'A5.고장형태', 'C4.고장영향', 'B5.예방관리', 'A6.검출관리', 'S', 'O', 'D', 'AP'], color: 'B91C1C', legacyName: 'FC' },
  { name: 'FA 통합분석', headers: ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '공정No(A1)', '공정명(A2)', '공정기능(A3)', '제품특성(A4)', '특별특성(A4)', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성(B3)', '고장영향(C4)', '고장형태(A5)', '고장원인(B4)', '예방관리(B5)', '검출관리(A6)', 'S', 'O', 'D', 'AP'], color: '1E40AF', legacyName: 'FA' },
];

// ═══════════════════════════════════════════════════════════════
// ★ 스타일 함수 — excel-template.ts와 동일
// ═══════════════════════════════════════════════════════════════
const THIN_BORDER = { style: 'thin', color: { argb: '999999' } };
const CELL_BORDERS = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };

function applyHeaderStyle(cell, color) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10, name: '맑은 고딕' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = CELL_BORDERS;
}

function applyDataCellStyle(cell, colWidth, bgColor) {
  if (bgColor) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  }
  cell.border = CELL_BORDERS;
  cell.font = { name: '맑은 고딕', size: 10 };
  cell.alignment = {
    vertical: 'middle',
    horizontal: colWidth > 16 ? 'left' : 'center',
    wrapText: colWidth > 16,
  };
}

/** 텍스트 너비 계산 (한글=2, 영문/숫자=1.1) */
function textWidth(text) {
  if (!text) return 0;
  let w = 0;
  for (const ch of String(text)) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7AF) w += 2;
    else if (code >= 0x3000 && code <= 0x9FFF) w += 2;
    else w += 1.1;
  }
  return w;
}

/** 데이터 기반 열 너비 자동 계산 */
function calcAutoWidths(headers, rows) {
  return headers.map((h, i) => {
    const headerW = textWidth(h) + 2;
    let maxDataW = 0;
    for (const row of rows) {
      const cellW = textWidth(row[i] || '');
      if (cellW > maxDataW) maxDataW = cellW;
    }
    const min = h === '4M' ? 8 : (i === 0 ? 12 : 12);
    const optimal = Math.max(headerW, maxDataW + 3, min);
    return Math.min(optimal, 60);
  });
}

// ═══════════════════════════════════════════════════════════════
// STEP B 컬럼 매핑
// ═══════════════════════════════════════════════════════════════
const COL = {
  L1_NAME: 3, PROC: 4, STRUCT_4M: 5, B1: 6,
  C1: 7, C2: 8, A3: 9, FUNC_4M: 10, FUNC_WE: 11, B2: 12,
  FE_SCOPE: 13, C4: 14, SEV: 15, A5: 16,
  FAIL_4M: 17, FAIL_WE: 18, B4: 19, B5: 20,
  OCC: 21, A6: 22, DET: 23, AP: 24, SC: 25,
};
const DATA_START = 12;

// ═══════════════════════════════════════════════════════════════
// 메인
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('📂 STEP B 입력:', INPUT_FILE);
  console.log('📂 STEP A 추가:', STEP_A_EXTRA);

  // ── 1. STEP B 읽기 ──
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(INPUT_FILE);
  const sheet = wb.worksheets[0];
  console.log(`📊 시트: "${sheet.name}", 총 ${sheet.rowCount}행`);

  // ── 2. STEP A 추가 데이터 읽기 ──
  let stepAExtra = { a4Data: [], b3Data: [], c3Data: [] };
  if (fs.existsSync(STEP_A_EXTRA)) {
    stepAExtra = JSON.parse(fs.readFileSync(STEP_A_EXTRA, 'utf8'));
    console.log(`📊 STEP A 추가: A4=${stepAExtra.a4Data.length}, B3=${stepAExtra.b3Data.length}, C3=${stepAExtra.c3Data.length}`);
  } else {
    console.warn('⚠️ _stepA_extra.json 없음 — A4/B3/C3 비어있음');
  }

  // ── 3. 데이터 추출 (STEP B) ──
  const processes = new Map();  // processNo → { name }
  const a3Data = [];
  const a5Data = [];
  const a6Data = [];
  const b1Data = [];
  const b2Data = [];
  const b4Data = [];
  const b5Data = [];
  const c1Data = [];
  const c2Data = [];
  const c4Data = [];
  const chains = [];

  // dedup sets
  const seen = {
    proc: new Set(), a3: new Set(), a5: new Set(), a6: new Set(),
    b1: new Set(), b2: new Set(), b4: new Set(), b5: new Set(),
    c1: new Set(), c2: new Set(), c4: new Set(),
  };

  // Forward fill state
  let ff = { proc: '', procNo: '', struct4M: '', func4M: '', fail4M: '', c1: '', a5: '', c4: '', sev: 0 };

  function getVal(row, col) {
    const v = row.getCell(col).value;
    if (v === null || v === undefined) return '';
    return String(v).trim();
  }

  function norm4M(val) {
    const u = (val || '').toUpperCase();
    if (u === 'MD' || u === 'JG') return 'MC';
    if (['MN', 'MC', 'IM', 'EN'].includes(u)) return u;
    return '';
  }

  for (let r = DATA_START; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    // 공정번호
    let procStr = getVal(row, COL.PROC) || ff.proc;
    if (getVal(row, COL.PROC)) ff.proc = procStr;
    const procMatch = procStr.match(/^(\d+)/);
    const processNo = procMatch ? procMatch[1] : '';
    const processName = procStr.replace(/^\d+[-번]?\s*/, '').trim();
    if (!processNo) continue;

    const normProcNo = (processNo === '0' || processNo === '00') ? '공통' : processNo;

    // 공정 변경 시 FF 리셋
    if (normProcNo !== ff.procNo) {
      ff.procNo = normProcNo;
      ff.a5 = ''; ff.c4 = ''; ff.sev = 0;
    }

    // 4M
    let struct4M = norm4M(getVal(row, COL.STRUCT_4M)) || ff.struct4M;
    if (norm4M(getVal(row, COL.STRUCT_4M))) ff.struct4M = struct4M;
    let func4M = norm4M(getVal(row, COL.FUNC_4M)) || ff.func4M || struct4M;
    if (norm4M(getVal(row, COL.FUNC_4M))) ff.func4M = func4M;
    let fail4M = norm4M(getVal(row, COL.FAIL_4M)) || ff.fail4M || struct4M;
    if (norm4M(getVal(row, COL.FAIL_4M))) ff.fail4M = fail4M;

    // 공정 마스터
    if (!seen.proc.has(normProcNo)) {
      seen.proc.add(normProcNo);
      processes.set(normProcNo, { name: processName });
    }

    // A3: 공정기능
    const a3Raw = getVal(row, COL.A3);
    if (a3Raw) {
      const key = `${normProcNo}|${a3Raw}`;
      if (!seen.a3.has(key)) { seen.a3.add(key); a3Data.push({ processNo: normProcNo, value: a3Raw }); }
    }

    // A5: 고장형태
    const a5Raw = getVal(row, COL.A5);
    if (a5Raw) ff.a5 = a5Raw;
    const curA5 = a5Raw || ff.a5;
    if (curA5) {
      const key = `${normProcNo}|${curA5}`;
      if (!seen.a5.has(key)) { seen.a5.add(key); a5Data.push({ processNo: normProcNo, value: curA5 }); }
    }

    // A6: 검출관리
    const a6Raw = getVal(row, COL.A6);
    if (a6Raw) {
      const key = `${normProcNo}|${a6Raw}`;
      if (!seen.a6.has(key)) { seen.a6.add(key); a6Data.push({ processNo: normProcNo, value: a6Raw }); }
    }

    // B1: 작업요소
    const b1Raw = getVal(row, COL.B1);
    if (b1Raw) {
      const key = `${normProcNo}|${struct4M}|${b1Raw}`;
      if (!seen.b1.has(key)) { seen.b1.add(key); b1Data.push({ processNo: normProcNo, m4: struct4M, value: b1Raw }); }
    }

    // B2: 요소기능
    const b2Raw = getVal(row, COL.B2);
    if (b2Raw) {
      const key = `${normProcNo}|${func4M}|${b2Raw}`;
      if (!seen.b2.has(key)) { seen.b2.add(key); b2Data.push({ processNo: normProcNo, m4: func4M, value: b2Raw }); }
    }

    // B4: 고장원인
    const b4Raw = getVal(row, COL.B4);
    if (b4Raw) {
      const key = `${normProcNo}|${fail4M}|${b4Raw}`;
      if (!seen.b4.has(key)) { seen.b4.add(key); b4Data.push({ processNo: normProcNo, m4: fail4M, value: b4Raw }); }
    }

    // B5: 예방관리
    const b5Raw = getVal(row, COL.B5);
    if (b5Raw) {
      const key = `${normProcNo}|${b5Raw}`;
      if (!seen.b5.has(key)) { seen.b5.add(key); b5Data.push({ processNo: normProcNo, m4: func4M || fail4M, value: b5Raw }); }
    }

    // C1: 구분
    const c1Raw = getVal(row, COL.C1);
    if (c1Raw) ff.c1 = c1Raw;
    const curC1 = c1Raw || ff.c1;
    if (curC1 && !seen.c1.has(curC1)) { seen.c1.add(curC1); c1Data.push({ category: curC1 }); }

    // C2: 완제품기능
    const c2Raw = getVal(row, COL.C2);
    if (c2Raw && curC1) {
      const key = `${curC1}|${c2Raw}`;
      if (!seen.c2.has(key)) { seen.c2.add(key); c2Data.push({ category: curC1, value: c2Raw }); }
    }

    // C4: 고장영향
    const c4Raw = getVal(row, COL.C4);
    if (c4Raw) ff.c4 = c4Raw;
    const curC4 = c4Raw || ff.c4;
    if (curC4 && curC1) {
      const key = `${curC1}|${curC4}`;
      if (!seen.c4.has(key)) { seen.c4.add(key); c4Data.push({ category: curC1, value: curC4 }); }
    }

    // 특별특성 (C=특별특성, L=AP오입력→무시)
    const scRaw = getVal(row, COL.SC);
    const sc = scRaw === 'C' ? 'C' : '';

    // 심각도
    const sevRaw = getVal(row, COL.SEV);
    if (sevRaw) { const n = parseInt(sevRaw, 10); if (n > 0) ff.sev = n; }
    const curSev = sevRaw ? parseInt(sevRaw, 10) : ff.sev;

    // ★ 고장사슬 (FC 행)
    if (curA5 && b4Raw) {
      const occ = parseInt(getVal(row, COL.OCC), 10) || 0;
      const det = parseInt(getVal(row, COL.DET), 10) || 0;
      chains.push({
        processNo: normProcNo,
        m4: fail4M || struct4M,
        fcValue: b4Raw,
        fmValue: curA5,
        feValue: curC4 || '',
        feScope: getVal(row, COL.FE_SCOPE) || curC1,
        pcValue: b5Raw || '',
        dcValue: a6Raw || '',
        severity: curSev || 0,
        occurrence: occ,
        detection: det,
        ap: getVal(row, COL.AP) || '',
        // FA용 참조 데이터
        workElement: b1Raw || '',
        l2Function: a3Raw || '',
        l3Function: b2Raw || '',
        specialChar: sc || '',
      });
    }
  }

  // ── 4. C1/C3 카테고리 정규화 (영문 풀네임 → 약어) ──
  // ★ 반드시 CATEGORY_MAP 먼저 적용 → C1 데이터 자체를 YP/SP/USER로 변환
  const CATEGORY_MAP = {
    'your plant': 'YP', 'yp': 'YP',
    'ship to plant': 'SP', 'sp': 'SP',
    'user': 'USER', 'end user': 'USER',
    '자사공장': 'YP', '고객사': 'SP', '최종사용자': 'USER',
  };

  // ★ C1 데이터를 먼저 약어로 변환 (Your Plant→YP, Ship to Plant→SP, User→USER)
  for (const d of c1Data) {
    const mapped = CATEGORY_MAP[d.category.toLowerCase()];
    if (mapped) d.category = mapped;
  }

  const c1Set = new Set(c1Data.map(d => d.category)); // {"YP", "SP", "USER"}
  function normalizeCategory(cat) {
    // ★ 항상 CATEGORY_MAP 먼저 시도
    const mapped = CATEGORY_MAP[cat.toLowerCase()];
    if (mapped) return mapped;
    // 이미 c1Set에 있으면 그대로
    if (c1Set.has(cat)) return cat;
    // 매핑 실패 시 그대로 사용 + C1에 추가
    c1Set.add(cat);
    c1Data.push({ category: cat });
    console.warn(`⚠️ C3 카테고리 매핑 실패: "${cat}" → C1에 새로 추가`);
    return cat;
  }

  // ── 4.5 체인 데이터에서 특별특성(SC) 룩업 생성 ──
  // SC="C"인 체인의 processNo를 수집 → 해당 공정의 A4/B3에 "C" 매핑
  const scProcessSet = new Set();
  for (const c of chains) {
    if (c.specialChar === 'C') scProcessSet.add(c.processNo);
  }
  if (scProcessSet.size > 0) {
    console.log(`📊 특별특성(SC=C) 공정: ${[...scProcessSet].join(', ')} (${chains.filter(c => c.specialChar === 'C').length}건)`);
  }

  // ── 5. 시트별 데이터 행 구성 (SHEET_DEFINITIONS 헤더에 맞춤) ──
  const sheetRows = {};
  SHEET_DEFINITIONS.forEach(def => { sheetRows[def.name] = []; });

  // A1: [공정번호, 공정명, 공정유형코드]
  for (const [no, p] of processes.entries()) {
    sheetRows['L2-1(A1) 공정번호'].push([no, p.name, '']);
  }

  // A2: [공정번호, 공정명]
  for (const [no, p] of processes.entries()) {
    sheetRows['L2-2(A2) 공정명'].push([no, p.name]);
  }

  // A3: [공정번호, 공정기능]
  for (const d of a3Data) {
    sheetRows['L2-3(A3) 공정기능'].push([d.processNo, d.value]);
  }

  // A4: [공정번호, 제품특성, 특별특성] — STEP A extra + SC 매핑
  for (const d of stepAExtra.a4Data) {
    const sc = scProcessSet.has(d.processNo) ? 'C' : '';
    sheetRows['L2-4(A4) 제품특성'].push([d.processNo, d.value, sc]);
  }

  // A5: [공정번호, 고장형태]
  for (const d of a5Data) {
    sheetRows['L2-5(A5) 고장형태'].push([d.processNo, d.value]);
  }

  // A6: [공정번호, 검출관리]
  for (const d of a6Data) {
    sheetRows['L2-6(A6) 검출관리'].push([d.processNo, d.value]);
  }

  // B1: [공정번호, 4M, 작업요소]
  for (const d of b1Data) {
    sheetRows['L3-1(B1) 작업요소'].push([d.processNo, d.m4, d.value]);
  }

  // B2: [공정번호, 4M, 요소기능]
  for (const d of b2Data) {
    sheetRows['L3-2(B2) 요소기능'].push([d.processNo, d.m4, d.value]);
  }

  // B3: [공정번호, 4M, 공정특성, 특별특성] — STEP A extra + SC 매핑
  for (const d of stepAExtra.b3Data) {
    const sc = scProcessSet.has(d.processNo) ? 'C' : '';
    sheetRows['L3-3(B3) 공정특성'].push([d.processNo, d.m4 || '', d.value, sc]);
  }

  // B4: [공정번호, 4M, 고장원인]
  for (const d of b4Data) {
    sheetRows['L3-4(B4) 고장원인'].push([d.processNo, d.m4, d.value]);
  }

  // B5: [공정번호, 4M, 예방관리]
  for (const d of b5Data) {
    sheetRows['L3-5(B5) 예방관리'].push([d.processNo, d.m4, d.value]);
  }

  // C1: [구분]
  for (const d of c1Data) {
    sheetRows['L1-1(C1) 구분'].push([d.category]);
  }

  // C2: [구분, 제품기능]
  for (const d of c2Data) {
    sheetRows['L1-2(C2) 제품기능'].push([d.category, d.value]);
  }

  // C3: [구분, 요구사항] — STEP A extra
  for (const d of stepAExtra.c3Data) {
    const cat = normalizeCategory(d.category);
    sheetRows['L1-3(C3) 요구사항'].push([cat, d.value]);
  }

  // C4: [구분, 고장영향]
  for (const d of c4Data) {
    sheetRows['L1-4(C4) 고장영향'].push([d.category, d.value]);
  }

  // FC 고장사슬: [공정번호, 4M, 고장원인, 고장형태, 고장영향, 예방관리, 검출관리, S, O, D, AP]
  for (const c of chains) {
    sheetRows['FC 고장사슬'].push([
      c.processNo, c.m4, c.fcValue, c.fmValue, c.feValue,
      c.pcValue, c.dcValue,
      c.severity ? String(c.severity) : '',
      c.occurrence ? String(c.occurrence) : '',
      c.detection ? String(c.detection) : '',
      c.ap,
    ]);
  }

  // ★ FA 통합분석 (22컬럼): 각 고장사슬 행에 구조/기능/기초정보를 결합
  // 룩업 테이블 구축
  const procA3 = {};  // processNo → first a3Value
  a3Data.forEach(d => { if (!procA3[d.processNo]) procA3[d.processNo] = d.value; });
  const procA4 = {};  // processNo → first a4Value
  stepAExtra.a4Data.forEach(d => { if (!procA4[d.processNo]) procA4[d.processNo] = d.value; });
  const procB3 = {};  // processNo → first b3Value
  stepAExtra.b3Data.forEach(d => { if (!procB3[d.processNo]) procB3[d.processNo] = d.value; });
  const catC2 = {};   // category → first c2Value
  c2Data.forEach(d => { if (!catC2[d.category]) catC2[d.category] = d.value; });
  const catC3 = {};   // category → first c3Value
  stepAExtra.c3Data.forEach(d => {
    const cat = normalizeCategory(d.category);
    if (!catC3[cat]) catC3[cat] = d.value;
  });

  for (const c of chains) {
    const pName = processes.get(c.processNo)?.name || '';
    const scope = c.feScope || '';
    sheetRows['FA 통합분석'].push([
      scope,                                  // 구분(C1)
      catC2[scope] || '',                     // 제품기능(C2)
      catC3[scope] || '',                     // 요구사항(C3)
      c.processNo,                            // 공정No(A1)
      pName,                                  // 공정명(A2)
      c.l2Function || procA3[c.processNo] || '',  // 공정기능(A3)
      procA4[c.processNo] || '',              // 제품특성(A4)
      c.specialChar || '',                    // 특별특성(A4)
      c.m4,                                   // 4M
      c.workElement || '',                    // 작업요소(B1)
      c.l3Function || '',                     // 요소기능(B2)
      procB3[c.processNo] || '',              // 공정특성(B3)
      '',                                     // 특별특성(B3)
      c.feValue,                              // 고장영향(C4)
      c.fmValue,                              // 고장형태(A5)
      c.fcValue,                              // 고장원인(B4)
      c.pcValue,                              // 예방관리(B5)
      c.dcValue,                              // 검출관리(A6)
      c.severity ? String(c.severity) : '',   // S
      c.occurrence ? String(c.occurrence) : '',// O
      c.detection ? String(c.detection) : '', // D
      c.ap,                                   // AP
    ]);
  }

  // ── 6. 통계 출력 ──
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║      T&F Import 데이터 추출 결과      ║');
  console.log('╠═══════════════════════════════════════╣');
  SHEET_DEFINITIONS.forEach(def => {
    const rows = sheetRows[def.name];
    const pad = def.name.padEnd(22);
    console.log(`║  ${pad} : ${String(rows.length).padStart(4)}건  ║`);
  });
  console.log('╚═══════════════════════════════════════╝');

  // ── 7. 엑셀 생성 (SHEET_DEFINITIONS 양식 그대로) ──
  const outWb = new ExcelJS.Workbook();
  outWb.creator = 'FMEA Smart System';
  outWb.created = new Date();

  SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = outWb.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    const rows = sheetRows[def.name] || [];
    const colWidths = rows.length > 0
      ? calcAutoWidths(def.headers, rows)
      : def.headers.map((h, i) => h === '4M' ? 8 : (i === 0 ? 14 : 25));

    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: colWidths[i],
    }));

    // 헤더 스타일
    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    // 데이터 행
    if (rows.length > 0) {
      rows.forEach((data, idx) => {
        const row = worksheet.addRow(data);
        const bg = idx % 2 === 0 ? 'FFFFFF' : 'F0F7FB';
        row.eachCell((cell, colNumber) => {
          applyDataCellStyle(cell, colWidths[colNumber - 1] || 20, bg);
        });
      });
    } else {
      // 데이터 없으면 빈 행 5개
      for (let i = 0; i < 5; i++) {
        const row = worksheet.addRow(def.headers.map(() => ''));
        row.eachCell((cell) => {
          cell.border = CELL_BORDERS;
          cell.font = { name: '맑은 고딕', size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
      }
    }

    // 첫 열 고정
    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  });

  // ── 8. 파일 저장 ──
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outPath = path.join(OUTPUT_DIR, 'T&F_JG1_Import_전체시트_R1.xlsx');
  await outWb.xlsx.writeFile(outPath);
  console.log(`\n✅ Import 파일 생성: ${outPath}`);

  // 단일시트 복사 (원본 그대로)
  const dstPath = path.join(OUTPUT_DIR, 'T&F_JG1_단일시트_Import.xlsx');
  fs.copyFileSync(INPUT_FILE, dstPath);
  console.log(`✅ 단일시트 Import 복사: ${dstPath}`);

  // ── 9. 검증 통계 파일 ──
  const statsLines = [
    '╔═══════════════════════════════════════════════════════╗',
    '║        T&F JG1 Import 검증 통계 (전체 시트)          ║',
    '╠═══════════════════════════════════════════════════════╣',
    `║  생성일: ${new Date().toISOString().split('T')[0]}                                ║`,
    `║  원본:  PFMEA STEP B_완벽버전.xlsx                   ║`,
    `║  추가:  _stepA_extra.json (A4/B3/C3)                 ║`,
    '╠═══════════════════════════════════════════════════════╣',
    '',
    '=== 시트별 건수 ===',
    ...SHEET_DEFINITIONS.map(def => {
      const cnt = sheetRows[def.name].length;
      return `  ${def.legacyName.padEnd(4)} ${def.name.padEnd(22)} : ${cnt}건`;
    }),
    '',
    '=== 공정 목록 ===',
    ...Array.from(processes.entries())
      .sort((a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0))
      .map(([no, p]) => `  ${no.padStart(4)}: ${p.name}`),
    '',
    '=== 공정별 고장형태(A5) ★ 검증 핵심 ===',
  ];

  const a5ByProc = {};
  a5Data.forEach(d => { a5ByProc[d.processNo] = (a5ByProc[d.processNo] || 0) + 1; });
  Object.entries(a5ByProc)
    .sort((a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0))
    .forEach(([pNo, cnt]) => { statsLines.push(`  ${pNo.padStart(4)}: ${cnt}건`); });
  statsLines.push(`  합계: ${a5Data.length}건`);

  statsLines.push('');
  statsLines.push('=== 공정별 고장원인(B4) ===');
  const b4ByProc = {};
  b4Data.forEach(d => { b4ByProc[d.processNo] = (b4ByProc[d.processNo] || 0) + 1; });
  Object.entries(b4ByProc)
    .sort((a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0))
    .forEach(([pNo, cnt]) => { statsLines.push(`  ${pNo.padStart(4)}: ${cnt}건`); });
  statsLines.push(`  합계: ${b4Data.length}건`);

  statsLines.push('');
  statsLines.push('=== 데이터 소스별 건수 ===');
  statsLines.push('  STEP B 추출:');
  statsLines.push(`    A1 공정: ${processes.size}, A3 기능: ${a3Data.length}, A5 고장형태: ${a5Data.length}, A6 검출: ${a6Data.length}`);
  statsLines.push(`    B1 작업요소: ${b1Data.length}, B2 기능: ${b2Data.length}, B4 원인: ${b4Data.length}, B5 예방: ${b5Data.length}`);
  statsLines.push(`    C1 구분: ${c1Data.length}, C2 기능: ${c2Data.length}, C4 영향: ${c4Data.length}`);
  statsLines.push(`    FC 사슬: ${chains.length}건`);
  statsLines.push('  STEP A 추가:');
  statsLines.push(`    A4 제품특성: ${stepAExtra.a4Data.length}, B3 공정특성: ${stepAExtra.b3Data.length}, C3 요구사항: ${stepAExtra.c3Data.length}`);

  const statsPath = path.join(OUTPUT_DIR, 'T&F_JG1_검증통계.txt');
  fs.writeFileSync(statsPath, statsLines.join('\n'), 'utf8');
  console.log(`✅ 검증 통계 파일: ${statsPath}`);
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  console.error(err.stack);
  process.exit(1);
});
