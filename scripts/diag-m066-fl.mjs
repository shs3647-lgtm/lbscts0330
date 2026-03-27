import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db',
});

async function main() {
  await client.connect();

  // Find the correct schema
  const schemaRes = await client.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE '%m002%'`
  );
  if (schemaRes.rows.length === 0) {
    // Try checking tables in public schema
    const pubTables = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%Failure%' LIMIT 10`
    );
    console.log('public tables:', pubTables.rows);
    console.log('No m002 schema found, checking all schemas...');
    const allSchemas = await client.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') ORDER BY schema_name`
    );
    console.log('All schemas:', allSchemas.rows.map(r => r.schema_name));
    await client.end();
    return;
  }
  const schema = schemaRes.rows[0].schema_name;
  console.log('Using schema:', schema);
  // List tables in this schema
  const tablesRes = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename`, [schema]
  );
  console.log('Tables:', tablesRes.rows.map(r => r.tablename));

  const fcRes = await client.query(`SELECT id, cause, "l2StructId", "l3StructId" FROM "${schema}".failure_causes`);
  const flRes = await client.query(`SELECT id, "fmId", "feId", "fcId" FROM "${schema}".failure_links`);
  const raRes = await client.query(`SELECT id, "linkId" FROM "${schema}".risk_analyses`);

  console.log(`FC: ${fcRes.rows.length}, FL: ${flRes.rows.length}, RA: ${raRes.rows.length}`);

  // Find FL grouped by fcId
  const flMap = {};
  flRes.rows.forEach(fl => {
    if (!flMap[fl.fcId]) flMap[fl.fcId] = [];
    flMap[fl.fcId].push(fl);
  });

  // FL with 2+ 
  const dups = Object.entries(flMap).filter(([, v]) => v.length > 1);
  console.log(`\nFL with 2+ per FC: ${dups.length}`);
  for (const [fcId, fls] of dups) {
    const fc = fcRes.rows.find(c => c.id === fcId);
    console.log(`  FC: ${fcId}`);
    console.log(`    cause: ${fc ? fc.cause.substring(0, 80) : 'NOT FOUND'}`);
    console.log(`    l2StructId: ${fc?.l2StructId}`);
    for (const fl of fls) {
      console.log(`    FL: ${fl.id}  fmId: ${fl.fmId}`);
    }
  }

  // FL without FC
  const fcIds = new Set(fcRes.rows.map(c => c.id));
  const orphanFLs = flRes.rows.filter(fl => !fcIds.has(fl.fcId));
  console.log(`\nOrphan FLs (fcId not in FC table): ${orphanFLs.length}`);
  for (const fl of orphanFLs) {
    console.log(`  FL: ${fl.id}  fcId: ${fl.fcId}`);
  }

  // Duplicate FC names in same process
  const causeMap = {};
  fcRes.rows.forEach(fc => {
    const key = `${fc.l2StructId}|${fc.cause}`;
    if (!causeMap[key]) causeMap[key] = [];
    causeMap[key].push(fc);
  });
  const dupCauses = Object.entries(causeMap).filter(([, v]) => v.length > 1);
  console.log(`\nDuplicate FC names in same process: ${dupCauses.length}`);
  for (const [key, fcs] of dupCauses) {
    console.log(`  Key: ${key.substring(0, 80)}`);
    for (const fc of fcs) {
      const fcFLs = flRes.rows.filter(fl => fl.fcId === fc.id);
      console.log(`    FC: ${fc.id}  l3Struct: ${fc.l3StructId}  FLs: ${fcFLs.length}`);
    }
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
