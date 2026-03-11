#!/usr/bin/env node
/**
 * Diagnose Import→DB save pipeline
 * Simulates what saveWorksheetFromImport does, step by step
 */
const { Client } = require('pg');
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db';
const BASE = DATABASE_URL.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');

async function run() {
  const c = new Client({ connectionString: BASE });
  await c.connect();

  // 1. Get latest active dataset
  const ds = await c.query(`SELECT id, "fmeaId", "isActive" FROM public.pfmea_master_datasets WHERE "isActive" = true ORDER BY "updatedAt" DESC LIMIT 1`);
  if (ds.rows.length === 0) {
    console.log('No active dataset found!');
    await c.end();
    return;
  }

  const fmeaId = ds.rows[0].fmeaId;
  const datasetId = ds.rows[0].id;
  console.log(`Testing with fmeaId: ${fmeaId} (dataset: ${datasetId})`);

  // 2. Get flat items
  const items = await c.query(`SELECT "itemCode", "processNo", "value", "parentItemId", "id" FROM public.pfmea_master_flat_items WHERE "datasetId" = $1 ORDER BY "processNo", "itemCode" LIMIT 10`, [datasetId]);
  console.log(`\nSample flat items (first 10):`);
  items.rows.forEach(r => console.log(`  ${r.itemCode} [${r.processNo}] = "${(r.value || '').substring(0, 40)}"`));

  // 3. Simulate calling the API
  const PORT = process.env.PORT || 3000;
  const BASE_URL = `http://localhost:${PORT}`;

  console.log(`\n--- Testing POST /api/fmea (via ${BASE_URL}) ---`);

  // First, call verify-counts to see current state
  try {
    const vcRes = await fetch(`${BASE_URL}/api/fmea/verify-counts?fmeaId=${encodeURIComponent(fmeaId)}`);
    const vcJson = await vcRes.json();
    console.log(`\nVerify-counts BEFORE save:`);
    if (vcJson.success) {
      console.log('  Import:', JSON.stringify(vcJson.import));
      console.log('  DB:', JSON.stringify(vcJson.db));
    } else {
      console.log('  ERROR:', vcJson.error);
    }
  } catch (e) {
    console.log(`  verify-counts failed: ${e.message}`);
    console.log('  (Is the dev server running?)');
  }

  // 4. Get ALL flat items and construct flatData format
  const allItems = await c.query(`SELECT "itemCode", "processNo", "value", "parentItemId", "id", "m4Value" FROM public.pfmea_master_flat_items WHERE "datasetId" = $1`, [datasetId]);
  console.log(`\nTotal flat items: ${allItems.rows.length}`);

  // Group by itemCode
  const grouped = {};
  allItems.rows.forEach(r => {
    if (!grouped[r.itemCode]) grouped[r.itemCode] = 0;
    grouped[r.itemCode]++;
  });
  console.log('Items by code:', JSON.stringify(grouped));

  // 5. Try direct API POST with minimal data to test the pipeline
  const schema = 'pfmea_' + fmeaId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  console.log(`\nProject schema: ${schema}`);

  // Check if data exists after manual test
  try {
    const l2Count = await c.query(`SELECT count(*)::int as cnt FROM "${schema}".l2_structures WHERE "fmeaId" = $1`, [fmeaId]);
    console.log(`Current project L2 count: ${l2Count.rows[0].cnt}`);
  } catch(e) {
    console.log(`Project L2 query error: ${e.message.substring(0, 80)}`);
  }

  // 6. Check chains
  const chainsRes = await c.query(`SELECT "failureChains" FROM public.pfmea_master_datasets WHERE id = $1`, [datasetId]);
  const chains = chainsRes.rows[0]?.failureChains;
  console.log(`\nFailure chains: ${Array.isArray(chains) ? chains.length : 'null'}`);

  await c.end();
  console.log('\n--- Pipeline test complete ---');
}

run().catch(e => { console.error(e.message); process.exit(1); });
