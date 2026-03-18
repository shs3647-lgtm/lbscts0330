/**
 * fmea_projects 테이블의 중복 ID 정리 (legacy FmeaInfo 호환)
 * - 각 fmeaId별로 최신 행만 남기고 이전 행 삭제
 */
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' 
});

(async () => {
  const fmeaId = process.argv[2] || 'pfm26-M001';
  const schemaName = `pfmea_${fmeaId.toLowerCase().replace(/-/g, '_')}`;
  
  console.log('=== fmea_projects 테이블 중복 ID 정리 ===');
  console.log('Schema:', schemaName);
  console.log('');
  
  try {
    // fmea_projects 또는 legacy FmeaInfo 테이블 자동 감지
    const tableCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1 AND table_name IN ('fmea_projects', 'FmeaInfo')
      ORDER BY table_name
    `, [schemaName]);
    const tableName = tableCheck.rows.find(r => r.table_name === 'fmea_projects')?.table_name
                   || tableCheck.rows.find(r => r.table_name === 'FmeaInfo')?.table_name;

    if (!tableName) {
      console.log('❌ fmea_projects/FmeaInfo 테이블 없음');
      await pool.end();
      return;
    }

    // 모든 행 조회
    const result = await pool.query(`
      SELECT 
        id,
        "fmeaId",
        "createdAt",
        "updatedAt"
      FROM "${schemaName}"."${tableName}"
      ORDER BY "updatedAt" DESC
    `);
    
    if (result.rows.length <= 1) {
      console.log('✅ 중복 행이 없습니다.');
      await pool.end();
      return;
    }
    
    console.log(`총 ${result.rows.length}개 행 발견`);
    console.log('');
    
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
    
    const deleteOld = process.argv[3] === '--delete';
    
    if (!deleteOld) {
      console.log('⚠️  이전 행을 삭제하려면 --delete 플래그를 추가하세요:');
      console.log(`   node scripts/cleanup-duplicate-ids.js ${fmeaId} --delete`);
      return;
    }
    
    for (const oldRow of oldRows) {
      try {
        await pool.query(`
          DELETE FROM "${schemaName}"."${tableName}"
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
