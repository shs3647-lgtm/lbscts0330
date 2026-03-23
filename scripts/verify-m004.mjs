import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const schema = 'pfmea_pfm26_m004';

const tables = [
  'l1_structures', 'l2_structures', 'l3_structures',
  'l1_functions', 'l2_functions', 'l3_functions',
  'process_product_chars',
  'failure_effects', 'failure_modes', 'failure_causes',
  'failure_links', 'risk_analyses', 'optimizations',
];

console.log(`=== ${schema} DB 검증 ===`);
for (const t of tables) {
  const r = await pool.query(`SELECT COUNT(*) as cnt FROM "${schema}"."${t}"`);
  console.log(`${t}: ${r.rows[0].cnt}건`);
}

// Check L1
const l1 = await pool.query(`SELECT COUNT(*) as cnt FROM "${schema}".l1_structures`);
console.log('\nL1 Structures:', l1.rows[0].cnt);

// Check L1 scopes
const l1s = await pool.query(`SELECT COUNT(*) as cnt FROM "${schema}".l1_scopes`);
console.log('L1 Scopes:', l1s.rows[0].cnt);

// Check failure_links detail
const fl = await pool.query(`SELECT COUNT(*) as cnt FROM "${schema}".failure_links`);
console.log('\nFailureLinks:', fl.rows[0].cnt);

// FC with l2StructId check
const fc = await pool.query(`SELECT COUNT(*) as cnt FROM "${schema}".failure_causes WHERE "l2StructId" IS NOT NULL`);
const fcAll = await pool.query(`SELECT COUNT(*) as cnt FROM "${schema}".failure_causes`);
console.log('FailureCauses total:', fcAll.rows[0].cnt, '(with l2StructId:', fc.rows[0].cnt + ')');

await pool.end();
