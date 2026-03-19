import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/fmea_db' });

async function query(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function main() {
  const fmeaId = 'pfm26-m081';
  const fcId = 'PF-L3-040-IM-002-K-002';

  // Check riskData for any key containing partial FC id
  const legRecs = await query(`SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1`, [fmeaId]);
  if (legRecs.length > 0) {
    const ld = legRecs[0].data;
    const rd = ld.riskData || {};

    // Search with shorter FC id fragments
    const fcFragments = ['040-IM-002-K-002', 'IM-002-K-002', 'K-002', 'Target'];
    for (const frag of fcFragments) {
      const matching = Object.entries(rd).filter(([k]) => k.includes(frag));
      console.log(`\nriskData keys containing "${frag}": ${matching.length}`);
      for (const [k, v] of matching.slice(0, 10)) {
        console.log(`  ${k}: ${String(v).substring(0, 80)}`);
      }
    }

    // Also check: how many total riskData keys exist?
    const riskKeys = Object.keys(rd).filter(k => k.startsWith('risk-'));
    const prevKeys = Object.keys(rd).filter(k => k.startsWith('prevention-'));
    const detKeys = Object.keys(rd).filter(k => k.startsWith('detection-'));
    console.log(`\nTotal riskData: risk-*=${riskKeys.length}, prevention-*=${prevKeys.length}, detection-*=${detKeys.length}`);

    // Check all FLs for process 040
    const schema = 'pfmea_pfm26_m081';
    await query(`SET search_path TO "${schema}", public`);
    
    const fls040 = await query(`
      SELECT fl.id, fl."fmId", fl."fcId", fl."feId",
             ra.severity, ra.occurrence, ra.detection, ra."preventionControl", ra."detectionControl"
      FROM failure_links fl
      LEFT JOIN risk_analyses ra ON ra."linkId" = fl.id
      WHERE fl."fmeaId" = $1 AND fl."fmId" LIKE '%040%'
    `, [fmeaId]);
    console.log(`\nFLs for process 040: ${fls040.length}`);
    for (const fl of fls040) {
      const hasDC = fl.detectionControl?.trim() ? 'Y' : 'N';
      const hasPC = fl.preventionControl?.trim() ? 'Y' : 'N';
      console.log(`  FL ${fl.id} → fm=${fl.fmId} fc=${fl.fcId} sev=${fl.severity} occ=${fl.occurrence} det=${fl.detection} dc=${hasDC} pc=${hasPC}`);
    }

    // Now check M066 for the same process
    const schema066 = 'pfmea_pfm26_m066';
    try {
      await query(`SET search_path TO "${schema066}", public`);
      const fls066 = await query(`
        SELECT fl.id, fl."fmId", fl."fcId",
               ra.severity, ra.occurrence, ra.detection, ra."preventionControl", ra."detectionControl"
        FROM failure_links fl
        LEFT JOIN risk_analyses ra ON ra."linkId" = fl.id
        WHERE fl."fmeaId" = 'pfm26-m066' AND fl."fmId" LIKE '%040%'
      `);
      console.log(`\nM066 FLs for process 040: ${fls066.length}`);
      for (const fl of fls066) {
        const hasDC = fl.detectionControl?.trim() ? 'Y' : 'N';
        const hasPC = fl.preventionControl?.trim() ? 'Y' : 'N';
        console.log(`  FL ${fl.id} → fm=${fl.fmId} fc=${fl.fcId} sev=${fl.severity} occ=${fl.occurrence} det=${fl.detection} dc=${hasDC} pc=${hasPC}`);
      }
    } catch (e) {
      console.log('M066 schema check failed:', e.message);
    }

    // Check the chain data for this FC
    await query(`SET search_path TO public`);
    const legM081 = await query(`SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1`, ['pfm26-m081']);
    if (legM081.length > 0) {
      const chains = legM081[0].data.failureLinks || [];
      const fc040chains = chains.filter(c => c.fcId?.includes('040'));
      console.log(`\nLegacy failureLinks for process 040: ${fc040chains.length}`);
      for (const c of fc040chains) {
        console.log(`  fm=${c.fmId} fc=${c.fcId} fe=${c.feId}`);
      }
    }
  }
}

main().catch(console.error).finally(() => pool.end());
