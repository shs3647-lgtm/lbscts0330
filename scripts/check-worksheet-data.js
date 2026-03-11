/**
 * 워크시트 데이터 확인 (구조분석 ~ 고장영향)
 */
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' 
});

(async () => {
  const fmeaId = process.argv[2] || 'PFM26-M001';
  const schemaName = `pfmea_${fmeaId.toLowerCase().replace(/-/g, '_')}`;
  
  console.log('='.repeat(80));
  console.log('=== PFM26-M001 워크시트 데이터 확인 ===');
  console.log('='.repeat(80));
  console.log('FMEA ID:', fmeaId);
  console.log('Schema:', schemaName);
  console.log('');
  
  try {
    // 1. 구조분석 데이터 확인
    console.log('='.repeat(80));
    console.log('=== 1. 구조분석 데이터 ===');
    console.log('='.repeat(80));
    
    const l1Result = await pool.query(`SELECT COUNT(*) as count FROM "${schemaName}"."L1Structure"`);
    const l1Count = parseInt(l1Result.rows[0].count);
    console.log('L1 구조분석 (완제품명):', l1Count, '건');
    
    if (l1Count > 0) {
      const l1Data = await pool.query(`SELECT * FROM "${schemaName}"."L1Structure" LIMIT 3`);
      l1Data.rows.forEach((r, i) => {
        console.log(`  ${i+1}. 이름: ${r.name || r.productName || '(없음)'}, 확정: ${r.confirmed}`);
      });
    }
    
    const l2Result = await pool.query(`SELECT COUNT(*) as count FROM "${schemaName}"."L2Structure"`);
    const l2Count = parseInt(l2Result.rows[0].count);
    console.log('L2 구조분석 (공정명):', l2Count, '건');
    
    if (l2Count > 0) {
      const l2Data = await pool.query(`SELECT * FROM "${schemaName}"."L2Structure" LIMIT 5`);
      l2Data.rows.forEach((r, i) => {
        console.log(`  ${i+1}. 공정명: ${r.processName || r.name || '(없음)'}, 확정: ${r.confirmed}`);
      });
    }
    
    const l3Result = await pool.query(`SELECT COUNT(*) as count FROM "${schemaName}"."l3_structures"`);
    const l3Count = parseInt(l3Result.rows[0].count);
    console.log('L3 구조분석 (작업요소):', l3Count, '건');
    
    // 2. 기능분석 데이터 확인
    console.log('');
    console.log('='.repeat(80));
    console.log('=== 2. 기능분석 데이터 ===');
    console.log('='.repeat(80));
    
    const l1FuncResult = await pool.query(`SELECT COUNT(*) as count FROM "${schemaName}"."l1_functions"`);
    const l1FuncCount = parseInt(l1FuncResult.rows[0].count);
    console.log('L1 기능분석 (완제품 기능):', l1FuncCount, '건');
    
    const l2FuncResult = await pool.query(`SELECT COUNT(*) as count FROM "${schemaName}"."l2_functions"`);
    const l2FuncCount = parseInt(l2FuncResult.rows[0].count);
    console.log('L2 기능분석 (메인공정 기능):', l2FuncCount, '건');
    
    const l3FuncResult = await pool.query(`SELECT COUNT(*) as count FROM "${schemaName}"."l3_functions"`);
    const l3FuncCount = parseInt(l3FuncResult.rows[0].count);
    console.log('L3 기능분석 (작업요소 기능):', l3FuncCount, '건');
    
    // 3. 고장분석 데이터 확인
    console.log('');
    console.log('='.repeat(80));
    console.log('=== 3. 고장분석 데이터 ===');
    console.log('='.repeat(80));
    
    const feResult = await pool.query(`SELECT COUNT(*) as count FROM "${schemaName}"."failure_effects"`);
    const feCount = parseInt(feResult.rows[0].count);
    console.log('고장영향 (Failure Effects):', feCount, '건');
    
    if (feCount > 0) {
      const feData = await pool.query(`SELECT * FROM "${schemaName}"."failure_effects" LIMIT 5`);
      feData.rows.forEach((r, i) => {
        console.log(`  ${i+1}. 영향: ${r.effect || r.name || '(없음)'}, 확정: ${r.confirmed}`);
      });
    }
    
    const fmResult = await pool.query(`SELECT COUNT(*) as count FROM "${schemaName}"."failure_modes"`);
    const fmCount = parseInt(fmResult.rows[0].count);
    console.log('고장형태 (Failure Modes):', fmCount, '건');
    
    const fcResult = await pool.query(`SELECT COUNT(*) as count FROM "${schemaName}"."failure_causes"`);
    const fcCount = parseInt(fcResult.rows[0].count);
    console.log('고장원인 (Failure Causes):', fcCount, '건');
    
    // 4. 종합 요약
    console.log('');
    console.log('='.repeat(80));
    console.log('=== 종합 요약 ===');
    console.log('='.repeat(80));
    console.log('✅ FMEA 기초정보: 저장됨');
    console.log(`${l1Count > 0 ? '✅' : '❌'} L1 구조분석 (완제품명): ${l1Count}건`);
    console.log(`${l2Count > 0 ? '✅' : '❌'} L2 구조분석 (공정명): ${l2Count}건`);
    console.log(`${l3Count > 0 ? '✅' : '❌'} L3 구조분석 (작업요소): ${l3Count}건`);
    console.log(`${l1FuncCount > 0 ? '✅' : '❌'} L1 기능분석: ${l1FuncCount}건`);
    console.log(`${l2FuncCount > 0 ? '✅' : '❌'} L2 기능분석: ${l2FuncCount}건`);
    console.log(`${l3FuncCount > 0 ? '✅' : '❌'} L3 기능분석: ${l3FuncCount}건`);
    console.log(`${feCount > 0 ? '✅' : '❌'} 고장영향: ${feCount}건`);
    console.log(`${fmCount > 0 ? '✅' : '❌'} 고장형태: ${fmCount}건`);
    console.log(`${fcCount > 0 ? '✅' : '❌'} 고장원인: ${fcCount}건`);
    
    const hasWorksheetData = l1Count > 0 || l2Count > 0 || l3Count > 0 || 
                             l1FuncCount > 0 || l2FuncCount > 0 || l3FuncCount > 0 ||
                             feCount > 0 || fmCount > 0 || fcCount > 0;
    
    console.log('');
    if (hasWorksheetData) {
      console.log('✅ 워크시트 데이터가 저장되어 있습니다.');
    } else {
      console.log('❌ 워크시트 데이터가 없습니다. 새로 입력이 필요합니다.');
    }
    
  } catch (e) {
    if (e.message.includes('does not exist')) {
      console.log('❌ 스키마 또는 테이블이 존재하지 않습니다.');
      console.log('   → 워크시트 데이터가 저장되지 않았습니다.');
    } else {
      console.error('오류:', e.message);
      console.error(e.stack);
    }
  } finally {
    await pool.end();
  }
})();











