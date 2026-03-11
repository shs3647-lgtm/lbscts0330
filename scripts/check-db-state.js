const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function main() {
  const ds = await p.pfmeaMasterDataset.findMany({
    select: { id: true, fmeaId: true }
  });

  for (const d of ds) {
    const items = await p.pfmeaMasterFlatItem.findMany({
      where: { datasetId: d.id },
      select: { itemCode: true, processNo: true, value: true, m4: true, category: true },
      orderBy: [{ processNo: 'asc' }, { itemCode: 'asc' }],
    });

    console.log(`\n=== ${d.fmeaId} (${items.length}건) ===`);

    // 00, 0, 공통공정 관련 항목만 출력
    const special = items.filter(i =>
      i.processNo === '0' || i.processNo === '00' ||
      i.processNo === '공통공정' || i.processNo.includes('공통')
    );
    if (special.length > 0) {
      console.log('\n--- 공통공정 관련 항목 ---');
      special.forEach(i => console.log(`  pNo="${i.processNo}" | ${i.itemCode} | m4=${i.m4||'-'} | "${i.value}"`));
    } else {
      console.log('  공통공정 항목 없음');
    }

    // 모든 고유 processNo 출력
    const pNos = [...new Set(items.map(i => i.processNo))].sort();
    console.log('\n전체 processNo:', pNos.join(', '));
  }

  await p.$disconnect();
  pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
