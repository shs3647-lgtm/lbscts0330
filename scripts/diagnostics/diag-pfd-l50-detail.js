const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    const fmeaId = 'pfm26-p001-l50';

    // 1. L2Function — productChar 확인 (제품특성)
    const r1 = await pool.query(
      `SELECT lf."functionName", lf."productChar", lf."specialChar", ls.no, ls.name
       FROM l2_functions lf
       JOIN l2_structures ls ON lf."l2StructId" = ls.id
       WHERE lf."fmeaId" = $1
       ORDER BY ls."order"
       LIMIT 10`,
      [fmeaId]
    );
    console.log('=== L2 Functions (제품특성 원본) ===');
    r1.rows.forEach(r => {
      console.log(`  no=${r.no} name=${r.name} | fn="${r.functionName}" prodChar="${r.productChar}" special="${r.specialChar}"`);
    });
    const hasL2Char = r1.rows.filter(r => r.productChar && r.productChar !== '');
    console.log(`  → productChar 있음: ${hasL2Char.length} / ${r1.rows.length}\n`);

    // 2. L3Function — processChar 확인 (공정특성)
    const r2 = await pool.query(
      `SELECT lf."functionName", lf."processChar", lf."specialChar", ls.name as l3name, l2.no, l2.name as l2name
       FROM l3_functions lf
       JOIN l3_structures ls ON lf."l3StructId" = ls.id
       JOIN l2_structures l2 ON ls."l2Id" = l2.id
       WHERE lf."fmeaId" = $1
       ORDER BY l2."order", ls."order"
       LIMIT 15`,
      [fmeaId]
    );
    console.log('=== L3 Functions (공정특성 원본) ===');
    r2.rows.forEach(r => {
      console.log(`  l2=${r.no}-${r.l2name} | l3="${r.l3name}" | fn="${r.functionName}" procChar="${r.processChar}" special="${r.specialChar}"`);
    });
    const hasL3Char = r2.rows.filter(r => r.processChar && r.processChar !== '');
    console.log(`  → processChar 있음: ${hasL3Char.length} / ${r2.rows.length}\n`);

    // 3. PFD items 첫 10건 상세
    const r3 = await pool.query(
      `SELECT pi."processNo", pi."processName", pi."processDesc", pi."partName", pi."equipment",
              pi."productSC", pi."productChar", pi."processSC", pi."processChar", pi."sortOrder"
       FROM pfd_items pi
       JOIN pfd_registrations pr ON pi."pfdId" = pr.id
       WHERE pr."pfdNo" = 'pfd26-p001-l50' AND pi."isDeleted" = false
       ORDER BY pi."sortOrder"
       LIMIT 10`,
      []
    );
    console.log('=== PFD Items (first 10, 실제 브라우저 표시) ===');
    r3.rows.forEach((r, i) => {
      console.log(`  [${i}] no=${r.processNo} name=${r.processName} desc="${r.processDesc}" part="${r.partName}" equip="${r.equipment}" | prodSC="${r.productSC}" prodChar="${r.productChar}" procSC="${r.processSC}" procChar="${r.processChar}"`);
    });

    // 4. fmea_legacy_data 확인
    const r4 = await pool.query(
      `SELECT data IS NOT NULL as has_legacy,
              LENGTH(data::text) as legacy_len
       FROM fmea_legacy_data WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    console.log('\n=== fmea_legacy_data ===');
    r4.rows.forEach(r => console.log(`  has_legacy=${r.has_legacy} len=${r.legacy_len}`));

    // 5. legacy data에서 productChar 검색
    const r5 = await pool.query(
      `SELECT substring(data::text from 1 for 500) as preview
       FROM fmea_legacy_data WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    if (r5.rows[0]?.preview) {
      console.log('  legacyData preview:', r5.rows[0].preview.substring(0, 300));
    }

  } catch(e) { console.error('Error:', e.message); }
  finally { pool.end(); }
})();
