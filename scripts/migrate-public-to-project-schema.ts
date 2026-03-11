/**
 * @file migrate-public-to-project-schema.ts
 * @description public 스키마의 워크시트 데이터를 프로젝트별 스키마로 마이그레이션
 * 
 * 실행: npx ts-node scripts/migrate-public-to-project-schema.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// 마이그레이션 대상 테이블 (순서 중요: FK 의존성 고려)
const MIGRATION_TABLES = [
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

function getProjectSchemaName(fmeaId: string): string {
  const base = String(fmeaId || '').trim().toLowerCase();
  const safe = base.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `pfmea_${safe || 'unknown'}`;
}

async function migratePublicToProjectSchema() {
  console.log('\n🚀 Public → 프로젝트 스키마 마이그레이션 시작\n');
  console.log(`DATABASE_URL: ${DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}\n`);

  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    // 1. public 스키마에서 고유한 fmeaId 목록 가져오기
    console.log('📋 public 스키마에서 fmeaId 목록 조회...');
    
    const fmeaIds = new Set<string>();
    
    for (const table of MIGRATION_TABLES) {
      try {
        const result = await client.query(
          `SELECT DISTINCT "fmeaId" FROM public."${table}" WHERE "fmeaId" IS NOT NULL`
        );
        result.rows.forEach(row => fmeaIds.add(row.fmeaId));
      } catch (e: any) {
        // 테이블이 없거나 컬럼이 없으면 스킵
        if (!e.message.includes('does not exist') && !e.message.includes('column')) {
          console.warn(`  ⚠️ ${table} 조회 실패:`, e.message);
        }
      }
    }

    if (fmeaIds.size === 0) {
      console.log('✅ 마이그레이션할 데이터가 없습니다.\n');
      return;
    }

    console.log(`\n📊 발견된 FMEA ID (${fmeaIds.size}개):`, Array.from(fmeaIds).join(', '));

    // 2. 각 fmeaId별로 프로젝트 스키마 생성 및 데이터 복사
    for (const fmeaId of fmeaIds) {
      const schema = getProjectSchemaName(fmeaId);
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📁 ${fmeaId} → ${schema}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // 스키마 생성
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      console.log(`  ✅ 스키마 "${schema}" 생성됨`);

      let totalMigrated = 0;

      for (const table of MIGRATION_TABLES) {
        try {
          // 테이블이 없으면 public에서 복제
          await client.query(
            `CREATE TABLE IF NOT EXISTS "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`
          );

          // 이미 프로젝트 스키마에 있는 데이터 확인 (중복 방지)
          const existingResult = await client.query(
            `SELECT COUNT(*) as cnt FROM "${schema}"."${table}" WHERE "fmeaId" = $1`,
            [fmeaId]
          );
          const existingCount = parseInt(existingResult.rows[0].cnt, 10);

          if (existingCount > 0) {
            console.log(`  ⏭️  ${table}: 이미 ${existingCount}개 존재 (스킵)`);
            continue;
          }

          // public에서 프로젝트 스키마로 데이터 복사
          const insertResult = await client.query(
            `INSERT INTO "${schema}"."${table}" 
             SELECT * FROM public."${table}" 
             WHERE "fmeaId" = $1
             ON CONFLICT DO NOTHING`,
            [fmeaId]
          );

          const migratedCount = insertResult.rowCount || 0;
          if (migratedCount > 0) {
            console.log(`  ✅ ${table}: ${migratedCount}개 마이그레이션`);
            totalMigrated += migratedCount;
          }
        } catch (e: any) {
          if (!e.message.includes('does not exist')) {
            console.warn(`  ⚠️ ${table} 마이그레이션 실패:`, e.message);
          }
        }
      }

      console.log(`  📊 총 ${totalMigrated}개 레코드 마이그레이션됨`);
    }

    console.log('\n✅ 마이그레이션 완료!\n');
    console.log('💡 주의: public 스키마의 원본 데이터는 유지됩니다.');
    console.log('   삭제하려면 별도로 수동 삭제해야 합니다.\n');

  } catch (error: any) {
    console.error('\n❌ 마이그레이션 오류:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migratePublicToProjectSchema();








