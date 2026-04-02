import ExcelJS from 'exceljs';
import { parsePositionBasedWorkbook } from '../src/lib/fmea/position-parser';
async function test() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('D:/02 NEW FMEA 사용자 매뉴얼/기존자료 자동랜더링/PFMEA_pfm26-p016-i16_Import_Sample_v2.xlsx');
  const r = parsePositionBasedWorkbook(wb, 'pfm26-p016-i16');
  const valid = r.failureLinks.filter((fl: any) => fl.fmId && fl.fcId && fl.feId);
  console.log(`L2=${r.l2Structures.length} FM=${r.failureModes.length} FC=${r.failureCauses.length} FL=${r.failureLinks.length} FE=${r.failureEffects.length}`);
  console.log(`완전FL=${valid.length}/${r.failureLinks.length}`);
  console.log(`DC_NULL=${r.riskAnalyses.filter((ra: any) => !ra.detectionControl?.trim()).length}`);
  console.log(`PC_NULL=${r.riskAnalyses.filter((ra: any) => !ra.preventionControl?.trim()).length}`);
  const res = await fetch('http://localhost:3000/api/fmea/save-position-import', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: 'pfm26-p016-i16', atomicData: r, force: true }),
  });
  const data = await res.json();
  console.log(`SAVE=${data.success ? 'OK' : 'FAIL:' + (data.error || '')}`);
  const vRes = await fetch('http://localhost:3000/api/fmea/pipeline-verify?fmeaId=pfm26-p016-i16');
  const v = await vRes.json();
  console.log(`PIPELINE=${v.allGreen ? 'GREEN' : 'NOT_GREEN'}`);
  for (const s of (v.steps || [])) console.log(`  ${s.name}=${s.status}`);
}
test().catch(e => console.error('ERR:', e.message));
