import 'tsconfig-paths/register';
import ExcelJS from 'exceljs';
import { parsePositionBasedWorkbook } from '../src/lib/fmea/position-parser';

async function main() {
  const wb = new (ExcelJS as any).Workbook();
  await wb.xlsx.readFile('data/master-fmea/master_import_12inch_AuBump_filled.xlsx');
  process.env.POSITION_PARSER_VERBOSE = '0';
  const data = parsePositionBasedWorkbook(wb, 'pfm26-m005');
  const fl = data.failureLinks as any[];
  const noFm = fl.filter(f => !f.fmId).length;
  const noFe = fl.filter(f => !f.feId).length;
  const noFc = fl.filter(f => !f.fcId).length;
  console.log(`FM=${data.failureModes.length} FE=${data.failureEffects.length} FC=${data.failureCauses.length} FL=${fl.length}`);
  console.log(`FL broken: fmId=${noFm} feId=${noFe} fcId=${noFc}`);
  console.log(`FM not in FL: ${(data.failureModes as any[]).filter(fm => !fl.some(f => f.fmId === fm.id)).length}`);
  console.log(`FE not in FL: ${(data.failureEffects as any[]).filter(fe => !fl.some(f => f.feId === fe.id)).length}`);
  
  // Save to DB
  const body = JSON.stringify({ fmeaId: 'pfm26-m005', atomicData: data, force: true });
  console.log(`API... (${(body.length/1024).toFixed(0)}KB)`);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 180000);
  try {
    const res = await fetch('http://localhost:3000/api/fmea/save-position-import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal });
    clearTimeout(t);
    const r = await res.json();
    console.log(r.success ? `✅ ${JSON.stringify(r.atomicCounts)}` : `❌ ${r.error}`);
  } catch(e: any) { clearTimeout(t); console.error('❌', e.name === 'AbortError' ? 'timeout' : e.message); }
}
main().catch(e => { console.error(e); process.exit(1); });
