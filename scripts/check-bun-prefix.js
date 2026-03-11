const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    // 1. fmea_worksheet_data.l2Data JSONB에서 번 포함 값 추출
    const r1 = await pool.query(`SELECT "fmeaId", "l2Data"::text as raw FROM fmea_worksheet_data WHERE "l2Data"::text LIKE '%번-%' OR "l2Data"::text LIKE '%번 %'`);
    console.log('=== fmea_worksheet_data.l2Data with 번 ===', r1.rowCount, 'rows');
    r1.rows.forEach(r => {
      const data = JSON.parse(r.raw);
      // l3 names 추출
      if (Array.isArray(data)) {
        data.forEach(l2 => {
          if (l2.l3 && Array.isArray(l2.l3)) {
            l2.l3.forEach(l3 => {
              if (l3.name && (l3.name.includes('번-') || l3.name.includes('번 '))) {
                console.log(`  fmeaId: ${r.fmeaId} | l3.name: "${l3.name}"`);
              }
            });
          }
        });
      }
    });

    // 2. failureLinks에서 번- 값
    const r2 = await pool.query(`SELECT "fmeaId", "failureLinks"::text as raw FROM fmea_worksheet_data WHERE "failureLinks"::text LIKE '%번-%' OR "failureLinks"::text LIKE '%번 %'`);
    console.log('\n=== failureLinks with 번- ===', r2.rowCount, 'rows');
    r2.rows.forEach(r => {
      const data = JSON.parse(r.raw);
      if (Array.isArray(data)) {
        data.forEach(link => {
          if (link.fcText && (link.fcText.includes('번-') || link.fcText.includes('번 '))) {
            console.log(`  fmeaId: ${r.fmeaId} | fcText: "${link.fcText}"`);
          }
          if (link.fmText && (link.fmText.includes('번-') || link.fmText.includes('번 '))) {
            console.log(`  fmeaId: ${r.fmeaId} | fmText: "${link.fmText}"`);
          }
        });
      }
    });

    // 3. legacy data
    const r3 = await pool.query(`SELECT "fmeaId", data::text as raw FROM fmea_legacy_data WHERE data::text LIKE '%번-%' OR data::text LIKE '%번 %'`);
    console.log('\n=== legacy_data with 번- ===', r3.rowCount, 'rows');
    r3.rows.forEach(r => {
      const raw = r.raw;
      // 번- 근처 텍스트 추출
      const matches = raw.match(/[^"]{0,10}번[-\s][^"]{0,30}/g) || [];
      matches.slice(0, 10).forEach(m => console.log(`  fmeaId: ${r.fmeaId} | "${m}"`));
    });

    // 4. 모든 테이블 text 컬럼에서 '번-' 일괄 검색
    const textSearches = [
      `SELECT 'failure_links.fmText' as src, COUNT(*) as cnt FROM failure_links WHERE "fmText" LIKE '%번-%' OR "fmText" LIKE '%번 %'`,
      `SELECT 'failure_links.fcText' as src, COUNT(*) as cnt FROM failure_links WHERE "fcText" LIKE '%번-%' OR "fcText" LIKE '%번 %'`,
      `SELECT 'l2_functions.productChar' as src, COUNT(*) as cnt FROM l2_functions WHERE "productChar" LIKE '%번-%' OR "productChar" LIKE '%번 %'`,
      `SELECT 'l3_functions.processChar' as src, COUNT(*) as cnt FROM l3_functions WHERE "processChar" LIKE '%번-%' OR "processChar" LIKE '%번 %'`,
      `SELECT 'l3_structures.name' as src, COUNT(*) as cnt FROM l3_structures WHERE name LIKE '%번-%' OR name LIKE '%번 %'`,
    ];

    console.log('\n=== Text column summary ===');
    for (const q of textSearches) {
      const r = await pool.query(q);
      if (parseInt(r.rows[0].cnt) > 0) {
        console.log(`  ${r.rows[0].src}: ${r.rows[0].cnt} rows`);
      }
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
})();
