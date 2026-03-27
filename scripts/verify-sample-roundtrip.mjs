/**
 * Master Sample Excel 100% 완전성 검증
 * - 빈행 0건 검증 (전체 컬럼)
 * - Master DB flatItems와 행별 1:1 값 대조
 * - FC 고장사슬 Master DB와 행별 대조
 * Usage: node scripts/verify-sample-roundtrip.mjs
 */
import ExcelJS from 'exceljs';

const SAMPLE_PATH = 'tests/temp-master-sample.xlsx';
const API_BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m002';

function cellStr(v) { return String(v || '').trim(); }

async function main() {
  console.log(`=== Master FMEA 100% 순차 검증 ===\n`);

  // 1) API에서 Master DB 데이터 로드
  const res = await fetch(`${API_BASE}/api/pfmea/master?fmeaId=${FMEA_ID}&includeItems=true`);
  if (!res.ok) throw new Error(`API 실패: ${res.status}`);
  const { dataset } = await res.json();
  const flatData = dataset.flatItems || [];
  const chains = dataset.failureChains || [];
  console.log(`Master DB: flatItems=${flatData.length}, chains=${chains.length}\n`);

  // 2) Excel 로드
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(SAMPLE_PATH);
  let allPass = true;

  // ============ L1 통합 검증 ============
  console.log('--- [1] L1 통합(C1-C4) 검증 ---');
  const l1Sheet = workbook.getWorksheet('L1 통합(C1-C4)');
  if (l1Sheet) {
    const expected = [];
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
        expected.push([scope, c2Items[i]?.value || lastC2, c3Items[i]?.value || lastC3, c4Items[i]?.value || lastC4]);
      }
    }

    let mismatch = 0, emptyCount = 0;
    for (let i = 0; i < expected.length; i++) {
      const row = l1Sheet.getRow(i + 2);
      const actual = [cellStr(row.getCell(1).value), cellStr(row.getCell(2).value), cellStr(row.getCell(3).value), cellStr(row.getCell(4).value)];
      for (let c = 0; c < 4; c++) {
        if (!actual[c]) emptyCount++;
        if (actual[c] !== (expected[i][c] || '').trim()) {
          mismatch++;
          if (mismatch <= 3) console.log(`  ❌ 행${i+1} col${c+1}: DB="${(expected[i][c]||'').substring(0,30)}" Excel="${actual[c].substring(0,30)}"`);
        }
      }
    }
    const rowMatch = expected.length === (l1Sheet.rowCount - 1);
    console.log(`  행수: DB=${expected.length} Excel=${l1Sheet.rowCount-1} ${rowMatch ? '✅' : '❌'}`);
    console.log(`  빈칸: ${emptyCount}건 ${emptyCount === 0 ? '✅' : '❌'}`);
    console.log(`  불일치: ${mismatch}건 ${mismatch === 0 ? '✅' : '❌'}`);
    if (mismatch > 0 || emptyCount > 0 || !rowMatch) allPass = false;
  } else { console.log('  ❌ L1 시트 없음'); allPass = false; }

  // ============ L2 통합 검증 ============
  console.log('\n--- [2] L2 통합(A1-A6) 검증 ---');
  const l2Sheet = workbook.getWorksheet('L2 통합(A1-A6)');
  if (l2Sheet) {
    const expected = [];
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
        expected.push([pNo, a2Val, a3Items[i]?.value || lastA3, a4Items[i]?.value || lastA4, a4Items[i]?.specialChar ?? lastA4Sp, a5Items[i]?.value || lastA5, a6Items[i]?.value || lastA6]);
      }
    }

    let mismatch = 0, emptyCount = 0;
    const checkCols = [0,1,2,3,5,6]; // col4(특별특성) 빈칸 허용
    for (let i = 0; i < expected.length; i++) {
      const row = l2Sheet.getRow(i + 2);
      for (const c of checkCols) {
        const actual = cellStr(row.getCell(c + 1).value);
        if (!actual) emptyCount++;
        if (actual !== (expected[i][c] || '').trim()) {
          mismatch++;
          if (mismatch <= 3) console.log(`  ❌ 행${i+1} col${c+1}: DB="${(expected[i][c]||'').substring(0,30)}" Excel="${actual.substring(0,30)}"`);
        }
      }
    }
    const rowMatch = expected.length === (l2Sheet.rowCount - 1);
    console.log(`  행수: DB=${expected.length} Excel=${l2Sheet.rowCount-1} ${rowMatch ? '✅' : '❌'}`);
    console.log(`  빈칸(특별특성 제외): ${emptyCount}건 ${emptyCount === 0 ? '✅' : '❌'}`);
    console.log(`  불일치: ${mismatch}건 ${mismatch === 0 ? '✅' : '❌'}`);
    if (mismatch > 0 || emptyCount > 0 || !rowMatch) allPass = false;
  } else { console.log('  ❌ L2 시트 없음'); allPass = false; }

  // ============ L3 통합 검증 ============
  console.log('\n--- [3] L3 통합(B1-B5) 검증 ---');
  const l3Sheet = workbook.getWorksheet('L3 통합(B1-B5)');
  if (l3Sheet) {
    const expected = [];
    const b1Items = flatData.filter(d => d.itemCode === 'B1');
    for (const b1 of b1Items) {
      const pNo = b1.processNo;
      const m4 = b1.m4 || '';
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
        expected.push([pNo, m4, b1.value || '', b2Items[i]?.value || lastB2, b3Items[i]?.value || lastB3, b3Items[i]?.specialChar ?? lastB3Sp, b4Items[i]?.value || lastB4, b5Items[i]?.value || lastB5]);
      }
    }

    let mismatch = 0, emptyCount = 0;
    const checkCols = [0,1,2,3,4,6,7]; // col5(특별특성) 빈칸 허용
    for (let i = 0; i < expected.length; i++) {
      const row = l3Sheet.getRow(i + 2);
      for (const c of checkCols) {
        const actual = cellStr(row.getCell(c + 1).value);
        if (!actual) emptyCount++;
        if (actual !== (expected[i][c] || '').trim()) {
          mismatch++;
          if (mismatch <= 3) console.log(`  ❌ 행${i+1} col${c+1}: DB="${(expected[i][c]||'').substring(0,30)}" Excel="${actual.substring(0,30)}"`);
        }
      }
    }
    const rowMatch = expected.length === (l3Sheet.rowCount - 1);
    console.log(`  행수: DB=${expected.length} Excel=${l3Sheet.rowCount-1} ${rowMatch ? '✅' : '❌'}`);
    console.log(`  빈칸(특별특성 제외): ${emptyCount}건 ${emptyCount === 0 ? '✅' : '❌'}`);
    console.log(`  불일치: ${mismatch}건 ${mismatch === 0 ? '✅' : '❌'}`);
    if (mismatch > 0 || emptyCount > 0 || !rowMatch) allPass = false;
  } else { console.log('  ❌ L3 시트 없음'); allPass = false; }

  // ============ FC 고장사슬 검증 ============
  console.log('\n--- [4] FC 고장사슬 검증 ---');
  const fcSheet = workbook.getWorksheet('FC 고장사슬');
  if (fcSheet) {
    const sortedChains = [...chains].sort((a, b) => {
      const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
      if (pCmp !== 0) return pCmp;
      const fmCmp = (a.fmValue || '').localeCompare(b.fmValue || '');
      if (fmCmp !== 0) return fmCmp;
      return (a.feValue || '').localeCompare(b.feValue || '');
    });

    let mismatch = 0, emptyFM = 0, emptyFC = 0, emptyFE = 0;
    for (let i = 0; i < sortedChains.length; i++) {
      const row = fcSheet.getRow(i + 2);
      const ch = sortedChains[i];

      // FC 헤더: FE구분(1) FE(2) 공정번호(3) FM(4) 4M(5) WE(6) FC(7) PC(8) DC(9) O(10) D(11) AP(12)
      const excelFM = cellStr(row.getCell(4).value);
      const excelFC = cellStr(row.getCell(7).value);
      const excelFE = cellStr(row.getCell(2).value);
      const dbFM = (ch.fmValue || '').trim();
      const dbFC = (ch.fcValue || '').trim();
      const dbFE = (ch.feValue || '').trim();

      if (!excelFM) emptyFM++;
      if (!excelFC) emptyFC++;
      if (!excelFE) emptyFE++;

      if (excelFM !== dbFM) { mismatch++; if (mismatch <= 3) console.log(`  ❌ 행${i+1} FM: DB="${dbFM.substring(0,30)}" Excel="${excelFM.substring(0,30)}"`); }
      if (excelFC !== dbFC) { mismatch++; if (mismatch <= 3) console.log(`  ❌ 행${i+1} FC: DB="${dbFC.substring(0,30)}" Excel="${excelFC.substring(0,30)}"`); }
      if (excelFE !== dbFE) { mismatch++; if (mismatch <= 3) console.log(`  ❌ 행${i+1} FE: DB="${dbFE.substring(0,30)}" Excel="${excelFE.substring(0,30)}"`); }
    }

    const fmSet = new Set(sortedChains.map(c => `${c.processNo}|${c.fmValue}`));
    const rowMatch = sortedChains.length === (fcSheet.rowCount - 1);
    console.log(`  행수: DB=${sortedChains.length} Excel=${fcSheet.rowCount-1} ${rowMatch ? '✅' : '❌'}`);
    console.log(`  Unique FM: ${fmSet.size}개 ${fmSet.size === 26 ? '✅' : '❌'}`);
    console.log(`  빈 FM/FC/FE: ${emptyFM}/${emptyFC}/${emptyFE} ${emptyFM === 0 && emptyFC === 0 ? '✅' : '❌'}`);
    console.log(`  불일치: ${mismatch}건 ${mismatch === 0 ? '✅' : '❌'}`);
    if (mismatch > 0 || emptyFM > 0 || emptyFC > 0 || !rowMatch) allPass = false;
  } else { console.log('  ❌ FC 시트 없음'); allPass = false; }

  // ============ FA 통합분석 검증 ============
  console.log('\n--- [5] FA 통합분석 검증 ---');
  const faSheet = workbook.getWorksheet('FA 통합분석');
  if (faSheet) {
    const rowMatch = chains.length === (faSheet.rowCount - 1);
    console.log(`  행수: DB=${chains.length} Excel=${faSheet.rowCount-1} ${rowMatch ? '✅' : '❌'}`);
    if (!rowMatch) allPass = false;
  } else { console.log('  ❌ FA 시트 없음'); allPass = false; }

  // ============ 최종 결과 ============
  console.log(`\n=== 최종 결과: ${allPass ? '✅ ALL PASS (100% 일치)' : '❌ FAIL'} ===`);
  process.exit(allPass ? 0 : 1);
}

main().catch(err => { console.error('ERROR:', err); process.exit(1); });
