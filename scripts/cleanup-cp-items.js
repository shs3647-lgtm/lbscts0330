const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  const client = await pool.connect();
  try {
    // 1. workElement: "10번-PDA 스캐너" → "PDA 스캐너"
    const r1 = await client.query(
      `UPDATE control_plan_items SET "workElement" = regexp_replace("workElement", $1, '') WHERE "workElement" ~ $1`,
      ['\\d+번[-\\s]?']
    );
    console.log('workElement:', r1.rowCount, 'rows updated');

    // 2. equipment: "[MC] 10번-PDA 스캐너" → "[MC] PDA 스캐너"
    const r2 = await client.query(
      `UPDATE control_plan_items SET equipment = regexp_replace(equipment, $1, '') WHERE equipment ~ $1`,
      ['\\d+번[-\\s]?']
    );
    console.log('equipment:', r2.rowCount, 'rows updated');

    // 3. productChar, processChar도 확인
    const r3 = await client.query(
      `UPDATE control_plan_items SET "productChar" = regexp_replace("productChar", $1, '') WHERE "productChar" ~ $1`,
      ['\\d+번[-\\s]?']
    );
    if (r3.rowCount > 0) console.log('productChar:', r3.rowCount, 'rows updated');

    const r4 = await client.query(
      `UPDATE control_plan_items SET "processChar" = regexp_replace("processChar", $1, '') WHERE "processChar" ~ $1`,
      ['\\d+번[-\\s]?']
    );
    if (r4.rowCount > 0) console.log('processChar:', r4.rowCount, 'rows updated');

    // 4. 검증
    const verify = await client.query(
      `SELECT COUNT(*) as cnt FROM control_plan_items WHERE equipment ~ $1 OR "workElement" ~ $1`,
      ['번[-\\s]']
    );
    console.log('\nRemaining with 번-:', verify.rows[0].cnt);

    // 5. 결과 샘플
    const sample = await client.query(
      `SELECT equipment, "workElement" FROM control_plan_items WHERE equipment IS NOT NULL AND equipment != '' LIMIT 8`
    );
    console.log('\nCleaned samples:');
    sample.rows.forEach(r => console.log(`  equipment: "${r.equipment}" | workElement: "${r.workElement}"`));

  } finally {
    client.release();
    pool.end();
  }
})();
