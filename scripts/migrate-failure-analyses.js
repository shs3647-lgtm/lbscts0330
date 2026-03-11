/**
 * public 스키마의 failure_analyses를 프로젝트 스키마로 이동
 */
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db'
  });

  const projectSchema = 'pfmea_pfm26_m001';
  const fmeaId = 'PFM26-M001';
  
  try {
    console.log(`\n=== failure_analyses → ${projectSchema} 이동 ===\n`);
    
    // 먼저 테이블 구조 업데이트 (public에서 복제)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${projectSchema}"."failure_analyses" 
      (LIKE public."failure_analyses" INCLUDING ALL)
    `);
    
    // 기존 데이터 삭제
    await pool.query(`DELETE FROM "${projectSchema}"."failure_analyses" WHERE "fmeaId" = $1`, [fmeaId]);
    
    // 데이터 복사
    const result = await pool.query(`
      INSERT INTO "${projectSchema}"."failure_analyses"
      SELECT * FROM public."failure_analyses" WHERE "fmeaId" = $1
    `, [fmeaId]);
    
    console.log(`✅ failure_analyses: ${result.rowCount}개 이동 완료`);
    
    // 검증
    const verify = await pool.query(`SELECT COUNT(*) as cnt FROM "${projectSchema}"."failure_analyses"`);
    console.log(`검증: ${projectSchema}.failure_analyses = ${verify.rows[0].cnt}개`);
    
  } catch (e) {
    console.error('오류:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

main();








