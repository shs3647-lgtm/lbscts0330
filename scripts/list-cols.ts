import pg from 'pg';
const pool = new pg.Pool({host:'localhost',port:5432,user:'postgres',password:'1234',database:'fmea_db'});
async function main() {
  const schema = 'pfmea_pfm26_p018_i18';
  const tables = ['l2_structures','l3_structures','failure_modes','failure_causes','failure_links','failure_effects'];
  for (const t of tables) {
    const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position`, [schema, t]);
    const cols = r.rows.map((x: any) => x.column_name);
    console.log(`\n--- ${t} (${cols.length} cols) ---`);
    cols.forEach((c: string) => console.log(`  ${c}`));
  }
  await pool.end();
  process.exit(0);
}
main();
