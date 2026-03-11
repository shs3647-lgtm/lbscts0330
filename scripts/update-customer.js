const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    // 현재 고객사 목록 확인
    const customers = await prisma.customer.findMany({ orderBy: { sortOrder: 'asc' } });
    console.log('현재 고객사:', customers.length, '개');
    customers.forEach(c => console.log(' -', c.name, '| sortOrder:', c.sortOrder));
    
    // 삼천리자전거 sortOrder를 0으로 (최상단)
    const result = await prisma.customer.updateMany({
      where: { name: '삼천리자전거' },
      data: { sortOrder: 0 }
    });
    
    console.log('\n✅ 삼천리자전거 sortOrder 0으로 수정 완료 (', result.count, '건)');
    
    // 수정 후 확인
    const updated = await prisma.customer.findMany({ orderBy: { sortOrder: 'asc' } });
    console.log('\n수정 후 고객사 목록:');
    updated.forEach(c => console.log(' -', c.name, '| sortOrder:', c.sortOrder));
    
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
