import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  for (const fmeaId of ['pfm26-m001', 'pfm26-f001']) {
    console.log(`\n=== Testing buildAtomicFromFlat for ${fmeaId} ===`);
    
    const ds = await pool.query(`SELECT id FROM pfmea_master_datasets WHERE "fmeaId" = $1 LIMIT 1`, [fmeaId]);
    if (ds.rows.length === 0) { console.log('  No dataset'); continue; }
    const dsId = ds.rows[0].id;
    
    // Load flatData
    const items = await pool.query(
      `SELECT id, "processNo", category, "itemCode", value, m4, "specialChar", "parentItemId", "rowSpan", "belongsTo"
       FROM pfmea_master_flat_items WHERE "datasetId" = $1`, [dsId]
    );
    console.log(`  Total flatItems: ${items.rows.length}`);
    
    // Group by itemCode
    const byCode = new Map();
    for (const r of items.rows) {
      const list = byCode.get(r.itemCode) || [];
      list.push(r);
      byCode.set(r.itemCode, list);
    }
    for (const [code, list] of [...byCode.entries()].sort()) {
      console.log(`    ${code}: ${list.length}`);
    }
    
    // Simulate B3→B1 matching (current bug: parentItemId=null)
    const b1Items = byCode.get('B1') || [];
    const b3Items = byCode.get('B3') || [];
    const b2Items = byCode.get('B2') || [];
    const b4Items = byCode.get('B4') || [];
    
    const b1Ids = new Set(b1Items.map(b => b.id));
    const orphanB3 = b3Items.filter(b => !b1Ids.has(b.parentItemId || ''));
    console.log(`  B3 orphan (null parentItemId): ${orphanB3.length}/${b3Items.length}`);
    
    // Test processNo+m4 fallback
    const b1ByPnoM4 = new Map();
    for (const b1 of b1Items) {
      const key = `${b1.processNo}|${b1.m4 || ''}`;
      if (!b1ByPnoM4.has(key)) b1ByPnoM4.set(key, b1);
    }
    
    let b3Fixed = 0;
    const b3ByB1 = new Map();
    for (const b3 of b3Items) {
      let b1Id = b3.parentItemId || '';
      if (!b1Id || !b1Ids.has(b1Id)) {
        const key = `${b3.processNo}|${b3.m4 || ''}`;
        const match = b1ByPnoM4.get(key);
        if (match) { b1Id = match.id; b3Fixed++; }
      }
      if (b1Id) {
        const list = b3ByB1.get(b1Id) || [];
        list.push(b3);
        b3ByB1.set(b1Id, list);
      }
    }
    
    // Count L3Functions that WOULD be created
    let l3FCount = 0;
    for (const b1 of b1Items) {
      const relatedB3s = b3ByB1.get(b1.id) || [];
      l3FCount += relatedB3s.length;
    }
    
    console.log(`  B3→B1 processNo+m4 fallback: ${b3Fixed} fixed`);
    console.log(`  L3Functions would be created: ${l3FCount}`);
    
    // Test B4→B3 matching
    let b4Fixed = 0;
    // For simplicity, just count B4 with null parentItemId
    const orphanB4 = b4Items.filter(b => !b.parentItemId);
    console.log(`  B4 orphan (null parentItemId): ${orphanB4.length}/${b4Items.length}`);
    
    // B4 processNo+m4 → L3Function fallback
    // (would use created L3Functions, here just simulate count)
    for (const b4 of orphanB4) {
      const key = `${b4.processNo}|${b4.m4 || ''}`;
      if (b1ByPnoM4.has(key)) b4Fixed++;
    }
    console.log(`  B4→L3F processNo+m4 fallback would fix: ${b4Fixed}`);
    console.log(`  FailureCauses would be created: ~${b4Items.length > 0 ? b4Fixed + (b4Items.length - orphanB4.length) : 0}`);
  }
  
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
