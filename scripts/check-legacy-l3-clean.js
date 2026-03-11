const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public' });

async function main() {
  const res = await pool.query(`SELECT "fmeaId", data FROM fmea_legacy_data WHERE "fmeaId" = $1`, ['pfm26-m001']);
  if (res.rows.length === 0) { console.log('No data found'); return; }

  const d = res.rows[0].data;
  const l2 = d.l2 || [];

  console.log('=== pfm26-m001 Legacy L3 현황 ===');
  console.log('L2 공정 수:', l2.length);

  let totalL3 = 0;
  l2.forEach(p => {
    const l3 = p.l3 || [];
    if (l3.length > 0) {
      console.log(`\n공정 ${p.no} ${p.name}: L3 ${l3.length}건`);
      l3.forEach(we => {
        totalL3++;
        console.log(`  name=${JSON.stringify(we.name)} m4=${JSON.stringify(we.m4)}`);
      });
    }
  });

  console.log('\nTotal L3:', totalL3);

  // B1 master data check
  const ds = await pool.query(`SELECT id FROM pfmea_master_datasets WHERE "isActive" = true LIMIT 1`);
  if (ds.rows.length > 0) {
    const b1 = await pool.query(
      `SELECT "processNo", value, m4 FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B1' ORDER BY "processNo"`,
      [ds.rows[0].id]
    );
    console.log('\n=== Master B1 현황 ===');
    b1.rows.forEach(r => console.log(`공정${r.processNo}: value=${JSON.stringify(r.value)} m4=${JSON.stringify(r.m4)}`));
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
