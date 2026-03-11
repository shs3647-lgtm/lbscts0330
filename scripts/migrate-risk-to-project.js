/**
 * public.risk_analyses → 프로젝트 스키마로 마이그레이션
 * 
 * 문제: public 스키마에 42개의 리스크 데이터가 있고, 프로젝트 스키마(pfmea_pfm26_m001)에는 0개
 * 해결: public의 데이터를 각 fmeaId에 맞는 프로젝트 스키마로 복사
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/fmea_db';

async function migrateRiskData() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('=== 1. public.risk_analyses 현황 확인 ===');
    const publicRisks = await pool.query(`
      SELECT "fmeaId", COUNT(*) as cnt 
      FROM public.risk_analyses 
      GROUP BY "fmeaId"
    `);
    console.log('public.risk_analyses 데이터:', publicRisks.rows);
    
    if (publicRisks.rows.length === 0) {
      console.log('✅ public에 리스크 데이터 없음, 마이그레이션 불필요');
      return;
    }
    
    // 각 fmeaId별로 프로젝트 스키마로 복사
    for (const row of publicRisks.rows) {
      const fmeaId = row.fmeaId;
      const count = parseInt(row.cnt);
      
      // 스키마명 생성 (API와 동일한 규칙)
      const schema = `pfmea_${fmeaId.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
      
      console.log(`\n=== ${fmeaId} (${count}개) → ${schema} 마이그레이션 ===`);
      
      // 프로젝트 스키마 존재 확인
      const schemaExists = await pool.query(`
        SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)
      `, [schema]);
      
      if (!schemaExists.rows[0].exists) {
        console.log(`  ⚠️ 스키마 ${schema} 없음 - 생성 중...`);
        await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      }
      
      // 프로젝트 스키마에 테이블 존재 확인
      const tableExists = await pool.query(`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'risk_analyses'
        )
      `, [schema]);
      
      if (!tableExists.rows[0].exists) {
        console.log(`  ⚠️ ${schema}.risk_analyses 테이블 없음 - 생성 중...`);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "${schema}".risk_analyses 
          (LIKE public.risk_analyses INCLUDING ALL)
        `);
      }
      
      // 이미 데이터가 있는지 확인
      const existingCount = await pool.query(`
        SELECT COUNT(*) as cnt FROM "${schema}".risk_analyses WHERE "fmeaId" = $1
      `, [fmeaId]);
      
      if (parseInt(existingCount.rows[0].cnt) > 0) {
        console.log(`  ✅ 이미 ${existingCount.rows[0].cnt}개 데이터 있음 - 스킵`);
        continue;
      }
      
      // 데이터 복사
      const insertResult = await pool.query(`
        INSERT INTO "${schema}".risk_analyses (
          id, "fmeaId", "linkId", severity, occurrence, detection, ap,
          "preventionControl", "detectionControl", "createdAt", "updatedAt"
        )
        SELECT 
          id, "fmeaId", "linkId", severity, occurrence, detection, ap,
          "preventionControl", "detectionControl", "createdAt", "updatedAt"
        FROM public.risk_analyses
        WHERE "fmeaId" = $1
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `, [fmeaId]);
      
      console.log(`  ✅ ${insertResult.rowCount}개 복사 완료`);
    }
    
    // 최종 확인
    console.log('\n=== 2. 마이그레이션 후 확인 ===');
    for (const row of publicRisks.rows) {
      const fmeaId = row.fmeaId;
      const schema = `pfmea_${fmeaId.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
      
      try {
        const projectCount = await pool.query(`
          SELECT COUNT(*) as cnt FROM "${schema}".risk_analyses WHERE "fmeaId" = $1
        `, [fmeaId]);
        console.log(`  ${schema}.risk_analyses: ${projectCount.rows[0].cnt}개`);
      } catch (e) {
        console.log(`  ${schema}.risk_analyses: 에러 - ${e.message}`);
      }
    }
    
    console.log('\n✅ 마이그레이션 완료!');
    
  } catch (err) {
    console.error('❌ 에러:', err);
  } finally {
    await pool.end();
  }
}

migrateRiskData();







