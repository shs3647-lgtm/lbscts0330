/**
 * LLD 추천 엑셀 → DB 임포트 스크립트 (API 경유)
 * Usage: node scripts/import-lld-recommend.js
 *
 * 서버가 실행 중이어야 합니다 (npm run dev)
 */
const XLSX = require('xlsx');

const API_BASE = 'http://localhost:3000';

async function main() {
  const wb = XLSX.readFile('D:/00 fmea개발/LLD/LLD_Recommend_20260309_보완.xlsx');
  const ws = wb.Sheets['LLD추천결과'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);

  // Extract unique LLD records (by lldNo + applyTo)
  const seen = new Set();
  const items = [];
  for (const r of rows) {
    const lldNo = String(r[8] || '').trim();
    const target = String(r[6] || '').trim();
    if (lldNo === '' || lldNo === '-') continue;
    const applyTo = target === '검출' ? 'detection' : 'prevention';
    const key = lldNo + '__' + applyTo;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      lldNo,
      classification: 'CIP',
      applyTo,
      processNo: String(r[1] || '').trim(),
      processName: String(r[2] || '').trim(),
      productName: '',
      failureMode: String(r[3] || '').trim(),
      cause: String(r[4] || '').trim(),
      improvement: String(r[9] || '').trim(),
      occurrence: (applyTo === 'prevention' && r[10] !== '-' && r[10] != null) ? Number(r[10]) : null,
      detection: (applyTo === 'detection' && r[11] !== '-' && r[11] != null) ? Number(r[11]) : null,
      vehicle: '',
      target: '제조',
      m4Category: '',
      location: '',
      completedDate: '',
      status: 'G',
      sourceType: 'import',
      priority: 10,
    });
  }

  console.log(`Unique LLD records: ${items.length}`);
  console.log(`  Prevention: ${items.filter(l => l.applyTo === 'prevention').length}`);
  console.log(`  Detection:  ${items.filter(l => l.applyTo === 'detection').length}`);

  console.log('\nDetection records:');
  for (const l of items.filter(l => l.applyTo === 'detection')) {
    console.log(`  ${l.lldNo} | ${l.processName} | D=${l.detection} | ${l.improvement.substring(0, 60)}`);
  }

  // Step 1: Check current DB state
  console.log('\n--- Checking current DB ---');
  const getRes = await fetch(`${API_BASE}/api/lld`);
  const getData = await getRes.json();
  if (getData.success) {
    const dbItems = getData.items || [];
    const dbDet = dbItems.filter(i => i.applyTo === 'detection');
    const dbPrev = dbItems.filter(i => i.applyTo === 'prevention');
    console.log(`Current DB: total=${dbItems.length}, prevention=${dbPrev.length}, detection=${dbDet.length}`);
    console.log('Current detection records:');
    for (const d of dbDet) {
      console.log(`  ${d.lldNo} | ${d.processName} | ${(d.improvement || '').substring(0, 60)}`);
    }
  }

  // Step 2: POST to /api/lld (upsert)
  console.log('\n--- Importing new data ---');
  const postRes = await fetch(`${API_BASE}/api/lld`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const postData = await postRes.json();
  console.log('Import result:', JSON.stringify(postData));

  // Step 3: Verify
  console.log('\n--- Verifying ---');
  const verifyRes = await fetch(`${API_BASE}/api/lld`);
  const verifyData = await verifyRes.json();
  if (verifyData.success) {
    const dbItems = verifyData.items || [];
    const dbDet = dbItems.filter(i => i.applyTo === 'detection');
    const dbPrev = dbItems.filter(i => i.applyTo === 'prevention');
    console.log(`After import: total=${dbItems.length}, prevention=${dbPrev.length}, detection=${dbDet.length}`);
    console.log('Detection records:');
    for (const d of dbDet) {
      console.log(`  ${d.lldNo} | ${d.processName} | D=${d.detection} | ${(d.improvement || '').substring(0, 50)}`);
    }
  }

  console.log('\nDone!');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
