import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  for (const fmeaId of ['pfm26-m001', 'pfm26-f001']) {
    const ds = await pool.query(`SELECT id FROM pfmea_master_datasets WHERE "fmeaId" = $1 LIMIT 1`, [fmeaId]);
    if (ds.rows.length === 0) { console.log(`No dataset for ${fmeaId}`); continue; }
    const dsId = ds.rows[0].id;

    // Get B1 IDs
    const b1s = await pool.query(`SELECT id FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B1'`, [dsId]);
    const b1Ids = new Set(b1s.rows.map(r => r.id));

    // Get B3 parentItemIds
    const b3s = await pool.query(`SELECT id, "parentItemId", "processNo", value FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B3' LIMIT 10`, [dsId]);
    
    console.log(`\n=== ${fmeaId} ===`);
    console.log(`B1 IDs (first 5):`, b1s.rows.slice(0,5).map(r => r.id));
    console.log(`B3 items (first 5):`);
    for (const b3 of b3s.rows.slice(0, 5)) {
      const match = b1Ids.has(b3.parentItemId);
      console.log(`  B3 id=${b3.id} parent=${b3.parentItemId} match=${match} val=${(b3.value || '').substring(0,40)}`);
    }

    // Count orphan B3
    const totalB3 = b3s.rows.length;
    const orphanB3 = b3s.rows.filter(r => !b1Ids.has(r.parentItemId));
    
    // Get B2 parentItemIds
    const b2s = await pool.query(`SELECT id, "parentItemId" FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B2' LIMIT 5`, [dsId]);
    console.log(`B2 items (first 5):`);
    for (const b2 of b2s.rows.slice(0, 5)) {
      const match = b1Ids.has(b2.parentItemId);
      console.log(`  B2 id=${b2.id} parent=${b2.parentItemId} match=${match}`);
    }

    // Count orphan B3 (full)
    const allB3 = await pool.query(`SELECT "parentItemId" FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B3'`, [dsId]);
    const orphanCount = allB3.rows.filter(r => !b1Ids.has(r.parentItemId)).length;
    console.log(`B3 total=${allB3.rows.length}, orphan=${orphanCount}`);

    // B4
    const b4s = await pool.query(`SELECT id, "parentItemId" FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B4' LIMIT 5`, [dsId]);
    console.log(`B4 items (first 5):`);
    for (const b4 of b4s.rows.slice(0, 5)) {
      console.log(`  B4 id=${b4.id} parent=${b4.parentItemId}`);
    }
  }

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
