/**
 * legacy data에서 riskData 확인 및 정리
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function check() {
  console.log('=== fmea_legacy_data riskData 확인 ===\n');
  
  const result = await pool.query(`
    SELECT "fmeaId", data
    FROM public.fmea_legacy_data
    WHERE "fmeaId" = 'PFM26-M001'
  `);
  
  if (result.rows.length > 0) {
    const data = result.rows[0].data || {};
    const riskData = data.riskData || {};
    
    console.log('riskData 키 개수:', Object.keys(riskData).length);
    
    // S/O/D 키 중 숫자가 아닌 것 찾기
    const problematicKeys = [];
    Object.keys(riskData).forEach(key => {
      const val = riskData[key];
      if ((key.includes('-O') || key.includes('-D') || key.includes('-S')) && typeof val !== 'number') {
        console.log(`  ❌ ${key}: "${val}" (타입: ${typeof val})`);
        problematicKeys.push(key);
      }
    });
    
    if (problematicKeys.length > 0) {
      console.log(`\n잘못된 키 ${problematicKeys.length}개 삭제 중...`);
      problematicKeys.forEach(key => {
        delete riskData[key];
      });
      
      data.riskData = riskData;
      
      await pool.query(`
        UPDATE public.fmea_legacy_data
        SET data = $2, "updatedAt" = NOW()
        WHERE "fmeaId" = $1
      `, ['PFM26-M001', data]);
      
      console.log('✅ 삭제 완료');
    } else {
      console.log('✅ 잘못된 riskData 없음');
    }
    
    // prevention/detection 키 확인
    console.log('\n=== 예방관리/검출관리 키 ===');
    Object.keys(riskData).filter(k => k.startsWith('prevention') || k.startsWith('detection')).slice(0, 10).forEach(key => {
      console.log(`  ${key}: "${riskData[key]}"`);
    });
  } else {
    console.log('데이터 없음');
  }
  
  await pool.end();
}

check();










