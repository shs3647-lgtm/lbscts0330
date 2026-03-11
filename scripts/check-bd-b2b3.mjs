import http from 'http';

const fmeaId = 'pfm26-p001-l02';

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

async function main() {
  const json = await fetch(`/api/pfmea/master?fmeaId=${fmeaId}`);
  const ds = json.dataset;
  if (!ds) { console.log('dataset not found'); return; }
  const items = ds.flatItems || [];
  console.log(`=== ${fmeaId} BD 데이터 ===`);
  console.log('총 항목:', items.length);

  const bItems = items.filter(i => i.category === 'B');
  const codes = ['B1','B2','B3','B4','B5'];
  for (const code of codes) {
    const list = bItems.filter(i => i.itemCode === code);
    console.log(`${code}: ${list.length}건`);
  }

  console.log('\n--- B1 (작업요소) ---');
  bItems.filter(i => i.itemCode === 'B1').forEach(i =>
    console.log(`  pNo:${i.processNo} | m4:${i.m4||'null'} | ${i.value}`)
  );

  console.log('\n--- B2 (작업요소기능) ---');
  bItems.filter(i => i.itemCode === 'B2').forEach(i =>
    console.log(`  pNo:${i.processNo} | m4:${i.m4||'null'} | ${i.value}`)
  );

  console.log('\n--- B3 (공정특성) ---');
  bItems.filter(i => i.itemCode === 'B3').forEach(i =>
    console.log(`  pNo:${i.processNo} | m4:${i.m4||'null'} | ${i.value}`)
  );

  // 누락 분석: B1은 있지만 B2가 없는 항목
  const b1List = bItems.filter(i => i.itemCode === 'B1');
  const b2Set = new Set(bItems.filter(i => i.itemCode === 'B2').map(i => `${i.processNo}|${i.m4||''}`));
  const b3Set = new Set(bItems.filter(i => i.itemCode === 'B3').map(i => `${i.processNo}|${i.m4||''}`));

  console.log('\n--- 누락 분석 (B1 있지만 B2/B3 없음) ---');
  b1List.forEach(b1 => {
    const key = `${b1.processNo}|${b1.m4||''}`;
    const hasB2 = b2Set.has(key);
    const hasB3 = b3Set.has(key);
    if (!hasB2 || !hasB3) {
      console.log(`  pNo:${b1.processNo} m4:${b1.m4||'null'} "${b1.value}" → B2:${hasB2?'O':'X'} B3:${hasB3?'O':'X'}`);
    }
  });
}

main().catch(console.error);
