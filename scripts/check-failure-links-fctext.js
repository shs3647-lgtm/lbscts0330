/**
 * failure_links에서 fcText 확인
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function check() {
  console.log('=== failure_links fcText 데이터 ===\n');
  
  // failure_links에서 fcId, cache 확인
  const links = await pool.query(`
    SELECT id, "fcId", cache
    FROM public.failure_links 
    WHERE "fmeaId" = 'PFM26-M001'
    AND "fcId" IS NOT NULL
    LIMIT 10
  `);
  
  console.log(`총 ${links.rows.length}건:\n`);
  
  for (const link of links.rows) {
    const cache = link.cache || {};
    console.log(`fcId: ${link.fcId?.substring(0, 25)}...`);
    console.log(`  cache.fcText: ${cache.fcText || '(없음)'}`);
    
    // failure_causes에서 해당 fcId의 cause 확인
    const fc = await pool.query(`
      SELECT cause FROM public.failure_causes WHERE id = $1
    `, [link.fcId]);
    
    if (fc.rows.length > 0) {
      console.log(`  DB cause: ${fc.rows[0].cause}`);
    } else {
      console.log(`  DB cause: (not found)`);
    }
    console.log('');
  }
  
  await pool.end();
}

check();










