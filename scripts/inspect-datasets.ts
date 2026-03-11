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
    const datasets: any = await prisma.$queryRaw`
      SELECT id, name, "isActive", "createdAt"
      FROM pfmea_master_datasets
      ORDER BY "createdAt" DESC;
    `;
    console.log('PFMEA Master Datasets:');
    console.table(datasets);
    
    for (const ds of datasets) {
      const count: any = await prisma.$queryRaw`
        SELECT COUNT(*) FROM pfmea_master_flat_items WHERE "datasetId" = ${ds.id}
      `;
      console.log(`Dataset "${ds.name}" (ID: ${ds.id}) has ${count[0].count} items.`);
    }

  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();









