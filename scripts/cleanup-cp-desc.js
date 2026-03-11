const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  const client = await pool.connect();
  try {
    // 1. processDesc: "10번-자재를 입고..." → "자재를 입고..."
    const r1 = await client.query(
      `UPDATE control_plan_items SET "processDesc" = regexp_replace("processDesc", $1, '') WHERE "processDesc" ~ $1`,
      ['^\\d+번[-\\s]?']
    );
    console.log('processDesc:', r1.rowCount, 'rows updated');

    // 2. processName: "-자재입고" → "자재입고" (선행 하이픈 제거)
    const r2 = await client.query(
      `UPDATE control_plan_items SET "processName" = regexp_replace("processName", $1, '') WHERE "processName" ~ $1`,
      ['^-']
    );
    console.log('processName (leading -):', r2.rowCount, 'rows updated');

    // 검증
    const v1 = await client.query(`SELECT COUNT(*) as cnt FROM control_plan_items WHERE "processDesc" ~ $1`, ['^\\d+번']);
    const v2 = await client.query(`SELECT COUNT(*) as cnt FROM control_plan_items WHERE "processName" ~ $1`, ['^-']);
    console.log('\nRemaining processDesc with 번:', v1.rows[0].cnt);
    console.log('Remaining processName with -:', v2.rows[0].cnt);

    // 샘플
    const s = await client.query(`SELECT "processNo", "processName", "processDesc" FROM control_plan_items WHERE "processDesc" IS NOT NULL AND "processDesc" != '' LIMIT 8`);
    console.log('\nCleaned samples:');
    s.rows.forEach(r => console.log(`  no:${r.processNo} | name:"${r.processName}" | desc:"${r.processDesc}"`));

  } finally {
    client.release();
    pool.end();
  }
})();
