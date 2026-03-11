import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const projects = await prisma.fmeaProject.findMany();
    console.log('Projects in public.fmea_projects:');
    console.table(projects);
    
    const legacyData = await prisma.fmeaLegacyData.findMany({
      select: { fmeaId: true, version: true, updatedAt: true }
    });
    console.log('\nLegacy Data in public.fmea_legacy_data:');
    console.table(legacyData);

  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();









