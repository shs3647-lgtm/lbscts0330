import pg from 'pg';
const p = new pg.Pool({host:'localhost',port:5432,user:'postgres',password:'1234',database:'fmea_db'});
async function main() {
  const r = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='pfmea_pfm26_p018_i18' AND table_name='risk_analyses' ORDER BY ordinal_position`);
  console.log('risk_analyses cols:', r.rows.map((x: any) => x.column_name));
  await p.end();
  process.exit(0);
}
main();
