const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const datasets = await p.pfmeaMasterDataset.findMany({
    where: { isActive: true },
    select: { id: true, fmeaId: true },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });
  for (const ds of datasets) {
    const codes = await p.pfmeaMasterFlatItem.groupBy({
      by: ['itemCode'],
      where: { datasetId: ds.id },
      _count: { _all: true },
    });
    const a2 = codes.find(c => c.itemCode === 'A2')?._count._all || 0;
    const b1 = codes.find(c => c.itemCode === 'B1')?._count._all || 0;
    const total = codes.reduce((s, c) => s + c._count._all, 0);
    console.log(`${ds.fmeaId} total=${total} A2=${a2} B1=${b1}`);
  }
}

main().catch(console.error).finally(() => p.$disconnect());
