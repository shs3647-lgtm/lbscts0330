/**
 * riskData 확인 및 정리
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function check() {
  console.log('=== riskData 확인 ===\n');
  
  // fmea_worksheet_data에서 riskData 확인
  const result = await pool.query(`
    SELECT "fmeaId", "riskData"
    FROM public.fmea_worksheet_data
    WHERE "fmeaId" = 'PFM26-M001'
  `);
  
  if (result.rows.length > 0) {
    const riskData = result.rows[0].riskData || {};
    console.log('riskData 키 목록:');
    Object.keys(riskData).forEach(key => {
      const val = riskData[key];
      // 발생도(O) 또는 검출도(D) 키인데 숫자가 아닌 경우 표시
      if ((key.includes('-O') || key.includes('-D')) && typeof val !== 'number') {
        console.log(`  ❌ ${key}: "${val}" (타입: ${typeof val}) - 삭제 필요`);
      } else if (key.includes('-O') || key.includes('-D')) {
        console.log(`  ✅ ${key}: ${val} (타입: ${typeof val})`);
      }
    });
    
    // 잘못된 키 삭제
    const keysToDelete = Object.keys(riskData).filter(key => {
      const val = riskData[key];
      return (key.includes('-O') || key.includes('-D') || key.includes('-S')) && typeof val !== 'number';
    });
    
    if (keysToDelete.length > 0) {
      console.log(`\n삭제할 키: ${keysToDelete.length}개`);
      keysToDelete.forEach(key => {
        delete riskData[key];
        console.log(`  삭제됨: ${key}`);
      });
      
      // 업데이트
      await pool.query(`
        UPDATE public.fmea_worksheet_data
        SET "riskData" = $2, "updatedAt" = NOW()
        WHERE "fmeaId" = $1
      `, ['PFM26-M001', riskData]);
      
      console.log('\n✅ riskData 정리 완료');
    } else {
      console.log('\n✅ 잘못된 riskData 없음');
    }
  } else {
    console.log('데이터 없음');
  }
  
  await pool.end();
}

check();










