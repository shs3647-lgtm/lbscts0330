/**
 * 리스크분석 데이터 완전 초기화
 * - DB riskData 완전 삭제
 * - localStorage riskData 완전 삭제
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function reset() {
  console.log('=== 리스크분석 데이터 완전 초기화 ===\n');
  
  try {
    // 1. fmea_worksheet_data에서 riskData 완전 삭제
    const ws = await pool.query(`
      UPDATE public.fmea_worksheet_data
      SET "riskData" = '{}'::jsonb, "updatedAt" = NOW()
      WHERE "fmeaId" = 'PFM26-M001'
      RETURNING "fmeaId"
    `);
    console.log('✅ fmea_worksheet_data riskData 초기화:', ws.rowCount, '건');
    
    // 2. fmea_legacy_data에서 riskData 완전 삭제
    const legacy = await pool.query(`
      UPDATE public.fmea_legacy_data
      SET data = jsonb_set(data, '{riskData}', '{}'::jsonb), "updatedAt" = NOW()
      WHERE "fmeaId" = 'PFM26-M001'
      RETURNING "fmeaId"
    `);
    console.log('✅ fmea_legacy_data riskData 초기화:', legacy.rowCount, '건');
    
    console.log('\n=== 완료 ===');
    console.log('⚠️ 브라우저 localStorage도 삭제 필요:');
    console.log('1. F12 → Application → Local Storage → http://localhost:3000 → Clear All');
    console.log('2. 또는 http://localhost:3000/clear-cache.html 에서 삭제');
    console.log('3. Ctrl+Shift+R (강력 새로고침)');
    
  } catch (e) {
    console.error('❌ 오류:', e.message);
  } finally {
    await pool.end();
  }
}

reset();










