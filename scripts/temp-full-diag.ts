/**
 * 전체 파이프라인 진단 — legacyData → migrateToAtomicDB → API 시뮬레이션
 * 프로젝트 스키마에서도 확인
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const fmeaId = 'pfm26-m016';

  // 1. legacyData 현재 상태 (auto-save가 덮어씌웠는지 확인)
  const legacy = await prisma.fmeaLegacyData.findFirst({
    where: { fmeaId },
    select: { data: true, updatedAt: true },
  });
  if (!legacy?.data) { console.log('No legacy data'); return; }
  const d = legacy.data as any;

  console.log(`=== legacyData 현황 (updated: ${legacy.updatedAt}) ===`);
  const links = d.failureLinks || [];
  const uniqueFeIds = new Set(links.map((l: any) => l.feId).filter(Boolean));
  console.log(`failureLinks: ${links.length}`);
  console.log(`고유 feId 수: ${uniqueFeIds.size}`);  // 이게 1이면 마이그레이션이 덮어씌워진 것!
  console.log(`feId 있음: ${links.filter((l: any) => !!l.feId).length}`);
  console.log(`feId 없음: ${links.filter((l: any) => !l.feId).length}`);

  if (uniqueFeIds.size <= 1) {
    console.log(`\n⚠️ FE 마이그레이션이 auto-save에 의해 덮어씌워짐!`);
    console.log(`→ 브라우저의 stale state가 DB를 다시 1 feId로 되돌림`);
  }

  // feId 분포
  const feIdDist = new Map<string, number>();
  links.forEach((l: any) => {
    const k = l.feId || '(empty)';
    feIdDist.set(k, (feIdDist.get(k) || 0) + 1);
  });
  console.log(`\nfeId 분포:`);
  for (const [k, v] of [...feIdDist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    console.log(`  ${v}x: ${k.substring(0, 50)}`);
  }

  // 2. 프로젝트 스키마 확인
  const schemaName = `pfmea_${fmeaId.replace(/[^a-z0-9]+/g, '_')}`;
  console.log(`\n=== 프로젝트 스키마: ${schemaName} ===`);
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM "${schemaName}"."FailureLink" WHERE "fmeaId" = $1 AND "deletedAt" IS NULL`,
      fmeaId
    ) as any[];
    console.log(`DB Links (project schema): ${result[0]?.cnt}`);

    const faResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM "${schemaName}"."FailureAnalysis" WHERE "fmeaId" = $1`,
      fmeaId
    ) as any[];
    console.log(`DB FailureAnalysis: ${faResult[0]?.cnt}`);

    const raResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM "${schemaName}"."RiskAnalysis" WHERE "fmeaId" = $1`,
      fmeaId
    ) as any[];
    console.log(`DB RiskAnalysis: ${raResult[0]?.cnt}`);

    const feResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM "${schemaName}"."FailureEffect" WHERE "fmeaId" = $1`,
      fmeaId
    ) as any[];
    console.log(`DB FailureEffect: ${feResult[0]?.cnt}`);

    const l1fResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM "${schemaName}"."L1Function" WHERE "fmeaId" = $1`,
      fmeaId
    ) as any[];
    console.log(`DB L1Function: ${l1fResult[0]?.cnt}`);

    // FE l1FuncId 유효성 체크
    const feCheck = await prisma.$queryRawUnsafe(`
      SELECT fe.id, fe."l1FuncId", fe.effect
      FROM "${schemaName}"."FailureEffect" fe
      LEFT JOIN "${schemaName}"."L1Function" l1f ON fe."l1FuncId" = l1f.id
      WHERE fe."fmeaId" = $1 AND l1f.id IS NULL
    `, fmeaId) as any[];
    console.log(`\nFE with invalid l1FuncId: ${feCheck.length}`);
    if (feCheck.length > 0) {
      feCheck.slice(0, 3).forEach((fe: any) => {
        console.log(`  id=${(fe.id||'').substring(0,20)} l1FuncId=${(fe.l1FuncId||'').substring(0,20)}`);
      });
    }

    // Link FK 유효성 체크
    const linkCheck = await prisma.$queryRawUnsafe(`
      SELECT fl.id, fl."fmId", fl."feId", fl."fcId",
        (SELECT COUNT(*) FROM "${schemaName}"."FailureMode" fm WHERE fm.id = fl."fmId") as fm_exists,
        (SELECT COUNT(*) FROM "${schemaName}"."FailureEffect" fe WHERE fe.id = fl."feId") as fe_exists,
        (SELECT COUNT(*) FROM "${schemaName}"."FailureCause" fc WHERE fc.id = fl."fcId") as fc_exists
      FROM "${schemaName}"."FailureLink" fl
      WHERE fl."fmeaId" = $1 AND fl."deletedAt" IS NULL
      LIMIT 5
    `, fmeaId) as any[];
    console.log(`\nLink FK 체크 (샘플 5건):`);
    linkCheck.forEach((l: any) => {
      console.log(`  fm=${l.fm_exists} fe=${l.fe_exists} fc=${l.fc_exists}`);
    });

    // FailureAnalysis linkId 유효성
    const faCheck = await prisma.$queryRawUnsafe(`
      SELECT fa."linkId",
        (SELECT COUNT(*) FROM "${schemaName}"."FailureLink" fl WHERE fl.id = fa."linkId" AND fl."deletedAt" IS NULL) as link_exists
      FROM "${schemaName}"."FailureAnalysis" fa
      WHERE fa."fmeaId" = $1
      LIMIT 5
    `, fmeaId) as any[];
    console.log(`\nFA linkId 체크 (샘플):`);
    faCheck.forEach((fa: any) => {
      console.log(`  linkId=${(fa.linkId||'').substring(0,20)} link_exists=${fa.link_exists}`);
    });

  } catch (e: any) {
    console.log(`스키마 쿼리 실패: ${e.message?.substring(0, 100)}`);
  }

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
