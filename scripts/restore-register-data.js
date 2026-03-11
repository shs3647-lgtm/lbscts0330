/**
 * DB에서 등록화면 데이터 복구 스크립트
 */

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  const fmeaId = process.argv[2] || 'pfm26-M001';
  const schemaName = `pfmea_${fmeaId.toLowerCase().replace(/-/g, '_')}`;
  
  console.log('=== DB 데이터 복구 ===');
  console.log('FMEA ID:', fmeaId);
  console.log('Schema:', schemaName);
  
  try {
    // FmeaLegacyData 조회
    const legacy = await pool.query(`SELECT "fmeaId", "legacyData" FROM ${schemaName}."FmeaLegacyData" LIMIT 1`);
    
    if (legacy.rows.length > 0) {
      const data = legacy.rows[0].legacyData;
      console.log('\n=== FmeaLegacyData ===');
      console.log('l1.name:', data.l1?.name);
      console.log('l2 count:', data.l2?.length);
      if (data.l2) {
        data.l2.forEach((p, i) => {
          console.log(`  l2[${i}]: ${p.no} - ${p.name}`);
        });
      }
      console.log('structureConfirmed:', data.structureConfirmed);
      console.log('l1Confirmed:', data.l1Confirmed);
      
      // localStorage 형식으로 출력 (브라우저 콘솔에서 실행할 수 있도록)
      console.log('\n========================================');
      console.log('브라우저 콘솔 (F12)에서 아래 명령 실행:');
      console.log('========================================\n');
      
      const jsonStr = JSON.stringify(data);
      console.log(`localStorage.setItem('pfmea_worksheet_${fmeaId}', ${JSON.stringify(jsonStr)});`);
      console.log(`location.reload();`);
    } else {
      console.log('❌ FmeaLegacyData 데이터 없음');
    }
    
  } catch (e) {
    console.error('오류:', e.message);
  } finally {
    await pool.end();
  }
})();
