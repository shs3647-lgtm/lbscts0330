import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();
const fmeaId = 'pfm26-f001-l41';

// 1. Import B4 (고장원인) — flatItems
const dsR = await c.query(`SELECT id FROM public.pfmea_master_datasets WHERE "fmeaId"=$1 AND "isActive"=true LIMIT 1`, [fmeaId]);
const dsId = dsR.rows[0]?.id;

const impB4 = await c.query(`SELECT count(*) as cnt FROM public.pfmea_master_flat_items WHERE "datasetId"=$1 AND "itemCode"='B4' AND value<>''`, [dsId]);
const impB4Distinct = await c.query(`SELECT count(DISTINCT value) as cnt FROM public.pfmea_master_flat_items WHERE "datasetId"=$1 AND "itemCode"='B4' AND value<>''`, [dsId]);

// 2. DB B4 (고장원인) — FailureCause (컬럼명: cause)
const dbB4 = await c.query(`SELECT count(*) as cnt FROM public.failure_causes WHERE "fmeaId"=$1`, [fmeaId]);
const dbB4WithCause = await c.query(`SELECT count(*) as cnt FROM public.failure_causes WHERE "fmeaId"=$1 AND cause<>''`, [fmeaId]);
const dbB4Empty = await c.query(`SELECT count(*) as cnt FROM public.failure_causes WHERE "fmeaId"=$1 AND (cause='' OR cause IS NULL)`, [fmeaId]);

// 3. Link 비교
const impLink = await c.query(`SELECT "failureChains" FROM public.pfmea_master_datasets WHERE id=$1`, [dsId]);
const chains = Array.isArray(impLink.rows[0]?.failureChains) ? impLink.rows[0].failureChains : [];
const dbLink = await c.query(`SELECT count(*) as cnt FROM public.failure_links WHERE "fmeaId"=$1 AND "deletedAt" IS NULL`, [fmeaId]);
const dbLinkAll = await c.query(`SELECT count(*) as cnt FROM public.failure_links WHERE "fmeaId"=$1`, [fmeaId]);
const dbLinkDeleted = await c.query(`SELECT count(*) as cnt FROM public.failure_links WHERE "fmeaId"=$1 AND "deletedAt" IS NOT NULL`, [fmeaId]);

console.log('=== B4 (고장원인) 분석 ===');
console.log(`Import B4 total: ${impB4.rows[0].cnt}`);
console.log(`Import B4 distinct: ${impB4Distinct.rows[0].cnt}`);
console.log(`DB FailureCause total: ${dbB4.rows[0].cnt}`);
console.log(`DB FailureCause (cause!=empty): ${dbB4WithCause.rows[0].cnt}`);
console.log(`DB FailureCause (cause=empty): ${dbB4Empty.rows[0].cnt}`);
console.log(`차이: Import(${impB4.rows[0].cnt}) - DB(${dbB4.rows[0].cnt}) = ${parseInt(impB4.rows[0].cnt) - parseInt(dbB4.rows[0].cnt)}`);

console.log('\n=== Link 분석 ===');
console.log(`Import chains: ${chains.length}`);
console.log(`DB FailureLink active: ${dbLink.rows[0].cnt}`);
console.log(`DB FailureLink total: ${dbLinkAll.rows[0].cnt}`);
console.log(`DB FailureLink soft-deleted: ${dbLinkDeleted.rows[0].cnt}`);
console.log(`차이: Import(${chains.length}) - DB(${dbLink.rows[0].cnt}) = ${chains.length - parseInt(dbLink.rows[0].cnt)}`);

// 4. B4 값별 비교: Import vs DB
const allImpB4 = await c.query(`SELECT value FROM public.pfmea_master_flat_items WHERE "datasetId"=$1 AND "itemCode"='B4' AND value<>''`, [dsId]);
const allDbB4 = await c.query(`SELECT cause FROM public.failure_causes WHERE "fmeaId"=$1 AND cause<>''`, [fmeaId]);

const impMap = new Map();
allImpB4.rows.forEach(r => impMap.set(r.value, (impMap.get(r.value) || 0) + 1));
const dbMap = new Map();
allDbB4.rows.forEach(r => dbMap.set(r.cause, (dbMap.get(r.cause) || 0) + 1));

