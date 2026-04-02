/**
 * pfm26-p016-i16 엑셀 파싱 + FL 완전성 테스트
 * Usage: npx tsx scripts/test-parse-p016.ts
 *
 * 성공조건: 누락 FL = 0건
 */
import ExcelJS from 'exceljs';
import { isPositionBasedFormat, parsePositionBasedWorkbook } from '../src/lib/fmea/position-parser';

// 기대값 (generate-p016-i16-sample.mjs 기준)
const EXPECTED = {
  L2: 10,
  FM: 12,
  FC: 50,
  FL: 57,
  FE: 12,
};

async function test() {
  const wb = new ExcelJS.Workbook();
  const filePath = 'C:/Users/Administrator/Documents/00_lbscts0330/pfm26-p016-i16_import_sample.xlsx';
  await wb.xlsx.readFile(filePath);

  const sheetNames: string[] = [];
  wb.eachSheet((ws: any) => sheetNames.push(ws.name));
  const isPosFormat = isPositionBasedFormat(sheetNames);
  console.log('시트:', sheetNames.join(', '));
  console.log('isPositionBasedFormat:', isPosFormat);

  if (!isPosFormat) {
    console.error('❌ 위치기반 포맷이 아님 — 시트명 확인 필요');
    process.exit(1);
  }

  const result = parsePositionBasedWorkbook(wb, 'pfm26-p016-i16');

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

  // FL FK 완성도
  const validFL = result.failureLinks.filter((fl: any) => fl.fmId && fl.fcId && fl.feId);
  const partialFL = result.failureLinks.filter((fl: any) => fl.fmId && (!fl.fcId || !fl.feId));
  const noFmFL = result.failureLinks.filter((fl: any) => !fl.fmId);
  const missingFcId = result.failureLinks.filter((fl: any) => !fl.fcId);
  const missingFeId = result.failureLinks.filter((fl: any) => !fl.feId);

  console.log('\n=== FL FK 완성도 ===');
  console.log('완전한 FL (fm+fc+fe):', validFL.length, '/', result.failureLinks.length);
  console.log('부분 FL (fc/fe 누락):', partialFL.length);
  console.log('깨진 FL (fm 없음):', noFmFL.length);
  console.log('fcId 누락:', missingFcId.length);
  console.log('feId 누락:', missingFeId.length);

  // 부분 FL 상세
  if (partialFL.length > 0) {
    console.log('\n=== 부분 FL 상세 ===');
    for (const fl of partialFL.slice(0, 10)) {
      console.log(`  FL ${(fl as any).id}: fmId=${fl.fmId ? 'O' : 'X'} fcId=${fl.fcId ? 'O' : 'X'} feId=${fl.feId ? 'O' : 'X'}`);
    }
  }

  // DC/PC 완성도
  const nullDC = result.riskAnalyses.filter((r: any) => !r.detectionControl?.trim()).length;
  const nullPC = result.riskAnalyses.filter((r: any) => !r.preventionControl?.trim()).length;
  console.log('\n=== DC/PC ===');
  console.log('DC NULL:', nullDC, '/', result.riskAnalyses.length);
  console.log('PC NULL:', nullPC, '/', result.riskAnalyses.length);

  // 기대값 대비 검증
  console.log('\n=== 기대값 대비 ===');
  const checks: [string, number, number][] = [
    ['L2(공정)', result.l2Structures.length, EXPECTED.L2],
    ['FM(고장형태)', result.failureModes.length, EXPECTED.FM],
    ['FC(고장원인)', result.failureCauses.length, EXPECTED.FC],
    ['FL(체인)', result.failureLinks.length, EXPECTED.FL],
    ['FE(고장영향)', result.failureEffects.length, EXPECTED.FE],
    ['RA=FL', result.riskAnalyses.length, result.failureLinks.length],
    ['완전FL=FL', validFL.length, result.failureLinks.length],
    ['DC NULL', nullDC, 0],
    ['PC NULL', nullPC, 0],
  ];

  let allPass = true;
  for (const [name, actual, expected] of checks) {
    const pass = actual === expected;
    if (!pass) allPass = false;
    console.log(`  ${name}: ${pass ? '✅' : '❌'} actual=${actual} expected=${expected}`);
  }

  // ★ 핵심: 누락 FL = 0건 확인
  const missingFL = result.failureLinks.length - validFL.length;
  console.log(`\n★ 누락 FL: ${missingFL}건`);

  if (missingFL > 0) {
    console.log('\n❌ FAIL — 누락 FL > 0');
    process.exit(1);
  }

  console.log(allPass ? '\n✅ ALL PASS — 누락 FL = 0건' : '\n❌ SOME FAILED');
  process.exit(allPass ? 0 : 1);
}

test().catch(e => {
  console.error('ERROR:', e.message);
  console.error(e.stack?.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});
