/**
 * public 스키마의 고장 데이터를 프로젝트 스키마로 이동
 */
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db'
  });

  const projectSchema = 'pfmea_pfm26_m001';
  const fmeaId = 'PFM26-M001';
  
  try {
    console.log(`\n=== ${projectSchema} 스키마로 고장 데이터 이동 ===\n`);
    
    // 1. FailureEffects 이동
    const feResult = await pool.query(`
      INSERT INTO "${projectSchema}"."failure_effects" 
      SELECT * FROM public."failure_effects" WHERE "fmeaId" = $1
      ON CONFLICT (id) DO NOTHING
    `, [fmeaId]);
    console.log(`✅ FailureEffects: ${feResult.rowCount || 0}개 이동`);
    
    // 2. FailureModes 이동
    const fmResult = await pool.query(`
      INSERT INTO "${projectSchema}"."failure_modes" 
      SELECT * FROM public."failure_modes" WHERE "fmeaId" = $1
      ON CONFLICT (id) DO NOTHING
    `, [fmeaId]);
    console.log(`✅ FailureModes: ${fmResult.rowCount || 0}개 이동`);
    
    // 3. FailureCauses 이동
    const fcResult = await pool.query(`
      INSERT INTO "${projectSchema}"."failure_causes" 
      SELECT * FROM public."failure_causes" WHERE "fmeaId" = $1
      ON CONFLICT (id) DO NOTHING
    `, [fmeaId]);
    console.log(`✅ FailureCauses: ${fcResult.rowCount || 0}개 이동`);
    
    // 4. FailureLinks 이동
    const linkResult = await pool.query(`
      INSERT INTO "${projectSchema}"."failure_links" 
      SELECT * FROM public."failure_links" WHERE "fmeaId" = $1
      ON CONFLICT (id) DO NOTHING
    `, [fmeaId]);
    console.log(`✅ FailureLinks: ${linkResult.rowCount || 0}개 이동`);
    
    // 검증
    console.log('\n=== 이동 후 검증 ===');
    const tables = ['failure_effects', 'failure_modes', 'failure_causes', 'failure_links'];
    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) as cnt FROM "${projectSchema}"."${table}"`);
      console.log(` - ${table}: ${result.rows[0].cnt}개`);
    }
    
    console.log('\n✅ 마이그레이션 완료!');
    
  } catch (e) {
    console.error('오류:', e.message);
  } finally {
    await pool.end();
  }
}

main();








