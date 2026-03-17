import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();
const fmeaId = 'pfm26-f001-l41';
const dsR = await c.query(`SELECT id, "failureChains" FROM public.pfmea_master_datasets WHERE "fmeaId"=$1 AND "isActive"=true LIMIT 1`, [fmeaId]);
const dsId = dsR.rows[0]?.id;
const chains = Array.isArray(dsR.rows[0]?.failureChains) ? dsR.rows[0].failureChains : [];

console.log('failureChains total:', chains.length);
if (chains.length > 0) console.log('sample chain keys:', Object.keys(chains[0]).join(', '));

// chain 분석
const emptyFm = chains.filter(ch => !(ch.fmValue || '').trim()).length;
const emptyFc = chains.filter(ch => !(ch.fcValue || '').trim()).length;
const emptyFe = chains.filter(ch => !(ch.feValue || '').trim()).length;
console.log(`emptyFm: ${emptyFm}, emptyFc: ${emptyFc}, emptyFe: ${emptyFe}`);
console.log('non-empty chains (FM+FC+FE all present):', chains.filter(ch => (ch.fmValue||'').trim() && (ch.fcValue||'').trim() && (ch.feValue||'').trim()).length);

// flatItems 전체 현황
const allFlat = await c.query(`SELECT "itemCode", count(*) as cnt FROM public.pfmea_master_flat_items WHERE "datasetId"=$1 GROUP BY "itemCode" ORDER BY "itemCode"`, [dsId]);
console.log('\n=== flatItems 전체 ===');
let flatTotal = 0;
allFlat.rows.forEach(r => { console.log(`  ${r.itemCode}: ${r.cnt}`); flatTotal += parseInt(r.cnt); });
console.log(`flatItems total: ${flatTotal}`);

// FC시트 기반으로 파싱된 chain 수 vs flatItems 수
// B4(고장원인)과 A5(고장형태)는 FC시트에서 추출
const b4Count = allFlat.rows.find(r => r.itemCode === 'B4');
const a5Count = allFlat.rows.find(r => r.itemCode === 'A5');
const c4Count = allFlat.rows.find(r => r.itemCode === 'C4');
console.log(`\nFC시트 연관: B4=${b4Count?.cnt || 0}, A5=${a5Count?.cnt || 0}, C4=${c4Count?.cnt || 0}`);

// B4 빈값 포함 total
const b4WithEmpty = await c.query(`SELECT count(*) as cnt FROM public.pfmea_master_flat_items WHERE "datasetId"=$1 AND "itemCode"='B4'`, [dsId]);
const a5WithEmpty = await c.query(`SELECT count(*) as cnt FROM public.pfmea_master_flat_items WHERE "datasetId"=$1 AND "itemCode"='A5'`, [dsId]);
console.log(`B4(빈값포함): ${b4WithEmpty.rows[0].cnt}, A5(빈값포함): ${a5WithEmpty.rows[0].cnt}`);

// DB 실제 데이터
const dbFm = await c.query(`SELECT count(*) as cnt FROM public.failure_modes WHERE "fmeaId"=$1`, [fmeaId]);
const dbFe = await c.query(`SELECT count(*) as cnt FROM public.failure_effects WHERE "fmeaId"=$1`, [fmeaId]);
const dbFc = await c.query(`SELECT count(*) as cnt FROM public.failure_causes WHERE "fmeaId"=$1`, [fmeaId]);
const dbLink = await c.query(`SELECT count(*) as cnt FROM public.failure_links WHERE "fmeaId"=$1 AND "deletedAt" IS NULL`, [fmeaId]);
console.log(`\nDB: FM=${dbFm.rows[0].cnt}, FE=${dbFe.rows[0].cnt}, FC=${dbFc.rows[0].cnt}, Link=${dbLink.rows[0].cnt}`);

// processNo별 chain 분포
const chainByProcess = {};
chains.forEach(ch => {
  const pno = ch.processNo || 'unknown';
  chainByProcess[pno] = (chainByProcess[pno] || 0) + 1;
});
console.log('\n=== chain by processNo ===');
Object.entries(chainByProcess).sort((a,b) => parseInt(a[0]) - parseInt(b[0]))
  .forEach(([pno, cnt]) => console.log(`  공정${pno}: ${cnt}건`));

await c.end();
