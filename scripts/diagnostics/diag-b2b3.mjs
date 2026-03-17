import pg from 'pg';
const { Client } = pg;

const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();

const fmeaId = 'pfm26-f001-l41';

// DB L3Function (public schema)
const b2All = await c.query(
  `SELECT "functionName" FROM public.l3_functions WHERE "fmeaId" = $1 AND "functionName" <> ''`,
  [fmeaId]
);
const b3All = await c.query(
  `SELECT "processChar" FROM public.l3_functions WHERE "fmeaId" = $1 AND "processChar" <> ''`,
  [fmeaId]
);

// Import flatItems
const dsR = await c.query(
  `SELECT id FROM public.pfmea_master_datasets WHERE "fmeaId" = $1 AND "isActive" = true LIMIT 1`,
  [fmeaId]
);
const dsId = dsR.rows[0]?.id;

let impB2 = [], impB3 = [];
if (dsId) {
  const r2 = await c.query(
    `SELECT value FROM public.pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B2' AND value <> ''`,
    [dsId]
  );
  const r3 = await c.query(
    `SELECT value FROM public.pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B3' AND value <> ''`,
    [dsId]
  );
  impB2 = r2.rows;
  impB3 = r3.rows;
}

console.log('=== 정합성 기준 결정을 위한 데이터 분석 ===\n');
console.log('Import (flatItems):');
console.log(`  B2 total: ${impB2.length} | distinct: ${new Set(impB2.map(r => r.value)).size}`);
console.log(`  B3 total: ${impB3.length} | distinct: ${new Set(impB3.map(r => r.value)).size}`);
console.log('');
console.log('DB (L3Function):');
console.log(`  B2 total: ${b2All.rows.length} | distinct: ${new Set(b2All.rows.map(r => r.functionName)).size}`);
console.log(`  B3 total: ${b3All.rows.length} | distinct: ${new Set(b3All.rows.map(r => r.processChar)).size}`);

// B2 중복
const b2Map = {};
b2All.rows.forEach(r => { b2Map[r.functionName] = (b2Map[r.functionName] || 0) + 1; });
const b2Dupes = Object.entries(b2Map).filter(([, n]) => n > 1);
console.log(`\nB2 중복 (DB에서 같은 functionName이 여러 행): ${b2Dupes.length}건`);
b2Dupes.forEach(([v, n]) => console.log(`  x${n} "${v.slice(0, 50)}"`));

// B3 중복
const b3Map = {};
b3All.rows.forEach(r => { b3Map[r.processChar] = (b3Map[r.processChar] || 0) + 1; });
const b3Dupes = Object.entries(b3Map).filter(([, n]) => n > 1);
console.log(`\nB3 중복 (DB에서 같은 processChar이 여러 행): ${b3Dupes.length}건`);
b3Dupes.forEach(([v, n]) => console.log(`  x${n} "${v.slice(0, 50)}"`));

// Import B2 중복
const impB2Map = {};
impB2.forEach(r => { impB2Map[r.value] = (impB2Map[r.value] || 0) + 1; });
const impB2Dupes = Object.entries(impB2Map).filter(([, n]) => n > 1);
console.log(`\nImport B2 중복: ${impB2Dupes.length}건`);
impB2Dupes.forEach(([v, n]) => console.log(`  x${n} "${v.slice(0, 50)}"`));

// Import B3 중복
const impB3Map = {};
impB3.forEach(r => { impB3Map[r.value] = (impB3Map[r.value] || 0) + 1; });
const impB3Dupes = Object.entries(impB3Map).filter(([, n]) => n > 1);
console.log(`\nImport B3 중복: ${impB3Dupes.length}건`);
impB3Dupes.forEach(([v, n]) => console.log(`  x${n} "${v.slice(0, 50)}"`));

console.log('\n=== 결론 ===');
console.log('모든 카운트를 total(전체 행 수)로 통일하면:');
console.log(`  B2: Import=${impB2.length}, DB=${b2All.rows.length}`);
console.log(`  B3: Import=${impB3.length}, DB=${b3All.rows.length}`);

await c.end();
