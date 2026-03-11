const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    // 1. L2Structure가 있는 fmeaId 확인
    const r1 = await pool.query(`
      SELECT "fmeaId", COUNT(*) as l2_count
      FROM l2_structures
      GROUP BY "fmeaId"
      ORDER BY l2_count DESC
      LIMIT 5
    `);
    console.log('=== FMEA with L2 structures ===');
    r1.rows.forEach(r => console.log(`  ${r.fmeaId}: ${r.l2_count} L2s`));

    // 2. 해당 fmeaId의 L3, L2Function, L3Function 수
    if (r1.rows.length > 0) {
      const fmeaId = r1.rows[0].fmeaId;
      const r2 = await pool.query('SELECT COUNT(*) as cnt FROM l3_structures WHERE "fmeaId" = $1', [fmeaId]);
      const r3 = await pool.query('SELECT COUNT(*) as cnt FROM l2_functions WHERE "fmeaId" = $1', [fmeaId]);
      const r4 = await pool.query('SELECT COUNT(*) as cnt FROM l3_functions WHERE "fmeaId" = $1', [fmeaId]);
      console.log(`\n=== ${fmeaId} detail ===`);
      console.log(`  L3 structures: ${r2.rows[0].cnt}`);
      console.log(`  L2 functions: ${r3.rows[0].cnt}`);
      console.log(`  L3 functions: ${r4.rows[0].cnt}`);
    }

    // 3. 기존 PFD 확인
    const r5 = await pool.query('SELECT "pfdNo", "linkedPfmeaNo", "fmeaId" FROM pfd_registrations LIMIT 5');
    console.log('\n=== Existing PFD registrations ===');
    r5.rows.forEach(r => console.log(`  pfdNo=${r.pfdNo} | linkedPfmea=${r.linkedPfmeaNo} | fmeaId=${r.fmeaId}`));

    // 4. FmeaRegistration linkedPfdNo 확인
    const r6 = await pool.query('SELECT "fmeaId", "linkedPfdNo" FROM fmea_registrations WHERE "linkedPfdNo" IS NOT NULL LIMIT 5');
    console.log('\n=== FMEA with linkedPfdNo ===');
    r6.rows.forEach(r => console.log(`  fmeaId=${r.fmeaId} → pfdNo=${r.linkedPfdNo}`));

  } catch(e) { console.error('Error:', e.message); }
  finally { pool.end(); }
})();
