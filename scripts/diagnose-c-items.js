const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

async function run() {
  const dsId = '64a2c2e0-98f2-4bd4-b103-27375ef6038b';

  // All flat items for HUD PFMEA
  const items = await p.query(
    'SELECT "itemCode", "processNo", value, category, m4 FROM pfmea_master_flat_items WHERE "datasetId" = $1 ORDER BY "itemCode", "processNo"',
    [dsId]
  );
  console.log('[HUD flat items] ' + items.rows.length + '개');

  // Count by itemCode
  const counts = {};
  items.rows.forEach(r => { counts[r.itemCode] = (counts[r.itemCode] || 0) + 1; });
  console.log('\n[itemCode별 건수]');
  Object.entries(counts).sort().forEach(([k, v]) => console.log('  ' + k + ': ' + v + '개'));

  // C items only
  const cItems = items.rows.filter(r => r.itemCode && r.itemCode.startsWith('C'));
  console.log('\n[C-items] ' + cItems.length + '개');
  cItems.forEach(r => {
    console.log('  ' + r.itemCode + ' proc=' + (r.processNo || '?') + ' cat=' + (r.category || '?') + ' val="' + (r.value || '').substring(0, 60) + '"');
  });

  // Also check legacy data l1 structure for detail
  const legacy = await p.query(
    'SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1',
    ['pfm26-p006-l07']
  );
  if (legacy.rows.length > 0) {
    const data = legacy.rows[0].data;
    console.log('\n[Legacy l1 전체 JSON 구조]');
    console.log(JSON.stringify(data.l1, null, 2).substring(0, 3000));
  }

  await p.end();
}

run().catch(e => { console.error(e); p.end(); });
