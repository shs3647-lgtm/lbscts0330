/**
 * "번-" 접두사 전체 정리 스크립트
 * 패턴: "20번-PDA 스캐너" → "PDA 스캐너"
 *        "10번 운반부품" → "운반부품"
 */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

async function run() {
  const client = await pool.connect();
  try {
    // ============================================================
    // 1. failure_links.fmText — "20번-부품명-고장형태" → "부품명-고장형태"
    // ============================================================
    const r1 = await client.query(`
      UPDATE failure_links
      SET "fmText" = regexp_replace("fmText", '^\\d+번[-\\s]?', '')
      WHERE "fmText" ~ '^\\d+번[-\\s]'
    `);
    console.log(`[1] failure_links.fmText: ${r1.rowCount} rows updated`);

    // ============================================================
    // 2. failure_links.fcText — 동일 패턴
    // ============================================================
    const r2 = await client.query(`
      UPDATE failure_links
      SET "fcText" = regexp_replace("fcText", '^\\d+번[-\\s]?', '')
      WHERE "fcText" ~ '^\\d+번[-\\s]'
    `);
    console.log(`[2] failure_links.fcText: ${r2.rowCount} rows updated`);

    // ============================================================
    // 3. l3_functions.processChar — 동일 패턴
    // ============================================================
    const r3 = await client.query(`
      UPDATE l3_functions
      SET "processChar" = regexp_replace("processChar", '^\\d+번[-\\s]?', '')
      WHERE "processChar" ~ '^\\d+번[-\\s]'
    `);
    console.log(`[3] l3_functions.processChar: ${r3.rowCount} rows updated`);

    // ============================================================
    // 4. l3_structures.name — 재확인 (이전에 정리했지만 혹시 남아있으면)
    // ============================================================
    const r4 = await client.query(`
      UPDATE l3_structures
      SET name = regexp_replace(name, '^\\d+번[-\\s]?', '')
      WHERE name ~ '^\\d+번[-\\s]'
    `);
    console.log(`[4] l3_structures.name: ${r4.rowCount} rows updated`);

    // ============================================================
    // 5. l2_functions.productChar — 재확인
    // ============================================================
    const r5 = await client.query(`
      UPDATE l2_functions
      SET "productChar" = regexp_replace("productChar", '^\\d+번[-\\s]?', '')
      WHERE "productChar" ~ '^\\d+번[-\\s]'
    `);
    console.log(`[5] l2_functions.productChar: ${r5.rowCount} rows updated`);

    // ============================================================
    // 6. fmea_worksheet_data — 모든 JSONB 컬럼 (전역 치환)
    // ============================================================
    const jsonbCols = ['l2Data', 'l3Data', 'failureLinks', 'functionData', 'structureData'];
    for (const col of jsonbCols) {
      try {
        // JSONB를 텍스트로 변환 → 정규식 치환 → 다시 JSONB
        const r = await client.query(`
          UPDATE fmea_worksheet_data
          SET "${col}" = regexp_replace("${col}"::text, '\\d+번[-\\s]', '', 'g')::jsonb
          WHERE "${col}"::text ~ '\\d+번[-\\s]'
        `);
        if (r.rowCount > 0) {
          console.log(`[6] fmea_worksheet_data.${col}: ${r.rowCount} rows updated`);
        }
      } catch (e) {
        // 컬럼이 없을 수 있음
      }
    }

    // ============================================================
    // 7. fmea_legacy_data — JSONB 전역 치환
    // ============================================================
    try {
      const r7 = await client.query(`
        UPDATE fmea_legacy_data
        SET data = regexp_replace(data::text, '\\d+번[-\\s]', '', 'g')::jsonb
        WHERE data::text ~ '\\d+번[-\\s]'
      `);
      if (r7.rowCount > 0) {
        console.log(`[7] fmea_legacy_data.data: ${r7.rowCount} rows updated`);
      }
    } catch (e) {
      console.error('[7] fmea_legacy_data error:', e.message);
    }

    // ============================================================
    // 8. 검증 — 남아있는 "번-" 패턴 확인
    // ============================================================
    console.log('\n=== 검증: 남아있는 번- 패턴 ===');
    const checks = [
      `SELECT 'failure_links.fmText' as src, COUNT(*) as cnt FROM failure_links WHERE "fmText" ~ '\\d+번[-\\s]'`,
      `SELECT 'failure_links.fcText' as src, COUNT(*) as cnt FROM failure_links WHERE "fcText" ~ '\\d+번[-\\s]'`,
      `SELECT 'l3_functions.processChar' as src, COUNT(*) as cnt FROM l3_functions WHERE "processChar" ~ '\\d+번[-\\s]'`,
      `SELECT 'l3_structures.name' as src, COUNT(*) as cnt FROM l3_structures WHERE name ~ '\\d+번[-\\s]'`,
      `SELECT 'l2_functions.productChar' as src, COUNT(*) as cnt FROM l2_functions WHERE "productChar" ~ '\\d+번[-\\s]'`,
      `SELECT 'ws.l2Data' as src, COUNT(*) as cnt FROM fmea_worksheet_data WHERE "l2Data"::text ~ '\\d+번[-\\s]'`,
      `SELECT 'ws.failureLinks' as src, COUNT(*) as cnt FROM fmea_worksheet_data WHERE "failureLinks"::text ~ '\\d+번[-\\s]'`,
      `SELECT 'legacy.data' as src, COUNT(*) as cnt FROM fmea_legacy_data WHERE data::text ~ '\\d+번[-\\s]'`,
    ];
    let totalRemaining = 0;
    for (const q of checks) {
      const r = await client.query(q);
      const cnt = parseInt(r.rows[0].cnt);
      if (cnt > 0) {
        console.log(`  ⚠️ ${r.rows[0].src}: ${cnt} rows remaining`);
        totalRemaining += cnt;
      }
    }
    if (totalRemaining === 0) {
      console.log('  ✅ 모든 테이블에서 "번-" 패턴 완전 제거됨!');
    }

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
