const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public' });

async function main() {
  // 1. Legacy JSON의 failureLinks
  const res1 = await pool.query('SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1', ['pfm26-m001']);
  const d = res1.rows[0].data;
  console.log('=== Legacy JSON ===');
  console.log('failureLinks count:', (d.failureLinks || []).length);
  if ((d.failureLinks || []).length > 0) {
    console.log('sample:', JSON.stringify(d.failureLinks[0]));
  }

  // 2. Atomic DB의 FailureLink 테이블
  try {
    await pool.query('SET search_path TO pfmea_pfm26_m001, public');
    const res2 = await pool.query('SELECT COUNT(*) as cnt FROM failure_links');
    console.log('\n=== Atomic DB (pfmea_pfm26_m001) ===');
    console.log('failure_links count:', res2.rows[0].cnt);

    const res3 = await pool.query('SELECT * FROM failure_links LIMIT 3');
    console.log('sample links:');
    res3.rows.forEach(r => console.log(JSON.stringify(r)));
  } catch (e) {
    console.log('Atomic DB error:', e.message);
  }

  // 3. FmeaWorksheetData의 failureLinks
  try {
    await pool.query('SET search_path TO public');
    const res4 = await pool.query('SELECT "failureLinks" FROM "FmeaWorksheetData" WHERE "fmeaId" = $1', ['pfm26-m001']);
    if (res4.rows.length > 0) {
      const links = res4.rows[0].failureLinks;
      console.log('\n=== FmeaWorksheetData ===');
      console.log('failureLinks:', Array.isArray(links) ? links.length + ' items' : typeof links);
    }
  } catch (e) {
    console.log('FmeaWorksheetData error:', e.message);
  }

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