console.log('\n=== Import에는 있지만 DB에 부족한 B4값 ===');
let missingCount = 0;
for (const [val, impCnt] of impMap) {
  const dbCnt = dbMap.get(val) || 0;
  if (impCnt > dbCnt) {
    missingCount += (impCnt - dbCnt);
    console.log(`  Import=${impCnt} DB=${dbCnt} diff=${impCnt-dbCnt} "${val.slice(0,70)}"`);
  }
}
console.log(`총 DB 부족: ${missingCount}`);

console.log('\n=== DB에만 있거나 DB가 더 많은 B4값 ===');
let extraCount = 0;
for (const [val, dbCnt] of dbMap) {
  const impCnt = impMap.get(val) || 0;
  if (dbCnt > impCnt) {
    extraCount += (dbCnt - impCnt);
    console.log(`  Import=${impCnt} DB=${dbCnt} diff=${dbCnt-impCnt} "${val.slice(0,70)}"`);
  }
}
console.log(`총 DB 초과: ${extraCount}`);

// 5. B2와 동일한 패턴인지 확인: 같은 cause가 다른 구조에서 중복
const dbB4ByStruct = await c.query(`
  SELECT DISTINCT "l3StructId", cause
  FROM public.failure_causes
  WHERE "fmeaId" = $1 AND cause <> ''
`, [fmeaId]);
console.log(`\n=== B4 DISTINCT(l3StructId, cause) ===`);
console.log(`DB B4 total: ${allDbB4.rows.length}`);
console.log(`DB B4 DISTINCT(l3StructId, cause): ${dbB4ByStruct.rows.length}`);

// 같은 l3StructId에서 같은 cause가 여러 번 나오는 경우
const dupeByStruct = await c.query(`
  SELECT "l3StructId", cause, count(*) as cnt
  FROM public.failure_causes
  WHERE "fmeaId" = $1 AND cause <> ''
  GROUP BY "l3StructId", cause
  HAVING count(*) > 1
`, [fmeaId]);
console.log(`\n=== 같은 (l3StructId, cause) 중복 ===`);
dupeByStruct.rows.forEach(r => console.log(`  x${r.cnt} struct=${r.l3StructId.slice(0,20)} "${r.cause.slice(0,60)}"`));

// 6. Link: Import chains의 fcValue와 DB의 fcText 비교
console.log('\n=== Link 상세 분석 ===');
const dbLinks = await c.query(`
  SELECT "fmText", "fcText", "feText" FROM public.failure_links
  WHERE "fmeaId"=$1 AND "deletedAt" IS NULL
`, [fmeaId]);

// chains에서 유니크 키 생성
const chainKeys = new Set(chains.map(ch => `${(ch.fmValue||'').trim()}|${(ch.feValue||'').trim()}|${(ch.fcValue||'').trim()}`));
const linkKeys = new Set(dbLinks.rows.map(l => `${(l.fmText||'').trim()}|${(l.feText||'').trim()}|${(l.fcText||'').trim()}`));

let inChainOnly = 0;
for (const k of chainKeys) {
  if (!linkKeys.has(k)) inChainOnly++;
}
let inLinkOnly = 0;
for (const k of linkKeys) {
  if (!chainKeys.has(k)) inLinkOnly++;
}
console.log(`Import chains unique keys: ${chainKeys.size}`);
console.log(`DB links unique keys: ${linkKeys.size}`);
console.log(`Import에만 있는 chain: ${inChainOnly}`);
console.log(`DB에만 있는 link: ${inLinkOnly}`);

// chain에만 있는 것 출력
if (inChainOnly > 0 && inChainOnly <= 10) {
  console.log('\n--- Import에만 있는 chain ---');
  for (const k of chainKeys) {
    if (!linkKeys.has(k)) {
      const [fm, fe, fc] = k.split('|');
      console.log(`  FM="${fm.slice(0,40)}" FE="${fe.slice(0,30)}" FC="${fc.slice(0,40)}"`);
    }
  }
}

await c.end();
