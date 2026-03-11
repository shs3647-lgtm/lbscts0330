const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db'
  });

  try {
    // 프로젝트 스키마 데이터 확인
    const schema = 'pfmea_pfm26_m001';
    
    console.log(`=== ${schema} 스키마 데이터 ===`);
    
    const tables = [
      'l1_structures', 'l2_structures', 'l3_structures',
      'l1_functions', 'l2_functions', 'l3_functions',
      'failure_effects', 'failure_modes', 'failure_causes', 'failure_links'
    ];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as cnt FROM "${schema}"."${table}"`);
        console.log(` - ${table}: ${result.rows[0].cnt}개`);
      } catch (e) {
        console.log(` - ${table}: (테이블 없음)`);
      }
    }
    
    console.log('\n=== public 스키마 데이터 ===');
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as cnt FROM public."${table}"`);
        console.log(` - ${table}: ${result.rows[0].cnt}개`);
      } catch (e) {
        console.log(` - ${table}: (테이블 없음)`);
      }
    }
    
  } catch (e) {
    console.error('오류:', e.message);
  } finally {
    await pool.end();
  }
}

main();








