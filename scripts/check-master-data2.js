/**
 * 기초정보 마스터 데이터 확인
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function check() {
  try {
    // pfmea_master_datasets
    const datasets = await pool.query('SELECT * FROM public.pfmea_master_datasets');
    console.log('=== pfmea_master_datasets ===');
    console.log(datasets.rows.length, '건');
    if (datasets.rows.length > 0) {
      console.log('Names:', datasets.rows.map(r => r.name).join(', '));
    }
    
    // pfmea_master_flat_items
    const items = await pool.query('SELECT COUNT(*) as cnt FROM public.pfmea_master_flat_items');
    console.log('\n=== pfmea_master_flat_items ===');
    console.log(items.rows[0].cnt, '건');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

check();










