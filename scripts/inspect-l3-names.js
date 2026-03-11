const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    // 1. fmea_worksheet_data.l2Data에서 모든 L3 name 추출
    const r1 = await pool.query(`SELECT "fmeaId", "l2Data" FROM fmea_worksheet_data WHERE "l2Data" IS NOT NULL`);
    console.log('=== fmea_worksheet_data L3 names ===');
    r1.rows.forEach(r => {
      const data = r.l2Data;
      if (Array.isArray(data)) {
        data.forEach(l2 => {
          if (l2.l3 && Array.isArray(l2.l3)) {
            l2.l3.forEach(l3 => {
              if (l3.name && l3.name.includes('번')) {
                console.log(`  fmeaId: ${r.fmeaId} | name: "${l3.name}"`);
              }
            });
          }
        });
      }
    });

    // 2. l3_structures에서 직접 확인
    const r2 = await pool.query(`SELECT "fmeaId", name FROM l3_structures WHERE name LIKE '%번%' LIMIT 20`);
    console.log('\n=== l3_structures with 번 ===', r2.rowCount);
    r2.rows.forEach(r => console.log(`  fmeaId: ${r.fmeaId} | name: "${r.name}"`));

    // 3. 워크시트 데이터의 모든 L3 names 샘플 (번 여부 무관)
    const r3 = await pool.query(`SELECT "fmeaId", "l2Data" FROM fmea_worksheet_data WHERE "fmeaId" = 'pfm26-p001-l50'`);
    if (r3.rowCount > 0) {
      const data = r3.rows[0].l2Data;
      console.log('\n=== pfm26-p001-l50 ALL L3 names ===');
      if (Array.isArray(data)) {
        let count = 0;
        data.forEach(l2 => {
          if (l2.l3 && Array.isArray(l2.l3)) {
            l2.l3.forEach(l3 => {
              if (l3.name && count < 30) {
                console.log(`  "${l3.name}"`);
                count++;
              }
            });
          }
        });
      }
    }

    // 4. failureLinks에서 fmText/fcText 샘플
    const r4 = await pool.query(`SELECT "fmeaId", "failureLinks" FROM fmea_worksheet_data WHERE "fmeaId" = 'pfm26-p001-l50'`);
    if (r4.rowCount > 0) {
      const links = r4.rows[0].failureLinks;
      console.log('\n=== pfm26-p001-l50 failureLinks fmText samples ===');
      if (Array.isArray(links)) {
        let count = 0;
        links.forEach(link => {
          if (link.fmText && count < 15) {
            console.log(`  fmText: "${link.fmText}"`);
            count++;
          }
        });
      }
    }

    // 5. legacy data에서 텍스트 샘플
    const r5 = await pool.query(`SELECT "fmeaId", data FROM fmea_legacy_data WHERE "fmeaId" = 'pfm26-p001-l50'`);
    if (r5.rowCount > 0) {
      const raw = JSON.stringify(r5.rows[0].data);
      // "번" 근처 텍스트 추출
      const matches = raw.match(/.{0,10}번.{0,30}/g) || [];
      console.log('\n=== legacy_data 번 context ===', matches.length, 'matches');
      matches.slice(0, 10).forEach(m => console.log(`  "${m}"`));
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
})();
