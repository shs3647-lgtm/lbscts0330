/**
 * FM Drop 진단 스크립트
 * - legacyData에서 FM/FC 카운트
 * - atomic 테이블에서 FM/FC 카운트
 * - 차이(gap) 상세 분석
 */
const { Client } = (await import('pg')).default || await import('pg');
const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();

const fmeaId = process.argv[2] || 'pfm26-f001-l68-r03';
const schema = 'pfmea_' + fmeaId.replace(/[^a-z0-9]/gi, '_').toLowerCase();

console.log(`\n=== FM Drop 진단: ${fmeaId} (schema: ${schema}) ===\n`);

// 1. legacyData에서 FM/FC 카운트
const legacyRes = await c.query(`SELECT data FROM "${schema}".fmea_legacy_data WHERE "fmeaId" = $1`, [fmeaId]);
const data = legacyRes.rows[0]?.data;

if (!data?.l2) {
  console.log('ERROR: legacyData.l2 없음');
  await c.end();
  process.exit(1);
}

let legacyFM = 0, legacyFC = 0, legacyLinks = 0;
const procDetails = [];

for (const proc of data.l2) {
  const isSkip = !proc.name || proc.name.includes('클릭') || proc.name.includes('선택');
  const fmCount = Array.isArray(proc.failureModes) ? proc.failureModes.length : 0;
  const fcCount = Array.isArray(proc.failureCauses) ? proc.failureCauses.length : 0;

  // FM skip 체크 (migration.ts와 동일 조건)
  let fmValid = 0;
  if (Array.isArray(proc.failureModes)) {
    for (const fm of proc.failureModes) {
      if (!fm.name || fm.name.includes('클릭') || fm.name.includes('추가')) continue;
      fmValid++;
    }
  }

  // FC skip 체크
  let fcValid = 0;
  if (Array.isArray(proc.failureCauses)) {
    for (const fc of proc.failureCauses) {
      if (!fc.name || fc.name.includes('클릭') || fc.name.includes('추가')) continue;
      fcValid++;
    }
  }
  // l3 내 FC
  let l3FcCount = 0;
  if (Array.isArray(proc.l3)) {
    for (const we of proc.l3) {
      if (Array.isArray(we.failureCauses)) {
        l3FcCount += we.failureCauses.length;
      }
    }
  }

  if (!isSkip) {
    legacyFM += fmCount;
    legacyFC += fcCount + l3FcCount;
  }

  procDetails.push({
    name: (proc.name || '').substring(0, 30),
    skip: isSkip,
    fm: fmCount,
    fmValid,
    fc: fcCount,
    fcValid,
    l3fc: l3FcCount,
  });
}

legacyLinks = Array.isArray(data.failureLinks) ? data.failureLinks.length : 0;

console.log('--- legacyData 분석 ---');
console.log(`공정(l2): ${data.l2.length}개`);
console.table(procDetails);
console.log(`총 FM(legacy): ${legacyFM}, FC(legacy): ${legacyFC}, Links: ${legacyLinks}`);

// 2. atomic 테이블 카운트
const atomicFM = await c.query(`SELECT count(*) as cnt FROM "${schema}".failure_modes WHERE "fmeaId" = $1`, [fmeaId]);
const atomicFC = await c.query(`SELECT count(*) as cnt FROM "${schema}".failure_causes WHERE "fmeaId" = $1`, [fmeaId]);
const atomicFE = await c.query(`SELECT count(*) as cnt FROM "${schema}".failure_effects WHERE "fmeaId" = $1`, [fmeaId]);
const atomicLinks = await c.query(`SELECT count(*) as cnt FROM "${schema}".failure_links WHERE "fmeaId" = $1`, [fmeaId]);
const atomicL2 = await c.query(`SELECT count(*) as cnt FROM "${schema}".l2_structures WHERE "fmeaId" = $1`, [fmeaId]);
const atomicL3 = await c.query(`SELECT count(*) as cnt FROM "${schema}".l3_structures WHERE "fmeaId" = $1`, [fmeaId]);

console.log('\n--- atomic 테이블 카운트 ---');
console.log(`L2: ${atomicL2.rows[0].cnt}`);
console.log(`L3: ${atomicL3.rows[0].cnt}`);
console.log(`FM: ${atomicFM.rows[0].cnt}`);
console.log(`FC: ${atomicFC.rows[0].cnt}`);
console.log(`FE: ${atomicFE.rows[0].cnt}`);
console.log(`Links: ${atomicLinks.rows[0].cnt}`);

// 3. GAP 분석
const fmGap = legacyFM - parseInt(atomicFM.rows[0].cnt);
const fcGap = legacyFC - parseInt(atomicFC.rows[0].cnt);
const linkGap = legacyLinks - parseInt(atomicLinks.rows[0].cnt);

console.log('\n--- GAP 분석 ---');
console.log(`FM: legacy=${legacyFM} → atomic=${atomicFM.rows[0].cnt} (gap=${fmGap})`);
console.log(`FC: legacy=${legacyFC} → atomic=${atomicFC.rows[0].cnt} (gap=${fcGap})`);
console.log(`Links: legacy=${legacyLinks} → atomic=${atomicLinks.rows[0].cnt} (gap=${linkGap})`);

if (fmGap > 0) {
  console.log('\n⚠️ FM DROP 상세:');
  // atomic에 있는 FM 텍스트
  const atomicFMs = await c.query(`SELECT mode FROM "${schema}".failure_modes WHERE "fmeaId" = $1`, [fmeaId]);
  const atomicModes = new Set(atomicFMs.rows.map(r => r.mode));

  for (const proc of data.l2) {
    if (!proc.name || proc.name.includes('클릭') || proc.name.includes('선택')) continue;
    if (!Array.isArray(proc.failureModes)) continue;
    for (const fm of proc.failureModes) {
      if (!fm.name || fm.name.includes('클릭') || fm.name.includes('추가')) continue;
      if (!atomicModes.has(fm.name)) {
        console.log(`  DROPPED FM: "${fm.name}" (공정: ${proc.name})`);
      }
    }
  }
}

// 4. public schema와 비교
const pubRes = await c.query(`SELECT data FROM public.fmea_legacy_data WHERE "fmeaId" = $1`, [fmeaId]);
const pubData = pubRes.rows[0]?.data;
if (pubData?.l2) {
  let pubFM = 0;
  for (const proc of pubData.l2) {
    if (!proc.name || proc.name.includes('클릭') || proc.name.includes('선택')) continue;
    pubFM += Array.isArray(proc.failureModes) ? proc.failureModes.length : 0;
  }
  console.log(`\npublic schema FM: ${pubFM}`);
}

await c.end();
