/**
 * pfm26-m004 Excel Import — v5 (L1_origRow/L2_origRow/L3_origRow 포함)
 * Usage: npx tsx scripts/import-m004-parse.ts
 */
import ExcelJS from 'exceljs';
import { isPositionBasedFormat, parsePositionBasedWorkbook } from '../src/lib/fmea/position-parser';

const FMEA_ID = 'pfm26-m004';
const EXCEL_PATH = 'C:\\Users\\Administrator\\Desktop\\LB쎄미콘\\aubump\\FF260323_pfm26-m004_import_FC_completed_5.xlsx';
const API_URL = 'http://localhost:3000/api/fmea/save-position-import';

async function main() {
  console.log('=== Step 1: Excel Read ===');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const sheetNames = wb.worksheets.map((ws: { name: string }) => ws.name);
  console.log('Sheets:', sheetNames.join(', '));

  console.log('\n=== Step 2: Format Detection ===');
  const isPositionBased = isPositionBasedFormat(sheetNames);
  console.log('isPositionBasedFormat:', isPositionBased);
  if (!isPositionBased) {
    console.error('ERROR: Not detected as position-based format!');
    process.exit(1);
  }

  console.log('\n=== Step 3: Parse ===');
  const atomicData = parsePositionBasedWorkbook(wb, FMEA_ID.toLowerCase());
  console.log('Parse stats:', JSON.stringify(atomicData.stats, null, 2));
  console.log('L2 count:', atomicData.l2Structures?.length || 0);
  console.log('L3 count:', atomicData.l3Structures?.length || 0);
  console.log('L1Functions:', atomicData.l1Functions?.length || 0);
  console.log('L2Functions:', atomicData.l2Functions?.length || 0);
  console.log('L3Functions:', atomicData.l3Functions?.length || 0);
  console.log('ProcessProductChars:', atomicData.processProductChars?.length || 0);
  console.log('FailureEffects:', atomicData.failureEffects?.length || 0);
  console.log('FailureModes:', atomicData.failureModes?.length || 0);
  console.log('FailureCauses:', atomicData.failureCauses?.length || 0);
  console.log('FailureLinks:', atomicData.failureLinks?.length || 0);
  console.log('RiskAnalyses:', atomicData.riskAnalyses?.length || 0);

  // FK 해결 통계
  const resolvedFL = atomicData.failureLinks?.filter(fl => fl.fmId && fl.feId && fl.fcId) || [];
  const brokenFL = atomicData.failureLinks?.filter(fl => !fl.fmId || !fl.feId || !fl.fcId) || [];
  console.log(`\nFK resolved: ${resolvedFL.length}/${atomicData.failureLinks?.length || 0}`);
  console.log(`FK broken: ${brokenFL.length}`);
  if (brokenFL.length > 0 && brokenFL.length <= 10) {
    brokenFL.forEach(fl => console.log(`  broken: fmId=${fl.fmId||'❌'} feId=${fl.feId||'❌'} fcId=${fl.fcId||'❌'}`));
  }

  console.log('\n=== Step 4: Save to DB via API ===');
  const body = JSON.stringify({
    fmeaId: FMEA_ID.toLowerCase(),
    atomicData,
    force: true,
  });
  console.log('Request body size:', (body.length / 1024).toFixed(1) + 'KB');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const result = await res.json();
  if (result.success) {
    console.log('\n=== SUCCESS ===');
    console.log('Atomic counts:', JSON.stringify(result.atomicCounts, null, 2));
  } else {
    console.error('\n=== FAILED ===');
    console.error('Error:', result.error?.substring(0, 300));
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
