const { Client } = (await import('pg')).default || await import('pg');
const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();

const fmeaId = process.argv[2] || 'pfm26-f001-l68-r03';
const schema = 'pfmea_' + fmeaId.replace(/[^a-z0-9]/gi, '_').toLowerCase();

// Check project schema legacyData
const r = await c.query(`SELECT data FROM "${schema}".fmea_legacy_data WHERE "fmeaId" = $1`, [fmeaId]);
const data = r.rows[0]?.data;
const l2 = data?.l2 || [];
console.log(`[${fmeaId}] legacyData l2 count: ${l2.length}`);
l2.forEach((p, i) => console.log(`  l2[${i}]: no=${p.no || ''} name="${p.name}"`));
console.log(`failureLinks: ${data?.failureLinks?.length || 0}`);

// Check public
const pub = await c.query(`SELECT jsonb_array_length(data->'l2') as len FROM public.fmea_legacy_data WHERE "fmeaId" = $1`, [fmeaId]);
console.log(`public l2: ${pub.rows[0]?.len}`);

await c.end();
