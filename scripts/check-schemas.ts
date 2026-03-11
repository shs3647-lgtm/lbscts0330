import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSchemas() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // 1. FMEA 스키마 목록 조회
    console.log('\n=== 📦 DB에 저장된 FMEA 스키마 목록 ===\n');
    const schemas = await pool.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfm%' ORDER BY schema_name;"
    );
    
    if (schemas.rows.length === 0) {
      console.log('❌ 저장된 FMEA 스키마 없음\n');
    } else {
      schemas.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.schema_name}`);
      });
      console.log(`\n총 ${schemas.rows.length}개 스키마\n`);
    }
    
    // 2. public 스키마의 fmea_legacy_data 테이블 조회
    console.log('\n=== 📄 FmeaLegacyData 테이블 (fmeaId 목록) ===\n');
    const legacyData = await pool.query(
      "SELECT \"fmeaId\", \"createdAt\", \"updatedAt\" FROM public.\"FmeaLegacyData\" ORDER BY \"fmeaId\";"
    );
    
    if (legacyData.rows.length === 0) {
      console.log('❌ 저장된 레거시 데이터 없음\n');
    } else {
      legacyData.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.fmeaId} (updated: ${row.updatedAt})`);
      });
      console.log(`\n총 ${legacyData.rows.length}개 FMEA\n`);
    }
    
    // 3. FmeaConfirmedState 테이블 조회
    console.log('\n=== ✅ FmeaConfirmedState 테이블 (확정 상태) ===\n');
    const confirmedStates = await pool.query(
      "SELECT \"fmeaId\", \"structureConfirmed\", \"l1Confirmed\", \"l2Confirmed\", \"l3Confirmed\", \"failureLinkConfirmed\", \"riskConfirmed\", \"optConfirmed\" FROM public.\"FmeaConfirmedState\" ORDER BY \"fmeaId\";"
    );
    
    if (confirmedStates.rows.length === 0) {
      console.log('❌ 저장된 확정 상태 없음\n');
    } else {
      confirmedStates.rows.forEach((row, i) => {
        const stages = [];
        if (row.structureConfirmed) stages.push('구조✓');
        if (row.l1Confirmed) stages.push('L1✓');
        if (row.l2Confirmed) stages.push('L2✓');
        if (row.l3Confirmed) stages.push('L3✓');
        if (row.failureLinkConfirmed) stages.push('고장연결✓');
        if (row.riskConfirmed) stages.push('리스크✓');
        if (row.optConfirmed) stages.push('최적화✓');
        console.log(`  ${i + 1}. ${row.fmeaId} [${stages.join(', ') || '미확정'}]`);
      });
      console.log(`\n총 ${confirmedStates.rows.length}개 상태\n`);
    }
    
  } catch (e: any) {
    console.error('❌ 오류:', e.message);
  } finally {
    await pool.end();
  }
}

checkSchemas();












