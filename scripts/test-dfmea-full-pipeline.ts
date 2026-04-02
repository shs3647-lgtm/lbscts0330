/**
 * DFMEA 타이어 전체 파이프라인 테스트
 * 1. 프로젝트 등록 (fmeaType=F)
 * 2. 엑셀 파싱 → save-position-import
 * 3. pipeline-verify
 * 4. rebuild-atomic
 * 5. 워크시트 데이터 검증 (구조/기능/고장/위험)
 */
import ExcelJS from 'exceljs';
import { parsePositionBasedWorkbook } from '../src/lib/fmea/position-parser';

const EXCEL = 'D:/02 NEW FMEA 사용자 매뉴얼/기존자료 자동랜더링/DFMEA_타이어_기존자료_Import_Sample.xlsx';
const FMEA_ID = 'pfm26-f006';
const BASE = 'http://localhost:3000';

async function api(method: string, path: string, body?: any) {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  return res.json();
}

async function main() {
  console.log('=== DFMEA 전체 파이프라인 테스트 ===\n');

  // 1. 파싱
  console.log('STEP 1: 엑셀 파싱...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL);
  const r = parsePositionBasedWorkbook(wb, FMEA_ID);
  const validFL = r.failureLinks.filter((fl: any) => fl.fmId && fl.fcId && fl.feId);
  console.log(`  L2=${r.l2Structures.length} FM=${r.failureModes.length} FC=${r.failureCauses.length} FL=${r.failureLinks.length} FE=${r.failureEffects.length}`);
  console.log(`  완전FL=${validFL.length}/${r.failureLinks.length}`);
  console.log(`  DC_NULL=${r.riskAnalyses.filter((ra: any) => !ra.detectionControl?.trim()).length}`);
  console.log(`  PC_NULL=${r.riskAnalyses.filter((ra: any) => !ra.preventionControl?.trim()).length}`);

  // 2. DB 저장
  console.log('\nSTEP 2: save-position-import...');
  const saveRes = await api('POST', '/api/fmea/save-position-import', { fmeaId: FMEA_ID, atomicData: r, force: true });
  console.log(`  SAVE=${saveRes.success ? 'OK' : 'FAIL: ' + saveRes.error}`);
  if (!saveRes.success) { console.error('ABORT'); process.exit(1); }

  // 3. rebuild-atomic
  console.log('\nSTEP 3: rebuild-atomic...');
  const rebuildRes = await api('POST', `/api/fmea/rebuild-atomic?fmeaId=${FMEA_ID}`);
  console.log(`  rebuilt FL=${rebuildRes.rebuilt?.failureLinks} RA=${rebuildRes.rebuilt?.riskAnalyses}`);

  // 4. repair-fk
  console.log('\nSTEP 4: repair-fk...');
  const repairRes = await api('POST', '/api/fmea/repair-fk', { fmeaId: FMEA_ID });
  console.log(`  success=${repairRes.success}`);

  // 5. pipeline-verify
  console.log('\nSTEP 5: pipeline-verify...');
  const vRes = await api('GET', `/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
  console.log(`  allGreen=${vRes.allGreen}`);
  for (const s of (vRes.steps || [])) {
    const errors = s.issues?.length || 0;
    console.log(`  ${s.name}: ${s.status}${errors > 0 ? ` (${errors} issues)` : ''}`);
  }

  // 6. 워크시트 데이터 검증
  console.log('\nSTEP 6: 워크시트 데이터 검증...');
  const wsRes = await api('GET', `/api/fmea?fmeaId=${FMEA_ID}`);
  if (wsRes.data) {
    const d = wsRes.data;
    const l2Count = d.l2?.length || 0;
    const l3Count = d.l2?.reduce((s: number, l: any) => s + (l.l3?.length || 0), 0) || 0;
    const fmCount = d.l2?.reduce((s: number, l: any) => s + (l.failureModes?.length || 0), 0) || 0;
    console.log(`  워크시트: L2=${l2Count} L3=${l3Count} FM=${fmCount}`);
  }

  // 7. 최종 결과
  console.log('\n=== 최종 결과 ===');
  const checks = [
    ['파싱 FL 100%', validFL.length === r.failureLinks.length],
    ['DB 저장 OK', saveRes.success],
    ['pipeline allGreen', vRes.allGreen],
    ['DC NULL=0', r.riskAnalyses.filter((ra: any) => !ra.detectionControl?.trim()).length === 0],
    ['PC NULL=0', r.riskAnalyses.filter((ra: any) => !ra.preventionControl?.trim()).length === 0],
  ];
  let allPass = true;
  for (const [name, pass] of checks) {
    console.log(`  ${pass ? '✅' : '❌'} ${name}`);
    if (!pass) allPass = false;
  }
  console.log(allPass ? '\n✅ ALL PASS' : '\n❌ SOME FAILED');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
