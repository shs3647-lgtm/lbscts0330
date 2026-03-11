const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const M4_CODES = ['MN', 'MC', 'MM', 'MT', 'ME', 'Man', 'Machine', 'Material', 'Method', 'Environment'];

async function fixPfdEquipment() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // PfdItem에서 4M 코드가 equipment에 들어간 행 찾기
  const items = await prisma.pfdItem.findMany({
    where: { equipment: { in: M4_CODES } },
    select: { id: true, pfdId: true, processNo: true, equipment: true },
  });

  console.log(`Found ${items.length} PFD items with 4M codes in equipment field`);

  if (items.length > 0) {
    for (const item of items) {
      console.log(`  - ${item.pfdId} / P-No: ${item.processNo} / equipment: "${item.equipment}" -> ""`);
    }

    // equipment를 빈 문자열로 업데이트
    const result = await prisma.pfdItem.updateMany({
      where: { equipment: { in: M4_CODES } },
      data: { equipment: '' },
    });
    console.log(`Updated ${result.count} rows`);
  }

  // UnifiedProcessItem도 확인
  try {
    const unified = await prisma.unifiedProcessItem.findMany({
      where: { equipment: { in: M4_CODES } },
      select: { id: true, equipment: true },
    });
    if (unified.length > 0) {
      console.log(`Found ${unified.length} UnifiedProcessItem rows with 4M codes`);
      const result2 = await prisma.unifiedProcessItem.updateMany({
        where: { equipment: { in: M4_CODES } },
        data: { equipment: '' },
      });
      console.log(`Updated ${result2.count} UnifiedProcessItem rows`);
    }
  } catch (e) {
    console.log('UnifiedProcessItem table not found or error:', e.message);
  }

  await prisma.$disconnect();
  await pool.end();
  console.log('Done');
}

fixPfdEquipment().catch(e => { console.error(e); process.exit(1); });
