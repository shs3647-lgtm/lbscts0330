import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });

async function main() {
  await pool.query(`SET search_path TO pfmea_pfm26_m002, public`);
  await pool.query(`DELETE FROM failure_causes WHERE id = 'fc-autofix-PF-L3-040-IM-002-G'`);
  const r = await pool.query(`SELECT count(*) as c FROM failure_causes WHERE "fmeaId" = 'pfm26-m002'`);
  console.log('M002 FC:', r.rows[0].c);
}
main().catch(console.error).finally(() => pool.end());
