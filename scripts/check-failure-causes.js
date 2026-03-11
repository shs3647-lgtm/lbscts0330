/**
 * 고장원인 데이터 확인
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function check() {
  console.log('=== failure_causes 데이터 ===\n');
  
  const result = await pool.query(`
    SELECT id, cause, occurrence, "l3FuncId", "l3StructId"
    FROM public.failure_causes 
    WHERE "fmeaId" = 'PFM26-M001' 
    ORDER BY "createdAt"
  `);
  
  result.rows.forEach((r, i) => {
    console.log(`${i+1}. cause: ${r.cause}`);
    console.log(`   occurrence: ${r.occurrence || '(NULL)'}`);
    console.log(`   l3FuncId: ${r.l3FuncId?.substring(0, 20)}...`);
    console.log('');
  });
  
  await pool.end();
}

check();










