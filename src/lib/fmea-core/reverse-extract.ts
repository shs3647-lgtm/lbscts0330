/**
 * @file reverse-extract.ts
 * 역설계 Import 시스템 — STEP 1~3: M002 Atomic DB 전체 로드 + 검증
 * 설계서: docs/REVERSE_ENGINEERING_IMPORT_SYSTEM.md §2.2 STEP 1~3
 */

import type { PrismaClient } from '@prisma/client';
import { assertQueryResult, assertSourceComplete } from './guards';
import type { FullAtomicDB } from './guards';

/**
 * 원본 FMEA의 Atomic DB를 전체 로드한다.
 * 모든 UUID/FK는 DB 원본 그대로 — uid() 호출 0건, 매칭 로직 0건.
 */
export async function reverseExtract(
  prisma: PrismaClient,
  fmeaId: string
): Promise<FullAtomicDB> {
  const p = prisma as any;

  const [
    l1Structure,
    l2Structures,
    l3Structures,
    l1Functions,
    l2Functions,
    l3Functions,
    processProductChars,
    failureEffects,
    failureModes,
    failureCauses,
    failureLinks,
    riskAnalyses,
    optimizations,
  ] = await Promise.all([
    p.l1Structure.findFirst({ where: { fmeaId } }),
    p.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    p.l3Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    p.l1Function.findMany({ where: { fmeaId } }),
    p.l2Function.findMany({ where: { fmeaId } }),
    p.l3Function.findMany({ where: { fmeaId } }),
    p.processProductChar.findMany({ where: { fmeaId }, orderBy: { orderIndex: 'asc' } }),
    p.failureEffect.findMany({ where: { fmeaId } }),
    p.failureMode.findMany({ where: { fmeaId } }),
    p.failureCause.findMany({ where: { fmeaId } }),
    p.failureLink.findMany({ where: { fmeaId } }),
    p.riskAnalysis.findMany({ where: { fmeaId } }),
    p.optimization.findMany({ where: { fmeaId } }),
  ]);

  // Guard 3: fmeaId 일치 검증 (전 테이블)
  assertQueryResult(l2Structures, fmeaId, 'L2Structure');
  assertQueryResult(l3Structures, fmeaId, 'L3Structure');
  assertQueryResult(l1Functions, fmeaId, 'L1Function');
  assertQueryResult(l2Functions, fmeaId, 'L2Function');
  assertQueryResult(l3Functions, fmeaId, 'L3Function');
  assertQueryResult(failureEffects, fmeaId, 'FailureEffect');
  assertQueryResult(failureModes, fmeaId, 'FailureMode');
  assertQueryResult(failureCauses, fmeaId, 'FailureCause');
  assertQueryResult(failureLinks, fmeaId, 'FailureLink');
  assertQueryResult(riskAnalyses, fmeaId, 'RiskAnalysis');

  const data: FullAtomicDB = {
    fmeaId,
    l1Structure,
    l2Structures,
    l3Structures,
    l1Functions,
    l2Functions,
    l3Functions,
    processProductChars,
    failureEffects,
    failureModes,
    failureCauses,
    failureLinks,
    riskAnalyses,
    optimizations,
  };

  // Guard 4: 원본 완전성 검증
  assertSourceComplete(data, fmeaId);

  return data;
}
