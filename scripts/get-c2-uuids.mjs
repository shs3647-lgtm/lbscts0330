import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const target = await prisma.pfmeaMasterDataset.findFirst({
    where: { fmeaId: { contains: 'm038' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true }
  });

  // Get C2 items without ordering (same as resave-import uses)
  const c2Items = await prisma.pfmeaMasterFlatItem.findMany({
    where: { datasetId: target.id, itemCode: 'C2' },
    select: { id: true, processNo: true, value: true }
  });

  console.log('C2 items (unordered, as loaded by resave-import):');
  c2Items.forEach((c2, i) => {
    console.log(`  index=${i} processNo=${c2.processNo} id=${c2.id} value="${c2.value?.substring(0,50)}"`);
  });

  // Group by processNo (simulating filter in buildWorksheetState)
  const byType = {};
  for (const c2 of c2Items) {
    if (!byType[c2.processNo]) byType[c2.processNo] = [];
    byType[c2.processNo].push(c2);
  }

  console.log('\nRuntime C2 indices per type (as buildWorksheetState sees them):');
  for (const [type, items] of Object.entries(byType)) {
    items.forEach((c2, i) => {
      console.log(`  C2-${type}-${i} → id=${c2.id} value="${c2.value?.substring(0,50)}"`);
    });
  }
}

main().then(() => pool.end()).catch(e => { console.error(e.message); pool.end(); });
