// verify-counts via deep-verify API schema
const fmeaId = 'pfm26-p020-l20';
const schema = 'pfmea_pfm26_p020_l20';

async function main() {
  // Use the project's prisma to query
  const base = 'http://localhost:3000';
  
  // Get atomic data
  const r = await fetch(`${base}/api/fmea?fmeaId=${fmeaId}&format=atomic`);
  const data = await r.json();
  
  if (!data || data.error) {
    console.error('❌ API 오류:', data?.error || 'unknown');
    return;
  }
  
  console.log('\n═══ Import 갯수 검증 (복합키 기준) ═══\n');
  
  const fe = data.failureEffects || [];
  const fm = data.failureModes || [];
  const fc = data.failureCauses || [];
  const fl = data.failureLinks || [];
  const ra = data.riskAnalyses || [];
  const l2 = data.l2Structures || [];
  const l3 = data.l3Structures || [];
  const l3f = data.l3Functions || [];
  
  console.log('── 1. 엔티티별 카운트 ──');
  console.log(`  FE (고장영향):   ${fe.length}건 — 기대: 20`);
  console.log(`  FM (고장형태):   ${fm.length}건 — 기대: 28`);
  console.log(`  FC (고장원인):   ${fc.length}건 — 기대: 115 (행 기반)`);
  console.log(`  FL (고장사슬):   ${fl.length}건 — 기대: 115`);
  console.log(`  RA (위험분석):   ${ra.length}건 — 기대: 115`);
  console.log(`  L2 (공정):       ${l2.length}건 — 기대: 28`);
  console.log(`  L3 (작업요소):   ${l3.length}건 — 기대: 115`);
  console.log(`  L3Func:          ${l3f.length}건 — 기대: 115`);
  
  // 복합키 검증
  const fcByComposite = new Map();
  for (const f of fc) {
    const l2s = l2.find(s => s.id === f.l2StructId);
    const key = `${l2s?.no || '?'}|${f.cause}`;
    if (!fcByComposite.has(key)) fcByComposite.set(key, []);
    fcByComposite.get(key).push(f.id);
  }
  console.log(`  FC 복합키(pno+cause) 고유: ${fcByComposite.size}건 — 기대: ~113`);
  
  // FC에 대한 FL 연결 검증
  const fcIdsInFL = new Set(fl.map(l => l.fcId));
  const fmIdsInFL = new Set(fl.map(l => l.fmId));
  const feIdsInFL = new Set(fl.map(l => l.feId));
  
  const orphanFC = fc.filter(f => !fcIdsInFL.has(f.id));
  const orphanFM = fm.filter(f => !fmIdsInFL.has(f.id));
  const orphanFE = fe.filter(f => !feIdsInFL.has(f.id));
  
  console.log('\n── 2. FK 연결 (고아=FL 미연결) ──');
  console.log(`  FC 고아: ${orphanFC.length}건 ${orphanFC.length > 0 ? '❌' : '✅'}`);
  if (orphanFC.length > 0) {
    orphanFC.slice(0, 5).forEach(f => console.log(`    → ${f.id}: "${(f.cause||'').substring(0,40)}"`));
  }
  console.log(`  FM 고아: ${orphanFM.length}건 ${orphanFM.length > 0 ? '❌' : '✅'}`);
  if (orphanFM.length > 0) {
    orphanFM.slice(0, 5).forEach(f => console.log(`    → ${f.id}: "${(f.mode||'').substring(0,40)}"`));
  }
  console.log(`  FE 고아: ${orphanFE.length}건 ${orphanFE.length > 0 ? '❌' : '✅'}`);
  if (orphanFE.length > 0) {
    orphanFE.slice(0, 5).forEach(f => console.log(`    → ${f.id}: "${(f.effect||'').substring(0,40)}"`));
  }
  
  // 깨진 FK
  const brokenFM = fl.filter(l => !l.fmId).length;
  const brokenFE = fl.filter(l => !l.feId).length;
  const brokenFC = fl.filter(l => !l.fcId).length;
  
  console.log('\n── 3. FL 깨진 FK ──');
  console.log(`  fmId 빈값: ${brokenFM}건 ${brokenFM > 0 ? '❌' : '✅'}`);
  console.log(`  feId 빈값: ${brokenFE}건 ${brokenFE > 0 ? '❌' : '✅'}`);
  console.log(`  fcId 빈값: ${brokenFC}건 ${brokenFC > 0 ? '❌' : '✅'}`);
  
  // FC에 2개 이상 중복된 복합키 표시
  const dupes = [...fcByComposite.entries()].filter(([k, ids]) => ids.length > 1);
  if (dupes.length > 0) {
    console.log(`\n── 4. 복합키 중복 FC (${dupes.length}건) ──`);
    dupes.forEach(([key, ids]) => console.log(`  ${key} → ${ids.length}건`));
  }
  
  const allOk = fe.length === 20 && fm.length === 28 && fc.length >= 113 && fl.length >= 113 &&
    orphanFC.length === 0 && orphanFM.length === 0 && orphanFE.length === 0 &&
    brokenFM === 0 && brokenFE === 0 && brokenFC === 0;
  
  console.log(`\n═══ 총합 판정: ${allOk ? '✅ ALL PASS' : '❌ FAIL — 위 항목 확인'} ═══\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
