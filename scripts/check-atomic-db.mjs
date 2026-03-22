import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema(fmeaId) {
  const schema = `pfmea_${fmeaId.replace(/-/g, '_')}`;
  console.log(`\n=== ${fmeaId} (schema: ${schema}) ===`);
  
  try {
    // Check if schema exists
    const schemaCheck = await pool.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`, [schema]
    );
    if (schemaCheck.rows.length === 0) {
      console.log('  Schema does not exist');
      return;
    }
    
    // Count entities
    const tables = [
      'l1_structures', 'l2_structures', 'l3_structures',
      'l1_functions', 'l2_functions', 'l3_functions',
      'failure_modes', 'failure_effects', 'failure_causes',
      'failure_links', 'risk_analyses'
    ];
    for (const t of tables) {
      try {
        const res = await pool.query(`SELECT COUNT(*) as cnt FROM "${schema}".${t}`);
        console.log(`  ${t}: ${res.rows[0].cnt}`);
      } catch (e) {
        console.log(`  ${t}: ERROR - ${e.message}`);
      }
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
}

await checkSchema('pfm26-m001');
await checkSchema('pfm26-f001');
await checkSchema('pfm26-m066');
await pool.end();
