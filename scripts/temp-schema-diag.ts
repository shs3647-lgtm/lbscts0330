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
    L1Function: (await q(`SELECT COUNT(*)::int as c FROM "${S}"."L1Function" WHERE "fmeaId"=$1`))[0]?.c,
    FailureEffect: (await q(`SELECT COUNT(*)::int as c FROM "${S}"."FailureEffect" WHERE "fmeaId"=$1`))[0]?.c,
    FailureMode: (await q(`SELECT COUNT(*)::int as c FROM "${S}"."FailureMode" WHERE "fmeaId"=$1`))[0]?.c,
    FailureCause: (await q(`SELECT COUNT(*)::int as c FROM "${S}"."FailureCause" WHERE "fmeaId"=$1`))[0]?.c,
    FailureLink: (await q(`SELECT COUNT(*)::int as c FROM "${S}"."FailureLink" WHERE "fmeaId"=$1 AND "deletedAt" IS NULL`))[0]?.c,
    FailureAnalysis: (await q(`SELECT COUNT(*)::int as c FROM "${S}"."FailureAnalysis" WHERE "fmeaId"=$1`))[0]?.c,
    RiskAnalysis: (await q(`SELECT COUNT(*)::int as c FROM "${S}"."RiskAnalysis" WHERE "fmeaId"=$1`))[0]?.c,
  };
  console.log('DB Counts:', counts);

  // FE l1FuncId 유효성
  const badFEs = await q(`
    SELECT fe.id, fe."l1FuncId"
    FROM "${S}"."FailureEffect" fe
    LEFT JOIN "${S}"."L1Function" l1f ON fe."l1FuncId" = l1f.id AND l1f."fmeaId"=$1
    WHERE fe."fmeaId"=$1 AND l1f.id IS NULL
  `);
  console.log(`\nFE with BAD l1FuncId: ${badFEs.length}`);

  // Link FK
  const badLinks = await q(`
    SELECT fl.id,
      CASE WHEN fm.id IS NULL THEN 'FM_MISS' ELSE 'OK' END as fm_status,
      CASE WHEN fe.id IS NULL THEN 'FE_MISS' ELSE 'OK' END as fe_status,
      CASE WHEN fc.id IS NULL THEN 'FC_MISS' ELSE 'OK' END as fc_status
    FROM "${S}"."FailureLink" fl
    LEFT JOIN "${S}"."FailureMode" fm ON fm.id = fl."fmId"
    LEFT JOIN "${S}"."FailureEffect" fe ON fe.id = fl."feId"
    LEFT JOIN "${S}"."FailureCause" fc ON fc.id = fl."fcId"
    WHERE fl."fmeaId"=$1 AND fl."deletedAt" IS NULL
      AND (fm.id IS NULL OR fe.id IS NULL OR fc.id IS NULL)
  `);
  console.log(`Links with BAD FK: ${badLinks.length}`);
  if (badLinks.length > 0) {
    badLinks.slice(0, 5).forEach((l: any) => console.log(`  ${l.fm_status} ${l.fe_status} ${l.fc_status}`));
  }

  // FA linkId 유효성
  if (counts.FailureAnalysis > 0) {
    const badFAs = await q(`
      SELECT fa."linkId"
      FROM "${S}"."FailureAnalysis" fa
      LEFT JOIN "${S}"."FailureLink" fl ON fl.id = fa."linkId" AND fl."deletedAt" IS NULL
      WHERE fa."fmeaId"=$1 AND fl.id IS NULL
    `);
    console.log(`FA with BAD linkId: ${badFAs.length}/${counts.FailureAnalysis}`);
  }

  // RA linkId 유효성
  if (counts.RiskAnalysis > 0) {
    const badRAs = await q(`
      SELECT ra."linkId"
      FROM "${S}"."RiskAnalysis" ra
      LEFT JOIN "${S}"."FailureLink" fl ON fl.id = ra."linkId" AND fl."deletedAt" IS NULL
      WHERE ra."fmeaId"=$1 AND fl.id IS NULL
    `);
    console.log(`RA with BAD linkId: ${badRAs.length}/${counts.RiskAnalysis}`);
  }

  // Soft-deleted links
  const softDeleted = await q(`
    SELECT COUNT(*)::int as c FROM "${S}"."FailureLink"
    WHERE "fmeaId"=$1 AND "deletedAt" IS NOT NULL
  `);
  console.log(`\nSoft-deleted links: ${softDeleted[0]?.c}`);

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
