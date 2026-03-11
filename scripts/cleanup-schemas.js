/**
 * 불필요한 프로젝트별 스키마 삭제
 * 현재 모든 데이터는 public 스키마에 저장됨
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function cleanup() {
  try {
    console.log('=== 불필요한 스키마 정리 ===\n');
    
    // 불필요한 스키마 조회
    const schemas = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'pfmea_%'
      ORDER BY schema_name
    `);
    
    if (schemas.rows.length === 0) {
      console.log('삭제할 스키마가 없습니다.');
      return;
    }
    
    console.log('삭제 대상 스키마:');
    schemas.rows.forEach(r => console.log('  -', r.schema_name));
    
    // 삭제
    console.log('\n삭제 진행...');
    for (const row of schemas.rows) {
      const schemaName = row.schema_name;
      await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      console.log(`  ✅ ${schemaName} 삭제 완료`);
    }
    
    // 확인
    console.log('\n=== 현재 스키마 목록 ===');
    const remaining = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    remaining.rows.forEach(r => console.log('  -', r.schema_name));
    
    console.log('\n=== 완료 ===');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

cleanup();










