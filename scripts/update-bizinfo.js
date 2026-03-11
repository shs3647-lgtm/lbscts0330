const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    // 삼천리자전거 고객정보 수정
    const result = await prisma.bizInfoProject.updateMany({
      where: { customerName: '삼천리자전거' },
      data: {
        productName: '자전거 프레임',
        program: '생산공정'
      }
    });
    
    console.log('✅ 수정 완료!', result.count, '건');
    
    // 수정 결과 확인
    const updated = await prisma.bizInfoProject.findFirst({
      where: { customerName: '삼천리자전거' }
    });
    
    console.log('\n수정된 정보:');
    console.log('  고객명:', updated.customerName);
    console.log('  코드:', updated.customerCode);
    console.log('  공장:', updated.factory);
    console.log('  MY:', updated.modelYear);
    console.log('  프로그램:', updated.program);
    console.log('  품명:', updated.productName);
    console.log('  품번:', updated.partNo);
    
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
