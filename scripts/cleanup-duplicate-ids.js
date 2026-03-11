/**
 * FmeaInfo 테이블의 중복 ID 정리
 * - 각 fmeaId별로 최신 행만 남기고 이전 행 삭제
 */
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' 
});

(async () => {
  const fmeaId = process.argv[2] || 'pfm26-M001';
  const schemaName = `pfmea_${fmeaId.toLowerCase().replace(/-/g, '_')}`;
  
  console.log('=== FmeaInfo 테이블 중복 ID 정리 ===');
  console.log('Schema:', schemaName);
  console.log('');
  
  try {
    // 모든 행 조회
    const result = await pool.query(`
      SELECT 
        id,
        "fmeaId",
        "createdAt",
        "updatedAt"
      FROM "${schemaName}"."FmeaInfo"
      ORDER BY "updatedAt" DESC
    `);
    
    if (result.rows.length <= 1) {
      console.log('✅ 중복 행이 없습니다.');
      await pool.end();
      return;
    }
    
    console.log(`총 ${result.rows.length}개 행 발견`);
    console.log('');
    
    // 최신 행 확인 (updatedAt 기준)
    const latest = result.rows[0];
    const oldRows = result.rows.slice(1);
    
    console.log('최신 행 (유지):');
    console.log(`  id: ${latest.id}`);
    console.log(`  updatedAt: ${latest.updatedAt}`);
    console.log('');
    
    console.log('이전 행 (삭제 예정):');
    oldRows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. id: ${row.id}, updatedAt: ${row.updatedAt}`);
    });
    console.log('');
    
    // 사용자 확인 (스크립트 실행 시 자동으로 삭제)
    const deleteOld = process.argv[3] === '--delete';
    
    if (!deleteOld) {
      console.log('⚠️  이전 행을 삭제하려면 --delete 플래그를 추가하세요:');
      console.log(`   node scripts/cleanup-duplicate-ids.js ${fmeaId} --delete`);
      return;
    }
    
    // 이전 행 삭제
    for (const oldRow of oldRows) {
      try {
        await pool.query(`
          DELETE FROM "${schemaName}"."FmeaInfo"
          WHERE id = $1
        `, [oldRow.id]);
        console.log(`✅ 삭제 완료: ${oldRow.id}`);
      } catch (e) {
        console.error(`❌ 삭제 실패 (${oldRow.id}):`, e.message);
      }
    }
    
    console.log('');
    console.log('=== 정리 완료 ===');
    console.log('최신 행만 남았습니다:');
    console.log(`  id: ${latest.id}`);
    
  } catch (e) {
    console.error('오류:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
})();

