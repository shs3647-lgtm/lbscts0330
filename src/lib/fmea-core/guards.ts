/**
 * @file guards.ts
 * 역설계 Import 시스템 — Guard 함수 (fmeaId 격리, 스키마 격리, 쿼리 검증, 원본 완전성)
 * 설계서: docs/REVERSE_ENGINEERING_IMPORT_SYSTEM.md §6.1
 */

import { isValidFmeaId } from '@/lib/security';
import { getPrismaForSchema, getBaseDatabaseUrl } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import type { PrismaClient } from '@prisma/client';

export interface FullAtomicDB {
  fmeaId: string;
  l1Structure: any;
  l2Structures: any[];
  l3Structures: any[];
  l1Functions: any[];
  l2Functions: any[];
  l3Functions: any[];
  processProductChars: any[];
  failureEffects: any[];
  failureModes: any[];
  failureCauses: any[];
  failureLinks: any[];
  riskAnalyses: any[];
  optimizations: any[];
}

/** Guard 1: fmeaId 유효성 검증 */
export function assertFmeaId(fmeaId: string): void {
  if (!fmeaId || !isValidFmeaId(fmeaId)) {
    throw new Error(`[GUARD] 유효하지 않은 fmeaId: ${fmeaId}`);
  }
}

/** Guard 2: 프로젝트 스키마 격리 Prisma 클라이언트 반환 */
export async function getIsolatedPrisma(fmeaId: string): Promise<PrismaClient> {
  assertFmeaId(fmeaId);
  const schema = getProjectSchemaName(fmeaId);
  const baseDatabaseUrl = getBaseDatabaseUrl();
  await ensureProjectSchemaReady({ baseDatabaseUrl, schema });
  const prisma = getPrismaForSchema(schema);
  if (!prisma) {
    throw new Error(`[GUARD] 스키마 ${schema} Prisma 클라이언트 생성 실패`);
  }
  return prisma;
}

/** Guard 3: 쿼리 결과 fmeaId 일치 검증 */
export function assertQueryResult(
  records: { fmeaId: string }[],
  expectedFmeaId: string,
  tableName: string
): void {
  const mismatch = records.filter(r => r.fmeaId !== expectedFmeaId);
  if (mismatch.length > 0) {
    throw new Error(
      `[GUARD] ${tableName}에서 fmeaId 불일치 ${mismatch.length}건 (expected: ${expectedFmeaId})`
    );
  }
}

/** Guard 4: 원본 Atomic DB 완전성 검증 */
export function assertSourceComplete(data: FullAtomicDB, fmeaId: string): void {
  const errors: string[] = [];

  if (!data.l1Structure) {
    errors.push('L1Structure 없음');
  }
  if (data.l2Structures.length === 0) {
    errors.push('L2Structure 0건');
  }
  if (data.l3Structures.length === 0) {
    errors.push('L3Structure 0건');
  }
  if (data.failureModes.length === 0) {
    errors.push('FailureMode 0건');
  }
  if (data.failureCauses.length === 0) {
    errors.push('FailureCause 0건');
  }
  if (data.failureLinks.length === 0) {
    errors.push('FailureLink 0건');
  }

  // FK 정합성: FailureLink가 참조하는 FM/FE/FC가 존재하는지
  const fmIds = new Set(data.failureModes.map((m: any) => m.id));
  const feIds = new Set(data.failureEffects.map((e: any) => e.id));
  const fcIds = new Set(data.failureCauses.map((c: any) => c.id));

  let brokenFk = 0;
  for (const link of data.failureLinks) {
    if (!fmIds.has(link.fmId)) brokenFk++;
    if (!feIds.has(link.feId)) brokenFk++;
    if (!fcIds.has(link.fcId)) brokenFk++;
  }
  if (brokenFk > 0) {
    errors.push(`FailureLink FK 깨짐 ${brokenFk}건`);
  }

  if (errors.length > 0) {
    throw new Error(
      `[GUARD] ${fmeaId} 원본 데이터 불완전: ${errors.join(', ')}`
    );
  }
}
