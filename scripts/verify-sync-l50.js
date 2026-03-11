const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    const r = await pool.query(`
      SELECT pi."processNo", pi."processName", pi."processDesc", pi."partName", pi."equipment",
             pi."productSC", pi."productChar", pi."processSC", pi."processChar", pi."sortOrder"
      FROM pfd_items pi
      JOIN pfd_registrations pr ON pi."pfdId" = pr.id
      WHERE pr."pfdNo" = 'pfd26-p001-l50' AND pi."isDeleted" = false
      ORDER BY pi."sortOrder"
      LIMIT 10
    `);
    console.log('=== DB 검증: pfd26-p001-l50 (first 10) ===');
    r.rows.forEach((r, i) => {
      console.log(`[${i}] no=${r.processNo} name=${r.processName} desc="${(r.processDesc||'').substring(0,40)}" part="${r.partName}" equip="${r.equipment}" prodSC="${r.productSC}" prodChar="${(r.productChar||'').substring(0,25)}" procSC="${r.processSC}" procChar="${(r.processChar||'').substring(0,25)}"`);
    });

    // 전체 통계
    const r2 = await pool.query(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN "processDesc" != '' THEN 1 ELSE 0 END) as has_desc,
        SUM(CASE WHEN "productChar" != '' THEN 1 ELSE 0 END) as has_prodchar,
        SUM(CASE WHEN "processChar" != '' THEN 1 ELSE 0 END) as has_procchar
      FROM pfd_items pi
      JOIN pfd_registrations pr ON pi."pfdId" = pr.id
      WHERE pr."pfdNo" = 'pfd26-p001-l50' AND pi."isDeleted" = false
    `);
    console.log('\n=== 전체 통계 ===');
    console.log(JSON.stringify(r2.rows[0]));
  } catch(e) { console.error('Error:', e.message); }
  finally { pool.end(); }
})();
