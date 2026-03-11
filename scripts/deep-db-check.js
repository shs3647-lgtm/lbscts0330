const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

async function check() {
  console.log('=== FULL DB AUDIT ===\n');

  // 1. All fmea_projects
  const fmea = await pool.query(`SELECT "fmeaId", "fmeaType", status, "deletedAt", "parentApqpNo", "createdAt" FROM fmea_projects ORDER BY "createdAt"`);
  console.log('--- fmea_projects (' + fmea.rows.length + ') ---');
  fmea.rows.forEach(r => console.log(JSON.stringify(r)));

  // 2. All fmea_registrations
  const regs = await pool.query(`SELECT "fmeaId", subject, "customerName", "createdAt" FROM fmea_registrations ORDER BY "createdAt"`);
  console.log('\n--- fmea_registrations (' + regs.rows.length + ') ---');
  regs.rows.forEach(r => console.log(JSON.stringify(r)));

  // 3. All project_linkages
  const links = await pool.query(`SELECT id, "apqpNo", "pfmeaId", "dfmeaId", "pfdNo", "cpNo", status, "createdAt" FROM project_linkages ORDER BY "createdAt"`);
  console.log('\n--- project_linkages (' + links.rows.length + ') ---');
  links.rows.forEach(r => console.log(JSON.stringify(r)));

  // 4. All apqp/cp/pfd/ws/pm registrations
  for (const [table, col] of [
    ['apqp_registrations', 'apqpNo'],
    ['cp_registrations', 'cpNo'],
    ['pfd_registrations', 'pfdNo'],
    ['ws_registrations', 'wsNo'],
    ['pm_registrations', 'pmNo'],
  ]) {
    try {
      const r = await pool.query(`SELECT "${col}", "deletedAt", "createdAt" FROM ${table} ORDER BY "createdAt"`);
      console.log(`\n--- ${table} (${r.rows.length}) ---`);
      r.rows.forEach(row => console.log(JSON.stringify(row)));
    } catch (e) {
      console.log(`\n--- ${table}: ERROR - ${e.message} ---`);
    }
  }

  // 5. Orphan check: fmea_projects without matching project_linkages
  console.log('\n=== ORPHAN CHECK ===');
  const orphans = await pool.query(`
    SELECT fp."fmeaId", fp."fmeaType"
    FROM fmea_projects fp
    LEFT JOIN project_linkages pl ON (
      LOWER(pl."pfmeaId") = LOWER(fp."fmeaId") OR 
      LOWER(pl."dfmeaId") = LOWER(fp."fmeaId")
    )
    WHERE pl.id IS NULL AND fp."deletedAt" IS NULL
  `);
  console.log('fmea_projects WITHOUT project_linkages:', orphans.rows);

  // 6. Check for any soft-deleted records
  const softDeleted = await pool.query(`SELECT "fmeaId", "deletedAt" FROM fmea_projects WHERE "deletedAt" IS NOT NULL`);
  console.log('\nSoft-deleted fmea_projects:', softDeleted.rows);

  pool.end();
}
check().catch(e => { console.error(e); process.exit(1); });
