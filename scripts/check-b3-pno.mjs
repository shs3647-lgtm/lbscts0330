import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const ds = await pool.query(`SELECT id FROM pfmea_master_datasets WHERE "fmeaId" = 'pfm26-m001' LIMIT 1`);
  const dsId = ds.rows[0].id;

  // B1 processNo/m4 combinations
  const b1s = await pool.query(`SELECT id, "processNo", m4, value FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B1' ORDER BY "processNo"::int, m4 LIMIT 15`, [dsId]);
  console.log('B1 (first 15):');
  for (const b of b1s.rows) {
    console.log(`  pno=${b.processNo} m4=${b.m4 || ''} id=${b.id} val=${(b.value||'').substring(0,30)}`);
  }

  // B3 processNo/m4 combinations
  const b3s = await pool.query(`SELECT id, "processNo", m4, value FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B3' ORDER BY "processNo"::int, m4 LIMIT 15`, [dsId]);
  console.log('\nB3 (first 15):');
  for (const b of b3s.rows) {
    console.log(`  pno=${b.processNo} m4=${b.m4 || ''} id=${b.id} val=${(b.value||'').substring(0,30)}`);
  }

  // Check if B3 id pattern matches B1 id
  const b1All = await pool.query(`SELECT id FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B1'`, [dsId]);
  const b3All = await pool.query(`SELECT id, "processNo", m4 FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B3'`, [dsId]);
  const b1Ids = new Set(b1All.rows.map(r => r.id));
  
  // Try: strip -B3 suffix to get parent B1 id
  let matchByIdPattern = 0;
  for (const b3 of b3All.rows) {
    const candidateParent = b3.id.replace(/-B3$/, '').replace(/-C5-B3$/, '');
    if (b1Ids.has(candidateParent)) matchByIdPattern++;
  }
  console.log(`\nB3→B1 id pattern match: ${matchByIdPattern}/${b3All.rows.length}`);

  // Try: processNo + m4 matching
  const b1ByPnoM4 = new Map();
  for (const b1 of b1All.rows) {
    b1ByPnoM4.set(`${b1.id}`, true);
  }
  const b1Full = await pool.query(`SELECT id, "processNo", m4 FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B1'`, [dsId]);
  const b1PnoM4Map = new Map();
  for (const b1 of b1Full.rows) {
    const key = `${b1.processNo}|${b1.m4 || ''}`;
    if (!b1PnoM4Map.has(key)) b1PnoM4Map.set(key, []);
    b1PnoM4Map.get(key).push(b1.id);
  }

  let matchByPnoM4 = 0;
  for (const b3 of b3All.rows) {
    const key = `${b3.processNo}|${b3.m4 || ''}`;
    if (b1PnoM4Map.has(key)) matchByPnoM4++;
  }
  console.log(`B3→B1 processNo+m4 match: ${matchByPnoM4}/${b3All.rows.length}`);

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
