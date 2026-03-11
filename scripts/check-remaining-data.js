/**
 * 남아있는 FMEA 데이터 확인
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function check() {
  try {
    const legacy = await pool.query('SELECT "fmeaId" FROM public.fmea_legacy_data');
    console.log('fmea_legacy_data:', legacy.rows);
    
    const projects = await pool.query('SELECT "fmeaId" FROM public.fmea_projects');
    console.log('fmea_projects:', projects.rows);
    
    const links = await pool.query('SELECT COUNT(*) as cnt, "fmeaId" FROM public.failure_links GROUP BY "fmeaId"');
    console.log('failure_links:', links.rows);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

check();










