/**
 * failure_links 테이블 스키마 확인
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function check() {
  console.log('=== failure_links 테이블 스키마 ===\n');
  
  // 컬럼 목록
  const columns = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'failure_links'
    ORDER BY ordinal_position
  `);
  
  console.log('컬럼 목록:');
  columns.rows.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type})`);
  });
  
  // 샘플 데이터
  console.log('\n=== 샘플 데이터 (첫 5건) ===\n');
  const samples = await pool.query(`
    SELECT * FROM public.failure_links 
    WHERE "fmeaId" = 'PFM26-M001'
    LIMIT 5
  `);
  
  samples.rows.forEach((row, i) => {
    console.log(`[${i+1}]`);
    Object.keys(row).forEach(key => {
      const val = row[key];
      if (val !== null && val !== undefined && val !== '') {
        console.log(`  ${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`);
      }
    });
    console.log('');
  });
  
  await pool.end();
}

check();










