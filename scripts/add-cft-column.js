/**
 * FmeaInfo 테이블에 cftMembers 컬럼 추가
 */
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' 
});

(async () => {
  console.log('=== FmeaInfo 테이블에 cftMembers 컬럼 추가 ===');
  console.log('');
  
  try {
    // 모든 FMEA 스키마 찾기
    const schemasResult = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'pfmea_pfm%' 
      ORDER BY schema_name
    `);
    
    for (const row of schemasResult.rows) {
      const schemaName = row.schema_name;
      console.log(`처리 중: ${schemaName}`);
      
      try {
        // cftMembers 컬럼 추가
        await pool.query(`
          ALTER TABLE "${schemaName}"."FmeaInfo" 
          ADD COLUMN IF NOT EXISTS "cftMembers" JSONB
        `);
        console.log(`  ✅ ${schemaName}.FmeaInfo에 cftMembers 컬럼 추가 완료`);
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log(`  ℹ️  ${schemaName}.FmeaInfo에 cftMembers 컬럼 이미 존재`);
        } else {
          console.error(`  ❌ ${schemaName} 오류:`, e.message);
        }
      }
    }
    
    console.log('');
    console.log('=== 완료 ===');
    
  } catch (e) {
    console.error('오류:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
})();











