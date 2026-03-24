#!/usr/bin/env node
/**
 * pfm26-m006 Import 엑셀 Roundtrip E2E 테스트
 *
 * 1. 새 프로젝트 생성
 * 2. 생성된 엑셀을 position-parser로 파싱
 * 3. save-position-import로 DB 저장
 * 4. pipeline-verify로 검증
 * 5. 원본 m006과 비교
 */
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:3000/api';
const EXCEL_PATH = 'C:\\Users\\Administrator\\Desktop\\importdatadesign\\pfm26-m006-complete.xlsx';

// ─── 색상 출력 ───
const OK = (s) => `✅ ${s}`;
const FAIL = (s) => `❌ ${s}`;
const WARN = (s) => `⚠️  ${s}`;

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  pfm26-m006 Import Roundtrip E2E 검증');
  console.log('═══════════════════════════════════════════════════\n');

  // ─── STEP 0: 엑셀 파일 확인 ───
  if (!fs.existsSync(EXCEL_PATH)) {
    console.log(FAIL('엑셀 파일 없음: ' + EXCEL_PATH));
    process.exit(1);
  }
  console.log(OK('엑셀 파일 확인: ' + EXCEL_PATH));

  // ─── STEP 1: 새 프로젝트 생성 ───
  console.log('\n── STEP 1: 새 프로젝트 생성 ──');
  const createRes = await fetch(`${BASE}/triplet/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      docType: 'part', standalone: true,
      subject: `m006 Roundtrip Test ${Date.now()}`,
      productName: '12inch Au Bump (Test)',
    }),
  });
  const createData = await createRes.json();
  if (!createData.success) {
    console.log(FAIL('프로젝트 생성 실패: ' + createData.error));
    process.exit(1);
  }
  const testFmeaId = createData.pfmeaId;
  console.log(OK(`프로젝트 생성: ${testFmeaId}`));

  // ─── STEP 2: 엑셀 파싱 (위치기반) ───
  console.log('\n── STEP 2: 엑셀 파싱 ──');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  const sheets = wb.worksheets.map(ws => ws.name);
  console.log('시트:', sheets.join(', '));

  // L1 시트 파싱
  const s1 = wb.getWorksheet('L1 통합(C1-C4)');
  const l1Rows = [];
  s1.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // 헤더 스킵
    l1Rows.push({
      row: rowNum,
      c1: String(row.getCell(1).value || '').trim(),
      c2: String(row.getCell(2).value || '').trim(),
      c3: String(row.getCell(3).value || '').trim(),
      c4: String(row.getCell(4).value || '').trim(),
    });
  });

  // L2 시트 파싱
  const s2 = wb.getWorksheet('L2 통합(A1-A6)');
  const l2Rows = [];
  s2.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    l2Rows.push({
      row: rowNum,
      a1: String(row.getCell(1).value || '').trim(),
      a2: String(row.getCell(2).value || '').trim(),
      a3: String(row.getCell(3).value || '').trim(),
      a4: String(row.getCell(4).value || '').trim(),
      sc: String(row.getCell(5).value || '').trim(),
      a5: String(row.getCell(6).value || '').trim(),
      a6: String(row.getCell(7).value || '').trim(),
    });
  });

  // L3 시트 파싱
  const s3 = wb.getWorksheet('L3 통합(B1-B5)');
  const l3Rows = [];
  s3.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    l3Rows.push({
      row: rowNum,
      pno: String(row.getCell(1).value || '').trim(),
      m4: String(row.getCell(2).value || '').trim(),
      b1: String(row.getCell(3).value || '').trim(),
      b2: String(row.getCell(4).value || '').trim(),
      b3: String(row.getCell(5).value || '').trim(),
      sc: String(row.getCell(6).value || '').trim(),
      b4: String(row.getCell(7).value || '').trim(),
      b5: String(row.getCell(8).value || '').trim(),
    });
  });

  // FC 시트 파싱
  const s4 = wb.getWorksheet('FC 고장사슬');
  const fcRows = [];
  s4.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    fcRows.push({
      row: rowNum,
      feScope: String(row.getCell(1).value || '').trim(),
      feText: String(row.getCell(2).value || '').trim(),
      pno: String(row.getCell(3).value || '').trim(),
      fmText: String(row.getCell(4).value || '').trim(),
      m4: String(row.getCell(5).value || '').trim(),
      we: String(row.getCell(6).value || '').trim(),
      fcText: String(row.getCell(7).value || '').trim(),
      pc: String(row.getCell(8).value || '').trim(),
      dc: String(row.getCell(9).value || '').trim(),
      s: Number(row.getCell(10).value) || 1,
      o: Number(row.getCell(11).value) || 1,
      d: Number(row.getCell(12).value) || 1,
      ap: String(row.getCell(13).value || 'L').trim(),
      l1Row: Number(row.getCell(14).value) || 0,
      l2Row: Number(row.getCell(15).value) || 0,
      l3Row: Number(row.getCell(16).value) || 0,
    });
  });

  console.log(`L1: ${l1Rows.length}행, L2: ${l2Rows.length}행, L3: ${l3Rows.length}행, FC: ${fcRows.length}행`);

  // ─── STEP 3: save-position-import 호출 ───
  console.log('\n── STEP 3: DB 저장 (save-position-import) ──');

  // 위치기반 atomicData 구축
  const fmeaId = testFmeaId.toLowerCase();

  // L1
  const l1Structure = { id: 'L1-STRUCT', fmeaId, name: '12inch Au Bump', parentId: null };
  const l1Functions = [];
  const l1Scopes = [];
  const l1Requirements = [];
  const failureEffects = [];
  const seenL1Func = new Map(); // C2 → id

  for (const r of l1Rows) {
    const funcKey = `${r.c1}|${r.c2}`;
    let funcId;
    if (!seenL1Func.has(funcKey)) {
      funcId = `L1-R${r.row}-C2`;
      seenL1Func.set(funcKey, funcId);
      l1Functions.push({
        id: funcId, fmeaId, l1StructId: 'L1-STRUCT', parentId: 'L1-STRUCT',
        functionName: r.c2, requirement: r.c3, category: r.c1,
      });
    } else {
      funcId = seenL1Func.get(funcKey);
    }

    const feId = `L1-R${r.row}-C4`;
    failureEffects.push({
      id: feId, fmeaId, l1FuncId: funcId, l1StructId: 'L1-STRUCT', parentId: funcId,
      effect: r.c4, category: r.c1, severity: 0,
    });
  }

  // L2
  const l2Structures = [];
  const l2Functions = [];
  const l2ProcessNos = [];
  const l2ProcessNames = [];
  const l2SpecialChars = [];
  const processProductChars = [];
  const failureModes = [];
  const seenL2 = new Map(); // pno → l2Id

  for (const r of l2Rows) {
    let l2Id;
    if (!seenL2.has(r.a1)) {
      l2Id = `L2-R${r.row}`;
      seenL2.set(r.a1, l2Id);
      l2Structures.push({ id: l2Id, fmeaId, parentId: 'L1-STRUCT', l1Id: 'L1-STRUCT', name: r.a2, processNo: String(r.a1), no: String(r.a1), order: l2Structures.length });
    } else {
      l2Id = seenL2.get(r.a1);
    }

    const funcId = `L2-R${r.row}-C4`;
    l2Functions.push({
      id: funcId, fmeaId, parentId: l2Id, l2StructId: l2Id,
      functionName: r.a3, productChar: r.a4, order: l2Functions.length,
    });

    const ppcId = `L2-R${r.row}-C5`;
    processProductChars.push({
      id: ppcId, fmeaId, l2StructId: l2Id, l2FuncId: funcId,
      name: r.a4, specialChar: r.sc || null,
    });

    const fmId = `L2-R${r.row}-C6`;
    failureModes.push({
      id: fmId, fmeaId, l2StructId: l2Id, l2FuncId: funcId,
      mode: r.a5, productCharId: ppcId, parentId: funcId,
    });
  }

  // L3
  const l3Structures = [];
  const l3Functions = [];
  const l3ProcessChars = [];
  const l3FourMs = [];
  const l3WorkElements = [];
  const l3ProcessNos = [];
  const l3SpecialChars = [];
  const failureCauses = [];
  const seenL3 = new Map(); // pno|m4|b1 → l3Id

  for (const r of l3Rows) {
    const l3Key = `${r.pno}|${r.m4}|${r.b1}`;
    const l2Id = seenL2.get(r.pno) || '';
    let l3Id;
    if (!seenL3.has(l3Key)) {
      l3Id = `L3-R${r.row}`;
      seenL3.set(l3Key, l3Id);
      l3Structures.push({
        id: l3Id, fmeaId, parentId: l2Id, l1Id: 'L1-STRUCT', l2Id: l2Id,
        name: r.b1, m4: r.m4, fourM: r.m4, processNo: r.pno, order: l3Structures.length,
      });
    } else {
      l3Id = seenL3.get(l3Key);
    }

    const l3fId = `L3-R${r.row}-C4`;
    l3Functions.push({
      id: l3fId, fmeaId, parentId: l3Id, l3StructId: l3Id, l2StructId: l2Id,
      functionName: r.b2, processChar: r.b3, specialChar: r.sc || null, order: l3Functions.length,
    });

    const fcId = `L3-R${r.row}-C7`;
    failureCauses.push({
      id: fcId, fmeaId, parentId: l3fId,
      l3StructId: l3Id, l2StructId: l2Id, l3FuncId: l3fId,
      l3CharId: l3fId, processCharId: l3fId,
      cause: r.b4,
    });
  }

  // FC 시트 → FailureLinks + RiskAnalyses
  const failureLinks = [];
  const riskAnalyses = [];

  for (const r of fcRows) {
    const feId = `L1-R${r.l1Row}-C4`;
    const fmId = `L2-R${r.l2Row}-C6`;
    const fcId = `L3-R${r.l3Row}-C7`;

    const flId = `FC-R${r.row}`;
    failureLinks.push({
      id: flId, fmeaId, fmId, feId, fcId,
      fmText: r.fmText, feText: r.feText, fcText: r.fcText,
      feScope: r.feScope, fcM4: r.m4, fcWorkElem: r.we,
      severity: r.s,
    });

    riskAnalyses.push({
      id: `${flId}-RA`, fmeaId, linkId: flId,
      severity: r.s, occurrence: r.o, detection: r.d, ap: r.ap,
      preventionControl: r.pc, detectionControl: r.dc,
    });
  }

  const atomicData = {
    fmeaId,
    l1Structure,
    l1Functions, l1Scopes: [], l1Requirements: [],
    l2Structures, l2Functions, l2ProcessNos: [], l2ProcessNames: [], l2SpecialChars: [],
    l3Structures, l3Functions, l3ProcessChars: [], l3FourMs: [], l3WorkElements: [], l3ProcessNos: [], l3SpecialChars: [],
    processProductChars, failureEffects, failureModes, failureCauses,
    failureLinks, riskAnalyses,
    stats: {
      l1Rows: l1Rows.length, l2Rows: l2Rows.length,
      l3Rows: l3Rows.length, fcRows: fcRows.length,
    },
  };

  console.log('atomicData 구축 완료:');
  console.log(`  L2: ${l2Structures.length}, L3: ${l3Structures.length}`);
  console.log(`  FM: ${failureModes.length}, FE: ${failureEffects.length}, FC: ${failureCauses.length}`);
  console.log(`  FL: ${failureLinks.length}, RA: ${riskAnalyses.length}`);

  // save-position-import 호출
  const saveRes = await fetch(`${BASE}/fmea/save-position-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId, atomicData, force: true }),
  });
  const saveData = await saveRes.json();
  if (!saveData.success) {
    console.log(FAIL('저장 실패: ' + (saveData.error || JSON.stringify(saveData).substring(0, 300))));
    process.exit(1);
  }
  console.log(OK('DB 저장 성공'));
  console.log('  atomicCounts:', JSON.stringify(saveData.atomicCounts || saveData.counts || {}));

  // ─── STEP 4: Pipeline Verify ───
  console.log('\n── STEP 4: 파이프라인 검증 ──');
  const pvRes = await fetch(`${BASE}/fmea/pipeline-verify?fmeaId=${fmeaId}`);
  const pv = await pvRes.json();

  const fkStep = pv.steps?.find(s => s.name === 'FK');
  const uuidStep = pv.steps?.find(s => s.name === 'UUID');

  const results = {
    L2: uuidStep?.details?.L2 || 0,
    FM: uuidStep?.details?.FM || 0,
    FE: uuidStep?.details?.FE || 0,
    FC: uuidStep?.details?.FC || 0,
    FL: uuidStep?.details?.FL || fkStep?.details?.links || 0,
    RA: uuidStep?.details?.RA || 0,
    unlinkedFC: fkStep?.details?.unlinkedFC || 0,
    allGreen: pv.allGreen,
  };

  console.log('검증 결과:');
  Object.entries(results).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });

  // ─── STEP 5: 원본 m006 비교 ───
  console.log('\n── STEP 5: 원본 m006 대비 비교 ──');
  const origPv = await (await fetch(`${BASE}/fmea/pipeline-verify?fmeaId=pfm26-m006`)).json();
  const origFk = origPv.steps?.find(s => s.name === 'FK');
  const origUuid = origPv.steps?.find(s => s.name === 'UUID');

  const origResults = {
    L2: origUuid?.details?.L2 || 0,
    FM: origUuid?.details?.FM || 0,
    FE: origUuid?.details?.FE || 0,
    FC: origUuid?.details?.FC || 0,
    FL: origUuid?.details?.FL || origFk?.details?.links || 0,
    RA: origUuid?.details?.RA || 0,
  };

  console.log('항목'.padEnd(12) + '원본(m006)'.padEnd(12) + 'Import'.padEnd(12) + '결과');
  console.log('─'.repeat(48));
  let allMatch = true;
  for (const key of ['L2', 'FM', 'FE', 'FC', 'FL', 'RA']) {
    const orig = origResults[key];
    const test = results[key];
    const match = orig === test;
    if (!match) allMatch = false;
    console.log(`${key.padEnd(12)}${String(orig).padEnd(12)}${String(test).padEnd(12)}${match ? OK('일치') : FAIL('불일치')}`);
  }
  console.log(`${'unlinkedFC'.padEnd(12)}${'0'.padEnd(12)}${String(results.unlinkedFC).padEnd(12)}${results.unlinkedFC === 0 ? OK('일치') : FAIL('미연결 FC 존재')}`);

  console.log('\n═══════════════════════════════════════════════════');
  if (allMatch && results.unlinkedFC === 0) {
    console.log(OK('🎉 Roundtrip E2E 검증 PASS — 100% 고장연결 완벽!'));
    console.log(`   프로젝트: ${testFmeaId}`);
    console.log(`   FL: ${results.FL}건 (원본 동일)`);
    console.log(`   미연결: 0건`);
  } else {
    console.log(FAIL('Roundtrip 검증 실패'));
  }
  console.log('═══════════════════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
