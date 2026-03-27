/**
 * Cu Target 빈 공정특성 수정
 * L3Function PF-L3-040-IM-002-G의 processChar를 
 * Ti Target과 동일한 값으로 설정
 */
const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m002';

async function main() {
  // 1. 현재 legacy data 로드
  console.log('1. Legacy data 로드...');
  const legacyRes = await fetch(`${BASE}/api/fmea?fmeaId=${FMEA_ID}`);
  const legacyJson = await legacyRes.json();
  const legacyData = legacyJson.data || legacyJson;
  
  // 2. l2 배열에서 UBM Sputter(40) 찾기
  const l2arr = legacyData.l2 || [];
  let fixed = false;
  for (const proc of l2arr) {
    if (proc.no !== '40' && proc.no !== 40) continue;
    console.log('  Found UBM Sputter process');
    
    // l3 배열에서 Cu Target 찾기
    for (const we of (proc.l3 || [])) {
      if (we.name !== 'Cu Target') continue;
      console.log('  Found Cu Target work element');
      
      // functions에서 빈 processChar 수정
      for (const fn of (we.functions || [])) {
        if (!fn.processChar || !fn.processChar.trim()) {
          console.log('  BEFORE processChar:', JSON.stringify(fn.processChar));
          fn.processChar = 'Target 두께 잔량(Remaining Thickness, mm)';
          console.log('  AFTER processChar:', JSON.stringify(fn.processChar));
          fixed = true;
        }
      }
      
      // processChars 배열에서도 수정
      for (const pc of (we.processChars || [])) {
        if (!pc.name || !pc.name.trim()) {
          console.log('  BEFORE processChars.name:', JSON.stringify(pc.name));
          pc.name = 'Target 두께 잔량(Remaining Thickness, mm)';
          console.log('  AFTER processChars.name:', JSON.stringify(pc.name));
          fixed = true;
        }
      }
    }
  }
  
  if (!fixed) {
    console.log('No empty processChar found in legacy, trying direct DB update...');
  }
  
  // 3. legacy data 저장 (PUT /api/fmea)
  console.log('\n2. Legacy data 저장...');
  const saveRes = await fetch(`${BASE}/api/fmea`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID, ...legacyData }),
  });
  const saveJson = await saveRes.json();
  console.log('  Save result:', saveRes.status, JSON.stringify(saveJson).substring(0, 200));
  
  // 4. rebuild-atomic
  console.log('\n3. Rebuild atomic...');
  const rebuildRes = await fetch(`${BASE}/api/fmea/rebuild-atomic?fmeaId=${FMEA_ID}`, { method: 'POST' });
  const rebuildJson = await rebuildRes.json();
  console.log('  Rebuild:', JSON.stringify(rebuildJson).substring(0, 300));
  
  // 5. pipeline verify
  console.log('\n4. Pipeline verify...');
  const pvRes = await fetch(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
  const pvJson = await pvRes.json();
  console.log('  allGreen:', pvJson.allGreen);
  for (const step of pvJson.steps || []) {
    const issues = (step.issues || []).length;
    console.log(`  Step${step.step} ${step.name}: ${step.status} issues=${issues}`);
    if (step.issues?.length) step.issues.forEach(i => console.log(`    - ${i}`));
  }
  
  // 6. export master
  console.log('\n5. Export master...');
  const emRes = await fetch(`${BASE}/api/fmea/export-master`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID }),
  });
  const emJson = await emRes.json();
  console.log('  flatBreakdown:', JSON.stringify(emJson.stats?.flatBreakdown));
}

main().catch(console.error);
