const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public' });

async function main() {
  const res = await pool.query('SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1', ['pfm26-m001']);
  const d = res.rows[0].data;
  console.log('=== Legacy JSON State ===');
  console.log('structureConfirmed:', d.structureConfirmed);
  console.log('failureL1Confirmed:', d.failureL1Confirmed);
  console.log('failureL2Confirmed:', d.failureL2Confirmed);
  console.log('failureL3Confirmed:', d.failureL3Confirmed);
  console.log('l1Confirmed:', d.l1Confirmed);
  console.log('l2Confirmed:', d.l2Confirmed);
  console.log('l3Confirmed:', d.l3Confirmed);
  console.log('confirmed obj:', JSON.stringify(d.confirmed));
  console.log('l2 count:', (d.l2 || []).length);
  console.log('l1.failureScopes count:', (d.l1 && d.l1.failureScopes || []).length);
  const fmCount = (d.l2 || []).reduce((s, p) => s + (p.failureModes || []).length, 0);
  const fcCount = (d.l2 || []).reduce((s, p) => s + (p.failureCauses || []).length, 0);
  console.log('FM count:', fmCount);
  console.log('FC count:', fcCount);
  console.log('failureLinks count:', (d.failureLinks || []).length);

  // confirmed_states table
  const res2 = await pool.query('SELECT * FROM fmea_confirmed_states WHERE "fmeaId" = $1', ['pfm26-m001']);
  console.log('\n=== Confirmed States Table ===');
  if (res2.rows[0]) {
    const c = res2.rows[0];
    console.log('structure:', c.structureConfirmed);
    console.log('l1Function:', c.l1FunctionConfirmed);
    console.log('failureL1:', c.failureL1Confirmed);
    console.log('failureL2:', c.failureL2Confirmed);
    console.log('failureL3:', c.failureL3Confirmed);
  }

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
