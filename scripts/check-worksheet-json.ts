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
    console.log('Checking Worksheet JSON storage tables...');
    
    const worksheetCount: any = await prisma.$queryRaw`SELECT COUNT(*) FROM fmea_worksheet_data`;
    const legacyCount: any = await prisma.$queryRaw`SELECT COUNT(*) FROM fmea_legacy_data`;
    
    console.log('fmea_worksheet_data count:', worksheetCount[0].count);
    console.log('fmea_legacy_data count:', legacyCount[0].count);

    if (worksheetCount[0].count > 0) {
      const worksheetData = await prisma.fmeaWorksheetData.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: { fmeaId: true, updatedAt: true, version: true }
      });
      console.log('\nLatest 5 rows in fmea_worksheet_data:');
      console.table(worksheetData);
    }

    if (legacyCount[0].count > 0) {
      const legacyData = await prisma.fmeaLegacyData.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: { fmeaId: true, updatedAt: true, version: true }
      });
      console.log('\nLatest 5 rows in fmea_legacy_data:');
      console.table(legacyData);
    }

  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();









