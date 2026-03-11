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
    console.log('Checking Structure Analysis tables (public schema)...');
    
    const l1Count: any = await prisma.$queryRaw`SELECT COUNT(*) FROM l1_structures`;
    const l2Count: any = await prisma.$queryRaw`SELECT COUNT(*) FROM l2_structures`;
    const l3Count: any = await prisma.$queryRaw`SELECT COUNT(*) FROM l3_structures`;
    
    console.log('l1_structures count:', l1Count[0].count);
    console.log('l2_structures count:', l2Count[0].count);
    console.log('l3_structures count:', l3Count[0].count);

    if (l1Count[0].count > 0) {
      const l1Data = await prisma.l1Structure.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' }
      });
      console.log('\nLatest 5 rows in l1_structures:');
      console.table(l1Data);
    }

  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();









