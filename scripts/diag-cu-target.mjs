/**
 * Cu Target B3 누락 진단 스크립트
 * 1. 원본 엑셀에서 Cu Target 데이터 확인
 * 2. 생성된 엑셀에서 Cu Target 데이터 확인
 * 3. DB에서 Cu Target L3Function processChar 확인
 * 4. legacy data에서 Cu Target 구조 확인
 */
import ExcelJS from 'exceljs';
import fs from 'fs';

const ORIGINAL = 'data/master-fmea/master_import_12inch_AuBump.xlsx';
const GENERATED = 'data/master-fmea/PFMEA_Master_12inch_AuBump.xlsx';
const MASTER_JSON = 'data/master-fmea/pfm26-m066.json';
const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m066';

async function checkExcel(filePath, label) {
  console.log(`\n=== ${label}: ${filePath} ===`);
  if (!fs.existsSync(filePath)) { console.log('  FILE NOT FOUND'); return; }
  
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fs.readFileSync(filePath));
  
  // 모든 시트에서 "Cu Target" 검색
  wb.eachSheet((ws) => {
    let found = false;
    ws.eachRow((row, ri) => {
      const rowText = [];
      row.eachCell((cell) => rowText.push(String(cell.value || '')));
      const fullText = rowText.join('|');
      if (fullText.includes('Cu Target') || fullText.includes('Cu target')) {
        if (!found) { console.log(`  [${ws.name}]`); found = true; }
        console.log(`    Row ${ri}: ${rowText.map(v => v.substring(0, 40)).join(' | ')}`);
      }
    });
  });
  
  // B3 시트에서 공정 40 확인
  const b3Sheet = wb.worksheets.find(w => w.name.includes('B3') || w.name.includes('공정특성'));
  if (b3Sheet) {
    console.log(`  [B3 시트: ${b3Sheet.name}]`);
    b3Sheet.eachRow((row, ri) => {
      const pNo = String(row.getCell(1).value || '').trim();
      if (pNo === '40' || pNo === '040') {
        const rowText = [];
        row.eachCell((cell) => rowText.push(String(cell.value || '')));
        console.log(`    Row ${ri}: ${rowText.join(' | ')}`);
      }
    });
  }
  
  // 통합 시트에서 공정 40 + Cu Target 확인
  for (const ws of wb.worksheets) {
    if (ws.name.includes('통합') || ws.name.includes('L3')) {
      let found2 = false;
      ws.eachRow((row, ri) => {
        const rowText = [];
        row.eachCell((cell) => rowText.push(String(cell.value || '')));
        const fullText = rowText.join('|');
        if (fullText.includes('Cu Target') || fullText.includes('Cu target')) {
          if (!found2) { console.log(`  [통합시트: ${ws.name}]`); found2 = true; }
          console.log(`    Row ${ri}: ${rowText.map(v => v.substring(0, 40)).join(' | ')}`);
        }
      });
    }
  }
}

async function checkMasterJSON() {
  console.log('\n=== Master JSON (Atomic DB) ===');
  const d = JSON.parse(fs.readFileSync(MASTER_JSON, 'utf8'));
  
  // L3Function에서 Cu Target 관련 확인
  const l3s = d.atomicDB.l3Structures;
  const l3Funcs = d.atomicDB.l3Functions;
  const l2s = d.atomicDB.l2Structures;
  
  const cuTargetL3 = l3s.find(s => s.name === 'Cu Target');
  if (cuTargetL3) {
    const l2 = l2s.find(s => s.id === cuTargetL3.l2Id);
    console.log(`  Cu Target L3: id=${cuTargetL3.id} m4=${cuTargetL3.m4} l2=${l2?.name}(${l2?.no})`);
    
    const funcs = l3Funcs.filter(f => f.l3StructId === cuTargetL3.id);
    console.log(`  L3Functions for Cu Target (${funcs.length}건):`);
    funcs.forEach(f => {
      console.log(`    id=${f.id}`);
      console.log(`    functionName=${f.functionName}`);
      console.log(`    processChar=${JSON.stringify(f.processChar)}`);
      console.log(`    specialChar=${JSON.stringify(f.specialChar)}`);
    });
  }
  
  // flatData에서 Cu Target 관련 B3 확인
  const flatB3_40 = d.flatData.filter(f => f.itemCode === 'B3' && f.processNo === '40');
  console.log(`\n  flatData B3 for process 40 (${flatB3_40.length}건):`);
  flatB3_40.forEach(f => console.log(`    m4=${f.m4} val=${f.value}`));
}

async function checkLegacy() {
  console.log('\n=== Legacy Data (Cu Target in l2[].l3[]) ===');
  try {
    const res = await fetch(`${BASE}/api/fmea?fmeaId=${FMEA_ID}`);
    const json = await res.json();
    const data = json.data || json;
    const l2arr = data.l2 || [];
    
    const proc40 = l2arr.find(p => p.no === '40' || p.no === 40);
    if (!proc40) { console.log('  Process 40 not found'); return; }
    
    console.log(`  Process 40: ${proc40.name} (${(proc40.l3||[]).length} work elements)`);
    
    for (const we of (proc40.l3 || [])) {
      if (we.name === 'Cu Target' || we.name?.includes('Cu Target')) {
        console.log(`\n  Cu Target work element:`);
        console.log(`    name: ${we.name}`);
        console.log(`    m4: ${we.m4}`);
        console.log(`    functions (${(we.functions||[]).length}):`);
        for (const fn of (we.functions || [])) {
          console.log(`      functionName: ${fn.functionName || fn.name}`);
          console.log(`      processChar: ${JSON.stringify(fn.processChar)}`);
          console.log(`      processChars: ${JSON.stringify(fn.processChars?.map(p=>p.name))}`);
        }
        console.log(`    failureCauses (${(we.failureCauses||[]).length}):`);
        for (const fc of (we.failureCauses || [])) {
          console.log(`      cause: ${fc.cause || fc.name}`);
        }
      }
    }
  } catch (e) {
    console.log('  Legacy API error:', e.message);
  }
}

await checkExcel(ORIGINAL, 'ORIGINAL IMPORT EXCEL');
await checkExcel(GENERATED, 'GENERATED MASTER EXCEL');
await checkMasterJSON();
await checkLegacy();
