/**
 * 역설계 Import Excel → parse → save-from-import → pipeline-verify → M066 비교
 * 수정된 엑셀(carry-forward)로 M081에 Import하고 M066 100% 일치 검증
 */
import ExcelJS from 'exceljs';

const BASE = 'http://localhost:3000';
const SOURCE_FMEA = 'pfm26-m066';
const TARGET_FMEA = 'pfm26-m081';
const EXCEL_PATH = process.argv[2] || 'data/import-excel-m066-fixed.xlsx';

async function main() {
  console.log('=== 역설계 Import Excel 검증 테스트 (v2) ===');
  console.log(`원본: ${SOURCE_FMEA}, 대상: ${TARGET_FMEA}`);
  console.log(`엑셀: ${EXCEL_PATH}\n`);

  // 0. 기존 M081 데이터 삭제 (깨끗한 상태)
  console.log('--- STEP 0: M081 기존 데이터 삭제 ---');
  try {
    const delRes = await fetch(`${BASE}/api/fmea`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId: TARGET_FMEA }),
    });
    const delResult = await delRes.json();
    console.log('  삭제:', delResult.success ? 'OK' : 'SKIP', delResult.message || '');
  } catch { console.log('  삭제 스킵'); }
  console.log('');

  // 1. 엑셀 파싱
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  const l1Sheet = wb.getWorksheet('L1 통합(C1-C4)');
  const l2Sheet = wb.getWorksheet('L2 통합(A1-A6)');
  const l3Sheet = wb.getWorksheet('L3 통합(B1-B5)');
  const fcSheet = wb.getWorksheet('FC 고장사슬');

  if (!l2Sheet || !l3Sheet || !fcSheet) {
    console.error('필수 시트 누락');
    process.exit(1);
  }

  const flatData = [];
  let orderIdx = 0;

  // ─── L1 (C1~C4) ─── carry-forward 처리
  // processNo를 C1 카테고리명으로 설정해야 buildWorksheetState에서 올바르게 매칭됨
  if (l1Sheet) {
    let lastCat = '';
    l1Sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      const cat = String(row.getCell(1).value || '').trim();
      const func = String(row.getCell(2).value || '').trim();
      const req = String(row.getCell(3).value || '').trim();
      const fe = String(row.getCell(4).value || '').trim();

      if (cat) lastCat = cat;
      const effectiveCat = cat || lastCat;

      if (cat) flatData.push({ processNo: effectiveCat, category: 'C', itemCode: 'C1', value: effectiveCat, orderIndex: orderIdx++ });
      if (func) flatData.push({ processNo: effectiveCat, category: 'C', itemCode: 'C2', value: func, orderIndex: orderIdx++ });
      if (req) flatData.push({ processNo: effectiveCat, category: 'C', itemCode: 'C3', value: req, orderIndex: orderIdx++ });
      if (fe) flatData.push({ processNo: effectiveCat, category: 'C', itemCode: 'C4', value: fe, orderIndex: orderIdx++ });
    });
  }

  // ─── L2 (A1~A6) ─── carry-forward 처리
  let lastPNo = '', lastPName = '';
  l2Sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const rawPNo = String(row.getCell(1).value || '').trim();
    const rawPName = String(row.getCell(2).value || '').trim();

    if (rawPNo) { lastPNo = rawPNo; lastPName = rawPName; }
    const pNo = rawPNo || lastPNo;
    const pName = rawPName || lastPName;

    const func = String(row.getCell(3).value || '').trim();
    const prodChar = String(row.getCell(4).value || '').trim();
    const special = String(row.getCell(5).value || '').trim();
    const fm = String(row.getCell(6).value || '').trim();
    const dc = String(row.getCell(7).value || '').trim();

    if (rawPNo) {
      flatData.push({ processNo: pNo, category: '', itemCode: 'A1', value: pNo, orderIndex: orderIdx++ });
      flatData.push({ processNo: pNo, category: '', itemCode: 'A2', value: pName, orderIndex: orderIdx++ });
    }
    if (func) flatData.push({ processNo: pNo, category: '', itemCode: 'A3', value: func, orderIndex: orderIdx++ });
    if (prodChar) flatData.push({ processNo: pNo, category: '', itemCode: 'A4', value: prodChar, specialChar: special || undefined, orderIndex: orderIdx++ });
    if (fm) flatData.push({ processNo: pNo, category: '', itemCode: 'A5', value: fm, orderIndex: orderIdx++ });
    if (dc) flatData.push({ processNo: pNo, category: '', itemCode: 'A6', value: dc, orderIndex: orderIdx++ });
  });

  // ─── L3 (B1~B5) ─── carry-forward + parentItemId FK 기반 WE 직접 배치
  let lastL3PNo = '', lastM4 = '', lastWE = '';
  let currentB1Id = '';
  const weSeqMap = new Map(); // processNo|m4 → seq counter (WE 순번 결정)
  l3Sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const rawPNo = String(row.getCell(1).value || '').trim();
    const rawM4 = String(row.getCell(2).value || '').trim();
    const rawWE = String(row.getCell(3).value || '').trim();

    if (rawPNo) lastL3PNo = rawPNo;
    if (rawM4) lastM4 = rawM4;
    if (rawWE) lastWE = rawWE;
    const pNo = rawPNo || lastL3PNo;
    const m4 = rawM4 || lastM4;
    const we = rawWE || lastWE;

    const func = String(row.getCell(4).value || '').trim();
    const pc = String(row.getCell(5).value || '').trim();
    const special = String(row.getCell(6).value || '').trim();
    const fc = String(row.getCell(7).value || '').trim();
    const prev = String(row.getCell(8).value || '').trim();

    // B1 생성 시 고유 ID 부여 (parentItemId FK 소스)
    if (rawWE) {
      const m4Key = `${pNo}|${m4}`;
      const seq = (weSeqMap.get(m4Key) || 0) + 1;
      weSeqMap.set(m4Key, seq);
      const pNoNum = String(parseInt(pNo) || 0).padStart(3, '0');
      currentB1Id = `PF-L3-${pNoNum}-${m4}-${String(seq).padStart(3, '0')}`;
      flatData.push({ processNo: pNo, category: '', itemCode: 'B1', value: we, m4: m4 || undefined, id: currentB1Id, orderIndex: orderIdx++ });
    }
    if (func) flatData.push({ processNo: pNo, category: '', itemCode: 'B2', value: func, m4: m4 || undefined, parentItemId: currentB1Id, orderIndex: orderIdx++ });
    if (pc) flatData.push({ processNo: pNo, category: '', itemCode: 'B3', value: pc, m4: m4 || undefined, specialChar: special || undefined, parentItemId: currentB1Id, orderIndex: orderIdx++ });
    if (fc) flatData.push({ processNo: pNo, category: '', itemCode: 'B4', value: fc, m4: m4 || undefined, parentItemId: currentB1Id, orderIndex: orderIdx++ });
    if (prev) flatData.push({ processNo: pNo, category: '', itemCode: 'B5', value: prev, m4: m4 || undefined, parentItemId: currentB1Id, orderIndex: orderIdx++ });
  });

  // ─── FC 고장사슬 시트 ───
  const failureChains = [];
  fcSheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    failureChains.push({
      feScope: String(row.getCell(1).value || '').trim(),
      feValue: String(row.getCell(2).value || '').trim(),
      processNo: String(row.getCell(3).value || '').trim(),
      fmValue: String(row.getCell(4).value || '').trim(),
      m4: String(row.getCell(5).value || '').trim(),
      workElement: String(row.getCell(6).value || '').trim(),
      fcValue: String(row.getCell(7).value || '').trim(),
      pcValue: String(row.getCell(8).value || '').trim(),
      dcValue: String(row.getCell(9).value || '').trim(),
      severity: Number(row.getCell(10).value) || 0,
      occurrence: Number(row.getCell(11).value) || 0,
      detection: Number(row.getCell(12).value) || 0,
    });
  });

  // 중복 FC 제거: 동일 공정+FM+FC이면 1개만 유지 (같은 FC가 다른 FM에 연결은 정상)
  const chainSeen = new Set();
  const dedupedChains = failureChains.filter(c => {
    const key = `${c.processNo}|${c.fmValue}|${c.fcValue}`;
    if (chainSeen.has(key)) return false;
    chainSeen.add(key);
    return true;
  });
  if (dedupedChains.length < failureChains.length) {
    console.log(`  ⚠️ 중복 FC chain 제거: ${failureChains.length} → ${dedupedChains.length}`);
  }
  failureChains.length = 0;
  failureChains.push(...dedupedChains);

  const codes = {};
  for (const d of flatData) { codes[d.itemCode] = (codes[d.itemCode] || 0) + 1; }
  console.log('파싱 결과:');
  console.log(`  flatData: ${flatData.length}건`);
  console.log(`  failureChains: ${failureChains.length}건`);
  console.log('  항목별:', JSON.stringify(codes));

  // M066 기대값과 비교
  const expected = { A1:21, A2:21, A5:26, B1:91, B4:104, C1:3, C4:20 };
  let flatOk = true;
  for (const [k,v] of Object.entries(expected)) {
    const actual = codes[k] || 0;
    const icon = actual === v ? '✅' : actual >= v * 0.9 ? '⚠️' : '❌';
    if (actual !== v) flatOk = false;
    console.log(`    ${icon} ${k}: 기대=${v} 실제=${actual}`);
  }

  // 2. save-from-import 실행
  console.log('\n--- STEP 1: save-from-import 실행 ---');
  const saveRes = await fetch(`${BASE}/api/fmea/save-from-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fmeaId: TARGET_FMEA,
      flatData,
      l1Name: '12INCH AU BUMP',
      failureChains,
    }),
  });
  const saveResult = await saveRes.json();
  console.log('  결과:', saveRes.ok ? 'OK' : 'FAIL', saveRes.status);
  if (saveResult.atomicCounts) {
    console.log('  atomicCounts:', JSON.stringify(saveResult.atomicCounts));
  }
  if (saveResult.error) {
    console.log('  error:', saveResult.error);
    if (!saveRes.ok) {
      console.error('Import 실패. 종료.');
      process.exit(1);
    }
  }

  // 3. pipeline-verify
  console.log('\n--- STEP 2: pipeline-verify (M081) ---');
  const verifyRes = await fetch(`${BASE}/api/fmea/pipeline-verify?fmeaId=${TARGET_FMEA}`);
  const verifyResult = await verifyRes.json();
  for (const step of verifyResult.steps || []) {
    const icon = step.status === 'ok' ? '✅' : step.status === 'warn' ? '⚠️' : '❌';
    console.log(`  STEP ${step.step} ${step.name}: ${icon} ${step.status}`);
    if (step.issues && step.issues.length > 0) {
      for (const iss of step.issues) console.log(`    - ${iss}`);
    }
  }
  console.log(`  allGreen: ${verifyResult.allGreen}`);

  // 4. M066 pipeline-verify
  console.log('\n--- STEP 3: M066 vs M081 수치 비교 ---');
  const m066Res = await fetch(`${BASE}/api/fmea/pipeline-verify?fmeaId=${SOURCE_FMEA}`);
  const m066Result = await m066Res.json();

  const m066s1 = m066Result.steps?.find(s => s.step === 1);
  const m081s1 = verifyResult.steps?.find(s => s.step === 1);

  if (m066s1 && m081s1) {
    const keys = ['L2', 'L3', 'L3F', 'L2F', 'L1F', 'FM', 'FE', 'FC', 'FL', 'RA'];
    let matchCount = 0;
    for (const k of keys) {
      const s = m066s1.details[k];
      const t = m081s1.details[k];
      const icon = s === t ? '✅' : '❌';
      if (s === t) matchCount++;
      console.log(`  ${icon} ${k}: M066=${s} M081=${t}`);
    }
    console.log(`  일치율: ${matchCount}/${keys.length} (${Math.round(matchCount/keys.length*100)}%)`);
  }

  // 5. M066 구조 상세 비교
  const m066s0 = m066Result.steps?.find(s => s.step === 0);
  const m081s0 = verifyResult.steps?.find(s => s.step === 0);
  if (m066s0 && m081s0) {
    console.log('\n  구조 비교:');
    for (const k of ['l1', 'l2', 'l3', 'l1F']) {
      const s = m066s0.details[k];
      const t = m081s0.details[k];
      const icon = s === t ? '✅' : '❌';
      console.log(`    ${icon} ${k}: M066=${s} M081=${t}`);
    }
  }

  // 6. FK 비교
  const m066s3 = m066Result.steps?.find(s => s.step === 3);
  const m081s3 = verifyResult.steps?.find(s => s.step === 3);
  if (m066s3 && m081s3) {
    console.log('\n  FK 비교:');
    for (const k of ['totalOrphans', 'unlinkedFC', 'unlinkedFM', 'flWithoutRA']) {
      const s = m066s3.details[k];
      const t = m081s3.details[k];
      const icon = s === t ? '✅' : '❌';
      console.log(`    ${icon} ${k}: M066=${s} M081=${t}`);
    }
  }

  console.log('\n=== 검증 완료 ===');
}

main().catch(console.error);
