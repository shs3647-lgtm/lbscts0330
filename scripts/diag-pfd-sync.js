const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    // 1. 모든 PFD registrations
    const r1 = await pool.query(`
      SELECT "pfdNo", "fmeaId", "linkedPfmeaNo", "cpNo", "deletedAt", "subject",
        (SELECT COUNT(*) FROM pfd_items WHERE pfd_items."pfdId" = pfd_registrations.id AND "isDeleted" = false) as active_items,
        (SELECT COUNT(*) FROM pfd_items WHERE pfd_items."pfdId" = pfd_registrations.id AND "isDeleted" = true) as deleted_items
      FROM pfd_registrations
      ORDER BY "pfdNo"
    `);
    console.log('=== ALL PFD registrations ===');
    r1.rows.forEach(r => {
      console.log(`  ${r.pfdNo} | fmeaId=${r.fmeaId || 'null'} | linkedPfmea=${r.linkedPfmeaNo || 'null'} | cpNo=${r.cpNo || 'null'} | deletedAt=${r.deletedAt || 'null'} | active=${r.active_items} | deleted=${r.deleted_items} | subject="${r.subject || ''}"`);
    });

    // 2. PFD items 총 현황
    const r2 = await pool.query(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN "isDeleted" = false THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN "isDeleted" = true THEN 1 ELSE 0 END) as deleted
      FROM pfd_items
    `);
    console.log('\n=== PFD Items 총 현황 ===');
    console.log(`  total: ${r2.rows[0].total} | active: ${r2.rows[0].active} | deleted: ${r2.rows[0].deleted}`);

    // 3. 브라우저에서 보는 PFD 확인 — pfd26-p001-l39 상세
    const r3 = await pool.query(`
      SELECT pi."processNo", pi."processName", pi."partName", pi."equipment",
        pi."productChar", pi."processChar", pi."isDeleted", pi."sortOrder"
      FROM pfd_items pi
      JOIN pfd_registrations pr ON pi."pfdId" = pr.id
      WHERE pr."pfdNo" = 'pfd26-p001-l39' AND pi."isDeleted" = false
      ORDER BY pi."sortOrder"
      LIMIT 10
    `);
    console.log('\n=== pfd26-p001-l39 active items (first 10) ===');
    r3.rows.forEach((r, i) => {
      console.log(`  [${i}] no="${r.processNo}" name="${r.processName}" part="${r.partName}" equip="${r.equipment}" prodC="${r.productChar}" procC="${r.processChar}"`);
    });

    // 4. FMEA registration의 linkedPfdNo 확인
    const r4 = await pool.query(`
      SELECT "fmeaId", "linkedPfdNo" FROM fmea_registrations
      WHERE "fmeaId" IN ('pfm26-p001-l39', 'pfm26-p001-l50', 'pfm26-p018-l38', 'pfm26-p001-l01')
    `);
    console.log('\n=== FMEA → PFD link 상태 ===');
    r4.rows.forEach(r => console.log(`  ${r.fmeaId} → ${r.linkedPfdNo || 'null'}`));

    // 5. DocumentLink 확인
    const r5 = await pool.query(`
      SELECT "sourceType", "sourceId", "targetType", "targetId", "lastSyncAt"
      FROM document_links
      WHERE ("sourceType" = 'pfd' AND "targetType" = 'fmea')
         OR ("sourceType" = 'fmea' AND "targetType" = 'pfd')
    `);
    console.log('\n=== PFD↔FMEA DocumentLinks ===');
    r5.rows.forEach(r => console.log(`  ${r.sourceType}(${r.sourceId}) → ${r.targetType}(${r.targetId}) | syncAt=${r.lastSyncAt}`));

    // 6. 현재 브라우저에서 열린 PFD가 어디를 가리키는지
    const r6 = await pool.query(`
      SELECT pr.id, pr."pfdNo", pr."fmeaId", pr."deletedAt",
        COUNT(pi.id) FILTER (WHERE pi."isDeleted" = false) as active
      FROM pfd_registrations pr
      LEFT JOIN pfd_items pi ON pi."pfdId" = pr.id
      WHERE pr."pfdNo" LIKE 'pfd26-p001%'
      GROUP BY pr.id, pr."pfdNo", pr."fmeaId", pr."deletedAt"
      ORDER BY pr."pfdNo"
    `);
    console.log('\n=== pfd26-p001* PFDs ===');
    r6.rows.forEach(r => console.log(`  ${r.pfdNo} | id=${r.id} | fmeaId=${r.fmeaId || 'null'} | deletedAt=${r.deletedAt || 'null'} | active=${r.active}`));

  } catch(e) { console.error('Error:', e.message); }
  finally { pool.end(); }
})();
