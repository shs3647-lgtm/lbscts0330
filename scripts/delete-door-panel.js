const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  const FMEA_ID = 'pfm26-p006-l06';
  
  try {
    console.log('도어패널 PFMEA 삭제:', FMEA_ID);
    
    // Registration 삭제
    await prisma.fmeaRegistration.deleteMany({ where: { fmeaId: FMEA_ID } });
    console.log('  Registration 삭제 완료');
    
    // Worksheet 삭제
    await prisma.fmeaWorksheetData.deleteMany({ where: { fmeaId: FMEA_ID } });
    console.log('  Worksheet 삭제 완료');
    
    // Project 삭제
    await prisma.fmeaProject.deleteMany({ where: { fmeaId: FMEA_ID } });
    console.log('  Project 삭제 완료');
    
    console.log('✅ 도어패널 삭제 완료!');
    
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
