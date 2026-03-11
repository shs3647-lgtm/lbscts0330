const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});
async function listTables() {
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('Tables in public schema:');
  res.rows.forEach(r => console.log(`- ${r.table_name}`));
  await pool.end();
}
listTables();
