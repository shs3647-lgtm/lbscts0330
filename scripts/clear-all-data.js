/**
 * @file clear-all-data.js
 * @description FMEA 기초정보 + 워크시트 데이터만 삭제하는 스크립트
 *
 * ┌──────────────────────────────────────────────────────┐
 * │  ⚠️  삭제 정책 (2026-02-17)                           │
 * │                                                      │
 * │  ✅ 삭제 대상: FMEA/CP/PFD/APQP 프로젝트 + 마스터    │
 * │               워크시트, 구조분석, 고장분석, 리스크 등  │
 * │                                                      │
 * │  ❌ 보존 대상: 사용자(users), 고객사(customers),       │
 * │               SOD 평가기준, 특별특성 기준,             │
 * │               접속로그, 대시보드 캐시                  │
 * └──────────────────────────────────────────────────────┘
 *
 * 사용법: DATABASE_URL="postgresql://..." node scripts/clear-all-data.js
 */

const { Pool } = require('pg');

// ───────────────────────────────────────────────
// 보존 테이블 목록 (절대 삭제하지 않음)
// ───────────────────────────────────────────────
const PRESERVED_TABLES = [
  // 사용자 관리
  'users',
  'password_reset_tokens',

  // 고객사
  'customers',

  // SOD 평가기준 (PFMEA)
  'pfmea_severity_criteria',
  'pfmea_occurrence_criteria',
  'pfmea_detection_criteria',

  // SOD 평가기준 (DFMEA)
  'dfmea_severity_criteria',
  'dfmea_occurrence_criteria',
  'dfmea_detection_criteria',

  // 특별특성 기준
  'special_characteristic_criteria',

  // 접속로그 / 대시보드
  'access_logs',
  'dashboard_stats_cache',
  'kpi_snapshots',
  'quality_trends',

  // Prisma 마이그레이션 (시스템)
  '_prisma_migrations',
];

async function clearFmeaData() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });
  console.log('=== FMEA 데이터 초기화 시작 ===');
  console.log('(사용자/고객사/SOD기준/특별특성은 보존됩니다)\n');

  try {
    // 1. 전체 테이블 목록 조회
    const allTables = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    // 2. 삭제 대상 테이블 필터링 (보존 목록에 없는 테이블)
    const tablesToDelete = allTables.rows
      .map(r => r.tablename)
      .filter(t => !PRESERVED_TABLES.includes(t));

    // 3. 삭제 전 데이터 현황
    console.log('📊 삭제 전 데이터 현황:');
    let totalBefore = 0;

    for (const table of tablesToDelete) {
      try {
        const result = await pool.query(`SELECT count(*)::int as cnt FROM "${table}"`);
        const cnt = result.rows[0].cnt;
        if (cnt > 0) {
          console.log(`  🗑️  ${table}: ${cnt}건`);
          totalBefore += cnt;
        }
      } catch { /* 테이블 접근 오류 무시 */ }
    }

    // 보존 테이블 현황
    console.log('\n📋 보존 데이터 현황:');
    for (const table of PRESERVED_TABLES) {
      if (table === '_prisma_migrations') continue;
      try {
        const result = await pool.query(`SELECT count(*)::int as cnt FROM "${table}"`);
        const cnt = result.rows[0].cnt;
        if (cnt > 0) {
          console.log(`  ✅  ${table}: ${cnt}건 (보존)`);
        }
      } catch { /* 테이블이 없을 수 있음 */ }
    }

    if (totalBefore === 0) {
      console.log('\n✅ 삭제 대상 테이블에 이미 데이터가 없습니다.');
      await pool.end();
      return;
    }

    console.log(`\n  --- 삭제 예정: ${totalBefore}건\n`);

    // 4. TRUNCATE CASCADE — 삭제 대상 테이블만
    console.log('🗑️ TRUNCATE CASCADE 실행...');
    if (tablesToDelete.length > 0) {
      const quoted = tablesToDelete.map(t => `"${t}"`).join(', ');
      await pool.query(`TRUNCATE TABLE ${quoted} CASCADE`);
    }
    console.log('  ✅ FMEA 데이터 TRUNCATE 완료\n');

    // 5. 삭제 후 확인
    console.log('📊 삭제 후 확인:');
    let remaining = 0;
    for (const table of tablesToDelete) {
      try {
        const result = await pool.query(`SELECT count(*)::int as cnt FROM "${table}"`);
        const cnt = result.rows[0].cnt;
        if (cnt > 0) {
          console.log(`  ⚠️ ${table}: ${cnt}건 남음`);
          remaining += cnt;
        }
      } catch { /* 무시 */ }
    }

    if (remaining === 0) {
      console.log('  ✅ FMEA 데이터 모두 삭제 완료!');
    }

    // 보존 확인
    console.log('\n📋 보존 데이터 확인:');
    for (const table of PRESERVED_TABLES) {
      if (table === '_prisma_migrations') continue;
      try {
        const result = await pool.query(`SELECT count(*)::int as cnt FROM "${table}"`);
        const cnt = result.rows[0].cnt;
        if (cnt > 0) {
          console.log(`  ✅ ${table}: ${cnt}건 (보존 완료)`);
        }
      } catch { /* 무시 */ }
    }

  } catch (e) {
    console.error('❌ 오류:', e.message);
  }

  await pool.end();
  console.log('\n=== FMEA 데이터 초기화 완료 ===');
}

clearFmeaData();
