import pg from 'pg';
const c = new pg.Client('postgresql://postgres:1234@localhost:5432/fmea_db');
await c.connect();

const r = await c.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%' ORDER BY schema_name`);
console.log('FMEA 프로젝트 스키마 목록:');
for (const row of r.rows) {
  const id = row.schema_name.replace('pfmea_', '').replace(/_/g, '-');
  // 테이블 수 확인
  const t = await c.query(`SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = '${row.schema_name}'`);
  // failure_links 수 확인
  let fl = 0;
  try {
    const flr = await c.query(`SELECT COUNT(*) AS cnt FROM "${row.schema_name}".failure_links WHERE "deletedAt" IS NULL`);
    fl = parseInt(flr.rows[0].cnt);
  } catch { /* */ }
  console.log(`  ${row.schema_name.padEnd(30)} fmeaId: ${id.padEnd(15)} tables: ${t.rows[0].cnt}  links: ${fl}`);
}

await c.end();
