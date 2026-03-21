import pg from 'pg';
const c = new pg.Client('postgresql://postgres:1234@localhost:5432/fmea_db');
await c.connect();

// 1. FMEA 등록 정보 (public 스키마)
console.log('='.repeat(90));
console.log('  등록된 FMEA 프로젝트 (public.fmea_registrations)');
console.log('='.repeat(90));
try {
  const reg = await c.query(`SELECT "fmeaId", subject, status, "fmeaType", "createdAt" FROM public.fmea_registrations ORDER BY "createdAt" DESC`);
  console.log(`  ${'fmeaId'.padEnd(22)} ${'subject'.padEnd(30)} ${'type'.padEnd(8)} status   createdAt`);
  console.log('  ' + '-'.repeat(85));
  for (const r of reg.rows) {
    const dt = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '-';
    console.log(`  ${(r.fmeaId || '').padEnd(22)} ${(r.subject || '').substring(0, 28).padEnd(30)} ${(r.fmeaType || '').padEnd(8)} ${(r.status || '').padEnd(8)} ${dt}`);
  }
  console.log(`  총 ${reg.rows.length}건`);
} catch (e) { console.log('  fmea_registrations 테이블 없음:', e.message); }

// 2. 프로젝트 스키마 목록
console.log('\n' + '='.repeat(90));
console.log('  프로젝트별 스키마 (pfmea_*) + 데이터 현황');
console.log('='.repeat(90));
const schemas = await c.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%' ORDER BY schema_name`);
console.log(`  ${'schema'.padEnd(32)} ${'fmeaId'.padEnd(20)} tables  links  FM   FE   FC   RA`);
console.log('  ' + '-'.repeat(85));
for (const row of schemas.rows) {
  const id = row.schema_name.replace('pfmea_', '').replace(/_/g, '-');
  const t = await c.query(`SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = '${row.schema_name}'`);
  let fl = 0, fm = 0, fe = 0, fc = 0, ra = 0;
  try {
    const r1 = await c.query(`SELECT COUNT(*) AS cnt FROM "${row.schema_name}".failure_links WHERE "deletedAt" IS NULL`);
    fl = parseInt(r1.rows[0].cnt);
    const r2 = await c.query(`SELECT COUNT(*) AS cnt FROM "${row.schema_name}".failure_modes`);
    fm = parseInt(r2.rows[0].cnt);
    const r3 = await c.query(`SELECT COUNT(*) AS cnt FROM "${row.schema_name}".failure_effects`);
    fe = parseInt(r3.rows[0].cnt);
    const r4 = await c.query(`SELECT COUNT(*) AS cnt FROM "${row.schema_name}".failure_causes`);
    fc = parseInt(r4.rows[0].cnt);
    const r5 = await c.query(`SELECT COUNT(*) AS cnt FROM "${row.schema_name}".risk_analyses`);
    ra = parseInt(r5.rows[0].cnt);
  } catch { /* */ }
  const hasData = fl > 0 ? '*' : ' ';
  console.log(`${hasData} ${row.schema_name.padEnd(32)} ${id.padEnd(20)} ${String(t.rows[0].cnt).padStart(4)}  ${String(fl).padStart(5)}  ${String(fm).padStart(3)}  ${String(fe).padStart(3)}  ${String(fc).padStart(3)}  ${String(ra).padStart(4)}`);
}

// 3. FmeaProject (sample 등록 여부 확인)
console.log('\n' + '='.repeat(90));
console.log('  FMEA Projects (public.fmea_projects)');
console.log('='.repeat(90));
try {
  const proj = await c.query(`SELECT id, "projectName", "fmeaType", status, "createdAt" FROM public.fmea_projects ORDER BY "createdAt" DESC LIMIT 20`);
  for (const r of proj.rows) {
    const dt = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '-';
    console.log(`  ${(r.id || '').padEnd(22)} ${(r.projectName || '').substring(0, 30).padEnd(32)} ${(r.fmeaType || '').padEnd(8)} ${dt}`);
  }
  console.log(`  총 ${proj.rows.length}건`);
} catch (e) { console.log('  fmea_projects 테이블 없음'); }

await c.end();
