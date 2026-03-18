/**
 * fmea_projects 테이블에 cftMembers 컬럼 추가 (legacy FmeaInfo 호환)
 */
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' 
});

(async () => {
  console.log('=== fmea_projects 테이블에 cftMembers 컬럼 추가 ===');
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
      
      // fmea_projects 또는 legacy FmeaInfo 테이블 자동 감지
      const tableCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = $1 AND table_name IN ('fmea_projects', 'FmeaInfo')
        ORDER BY table_name
      `, [schemaName]);
      const tableName = tableCheck.rows.find(r => r.table_name === 'fmea_projects')?.table_name
                     || tableCheck.rows.find(r => r.table_name === 'FmeaInfo')?.table_name;

      if (!tableName) {
        console.log(`  ⚠️  ${schemaName}: fmea_projects/FmeaInfo 테이블 없음`);
        continue;
      }

      try {
        await pool.query(`
          ALTER TABLE "${schemaName}"."${tableName}" 
          ADD COLUMN IF NOT EXISTS "cftMembers" JSONB
        `);
        console.log(`  ✅ ${schemaName}.${tableName}에 cftMembers 컬럼 추가 완료`);
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log(`  ℹ️  ${schemaName}.${tableName}에 cftMembers 컬럼 이미 존재`);
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
