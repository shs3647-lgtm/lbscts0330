/**
 * 전체보기 엑셀 → 완전한 Import (마스터 DB + Atomic DB + Legacy)
 * 1. 엑셀 파싱 → flatData + chains
 * 2. /api/pfmea/master → PfmeaMasterDataset 저장
 * 3. /api/fmea/save-from-import → Legacy + Atomic DB 저장
 * 4. /api/fmea/pipeline-verify POST → 자동수정 + allGreen
 */
import ExcelJS from 'exceljs';

const INPUT = 'C:/Users/Administrator/Downloads/PFMEA_Master_au_bump_generated.xlsx';
const FMEA_ID = 'pfm26-m002';
const L1_NAME = 'au bump';

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(INPUT);

  const flatData = [];
  let orderIdx = 0;
  const c = (row, col) => String(row.getCell(col).value || '').trim();

  // A1
  wb.getWorksheet('L2-1(A1) 공정번호')?.eachRow((row, rn) => {
    if (rn === 1) return;
    const v = c(row, 1);
    if (v) flatData.push({ id: `A1-${orderIdx}`, processNo: v, category: 'A', itemCode: 'A1', value: v, orderIndex: orderIdx++ });
  });

  // A2
  wb.getWorksheet('L2-2(A2) 공정명')?.eachRow((row, rn) => {
    if (rn === 1) return;
    const pno = c(row, 1), val = c(row, 2);
    if (pno && val) flatData.push({ id: `A2-${orderIdx}`, processNo: pno, category: 'A', itemCode: 'A2', value: val, orderIndex: orderIdx++ });
  });

  // A3
  wb.getWorksheet('L2-3(A3) 공정기능')?.eachRow((row, rn) => {
    if (rn === 1) return;
    const pno = c(row, 1), val = c(row, 2);
    if (pno && val) flatData.push({ id: `A3-${orderIdx}`, processNo: pno, category: 'A', itemCode: 'A3', value: val, orderIndex: orderIdx++ });
  });

  // A4
  wb.getWorksheet('L2-4(A4) 제품특성')?.eachRow((row, rn) => {
    if (rn === 1) return;
    const pno = c(row, 1), val = c(row, 2), sc = c(row, 3);
    if (pno && val) flatData.push({ id: `A4-${orderIdx}`, processNo: pno, category: 'A', itemCode: 'A4', value: val, specialChar: sc || undefined, orderIndex: orderIdx++ });
  });

  // A5
  wb.getWorksheet('L2-5(A5) 고장형태')?.eachRow((row, rn) => {
    if (rn === 1) return;
    const pno = c(row, 1), val = c(row, 2);
    if (pno && val) flatData.push({ id: `A5-${orderIdx}`, processNo: pno, category: 'A', itemCode: 'A5', value: val, orderIndex: orderIdx++ });
  });

  // A6
  wb.getWorksheet('L2-6(A6) 검출관리')?.eachRow((row, rn) => {
    if (rn === 1) return;
    const pno = c(row, 1), val = c(row, 2);
    if (pno && val) flatData.push({ id: `A6-${orderIdx}`, processNo: pno, category: 'A', itemCode: 'A6', value: val, orderIndex: orderIdx++ });
  });

  // L3 통합(B1-B5)
  let cfPno = '';
  wb.getWorksheet('L3 통합(B1-B5)')?.eachRow((row, rn) => {
    if (rn === 1) return;
    const pno = c(row, 1), m4 = c(row, 2);
    const b1 = c(row, 3), b2 = c(row, 4), b3 = c(row, 5), sc = c(row, 6), b4 = c(row, 7), b5 = c(row, 8);
    if (pno) cfPno = pno;
    if (b1) flatData.push({ id: `B1-${orderIdx}`, processNo: cfPno, category: 'B', itemCode: 'B1', value: b1, m4: m4 || undefined, orderIndex: orderIdx++ });
    if (b2) flatData.push({ id: `B2-${orderIdx}`, processNo: cfPno, category: 'B', itemCode: 'B2', value: b2, m4: m4 || undefined, belongsTo: b1 || undefined, orderIndex: orderIdx++ });
    if (b3) flatData.push({ id: `B3-${orderIdx}`, processNo: cfPno, category: 'B', itemCode: 'B3', value: b3, m4: m4 || undefined, specialChar: sc || undefined, belongsTo: b1 || undefined, orderIndex: orderIdx++ });
    if (b4) flatData.push({ id: `B4-${orderIdx}`, processNo: cfPno, category: 'B', itemCode: 'B4', value: b4, m4: m4 || undefined, belongsTo: b1 || undefined, orderIndex: orderIdx++ });
    if (b5) flatData.push({ id: `B5-${orderIdx}`, processNo: cfPno, category: 'B', itemCode: 'B5', value: b5, m4: m4 || undefined, belongsTo: b1 || undefined, orderIndex: orderIdx++ });
  });

  // L1 통합(C1-C4)
  wb.getWorksheet('L1 통합(C1-C4)')?.eachRow((row, rn) => {
    if (rn === 1) return;
    const cat = c(row, 1), c2v = c(row, 2), c3v = c(row, 3), c4v = c(row, 4);
    if (cat) flatData.push({ id: `C1-${orderIdx}`, processNo: cat, category: 'C', itemCode: 'C1', value: cat, orderIndex: orderIdx++ });
    if (c2v) flatData.push({ id: `C2-${orderIdx}`, processNo: cat || 'L1', category: 'C', itemCode: 'C2', value: c2v, orderIndex: orderIdx++ });
    if (c3v) flatData.push({ id: `C3-${orderIdx}`, processNo: cat || 'L1', category: 'C', itemCode: 'C3', value: c3v, orderIndex: orderIdx++ });
    if (c4v) flatData.push({ id: `C4-${orderIdx}`, processNo: cat || 'L1', category: 'C', itemCode: 'C4', value: c4v, orderIndex: orderIdx++ });
  });

  // FC 고장사슬
  const chains = [];
  let cfFe = '', cfScope = '', cfPnoFC = '', cfFm = '';
  wb.getWorksheet('FC 고장사슬')?.eachRow((row, rn) => {
    if (rn === 1) return;
    const scope = c(row, 1) || cfScope, fe = c(row, 2) || cfFe;
    const pno = c(row, 3) || cfPnoFC, fm = c(row, 4) || cfFm;
    const m4 = c(row, 5), we = c(row, 6), fc = c(row, 7);
    const pc = c(row, 8), dc = c(row, 9);
    const occ = parseInt(c(row, 10)) || 0, det = parseInt(c(row, 11)) || 0, ap = c(row, 12);
    if (row.getCell(1).value) cfScope = scope;
    if (row.getCell(2).value) cfFe = fe;
    if (row.getCell(3).value) cfPnoFC = pno;
    if (row.getCell(4).value) cfFm = fm;
    if (fc) chains.push({ id: `chain-${chains.length}`, processNo: pno, m4, workElement: we, feValue: fe, feScope: scope, fmValue: fm, fcValue: fc, pcValue: pc, dcValue: dc, occurrence: occ, detection: det, ap });
  });

  // 통계
  const codes = ['A1','A2','A3','A4','A5','A6','B1','B2','B3','B4','B5','C1','C2','C3','C4'];
  for (const cd of codes) console.log(`${cd}: ${flatData.filter(d => d.itemCode === cd).length}`);
  console.log(`Chains: ${chains.length}, Total flatData: ${flatData.length}`);

  // ── STEP 1: 마스터 DB 저장 (PfmeaMasterDataset) ──
  console.log('\n=== STEP 1: Master DB 저장 ===');
  const masterRes = await fetch('http://localhost:3000/api/pfmea/master', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fmeaId: FMEA_ID, fmeaType: 'P', replace: true,
      flatData, failureChains: chains, mode: 'import',
    }),
  });
  const masterResult = await masterRes.json();
  console.log('Master save:', (masterResult.ok || masterResult.success) ? 'OK' : 'FAIL', masterResult.dataset?.id || masterResult.error || '');

  // ── STEP 2: save-from-import (Legacy + Atomic DB) ──
  console.log('\n=== STEP 2: save-from-import ===');
  const saveRes = await fetch('http://localhost:3000/api/fmea/save-from-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID, flatData, l1Name: L1_NAME, failureChains: chains }),
  });
  const saveResult = await saveRes.json();
  console.log('success:', saveResult.success);
  if (saveResult.atomicCounts) console.log('atomicCounts:', JSON.stringify(saveResult.atomicCounts));
  if (saveResult.error) console.log('ERROR:', saveResult.error);

  // ── STEP 3: pipeline-verify POST (자동수정) ──
  console.log('\n=== STEP 3: pipeline-verify POST ===');
  const pipeRes = await fetch('http://localhost:3000/api/fmea/pipeline-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID }),
  });
  const pipeResult = await pipeRes.json();
  console.log('allGreen:', pipeResult.allGreen, '| loopCount:', pipeResult.loopCount);
  for (const s of (pipeResult.steps || [])) {
    console.log(`  STEP ${s.step} ${s.name}: ${s.status}${s.issues?.length > 0 ? ' | ' + s.issues.join('; ') : ''}`);
  }

  console.log('\n=== 완료 ===');
}

main().catch(e => console.error('FATAL:', e));
