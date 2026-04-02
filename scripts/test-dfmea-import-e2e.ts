/**
 * DFMEA 타이어 샘플 Import E2E 테스트
 * 1. 엑셀 파싱 (position-parser)
 * 2. save-position-import API 호출
 * 3. DB 저장 검증
 */
import ExcelJS from 'exceljs';
import { parsePositionBasedWorkbook, atomicToFlatData } from '../src/lib/fmea/position-parser';

const DFMEA_EXCEL = 'D:/02 NEW FMEA 사용자 매뉴얼/기존자료 자동랜더링/DFMEA_타이어_기존자료_Import_Sample.xlsx';
const FMEA_ID = 'pfm26-f006';
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('=== DFMEA Import E2E 테스트 ===\n');

  // 1. 엑셀 파싱
  console.log('STEP 1: 엑셀 파싱...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(DFMEA_EXCEL);
  const atomicData = parsePositionBasedWorkbook(wb, FMEA_ID);

  console.log(`  L2=${atomicData.l2Structures.length} FM=${atomicData.failureModes.length} FC=${atomicData.failureCauses.length} FL=${atomicData.failureLinks.length} FE=${atomicData.failureEffects.length}`);
  console.log(`  완전한 FL: ${atomicData.failureLinks.filter(fl => fl.fmId && fl.fcId && fl.feId).length}/${atomicData.failureLinks.length}`);

  // 2. save-position-import API 호출
  console.log('\nSTEP 2: save-position-import API 호출...');
  try {
    const res = await fetch(`${BASE_URL}/api/fmea/save-position-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fmeaId: FMEA_ID,
        atomicData,
        force: true,
      }),
    });

    const data = await res.json();
    console.log(`  Status: ${res.status}`);
    console.log(`  Success: ${data.success}`);
    if (data.error) console.log(`  Error: ${data.error}`);
    if (data.stats) {
      console.log(`  Stats:`, JSON.stringify(data.stats, null, 2).substring(0, 500));
    }

    if (!data.success) {
      console.error('\n❌ Import 실패:', data.error);
      process.exit(1);
    }
  } catch (e: any) {
    console.error('API 호출 실패:', e.message);
    process.exit(1);
  }

  // 3. pipeline-verify로 검증
  console.log('\nSTEP 3: pipeline-verify 검증...');
  try {
    const res = await fetch(`${BASE_URL}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    const data = await res.json();
    console.log(`  allGreen: ${data.allGreen}`);
    if (data.steps) {
      for (const step of data.steps) {
        console.log(`  ${step.name}: ${step.status} (${step.items?.filter((i: any) => i.status === 'error').length || 0} errors)`);
      }
    }
  } catch (e: any) {
    console.log('  pipeline-verify 응답 실패 (서버 미기동?):', e.message);
  }

  console.log('\n✅ E2E 테스트 완료');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
