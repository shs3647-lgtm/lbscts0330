import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// pfm26-m051 스키마 확인
try {
  const l1f = await pool.query(`SELECT COUNT(*) FROM pfmea_pfm26_m051.l1_functions`);
  console.log('pfm26_m051.l1_functions:', l1f.rows[0].count);
  const l1s = await pool.query(`SELECT COUNT(*) FROM pfmea_pfm26_m051.l1_structures`);
  console.log('pfm26_m051.l1_structures:', l1s.rows[0].count);
} catch(e) { console.log('m051 schema error:', e.message?.slice(0,80)); }

// pfm26-m052 더 자세히
const c2_52 = await pool.query(`SELECT value FROM pfmea_pfm26_m052.l1_functions WHERE category='YP' ORDER BY "functionName" LIMIT 10`);
console.log('\npfm26_m052 YP l1_functions sample:');
c2_52.rows.forEach(r => console.log(`  ${r.value?.slice?.(0,50)}`));

// m052와 m051의 C2 비교
const c2items_52 = await pool.query(`
  SELECT value FROM pfmea_master_flat_items 
  WHERE "datasetId"='c70553d9-2ae4-43d0-84c1-ca50f8e82019' AND "itemCode"='C2'
  ORDER BY "orderIndex"
`);
console.log('\nm052 dataset C2 items:');
c2items_52.rows.forEach(r => console.log(`  "${r.value?.slice(0,60)}"`));

const c2items_51 = await pool.query(`
  SELECT value FROM pfmea_master_flat_items 
  WHERE "datasetId"='ae8cbabd-15d5-44f2-a2b8-27fcf3a00b17' AND "itemCode"='C2'
  ORDER BY "orderIndex"
`);
console.log('\nm051 dataset C2 items:');
c2items_51.rows.forEach(r => console.log(`  "${r.value?.slice(0,60)}"`));

await pool.end();
