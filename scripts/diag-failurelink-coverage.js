/**
 * FailureLink 커버리지 진단
 * atomic DB vs legacyData ID 교차 확인
 */
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public',
});

async function run() {
  const c = await pool.connect();
  try {
    // 1. 프로젝트별 unique fmId 분포
    const r1 = await c.query(`
      SELECT fl."fmeaId",
        COUNT(*) as total_links,
        COUNT(DISTINCT fl."fmId") as unique_fm,
        COUNT(DISTINCT fl."feId") as unique_fe,
        COUNT(DISTINCT fl."fcId") as unique_fc,
        (SELECT COUNT(*) FROM failure_modes fm WHERE fm."fmeaId" = fl."fmeaId") as total_fm,
        (SELECT COUNT(*) FROM failure_effects fe WHERE fe."fmeaId" = fl."fmeaId") as total_fe,
        (SELECT COUNT(*) FROM failure_causes fc WHERE fc."fmeaId" = fl."fmeaId") as total_fc
      FROM failure_links fl
      GROUP BY fl."fmeaId"
    `);
    console.log('=== FailureLink 분포 ===');
    r1.rows.forEach(r => {
      const fmCov = ((r.unique_fm / r.total_fm) * 100).toFixed(0);
      const fcCov = ((r.unique_fc / r.total_fc) * 100).toFixed(0);
      console.log(`  ${r.fmeaId}: links=${r.total_links} | FM ${r.unique_fm}/${r.total_fm}(${fmCov}%) | FE ${r.unique_fe}/${r.total_fe} | FC ${r.unique_fc}/${r.total_fc}(${fcCov}%)`);
    });

    // 2. p010의 FM 중 링크 없는 FM 샘플
    const r2 = await c.query(`
      SELECT fm.id, fm.name, l2.no as "processNo", l2.name as "processName"
      FROM failure_modes fm
      JOIN l2_structures l2 ON fm."l2StructId" = l2.id
      WHERE fm."fmeaId" = 'pfm26-p010-l11'
      AND fm.id NOT IN (SELECT "fmId" FROM failure_links WHERE "fmeaId" = 'pfm26-p010-l11')
      ORDER BY l2.no, fm.name
      LIMIT 15
    `);
    console.log(`\n=== p010: 링크 없는 FM (${r2.rows.length}건 중 15건) ===`);
    r2.rows.forEach(r => console.log(`  [${r.processNo}] ${r.name}`));

    // 3. p010의 링크 있는 FM 샘플
    const r3 = await c.query(`
      SELECT fm.id, fm.name, l2.no as "processNo", COUNT(fl.id) as link_count
      FROM failure_modes fm
      JOIN l2_structures l2 ON fm."l2StructId" = l2.id
      JOIN failure_links fl ON fl."fmId" = fm.id AND fl."fmeaId" = fm."fmeaId"
      WHERE fm."fmeaId" = 'pfm26-p010-l11'
      GROUP BY fm.id, fm.name, l2.no
      ORDER BY l2.no, fm.name
      LIMIT 10
    `);
    console.log(`\n=== p010: 링크 있는 FM (상위 10건) ===`);
    r3.rows.forEach(r => console.log(`  [${r.processNo}] ${r.name} -> ${r.link_count}개 링크`));

    // 4. atomic FM ID vs legacyData FM ID 교차 확인
    const r4 = await c.query(`SELECT data FROM fmea_legacy_data WHERE "fmeaId" = 'pfm26-p010-l11'`);
    if (r4.rows.length > 0) {
      const data = r4.rows[0].data;
      const legacyFmIds = new Set();
      const legacyFcIds = new Set();
      const legacyFeIds = new Set();

      (data.l2 || []).forEach(p => {
        (p.failureModes || []).forEach(fm => legacyFmIds.add(fm.id));
        (p.failureCauses || []).forEach(fc => legacyFcIds.add(fc.id));
        (p.l3 || []).forEach(we => {
          (we.failureCauses || []).forEach(fc => legacyFcIds.add(fc.id));
        });
      });
      if (data.l1 && data.l1.failureScopes) {
        data.l1.failureScopes.forEach(fe => legacyFeIds.add(fe.id));
      }

      const legacyLinks = data.failureLinks || [];
      const legacyLinkFmIds = new Set(legacyLinks.map(l => l.fmId));

      const atomicFmRes = await c.query(`SELECT id FROM failure_modes WHERE "fmeaId" = 'pfm26-p010-l11'`);
      const atomicFmIds = new Set(atomicFmRes.rows.map(r => r.id));

      const atomicFcRes = await c.query(`SELECT id FROM failure_causes WHERE "fmeaId" = 'pfm26-p010-l11'`);
      const atomicFcIds = new Set(atomicFcRes.rows.map(r => r.id));

      const atomicFeRes = await c.query(`SELECT id FROM failure_effects WHERE "fmeaId" = 'pfm26-p010-l11'`);
      const atomicFeIds = new Set(atomicFeRes.rows.map(r => r.id));

      let fmOverlap = 0;
      legacyFmIds.forEach(id => { if (atomicFmIds.has(id)) fmOverlap++; });
      let fcOverlap = 0;
      legacyFcIds.forEach(id => { if (atomicFcIds.has(id)) fcOverlap++; });
      let feOverlap = 0;
      legacyFeIds.forEach(id => { if (atomicFeIds.has(id)) feOverlap++; });

      console.log(`\n=== ID 교차 확인 (p010) ===`);
      console.log(`  legacy FM: ${legacyFmIds.size} | atomic FM: ${atomicFmIds.size} | 교차: ${fmOverlap}`);
      console.log(`  legacy FC: ${legacyFcIds.size} | atomic FC: ${atomicFcIds.size} | 교차: ${fcOverlap}`);
      console.log(`  legacy FE: ${legacyFeIds.size} | atomic FE: ${atomicFeIds.size} | 교차: ${feOverlap}`);
      console.log(`  legacy link 고유 fmId: ${legacyLinkFmIds.size}`);

      // atomic link의 fmId와 legacy FM의 교차
      const atomicLinkRes = await c.query(`SELECT DISTINCT "fmId" FROM failure_links WHERE "fmeaId" = 'pfm26-p010-l11'`);
      const atomicLinkFmIds = new Set(atomicLinkRes.rows.map(r => r.fmId));
      let atomicLinkInLegacyFm = 0;
      atomicLinkFmIds.forEach(id => { if (legacyFmIds.has(id)) atomicLinkInLegacyFm++; });
      console.log(`  atomic link 고유 fmId: ${atomicLinkFmIds.size} | legacy FM과 교차: ${atomicLinkInLegacyFm}`);

      // 5. legacyData가 현재 어디서 로드되는지 확인
      // legacy FM ID 샘플 vs atomic FM ID 샘플
      const legFmSample = [...legacyFmIds].slice(0, 3);
      const atomFmSample = [...atomicFmIds].slice(0, 3);
      console.log(`\n  legacy FM ID 샘플: ${legFmSample.join(', ')}`);
      console.log(`  atomic FM ID 샘플: ${atomFmSample.join(', ')}`);

      // legacy link fmId 샘플
      const legLinkFmSample = [...legacyLinkFmIds].slice(0, 3);
      console.log(`  legacy link fmId 샘플: ${legLinkFmSample.join(', ')}`);

      // atomic link fmId 샘플
      const atomLinkFmSample = [...atomicLinkFmIds].slice(0, 3);
      console.log(`  atomic link fmId 샘플: ${atomLinkFmSample.join(', ')}`);
    }

    console.log('\n=== 진단 완료 ===');
  } finally {
    c.release();
    await pool.end();
  }
}
run().catch(err => console.error(err));
