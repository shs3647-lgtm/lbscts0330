import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/fmea_db' });

async function query(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function main() {
  const fmeaId = process.argv[2] || 'pfm26-m081';
  const schema = 'pfmea_' + fmeaId.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  console.log('fmeaId:', fmeaId, '→ schema:', schema);

  // Set search_path to the project schema
  await query(`SET search_path TO "${schema}", public`);

  // Check table counts
  const counts = await query(`
    SELECT 'risk_analyses' as t, count(*) as c FROM risk_analyses
    UNION ALL SELECT 'failure_links', count(*) FROM failure_links
    UNION ALL SELECT 'failure_modes', count(*) FROM failure_modes
    UNION ALL SELECT 'failure_causes', count(*) FROM failure_causes
    UNION ALL SELECT 'failure_effects', count(*) FROM failure_effects
    UNION ALL SELECT 'l2_structures', count(*) FROM l2_structures
    UNION ALL SELECT 'l3_structures', count(*) FROM l3_structures
    UNION ALL SELECT 'l3_functions', count(*) FROM l3_functions
  `);
  console.log('\nTable counts:');
  for (const row of counts) console.log(`  ${row.t}: ${row.c}`);

  // Find RAs with empty DC/PC/SOD
  const ras = await query(`
    SELECT ra.id, ra."linkId", ra.severity, ra.occurrence, ra.detection,
           ra."preventionControl", ra."detectionControl",
           fl."fmId", fl."fcId", fl."feId"
    FROM risk_analyses ra
    JOIN failure_links fl ON fl.id = ra."linkId"
    WHERE ra."fmeaId" = $1
  `, [fmeaId]);
  console.log('\nTotal RAs:', ras.length);

  const empty = ras.filter(r =>
    !r.detectionControl?.trim() ||
    !r.preventionControl?.trim() ||
    r.severity <= 0 ||
    r.occurrence <= 0 ||
    r.detection <= 0
  );
  console.log('Empty RAs:', empty.length);

  for (const ra of empty) {
    console.log(JSON.stringify({
      id: ra.id,
      linkId: ra.linkId,
      sev: ra.severity,
      occ: ra.occurrence,
      det: ra.detection,
      dc: ra.detectionControl,
      pc: ra.preventionControl,
      fmId: ra.fmId,
      fcId: ra.fcId,
      feId: ra.feId,
    }, null, 2));
  }

  if (empty.length > 0) {
    const fcIds = [...new Set(empty.map(r => r.fcId).filter(Boolean))];
    if (fcIds.length > 0) {
      const fcs = await query(`SELECT id, cause FROM failure_causes WHERE id = ANY($1)`, [fcIds]);
      console.log('\nFC names:');
      for (const fc of fcs) console.log(`  ${fc.id}: ${fc.cause}`);
    }
    const fmIds = [...new Set(empty.map(r => r.fmId).filter(Boolean))];
    if (fmIds.length > 0) {
      const fms = await query(`SELECT id, mode FROM failure_modes WHERE id = ANY($1)`, [fmIds]);
      console.log('FM names:');
      for (const fm of fms) console.log(`  ${fm.id}: ${fm.mode}`);
    }
    const feIds = [...new Set(empty.map(r => r.feId).filter(Boolean))];
    if (feIds.length > 0) {
      const fes = await query(`SELECT id, effect, severity FROM failure_effects WHERE id = ANY($1)`, [feIds]);
      console.log('FE:');
      for (const fe of fes) console.log(`  ${fe.id}: ${fe.effect} (sev=${fe.severity})`);
    }

    // Sibling FLs for same fcId
    const fcId = empty[0].fcId;
    if (fcId) {
      const siblingFLs = await query(`SELECT id, "fmId", "fcId", "feId" FROM failure_links WHERE "fmeaId" = $1 AND "fcId" = $2`, [fmeaId, fcId]);
      console.log('\nSibling FLs for same fcId:', siblingFLs.length);
      for (const sfl of siblingFLs) {
        const sras = await query(`SELECT id, severity, occurrence, detection, "preventionControl", "detectionControl" FROM risk_analyses WHERE "linkId" = $1 LIMIT 1`, [sfl.id]);
        const sra = sras[0];
        const dcShort = sra?.detectionControl ? sra.detectionControl.substring(0, 50) : 'NULL';
        const pcShort = sra?.preventionControl ? sra.preventionControl.substring(0, 50) : 'NULL';
        console.log(`  FL ${sfl.id} fmId=${sfl.fmId} feId=${sfl.feId}`);
        console.log(`    -> RA ${sra?.id}: sev=${sra?.severity} occ=${sra?.occurrence} det=${sra?.detection}`);
        console.log(`       dc=${dcShort}`);
        console.log(`       pc=${pcShort}`);
      }
    }

    // Check riskData in legacy
    await query(`SET search_path TO public`);
    const legRecs = await query(`SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1`, [fmeaId]);
    if (legRecs.length > 0) {
      const ld = legRecs[0].data;
      const rd = ld.riskData || {};
      for (const ra of empty) {
        const uk = `${ra.fmId}-${ra.fcId}`;
        console.log(`\nriskData keys for ${uk}:`);
        console.log(`  risk-${uk}-S:`, rd[`risk-${uk}-S`]);
        console.log(`  risk-${uk}-O:`, rd[`risk-${uk}-O`]);
        console.log(`  risk-${uk}-D:`, rd[`risk-${uk}-D`]);
        console.log(`  prevention-${uk}:`, rd[`prevention-${uk}`]);
        console.log(`  detection-${uk}:`, rd[`detection-${uk}`]);
      }

      // Search for any riskData key containing this fcId
      const fcId2 = empty[0].fcId;
      if (fcId2) {
        const matching = Object.entries(rd).filter(([k]) => k.includes(fcId2));
        console.log(`\nAll riskData keys containing fcId ${fcId2}:`, matching.length);
        for (const [k, v] of matching.slice(0, 20)) {
          console.log(`  ${k}: ${String(v).substring(0, 60)}`);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => pool.end());
