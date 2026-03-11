const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    // 1. pfd26-p001-l39의 SC값 확인
    const r1 = await pool.query(`
      SELECT "processNo", "processName", "partName", "productSC", "processSC", "productChar", "processChar"
      FROM pfd_items
      WHERE "pfdId" = (SELECT id FROM pfd_registrations WHERE "pfdNo" = 'pfd26-p001-l39')
        AND "isDeleted" = false
        AND ("productSC" != '' OR "processSC" != '')
      ORDER BY "sortOrder"
      LIMIT 20
    `);
    console.log('=== SC값이 있는 PFD items ===', r1.rowCount, '건');
    r1.rows.forEach(r => {
      console.log(`  no=${r.processNo} name="${r.processName}" part="${r.partName}" | prodSC="${r.productSC}" procSC="${r.processSC}" | prodChar="${r.productChar}" procChar="${r.processChar}"`);
    });

    // 2. SC값이 비어있는 항목 수
    const r2 = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN "productSC" != '' THEN 1 ELSE 0 END) as has_prodSC,
        SUM(CASE WHEN "processSC" != '' THEN 1 ELSE 0 END) as has_procSC
      FROM pfd_items
      WHERE "pfdId" = (SELECT id FROM pfd_registrations WHERE "pfdNo" = 'pfd26-p001-l39')
        AND "isDeleted" = false
    `);
    console.log('\n=== SC값 통계 ===');
    console.log(`  total: ${r2.rows[0].total} | 제품SC 있음: ${r2.rows[0].has_prodsc} | 공정SC 있음: ${r2.rows[0].has_procsc}`);

    // 3. FMEA 원본 L2Function, L3Function의 specialChar 확인
    console.log('\n=== FMEA 원본 specialChar ===');
    const r3 = await pool.query(`
      SELECT "functionName", "productChar", "specialChar"
      FROM l2_functions WHERE "fmeaId" = 'pfm26-p001-l39' AND "specialChar" IS NOT NULL AND "specialChar" != ''
      LIMIT 10
    `);
    console.log('L2Function (specialChar 있음):', r3.rowCount, '건');
    r3.rows.forEach(r => console.log(`  fn="${r.functionName}" prodChar="${r.productChar}" special="${r.specialChar}"`));

    const r4 = await pool.query(`
      SELECT "functionName", "processChar", "specialChar"
      FROM l3_functions WHERE "fmeaId" = 'pfm26-p001-l39' AND "specialChar" IS NOT NULL AND "specialChar" != ''
      LIMIT 10
    `);
    console.log('L3Function (specialChar 있음):', r4.rowCount, '건');
    r4.rows.forEach(r => console.log(`  fn="${r.functionName}" procChar="${r.processChar}" special="${r.specialChar}"`));

  } catch(e) { console.error('Error:', e.message); }
  finally { pool.end(); }
})();
