/**
 * FMEA 등록 정보 확인
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    const regs = await prisma.fmeaRegistration.findMany();
    console.log('=== FMEA 등록 정보 ===\n');
    
    regs.forEach(r => {
      console.log('fmeaId:', r.fmeaId);
      console.log('  partName(완제품명):', r.partName || '(없음)');
      console.log('  customerName(고객사):', r.customerName || '(없음)');
      console.log('  fmeaProjectName:', r.fmeaProjectName || '(없음)');
      console.log('  subject:', r.subject || '(없음)');
      console.log('');
    });
    
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
