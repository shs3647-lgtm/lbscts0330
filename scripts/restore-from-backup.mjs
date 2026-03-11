const { Client } = (await import('pg')).default || await import('pg');
const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();

const fmeaId = 'pfm26-f001-l68-r03';
const schema = 'pfmea_pfm26_f001_l68_r03';

// Load most recent backup
const backup = await c.query(
  `SELECT "backupData" FROM public.fmea_version_backups WHERE "fmeaId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
  [fmeaId]
);

const raw = backup.rows[0]?.backupData;
const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
// backupData may be wrapped in { state: { l1, l2, ... } }
const data = parsed?.state || parsed;
console.log('Backup l2 length:', data?.l2?.length);
console.log('Backup l2[0] name:', data?.l2?.[0]?.name);
console.log('Backup failureLinks:', data?.failureLinks?.length);

if (data?.l2?.length > 1) {
  const jsonStr = JSON.stringify(data);

  // Restore public
  await c.query(`UPDATE public.fmea_legacy_data SET data = $1::jsonb WHERE "fmeaId" = $2`, [jsonStr, fmeaId]);

  // Restore project schema
  await c.query(`UPDATE "${schema}".fmea_legacy_data SET data = $1::jsonb WHERE "fmeaId" = $2`, [jsonStr, fmeaId]);

  // Verify
  const v1 = await c.query(`SELECT jsonb_array_length(data->'l2') as len FROM public.fmea_legacy_data WHERE "fmeaId" = $1`, [fmeaId]);
  const v2 = await c.query(`SELECT jsonb_array_length(data->'l2') as len FROM "${schema}".fmea_legacy_data WHERE "fmeaId" = $1`, [fmeaId]);
  console.log('Restored: public l2=' + v1.rows[0]?.len + ' | project l2=' + v2.rows[0]?.len);
} else {
  console.log('Backup has no valid l2 data');
}

await c.end();
