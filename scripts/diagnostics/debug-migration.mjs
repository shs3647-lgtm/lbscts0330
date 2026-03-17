const { Client } = (await import('pg')).default || await import('pg');
const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();

const r = await c.query(`SELECT data FROM public.fmea_legacy_data WHERE "fmeaId" = 'pfm26-f001-l68-r03'`);
const data = r.rows[0].data;

console.log('typeof data:', typeof data);
console.log('typeof data.l2:', typeof data.l2);
console.log('l2 length:', data.l2?.length);

data.l2?.forEach((proc, i) => {
  const skip = !proc.name || proc.name.includes('\uD074\uB9AD') || proc.name.includes('\uC120\uD0DD');
  console.log(`l2[${i}] name="${proc.name}" skip=${skip} id=${proc.id?.substring(0,20)}`);
});

// Now test what rebuild-atomic API gets
console.log('\n--- Testing via rebuild-atomic API (GET first) ---');
const PORT = process.env.PORT || 3000;
const getRes = await fetch(`http://localhost:${PORT}/api/fmea?fmeaId=pfm26-f001-l68-r03`);
const getBody = await getRes.json();
console.log('GET l2 count:', getBody.l2?.length);
console.log('GET l2[0] name:', getBody.l2?.[0]?.name);
console.log('GET _isLegacyDirect:', getBody._isLegacyDirect);

await c.end();
