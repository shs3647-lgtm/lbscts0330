import http from 'http';

function fetch(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

const fmeaIds = ['pfm26-p001-l01', 'pfm26-p001-l02', 'pfm26-p002-l03', 'pfm26-p003-l04', 'pfm26-p004-l05', 'pfm26-p004-l05-r01'];

async function main() {
  for (const fmeaId of fmeaIds) {
    const json = await fetch(`/api/pfmea/master?fmeaId=${fmeaId}`);
    const ds = json.dataset;
    if (!ds) { console.log(`${fmeaId}: no dataset`); continue; }
    const items = ds.flatItems || [];
    const bItems = items.filter(i => i.category === 'B');
    const b1 = bItems.filter(i => i.itemCode === 'B1');
    const b2 = bItems.filter(i => i.itemCode === 'B2');
    const b3 = bItems.filter(i => i.itemCode === 'B3');

    // 누락 분석
    const b2Map = new Map();
    b2.forEach(i => b2Map.set(`${i.processNo}|${i.m4||''}`, i.value));
    const b3Map = new Map();
    b3.forEach(i => b3Map.set(`${i.processNo}|${i.m4||''}`, i.value));

    const missing = [];
    b1.forEach(b => {
      const key = `${b.processNo}|${b.m4||''}`;
      if (!b2Map.has(key) || !b3Map.has(key)) {
        missing.push({ pNo: b.processNo, m4: b.m4, val: b.value, hasB2: b2Map.has(key), hasB3: b3Map.has(key) });
      }
    });

    console.log(`\n=== ${fmeaId} ===`);
    console.log(`  B1:${b1.length} B2:${b2.length} B3:${b3.length} | 누락:${missing.length}`);
    if (missing.length > 0) {
      missing.forEach(m => {
        console.log(`  ⚠️ pNo:${m.pNo} m4:${m.m4||'null'} "${m.val}" → B2:${m.hasB2?'O':'X'} B3:${m.hasB3?'O':'X'}`);
      });
    }
  }
}

main().catch(console.error);
