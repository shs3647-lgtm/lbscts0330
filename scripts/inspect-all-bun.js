const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    // 모든 fmeaId의 worksheet data에서 L3 names 확인
    const r1 = await pool.query(`SELECT "fmeaId", "l2Data", "l3Data", "structureData" FROM fmea_worksheet_data`);
    console.log('=== ALL worksheet data L3 names with 번 ===');
    r1.rows.forEach(r => {
      // l2Data 내 l3 names
      if (r.l2Data && Array.isArray(r.l2Data)) {
        r.l2Data.forEach(l2 => {
          if (l2.l3 && Array.isArray(l2.l3)) {
            l2.l3.forEach(l3 => {
              if (l3.name && l3.name.includes('번')) {
                console.log(`  [l2Data] fmeaId: ${r.fmeaId} | l3.name: "${l3.name}"`);
              }
            });
          }
          // 모든 중첩 필드에서 "번" 확인
          if (l2.functions && Array.isArray(l2.functions)) {
            l2.functions.forEach(fn => {
              if (fn.name && fn.name.includes('번')) {
                console.log(`  [l2Data.fn] fmeaId: ${r.fmeaId} | fn.name: "${fn.name}"`);
              }
            });
          }
        });
      }

      // l3Data
      if (r.l3Data && Array.isArray(r.l3Data)) {
        r.l3Data.forEach(item => {
          const json = JSON.stringify(item);
          if (json.includes('번')) {
            // find field names with 번
            for (const [k, v] of Object.entries(item)) {
              if (typeof v === 'string' && v.includes('번')) {
                console.log(`  [l3Data] fmeaId: ${r.fmeaId} | ${k}: "${v}"`);
              }
            }
          }
        });
      }

      // structureData
      if (r.structureData) {
        const str = JSON.stringify(r.structureData);
        if (str.includes('번-') || str.includes('번 ')) {
          const matches = str.match(/.{0,5}번[-\s].{0,20}/g) || [];
          matches.slice(0, 5).forEach(m => {
            console.log(`  [structureData] fmeaId: ${r.fmeaId} | "${m}"`);
          });
        }
      }
    });

    // fmea_legacy_data — "번" 패턴 상세
    console.log('\n=== legacy_data "번" patterns ===');
    const r2 = await pool.query(`SELECT "fmeaId", data::text as raw FROM fmea_legacy_data`);
    r2.rows.forEach(r => {
      // "번-" 또는 "번 " 패턴
      if (r.raw.includes('번-') || r.raw.includes('번 ')) {
        const matches = r.raw.match(/.{0,5}번[-\s].{0,30}/g) || [];
        if (matches.length > 0) {
          console.log(`  fmeaId: ${r.fmeaId} — ${matches.length} matches`);
          matches.slice(0, 5).forEach(m => console.log(`    "${m}"`));
        }
      }
    });

    // 추가: fmea_worksheet_data의 모든 text 형태 컬럼 확인
    console.log('\n=== worksheet_data full text search ===');
    const r3 = await pool.query(`
      SELECT "fmeaId",
        CASE WHEN "l2Data"::text LIKE '%번-%' THEN 'l2Data' ELSE '' END as in_l2,
        CASE WHEN "l3Data"::text LIKE '%번-%' THEN 'l3Data' ELSE '' END as in_l3,
        CASE WHEN "failureLinks"::text LIKE '%번-%' THEN 'failureLinks' ELSE '' END as in_fl,
        CASE WHEN "functionData"::text LIKE '%번-%' THEN 'functionData' ELSE '' END as in_fn,
        CASE WHEN "structureData"::text LIKE '%번-%' THEN 'structureData' ELSE '' END as in_st
      FROM fmea_worksheet_data
    `);
    r3.rows.forEach(r => {
      const cols = [r.in_l2, r.in_l3, r.in_fl, r.in_fn, r.in_st].filter(Boolean);
      if (cols.length > 0) {
        console.log(`  fmeaId: ${r.fmeaId} has 번- in: ${cols.join(', ')}`);
      }
    });

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
})();
