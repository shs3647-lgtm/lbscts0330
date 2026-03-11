/**
 * DB 전체 구조 및 데이터 상세 확인
 */
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' 
});

(async () => {
  console.log('='.repeat(80));
  console.log('=== PostgreSQL DB 전체 구조 및 데이터 확인 ===');
  console.log('='.repeat(80));
  console.log('');
  console.log('DB 연결 정보:');
  console.log('  URL: postgresql://postgres:postgres@localhost:5432/fmea_db');
  console.log('');
  
  try {
    // 1. 모든 스키마 조회
    const schemasResult = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    
    console.log('='.repeat(80));
    console.log('=== 1. 데이터베이스 스키마 목록 ===');
    console.log('='.repeat(80));
    schemasResult.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.schema_name}`);
    });
    console.log('');
    
    // 2. FMEA 스키마 상세 정보
    const fmeaSchemas = schemasResult.rows.filter(r => r.schema_name.startsWith('pfmea_'));
    
    for (const schemaRow of fmeaSchemas) {
      const schemaName = schemaRow.schema_name;
      const fmeaId = schemaName.replace('pfmea_', '').replace(/_/g, '-').replace(/pfm(\d+)-([mfp])(\d+)/i, 
        (_, year, type, num) => `pfm${year}-${type.toUpperCase()}${num}`
      );
      
      console.log('='.repeat(80));
      console.log(`=== 2. 스키마: ${schemaName} (FMEA ID: ${fmeaId}) ===`);
      console.log('='.repeat(80));
      
      // 테이블 목록 조회
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1
        ORDER BY table_name
      `, [schemaName]);
      
      console.log(`\n테이블 목록 (${tablesResult.rows.length}개):`);
      tablesResult.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ${row.table_name}`);
      });
      console.log('');
      
      // FmeaInfo 테이블 상세 조회
      if (tablesResult.rows.some(r => r.table_name === 'FmeaInfo')) {
        console.log('--- FmeaInfo 테이블 컬럼 구조 ---');
        const columnsResult = await pool.query(`
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = 'FmeaInfo'
          ORDER BY ordinal_position
        `, [schemaName]);
        
        columnsResult.rows.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL 가능)' : '(NOT NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
        });
        console.log('');
        
        // 실제 데이터 조회
        try {
          const dataResult = await pool.query(`
            SELECT * FROM "${schemaName}"."FmeaInfo" 
            ORDER BY "updatedAt" DESC
            LIMIT 1
          `);
          
          if (dataResult.rows.length > 0) {
            const row = dataResult.rows[0];
            console.log('--- 실제 저장된 데이터 ---');
            console.log('');
            
            // 각 필드 상세 출력
            console.log('기본 필드:');
            console.log(`  id: ${row.id}`);
            console.log(`  fmeaId: ${row.fmeaId}`);
            console.log(`  fmeaType: ${row.fmeaType || '(NULL)'}`);
            console.log(`  parentFmeaId: ${row.parentFmeaId || '(NULL)'}`);
            console.log(`  structureConfirmed: ${row.structureConfirmed}`);
            console.log(`  createdAt: ${row.createdAt}`);
            console.log(`  updatedAt: ${row.updatedAt}`);
            console.log('');
            
            // project JSONB 파싱
            let project = {};
            if (row.project) {
              project = typeof row.project === 'string' ? JSON.parse(row.project) : row.project;
              console.log('project (JSONB):');
              console.log(JSON.stringify(project, null, 2));
              console.log('');
            } else {
              console.log('project: (NULL 또는 빈 객체)');
              console.log('');
            }
            
            // fmeaInfo JSONB 파싱
            let fmeaInfo = {};
            if (row.fmeaInfo) {
              fmeaInfo = typeof row.fmeaInfo === 'string' ? JSON.parse(row.fmeaInfo) : row.fmeaInfo;
              console.log('fmeaInfo (JSONB):');
              console.log(JSON.stringify(fmeaInfo, null, 2));
              console.log('');
              
              // 누락 필드 확인
              console.log('--- 누락 필드 확인 ---');
              const requiredFields = [
                { key: 'engineeringLocation', label: '엔지니어링위치' },
                { key: 'designResponsibility', label: '공정책임' },
                { key: 'fmeaRevisionDate', label: '개정연월일' },
                { key: 'confidentialityLevel', label: '기밀유지수준' },
                { key: 'fmeaResponsibleName', label: 'FMEA 책임자명' },
                { key: 'companyName', label: '회사명' },
                { key: 'customerName', label: '고객명' },
              ];
              
              requiredFields.forEach(field => {
                const value = fmeaInfo[field.key];
                const status = value && value.trim() ? '✅ 있음' : '❌ 없음';
                console.log(`  ${field.label} (${field.key}): ${status} ${value ? `"${value}"` : ''}`);
              });
            } else {
              console.log('fmeaInfo: (NULL 또는 빈 객체)');
            }
            
            // cftMembers 확인
            if (row.cftMembers) {
              const cftMembers = typeof row.cftMembers === 'string' ? JSON.parse(row.cftMembers) : row.cftMembers;
              console.log('');
              console.log('cftMembers (JSONB):');
              console.log(JSON.stringify(cftMembers, null, 2));
              console.log(`CFT 멤버 수: ${Array.isArray(cftMembers) ? cftMembers.length : 0}명`);
            } else {
              console.log('');
              console.log('cftMembers: (NULL - 컬럼이 없거나 데이터 없음)');
            }
            
          } else {
            console.log('데이터 없음 (테이블은 있지만 행이 없음)');
          }
        } catch (e) {
          console.error(`데이터 조회 실패: ${e.message}`);
        }
      } else {
        console.log('FmeaInfo 테이블이 없습니다.');
      }
    }
    
    console.log('');
    console.log('='.repeat(80));
    console.log('=== 확인 완료 ===');
    console.log('='.repeat(80));
    
  } catch (e) {
    console.error('오류:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
})();











