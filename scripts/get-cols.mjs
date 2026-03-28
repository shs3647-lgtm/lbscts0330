import pg from 'pg';
const c = new pg.Client('postgresql://postgres:1234@localhost:5432/fmea_db');
await c.connect();
const r = await c.query(`
  SELECT table_name, column_name 
  FROM information_schema.columns 
  WHERE table_schema='pfmea_pfm26_m002' 
  AND table_name IN ('failure_modes','failure_effects','failure_causes','failure_links','risk_analyses','l1_functions','l2_structures','l3_structures')
  ORDER BY table_name, ordinal_position
`);
for (const row of r.rows) console.log(row.table_name.padEnd(22), row.column_name);
await c.end();
