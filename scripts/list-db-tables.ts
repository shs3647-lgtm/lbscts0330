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
    const tables: any = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('Tables in public schema:');
    console.table(tables);
    
    // Check if pfmea_master_datasets table exists
    const hasDatasets = tables.some((t: any) => t.table_name === 'pfmea_master_datasets');
    if (hasDatasets) {
      const datasetCount: any = await prisma.$queryRaw`SELECT COUNT(*) FROM pfmea_master_datasets`;
      console.log('pfmea_master_datasets count:', datasetCount[0].count);
    } else {
      console.log('pfmea_master_datasets table not found');
    }

    const hasFlatItems = tables.some((t: any) => t.table_name === 'pfmea_master_flat_items');
    if (hasFlatItems) {
      const flatItemCount: any = await prisma.$queryRaw`SELECT COUNT(*) FROM pfmea_master_flat_items`;
      console.log('pfmea_master_flat_items count:', flatItemCount[0].count);
    } else {
      console.log('pfmea_master_flat_items table not found');
    }

  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
