const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    // 1. pfd26-p001-l50의 registration 확인
    const r1 = await pool.query(
      `SELECT id, "pfdNo", "fmeaId", "linkedPfmeaNo", "deletedAt" FROM pfd_registrations WHERE "pfdNo" = $1`,
      ['pfd26-p001-l50']
    );
    console.log('=== PFD Registration (pfd26-p001-l50) ===');
    r1.rows.forEach(r => console.log(' ', JSON.stringify(r)));

    if (r1.rows.length === 0) {
      console.log('PFD registration NOT FOUND!');
    }

    const fmeaId = r1.rows[0]?.fmeaId;
    const pfdId = r1.rows[0]?.id;

    // 2. fmeaId 유무 확인 + FMEA 데이터 확인
    if (fmeaId) {
      console.log('\nfmeaId:', fmeaId);
      const r2 = await pool.query(`SELECT COUNT(*) as cnt FROM l2_structures WHERE "fmeaId" = $1`, [fmeaId]);
      console.log('L2 structures:', r2.rows[0].cnt);
      const r3 = await pool.query(`SELECT COUNT(*) as cnt FROM l2_functions WHERE "fmeaId" = $1`, [fmeaId]);
      console.log('L2 functions:', r3.rows[0].cnt);
      const r4 = await pool.query(`SELECT COUNT(*) as cnt FROM l3_structures WHERE "fmeaId" = $1`, [fmeaId]);
      console.log('L3 structures:', r4.rows[0].cnt);
      const r5 = await pool.query(`SELECT COUNT(*) as cnt FROM l3_functions WHERE "fmeaId" = $1`, [fmeaId]);
      console.log('L3 functions:', r5.rows[0].cnt);

      // L2 구조 상세
      const r2d = await pool.query(`SELECT no, name FROM l2_structures WHERE "fmeaId" = $1 ORDER BY "order" LIMIT 5`, [fmeaId]);
      console.log('\nL2 structures (first 5):');
      r2d.rows.forEach(r => console.log('  no=' + r.no + ' name=' + r.name));

      // L2 Function specialChar 확인
      const r3d = await pool.query(`SELECT "functionName", "productChar", "specialChar" FROM l2_functions WHERE "fmeaId" = $1 AND "specialChar" IS NOT NULL AND "specialChar" != '' LIMIT 5`, [fmeaId]);
      console.log('\nL2 functions with specialChar:');
      r3d.rows.forEach(r => console.log('  fn=' + r.functionName + ' prodChar=' + r.productChar + ' special=' + r.specialChar));

      // L3 Function specialChar 확인
      const r4d = await pool.query(`SELECT "functionName", "processChar", "specialChar" FROM l3_functions WHERE "fmeaId" = $1 AND "specialChar" IS NOT NULL AND "specialChar" != '' LIMIT 5`, [fmeaId]);
      console.log('\nL3 functions with specialChar:');
      r4d.rows.forEach(r => console.log('  fn=' + r.functionName + ' procChar=' + r.processChar + ' special=' + r.specialChar));
    } else {
      console.log('\n*** fmeaId is NULL! ***');
      // 역추적: FMEA에서 이 PFD를 링크한 것 찾기
      const r6 = await pool.query(`SELECT "fmeaId", "linkedPfdNo", subject FROM fmea_registrations WHERE "linkedPfdNo" = $1`, ['pfd26-p001-l50']);
      console.log('FMEA linked to pfd26-p001-l50:', r6.rows);

      // 모든 활성 FMEA 목록
      const r7 = await pool.query(`SELECT "fmeaId", "linkedPfdNo", subject FROM fmea_registrations WHERE "deletedAt" IS NULL ORDER BY "fmeaId"`);
      console.log('\nAll active FMEAs:');
      r7.rows.forEach(r => console.log('  ' + r.fmeaId + ' | linkedPfd=' + (r.linkedPfdNo || 'null') + ' | ' + (r.subject || '').substring(0, 40)));
    }

    // 3. PFD items 현황
    if (pfdId) {
      const r8 = await pool.query(
        `SELECT COUNT(*) as total,
         SUM(CASE WHEN "isDeleted" = false THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN "productSC" != '' THEN 1 ELSE 0 END) as has_prodSC,
         SUM(CASE WHEN "processSC" != '' THEN 1 ELSE 0 END) as has_procSC,
         SUM(CASE WHEN "productChar" != '' THEN 1 ELSE 0 END) as has_prodChar,
         SUM(CASE WHEN "processChar" != '' THEN 1 ELSE 0 END) as has_procChar
        FROM pfd_items WHERE "pfdId" = $1 AND "isDeleted" = false`,
        [pfdId]
      );
      console.log('\n=== PFD Items ===');
      console.log(JSON.stringify(r8.rows[0]));
    }

  } catch(e) { console.error('Error:', e.message); }
  finally { pool.end(); }
})();
