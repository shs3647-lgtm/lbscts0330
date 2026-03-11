const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

async function clean() {
  const docNos = ['pfm26-p004-l02', 'dfm26-p004-l02', 'pfd26-p004-l02', 'cp26-p004-l02'];

  // fmea_registrations
  for (const id of ['pfm26-p004-l02', 'dfm26-p004-l02']) {
    const r = await pool.query(`DELETE FROM fmea_registrations WHERE LOWER("fmeaId") = LOWER($1)`, [id]);
    console.log(`fmea_registrations ${id}: ${r.rowCount} deleted`);
  }
  // fmea_cft_members
  for (const id of ['pfm26-p004-l02', 'dfm26-p004-l02']) {
    const r = await pool.query(`DELETE FROM fmea_cft_members WHERE LOWER("fmeaId") = LOWER($1)`, [id]);
    console.log(`fmea_cft_members ${id}: ${r.rowCount} deleted`);
  }
  // fmea_projects
  for (const id of ['pfm26-p004-l02', 'dfm26-p004-l02']) {
    const r = await pool.query(`DELETE FROM fmea_projects WHERE LOWER("fmeaId") = LOWER($1)`, [id]);
    console.log(`fmea_projects ${id}: ${r.rowCount} deleted`);
  }
  // cp_registrations
  const cp = await pool.query(`DELETE FROM cp_registrations WHERE LOWER("cpNo") = LOWER($1)`, ['cp26-p004-l02']);
  console.log(`cp_registrations cp26-p004-l02: ${cp.rowCount} deleted`);
  // pfd_registrations
  const pfd = await pool.query(`DELETE FROM pfd_registrations WHERE LOWER("pfdNo") = LOWER($1)`, ['pfd26-p004-l02']);
  console.log(`pfd_registrations pfd26-p004-l02: ${pfd.rowCount} deleted`);
  // project_linkages
  const pl = await pool.query(`DELETE FROM project_linkages WHERE LOWER("pfmeaId") = LOWER($1)`, ['pfm26-p004-l02']);
  console.log(`project_linkages pfm26-p004-l02: ${pl.rowCount} deleted`);

  // 확인
  console.log('\n=== After cleanup ===');
  const fmea = await pool.query(`SELECT "fmeaId", "fmeaType" FROM fmea_projects ORDER BY "fmeaId"`);
  console.log('fmea_projects:', fmea.rows);
  const linkages = await pool.query(`SELECT "pfmeaId", "dfmeaId", "pfdNo", "cpNo", status FROM project_linkages`);
  console.log('project_linkages:', linkages.rows);

  pool.end();
}
clean().catch(e => { console.error(e); process.exit(1); });
