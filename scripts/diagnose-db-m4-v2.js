const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

async function run() {
  // fmeaType values
  const types = await p.query('SELECT DISTINCT "fmeaType" FROM fmea_projects');
  console.log('fmeaType values:', types.rows.map(r => r.fmeaType));

  // All projects
  const projs = await p.query('SELECT "fmeaId", "fmeaType" FROM fmea_projects ORDER BY "createdAt" DESC');
  console.log('\n[프로젝트 목록]');
  projs.rows.forEach(r => console.log('  ' + r.fmeaId + ' (' + r.fmeaType + ')'));

  // ALL L3 with empty m4
  const missing = await p.query(`
    SELECT l3.id, l3.m4, l3.name, l3."order", l3."fmeaId",
           l2.name as l2name, l2.no as l2no
    FROM l3_structures l3
    LEFT JOIN l2_structures l2 ON l3."l2Id" = l2.id
    WHERE (l3.m4 IS NULL OR l3.m4 = '' OR l3.m4 = '-')
    ORDER BY l3."fmeaId", l3."order"
  `);
  console.log('\n[L3 m4 누락] ' + missing.rows.length + '건');
  missing.rows.forEach(r => {
    console.log('  fmea=' + r.fmeaId + ' m4="' + (r.m4 || 'null') + '" name="' + r.name + '" proc=' + (r.l2no || '?') + ' "' + (r.l2name || '?') + '"');
  });

  // Also check legacy data for m4 issues
  const legacyRows = await p.query('SELECT "fmeaId", data FROM fmea_legacy_data');
  console.log('\n[Legacy 데이터 m4 체크]');
  for (const row of legacyRows.rows) {
    const data = row.data;
    if (!data || !data.l2) continue;
    let problems = 0;
    for (const proc of data.l2) {
      for (const we of (proc.l3 || [])) {
        const name = (we.name || '').trim();
        const m4 = we.m4;
        const isValidName = name !== '' && name !== '-' &&
          !name.includes('추가') && !name.includes('삭제') &&
          !name.includes('클릭') && !name.includes('선택') && !name.includes('없음');
        const isMissingM4 = !m4 || m4.trim() === '' || m4 === '-' ||
          m4.includes('클릭') || m4.includes('추가') || m4.includes('선택') ||
          m4.includes('입력') || m4.includes('필요');
        if (isValidName && isMissingM4) {
          problems++;
          console.log('  🔴 ' + row.fmeaId + ': proc "' + proc.name + '" WE "' + name + '" m4="' + (m4 || 'empty') + '"');
        }
      }
    }
    if (problems === 0) {
      console.log('  ✅ ' + row.fmeaId + ': m4 누락 없음');
    }
  }

  await p.end();
}
run().catch(e => { console.error(e); p.end(); });
