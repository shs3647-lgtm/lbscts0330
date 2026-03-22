import { parsePositionBasedExcel } from '../src/lib/fmea-core/position-parser';

async function run() {
  const r = await parsePositionBasedExcel('data/m102_clean_import.xlsx');

  const b3Items = r.flatData.filter(f => f.itemCode === 'B3');
  const b4Items = r.flatData.filter(f => f.itemCode === 'B4');
  const b3Ids = new Set(b3Items.map(b => b.id));

  console.log('B3 emitted:', b3Items.length);
  console.log('B4 emitted:', b4Items.length);

  const orphanB4 = b4Items.filter(b => !b3Ids.has(b.parentItemId));
  console.log('B4 with orphan parentItemId:', orphanB4.length);

  if (orphanB4.length > 0) {
    for (const b of orphanB4.slice(0, 10)) {
      console.log('  B4:', b.processNo, b.m4, 'parent:', b.parentItemId?.substring(0, 40), 'val:', b.value?.substring(0, 25));
    }

    const groups = new Map<string, typeof b4Items>();
    for (const b of orphanB4) {
      const k = b.processNo + '|' + b.m4;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(b);
    }
    for (const [k, items] of groups) {
      const [pno, m4] = k.split('|');
      const matchingB3 = b3Items.filter(b => b.processNo === pno && b.m4 === m4);
      console.log('  group:', k, 'orphanB4:', items.length, 'availableB3:', matchingB3.length);
    }
  } else {
    console.log('✅ All B4 parentItemIds resolve to B3');
  }
}
run();
