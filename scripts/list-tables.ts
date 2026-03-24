import pg from 'pg';
const pool = new pg.Pool({host:'localhost',port:5432,user:'postgres',password:'1234',database:'fmea_db'});
async function main() {
  const r = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  const tables = r.rows.map((x: any) => x.table_name as string);
  const relevant = tables.filter((t: string) => t.includes('tructure') || t.includes('ailure') || t.includes('isk') || t.includes('triplet'));
  console.log('=== Relevant tables ===');
  relevant.forEach((t: string) => console.log(t));
  console.log('\n=== All tables (' + tables.length + ') ===');
  tables.forEach((t: string) => console.log(t));
  await pool.end();
  process.exit(0);
}
main();
