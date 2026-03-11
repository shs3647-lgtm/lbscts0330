const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});
async function checkMaster() {
  const res = await pool.query('SELECT COUNT(*) FROM public.cp_master_flat_items');
  console.log('cp_master_flat_items count:', res.rows[0].count);
  
  const dsRes = await pool.query('SELECT * FROM public.cp_master_datasets');
  console.log('cp_master_datasets count:', dsRes.rows.length);
  dsRes.rows.forEach(r => console.log(`- ${r.id}: ${r.name} (active=${r.isActive})`));
  
  await pool.end();
}
checkMaster();
