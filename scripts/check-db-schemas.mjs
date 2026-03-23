import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });

const schemas = await pool.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%' ORDER BY schema_name`);
console.log('Project schemas:', schemas.rows.map(r => r.schema_name));

for (const { schema_name } of schemas.rows) {
  try {
    const l2 = await pool.query(`SELECT count(*) FROM "${schema_name}".l2_structures`);
    const l3 = await pool.query(`SELECT count(*) FROM "${schema_name}".l3_structures`);
    const fm = await pool.query(`SELECT count(*) FROM "${schema_name}".failure_modes`);
    const fc = await pool.query(`SELECT count(*) FROM "${schema_name}".failure_causes`);
    const fl = await pool.query(`SELECT count(*) FROM "${schema_name}".failure_links`);
    const ra = await pool.query(`SELECT count(*) FROM "${schema_name}".risk_analyses`);
    const l1f = await pool.query(`SELECT count(*) FROM "${schema_name}".l1_functions`);
    const l2f = await pool.query(`SELECT count(*) FROM "${schema_name}".l2_functions`);
    const l3f = await pool.query(`SELECT count(*) FROM "${schema_name}".l3_functions`);
    const fe = await pool.query(`SELECT count(*) FROM "${schema_name}".failure_effects`);
    const ppc = await pool.query(`SELECT count(*) FROM "${schema_name}".process_product_chars`);
    console.log(`${schema_name}: L2=${l2.rows[0].count} L3=${l3.rows[0].count} L1F=${l1f.rows[0].count} L2F=${l2f.rows[0].count} L3F=${l3f.rows[0].count} PPC=${ppc.rows[0].count} FM=${fm.rows[0].count} FE=${fe.rows[0].count} FC=${fc.rows[0].count} FL=${fl.rows[0].count} RA=${ra.rows[0].count}`);
  } catch (e) {
    console.log(`${schema_name}: ERROR - ${e.message}`);
  }
}

await pool.end();
