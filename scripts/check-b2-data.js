const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function main() {
  const ds = await p.pfmeaMasterDataset.findFirst({
    where: { fmeaId: 'pfm26-p004-l04' }
  });
  if (!ds) { console.log('dataset not found'); return; }

  // processNo=20 전체 확인
  const items20 = await p.pfmeaMasterFlatItem.findMany({
    where: { datasetId: ds.id, processNo: '20' },
    orderBy: [{ itemCode: 'asc' }, { m4: 'asc' }],
    select: { itemCode: true, m4: true, value: true }
  });

  console.log('=== processNo=20 items ===');
  items20.forEach(i => console.log(`  ${i.itemCode} | m4=${i.m4 || '-'} | "${i.value}"`));

  // B2 전체 확인
  const allB2 = await p.pfmeaMasterFlatItem.findMany({
    where: { datasetId: ds.id, itemCode: 'B2' },
    orderBy: [{ processNo: 'asc' }, { m4: 'asc' }],
    select: { processNo: true, m4: true, value: true }
  });

  console.log('\n=== All B2 items ===');
  allB2.forEach(i => console.log(`  pNo=${i.processNo} | m4=${i.m4 || '-'} | "${i.value}"`));

  await p.$disconnect();
  pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
