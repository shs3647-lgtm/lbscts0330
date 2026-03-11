/**
 * 모든 riskData 완전 초기화
 * DB + localStorage 모두 삭제
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function clearAll() {
  console.log('=== 모든 riskData 초기화 ===\n');
  
  // 1. fmea_worksheet_data에서 riskData 초기화
  const ws = await pool.query(`
    UPDATE public.fmea_worksheet_data
    SET "riskData" = '{}'::jsonb, "updatedAt" = NOW()
    WHERE "fmeaId" = 'PFM26-M001'
    RETURNING "fmeaId"
  `);
  console.log('✅ fmea_worksheet_data riskData 초기화:', ws.rowCount, '건');
  
  // 2. fmea_legacy_data에서 riskData 초기화
  const legacy = await pool.query(`
    UPDATE public.fmea_legacy_data
    SET data = jsonb_set(data, '{riskData}', '{}'::jsonb), "updatedAt" = NOW()
    WHERE "fmeaId" = 'PFM26-M001'
    RETURNING "fmeaId"
  `);
  console.log('✅ fmea_legacy_data riskData 초기화:', legacy.rowCount, '건');
  
  console.log('\n=== 완료 ===');
  console.log('브라우저에서 Ctrl+Shift+R (강력 새로고침) 또는');
  console.log('http://localhost:3000/clear-cache.html 에서 캐시 삭제 필요');
  
  await pool.end();
}

clearAll();










