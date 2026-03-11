/**
 * DB에 저장된 실제 데이터 확인
 */
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' 
});

(async () => {
  const inputFmeaId = process.argv[2] || 'pfm26-M001';
  const fmeaId = inputFmeaId.toLowerCase(); // DB에는 소문자로 저장되어 있음
  const schemaName = `pfmea_${fmeaId.replace(/-/g, '_')}`;
  
  console.log('=== DB 실제 저장 데이터 확인 ===');
  console.log('입력 FMEA ID:', inputFmeaId);
  console.log('조회 FMEA ID:', fmeaId);
  console.log('Schema:', schemaName);
  console.log('');
  
  try {
    // FmeaInfo 테이블 조회 (대소문자 구분 없이)
    const result = await pool.query(`
      SELECT * FROM "${schemaName}"."FmeaInfo" 
      WHERE LOWER("fmeaId") = LOWER($1)
      LIMIT 1
    `, [fmeaId]);
    
    if (result.rows.length === 0) {
      console.log('❌ 데이터 없음');
      return;
    }
    
    const row = result.rows[0];
    
    console.log('=== FmeaInfo 테이블 원본 데이터 ===');
    console.log(JSON.stringify(row, null, 2));
    console.log('');
    
    console.log('=== 파싱된 project 데이터 ===');
    const project = typeof row.project === 'string' ? JSON.parse(row.project) : row.project;
    console.log(JSON.stringify(project, null, 2));
    console.log('');
    
    console.log('=== 파싱된 fmeaInfo 데이터 ===');
    const fmeaInfo = typeof row.fmeaInfo === 'string' ? JSON.parse(row.fmeaInfo) : row.fmeaInfo;
    console.log(JSON.stringify(fmeaInfo, null, 2));
    console.log('');
    
    console.log('=== 파싱된 cftMembers 데이터 ===');
    const cftMembers = typeof row.cftMembers === 'string' ? JSON.parse(row.cftMembers || '[]') : (row.cftMembers || []);
    console.log(JSON.stringify(cftMembers, null, 2));
    console.log('');
    
    console.log('=== 핵심 필드 확인 ===');
    console.log('fmeaId:', row.fmeaId);
    console.log('fmeaType:', row.fmeaType);
    console.log('엔지니어링위치 (engineeringLocation):', fmeaInfo?.engineeringLocation || '(없음)');
    console.log('공정책임 (designResponsibility):', fmeaInfo?.designResponsibility || '(없음)');
    console.log('개정연월일 (fmeaRevisionDate):', fmeaInfo?.fmeaRevisionDate || '(없음)');
    console.log('개정일자 (fmeaRevisionDate):', fmeaInfo?.fmeaRevisionDate || '(없음)');
    console.log('FMEA명 (subject):', fmeaInfo?.subject || '(없음)');
    console.log('회사명 (customerName):', fmeaInfo?.customerName || project?.customer || '(없음)');
    console.log('프로젝트명 (projectName):', project?.projectName || '(없음)');
    
  } catch (e) {
    console.error('오류:', e.message);
    console.error(e.stack);
  } finally {
    if (pool && !pool.ended) {
      await pool.end();
    }
  }
})();

