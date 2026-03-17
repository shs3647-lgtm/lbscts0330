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

  const items = await prisma.pfmeaMasterFlatItem.findMany({
    where: { datasetId: target.id, itemCode: { in: ['C1','C2','C3'] } },
    select: { itemCode: true, processNo: true, category: true, value: true, parentItemId: true },
    take: 30
  });

  console.log('itemCode | processNo | category | value (40) | parentItemId (8)');
  for (const i of items) {
    console.log(`${i.itemCode} | "${i.processNo}" | "${i.category}" | "${i.value?.substring(0,40)}" | ${i.parentItemId?.substring(0,8) || 'null'}`);
  }
}

main().then(() => pool.end()).catch(e => { console.error(e.message); pool.end(); });
