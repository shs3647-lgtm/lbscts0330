import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const S = 'pfmea_pfm26_m016';
const F = 'pfm26-m016';

async function q(sql: string) {
  return prisma.$queryRawUnsafe(sql, F) as Promise<any[]>;
}

async function main() {
  console.log(`=== ${S} 스키마 진단 ===\n`);

  const counts = {
    l1_functions: (await q(`SELECT COUNT(*)::int as c FROM "${S}".l1_functions WHERE "fmeaId"=$1`))[0]?.c,
    failure_effects: (await q(`SELECT COUNT(*)::int as c FROM "${S}".failure_effects WHERE "fmeaId"=$1`))[0]?.c,
    failure_modes: (await q(`SELECT COUNT(*)::int as c FROM "${S}".failure_modes WHERE "fmeaId"=$1`))[0]?.c,
    failure_causes: (await q(`SELECT COUNT(*)::int as c FROM "${S}".failure_causes WHERE "fmeaId"=$1`))[0]?.c,
    failure_links: (await q(`SELECT COUNT(*)::int as c FROM "${S}".failure_links WHERE "fmeaId"=$1 AND "deletedAt" IS NULL`))[0]?.c,
    failure_analyses: (await q(`SELECT COUNT(*)::int as c FROM "${S}".failure_analyses WHERE "fmeaId"=$1`))[0]?.c,
    risk_analyses: (await q(`SELECT COUNT(*)::int as c FROM "${S}".risk_analyses WHERE "fmeaId"=$1`))[0]?.c,
  };
  console.log('DB Counts:', counts);

  // FE l1FuncId 유효성
  const badFEs = await q(`
    SELECT fe.id, fe."l1FuncId"
    FROM "${S}".failure_effects fe
    LEFT JOIN "${S}".l1_functions l1f ON fe."l1FuncId" = l1f.id AND l1f."fmeaId"=$1
    WHERE fe."fmeaId"=$1 AND l1f.id IS NULL
  `);
  console.log(`\nFE with BAD l1FuncId: ${badFEs.length}`);

  // Link FK
  const badLinks = await q(`
    SELECT fl.id,
      CASE WHEN fm.id IS NULL THEN 'FM_MISS' ELSE 'OK' END as fm_status,
      CASE WHEN fe.id IS NULL THEN 'FE_MISS' ELSE 'OK' END as fe_status,
      CASE WHEN fc.id IS NULL THEN 'FC_MISS' ELSE 'OK' END as fc_status
    FROM "${S}".failure_links fl
    LEFT JOIN "${S}".failure_modes fm ON fm.id = fl."fmId"
    LEFT JOIN "${S}".failure_effects fe ON fe.id = fl."feId"
    LEFT JOIN "${S}".failure_causes fc ON fc.id = fl."fcId"
    WHERE fl."fmeaId"=$1 AND fl."deletedAt" IS NULL
      AND (fm.id IS NULL OR fe.id IS NULL OR fc.id IS NULL)
  `);
  console.log(`Links with BAD FK: ${badLinks.length}`);
  if (badLinks.length > 0) {
    badLinks.slice(0, 5).forEach((l: any) => console.log(`  ${l.fm_status} ${l.fe_status} ${l.fc_status}`));
  }

  // FA linkId 유효성
  if (counts.failure_analyses > 0) {
    const badFAs = await q(`
      SELECT fa."linkId"
      FROM "${S}".failure_analyses fa
      LEFT JOIN "${S}".failure_links fl ON fl.id = fa."linkId" AND fl."deletedAt" IS NULL
      WHERE fa."fmeaId"=$1 AND fl.id IS NULL
    `);
    console.log(`FA with BAD linkId: ${badFAs.length}/${counts.failure_analyses}`);
  }

  // RA linkId 유효성
  if (counts.risk_analyses > 0) {
    const badRAs = await q(`
      SELECT ra."linkId"
      FROM "${S}".risk_analyses ra
      LEFT JOIN "${S}".failure_links fl ON fl.id = ra."linkId" AND fl."deletedAt" IS NULL
      WHERE ra."fmeaId"=$1 AND fl.id IS NULL
    `);
    console.log(`RA with BAD linkId: ${badRAs.length}/${counts.risk_analyses}`);
  }

  // Soft-deleted links
  const softDeleted = await q(`
    SELECT COUNT(*)::int as c FROM "${S}".failure_links
    WHERE "fmeaId"=$1 AND "deletedAt" IS NOT NULL
  `);
  console.log(`\nSoft-deleted links: ${softDeleted[0]?.c}`);

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
