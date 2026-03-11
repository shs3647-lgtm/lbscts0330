/**
 * FmeaInfo 테이블의 중복 ID 확인
 */
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' 
});

(async () => {
  const fmeaId = process.argv[2] || 'pfm26-M001';
  const schemaName = `pfmea_${fmeaId.toLowerCase().replace(/-/g, '_')}`;
  
  console.log('=== FmeaInfo 테이블의 모든 행 확인 ===');
  console.log('Schema:', schemaName);
  console.log('');
  
  try {
    const result = await pool.query(`
      SELECT 
        id,
        "fmeaId",
        "createdAt",
        "updatedAt",
        project,
        "fmeaInfo"
      FROM "${schemaName}"."FmeaInfo"
      ORDER BY "createdAt" DESC
    `);
    
    console.log(`총 ${result.rows.length}개 행 발견:`);
    console.log('');
    
    result.rows.forEach((row, idx) => {
      console.log(`--- 행 ${idx + 1}: ${row.id} ---`);
      console.log(`  id (Primary Key): ${row.id}`);
      console.log(`  fmeaId: ${row.fmeaId}`);
      console.log(`  createdAt: ${row.createdAt}`);
      console.log(`  updatedAt: ${row.updatedAt}`);
      
      const project = typeof row.project === 'string' ? JSON.parse(row.project) : row.project;
      const fmeaInfo = typeof row.fmeaInfo === 'string' ? JSON.parse(row.fmeaInfo) : row.fmeaInfo;
      
      console.log(`  project:`, JSON.stringify(project, null, 2));
      console.log(`  fmeaInfo 필드 수:`, Object.keys(fmeaInfo || {}).length);
      
      // 누락 필드 확인
      const requiredFields = ['engineeringLocation', 'designResponsibility', 'fmeaRevisionDate', 'confidentialityLevel'];
      const missing = requiredFields.filter(f => !fmeaInfo || !fmeaInfo[f] || !fmeaInfo[f].trim());
      if (missing.length > 0) {
        console.log(`  ⚠️  누락 필드:`, missing.join(', '));
      } else {
        console.log(`  ✅ 모든 필드 포함`);
      }
      
      console.log('');
    });
    
    // 중복 확인
    if (result.rows.length > 1) {
      console.log('⚠️  주의: 동일한 fmeaId에 여러 행이 있습니다!');
      console.log('  - 최신 행만 사용하거나 이전 행을 삭제하는 것을 권장합니다.');
      console.log('');
      console.log('최신 행 (updatedAt 기준):');
      const latest = result.rows.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      console.log(`  id: ${latest.id}`);
      console.log(`  updatedAt: ${latest.updatedAt}`);
    }
    
  } catch (e) {
    console.error('오류:', e.message);
  } finally {
    await pool.end();
  }
})();











