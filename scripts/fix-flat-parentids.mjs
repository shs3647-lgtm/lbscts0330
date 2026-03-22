/**
 * B2/B3/B4 flatItems에 parentItemId 설정 (기존 null 데이터 복구)
 * - B2.parentItemId = B1.id (same processNo + m4)
 * - B3.parentItemId = B1.id (same processNo + m4)
 * - B4.parentItemId = B3.id (same processNo + m4, first match)
 */
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function fixDataset(fmeaId) {
  const ds = await pool.query(`SELECT id FROM pfmea_master_datasets WHERE "fmeaId" = $1 LIMIT 1`, [fmeaId]);
  if (ds.rows.length === 0) { console.log(`No dataset for ${fmeaId}`); return; }
  const dsId = ds.rows[0].id;
  
  console.log(`\n=== Fixing ${fmeaId} (dataset: ${dsId}) ===`);
  
  // Load all items
  const all = await pool.query(
    `SELECT id, "processNo", "itemCode", m4, "parentItemId" FROM pfmea_master_flat_items WHERE "datasetId" = $1`,
    [dsId]
  );
  
  // B1 lookup: processNo+m4 → id
  const b1ByPnoM4 = new Map();
  // B3 lookup: processNo+m4 → id (first match)
  const b3ByPnoM4 = new Map();
  
  for (const item of all.rows) {
    const key = `${item.processNo}|${item.m4 || ''}`;
    if (item.itemCode === 'B1' && !b1ByPnoM4.has(key)) {
      b1ByPnoM4.set(key, item.id);
    }
    if (item.itemCode === 'B3' && !b3ByPnoM4.has(key)) {
      b3ByPnoM4.set(key, item.id);
    }
  }
  
  let b2Fixed = 0, b3Fixed = 0, b4Fixed = 0;
  
  for (const item of all.rows) {
    if (item.parentItemId) continue; // already has parentItemId
    
    const key = `${item.processNo}|${item.m4 || ''}`;
    
    if (item.itemCode === 'B2' || item.itemCode === 'B3') {
      const b1Id = b1ByPnoM4.get(key);
      if (b1Id) {
        try {
          await pool.query(
            `UPDATE pfmea_master_flat_items SET "parentItemId" = $1 WHERE id = $2 AND "datasetId" = $3`,
            [b1Id, item.id, dsId]
          );
          if (item.itemCode === 'B2') b2Fixed++;
          else b3Fixed++;
        } catch (e) {
          // unique constraint violation — skip
        }
      }
    }
    
    if (item.itemCode === 'B4') {
      const b3Id = b3ByPnoM4.get(key);
      if (b3Id) {
        try {
          await pool.query(
            `UPDATE pfmea_master_flat_items SET "parentItemId" = $1 WHERE id = $2 AND "datasetId" = $3`,
            [b3Id, item.id, dsId]
          );
          b4Fixed++;
        } catch (e) {
          // unique constraint violation — skip
        }
      }
    }
  }
  
  console.log(`  B2 fixed: ${b2Fixed}`);
  console.log(`  B3 fixed: ${b3Fixed}`);
  console.log(`  B4 fixed: ${b4Fixed}`);
}

await fixDataset('pfm26-m001');
await fixDataset('pfm26-f001');
await pool.end();
console.log('\nDone!');
