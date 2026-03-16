import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // 최신 데이터셋 목록
  const datasets = await prisma.pfmeaMasterDataset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, fmeaId: true, createdAt: true }
  });
  console.log('최근 데이터셋:');
  datasets.forEach(d => console.log(`  ${d.fmeaId} — ${d.createdAt.toISOString().substring(0,19)}`));

  // 가장 최신 데이터셋의 C3 parentItemId 상태 확인
  const latest = datasets[0];
  console.log(`\n[${latest.fmeaId}] C3 parentItemId 상태:`);

  const c3Items = await prisma.pfmeaMasterFlatItem.findMany({
    where: { datasetId: latest.id, itemCode: 'C3' },
    select: { id: true, processNo: true, value: true, parentItemId: true },
    take: 20
  });

  const withParent = c3Items.filter(i => i.parentItemId);
  const withoutParent = c3Items.filter(i => !i.parentItemId);

  console.log(`  총 C3: ${c3Items.length}개`);
  console.log(`  parentItemId 있음: ${withParent.length}개`);
  console.log(`  parentItemId 없음 (orphan): ${withoutParent.length}개`);

  if (withoutParent.length > 0) {
    console.log('\n  ⚠ orphan C3 목록:');
    withoutParent.forEach(i => console.log(`    [${i.processNo}] "${i.value?.substring(0,50)}"`));
  }

  if (withParent.length > 0) {
    console.log('\n  ✓ parentItemId 설정된 C3 샘플 (최대 10개):');
    withParent.slice(0, 10).forEach(i =>
      console.log(`    [${i.processNo}] "${i.value?.substring(0,45)}" → ${i.parentItemId?.substring(0,8)}...`)
    );
  }
}

main().then(() => pool.end()).catch(e => { console.error(e.message); pool.end(); });
