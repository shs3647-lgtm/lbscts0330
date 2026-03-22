import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const ds = await pool.query(`SELECT id FROM pfmea_master_datasets WHERE "fmeaId" = 'pfm26-m001' LIMIT 1`);
  const dsId = ds.rows[0].id;
  
  // B3 IDs
  const b3All = await pool.query(`SELECT id FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B3'`, [dsId]);
  const b3Ids = new Set(b3All.rows.map(r => r.id));
  
  // B4 parentItemIds
  const b4All = await pool.query(`SELECT id, "parentItemId", "processNo", m4, value FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B4'`, [dsId]);
  
  let match = 0, noMatch = 0;
  for (const b4 of b4All.rows) {
    if (b3Ids.has(b4.parentItemId)) {
      match++;
    } else {
      noMatch++;
      if (noMatch <= 5) {
        console.log(`B4 "${b4.value?.substring(0,30)}" pno=${b4.processNo} parent=${b4.parentItemId} → NOT in B3 ids`);
      }
    }
  }
  console.log(`\nB4→B3 FK match: ${match}/${b4All.rows.length} matched, ${noMatch} orphan`);
  
  // Check what B4.parentItemId looks like vs B3.id
  console.log('\nSample B3 IDs:', b3All.rows.slice(0,5).map(r => r.id));
  console.log('Sample B4 parentItemIds:', b4All.rows.slice(0,5).map(r => r.parentItemId));
  
  // Also check: B2 IDs
  const b2All = await pool.query(`SELECT id FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B2'`, [dsId]);
  const b2Ids = new Set(b2All.rows.map(r => r.id));
  
  // B4.parentItemId might match B2.id (L3Function.id) instead of B3.id
  let b4MatchB2 = 0;
  for (const b4 of b4All.rows) {
    if (b2Ids.has(b4.parentItemId)) b4MatchB2++;
  }
  console.log(`\nB4→B2 FK match: ${b4MatchB2}/${b4All.rows.length}`);
  console.log('Sample B2 IDs:', b2All.rows.slice(0,5).map(r => r.id));
  
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
