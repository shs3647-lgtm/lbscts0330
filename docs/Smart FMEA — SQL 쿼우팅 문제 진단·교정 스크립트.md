/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Smart FMEA — SQL 쿼우팅 문제 진단·교정 스크립트
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  ■ 문제 정의
 *  PostgreSQL은 대소문자 구분을 위해 "쌍따옴표(double quote)"로
 *  컬럼/테이블명을 감싸야 한다. Prisma가 자동 생성하는 SQL은 이를 처리하지만,
 *  개발자가 직접 작성하는 $queryRaw / $executeRaw 에서는
 *  쿼우팅 누락·오류가 빈번하게 발생한다.
 *
 *  ■ 왜 위험한가
 *  1. "processId" → processid 로 해석 → 컬럼 미존재 에러
 *  2. 문자열 값에 작은따옴표(') 포함 시 → SQL 인젝션 / 쿼리 깨짐
 *  3. $queryRaw 템플릿 리터럴에서 Prisma.sql`` 미사용 → 파라미터 바인딩 누락
 *  4. ARRAY_AGG, JSON_BUILD_OBJECT 내부 컬럼명 쿼우팅 누락
 *
 *  ■ Rule 0.5: FailureLink는 엔지니어 판단이지 카테시안 곱이 아니다
 *  distribute() 같은 수학적 배분 함수로 FM-PC를 연결하면
 *  크로스프로덕트(카테시안 복제)가 발생한다. 이는 Auto-Fix에서
 *  가장 먼저 탐지·롤백해야 하는 최우선 규칙이다.
 *
 *  ■ 실행 방법
 *  npx ts-node fmea-sql-quoting-fix.ts --pfmea-id <UUID> [--dry-run]
 * ═══════════════════════════════════════════════════════════════════════
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────
// 1. 쿼우팅 문제 유형 정의
// ─────────────────────────────────────────────────────────────────────

/**
 * ■ 문제 유형 1: 컬럼명 쿼우팅 누락 (camelCase → lowercase 오변환)
 *
 * PostgreSQL은 따옴표 없는 식별자를 모두 소문자로 변환한다.
 * Prisma schema의 camelCase 컬럼명은 반드시 "쌍따옴표"로 감싸야 한다.
 *
 * ✗ 잘못된 예:
 *   SELECT processId, productCharId FROM ProcessProductChar
 *   → ERROR: column "processid" does not exist
 *
 * ✓ 올바른 예:
 *   SELECT "processId", "productCharId" FROM "ProcessProductChar"
 */

/**
 * ■ 문제 유형 2: 문자열 값 이스케이프 누락 (SQL 인젝션 위험)
 *
 * 사용자 입력값(공정명, 고장형태명 등)에 작은따옴표가 포함될 수 있다.
 * 예: "O-Ring Seal (5' length)" → 쿼리 깨짐
 *
 * ✗ 잘못된 예:
 *   WHERE name = '${userInput}'           ← 문자열 보간 (인젝션 위험)
 *
 * ✓ 올바른 예:
 *   WHERE name = ${Prisma.sql`${userInput}`}  ← 파라미터 바인딩
 *   또는 Prisma ORM 메서드 사용:
 *   prisma.processProductChar.findMany({ where: { name: userInput } })
 */

/**
 * ■ 문제 유형 3: $queryRaw 템플릿 리터럴 오용
 *
 * Prisma의 $queryRaw는 tagged template literal을 사용해야
 * 자동 파라미터 바인딩이 동작한다.
 *
 * ✗ 잘못된 예 (문자열 연결 → 바인딩 안 됨):
 *   prisma.$queryRaw(`SELECT * FROM "Process" WHERE id = '${id}'`)
 *
 * ✓ 올바른 예 (tagged template → 자동 바인딩):
 *   prisma.$queryRaw`SELECT * FROM "Process" WHERE id = ${id}`
 *
 * ✗ 잘못된 예 (Prisma.sql 미사용):
 *   const table = "ProcessProductChar";
 *   prisma.$queryRaw`SELECT * FROM ${table}`    ← 테이블명이 문자열로 바인딩
 *
 * ✓ 올바른 예:
 *   prisma.$queryRaw`SELECT * FROM "ProcessProductChar" WHERE "processId" = ${id}`
 *   또는 동적 테이블명이 필요하면:
 *   prisma.$queryRawUnsafe(`SELECT * FROM "${sanitizedTable}" WHERE "processId" = $1`, [id])
 */

/**
 * ■ 문제 유형 4: ARRAY_AGG / JSON 함수 내부 쿼우팅 누락
 *
 * ✗ 잘못된 예:
 *   SELECT ARRAY_AGG(productCharId) FROM FailureMode
 *   → column "productcharid" does not exist
 *
 * ✓ 올바른 예:
 *   SELECT ARRAY_AGG("productCharId") FROM "FailureMode"
 */


// ─────────────────────────────────────────────────────────────────────
// 2. 쿼우팅 필요 테이블·컬럼 전체 목록
// ─────────────────────────────────────────────────────────────────────

const FMEA_TABLES = {
  Process:              ['id', 'pfmeaId', 'processNumber', 'processName', 'sortOrder', 'createdAt', 'updatedAt'],
  ProcessProductChar:   ['id', 'processId', 'name', 'sortOrder', 'createdAt', 'updatedAt'],
  ProcessFunction:      ['id', 'processId', 'productCharId', 'name', 'sortOrder', 'createdAt', 'updatedAt'],
  FailureMode:          ['id', 'processId', 'productCharId', 'name', 'severity', 'sortOrder', 'createdAt', 'updatedAt'],
  FailureEffect:        ['id', 'failureModeId', 'description', 'severity', 'sortOrder'],
  FailureCause:         ['id', 'failureModeId', 'description', 'occurrence', 'm4Category', 'sortOrder'],
  PreventionControl:    ['id', 'failureCauseId', 'description', 'sortOrder'],
  DetectionControl:     ['id', 'failureCauseId', 'description', 'detection', 'sortOrder'],
  ControlPlan:          ['id', 'processId', 'productCharId'],
  ProcessFlowDiagram:   ['id', 'processId', 'productCharId'],
  AutoFixLog:           ['id', 'pfmeaId', 'ruleId', 'entityType', 'entityId', 'action', 'before', 'after', 'severity', 'createdAt'],
} as const;

// camelCase 컬럼 → 쿼우팅 필수 목록 자동 추출
const COLUMNS_REQUIRING_QUOTES = new Set<string>();
for (const [table, cols] of Object.entries(FMEA_TABLES)) {
  COLUMNS_REQUIRING_QUOTES.add(table);
  for (const col of cols) {
    if (col !== col.toLowerCase()) {
      COLUMNS_REQUIRING_QUOTES.add(col);
    }
  }
}


// ─────────────────────────────────────────────────────────────────────
// 3. 안전한 쿼리 패턴 (✓ 사용해야 하는 것)
// ─────────────────────────────────────────────────────────────────────

/**
 * [패턴 A] 카테시안 복제 탐지 — 안전한 쿼우팅
 */
async function detectCartesianDuplicates(tx: Prisma.TransactionClient, pfmeaId: string) {
  // ✓ 모든 테이블명·컬럼명을 쌍따옴표로 감쌈
  // ✓ pfmeaId는 tagged template으로 자동 바인딩
  const duplicates = await tx.$queryRaw<Array<{
    name: string;
    processId: string;
    cnt: bigint;
    ids: string[];
  }>>`
    SELECT
      ppc."name",
      ppc."processId",
      COUNT(*)::bigint AS cnt,
      ARRAY_AGG(ppc."id") AS ids
    FROM "ProcessProductChar" ppc
    JOIN "Process" p ON p."id" = ppc."processId"
    WHERE p."pfmeaId" = ${pfmeaId}
    GROUP BY ppc."name", ppc."processId"
    HAVING COUNT(*) > 1
  `;

  return duplicates;
}

/**
 * [패턴 B] FK 재매핑 — 파라미터 바인딩으로 안전하게
 */
async function remapForeignKeys(
  tx: Prisma.TransactionClient,
  keepId: string,
  duplicateIds: string[]
) {
  // ✓ Prisma.join()으로 배열을 안전하게 IN 절로 변환
  // ✓ 컬럼명 쌍따옴표 유지

  // FM 재매핑
  await tx.$executeRaw`
    UPDATE "FailureMode"
    SET "productCharId" = ${keepId}
    WHERE "productCharId" IN (${Prisma.join(duplicateIds)})
      AND "productCharId" != ${keepId}
  `;

  // A3 재매핑
  await tx.$executeRaw`
    UPDATE "ProcessFunction"
    SET "productCharId" = ${keepId}
    WHERE "productCharId" IN (${Prisma.join(duplicateIds)})
      AND "productCharId" != ${keepId}
  `;

  // CP 재매핑
  await tx.$executeRaw`
    UPDATE "ControlPlan"
    SET "productCharId" = ${keepId}
    WHERE "productCharId" IN (${Prisma.join(duplicateIds)})
      AND "productCharId" != ${keepId}
  `;

  // PFD 재매핑
  await tx.$executeRaw`
    UPDATE "ProcessFlowDiagram"
    SET "productCharId" = ${keepId}
    WHERE "productCharId" IN (${Prisma.join(duplicateIds)})
      AND "productCharId" != ${keepId}
  `;

  // 중복 A4 삭제 (keepId 제외)
  await tx.$executeRaw`
    DELETE FROM "ProcessProductChar"
    WHERE "id" IN (${Prisma.join(duplicateIds)})
      AND "id" != ${keepId}
  `;
}

/**
 * [패턴 C] 고아 PC/DC 탐지 — JOIN 쿼우팅
 */
async function detectOrphanControls(tx: Prisma.TransactionClient, pfmeaId: string) {
  // ✓ LEFT JOIN에서도 모든 별칭·컬럼명에 쌍따옴표
  const orphanPCs = await tx.$queryRaw<Array<{
    id: string;
    description: string;
    failureCauseId: string | null;
  }>>`
    SELECT pc."id", pc."description", pc."failureCauseId"
    FROM "PreventionControl" pc
    LEFT JOIN "FailureCause" fc ON pc."failureCauseId" = fc."id"
    LEFT JOIN "FailureMode" fm ON fc."failureModeId" = fm."id"
    LEFT JOIN "Process" p ON fm."processId" = p."id"
    WHERE fc."id" IS NULL
       OR (p."pfmeaId" = ${pfmeaId} AND fm."productCharId" IS NULL)
  `;

  const orphanDCs = await tx.$queryRaw<Array<{
    id: string;
    description: string;
    failureCauseId: string | null;
  }>>`
    SELECT dc."id", dc."description", dc."failureCauseId"
    FROM "DetectionControl" dc
    LEFT JOIN "FailureCause" fc ON dc."failureCauseId" = fc."id"
    LEFT JOIN "FailureMode" fm ON fc."failureModeId" = fm."id"
    LEFT JOIN "Process" p ON fm."processId" = p."id"
    WHERE fc."id" IS NULL
       OR (p."pfmeaId" = ${pfmeaId} AND fm."productCharId" IS NULL)
  `;

  return { orphanPCs, orphanDCs };
}

/**
 * [패턴 D] AP 재산정 — CASE WHEN 내부 쿼우팅
 */
async function recalculateActionPriority(tx: Prisma.TransactionClient, pfmeaId: string) {
  // ✓ 서브쿼리·CASE WHEN 내부에서도 쌍따옴표 유지
  // ✓ Rule 0.5: distribute() 사용 금지 — 엔지니어 연결 기반으로만 산정
  const updated = await tx.$executeRaw`
    UPDATE "FailureCause" fc
    SET "actionPriority" = CASE
      WHEN fm."severity" >= 9 AND fc."occurrence" >= 4 THEN 'High'
      WHEN fm."severity" >= 9 AND fc."occurrence" >= 2 AND dc."detection" >= 4 THEN 'High'
      WHEN fm."severity" >= 7 AND fc."occurrence" >= 4 AND dc."detection" >= 4 THEN 'High'
      WHEN fm."severity" >= 5 AND fc."occurrence" >= 6 AND dc."detection" >= 4 THEN 'High'
      WHEN fm."severity" >= 7 AND fc."occurrence" >= 2 THEN 'Medium'
      WHEN fm."severity" >= 5 AND fc."occurrence" >= 4 THEN 'Medium'
      WHEN fm."severity" >= 3 AND fc."occurrence" >= 6 THEN 'Medium'
      WHEN fm."severity" >= 2 AND fc."occurrence" >= 6 AND dc."detection" >= 6 THEN 'Medium'
      ELSE 'Low'
    END
    FROM "FailureMode" fm
    JOIN "Process" p ON fm."processId" = p."id"
    LEFT JOIN "DetectionControl" dc ON dc."failureCauseId" = fc."id"
    WHERE fc."failureModeId" = fm."id"
      AND p."pfmeaId" = ${pfmeaId}
      AND fm."severity" IS NOT NULL
      AND fc."occurrence" IS NOT NULL
      AND dc."detection" IS NOT NULL
  `;

  return updated;
}


// ─────────────────────────────────────────────────────────────────────
// 4. 위험한 쿼리 패턴 (✗ 절대 사용 금지)
// ─────────────────────────────────────────────────────────────────────

/*
 * ──────────────────────────────────────────────────
 * ✗ 금지 패턴 1: 컬럼명 쿼우팅 누락
 * ──────────────────────────────────────────────────
 *
 *   SELECT processId, productCharId FROM ProcessProductChar
 *          ^^^^^^^^^  ^^^^^^^^^^^^^      ^^^^^^^^^^^^^^^^^^^
 *          소문자 변환됨 → "column does not exist" 에러
 *
 * ──────────────────────────────────────────────────
 * ✗ 금지 패턴 2: 문자열 보간 (SQL 인젝션)
 * ──────────────────────────────────────────────────
 *
 *   const name = userInput; // "O'Ring" ← 작은따옴표 포함
 *   prisma.$queryRaw(`
 *     SELECT * FROM "ProcessProductChar"
 *     WHERE name = '${name}'            ← 쿼리 깨짐 / 인젝션
 *   `)
 *
 * ──────────────────────────────────────────────────
 * ✗ 금지 패턴 3: $queryRaw에 일반 함수 호출
 * ──────────────────────────────────────────────────
 *
 *   // 이것은 tagged template이 아닌 일반 함수 호출
 *   prisma.$queryRaw(
 *     `SELECT * FROM "Process" WHERE id = ${id}`
 *   )
 *   // → Prisma 파라미터 바인딩 미작동 → id가 SQL에 직접 삽입
 *
 * ──────────────────────────────────────────────────
 * ✗ 금지 패턴 4: distribute()로 FM-PC 연결
 * ──────────────────────────────────────────────────
 *
 *   // Rule 0.5 위반: 카테시안 곱 발생
 *   const assigned = distribute(failureModes.length, productChars.length);
 *   failureModes.forEach((fm, i) => {
 *     fm.productCharId = productChars[assigned[i]].id;
 *   });
 *   // → 의미 없는 숫자 배분 → 고아 PC 발생 → 고장사슬 단절
 *
 * ──────────────────────────────────────────────────
 * ✗ 금지 패턴 5: 동적 테이블명을 tagged template에 직접 삽입
 * ──────────────────────────────────────────────────
 *
 *   const table = "ProcessProductChar";
 *   prisma.$queryRaw`SELECT * FROM ${table}`
 *   // → table이 $1 파라미터로 바인딩됨
 *   // → ERROR: syntax error at or near "$1"
 *
 *   // ✓ 동적 테이블명은 Prisma.raw() 사용:
 *   prisma.$queryRaw`SELECT * FROM ${Prisma.raw(`"${table}"`)}`
 */


// ─────────────────────────────────────────────────────────────────────
// 5. 쿼우팅 검증기 (코드 내 $queryRaw 패턴 자동 스캔)
// ─────────────────────────────────────────────────────────────────────

interface QuotingViolation {
  file: string;
  line: number;
  pattern: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  fix: string;
}

const QUOTING_RULES = [
  {
    // 컬럼명 쿼우팅 누락 (camelCase가 따옴표 없이 사용됨)
    regex: /(?:SELECT|WHERE|SET|ON|JOIN|AND|OR)\s+(?!.*["'])[a-z]+[A-Z][a-zA-Z]*(?:\s|,|=|>|<|\))/g,
    severity: 'CRITICAL' as const,
    description: 'camelCase 컬럼명에 쌍따옴표 누락 → PostgreSQL이 소문자로 해석',
    fix: '컬럼명을 "쌍따옴표"로 감싸기: processId → "processId"',
  },
  {
    // 문자열 보간 (${ } 안에 변수가 따옴표로 감싸져 있음)
    regex: /\$queryRaw\s*\(/g,
    severity: 'CRITICAL' as const,
    description: '$queryRaw를 일반 함수로 호출 → tagged template이 아니므로 파라미터 바인딩 미작동',
    fix: '$queryRaw`...` (tagged template literal) 형태로 변경',
  },
  {
    // WHERE name = '${variable}' 패턴
    regex: /['"]?\$\{[^}]+\}['"]?/g,
    severity: 'CRITICAL' as const,
    description: '문자열 보간으로 SQL 값 삽입 → SQL 인젝션 위험',
    fix: 'tagged template 내에서 ${variable} 사용 (Prisma가 자동 바인딩)',
  },
  {
    // 테이블명 쿼우팅 누락
    regex: /(?:FROM|JOIN|INTO|UPDATE)\s+(?!["'])(Process(?:ProductChar|Function)?|Failure(?:Mode|Effect|Cause)|(?:Prevention|Detection)Control|ControlPlan|ProcessFlowDiagram)(?:\s|$)/g,
    severity: 'HIGH' as const,
    description: 'PascalCase 테이블명에 쌍따옴표 누락',
    fix: '테이블명을 "쌍따옴표"로 감싸기: FailureMode → "FailureMode"',
  },
  {
    // distribute() 사용
    regex: /distribute\s*\(/g,
    severity: 'CRITICAL' as const,
    description: 'Rule 0.5 위반: distribute()로 FM-PC 수학적 배분 → 카테시안 복제',
    fix: 'Import 매칭 정보(엔지니어 판단) 기반 FK 직접 연결로 교체',
  },
];


// ─────────────────────────────────────────────────────────────────────
// 6. 전체 Auto-Fix 실행기 (안전한 쿼우팅 적용)
// ─────────────────────────────────────────────────────────────────────

interface AutoFixReport {
  pfmeaId: string;
  executedAt: Date;
  dryRun: boolean;
  cartesianDuplicates: number;
  orphanPCs: number;
  orphanDCs: number;
  apRecalculated: number;
  fkRemapped: number;
  quotingViolations: QuotingViolation[];
}

async function executeAutoFix(pfmeaId: string, dryRun = false): Promise<AutoFixReport> {
  const report: AutoFixReport = {
    pfmeaId,
    executedAt: new Date(),
    dryRun,
    cartesianDuplicates: 0,
    orphanPCs: 0,
    orphanDCs: 0,
    apRecalculated: 0,
    fkRemapped: 0,
    quotingViolations: [],
  };

  await prisma.$transaction(async (tx) => {

    // ── Phase 1: 카테시안 복제 탐지·교정 (Rule 0.5) ──
    const duplicates = await detectCartesianDuplicates(tx, pfmeaId);
    report.cartesianDuplicates = duplicates.length;

    if (!dryRun) {
      for (const dup of duplicates) {
        const keepId = dup.ids[0]; // 가장 먼저 생성된 ID 유지
        const removeIds = dup.ids.slice(1);
        await remapForeignKeys(tx, keepId, removeIds);
        report.fkRemapped += removeIds.length;

        // 교정 로그 기록
        await tx.$executeRaw`
          INSERT INTO "AutoFixLog" (
            "pfmeaId", "ruleId", "entityType", "entityId",
            "action", "before", "after", "severity"
          ) VALUES (
            ${pfmeaId}, 'A4-001', 'ProcessProductChar', ${keepId},
            'MERGE',
            ${JSON.stringify({ duplicateIds: removeIds })}::jsonb,
            ${JSON.stringify({ keptId: keepId })}::jsonb,
            'CRITICAL'
          )
        `;
      }
    }

    // ── Phase 2: 고아 PC/DC 탐지·교정 ──
    const orphans = await detectOrphanControls(tx, pfmeaId);
    report.orphanPCs = orphans.orphanPCs.length;
    report.orphanDCs = orphans.orphanDCs.length;

    if (!dryRun && orphans.orphanPCs.length > 0) {
      const orphanPCIds = orphans.orphanPCs.map(pc => pc.id);
      await tx.$executeRaw`
        DELETE FROM "PreventionControl"
        WHERE "id" IN (${Prisma.join(orphanPCIds)})
      `;
    }

    if (!dryRun && orphans.orphanDCs.length > 0) {
      const orphanDCIds = orphans.orphanDCs.map(dc => dc.id);
      await tx.$executeRaw`
        DELETE FROM "DetectionControl"
        WHERE "id" IN (${Prisma.join(orphanDCIds)})
      `;
    }

    // ── Phase 3: AP 재산정 ──
    if (!dryRun) {
      const apCount = await recalculateActionPriority(tx, pfmeaId);
      report.apRecalculated = apCount;
    }

  }, {
    maxWait: 10000,
    timeout: 60000,
    isolationLevel: 'Serializable',
  });

  return report;
}


// ─────────────────────────────────────────────────────────────────────
// 7. CLI 실행
// ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const pfmeaIdIdx = args.indexOf('--pfmea-id');
  const dryRun = args.includes('--dry-run');

  if (pfmeaIdIdx === -1 || !args[pfmeaIdIdx + 1]) {
    console.error('사용법: npx ts-node fmea-sql-quoting-fix.ts --pfmea-id <UUID> [--dry-run]');
    process.exit(1);
  }

  const pfmeaId = args[pfmeaIdIdx + 1];

  console.log('═'.repeat(60));
  console.log(' Smart FMEA SQL 쿼우팅 Auto-Fix');
  console.log(`  PFMEA ID : ${pfmeaId}`);
  console.log(`  모드     : ${dryRun ? 'DRY-RUN (탐지만)' : 'EXECUTE (교정 적용)'}`);
  console.log('═'.repeat(60));

  try {
    const report = await executeAutoFix(pfmeaId, dryRun);

    console.log('\n── 결과 ──');
    console.log(`  카테시안 복제  : ${report.cartesianDuplicates}건 탐지`);
    console.log(`  FK 재매핑      : ${report.fkRemapped}건 교정`);
    console.log(`  고아 PC        : ${report.orphanPCs}건 탐지`);
    console.log(`  고아 DC        : ${report.orphanDCs}건 탐지`);
    console.log(`  AP 재산정      : ${report.apRecalculated}건 갱신`);

    if (dryRun) {
      console.log('\n⚠ DRY-RUN 모드: 실제 교정은 적용되지 않았습니다.');
      console.log('  교정을 적용하려면 --dry-run 플래그를 제거하세요.');
    } else {
      console.log('\n✓ 교정 완료. AutoFixLog 테이블에서 상세 이력을 확인하세요.');
    }
  } catch (err) {
    console.error('Auto-Fix 실패:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();