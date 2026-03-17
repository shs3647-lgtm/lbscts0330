/**
 * @file importJobDb.ts
 * @description ImportJob/ImportMapping DB 작업 함수
 *
 * 비유: 이 모듈은 "공식 장부 관리자"다.
 * importJobManager가 준비한 출입명부를 공식 장부(DB)에 기록하고,
 * 나중에 출석체크(verifyRoundTrip)를 수행한다.
 */

import type { ImportJobData, ImportMappingRecord } from './importJobManager';

// Prisma 타입 — 런타임에 실제 인스턴스 주입
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaTransaction = any;

// ============================================================
// createImportJob
// ============================================================

/**
 * ImportJob 레코드를 DB에 생성한다.
 */
export async function createImportJob(
  prisma: PrismaTransaction,
  data: ImportJobData,
) {
  return prisma.importJob.create({
    data: {
      id: data.id,
      fmeaId: data.fmeaId,
      fileName: data.fileName ?? null,
      flatDataCount: data.flatDataCount,
      chainCount: data.chainCount,
      status: data.status,
      usedReversePath: data.usedReversePath,
    },
  });
}

// ============================================================
// saveAllMappings
// ============================================================

/**
 * ImportMapping 레코드를 일괄 저장한다 (createMany + skipDuplicates).
 *
 * @returns 저장된 레코드 수
 */
export async function saveAllMappings(
  prisma: PrismaTransaction,
  jobId: string,
  records: ImportMappingRecord[],
): Promise<number> {
  if (records.length === 0) return 0;

  const result = await prisma.importMapping.createMany({
    data: records.map(r => ({
      jobId,
      flatDataId: r.flatDataId,
      entityId: r.entityId,
      entityType: r.entityType,
      processNo: r.processNo ?? null,
      itemCode: r.itemCode ?? null,
      entityText: r.entityText ?? null,
      verified: false,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

// ============================================================
// updateJobStatus
// ============================================================

/**
 * ImportJob 상태를 업데이트한다.
 */
export async function updateJobStatus(
  prisma: PrismaTransaction,
  jobId: string,
  status: ImportJobData['status'],
  errorMessage?: string,
) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: {
      status,
      errorMessage: errorMessage ?? null,
      completedAt: ['completed', 'failed'].includes(status) ? new Date() : null,
    },
  });
}

// ============================================================
// verifyRoundTrip
// ============================================================

interface VerifyResult {
  total: number;
  verified: number;
  missing: Array<{
    entityId: string;
    entityType: string;
    flatDataId: string;
  }>;
}

/**
 * round-trip 검증: ImportMapping의 모든 entityId가 실제 DB에 존재하는지 확인.
 *
 * 비유: "출석체크" — 명부에 적힌 사람이 실제로 교실에 있는지 확인한다.
 *
 * @returns total(전체), verified(확인된), missing(누락 목록)
 */
export async function verifyRoundTrip(
  prisma: PrismaTransaction,
  jobId: string,
): Promise<VerifyResult> {
  const mappings = await prisma.importMapping.findMany({
    where: { jobId },
    select: { id: true, flatDataId: true, entityId: true, entityType: true },
  });

  if (mappings.length === 0) {
    return { total: 0, verified: 0, missing: [] };
  }

  // 엔티티 타입별 ID 그룹핑
  const fmIds = mappings.filter((m: { entityType: string }) => m.entityType === 'FM').map((m: { entityId: string }) => m.entityId);
  const fcIds = mappings.filter((m: { entityType: string }) => m.entityType === 'FC').map((m: { entityId: string }) => m.entityId);
  const feIds = mappings.filter((m: { entityType: string }) => m.entityType === 'FE').map((m: { entityId: string }) => m.entityId);

  // 배치 존재 체크 (3개 테이블 병렬)
  const [existingFM, existingFC, existingFE] = await Promise.all([
    fmIds.length > 0
      ? prisma.failureMode.findMany({ where: { id: { in: fmIds } }, select: { id: true } })
      : [],
    fcIds.length > 0
      ? prisma.failureCause.findMany({ where: { id: { in: fcIds } }, select: { id: true } })
      : [],
    feIds.length > 0
      ? prisma.failureEffect.findMany({ where: { id: { in: feIds } }, select: { id: true } })
      : [],
  ]);

  const existingSet = new Set([
    ...existingFM.map((r: { id: string }) => r.id),
    ...existingFC.map((r: { id: string }) => r.id),
    ...existingFE.map((r: { id: string }) => r.id),
  ]);

  // verified 플래그 업데이트
  const verifiedMappingIds = mappings
    .filter((m: { entityId: string }) => existingSet.has(m.entityId))
    .map((m: { id: string }) => m.id);

  if (verifiedMappingIds.length > 0) {
    await prisma.importMapping.updateMany({
      where: { id: { in: verifiedMappingIds } },
      data: { verified: true },
    });
  }

  // 누락 목록 수집
  const missing = mappings
    .filter((m: { entityId: string }) => !existingSet.has(m.entityId))
    .map((m: { entityId: string; entityType: string; flatDataId: string }) => ({
      entityId: m.entityId,
      entityType: m.entityType,
      flatDataId: m.flatDataId,
    }));

  const result: VerifyResult = {
    total: mappings.length,
    verified: verifiedMappingIds.length,
    missing,
  };

  console.log(
    `[verifyRoundTrip] 전체: ${result.total} / 확인: ${result.verified} / 누락: ${result.missing.length}`,
  );
  if (result.missing.length > 0) {
    console.warn('[verifyRoundTrip] 누락 목록:', JSON.stringify(result.missing.slice(0, 10)));
  }

  return result;
}

// ============================================================
// getJobMappings (디버그용)
// ============================================================

/**
 * 특정 ImportJob의 매핑 전체를 조회한다.
 */
export async function getJobMappings(
  prisma: PrismaTransaction,
  jobId: string,
  opts?: { entityType?: string },
) {
  return prisma.importMapping.findMany({
    where: {
      jobId,
      ...(opts?.entityType ? { entityType: opts.entityType } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });
}

// ============================================================
// getLatestImportJob (디버그용)
// ============================================================

/**
 * 특정 FMEA의 최신 ImportJob을 조회한다.
 */
export async function getLatestImportJob(
  prisma: PrismaTransaction,
  fmeaId: string,
) {
  return prisma.importJob.findFirst({
    where: { fmeaId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { mappings: true } },
    },
  });
}
