const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public' });

async function main() {
  const res = await pool.query('SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1', ['pfm26-m001']);
  const d = res.rows[0].data;
  const M4 = new Set(['MN', 'MC', 'MD', 'JG', 'IM', 'EN']);
  let removed = 0;

  (d.l2 || []).forEach(proc => {
    if (proc.l3) {
      const before = proc.l3.length;
      proc.l3 = proc.l3.filter(we => {
        const stripped = (we.name || '').replace(/^\d+\s+/, '').toUpperCase().trim();
        return !M4.has(stripped);
      });
      removed += before - proc.l3.length;
    }
  });

  console.log('Removed', removed, 'bad L3 entries from legacy JSON');

  await pool.query('UPDATE fmea_legacy_data SET data = $1 WHERE "fmeaId" = $2', [JSON.stringify(d), 'pfm26-m001']);
  console.log('Updated pfm26-m001 legacy data');

  // Verify
  const verify = await pool.query('SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1', ['pfm26-m001']);
  const v = verify.rows[0].data;
  const totalL3 = (v.l2 || []).reduce((s, p) => s + (p.l3 || []).length, 0);
  console.log('After cleanup:', totalL3, 'L3 entries remaining');

  // Show remaining L3 entries
  (v.l2 || []).forEach(proc => {
    (proc.l3 || []).forEach(we => {
      console.log('  Process', proc.no, proc.name, '-> L3:', JSON.stringify(we.name), 'm4:', we.m4);
    });
  });

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
