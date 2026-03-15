/**
 * DB 정합성 검증 스크립트
 *
 * 사용법: npx tsx scripts/validate-db-integrity.ts [fmeaId]
 *
 * 검증 항목:
 * 1. 고아 FailureLink (FM FK가 존재하지 않는 링크)
 * 2. 고아 FailureLink (FE FK가 존재하지 않는 링크)
 * 3. 고아 FailureLink (FC FK가 존재하지 않는 링크)
 * 4. 고아 RiskAnalysis (linkId FK가 존재하지 않는 리스크)
 * 5. 고아 Optimization (riskId FK가 존재하지 않는 최적화)
 * 6. ProcessProductChar 카테시안 중복 (같은 공정+이름의 중복 PC)
 * 7. CP productCharId FK 유효성
 * 8. PFD productCharId FK 유효성
 * 9. FailureLink uniqueness (fmeaId+fmId+feId+fcId 중복)
 * 10-12. Atomic ↔ Legacy 카운트 비교 (fmeaId 지정 시)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function createPrisma(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrisma();

interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  count: number;
  details?: string;
}

async function countOrphanLinksFm(fmeaId?: string): Promise<number> {
  if (fmeaId) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM failure_links fl
      LEFT JOIN failure_modes fm ON fl."fmId" = fm.id
      WHERE fm.id IS NULL AND fl."deletedAt" IS NULL
        AND fl."fmeaId" = ${fmeaId}
    `;
    return Number(rows[0]?.count ?? 0);
  }
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM failure_links fl
    LEFT JOIN failure_modes fm ON fl."fmId" = fm.id
    WHERE fm.id IS NULL AND fl."deletedAt" IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

async function countOrphanLinksFe(fmeaId?: string): Promise<number> {
  if (fmeaId) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM failure_links fl
      LEFT JOIN failure_effects fe ON fl."feId" = fe.id
      WHERE fe.id IS NULL AND fl."deletedAt" IS NULL
        AND fl."fmeaId" = ${fmeaId}
    `;
    return Number(rows[0]?.count ?? 0);
  }
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM failure_links fl
    LEFT JOIN failure_effects fe ON fl."feId" = fe.id
    WHERE fe.id IS NULL AND fl."deletedAt" IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

async function countOrphanLinksFc(fmeaId?: string): Promise<number> {
  if (fmeaId) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM failure_links fl
      LEFT JOIN failure_causes fc ON fl."fcId" = fc.id
      WHERE fc.id IS NULL AND fl."deletedAt" IS NULL
        AND fl."fmeaId" = ${fmeaId}
    `;
    return Number(rows[0]?.count ?? 0);
  }
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM failure_links fl
    LEFT JOIN failure_causes fc ON fl."fcId" = fc.id
    WHERE fc.id IS NULL AND fl."deletedAt" IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

async function countOrphanRisks(fmeaId?: string): Promise<number> {
  if (fmeaId) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM risk_analyses ra
      LEFT JOIN failure_links fl ON ra."linkId" = fl.id
      WHERE fl.id IS NULL
        AND ra."fmeaId" = ${fmeaId}
    `;
    return Number(rows[0]?.count ?? 0);
  }
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM risk_analyses ra
    LEFT JOIN failure_links fl ON ra."linkId" = fl.id
    WHERE fl.id IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

async function countOrphanOptimizations(fmeaId?: string): Promise<number> {
  if (fmeaId) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM optimizations o
      LEFT JOIN risk_analyses ra ON o."riskId" = ra.id
      WHERE ra.id IS NULL
        AND o."fmeaId" = ${fmeaId}
    `;
    return Number(rows[0]?.count ?? 0);
  }
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM optimizations o
    LEFT JOIN risk_analyses ra ON o."riskId" = ra.id
    WHERE ra.id IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

async function countCartesianDuplicates(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM (
      SELECT "fmeaId", "l2StructId", name, COUNT(*) as cnt
      FROM process_product_chars
      GROUP BY "fmeaId", "l2StructId", name
      HAVING COUNT(*) > 1
    ) dupes
  `;
  return Number(rows[0]?.count ?? 0);
}

async function countInvalidCpProductCharFk(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM control_plan_items cpi
    WHERE cpi."productCharId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM process_product_chars ppc WHERE ppc.id = cpi."productCharId"
      )
  `;
  return Number(rows[0]?.count ?? 0);
}

async function countInvalidPfdProductCharFk(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM pfd_items pi
    WHERE pi."productCharId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM process_product_chars ppc WHERE ppc.id = pi."productCharId"
      )
  `;
  return Number(rows[0]?.count ?? 0);
}

async function countDuplicateLinks(fmeaId?: string): Promise<number> {
  if (fmeaId) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM (
        SELECT "fmeaId", "fmId", "feId", "fcId", COUNT(*) as cnt
        FROM failure_links
        WHERE "deletedAt" IS NULL
          AND "fmeaId" = ${fmeaId}
        GROUP BY "fmeaId", "fmId", "feId", "fcId"
        HAVING COUNT(*) > 1
      ) dupes
    `;
    return Number(rows[0]?.count ?? 0);
  }
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM (
      SELECT "fmeaId", "fmId", "feId", "fcId", COUNT(*) as cnt
      FROM failure_links
      WHERE "deletedAt" IS NULL
      GROUP BY "fmeaId", "fmId", "feId", "fcId"
      HAVING COUNT(*) > 1
    ) dupes
  `;
  return Number(rows[0]?.count ?? 0);
}

async function validateFmeaIntegrity(fmeaId?: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  console.log('='.repeat(60));
  console.log('DB 정합성 검증 시작');
  console.log(`대상: ${fmeaId || '전체'}`);
  console.log('='.repeat(60));

  // 1. 고아 FailureLink — FM FK
  const orphanFmCount = await countOrphanLinksFm(fmeaId);
  results.push({
    check: '1. 고아 FailureLink (FM FK 누락)',
    status: orphanFmCount === 0 ? 'PASS' : 'FAIL',
    count: orphanFmCount,
    details: orphanFmCount > 0
      ? `${orphanFmCount}건의 FailureLink가 존재하지 않는 FailureMode를 참조`
      : undefined,
  });

  // 2. 고아 FailureLink — FE FK
  const orphanFeCount = await countOrphanLinksFe(fmeaId);
  results.push({
    check: '2. 고아 FailureLink (FE FK 누락)',
    status: orphanFeCount === 0 ? 'PASS' : 'FAIL',
    count: orphanFeCount,
    details: orphanFeCount > 0
      ? `${orphanFeCount}건의 FailureLink가 존재하지 않는 FailureEffect를 참조`
      : undefined,
  });

  // 3. 고아 FailureLink — FC FK
  const orphanFcCount = await countOrphanLinksFc(fmeaId);
  results.push({
    check: '3. 고아 FailureLink (FC FK 누락)',
    status: orphanFcCount === 0 ? 'PASS' : 'FAIL',
    count: orphanFcCount,
    details: orphanFcCount > 0
      ? `${orphanFcCount}건의 FailureLink가 존재하지 않는 FailureCause를 참조`
      : undefined,
  });

  // 4. 고아 RiskAnalysis (linkId FK 누락)
  const orphanRiskCount = await countOrphanRisks(fmeaId);
  results.push({
    check: '4. 고아 RiskAnalysis (linkId FK 누락)',
    status: orphanRiskCount === 0 ? 'PASS' : 'FAIL',
    count: orphanRiskCount,
    details: orphanRiskCount > 0
      ? `${orphanRiskCount}건의 RiskAnalysis가 존재하지 않는 FailureLink를 참조`
      : undefined,
  });

  // 5. 고아 Optimization (riskId FK 누락)
  const orphanOptCount = await countOrphanOptimizations(fmeaId);
  results.push({
    check: '5. 고아 Optimization (riskId FK 누락)',
    status: orphanOptCount === 0 ? 'PASS' : 'FAIL',
    count: orphanOptCount,
    details: orphanOptCount > 0
      ? `${orphanOptCount}건의 Optimization이 존재하지 않는 RiskAnalysis를 참조`
      : undefined,
  });

  // 6. ProcessProductChar 카테시안 중복
  const cartesianCount = await countCartesianDuplicates();
  results.push({
    check: '6. ProcessProductChar 카테시안 중복',
    status: cartesianCount === 0 ? 'PASS' : 'FAIL',
    count: cartesianCount,
    details: cartesianCount > 0
      ? `${cartesianCount}개 공정에서 동일 이름 제품특성 중복 발견`
      : undefined,
  });

  // 7. CP productCharId FK 유효성
  const invalidCpPcCount = await countInvalidCpProductCharFk();
  results.push({
    check: '7. CP productCharId FK 유효성',
    status: invalidCpPcCount === 0 ? 'PASS' : 'FAIL',
    count: invalidCpPcCount,
    details: invalidCpPcCount > 0
      ? `${invalidCpPcCount}건의 ControlPlanItem이 존재하지 않는 ProcessProductChar를 참조`
      : undefined,
  });

  // 8. PFD productCharId FK 유효성
  const invalidPfdPcCount = await countInvalidPfdProductCharFk();
  results.push({
    check: '8. PFD productCharId FK 유효성',
    status: invalidPfdPcCount === 0 ? 'PASS' : 'FAIL',
    count: invalidPfdPcCount,
    details: invalidPfdPcCount > 0
      ? `${invalidPfdPcCount}건의 PfdItem이 존재하지 않는 ProcessProductChar를 참조`
      : undefined,
  });

  // 9. FailureLink 유니크 제약 중복
  const dupLinkCount = await countDuplicateLinks(fmeaId);
  results.push({
    check: '9. FailureLink 유니크 중복',
    status: dupLinkCount === 0 ? 'PASS' : 'WARN',
    count: dupLinkCount,
    details: dupLinkCount > 0
      ? `${dupLinkCount}개의 fmeaId+fmId+feId+fcId 조합이 중복`
      : undefined,
  });

  // 10-12. Atomic <-> Legacy 카운트 비교 (fmeaId 지정 시)
  if (fmeaId) {
    const atomicL2Count = await prisma.l2Structure.count({ where: { fmeaId } });
    const atomicFmCount = await prisma.failureMode.count({ where: { fmeaId } });
    const atomicLinkCount = await prisma.failureLink.count({
      where: { fmeaId, deletedAt: null },
    });

    const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
    if (legacy && legacy.data) {
      const legacyData = legacy.data as Record<string, unknown>;
      const legacyL2 = Array.isArray(legacyData.l2) ? legacyData.l2 : [];
      const legacyL2Count = legacyL2.length;

      const legacyFmCount = legacyL2.reduce((sum: number, p: Record<string, unknown>) => {
        const fms = Array.isArray(p.failureModes) ? p.failureModes : [];
        return sum + fms.length;
      }, 0);

      const legacyLinks = Array.isArray(legacyData.failureLinks)
        ? legacyData.failureLinks
        : [];
      const legacyLinkCount = legacyLinks.length;

      const l2Match = atomicL2Count === legacyL2Count;
      const fmMatch = atomicFmCount === legacyFmCount;
      const linkMatch = atomicLinkCount === legacyLinkCount;

      results.push({
        check: '10. Atomic<->Legacy L2 카운트',
        status: l2Match ? 'PASS' : 'WARN',
        count: Math.abs(atomicL2Count - legacyL2Count),
        details: `Atomic=${atomicL2Count}, Legacy=${legacyL2Count}`,
      });
      results.push({
        check: '11. Atomic<->Legacy FM 카운트',
        status: fmMatch ? 'PASS' : 'WARN',
        count: Math.abs(atomicFmCount - legacyFmCount),
        details: `Atomic=${atomicFmCount}, Legacy=${legacyFmCount}`,
      });
      results.push({
        check: '12. Atomic<->Legacy FailureLink 카운트',
        status: linkMatch ? 'PASS' : 'WARN',
        count: Math.abs(atomicLinkCount - legacyLinkCount),
        details: `Atomic=${atomicLinkCount}, Legacy=${legacyLinkCount}`,
      });
    } else {
      results.push({
        check: '10-12. Atomic<->Legacy 비교',
        status: 'WARN',
        count: 0,
        details: 'Legacy 데이터 없음 (fmea_legacy_data 레코드 미존재)',
      });
    }
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('검증 결과');
  console.log('='.repeat(60));

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  for (const r of results) {
    const icon = r.status === 'PASS' ? 'PASS' : r.status === 'FAIL' ? 'FAIL' : 'WARN';
    console.log(`[${icon}] ${r.check}: ${r.count}건`);
    if (r.details) {
      console.log(`       -> ${r.details}`);
    }
    if (r.status === 'PASS') passCount++;
    else if (r.status === 'FAIL') failCount++;
    else warnCount++;
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`총 ${results.length}건: PASS=${passCount} FAIL=${failCount} WARN=${warnCount}`);

  if (failCount > 0) {
    console.log('\nFAIL 항목이 있습니다. 즉시 수정이 필요합니다.');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('\nWARN 항목이 있습니다. 검토가 필요합니다.');
  } else {
    console.log('\n모든 검증 통과. DB 정합성 정상.');
  }

  return results;
}

// Main execution
const fmeaId = process.argv[2];
validateFmeaIntegrity(fmeaId)
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('검증 실행 오류:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
