#!/usr/bin/env node
/**
 * @file migrate-public-to-project-schema.js
 * @description Public schema → Project schema 데이터 마이그레이션
 *
 * getPrismaForSchema() 수정 후, 기존에 public schema에 저장된
 * FMEA 원자성 데이터를 각 프로젝트의 project schema로 이동합니다.
 *
 * Usage:
 *   node scripts/migrate-public-to-project-schema.js
 *   node scripts/migrate-public-to-project-schema.js --fmeaId=pfm26-p003-i58
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db';
const BASE_URL = DATABASE_URL.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');

const ATOMIC_TABLES = [
  'l1_structures',
  'l2_structures',
  'l3_structures',
  'l1_functions',
  'l2_functions',
  'l3_functions',
  'failure_effects',
  'failure_modes',
  'failure_causes',
  'failure_links',
  'failure_analyses',
  'risk_analyses',
  'optimizations',
  'fmea_legacy_data',
  'fmea_confirmed_states',
];

function getProjectSchemaName(fmeaId) {
  return 'pfmea_' + fmeaId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

async function migrate() {
  const client = new Client({ connectionString: BASE_URL });
  await client.connect();

  // Parse CLI args
  const targetFmeaId = process.argv.find(a => a.startsWith('--fmeaId='))?.split('=')[1];

  // Find all fmeaIds with data in public schema
  let fmeaIds;
  if (targetFmeaId) {
    fmeaIds = [targetFmeaId.toLowerCase()];
  } else {
    const result = await client.query(`
      SELECT DISTINCT "fmeaId" FROM public.l2_structures
      WHERE "fmeaId" IS NOT NULL
    `);
    fmeaIds = result.rows.map(r => r.fmeaId);
  }

  console.log(`Found ${fmeaIds.length} FMEA project(s) to migrate\n`);

  for (const fmeaId of fmeaIds) {
    const schema = getProjectSchemaName(fmeaId);
    console.log(`=== ${fmeaId} → ${schema} ===`);

    // Ensure schema exists
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    // Ensure tables exist
    for (const table of ATOMIC_TABLES) {
      const pubExists = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        [table]
      );
      if (!pubExists.rows[0].exists) continue;

      await client.query(
        `CREATE TABLE IF NOT EXISTS "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`
      );
    }

    // Migrate each table
    let totalMigrated = 0;
    for (const table of ATOMIC_TABLES) {
      try {
        // Check counts
        const pubCount = await client.query(
          `SELECT count(*)::int as cnt FROM public."${table}" WHERE "fmeaId" = $1`, [fmeaId]
        );
        const projCount = await client.query(
          `SELECT count(*)::int as cnt FROM "${schema}"."${table}" WHERE "fmeaId" = $1`, [fmeaId]
        );

        const pub = pubCount.rows[0].cnt;
        const proj = projCount.rows[0].cnt;

        if (pub > 0 && proj === 0) {
          // Get column list
          const cols = await client.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
            [table]
          );
          const colList = cols.rows.map(c => `"${c.column_name}"`).join(', ');

          await client.query(
            `INSERT INTO "${schema}"."${table}" (${colList}) SELECT ${colList} FROM public."${table}" WHERE "fmeaId" = $1 ON CONFLICT DO NOTHING`,
            [fmeaId]
          );

          const newCount = await client.query(
            `SELECT count(*)::int as cnt FROM "${schema}"."${table}" WHERE "fmeaId" = $1`, [fmeaId]
          );
          console.log(`  ✅ ${table}: ${pub} → ${newCount.rows[0].cnt}`);
          totalMigrated += newCount.rows[0].cnt;
        } else if (proj > 0) {
          console.log(`  ⏭️  ${table}: already has ${proj} records`);
        } else if (pub === 0) {
          // skip empty tables silently
        }
      } catch (e) {
        console.log(`  ⚠️  ${table}: ${e.message.substring(0, 80)}`);
      }
    }
    console.log(`  Total migrated: ${totalMigrated} records\n`);
  }

  await client.end();
  console.log('Migration complete.');
}

migrate().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
