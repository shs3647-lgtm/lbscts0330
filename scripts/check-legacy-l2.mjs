const PORT = process.env.PORT || 3000;
const fmeaId = process.argv[2] || 'pfm26-f001-l68-r03';

const res = await fetch(`http://localhost:${PORT}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
const d = await res.json();

console.log('l2 type:', typeof d.l2, Array.isArray(d.l2) ? 'array' : 'not array');
console.log('l2 length:', Array.isArray(d.l2) ? d.l2.length : 'N/A');

if (Array.isArray(d.l2)) {
  d.l2.forEach((p, i) => {
    console.log(`  l2[${i}] no=${p.no} name="${p.name}" l3=${(p.l3||[]).length} func=${(p.functions||[]).length} fm=${(p.failureModes||[]).length} fc=${(p.failureCauses||[]).length}`);
  });
}
