/**
 * DB 연결 정보 및 모든 스키마/테이블 조회
 */
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' 
});

(async () => {
  console.log('=== DB 연결 정보 ===');
  console.log('DATABASE_URL:', process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db');
  console.log('');
  
  try {
    // 1. 모든 FMEA 스키마 조회
    const schemasResult = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'pfmea_pfm%' 
      ORDER BY schema_name
    `);
    
    console.log('=== FMEA 스키마 목록 ===');
    console.log(`총 ${schemasResult.rows.length}개 스키마 발견`);
    schemasResult.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.schema_name}`);
    });
    console.log('');
    
    // 2. 각 스키마의 FmeaInfo 데이터 조회
    for (const row of schemasResult.rows) {
      const schemaName = row.schema_name;
      console.log(`\n=== [${schemaName}] FmeaInfo 데이터 ===`);
      
      try {
        // 먼저 테이블 구조 확인
        const tableInfo = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = 'FmeaInfo'
          ORDER BY ordinal_position
        `, [schemaName]);
        
        console.log('테이블 컬럼:', tableInfo.rows.map(r => r.column_name).join(', '));
        
        // cftMembers 컬럼 존재 여부 확인
        const hasCftMembers = tableInfo.rows.some(r => r.column_name === 'cftMembers');
        
        const infoResult = await pool.query(`
          SELECT 
            "fmeaId",
            "fmeaType",
            project,
            "fmeaInfo",
            ${hasCftMembers ? '"cftMembers",' : 'NULL as "cftMembers",'}
            "createdAt",
            "updatedAt"
          FROM "${schemaName}"."FmeaInfo"
          ORDER BY "updatedAt" DESC
          LIMIT 1
        `);
        
        if (infoResult.rows.length > 0) {
          const data = infoResult.rows[0];
          const project = typeof data.project === 'string' ? JSON.parse(data.project) : data.project;
          const fmeaInfo = typeof data.fmeaInfo === 'string' ? JSON.parse(data.fmeaInfo) : data.fmeaInfo;
          const cftMembers = typeof data.cftMembers === 'string' ? JSON.parse(data.cftMembers || '[]') : (data.cftMembers || []);
          
          console.log('FMEA ID:', data.fmeaId);
          console.log('FMEA Type:', data.fmeaType);
          console.log('Project:', JSON.stringify(project, null, 2));
          console.log('FMEA Info:', JSON.stringify(fmeaInfo, null, 2));
          console.log('CFT Members:', cftMembers.length, '명');
          console.log('Created:', data.createdAt);
          console.log('Updated:', data.updatedAt);
          
          // 핵심 필드 확인
          console.log('\n--- 핵심 필드 ---');
          console.log('엔지니어링위치:', fmeaInfo?.engineeringLocation || '(없음)');
          console.log('공정책임:', fmeaInfo?.designResponsibility || '(없음)');
          console.log('개정연월일:', fmeaInfo?.fmeaRevisionDate || '(없음)');
          console.log('기밀유지수준:', fmeaInfo?.confidentialityLevel || '(없음)');
        } else {
          console.log('데이터 없음');
        }
      } catch (e) {
        console.log('테이블 없음 또는 조회 실패:', e.message);
      }
    }
    
  } catch (e) {
    console.error('오류:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
})();

