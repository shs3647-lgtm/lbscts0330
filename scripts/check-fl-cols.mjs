import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
for (const schema of ['public', 'pfmea_pfm26_m004']) {
  const r = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='failure_links' ORDER BY ordinal_position`,
    [schema]
  );
  console.log(`${schema}.failure_links:`, r.rows.map(x => x.column_name).join(', '));
}
await pool.end();
