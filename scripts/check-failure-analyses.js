const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db'
  });

  try {
    console.log('=== FailureAnalyses 테이블 확인 ===\n');
    
    // public 스키마
    try {
      const r1 = await pool.query('SELECT COUNT(*) as cnt FROM public."failure_analyses"');
      console.log('public.failure_analyses:', r1.rows[0].cnt, '개');
    } catch (e) {
      console.log('public.failure_analyses: 테이블 없음');
    }
    
    // 프로젝트 스키마
    try {
      const r2 = await pool.query('SELECT COUNT(*) as cnt FROM "pfmea_pfm26_m001"."failure_analyses"');
      console.log('pfmea_pfm26_m001.failure_analyses:', r2.rows[0].cnt, '개');
    } catch (e) {
      console.log('pfmea_pfm26_m001.failure_analyses: 테이블 없음');
    }
    
  } catch (e) {
    console.error('오류:', e.message);
  } finally {
    await pool.end();
  }
}

main();








