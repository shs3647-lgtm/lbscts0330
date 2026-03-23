import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const tables = ['triplet_groups', 'fmea_projects', 'fmea_registrations'];
for (const t of tables) {
  const r = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [t]
  );
  console.log(t + ': ' + r.rows.map(x => x.column_name).join(', '));
}
await pool.end();
