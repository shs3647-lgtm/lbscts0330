const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

async function clean() {
  console.log('=== FULL DB CLEANUP: Orphan + Stale Records ===\n');

  // 1. 모든 fmea_projects 삭제 (연관 데이터 포함)
  const fmeaProjects = await pool.query(`SELECT "fmeaId" FROM fmea_projects`);
  for (const row of fmeaProjects.rows) {
    const id = row.fmeaId;
    console.log(`Cleaning fmea: ${id}`);
    // 관련 테이블 정리
    await pool.query(`DELETE FROM fmea_registrations WHERE LOWER("fmeaId") = LOWER($1)`, [id]);
    await pool.query(`DELETE FROM fmea_cft_members WHERE LOWER("fmeaId") = LOWER($1)`, [id]);
    try { await pool.query(`DELETE FROM fmea_legacy_data WHERE LOWER("fmeaId") = LOWER($1)`, [id]); } catch {}
    try { await pool.query(`DELETE FROM pfmea_master_flat_items WHERE LOWER("sourceFmeaId") = LOWER($1)`, [id]); } catch {}
    try { await pool.query(`DELETE FROM pfmea_master_datasets WHERE LOWER("fmeaId") = LOWER($1)`, [id]); } catch {}
    try { await pool.query(`DELETE FROM fmea_worksheet_data WHERE LOWER("fmeaId") = LOWER($1)`, [id]); } catch {}
    await pool.query(`DELETE FROM fmea_projects WHERE "fmeaId" = $1`, [id]);
  }
  console.log(`fmea_projects: ${fmeaProjects.rows.length} deleted\n`);

  // 2. 모든 project_linkages 삭제
  const pl = await pool.query(`DELETE FROM project_linkages`);
  console.log(`project_linkages: ${pl.rowCount} deleted`);

  // 3. 모든 apqp_registrations 삭제
  const apqp = await pool.query(`DELETE FROM apqp_registrations`);
  console.log(`apqp_registrations: ${apqp.rowCount} deleted`);

  // 4. 모든 cp_registrations 삭제
  const cp = await pool.query(`DELETE FROM cp_registrations`);
  console.log(`cp_registrations: ${cp.rowCount} deleted`);

  // 5. 모든 pfd_registrations 삭제
  const pfd = await pool.query(`DELETE FROM pfd_registrations`);
  console.log(`pfd_registrations: ${pfd.rowCount} deleted`);

  // 6. unified_process_items 정리
  try {
    const upi = await pool.query(`DELETE FROM unified_process_items`);
    console.log(`unified_process_items: ${upi.rowCount} deleted`);
  } catch {}

  // 7. access_logs 정리
  try {
    const al = await pool.query(`DELETE FROM access_logs`);
    console.log(`access_logs: ${al.rowCount} deleted`);
  } catch {}

  // 확인
  console.log('\n=== VERIFICATION ===');
  const checks = [
    ['fmea_projects', `SELECT COUNT(*) as cnt FROM fmea_projects`],
    ['fmea_registrations', `SELECT COUNT(*) as cnt FROM fmea_registrations`],
    ['project_linkages', `SELECT COUNT(*) as cnt FROM project_linkages`],
    ['apqp_registrations', `SELECT COUNT(*) as cnt FROM apqp_registrations`],
    ['cp_registrations', `SELECT COUNT(*) as cnt FROM cp_registrations`],
    ['pfd_registrations', `SELECT COUNT(*) as cnt FROM pfd_registrations`],
  ];
  for (const [name, q] of checks) {
    const r = await pool.query(q);
    console.log(`${name}: ${r.rows[0].cnt} records`);
  }

  pool.end();
}
clean().catch(e => { console.error(e); process.exit(1); });
