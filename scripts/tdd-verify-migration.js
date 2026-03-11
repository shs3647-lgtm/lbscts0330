/**
 * TDD 검증: 프로젝트 스키마 마이그레이션 테스트
 */
const { Pool } = require('pg');

async function verify() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
  
  console.log('=== TDD 검증: 프로젝트 스키마 마이그레이션 ===\n');
  
  const tests = [];
  const schema = 'pfmea_pfm26_m001';
  
  try {
    // 테스트 1: 프로젝트 스키마 존재 확인
    const schemaExists = await pool.query(
      `SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)`, 
      [schema]
    );
    tests.push({ name: '1. 프로젝트 스키마 존재', pass: schemaExists.rows[0].exists });
    
    // 테스트 2: risk_analyses 테이블에 데이터 있음
    const riskCount = await pool.query(`SELECT COUNT(*) as cnt FROM ${schema}.risk_analyses`);
    tests.push({ name: '2. risk_analyses 데이터 42개', pass: parseInt(riskCount.rows[0].cnt) === 42, actual: riskCount.rows[0].cnt });
    
    // 테스트 3: failure_links 테이블에 데이터 있음
    const linkCount = await pool.query(`SELECT COUNT(*) as cnt FROM ${schema}.failure_links`);
    tests.push({ name: '3. failure_links 데이터 42개', pass: parseInt(linkCount.rows[0].cnt) === 42, actual: linkCount.rows[0].cnt });
    
    // 테스트 4: l1_structures 존재
    const l1Count = await pool.query(`SELECT COUNT(*) as cnt FROM ${schema}.l1_structures`);
    tests.push({ name: '4. l1_structures 데이터 1개', pass: parseInt(l1Count.rows[0].cnt) === 1, actual: l1Count.rows[0].cnt });
    
    // 테스트 5: fmea_legacy_data 존재
    const legacyCount = await pool.query(`SELECT COUNT(*) as cnt FROM ${schema}.fmea_legacy_data`);
    tests.push({ name: '5. fmea_legacy_data 데이터 1개', pass: parseInt(legacyCount.rows[0].cnt) === 1, actual: legacyCount.rows[0].cnt });
    
    // 테스트 6: failure_analyses 존재
    const faCount = await pool.query(`SELECT COUNT(*) as cnt FROM ${schema}.failure_analyses`);
    tests.push({ name: '6. failure_analyses 데이터 42개', pass: parseInt(faCount.rows[0].cnt) === 42, actual: faCount.rows[0].cnt });
    
    // 결과 출력
    let allPass = true;
    tests.forEach(t => {
      const status = t.pass ? '✅' : '❌';
      const extra = t.actual !== undefined ? ` (실제: ${t.actual})` : '';
      console.log(`${status} ${t.name}${extra}`);
      if (!t.pass) allPass = false;
    });
    
    console.log('\n' + (allPass ? '🎉 모든 테스트 통과!' : '❌ 일부 테스트 실패'));
    
    await pool.end();
    process.exit(allPass ? 0 : 1);
    
  } catch (err) {
    console.error('❌ 테스트 실행 오류:', err.message);
    await pool.end();
    process.exit(1);
  }
}

verify();







