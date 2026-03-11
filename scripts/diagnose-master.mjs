/**
 * Diagnose: call save-from-import and check the full result
 */
const PORT = process.env.PORT || 3000;
const fmeaId = process.argv[2] || 'pfm26-f001-l68-r03';

const { Client } = (await import('pg')).default || await import('pg');
const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();

// Load flat items
const ds = await c.query(`SELECT id FROM public.pfmea_master_datasets WHERE "fmeaId" = $1 AND "isActive" = true LIMIT 1`, [fmeaId]);
if (ds.rows.length === 0) {
  console.log('No active dataset found for', fmeaId);
  await c.end();
  process.exit(1);
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
console.log(`Loaded ${flatData.length} flat items for ${fmeaId}`);

// Load failure chains
const chains = await c.query(`SELECT "failureChains" FROM public.pfmea_master_datasets WHERE id = $1`, [ds.rows[0].id]);
const failureChains = chains.rows[0]?.failureChains || [];
console.log(`Failure chains: ${Array.isArray(failureChains) ? failureChains.length : 0}`);

// Call save-from-import
console.log('\n--- Calling POST /api/fmea/save-from-import ---');
const res = await fetch(`http://localhost:${PORT}/api/fmea/save-from-import`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fmeaId, flatData, l1Name: '', failureChains }),
});

const result = await res.json();
console.log('HTTP status:', res.status);
console.log('Response:', JSON.stringify(result, null, 2));

// Check DB after save
const schema = 'pfmea_' + fmeaId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
console.log('\n--- DB counts after save ---');
const tables = ['l2_structures','l3_structures','l1_functions','l2_functions','l3_functions','failure_modes','failure_effects','failure_causes','failure_links'];
for (const t of tables) {
  try {
    const r = await c.query(`SELECT count(*)::int as cnt FROM "${schema}"."${t}" WHERE "fmeaId" = $1`, [fmeaId]);
    if (r.rows[0].cnt > 0) console.log(`  ${t}: ${r.rows[0].cnt}`);
  } catch(e) { console.log(`  ${t}: ERROR - ${e.message.substring(0,60)}`); }
}

await c.end();
