const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    const fmeaId = 'pfm26-p001-l39';
    const pfdNo = 'pfd26-p001-l39';

    // 1. PfdRegistration 확인
    const r1 = await pool.query('SELECT id, "pfdNo", "linkedPfmeaNo", "fmeaId", subject FROM pfd_registrations WHERE "pfdNo" = $1', [pfdNo]);
    console.log('=== PfdRegistration ===');
    if (r1.rowCount > 0) {
      const r = r1.rows[0];
      console.log(`  id: ${r.id}`);
      console.log(`  pfdNo: ${r.pfdNo}`);
      console.log(`  linkedPfmeaNo: ${r.linkedPfmeaNo}`);
      console.log(`  fmeaId: ${r.fmeaId}`);
      console.log(`  subject: ${r.subject}`);
    } else {
      console.log('  NOT FOUND!');
    }

    // 2. PfdItem 수 확인
    const r2 = await pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN "isDeleted" = false THEN 1 ELSE 0 END) as active FROM pfd_items WHERE "pfdId" = $1', [r1.rows[0]?.id]);
    console.log('\n=== PfdItems ===');
    console.log(`  total: ${r2.rows[0].total}`);
    console.log(`  active (not deleted): ${r2.rows[0].active}`);

    // 3. DocumentLink 확인
    const r3 = await pool.query(`SELECT * FROM document_links WHERE "sourceType" = 'pfd' AND "targetType" = 'fmea' AND "targetId" = $1`, [fmeaId]);
    console.log('\n=== DocumentLink ===');
    if (r3.rowCount > 0) {
      const r = r3.rows[0];
      console.log(`  id: ${r.id}`);
      console.log(`  sourceType: ${r.sourceType} → targetType: ${r.targetType}`);
      console.log(`  sourceId: ${r.sourceId}`);
      console.log(`  targetId: ${r.targetId}`);
      console.log(`  lastSyncAt: ${r.lastSyncAt}`);
    } else {
      console.log('  NOT FOUND!');
    }

    // 4. FmeaRegistration.linkedPfdNo 확인
    const r4 = await pool.query('SELECT "fmeaId", "linkedPfdNo" FROM fmea_registrations WHERE "fmeaId" = $1', [fmeaId]);
    console.log('\n=== FmeaRegistration cross-link ===');
    if (r4.rowCount > 0) {
      console.log(`  fmeaId: ${r4.rows[0].fmeaId}`);
      console.log(`  linkedPfdNo: ${r4.rows[0].linkedPfdNo}`);
    }

    // 5. PfdItem 샘플 (processNo 분포)
    const r5 = await pool.query(`
      SELECT "processNo", "processName", COUNT(*) as cnt
      FROM pfd_items WHERE "pfdId" = $1 AND "isDeleted" = false
      GROUP BY "processNo", "processName"
      ORDER BY "processNo"
    `, [r1.rows[0]?.id]);
    console.log('\n=== PfdItem distribution ===');
    r5.rows.forEach(r => console.log(`  ${r.processNo} ${r.processName}: ${r.cnt}건`));

  } catch(e) { console.error('Error:', e.message); }
  finally { pool.end(); }
})();
