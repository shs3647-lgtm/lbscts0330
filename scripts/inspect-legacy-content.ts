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
    const legacy = await prisma.fmeaLegacyData.findUnique({
      where: { fmeaId: 'PFM26-M001' }
    });
    
    if (legacy) {
      const data = legacy.data as any;
      console.log('Legacy Data for PFM26-M001:');
      console.log('- L1 Name:', data.l1?.name);
      console.log('- L2 Count:', data.l2?.length);
      if (data.l2 && data.l2.length > 0) {
        console.log('- First L2 Name:', data.l2[0].name);
        console.log('- L3 Count in First L2:', data.l2[0].l3?.length);
      }
    } else {
      console.log('No legacy data found for PFM26-M001');
    }

  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();









