const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/fmea-onpremise/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixA2() {
  const client = await pool.connect();
  try {
    const ds = await client.query(`SELECT id FROM "pfmea_master_datasets" WHERE "isActive" = true ORDER BY "updatedAt" DESC LIMIT 1`);
    const datasetId = ds.rows[0].id;
    console.log('Dataset:', datasetId);

    // Find all FMEAs that have L2 structures
    const fmeas = await client.query(`SELECT DISTINCT "fmeaId" FROM "l2_structures"`);
    console.log('FMEAs with L2:', fmeas.rows.map(r => r.fmeaId));

    // Get L2 structures from all FMEAs
    const l2 = await client.query(`SELECT "no", "name", "fmeaId" FROM "l2_structures" ORDER BY "no" ASC`);
    console.log('L2 structures:', l2.rows.length);
    l2.rows.forEach(r => console.log(' ', r.fmeaId, r.no, r.name));

    const existA2 = await client.query(`SELECT "processNo", value FROM "pfmea_master_flat_items" WHERE "datasetId" = $1 AND "itemCode" = 'A2'`, [datasetId]);
    console.log('Existing A2:', existA2.rows.length);

    let inserted = 0;
    for (const r of l2.rows) {
      if (r.no && r.name) {
        const exists = existA2.rows.find(e => e.processNo === r.no);
        if (!exists) {
          await client.query(
            `INSERT INTO "pfmea_master_flat_items" (id, "datasetId", "processNo", category, "itemCode", value, "sourceFmeaId", "createdAt") VALUES (gen_random_uuid(), $1, $2, 'A', 'A2', $3, $4, NOW())`,
            [datasetId, r.no, r.name, r.fmeaId]
          );
          console.log('Inserted A2:', r.no, r.name);
          inserted++;
        }
      }
    }
    console.log('Total inserted:', inserted);

    // Verify
    const verify = await client.query(`SELECT "processNo", value FROM "pfmea_master_flat_items" WHERE "datasetId" = $1 AND "itemCode" = 'A2' ORDER BY "processNo"`, [datasetId]);
    console.log('After fix - A2 count:', verify.rows.length);
    verify.rows.forEach(r => console.log(' ', r.processNo, r.value));
  } finally { client.release(); pool.end(); }
}
fixA2().catch(e => { console.error(e); process.exit(1); });
