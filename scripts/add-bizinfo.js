const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    // 삼천리자전거 고객정보 추가
    const bizInfo = await prisma.bizInfoProject.create({
      data: {
        customerName: '삼천리자전거',
        customerCode: 'SAMCHULY',
        factory: '본사공장',
        modelYear: 'MY2025',
        program: 'BIKE-01',
        productName: '자전거',
        partNo: 'BF-001'
      }
    });
    
    console.log('✅ 삼천리자전거 고객정보 등록 완료!');
    console.log('  ID:', bizInfo.id);
    console.log('  고객명:', bizInfo.customerName);
    console.log('  코드:', bizInfo.customerCode);
    console.log('  공장:', bizInfo.factory);
    console.log('  MY:', bizInfo.modelYear);
    console.log('  프로그램:', bizInfo.program);
    console.log('  품명:', bizInfo.productName);
    console.log('  품번:', bizInfo.partNo);
    
    // 전체 목록 확인
    const all = await prisma.bizInfoProject.findMany({ orderBy: { createdAt: 'desc' } });
    console.log('\n전체 고객정보:', all.length, '개');
    
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
