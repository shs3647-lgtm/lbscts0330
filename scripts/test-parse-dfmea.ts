import ExcelJS from 'exceljs';
import { isPositionBasedFormat, parsePositionBasedWorkbook } from '../src/lib/fmea/position-parser';

async function test() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('D:/02 NEW FMEA 사용자 매뉴얼/기존자료 자동랜더링/DFMEA_타이어_기존자료_Import_Sample.xlsx');
  const sheetNames: string[] = [];
  wb.eachSheet((ws: any) => sheetNames.push(ws.name));
  console.log('isPositionBasedFormat:', isPositionBasedFormat(sheetNames));

  const result = parsePositionBasedWorkbook(wb, 'pfm26-f006');
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
  console.log('\n완전한 FL:', validFL.length, '/', result.failureLinks.length);
  const nullDC = result.riskAnalyses.filter((r: any) => !r.detectionControl?.trim()).length;
  const nullPC = result.riskAnalyses.filter((r: any) => !r.preventionControl?.trim()).length;
  console.log('DC NULL:', nullDC, 'PC NULL:', nullPC);

  // 기대값
  console.log('\n=== 기대값 대비 ===');
  const checks: [string, number, number][] = [
    ['L2(6 초점요소)', result.l2Structures.length, 6],
    ['FM(12)', result.failureModes.length, 12],
    ['FC(13)', result.failureCauses.length, 13],
    ['FL(16 체인)', result.failureLinks.length, 16],
    ['FE(8)', result.failureEffects.length, 8],
  ];
  for (const [name, actual, expected] of checks) {
    console.log(`  ${name}: ${actual === expected ? '✅' : '❌'} actual=${actual} expected=${expected}`);
  }
}
test().catch(e => { console.error('ERROR:', e.message); console.error(e.stack?.split('\n').slice(0,5).join('\n')); });
