/**
 * Fix Master FMEA parentFmeaId
 * Master FMEA는 본인 ID를 parentFmeaId로 설정
 */
const { Pool } = require('pg');

async function fixMasterParentId() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/fmea_db' 
  });
  
  try {
    // Master FMEA 스키마 찾기 (M 타입)
    const schemas = await pool.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name LIKE 'pfmea_pfm%'
      ORDER BY schema_name
    `);
    
    console.log(`📊 발견된 FMEA 스키마: ${schemas.rows.length}개\n`);
    
    for (const row of schemas.rows) {
      const schema = row.schema_name;
      
      try {
        // parentFmeaId 컬럼 추가 (없으면)
        await pool.query(`
          ALTER TABLE "${schema}"."FmeaInfo" 
          ADD COLUMN IF NOT EXISTS "parentFmeaId" TEXT,
          ADD COLUMN IF NOT EXISTS "parentFmeaType" TEXT
        `);
        
        // 현재 상태 확인
        const current = await pool.query(`
          SELECT "fmeaId", "fmeaType", "parentFmeaId", "parentFmeaType" 
          FROM "${schema}"."FmeaInfo" LIMIT 1
        `);
        
        if (current.rows.length > 0) {
          const info = current.rows[0];
          const fmeaType = info.fmeaType || 'P';
          
          // Master(M) FMEA는 본인 ID를 parentFmeaId로 설정
          if (fmeaType === 'M' && !info.parentFmeaId) {
            await pool.query(`
              UPDATE "${schema}"."FmeaInfo" 
              SET "parentFmeaId" = "fmeaId", "parentFmeaType" = 'M'
              WHERE "parentFmeaId" IS NULL
            `);
            console.log(`✅ [MASTER] ${schema}: parentFmeaId = ${info.fmeaId} (본인)`);
          } else if (fmeaType !== 'M' && !info.parentFmeaId) {
            console.log(`⚠️ [${fmeaType}] ${schema}: parentFmeaId 미설정 (상위 FMEA 지정 필요)`);
          } else {
            console.log(`✓ [${fmeaType}] ${schema}: parentFmeaId = ${info.parentFmeaId}`);
          }
        }
      } catch (e) {
        console.log(`⏭ ${schema}: FmeaInfo 테이블 없음`);
      }
    }
    
    console.log('\n✅ parentFmeaId 수정 완료');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

fixMasterParentId();











