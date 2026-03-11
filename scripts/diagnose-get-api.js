const PORT = process.env.PORT || 3000;
const fmeaId = process.argv[2] || 'pfm26-f001-l68-r03';

(async () => {
  const res = await fetch(`http://localhost:${PORT}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
  const d = await res.json();
  if (!d) { console.log('NULL response'); return; }

  console.log('HTTP status:', res.status);
  console.log('Top-level keys:', Object.keys(d).slice(0, 20).join(', '));
  console.log('fmeaId:', d.fmeaId);

  const l1 = d.l1;
  if (l1) {
    console.log('l1 type:', typeof l1, Array.isArray(l1) ? 'array len=' + l1.length : '');
    console.log('l1 preview:', JSON.stringify(l1).substring(0, 200));
  } else {
    console.log('l1: MISSING');
  }

  const l2 = d.l2;
  if (Array.isArray(l2)) {
    console.log('l2 count:', l2.length);
    l2.forEach((p, i) => {
      const l3c = (p.l3 || []).length;
      const fnc = (p.functions || []).length;
      const fmc = (p.failureModes || []).length;
      console.log(`  l2[${i}] no=${p.no} name=${p.name} l3=${l3c} func=${fnc} fm=${fmc}`);
    });
  } else {
    console.log('l2: NOT ARRAY or MISSING, type:', typeof l2);
  }
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
