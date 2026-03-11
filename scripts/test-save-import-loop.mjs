/**
 * save-from-import 반복 테스트 스크립트
 * 1. 현재 legacyData에서 FM/FC 카운트
 * 2. save-from-import 호출
 * 3. 결과 검증 (FM/FC/Links gap 확인)
 * 4. 100% 일치할 때까지 반복 (최대 3회)
 */
const { Client } = (await import('pg')).default || await import('pg');

const fmeaId = process.argv[2] || 'pfm26-f001-l68-r03';
const schema = 'pfmea_' + fmeaId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

console.log(`\n=== save-from-import 반복 테스트: ${fmeaId} ===\n`);

// 1. 현재 master flatData 가져오기
const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();

// dataset ID 찾기 → flatData 로드
const dsRes = await c.query(
  `SELECT id, "failureChains" FROM public.pfmea_master_datasets WHERE "fmeaId" = $1 AND "isActive" = true ORDER BY "createdAt" DESC LIMIT 1`,
  [fmeaId]
);
const datasetId = dsRes.rows[0]?.id;
console.log(`Dataset ID: ${datasetId || 'NOT FOUND'}`);

let flatRes = { rows: [] };
if (datasetId) {
  flatRes = await c.query(
    `SELECT "itemCode", value, "m4" FROM public.pfmea_master_flat_items WHERE "datasetId" = $1`,
    [datasetId]
  );
}
console.log(`Master flatData: ${flatRes.rows.length}개 항목`);

// failureChains
const failureChains = dsRes.rows[0]?.failureChains || [];
console.log(`FailureChains: ${Array.isArray(failureChains) ? failureChains.length : 0}개`);

// l1Name
const l1Res = await c.query(
  `SELECT data FROM "${schema}".fmea_legacy_data WHERE "fmeaId" = $1`,
  [fmeaId]
);
const l1Name = l1Res.rows[0]?.data?.l1?.name || 'Photolithography';

// Pre-test: 현재 atomic 카운트
const preAtomic = await c.query(`
  SELECT
    (SELECT count(*) FROM "${schema}".failure_modes WHERE "fmeaId" = $1) as fm,
    (SELECT count(*) FROM "${schema}".failure_causes WHERE "fmeaId" = $1) as fc,
    (SELECT count(*) FROM "${schema}".failure_effects WHERE "fmeaId" = $1) as fe,
    (SELECT count(*) FROM "${schema}".failure_links WHERE "fmeaId" = $1) as links,
    (SELECT count(*) FROM "${schema}".l2_structures WHERE "fmeaId" = $1) as l2
`, [fmeaId]);
console.log('\n--- 테스트 전 atomic 카운트 ---');
console.log(preAtomic.rows[0]);

await c.end();

// 2. save-from-import 호출
if (flatRes.rows.length === 0) {
  console.log('\n⚠️ master flatData가 비어있어 save-from-import 테스트 불가');
  console.log('→ SA 확정(saveMasterDataset) 이후에 테스트해야 합니다.');
  process.exit(0);
}

const flatData = flatRes.rows.map(r => ({
  itemCode: r.itemCode,
  value: r.value,
  m4: r.m4,
}));

const MAX_ROUNDS = 3;
for (let round = 1; round <= MAX_ROUNDS; round++) {
  console.log(`\n=== Round ${round}/${MAX_ROUNDS} ===`);

  const res = await fetch(`${BASE_URL}/api/fmea/save-from-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId, flatData, l1Name, failureChains }),
  });

  const result = await res.json();

  if (!result.success) {
    console.log('❌ save-from-import 실패:', result.error);
    break;
  }

  console.log('atomicCounts:', result.atomicCounts);
  console.log('expected:', result.expected);
  console.log('verified:', result.verified);
  if (result.verifyGaps) console.log('gaps:', result.verifyGaps);

  // 3. verify-counts 확인
  const verifyRes = await fetch(`${BASE_URL}/api/fmea/verify-counts?fmeaId=${fmeaId}`);
  const verify = await verifyRes.json();

  const items = [];
  for (const code of ['A1','A2','B1','C1','C2','C3','A3','A4','B2','B3','C4','A5','B4','A6','B5','link']) {
    const imp = verify.import?.[code] ?? 0;
    const db = verify.db?.[code] ?? 0;
    const gap = imp > 0 ? db - imp : 0;
    items.push({ code, import: imp, db, gap: gap < 0 ? gap : (gap > 0 ? `+${gap}` : '0') });
  }
  console.table(items);

  // 4. 100% 일치 확인
  const hasGap = items.some(i => {
    if (i.import === 0) return false; // import=0이면 비교 불가
    return i.gap !== '0' && !String(i.gap).startsWith('+');
  });

  if (!hasGap) {
    console.log(`\n✅ Round ${round}: 100% 일치 — 테스트 통과!`);
    break;
  } else {
    const negGaps = items.filter(i => i.import > 0 && typeof i.gap === 'number' && i.gap < 0);
    console.log(`\n⚠️ Round ${round}: GAP 발견 — ${negGaps.map(g => `${g.code}: ${g.gap}`).join(', ')}`);
    if (round === MAX_ROUNDS) {
      console.log('❌ 최대 반복 횟수 초과');
    }
  }
}
