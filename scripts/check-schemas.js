const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db'
  });

  try {
    const result = await pool.query(`
      SELECT nspname 
      FROM pg_namespace 
      WHERE nspname NOT LIKE 'pg_%' 
        AND nspname != 'information_schema'
      ORDER BY nspname
    `);
    
    console.log('=== 스키마 목록 ===');
    result.rows.forEach(r => console.log(' -', r.nspname));
    console.log(`총 ${result.rows.length}개`);
    
  } catch (e) {
    console.error('오류:', e.message);
  } finally {
    await pool.end();
  }
}

main();








