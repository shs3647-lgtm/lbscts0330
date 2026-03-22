/**
 * pfm26-f001 Atomic DB 재구축: flatData 로드 → save-from-import API 호출
 */
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const fmeaId = 'pfm26-f001';
  
  // 1. Load flatData from master dataset
  const ds = await pool.query(`SELECT id FROM pfmea_master_datasets WHERE "fmeaId" = $1 LIMIT 1`, [fmeaId]);
  if (ds.rows.length === 0) { console.log('No dataset'); process.exit(1); }
  const dsId = ds.rows[0].id;
  
  const items = await pool.query(
    `SELECT id, "processNo", category, "itemCode", value, m4, "specialChar", "parentItemId", "rowSpan", "belongsTo"
     FROM pfmea_master_flat_items WHERE "datasetId" = $1 ORDER BY "processNo", "itemCode"`, [dsId]
  );
  console.log(`Loaded ${items.rows.length} flatItems for ${fmeaId}`);
  
  // Group counts
  const byCode = {};
  for (const r of items.rows) {
    byCode[r.itemCode] = (byCode[r.itemCode] || 0) + 1;
  }
  console.log('FlatData breakdown:', JSON.stringify(byCode));
  
  // Load chains from master dataset
  const chainRows = await pool.query(
    `SELECT "failureChains" FROM pfmea_master_datasets WHERE id = $1`, [dsId]
  );
  const chains = chainRows.rows[0]?.failureChains || [];
  console.log(`Loaded ${chains.length} chains`);
  
  // 2. Call save-from-import API
  const flatData = items.rows.map(r => ({
    id: r.id,
    processNo: r.processNo,
    category: r.category,
    itemCode: r.itemCode,
    value: r.value,
    m4: r.m4 || undefined,
    specialChar: r.specialChar || undefined,
    parentItemId: r.parentItemId || undefined,
    rowSpan: r.rowSpan || 1,
    belongsTo: r.belongsTo || undefined,
    createdAt: new Date().toISOString(),
  }));
  
  console.log('\nCalling save-from-import...');
  const res = await fetch('http://localhost:3000/api/fmea/save-from-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fmeaId,
      flatData,
      l1Name: '',
      failureChains: chains,
    }),
  });
  
  const result = await res.json();
  console.log('Response status:', res.status);
  console.log('Result:', JSON.stringify(result, null, 2));
  
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
