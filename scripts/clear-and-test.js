const { Client } = require('pg');
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db';
const BASE = DATABASE_URL.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');

async function run() {
  const fmeaId = process.argv[2] || 'pfm26-p003-i58';
  const schema = 'pfmea_' + fmeaId.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const c = new Client({ connectionString: BASE });
  await c.connect();

  // Clear existing data
  const tables = ['failure_links','failure_causes','failure_modes','failure_effects',
                  'l3_functions','l2_functions','l1_functions','l3_structures','l2_structures'];
  for (const t of tables) {
    try {
      await c.query(`DELETE FROM "${schema}"."${t}" WHERE "fmeaId" = $1`, [fmeaId]);
    } catch(e) { /* table might not exist */ }
  }
  console.log(`Cleared ${fmeaId} data from ${schema}`);

  // Test save-from-import API
  console.log('\nCalling /api/fmea/save-from-import...');

  // Load flat items
  const ds = await c.query(`SELECT id FROM public.pfmea_master_datasets WHERE "fmeaId" = $1 AND "isActive" = true LIMIT 1`, [fmeaId]);
  if (ds.rows.length === 0) {
    console.log('No active dataset found');
    await c.end();
    return;
  }

  const items = await c.query(`SELECT id, "itemCode", "processNo", value, "parentItemId" FROM public.pfmea_master_flat_items WHERE "datasetId" = $1`, [ds.rows[0].id]);
  const flatData = items.rows.map(r => ({
    id: r.id,
    itemCode: r.itemCode,
    processNo: r.processNo || '',
    value: r.value || '',
    parentItemId: r.parentItemId || '',
    category: r.itemCode.charAt(0),
    createdAt: new Date().toISOString(),
  }));
  console.log(`Loaded ${flatData.length} flat items`);

  // Call the new API
  const PORT = process.env.PORT || 3000;
  const res = await fetch(`http://localhost:${PORT}/api/fmea/save-from-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId, flatData }),
  });
  const result = await res.json();
  console.log('\nAPI Response:', JSON.stringify(result, null, 2));

  // Verify
  console.log('\nVerifying...');
  for (const t of tables) {
    try {
      const r = await c.query(`SELECT count(*)::int as cnt FROM "${schema}"."${t}" WHERE "fmeaId" = $1`, [fmeaId]);
      if (r.rows[0].cnt > 0) console.log(`  ${t}: ${r.rows[0].cnt}`);
    } catch(e) { /* skip */ }
  }

  await c.end();
}

run().catch(e => { console.error(e); process.exit(1); });
