import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check tables in the project schema
  const tables = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'pfmea_pfm26_m016' ORDER BY table_name`
  ) as any[];
  console.log(`pfmea_pfm26_m016 tables (${tables.length}):`);
  tables.forEach((t: any) => console.log(`  ${t.table_name}`));

  // Check tables in public schema
  const pubTables = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('FailureLink','FailureEffect','FailureMode','FailureCause','L1Function','FailureAnalysis','RiskAnalysis') ORDER BY table_name`
  ) as any[];
  console.log(`\npublic schema tables:`, pubTables.map((t: any) => t.table_name));

  // Check if the search_path includes the project schema
  const searchPath = await prisma.$queryRawUnsafe(`SHOW search_path`) as any[];
  console.log(`\nsearch_path:`, searchPath);

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
