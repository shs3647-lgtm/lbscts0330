const { Client } = require('pg');
async function go() {
  const c = new Client({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
  await c.connect();
  const r = await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='fmea_registrations' ORDER BY ordinal_position");
  r.rows.forEach(row => console.log(row.column_name));
  console.log('---');
  const r2 = await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='fmea_projects' ORDER BY ordinal_position");
  r2.rows.forEach(row => console.log(row.column_name));
  await c.end();
}
go();
