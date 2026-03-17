/**
 * Diagnostic script: Check FC (FailureCause) data in DB
 * - Reads FmeaLegacyData JSON
 * - Counts FCs per process in legacy
 * - Checks processCharId presence
 * - Counts atomic FailureCause records
 */
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres:1234@localhost:5432/fmea_db';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Find all FMEA projects
    const projectsRes = await client.query(`
      SELECT id, "fmeaId", "fmeaType", status
      FROM public.fmea_projects
      ORDER BY "createdAt" DESC
    `);

    console.log('=== FMEA Projects ===');
    console.log(`Found ${projectsRes.rows.length} project(s)`);
    projectsRes.rows.forEach(p => {
      console.log(`  - id: ${p.id} | fmeaId: ${p.fmeaId} | type: ${p.fmeaType} | status: ${p.status}`);
    });
    console.log('');

    for (const project of projectsRes.rows) {
      const fmeaId = project.fmeaId;
      const schemaName = `pfmea_${fmeaId.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;

      console.log(`\n${'='.repeat(70)}`);
      console.log(`PROJECT: ${fmeaId} (id: ${project.id})`);
      console.log(`SCHEMA:  ${schemaName}`);
      console.log(`${'='.repeat(70)}`);

      // Check if schema exists
      const schemaExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.schemata
          WHERE schema_name = $1
        )
      `, [schemaName]);

      if (!schemaExists.rows[0].exists) {
        console.log(`  ⚠ Schema "${schemaName}" does not exist, skipping.`);
        continue;
      }

      // 2. Read FmeaLegacyData
      const legacyRes = await client.query(`
        SELECT data, version FROM "${schemaName}".fmea_legacy_data
        WHERE "fmeaId" = $1
      `, [fmeaId]);

      if (legacyRes.rows.length === 0) {
        console.log('  ⚠ No FmeaLegacyData found');
      } else {
        const legacyData = legacyRes.rows[0].data;
        console.log(`  Legacy version: ${legacyRes.rows[0].version}`);

        const l2Procs = legacyData.l2 || [];
        console.log(`\n  --- Legacy JSON Analysis ---`);
        console.log(`  Total L2 processes: ${l2Procs.length}`);

        let totalLegacyFCs = 0;
        let totalLegacyFCsWithProcessCharId = 0;
        let totalL3LevelFCs = 0;
        let totalL3LevelFCsWithProcessCharId = 0;
        let totalFMs = 0;
        let totalFMsWithProductCharId = 0;

        console.log(`\n  Per-process breakdown:`);
        console.log(`  ${'Process'.padEnd(40)} | FCs(proc) | FCs(l3) | FMs | ProductChars`);
        console.log(`  ${'-'.repeat(40)}-+-----------+---------+-----+-------------`);

        for (const proc of l2Procs) {
          const procName = (proc.name || proc.m2 || '(unnamed)').substring(0, 38);
          const procFCs = Array.isArray(proc.failureCauses) ? proc.failureCauses : [];
          const procFMs = Array.isArray(proc.failureModes) ? proc.failureModes : [];
          const procPCs = Array.isArray(proc.productChars) ? proc.productChars : [];

          totalLegacyFCs += procFCs.length;
          totalLegacyFCsWithProcessCharId += procFCs.filter(fc => fc.processCharId).length;
          totalFMs += procFMs.length;
          totalFMsWithProductCharId += procFMs.filter(fm => fm.productCharId).length;

          // Count FCs at L3 level
          const l3s = Array.isArray(proc.l3) ? proc.l3 : [];
          let l3FCs = 0;
          let l3FCsWithPCId = 0;
          for (const l3 of l3s) {
            const l3FailureCauses = Array.isArray(l3.failureCauses) ? l3.failureCauses : [];
            l3FCs += l3FailureCauses.length;
            l3FCsWithPCId += l3FailureCauses.filter(fc => fc.processCharId).length;
          }
          totalL3LevelFCs += l3FCs;
          totalL3LevelFCsWithProcessCharId += l3FCsWithPCId;

          console.log(`  ${procName.padEnd(40)} | ${String(procFCs.length).padStart(9)} | ${String(l3FCs).padStart(7)} | ${String(procFMs.length).padStart(3)} | ${procPCs.length}`);
        }

        console.log(`  ${'-'.repeat(40)}-+-----------+---------+-----+-------------`);
        console.log(`  ${'TOTAL'.padEnd(40)} | ${String(totalLegacyFCs).padStart(9)} | ${String(totalL3LevelFCs).padStart(7)} | ${String(totalFMs).padStart(3)} | `);

        console.log(`\n  FCs with processCharId (proc-level): ${totalLegacyFCsWithProcessCharId} / ${totalLegacyFCs}`);
        console.log(`  FCs with processCharId (l3-level):   ${totalL3LevelFCsWithProcessCharId} / ${totalL3LevelFCs}`);
        console.log(`  FMs with productCharId:              ${totalFMsWithProductCharId} / ${totalFMs}`);

        // Show sample FC data
        if (totalLegacyFCs > 0 || totalL3LevelFCs > 0) {
          console.log(`\n  Sample FCs (first 5 from proc-level):`);
          let shown = 0;
          for (const proc of l2Procs) {
            const procFCs = Array.isArray(proc.failureCauses) ? proc.failureCauses : [];
            for (const fc of procFCs) {
              if (shown >= 5) break;
              console.log(`    - id: ${fc.id}, name: "${(fc.name || '').substring(0, 50)}", processCharId: ${fc.processCharId || 'null'}, occurrence: ${fc.occurrence}`);
              shown++;
            }
            if (shown >= 5) break;
          }
        }

        // FailureLinks in legacy
        const legacyLinks = Array.isArray(legacyData.failureLinks) ? legacyData.failureLinks : [];
        console.log(`\n  Legacy failureLinks count: ${legacyLinks.length}`);
        if (legacyLinks.length > 0) {
          console.log(`  Sample links (first 3):`);
          legacyLinks.slice(0, 3).forEach(lk => {
            console.log(`    - fmId: ${lk.fmId}, feId: ${lk.feId}, fcId: ${lk.fcId}`);
          });
        }

        // L1 failure effects
        const feScopes = legacyData.l1?.failureScopes || [];
        console.log(`\n  L1 FailureEffects (failureScopes): ${feScopes.length}`);
      }

      // 3. Check Atomic DB tables
      console.log(`\n  --- Atomic DB Tables ---`);

      const tables = [
        { name: 'l1_structures', label: 'L1Structure' },
        { name: 'l2_structures', label: 'L2Structure' },
        { name: 'l3_structures', label: 'L3Structure' },
        { name: 'l1_functions', label: 'L1Function' },
        { name: 'l2_functions', label: 'L2Function' },
        { name: 'l3_functions', label: 'L3Function' },
        { name: 'failure_effects', label: 'FailureEffect' },
        { name: 'failure_modes', label: 'FailureMode' },
        { name: 'failure_causes', label: 'FailureCause' },
        { name: 'failure_links', label: 'FailureLink' },
        { name: 'failure_analyses', label: 'FailureAnalysis' },
        { name: 'risk_analyses', label: 'RiskAnalysis' },
        { name: 'optimizations', label: 'Optimization' },
        { name: 'process_product_chars', label: 'ProcessProductChar' },
      ];

      for (const t of tables) {
        try {
          const res = await client.query(`SELECT COUNT(*) as cnt FROM "${schemaName}"."${t.name}"`);
          const cnt = parseInt(res.rows[0].cnt, 10);
          const marker = cnt === 0 ? ' ⚠ EMPTY' : '';
          console.log(`  ${t.label.padEnd(25)} : ${String(cnt).padStart(6)} rows${marker}`);
        } catch (e) {
          console.log(`  ${t.label.padEnd(25)} : ERROR (table may not exist)`);
        }
      }

      // 4. Detailed FailureCause analysis in atomic table
      try {
        const fcRes = await client.query(`
          SELECT fc.id, fc.cause, fc."processCharId", fc."l3StructId", fc."l3FuncId"
          FROM "${schemaName}".failure_causes fc
          ORDER BY fc."createdAt"
          LIMIT 10
        `);

        if (fcRes.rows.length > 0) {
          console.log(`\n  Sample Atomic FailureCauses (first ${fcRes.rows.length}):`);
          fcRes.rows.forEach(fc => {
            console.log(`    - id: ${fc.id.substring(0, 20)}..., cause: "${(fc.cause || '').substring(0, 40)}", processCharId: ${fc.processCharId || 'null'}`);
          });

          // Count FCs with/without processCharId
          const fcPcRes = await client.query(`
            SELECT
              COUNT(*) as total,
              COUNT("processCharId") as with_pc,
              COUNT(*) - COUNT("processCharId") as without_pc
            FROM "${schemaName}".failure_causes
          `);
          const r = fcPcRes.rows[0];
          console.log(`\n  Atomic FC processCharId stats: total=${r.total}, with=${r.with_pc}, without=${r.without_pc}`);
        }
      } catch (e) {
        console.log(`  Could not query failure_causes: ${e.message}`);
      }

      // 5. Check FailureLink → FailureCause FK validity
      try {
        const linkFcCheck = await client.query(`
          SELECT
            COUNT(*) as total_links,
            COUNT(CASE WHEN fc.id IS NOT NULL THEN 1 END) as valid_fc_refs,
            COUNT(CASE WHEN fc.id IS NULL THEN 1 END) as broken_fc_refs
          FROM "${schemaName}".failure_links fl
          LEFT JOIN "${schemaName}".failure_causes fc ON fl."fcId" = fc.id
        `);
        const lkr = linkFcCheck.rows[0];
        console.log(`\n  FailureLink → FailureCause FK check:`);
        console.log(`    Total links: ${lkr.total_links}, Valid FC refs: ${lkr.valid_fc_refs}, Broken FC refs: ${lkr.broken_fc_refs}`);
      } catch (e) {
        console.log(`  Could not check FailureLink FK: ${e.message}`);
      }

      // 6. Check FailureLink → FailureMode and FailureEffect FK validity
      try {
        const linkFmFeCheck = await client.query(`
          SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN fm.id IS NOT NULL THEN 1 END) as valid_fm,
            COUNT(CASE WHEN fm.id IS NULL THEN 1 END) as broken_fm,
            COUNT(CASE WHEN fe.id IS NOT NULL THEN 1 END) as valid_fe,
            COUNT(CASE WHEN fe.id IS NULL THEN 1 END) as broken_fe
          FROM "${schemaName}".failure_links fl
          LEFT JOIN "${schemaName}".failure_modes fm ON fl."fmId" = fm.id
          LEFT JOIN "${schemaName}".failure_effects fe ON fl."feId" = fe.id
        `);
        const r2 = linkFmFeCheck.rows[0];
        console.log(`  FailureLink → FM FK: valid=${r2.valid_fm}, broken=${r2.broken_fm}`);
        console.log(`  FailureLink → FE FK: valid=${r2.valid_fe}, broken=${r2.broken_fe}`);
      } catch (e) {
        console.log(`  Could not check FM/FE FK: ${e.message}`);
      }
    }

  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
