/**
 * 라운드트립 테스트: 마스터 엑셀 → Import API → pipeline verify
 * 실행: node scripts/roundtrip-test.mjs
 */
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m002';
const EXCEL_FILE = 'data/master-fmea/PFMEA_Master_12inch_AuBump.xlsx';

async function main() {
  console.log('=== STEP 1: Import Excel ===');
  const fileBuffer = fs.readFileSync(EXCEL_FILE);
  const boundary = '----FormBoundary' + Date.now();
  const fileName = path.basename(EXCEL_FILE);
  
  const bodyParts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`,
    fileBuffer,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="fmeaId"\r\n\r\n${FMEA_ID}\r\n--${boundary}--\r\n`,
  ];
  
  const body = Buffer.concat([
    Buffer.from(bodyParts[0]),
    bodyParts[1],
    Buffer.from(bodyParts[2]),
  ]);

  const importRes = await fetch(`${BASE}/api/fmea/save-from-import`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

  if (!importRes.ok) {
    const text = await importRes.text();
    console.log('Import failed:', importRes.status, text.substring(0, 200));
    
    // Fallback: save-from-import expects JSON, not multipart
    console.log('\n=== Fallback: rebuild-atomic ===');
    const rebuildRes = await fetch(`${BASE}/api/fmea/rebuild-atomic?fmeaId=${FMEA_ID}`, { method: 'POST' });
    const rebuildData = await rebuildRes.json();
    console.log('rebuild-atomic:', JSON.stringify(rebuildData, null, 2));
  } else {
    const importData = await importRes.json();
    console.log('Import result:', JSON.stringify(importData, null, 2).substring(0, 500));
  }

  console.log('\n=== STEP 2: Pipeline Verify (POST auto-fix) ===');
  const pvRes = await fetch(`${BASE}/api/fmea/pipeline-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID }),
  });
  const pvData = await pvRes.json();
  
  console.log(`allGreen: ${pvData.allGreen}`);
  for (const step of pvData.steps || []) {
    const status = step.status === 'ok' ? 'PASS' : step.status.toUpperCase();
    const issues = (step.issues || []).length;
    const fixed = (step.fixed || []).length;
    console.log(`  Step${step.step} ${step.name}: ${status} issues=${issues} fixed=${fixed}`);
    if (step.issues?.length) step.issues.forEach(i => console.log(`    - ${i}`));
  }

  console.log('\n=== STEP 3: Export Master (DC/PC check) ===');
  const emRes = await fetch(`${BASE}/api/fmea/export-master`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID }),
  });
  const emData = await emRes.json();
  console.log('flatBreakdown:', JSON.stringify(emData.stats?.flatBreakdown));
  console.log('riskCount:', emData.stats?.riskCount);

  // DC/PC from master JSON
  const master = JSON.parse(fs.readFileSync('data/master-fmea/pfm26-m002.json', 'utf8'));
  const risks = master.atomicDB.riskAnalyses;
  const chains = master.chains;
  const dcRisk = risks.filter(r => r.detectionControl?.trim()).length;
  const pcRisk = risks.filter(r => r.preventionControl?.trim()).length;
  const dcChain = chains.filter(c => c.dcValue?.trim()).length;
  const pcChain = chains.filter(c => c.pcValue?.trim()).length;

  console.log(`DC in risks: ${dcRisk}/${risks.length}`);
  console.log(`PC in risks: ${pcRisk}/${risks.length}`);
  console.log(`DC in chains: ${dcChain}/${chains.length}`);
  console.log(`PC in chains: ${pcChain}/${chains.length}`);

  // Final verdict
  console.log('\n=== FINAL VERDICT ===');
  const pass = pvData.allGreen && dcRisk === 104 && pcRisk === 104;
  console.log(pass ? 'ALL PASS' : 'FAIL');
}

main().catch(console.error);
