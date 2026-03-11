const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    // 삼천리자전거 고객사 등록
    const customer = await prisma.customer.create({
      data: {
        name: '삼천리자전거',
        code: 'SAMCHULY',
        description: '자전거 완성차 제조사',
        sortOrder: 1
      }
    });
    
    console.log('✅ 고객사 등록 완료!');
    console.log('  ID:', customer.id);
    console.log('  이름:', customer.name);
    console.log('  코드:', customer.code);
    console.log('  설명:', customer.description);
    
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
