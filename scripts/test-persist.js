/**
 * DB 영속성 테스트 — S추천 + 고장수정 → DB → 재로그인(재조회)
 */
const fs = require('fs');
const BASE = 'http://localhost:3000/api';
const fmeaId = 'pfm26-p006-i06';

async function api(path, method, body) {
  const opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  return res.json();
}

async function patchCell(table, recordId, field, value) {
  return api('/fmea/atom-cell', 'PATCH', { fmeaId, table, recordId, field, value });
}

async function main() {
  console.log('=== DB 영속성 테스트: S추천 + 고장수정 ===\n');

  const feId = 'L1-R2-C4';
  const raId = 'FC-R2-RA';
  const flId = 'FC-R2';

  // ── STEP 1: 수정 ──
  console.log('── STEP 1: 데이터 수정 ──');

  // FE severity (S추천)
  let r = await patchCell('failure_effects', feId, 'severity', 8);
  console.log('  FE.severity=8:', r.success ? 'OK' : 'FAIL ' + r.error);

  // RA SOD
  r = await patchCell('risk_analyses', raId, 'severity', 8);
  console.log('  RA.severity=8:', r.success ? 'OK (AP=' + r.ap + ')' : 'FAIL ' + r.error);
  r = await patchCell('risk_analyses', raId, 'occurrence', 4);
  console.log('  RA.occurrence=4:', r.success ? 'OK (AP=' + r.ap + ')' : 'FAIL ' + r.error);
  r = await patchCell('risk_analyses', raId, 'detection', 3);
  console.log('  RA.detection=3:', r.success ? 'OK (AP=' + r.ap + ')' : 'FAIL ' + r.error);

  // DC/PC
  r = await patchCell('risk_analyses', raId, 'detectionControl', 'SPC 모니터링');
  console.log('  RA.DC:', r.success ? 'OK' : 'FAIL ' + r.error);
  r = await patchCell('risk_analyses', raId, 'preventionControl', '수입검사 기준 관리');
  console.log('  RA.PC:', r.success ? 'OK' : 'FAIL ' + r.error);

  // FL fmId (고장수정)
  r = await patchCell('failure_links', flId, 'fmId', 'L2-R2-C6');
  console.log('  FL.fmId=L2-R2-C6:', r.success ? 'OK' : 'FAIL ' + r.error);

  // ── STEP 2: 재로그인 시뮬레이션 (export로 DB 재조회) ──
  console.log('\n── STEP 2: 재로그인 시뮬레이션 (DB 직접 재조회) ──');
  const exportRes = await api('/fmea/export-package', 'POST', { fmeaId });
  if (!exportRes.success) {
    console.log('  export 실패:', exportRes.error);
    return;
  }

  const expPath = `c:/autom-fmea/exports/${fmeaId}/${fmeaId}.json`;
  const expData = JSON.parse(fs.readFileSync(expPath, 'utf8'));
  const dat = expData.data;

  let allOk = true;

  // FE severity
  const fe = dat.failureEffects.find(f => f.id === feId);
  const feOk = fe && fe.severity === 8;
  console.log('  FE.severity:', fe?.severity, feOk ? '✅ 유지됨' : '❌ 미반영');
  if (!feOk) allOk = false;

  // RA SOD + DC/PC
  const ra = dat.riskAnalyses.find(r => r.id === raId);
  for (const [field, expected] of [['severity', 8], ['occurrence', 4], ['detection', 3]]) {
    const ok = ra && ra[field] === expected;
    console.log(`  RA.${field}:`, ra?.[field], ok ? '✅ 유지됨' : '❌ 미반영');
    if (!ok) allOk = false;
  }
  const dcOk = ra && ra.detectionControl === 'SPC 모니터링';
  console.log('  RA.DC:', ra?.detectionControl || 'null', dcOk ? '✅ 유지됨' : '❌ 미반영');
  if (!dcOk) allOk = false;
  const pcOk = ra && ra.preventionControl === '수입검사 기준 관리';
  console.log('  RA.PC:', ra?.preventionControl || 'null', pcOk ? '✅ 유지됨' : '❌ 미반영');
  if (!pcOk) allOk = false;
  console.log('  RA.AP:', ra?.ap);

  // FL fmId
  const fl = dat.failureLinks.find(f => f.id === flId);
  const flOk = fl && fl.fmId === 'L2-R2-C6';
  console.log('  FL.fmId:', fl?.fmId, flOk ? '✅ 유지됨' : '❌ 미반영');
  if (!flOk) allOk = false;

  // ── STEP 3: 최종 판정 ──
  console.log('\n══════════════════════════════════════');
  if (allOk) {
    console.log('✅ 전체 PASS — 재로그인 후에도 모든 수정사항 DB에 유지됨');
  } else {
    console.log('❌ FAIL — 일부 수정사항 미반영');
  }
  console.log('══════════════════════════════════════');

  // ── STEP 4: 원복 ──
  console.log('\n── STEP 4: 원복 ──');
  await patchCell('failure_effects', feId, 'severity', 1);
  await patchCell('risk_analyses', raId, 'severity', 1);
  await patchCell('risk_analyses', raId, 'occurrence', 1);
  await patchCell('risk_analyses', raId, 'detection', 1);
  await patchCell('risk_analyses', raId, 'detectionControl', '');
  await patchCell('risk_analyses', raId, 'preventionControl', '');
  await patchCell('failure_links', flId, 'fmId', 'L2-R4-C6');
  console.log('원복 완료');
}

main().catch(e => console.error(e));
