import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // m001
  const ds1 = await pool.query(`SELECT id FROM pfmea_master_datasets WHERE "fmeaId" = 'pfm26-m001' LIMIT 1`);
  if (ds1.rows.length === 0) {
    console.log('No dataset for pfm26-m001');
  } else {
    const dsId = ds1.rows[0].id;
    const items1 = await pool.query(`SELECT "itemCode", COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 GROUP BY "itemCode" ORDER BY "itemCode"`, [dsId]);
    console.log('pfm26-m001 flatItems:', items1.rows.map(r => `${r.itemCode}=${r.cnt}`).join(', '));
  }
  
  // f001
  const ds2 = await pool.query(`SELECT id FROM pfmea_master_datasets WHERE "fmeaId" = 'pfm26-f001' LIMIT 1`);
  if (ds2.rows.length === 0) {
    console.log('No dataset for pfm26-f001');
  } else {
    const dsId = ds2.rows[0].id;
    const items2 = await pool.query(`SELECT "itemCode", COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 GROUP BY "itemCode" ORDER BY "itemCode"`, [dsId]);
    console.log('pfm26-f001 flatItems:', items2.rows.map(r => `${r.itemCode}=${r.cnt}`).join(', '));
  }

  // m066
  const ds3 = await pool.query(`SELECT id FROM pfmea_master_datasets WHERE "fmeaId" = 'pfm26-m066' LIMIT 1`);
  if (ds3.rows.length === 0) {
    console.log('No dataset for pfm26-m066');
  } else {
    const dsId = ds3.rows[0].id;
    const items3 = await pool.query(`SELECT "itemCode", COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 GROUP BY "itemCode" ORDER BY "itemCode"`, [dsId]);
    console.log('pfm26-m066 flatItems:', items3.rows.map(r => `${r.itemCode}=${r.cnt}`).join(', '));
  }

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
