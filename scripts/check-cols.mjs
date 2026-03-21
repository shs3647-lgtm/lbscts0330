import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const schema = 'pfmea_pfm26_m066';
const tables = ['l1_functions','l2_functions','l3_functions','failure_modes','failure_effects','failure_causes','failure_links','risk_analyses','optimizations','process_product_chars'];
async function main() {
  const client = await pool.connect();
  for (const t of tables) {
    const r = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position`, [schema, t]);
    console.log(`${t}: ${r.rows.map(x => x.column_name).join(', ')}`);
  }
  client.release();
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
