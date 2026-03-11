/**
 * @file cleanup-c4-items.js
 * @description 워크시트 자동싱크로 생성된 C4(고장영향) 항목을 마스터 DB에서 정리
 *
 * 사용법: node scripts/cleanup-c4-items.js
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    console.log('.env 파일을 확인하세요.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. 활성 데이터셋 찾기
    const activeDs = await prisma.pfmeaMasterDataset.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!activeDs) {
      console.log('활성 마스터 데이터셋이 없습니다.');
      return;
    }

    console.log(`활성 데이터셋: ${activeDs.id} (${activeDs.name})`);

    // 2. C4 항목 조회
    const c4Items = await prisma.pfmeaMasterFlatItem.findMany({
      where: { datasetId: activeDs.id, itemCode: 'C4' },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\nC4 항목 총 ${c4Items.length}건:`);
    c4Items.forEach((item, idx) => {
      console.log(`  [${idx + 1}] processNo=${item.processNo}, value="${item.value}", sourceFmeaId=${item.sourceFmeaId || '(없음)'}`);
    });

    if (c4Items.length === 0) {
      console.log('\n정리할 C4 항목이 없습니다.');
      return;
    }

    // 3. C4 항목 삭제
    const result = await prisma.pfmeaMasterFlatItem.deleteMany({
      where: { datasetId: activeDs.id, itemCode: 'C4' },
    });

    console.log(`\n✅ C4 항목 ${result.count}건 삭제 완료`);

  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
