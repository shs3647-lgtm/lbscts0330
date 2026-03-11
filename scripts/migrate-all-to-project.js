/**
 * public 스키마의 모든 프로젝트별 데이터 → 프로젝트 스키마로 마이그레이션
 * 
 * 문제: public 스키마에 저장된 프로젝트별 데이터가 프로젝트 스키마로 분리되지 않음
 * 해결: fmeaId 기준으로 각 프로젝트 스키마(pfmea_xxx)로 데이터 복사
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/fmea_db';

// 프로젝트별로 분리해야 할 테이블들 (fmeaId 기준)
const PROJECT_TABLES = [
  'l1_structures',
  'l2_structures', 
  'l3_structures',
  'l1_functions',
  'l2_functions',
  'l3_functions',
  'failure_effects',
  'failure_modes',
  'failure_causes',
  'failure_links',
  'failure_analyses',
  'risk_analyses',
  'optimizations',
  'fmea_confirmed_states',
  'fmea_legacy_data',
];

function getSchemaName(fmeaId) {
  const base = String(fmeaId || '').trim().toLowerCase();
  const safe = base.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `pfmea_${safe || 'unknown'}`;
}

async function migrateAllData() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('=== 1. public 스키마에서 fmeaId 목록 수집 ===\n');
    
    // 모든 테이블에서 고유한 fmeaId 수집
    const fmeaIds = new Set();
    
    for (const table of PROJECT_TABLES) {
      try {
        const result = await pool.query(`
          SELECT DISTINCT "fmeaId" FROM public.${table} WHERE "fmeaId" IS NOT NULL
        `);
        result.rows.forEach(r => fmeaIds.add(r.fmeaId));
      } catch (e) {
        // 테이블 없으면 스킵
      }
    }
    
    console.log('발견된 fmeaId들:', Array.from(fmeaIds));
    
    if (fmeaIds.size === 0) {
      console.log('\n✅ public에 마이그레이션할 데이터 없음');
      return;
    }
    
    // 각 fmeaId별로 처리
    for (const fmeaId of fmeaIds) {
      const schema = getSchemaName(fmeaId);
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 ${fmeaId} → ${schema} 마이그레이션`);
      console.log('='.repeat(60));
      
      // 스키마 생성
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      
      for (const table of PROJECT_TABLES) {
        try {
          // public에 테이블이 있는지 확인
          const publicExists = await pool.query(`
            SELECT EXISTS(
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = $1
            )
          `, [table]);
          
          if (!publicExists.rows[0].exists) {
            continue;
          }
          
          // public에 해당 fmeaId 데이터가 있는지
          const publicCount = await pool.query(`
            SELECT COUNT(*) as cnt FROM public.${table} WHERE "fmeaId" = $1
          `, [fmeaId]);
          
          const cnt = parseInt(publicCount.rows[0].cnt);
          if (cnt === 0) continue;
          
          // 프로젝트 스키마에 테이블 생성
          await pool.query(`
            CREATE TABLE IF NOT EXISTS "${schema}".${table}
            (LIKE public.${table} INCLUDING ALL)
          `);
          
          // 이미 있는지 확인
          const projectCount = await pool.query(`
            SELECT COUNT(*) as cnt FROM "${schema}".${table} WHERE "fmeaId" = $1
          `, [fmeaId]);
          
          if (parseInt(projectCount.rows[0].cnt) > 0) {
            console.log(`  ✓ ${table}: 이미 ${projectCount.rows[0].cnt}개 있음 (public: ${cnt}개)`);
            continue;
          }
          
          // 컬럼 목록 가져오기
          const columns = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `, [table]);
          
          const columnList = columns.rows.map(c => `"${c.column_name}"`).join(', ');
          
          // 데이터 복사
          const insertResult = await pool.query(`
            INSERT INTO "${schema}".${table} (${columnList})
            SELECT ${columnList} FROM public.${table} WHERE "fmeaId" = $1
            ON CONFLICT DO NOTHING
          `, [fmeaId]);
          
          console.log(`  ✅ ${table}: ${cnt}개 복사됨`);
          
        } catch (e) {
          console.log(`  ⚠️ ${table}: ${e.message.substring(0, 50)}`);
        }
      }
    }
    
    console.log('\n\n=== 2. 마이그레이션 결과 요약 ===\n');
    
    for (const fmeaId of fmeaIds) {
      const schema = getSchemaName(fmeaId);
      console.log(`\n📂 ${schema}:`);
      
      for (const table of PROJECT_TABLES) {
        try {
          const result = await pool.query(`
            SELECT COUNT(*) as cnt FROM "${schema}".${table} WHERE "fmeaId" = $1
          `, [fmeaId]);
          const cnt = parseInt(result.rows[0].cnt);
          if (cnt > 0) {
            console.log(`  ${table}: ${cnt}개`);
          }
        } catch (e) {
          // skip
        }
      }
    }
    
    console.log('\n\n✅ 전체 마이그레이션 완료!');
    
  } catch (err) {
    console.error('❌ 에러:', err);
  } finally {
    await pool.end();
  }
}

migrateAllData();







