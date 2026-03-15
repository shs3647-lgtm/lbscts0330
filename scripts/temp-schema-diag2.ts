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
  return prisma.$queryRawUnsafe(sql) as Promise<any[]>;
}

async function main() {
  console.log(`=== ${S} 스키마 진단 ===\n`);

  const cnt = async (t: string) => (await q(`SELECT COUNT(*)::int as c FROM "${S}".${t} WHERE fmea_id='${F}'`))[0]?.c;

  const counts = {
    l1_functions: await cnt('l1_functions'),
    failure_effects: await cnt('failure_effects'),
    failure_modes: await cnt('failure_modes'),
    failure_causes: await cnt('failure_causes'),
    failure_links: (await q(`SELECT COUNT(*)::int as c FROM "${S}".failure_links WHERE fmea_id='${F}' AND deleted_at IS NULL`))[0]?.c,
    failure_analyses: await cnt('failure_analyses'),
    risk_analyses: await cnt('risk_analyses'),
  };
  console.log('DB Counts:', counts);

  // Soft-deleted links
  const softDel = (await q(`SELECT COUNT(*)::int as c FROM "${S}".failure_links WHERE fmea_id='${F}' AND deleted_at IS NOT NULL`))[0]?.c;
  console.log(`Soft-deleted links: ${softDel}`);

  // FE l1_func_id 유효성
  if (counts.failure_effects > 0) {
    const badFEs = await q(`
      SELECT fe.id, fe.l1_func_id
      FROM "${S}".failure_effects fe
      LEFT JOIN "${S}".l1_functions l1f ON fe.l1_func_id = l1f.id
      WHERE fe.fmea_id='${F}' AND l1f.id IS NULL
    `);
    console.log(`\nFE with BAD l1_func_id: ${badFEs.length}/${counts.failure_effects}`);
  }

  // Link FK
  if (counts.failure_links > 0) {
    const badLinks = await q(`
      SELECT fl.id,
        CASE WHEN fm.id IS NULL THEN 'MISS' ELSE 'OK' END as fm,
        CASE WHEN fe.id IS NULL THEN 'MISS' ELSE 'OK' END as fe,
        CASE WHEN fc.id IS NULL THEN 'MISS' ELSE 'OK' END as fc
      FROM "${S}".failure_links fl
      LEFT JOIN "${S}".failure_modes fm ON fm.id = fl.fm_id
      LEFT JOIN "${S}".failure_effects fe ON fe.id = fl.fe_id
      LEFT JOIN "${S}".failure_causes fc ON fc.id = fl.fc_id
      WHERE fl.fmea_id='${F}' AND fl.deleted_at IS NULL
        AND (fm.id IS NULL OR fe.id IS NULL OR fc.id IS NULL)
    `);
    console.log(`Links with BAD FK: ${badLinks.length}/${counts.failure_links}`);
    badLinks.slice(0, 5).forEach((l: any) => console.log(`  FM=${l.fm} FE=${l.fe} FC=${l.fc}`));
  }

  // FA linkId 유효성
  if (counts.failure_analyses > 0) {
    const badFAs = await q(`
      SELECT COUNT(*)::int as c
      FROM "${S}".failure_analyses fa
      LEFT JOIN "${S}".failure_links fl ON fl.id = fa.link_id AND fl.deleted_at IS NULL
      WHERE fa.fmea_id='${F}' AND fl.id IS NULL
    `);
    console.log(`FA with BAD linkId: ${badFAs[0]?.c}/${counts.failure_analyses}`);
  }

  // RA linkId 유효성
  if (counts.risk_analyses > 0) {
    const badRAs = await q(`
      SELECT COUNT(*)::int as c
      FROM "${S}".risk_analyses ra
      LEFT JOIN "${S}".failure_links fl ON fl.id = ra.link_id AND fl.deleted_at IS NULL
      WHERE ra.fmea_id='${F}' AND fl.id IS NULL
    `);
    console.log(`RA with BAD linkId: ${badRAs[0]?.c}/${counts.risk_analyses}`);
  }

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
