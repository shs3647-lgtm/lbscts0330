import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const schemas = await prisma.$queryRawUnsafe(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea%' OR schema_name LIKE 'fmea%' ORDER BY schema_name"
  ) as any[];
  console.log('Project schemas:', schemas.map((s: any) => s.schema_name));

  // Also check if data is in public schema
  const publicLinks = await prisma.failureLink.count({ where: { fmeaId: 'pfm26-m016', deletedAt: null } });
  console.log('Public schema FailureLink count:', publicLinks);

  // Check FmeaProject for this fmeaId
  const proj = await prisma.fmeaProject.findFirst({
    where: { fmeaId: 'pfm26-m016' },
    select: { fmeaId: true, fmeaType: true },
  });
  console.log('Project:', proj);

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
