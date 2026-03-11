/**
 * DB 데이터 삭제 스크립트 (사용자/고객사 정보 보존)
 *
 * 보존: users, password_reset_tokens, access_logs, customers, biz_info_projects
 * 삭제: 나머지 전부 (FMEA, CP, PFD, APQP, 마스터 등)
 *
 * 실행: node scripts/clean-all-data.js
 */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public' });

// 보존 대상 테이블 (소문자)
const KEEP_TABLES = new Set([
  'users',
  'password_reset_tokens',
  'access_logs',
  'customers',
  'biz_info_projects',
  '_prisma_migrations',
]);

async function main() {
  // 1. 보존 테이블 현황
  console.log('=== 보존 대상 테이블 ===');
  for (const t of KEEP_TABLES) {
    if (t === '_prisma_migrations') continue;
    try {
      const count = await pool.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
      console.log(`  [보존] ${t}: ${count.rows[0].cnt}건`);
    } catch (e) {
      console.log(`  [보존] ${t}: 테이블 없음`);
    }
  }

  // 2. 데이터 있는 테이블 확인
  const tables = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );

  console.log('\n=== 삭제 대상 테이블 ===');
  const toClean = [];
  for (const t of tables.rows) {
    const name = t.tablename;
    if (KEEP_TABLES.has(name)) continue;
    try {
      const count = await pool.query(`SELECT COUNT(*) as cnt FROM "${name}"`);
      const cnt = parseInt(count.rows[0].cnt);
      if (cnt > 0) {
        console.log(`  ${name}: ${cnt}건`);
      }
      toClean.push(name);
    } catch (e) {
      // skip
    }
  }

  console.log(`\n총 ${toClean.length}개 테이블 삭제 예정\n`);

  // 3. TRUNCATE CASCADE (보존 테이블 제외)
  if (toClean.length > 0) {
    const truncateSQL = `TRUNCATE TABLE ${toClean.map(t => `"${t}"`).join(', ')} CASCADE`;
    console.log('실행 중...');
    await pool.query(truncateSQL);
    console.log(`✅ ${toClean.length}개 테이블 데이터 삭제 완료`);
  }

  // 4. 검증
  console.log('\n=== 삭제 후 검증 ===');
  for (const t of KEEP_TABLES) {
    if (t === '_prisma_migrations') continue;
    try {
      const count = await pool.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
      console.log(`  [보존 확인] ${t}: ${count.rows[0].cnt}건 ✅`);
    } catch (e) {
      // skip
    }
  }

  let leftover = 0;
  for (const t of toClean) {
    try {
      const count = await pool.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
      const cnt = parseInt(count.rows[0].cnt);
      if (cnt > 0) {
        console.log(`  ❌ ${t}: ${cnt}건 남음!`);
        leftover++;
      }
    } catch (e) { /* skip */ }
  }

  if (leftover === 0) {
    console.log('  ✅ 삭제 대상 테이블 모두 비어있음 — 정리 완료');
  }

  await pool.end();
}

main().catch(e => { console.error('에러:', e); process.exit(1); });
