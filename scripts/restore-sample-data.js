/**
 * 샘플 FMEA 데이터 복구 스크립트
 * 실행: node scripts/restore-sample-data.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db'
});

async function restoreSampleData() {
  const fmeaId = 'pfm26-M001';
  const schemaName = `pfmea_${fmeaId.replace(/-/g, '_').toLowerCase()}`;
  
  console.log(`🔧 스키마: ${schemaName}`);
  
  try {
    // 스키마 생성
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    
    // FmeaInfo 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."FmeaInfo" (
        "fmeaId" TEXT PRIMARY KEY,
        "fmeaType" TEXT,
        project JSONB,
        "fmeaInfo" JSONB,
        "parentFmeaId" TEXT,
        status TEXT DEFAULT 'active',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // FmeaLegacyData 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."FmeaLegacyData" (
        "fmeaId" TEXT PRIMARY KEY,
        data JSONB,
        version INTEGER DEFAULT 1,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 샘플 데이터
    const worksheetData = {
      fmeaId: 'pfm26-M001',
      l1: { id: 'l1-001', name: '완제품 제조라인', types: [], failureScopes: [] },
      l2: [
        {
          id: 'l2-001', no: '10', name: '자재입고', order: 10,
          functions: [], productChars: [],
          l3: [{ id: 'l3-001', m4: 'MN', name: '00작업자', order: 10, functions: [], processChars: [] }]
        },
        {
          id: 'l2-002', no: '20', name: '수입검사', order: 20,
          functions: [], productChars: [],
          l3: [{ id: 'l3-002', m4: 'MN', name: '00검사원', order: 10, functions: [], processChars: [] }]
        }
      ],
      failureLinks: [],
      structureConfirmed: true,
      tab: 'structure',
      visibleSteps: [2,3,4,5,6]
    };
    
    const projectData = {
      projectName: 'SDD New FMEA개발',
      customer: '현대자동차',
      productName: '완제품 제조라인'
    };
    
    const fmeaInfoData = {
      subject: 'SDD New FMEA개발',
      modelYear: '2026',
      fmeaStartDate: '2026-01-10'
    };
    
    // 테이블 구조 확인
    const columnsResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = 'FmeaInfo'
    `, [schemaName]);
    console.log('FmeaInfo 컬럼:', columnsResult.rows.map(r => r.column_name).join(', '));
    
    // 기존 데이터 삭제 후 삽입 (id 포함)
    await pool.query(`DELETE FROM "${schemaName}"."FmeaInfo" WHERE "fmeaId" = $1`, [fmeaId]);
    await pool.query(`
      INSERT INTO "${schemaName}"."FmeaInfo" (id, "fmeaId", "fmeaType", project, "fmeaInfo")
      VALUES ($1, $2, $3, $4, $5)
    `, ['info-001', fmeaId, 'M', JSON.stringify(projectData), JSON.stringify(fmeaInfoData)]);
    
    // FmeaLegacyData 테이블 구조 확인
    const legacyColumnsResult = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = 'FmeaLegacyData'
    `, [schemaName]);
    console.log('FmeaLegacyData 컬럼:', legacyColumnsResult.rows.map(r => r.column_name).join(', '));
    
    // FmeaLegacyData 저장 (id 컬럼 포함)
    await pool.query(`DELETE FROM "${schemaName}"."FmeaLegacyData" WHERE "fmeaId" = $1`, [fmeaId]);
    await pool.query(`
      INSERT INTO "${schemaName}"."FmeaLegacyData" (id, "fmeaId", "legacyData", "legacyVersion")
      VALUES ($1, $2, $3, $4)
    `, ['legacy-001', fmeaId, JSON.stringify(worksheetData), 1]);
    
    console.log('✅ 샘플 데이터 복구 완료!');
    console.log('');
    console.log('📋 복구된 데이터:');
    console.log('  - FMEA ID: pfm26-M001');
    console.log('  - FMEA명: SDD New FMEA개발');
    console.log('  - 완제품: 완제품 제조라인');
    console.log('  - 공정: 10 자재입고, 20 수입검사');
    console.log('  - 작업요소: 00작업자, 00검사원');
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await pool.end();
  }
}

restoreSampleData();

