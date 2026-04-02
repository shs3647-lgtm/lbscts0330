/**
 * pfm26-p015-i15 엑셀 파싱 테스트
 * Usage: npx tsx scripts/test-parse-p015.ts
 */
import ExcelJS from 'exceljs';
import { isPositionBasedFormat, parsePositionBasedWorkbook } from '../src/lib/fmea/position-parser';

async function test() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/Administrator/Documents/00_lbscts0330/pfm26-p015-i15_import_sample.xlsx');

  const sheetNames: string[] = [];
  wb.eachSheet((ws: any) => sheetNames.push(ws.name));
  console.log('isPositionBasedFormat:', isPositionBasedFormat(sheetNames));

  const result = parsePositionBasedWorkbook(wb, 'pfm26-p015-i15');

  console.log('\n=== 파싱 결과 ===');
  console.log('L1 Functions:', result.l1Functions.length);
  console.log('L2 Structures:', result.l2Structures.length);
  console.log('L2 Functions:', result.l2Functions.length);
  console.log('L3 Structures:', result.l3Structures.length);
  console.log('L3 Functions:', result.l3Functions.length);
  console.log('ProductChars:', result.processProductChars.length);
  console.log('FailureEffects:', result.failureEffects.length);
  console.log('FailureModes:', result.failureModes.length);
  console.log('FailureCauses:', result.failureCauses.length);
  console.log('FailureLinks:', result.failureLinks.length);
  console.log('RiskAnalyses:', result.riskAnalyses.length);

  const validFL = result.failureLinks.filter((fl: any) => fl.fmId && fl.fcId && fl.feId);
  const partialFL = result.failureLinks.filter((fl: any) => fl.fmId && (!fl.fcId || !fl.feId));
  const noFmFL = result.failureLinks.filter((fl: any) => !fl.fmId);
  console.log('\n=== FL FK 완성도 ===');
  console.log('완전한 FL (fm+fc+fe):', validFL.length);
  console.log('부분 FL (fc/fe 누락):', partialFL.length);
  console.log('깨진 FL (fm 없음):', noFmFL.length);

  // 부분 FL 상세
  if (partialFL.length > 0) {
    console.log('\n=== 부분 FL 상세 ===');
    for (const fl of partialFL.slice(0, 10)) {
      console.log(`  FL ${fl.id}: fmId=${fl.fmId ? 'O' : 'X'} fcId=${fl.fcId ? 'O' : 'X'} feId=${fl.feId ? 'O' : 'X'}`);
    }
  }

  const nullDC = result.riskAnalyses.filter((r: any) => !r.detectionControl?.trim()).length;
  const nullPC = result.riskAnalyses.filter((r: any) => !r.preventionControl?.trim()).length;
  console.log('\n=== DC/PC ===');
  console.log('DC NULL:', nullDC, '/', result.riskAnalyses.length);
  console.log('PC NULL:', nullPC, '/', result.riskAnalyses.length);

  console.log('\n=== 기대값 대비 ===');
  const checks: [string, number, number][] = [
    ['L2(12공정)', result.l2Structures.length, 12],
    ['FM(15)', result.failureModes.length, 15],
    ['FC(67)', result.failureCauses.length, 67],
    ['FL(76)', result.failureLinks.length, 76],
    ['FE(14)', result.failureEffects.length, 14],
    ['RA=FL', result.riskAnalyses.length, result.failureLinks.length],
  ];
  let allPass = true;
  for (const [name, actual, expected] of checks) {
    const pass = actual === expected;
    if (!pass) allPass = false;
    console.log(`  ${name}: ${pass ? '✅' : '❌'} actual=${actual} expected=${expected}`);
  }
  console.log(allPass ? '\n✅ ALL PASS' : '\n❌ SOME FAILED');
}

test().catch(e => {
  console.error('ERROR:', e.message);
  console.error(e.stack?.split('\n').slice(0, 5).join('\n'));
});
