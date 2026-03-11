const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

async function check() {
  const allIds = [];

  // project_linkages (active)
  const linkages = await pool.query(`SELECT "pfmeaId", "dfmeaId", "pfdNo", "cpNo", "apqpNo" FROM project_linkages WHERE status = 'active'`);
  linkages.rows.forEach(row => {
    if (row.pfmeaId) allIds.push(row.pfmeaId);
    if (row.dfmeaId) allIds.push(row.dfmeaId);
    if (row.pfdNo) allIds.push(row.pfdNo);
    if (row.cpNo) allIds.push(row.cpNo);
    if (row.apqpNo) allIds.push(row.apqpNo);
  });

  // fmea_projects
  const fmea = await pool.query(`SELECT "fmeaId" FROM fmea_projects WHERE "deletedAt" IS NULL`);
  fmea.rows.forEach(row => allIds.push(row.fmeaId));

  // cp/pfd
  const cp = await pool.query(`SELECT "cpNo" FROM cp_registrations WHERE "deletedAt" IS NULL`);
  cp.rows.forEach(row => allIds.push(row.cpNo));
  const pfd = await pool.query(`SELECT "pfdNo" FROM pfd_registrations WHERE "deletedAt" IS NULL`);
  pfd.rows.forEach(row => allIds.push(row.pfdNo));

  // 중복 제거
  const uniqueIds = [...new Set(allIds)];
  console.log('All unique IDs:', uniqueIds);

  // getNextLinkGroupNo 시뮬레이션
  const pattern = /-l(\d{2})$/i;
  const linkNos = uniqueIds.map(id => {
    const m = id.match(pattern);
    return m ? parseInt(m[1], 10) : 0;
  }).filter(n => n > 0);
  console.log('Extracted linkNos:', linkNos);
  const next = linkNos.length > 0 ? Math.max(...linkNos) + 1 : 1;
  console.log('Next linkGroupNo:', next, '-> l' + String(next).padStart(2, '0'));

  pool.end();
}
check().catch(e => { console.error(e); process.exit(1); });
