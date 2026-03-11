const { Client } = require('pg');
async function test() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
  await client.connect();
  
  const fmeaId = 'pfm26-p004-i59';
  const schema = 'pfmea_pfm26_p004_i59';
  
  // Check project schema
  const projL2 = await client.query(`SELECT count(*)::int as cnt FROM "${schema}".l2_structures WHERE "fmeaId" = $1`, [fmeaId]);
  const pubL2 = await client.query(`SELECT count(*)::int as cnt FROM public.l2_structures WHERE "fmeaId" = $1`, [fmeaId]);
  
  console.log(`${fmeaId}:`);
  console.log(`  Project L2: ${projL2.rows[0].cnt}`);
  console.log(`  Public L2: ${pubL2.rows[0].cnt}`);
  
  // Check legacy
  try {
    const projLeg = await client.query(`SELECT "fmeaId" FROM "${schema}".fmea_legacy_data WHERE "fmeaId" = $1`, [fmeaId]);
    console.log(`  Project Legacy: ${projLeg.rows.length}`);
  } catch(e) { console.log(`  Project Legacy: error`); }
  
  const pubLeg = await client.query(`SELECT "fmeaId" FROM public.fmea_legacy_data WHERE "fmeaId" = $1`, [fmeaId]);
  console.log(`  Public Legacy: ${pubLeg.rows.length}`);
  
  await client.end();
}
test();
