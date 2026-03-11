const PORT = process.env.PORT || 3000;
const fmeaId = process.argv[2] || 'pfm26-f001-l68-r03';

(async () => {
  const res = await fetch(`http://localhost:${PORT}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
  const d = await res.json();
  if (!d) { console.log('NULL response'); return; }

  console.log('HTTP status:', res.status);
  console.log('ALL keys:', Object.keys(d).join(', '));
  console.log('_isLegacyDirect:', d._isLegacyDirect);
  console.log('_legacyVersion:', d._legacyVersion);
  console.log('_loadedAt:', d._loadedAt);
  console.log('confirmed:', JSON.stringify(d.confirmed));
  console.log('l2 count:', Array.isArray(d.l2) ? d.l2.length : 'N/A');
  console.log('l2Structures count:', Array.isArray(d.l2Structures) ? d.l2Structures.length : 'N/A');
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
