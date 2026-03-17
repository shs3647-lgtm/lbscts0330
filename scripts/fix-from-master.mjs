/**
 * PfmeaMasterFlatItem(영구저장 import 원본) → Legacy/Atomic DB 누락 데이터 자동 복구
 * 
 * 흐름:
 * 1. PfmeaMasterFlatItem에서 B3 원본 조회
 * 2. Legacy 데이터에서 빈 processChar 찾기
 * 3. import 원본 값으로 채우기
 * 4. Legacy 저장 → rebuild-atomic → pipeline-verify
 */
const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m065';

async function main() {
  // 1. Master flat data에서 B3 원본 조회
  console.log('=== 1. Master FlatItem에서 B3 원본 조회 ===');
  const masterResp = await fetch(`${BASE}/api/fmea/export-master?fmeaId=${FMEA_ID}`);
  const masterData = await masterResp.json();
  
  // master에서 B3 항목 추출
  let b3Items = [];
  if (masterData.flatItems) {
    b3Items = masterData.flatItems.filter(i => i.itemCode === 'B3');
  } else if (masterData.items) {
    b3Items = masterData.items.filter(i => i.itemCode === 'B3');
  }
  console.log(`  B3 items in master: ${b3Items.length}`);
  
  // 공정40의 B3 확인
  const proc40B3 = b3Items.filter(i => String(i.processNo) === '40');
  console.log(`  공정40 B3: ${proc40B3.length}건`);
  proc40B3.forEach(i => console.log(`    m4=${i.m4} value="${i.value}" parentId=${i.parentItemId || 'null'}`));

  // 2. Legacy 데이터 로드
  console.log('\n=== 2. Legacy 데이터 로드 ===');
  const loadResp = await fetch(`${BASE}/api/fmea?fmeaId=${FMEA_ID}`);
  if (!loadResp.ok) { console.error('로드 실패:', loadResp.status); return; }
  const loadData = await loadResp.json();
  const legacy = loadData.data;
  if (!legacy?.l2) { console.error('l2 없음'); return; }

  // 3. Legacy에서 빈 processChar 찾아서 master 원본값으로 채우기
  console.log('\n=== 3. 누락된 processChar 복구 ===');
  let fixCount = 0;
  
  // B3 원본 → WE명 기준 lookup 생성
  const b3ByWeAndProc = new Map();
  for (const b3 of b3Items) {
    // parentItemId에서 WE명 추적 또는 직접 value 사용
    const key = `${b3.processNo}|${b3.m4 || ''}|${b3.parentItemId || ''}`;
    b3ByWeAndProc.set(key, b3.value);
  }

  for (const proc of legacy.l2) {
    for (const we of (proc.l3 || [])) {
      for (const func of (we.functions || [])) {
        for (const pc of (func.processChars || [])) {
          if (pc.name && pc.name.trim() !== '') continue;
          
          // 빈 processChar 발견 — master에서 값 찾기
          // WE명 + 공정번호 + m4로 매칭
          const weName = we.name || '';
          const procNo = proc.no;
          const m4 = we.m4 || '';
          
          // master B3에서 같은 공정/m4에서 이 WE에 해당하는 값 찾기
          let matchedValue = null;
          for (const b3 of b3Items) {
            if (String(b3.processNo) !== String(procNo)) continue;
            if ((b3.m4 || '') !== m4) continue;
            // belongsTo 또는 extra로 WE명 매칭
            const b3We = b3.belongsTo || b3.extra || '';
            if (b3We && weName && (b3We.includes(weName) || weName.includes(b3We))) {
              matchedValue = b3.value;
              break;
            }
          }
          
          // WE명 직접 매칭 안되면 — 같은 공정/m4의 B3 중 아직 사용 안된 값 사용
          if (!matchedValue) {
            // 해당 공정/m4의 모든 B3 값
            const candidates = b3Items.filter(b3 => 
              String(b3.processNo) === String(procNo) && (b3.m4 || '') === m4
            );
            // 이미 사용된 값 제외
            const usedValues = new Set();
            for (const we2 of (proc.l3 || [])) {
              for (const f2 of (we2.functions || [])) {
                for (const pc2 of (f2.processChars || [])) {
                  if (pc2.name?.trim()) usedValues.add(pc2.name.trim());
                }
              }
            }
            const unused = candidates.filter(c => !usedValues.has(c.value?.trim()));
            if (unused.length > 0) matchedValue = unused[0].value;
          }
          
          if (matchedValue) {
            console.log(`  FIX: proc=${procNo} WE="${weName}" m4=${m4}`);
            console.log(`       BEFORE: "${pc.name}" → AFTER: "${matchedValue}"`);
            pc.name = matchedValue;
            fixCount++;
          } else {
            console.log(`  MISS: proc=${procNo} WE="${weName}" m4=${m4} — master에서 매칭 실패`);
          }
        }
      }
    }
  }
  console.log(`  총 ${fixCount}건 복구`);

  // 4. Legacy 저장
  if (fixCount > 0) {
    console.log('\n=== 4. Legacy 저장 ===');
    const saveResp = await fetch(`${BASE}/api/fmea`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId: FMEA_ID, data: legacy }),
    });
    if (!saveResp.ok) {
      const errText = await saveResp.text();
      console.error('저장 실패:', saveResp.status, errText.substring(0, 200));
      return;
    }
    console.log('  Legacy 저장 성공');
  }

  // 5. Rebuild Atomic
  console.log('\n=== 5. Rebuild Atomic ===');
  const rebuildResp = await fetch(`${BASE}/api/fmea/rebuild-atomic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID }),
  });
  const rebuildData = await rebuildResp.json();
  console.log('  Rebuild:', rebuildData.message || JSON.stringify(rebuildData).substring(0, 100));

  // 6. Pipeline Verify (반복루프)
  console.log('\n=== 6. Pipeline Verify (반복루프) ===');
  let loop = 0;
  let allGreen = false;
  while (loop < 5 && !allGreen) {
    loop++;
    console.log(`\n  --- Loop ${loop} ---`);
    const verifyResp = await fetch(`${BASE}/api/fmea/pipeline-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId: FMEA_ID, autoFix: true }),
    });
    const vd = await verifyResp.json();
    for (const step of vd.steps) {
      const icon = step.status === 'ok' ? '✅' : step.status === 'warn' ? '⚠️' : '❌';
      const details = [];
      if (step.details?.emptyPC !== undefined) details.push(`emptyPC=${step.details.emptyPC}`);
      if (step.details?.orphanL3Func !== undefined) details.push(`orphan=${step.details.orphanL3Func}`);
      if (step.details?.brokenFC !== undefined) details.push(`brokenFC=${step.details.brokenFC}`);
      if (step.details?.unlinkedFC !== undefined) details.push(`unlinkedFC=${step.details.unlinkedFC}`);
      console.log(`  ${icon} STEP ${step.step} ${step.name}: ${step.status} ${details.join(' ')}`);
      if (step.issues?.length > 0) step.issues.forEach(i => console.log(`     ⚠ ${i}`));
      if (step.fixed?.length > 0) step.fixed.forEach(f => console.log(`     🔧 ${f}`));
    }
    allGreen = vd.allGreen;
    if (allGreen) {
      console.log(`\n  🎉 ALL GREEN (${loop}회 루프)`);
    } else if (vd.steps.some(s => s.fixed?.length > 0)) {
      console.log('  자동수정 적용됨 → 다음 루프 실행');
    } else {
      console.log('  자동수정 없음 → 루프 종료');
      break;
    }
  }
}

main().catch(console.error);
