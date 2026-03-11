/**
 * 모든 마스터 레거시 데이터 삭제 스크립트
 * 실행: npx tsx scripts/delete-legacy-c2c3.js
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL 환경 변수가 설정되지 않음');
    return;
  }

  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    console.log('🔴 모든 마스터 레거시 데이터 삭제 시작...');
    
    // 삭제 전 현황 조회
    const beforeCount = await prisma.pfmeaMasterFlatItem.groupBy({
      by: ['itemCode'],
      _count: { id: true }
    });
    
    console.log('\n📊 삭제 전 현황:');
    beforeCount.forEach(item => {
      console.log(`   - ${item.itemCode}: ${item._count.id}건`);
    });
    
    // 모든 FlatItems 삭제
    const deletedItems = await prisma.pfmeaMasterFlatItem.deleteMany({});
    
    // 모든 Datasets 삭제
    const deletedDatasets = await prisma.pfmeaMasterDataset.deleteMany({});
    
    console.log(`\n✅ 삭제 완료!`);
    console.log(`   - 마스터 항목: ${deletedItems.count}건`);
    console.log(`   - 데이터셋: ${deletedDatasets.count}건`);
    
  } catch (error) {
    console.error('❌ 삭제 실패:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
