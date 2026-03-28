const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db?schema=public' });
  await client.connect();
  const { rows } = await client.query(`
    SELECT 'FM' as type, "fmeaId", COUNT(*) as cnt FROM failure_modes GROUP BY "fmeaId"
    UNION ALL SELECT 'FC', "fmeaId", COUNT(*) FROM failure_causes GROUP BY "fmeaId"
    UNION ALL SELECT 'FE', "fmeaId", COUNT(*) FROM failure_effects GROUP BY "fmeaId"
    UNION ALL SELECT 'FL', "fmeaId", COUNT(*) FROM failure_links GROUP BY "fmeaId"
    ORDER BY "fmeaId", type
  `);
  const byFmea = {};
  for (const r of rows) {
    if (!byFmea[r.fmeaId]) byFmea[r.fmeaId] = {};
    byFmea[r.fmeaId][r.type] = parseInt(r.cnt);
  }
  for (const [fmeaId, c] of Object.entries(byFmea)) {
    console.log(`${fmeaId.substring(0,24)}  FM=${c.FM||0} FC=${c.FC||0} FE=${c.FE||0} FL=${c.FL||0}`);
  }
  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
