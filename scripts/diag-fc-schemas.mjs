import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });

const { rows: schemas } = await pool.query(
  "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%' ORDER BY schema_name"
);
console.log('Project schemas:', schemas.map(s => s.schema_name));

const { rows: pubL2 } = await pool.query('SELECT COUNT(*) as cnt FROM public.l2_structures');
const { rows: pubFC } = await pool.query('SELECT COUNT(*) as cnt FROM public.failure_causes');
const { rows: pubL3F } = await pool.query('SELECT COUNT(*) as cnt FROM public.l3_functions');
console.log('public: L2=' + pubL2[0].cnt + ' FC=' + pubFC[0].cnt + ' L3F=' + pubL3F[0].cnt);

for (const s of schemas) {
  try {
    const { rows: r } = await pool.query(`SELECT COUNT(*) as cnt FROM "${s.schema_name}".l2_structures`);
    const { rows: r2 } = await pool.query(`SELECT COUNT(*) as cnt FROM "${s.schema_name}".failure_causes`);
    const { rows: r3 } = await pool.query(`SELECT COUNT(*) as cnt FROM "${s.schema_name}".l3_functions`);
    const { rows: r4 } = await pool.query(`SELECT COUNT(*) as cnt FROM "${s.schema_name}".l3_structures`);
    const { rows: r5 } = await pool.query(`SELECT COUNT(*) as cnt FROM "${s.schema_name}".failure_links`);
    console.log(`${s.schema_name}: L2=${r[0].cnt} L3S=${r4[0].cnt} L3F=${r3[0].cnt} FC=${r2[0].cnt} FL=${r5[0].cnt}`);
  } catch(e) { console.log(s.schema_name + ': ' + e.message); }
}

// Check legacy data
try {
  const { rows: leg } = await pool.query("SELECT COUNT(*) as cnt FROM public.fmea_legacy_data");
  console.log('fmea_legacy_data count:', leg[0].cnt);
  const { rows: legIds } = await pool.query('SELECT "fmeaId" FROM public.fmea_legacy_data LIMIT 5');
  console.log('legacy fmeaIds:', legIds.map(r => r.fmeaId));
} catch(e) { console.log('legacy check:', e.message); }

await pool.end();
