const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function listCps() {
  const res = await pool.query('SELECT "cpNo", subject FROM public.cp_registrations');
  console.log('Registered CPs:');
  res.rows.forEach(r => console.log(`- ${r.cpNo}: ${r.subject}`));
  
  const procRes = await pool.query('SELECT DISTINCT "cpNo" FROM public.cp_processes');
  console.log('\nCPs with Processes:');
  procRes.rows.forEach(r => console.log(`- ${r.cpNo}`));
  
  await pool.end();
}
listCps();
