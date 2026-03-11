/**
 * "번-" 접두사 최종 정리 (숫자 없이 "번-" 또는 "번 "만 남은 경우)
 * 패턴: "번-PDA 스캐너" → "PDA 스캐너"
 *        "번 LWR 거칠기" → "LWR 거칠기"
 */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

async function run() {
  const client = await pool.connect();
  try {
    // ============================================================
    // 먼저 현재 상태 진단 — "번" 포함 패턴 전수 조사
    // ============================================================
    console.log('=== 진단: "번" 포함 데이터 ===');

    const diag = [
      ['l3_structures.name', `SELECT name FROM l3_structures WHERE name LIKE '%번-%' OR name LIKE '%번 %' LIMIT 5`],
      ['failure_links.fmText', `SELECT "fmText" FROM failure_links WHERE "fmText" LIKE '%번-%' OR "fmText" LIKE '%번 %' LIMIT 5`],
      ['failure_links.fcText', `SELECT "fcText" FROM failure_links WHERE "fcText" LIKE '%번-%' OR "fcText" LIKE '%번 %' LIMIT 5`],
      ['l3_functions.processChar', `SELECT "processChar" FROM l3_functions WHERE "processChar" LIKE '%번-%' OR "processChar" LIKE '%번 %' LIMIT 5`],
      ['l2_functions.productChar', `SELECT "productChar" FROM l2_functions WHERE "productChar" LIKE '%번-%' OR "productChar" LIKE '%번 %' LIMIT 5`],
    ];

    for (const [name, q] of diag) {
      const r = await client.query(q);
      if (r.rowCount > 0) {
        console.log(`  ${name}:`);
        r.rows.forEach(row => console.log(`    "${Object.values(row)[0]}"`));
      }
    }

    // JSONB 진단
    for (const col of ['l2Data', 'l3Data', 'failureLinks']) {
      try {
        const r = await client.query(`SELECT "fmeaId" FROM fmea_worksheet_data WHERE "${col}"::text LIKE '%번-%' OR "${col}"::text LIKE '%번 %'`);
        if (r.rowCount > 0) {
          console.log(`  fmea_worksheet_data.${col}: ${r.rowCount} rows`);
        }
      } catch(e) {}
    }

    const legacyR = await client.query(`SELECT "fmeaId" FROM fmea_legacy_data WHERE data::text LIKE '%번-%' OR data::text LIKE '%번 %'`);
    if (legacyR.rowCount > 0) console.log(`  fmea_legacy_data.data: ${legacyR.rowCount} rows`);

    // ============================================================
    // 정리 — "번-" 또는 "번 " 패턴 (숫자 유무 관계없이) 제거
    // ============================================================
    console.log('\n=== 정리 실행 ===');

    // 1. 텍스트 컬럼 — 문자열 시작 "번-" 또는 "번 " 제거
    const textUpdates = [
      ['l3_structures.name', `UPDATE l3_structures SET name = regexp_replace(name, '^번[-\\s]', '') WHERE name ~ '^번[-\\s]'`],
      ['failure_links.fmText', `UPDATE failure_links SET "fmText" = regexp_replace("fmText", '^번[-\\s]', '') WHERE "fmText" ~ '^번[-\\s]'`],
      ['failure_links.fcText', `UPDATE failure_links SET "fcText" = regexp_replace("fcText", '^번[-\\s]', '') WHERE "fcText" ~ '^번[-\\s]'`],
      ['l3_functions.processChar', `UPDATE l3_functions SET "processChar" = regexp_replace("processChar", '^번[-\\s]', '') WHERE "processChar" ~ '^번[-\\s]'`],
      ['l2_functions.productChar', `UPDATE l2_functions SET "productChar" = regexp_replace("productChar", '^번[-\\s]', '') WHERE "productChar" ~ '^번[-\\s]'`],
      // 문자열 중간에 있는 경우도 처리 (예: "20번-부품명" 에서 숫자만 제거된 경우)
      ['failure_links.fmText (mid)', `UPDATE failure_links SET "fmText" = regexp_replace("fmText", '번[-\\s]', '', 'g') WHERE "fmText" ~ '번[-\\s]'`],
      ['failure_links.fcText (mid)', `UPDATE failure_links SET "fcText" = regexp_replace("fcText", '번[-\\s]', '', 'g') WHERE "fcText" ~ '번[-\\s]'`],
    ];

    for (const [name, q] of textUpdates) {
      const r = await client.query(q);
      if (r.rowCount > 0) console.log(`  ${name}: ${r.rowCount} rows updated`);
    }

    // 2. JSONB 컬럼 — 전역 치환 (숫자 없이 "번-" 또는 "번 " 제거)
    for (const col of ['l2Data', 'l3Data', 'failureLinks', 'functionData', 'structureData']) {
      try {
        const r = await client.query(`
          UPDATE fmea_worksheet_data
          SET "${col}" = regexp_replace("${col}"::text, '번[-\\s]', '', 'g')::jsonb
          WHERE "${col}"::text ~ '번[-\\s]'
        `);
        if (r.rowCount > 0) console.log(`  fmea_worksheet_data.${col}: ${r.rowCount} rows updated`);
      } catch(e) {}
    }

    // 3. legacy data JSONB
    try {
      const r = await client.query(`
        UPDATE fmea_legacy_data
        SET data = regexp_replace(data::text, '번[-\\s]', '', 'g')::jsonb
        WHERE data::text ~ '번[-\\s]'
      `);
      if (r.rowCount > 0) console.log(`  fmea_legacy_data.data: ${r.rowCount} rows updated`);
    } catch(e) {}

    // ============================================================
    // 검증
    // ============================================================
    console.log('\n=== 최종 검증 ===');
    let total = 0;
    const verifyChecks = [
      ['l3_structures.name', `SELECT COUNT(*) as cnt FROM l3_structures WHERE name LIKE '%번-%' OR name LIKE '%번 %'`],
      ['failure_links.fmText', `SELECT COUNT(*) as cnt FROM failure_links WHERE "fmText" LIKE '%번-%' OR "fmText" LIKE '%번 %'`],
      ['failure_links.fcText', `SELECT COUNT(*) as cnt FROM failure_links WHERE "fcText" LIKE '%번-%' OR "fcText" LIKE '%번 %'`],
      ['l3_functions.processChar', `SELECT COUNT(*) as cnt FROM l3_functions WHERE "processChar" LIKE '%번-%' OR "processChar" LIKE '%번 %'`],
      ['l2_functions.productChar', `SELECT COUNT(*) as cnt FROM l2_functions WHERE "productChar" LIKE '%번-%' OR "productChar" LIKE '%번 %'`],
      ['ws JSONB', `SELECT COUNT(*) as cnt FROM fmea_worksheet_data WHERE "l2Data"::text LIKE '%번-%' OR "l2Data"::text LIKE '%번 %' OR "failureLinks"::text LIKE '%번-%' OR "failureLinks"::text LIKE '%번 %'`],
      ['legacy JSONB', `SELECT COUNT(*) as cnt FROM fmea_legacy_data WHERE data::text LIKE '%번-%' OR data::text LIKE '%번 %'`],
    ];
    for (const [name, q] of verifyChecks) {
      const r = await client.query(q);
      const cnt = parseInt(r.rows[0].cnt);
      if (cnt > 0) {
        console.log(`  ⚠️ ${name}: ${cnt} rows remaining`);
        total += cnt;
      }
    }
    if (total === 0) console.log('  ✅ 완전 제거 확인!');

  } finally {
    client.release();
    pool.end();
  }
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
