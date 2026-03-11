#!/usr/bin/env node
/**
 * Diagnose DB save state for Import pipeline
 */
const { Client } = require('pg');
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db';
const BASE = DATABASE_URL.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');

async function run() {
  const c = new Client({ connectionString: BASE });
  await c.connect();

  // 1. Recent datasets
  const ds = await c.query(`SELECT id, "fmeaId", "isActive", "updatedAt" FROM public.pfmea_master_datasets ORDER BY "updatedAt" DESC LIMIT 5`);
  console.log('=== Recent PfmeaMasterDatasets ===');
  ds.rows.forEach(r => console.log(`  ${r.fmeaId} | active: ${r.isActive} | updated: ${r.updatedAt}`));

  // 2. For the latest active dataset, check flat items
  const latest = ds.rows.find(r => r.isActive);
  if (!latest) {
    console.log('No active dataset found!');
    await c.end();
    return;
  }

  const fmeaId = latest.fmeaId;
  console.log(`\n=== Latest active: ${fmeaId} (id: ${latest.id}) ===`);

  const items = await c.query(`SELECT "itemCode", count(*)::int as cnt FROM public.pfmea_master_flat_items WHERE "datasetId" = $1 GROUP BY "itemCode" ORDER BY "itemCode"`, [latest.id]);
  console.log('Import flat items:');
  items.rows.forEach(r => console.log(`  ${r.itemCode}: ${r.cnt}`));

  // 3. Check project schema
  const schema = 'pfmea_' + fmeaId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  console.log(`\nExpected schema: ${schema}`);

  // Check if schema exists
  const schemaExists = await c.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)`, [schema]);
  console.log(`Schema exists: ${schemaExists.rows[0].exists}`);

  const tables = ['l2_structures', 'l3_structures', 'l1_functions', 'l2_functions', 'l3_functions',
                  'failure_effects', 'failure_modes', 'failure_causes', 'failure_links'];

  console.log(`\nProject schema (${schema}) counts:`);
  for (const t of tables) {
    try {
      const r = await c.query(`SELECT count(*)::int as cnt FROM "${schema}"."${t}" WHERE "fmeaId" = $1`, [fmeaId]);
      console.log(`  ${t}: ${r.rows[0].cnt}`);
    } catch(e) {
      console.log(`  ${t}: ERROR - ${e.message.substring(0, 80)}`);
    }
  }

  // 4. Also check with different fmeaId cases
  console.log(`\nProject schema ALL records (any fmeaId):`);
  for (const t of tables) {
    try {
      const r = await c.query(`SELECT "fmeaId", count(*)::int as cnt FROM "${schema}"."${t}" GROUP BY "fmeaId"`);
      if (r.rows.length > 0) {
        r.rows.forEach(row => console.log(`  ${t}: fmeaId="${row.fmeaId}" count=${row.cnt}`));
      } else {
        console.log(`  ${t}: EMPTY`);
      }
    } catch(e) {
      console.log(`  ${t}: ERROR - ${e.message.substring(0, 80)}`);
    }
  }

  // 5. Check public schema
  console.log(`\nPublic schema counts for fmeaId=${fmeaId}:`);
  for (const t of tables) {
    try {
      const r = await c.query(`SELECT count(*)::int as cnt FROM public."${t}" WHERE "fmeaId" = $1`, [fmeaId]);
      if (r.rows[0].cnt > 0) console.log(`  ${t}: ${r.rows[0].cnt}`);
    } catch(e) { /* skip */ }
  }

  await c.end();
  console.log('\nDone.');
}

run().catch(e => { console.error(e.message); process.exit(1); });
