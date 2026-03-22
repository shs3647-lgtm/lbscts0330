import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const fmeaId = 'pfm26-m001';
  const ds = await pool.query(`SELECT id, "failureChains" FROM pfmea_master_datasets WHERE "fmeaId" = $1 LIMIT 1`, [fmeaId]);
  if (ds.rows.length === 0) { console.log('No dataset'); process.exit(1); }
  const dsId = ds.rows[0].id;
  const chains = ds.rows[0].failureChains || [];
  
  const items = await pool.query(
    `SELECT id, "processNo", category, "itemCode", value, m4, "specialChar", "parentItemId", "rowSpan", "belongsTo"
     FROM pfmea_master_flat_items WHERE "datasetId" = $1 ORDER BY "processNo", "itemCode"`, [dsId]
  );
  
  const flatData = items.rows.map(r => ({
    id: r.id, processNo: r.processNo, category: r.category, itemCode: r.itemCode,
    value: r.value, m4: r.m4 || undefined, specialChar: r.specialChar || undefined,
    parentItemId: r.parentItemId || undefined, rowSpan: r.rowSpan || 1,
    belongsTo: r.belongsTo || undefined, createdAt: new Date().toISOString(),
  }));
  
  // Count by itemCode
  const byCode = {};
  for (const r of flatData) byCode[r.itemCode] = (byCode[r.itemCode] || 0) + 1;
  console.log(`${fmeaId}: ${flatData.length} items, ${chains.length} chains`);
  console.log('Breakdown:', JSON.stringify(byCode));
  
  const res = await fetch('http://localhost:3000/api/fmea/save-from-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId, flatData, l1Name: '', failureChains: chains }),
  });
  
  const result = await res.json();
  console.log('Status:', res.status);
  console.log('Diagnostics:', JSON.stringify(result.buildResult?.diagnostics || {}, null, 2));
  console.log('AtomicCounts:', JSON.stringify(result.atomicCounts || {}, null, 2));
  
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
