/**
 * Cu Target processChar DB 직접 주입 + legacy 동시 수정
 * 1. L3Function.processChar 업데이트
 * 2. FmeaLegacyData.data 내 Cu Target functions[].processChars[].name 업데이트
 * 3. rebuild-atomic 트리거
 * 4. pipeline-verify 실행하여 확인
 */
const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m065';
const CU_TARGET_VALUE = 'Target 두께 잔량 (Remaining Thickness, mm)';

async function main() {
  // 1. 현재 legacy 데이터 로드 (GET /api/fmea?fmeaId=xxx)
  console.log('=== 1. Legacy 데이터 로드 ===');
  const loadResp = await fetch(`${BASE}/api/fmea?fmeaId=${FMEA_ID}`);
  if (!loadResp.ok) { console.error('Legacy 로드 실패:', loadResp.status); return; }
  const loadData = await loadResp.json();
  const legacy = loadData.data;
  
  if (!legacy?.l2) { console.error('l2 데이터 없음, keys:', Object.keys(loadData)); return; }

  // 2. Cu Target 찾아서 processChar 주입
  console.log('=== 2. Cu Target 검색 및 수정 ===');
  let fixed = 0;
  for (const proc of legacy.l2) {
    for (const we of (proc.l3 || [])) {
      if (!we.name?.includes('Cu Target')) continue;
      console.log(`  Found WE: proc=${proc.no} name=${we.name} m4=${we.m4}`);
      for (const func of (we.functions || [])) {
        for (const pc of (func.processChars || [])) {
          if (!pc.name || pc.name.trim() === '') {
            console.log(`    BEFORE: pc.id=${pc.id} pc.name="${pc.name}"`);
            pc.name = CU_TARGET_VALUE;
            console.log(`    AFTER:  pc.id=${pc.id} pc.name="${pc.name}"`);
            fixed++;
          }
        }
        // processChars가 비어있으면 추가
        if (!func.processChars || func.processChars.length === 0) {
          const pcId = we.id.replace('-L3-', '-B3-') + '-001';
          func.processChars = [{ id: pcId, name: CU_TARGET_VALUE, specialChar: '' }];
          console.log(`    ADDED: pc.id=${pcId} pc.name="${CU_TARGET_VALUE}"`);
          fixed++;
        }
      }
    }
  }
  console.log(`  수정: ${fixed}건`);
  
  if (fixed === 0) {
    console.log('이미 수정됨 또는 Cu Target 없음');
    // 그래도 pipeline verify는 돌린다
  }

  // 3. Legacy 데이터 저장
  if (fixed > 0) {
    console.log('=== 3. Legacy 데이터 저장 ===');
    const saveResp = await fetch(`${BASE}/api/fmea/save-legacy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId: FMEA_ID, data: legacy }),
    });
    if (!saveResp.ok) {
      console.error('Legacy 저장 실패:', saveResp.status, await saveResp.text());
      return;
    }
    console.log('  Legacy 저장 성공');
  }

  // 4. rebuild-atomic 트리거
  console.log('=== 4. Rebuild Atomic ===');
  const rebuildResp = await fetch(`${BASE}/api/fmea/rebuild-atomic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID }),
  });
  if (!rebuildResp.ok) {
    console.error('Rebuild 실패:', rebuildResp.status, await rebuildResp.text());
  } else {
    const rebuildData = await rebuildResp.json();
    console.log('  Rebuild:', rebuildData.message || 'OK');
  }

  // 5. Pipeline verify
  console.log('=== 5. Pipeline Verify ===');
  const verifyResp = await fetch(`${BASE}/api/fmea/pipeline-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID, autoFix: true }),
  });
  const verifyData = await verifyResp.json();
  for (const step of verifyData.steps) {
    const icon = step.status === 'ok' ? '✅' : step.status === 'warn' ? '⚠️' : '❌';
    console.log(`  ${icon} STEP ${step.step} ${step.name}: ${step.status}`);
    if (step.details?.emptyPC !== undefined) console.log(`     emptyPC=${step.details.emptyPC}`);
    if (step.issues?.length > 0) step.issues.forEach(i => console.log(`     ${i}`));
  }
  console.log(`  allGreen: ${verifyData.allGreen}`);
}

main().catch(console.error);
