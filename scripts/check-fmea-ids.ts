import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check all FMEA-related tables
  const projects = await prisma.fmeaProject.findMany({ select: { id: true, fmeaId: true, fmeaType: true } });
  const regs = await prisma.fmeaRegistration.findMany({ select: { id: true, fmeaId: true } });
  const worksheets = await prisma.fmeaWorksheetData.findMany({ select: { id: true, fmeaId: true } });

  console.log('=== DB 잔여 데이터 ===');
  console.log('FmeaProject:', projects.length, projects.map((p: any) => p.fmeaId));
  console.log('FmeaRegistration:', regs.length, regs.map((r: any) => r.fmeaId));
  console.log('FmeaWorksheetData:', worksheets.length, worksheets.map((w: any) => w.fmeaId));

  await prisma.$disconnect();
  await pool.end();
}
main();
