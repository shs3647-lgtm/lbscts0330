/**
 * @file save-atomic.ts
 * 역설계 Import 시스템 — STEP 5: $transaction 원자적 삽입 (DELETE ALL → CREATE ALL)
 * 설계서: docs/REVERSE_ENGINEERING_IMPORT_SYSTEM.md §2.2 STEP 5, §6.5
 */

import type { PrismaClient } from '@prisma/client';
import type { FullAtomicDB } from './guards';

export interface ReverseImportOptions {
  copySOD: boolean;
  copyDCPC: boolean;
  copyOptimization: boolean;
}

const DEFAULT_OPTIONS: ReverseImportOptions = {
  copySOD: false,
  copyDCPC: true,
  copyOptimization: false,
};

/** Prisma datetime 필드 제거 (DB에서 자동 생성) */
function stripTimestamps(record: Record<string, any>): Record<string, any> {
  const { createdAt, updatedAt, ...rest } = record;
  return rest;
}

function stripAll(records: Record<string, any>[]): Record<string, any>[] {
  return records.map(stripTimestamps);
}

/**
 * 대상 스키마에 Atomic DB 전체를 원자적으로 저장한다.
 * DELETE ALL (자식→부모) → CREATE ALL (부모→자식)
 * 트랜잭션 내 레코드 수 검증 → 불일치 시 ROLLBACK
 */
export async function saveAtomicDBInTransaction(
  prisma: PrismaClient,
  data: FullAtomicDB,
  options: Partial<ReverseImportOptions> = {}
): Promise<{ counts: Record<string, number> }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tx = prisma as any;
  const fmeaId = data.fmeaId;

  const counts: Record<string, number> = {};

  await (prisma as any).$transaction(async (tx: any) => {
    // ── DELETE ALL (자식 → 부모) ──
    await tx.optimization.deleteMany({ where: { fmeaId } });
    await tx.riskAnalysis.deleteMany({ where: { fmeaId } });
    await tx.failureLink.deleteMany({ where: { fmeaId } });
    await tx.failureAnalysis?.deleteMany?.({ where: { fmeaId } }).catch(() => {});
    await tx.failureEffect.deleteMany({ where: { fmeaId } });
    await tx.failureMode.deleteMany({ where: { fmeaId } });
    await tx.failureCause.deleteMany({ where: { fmeaId } });
    await tx.l1Requirement?.deleteMany?.({ where: { fmeaId } }).catch(() => {});
    await tx.l1Function.deleteMany({ where: { fmeaId } });
    await tx.processProductChar.deleteMany({ where: { fmeaId } });
    await tx.l2Function.deleteMany({ where: { fmeaId } });
    await tx.l3Function.deleteMany({ where: { fmeaId } });
    await tx.l1Structure.deleteMany({ where: { fmeaId } });
    await tx.l2Structure.deleteMany({ where: { fmeaId } });
    await tx.l3Structure.deleteMany({ where: { fmeaId } });

    // ── CREATE ALL (부모 → 자식) ──

    // L1 Structure
    if (data.l1Structure) {
      await tx.l1Structure.create({ data: stripTimestamps(data.l1Structure) });
      counts.l1Structure = 1;
    }

    // L2 Structures
    if (data.l2Structures.length > 0) {
      await tx.l2Structure.createMany({ data: stripAll(data.l2Structures) });
      counts.l2Structures = data.l2Structures.length;
    }

    // L3 Structures
    if (data.l3Structures.length > 0) {
      await tx.l3Structure.createMany({ data: stripAll(data.l3Structures) });
      counts.l3Structures = data.l3Structures.length;
    }

    // L1 Functions
    if (data.l1Functions.length > 0) {
      await tx.l1Function.createMany({ data: stripAll(data.l1Functions) });
      counts.l1Functions = data.l1Functions.length;
    }

    // L2 Functions
    if (data.l2Functions.length > 0) {
      await tx.l2Function.createMany({ data: stripAll(data.l2Functions) });
      counts.l2Functions = data.l2Functions.length;
    }

    // ProcessProductChar
    if (data.processProductChars.length > 0) {
      await tx.processProductChar.createMany({ data: stripAll(data.processProductChars) });
      counts.processProductChars = data.processProductChars.length;
    }

    // L3 Functions
    if (data.l3Functions.length > 0) {
      await tx.l3Function.createMany({ data: stripAll(data.l3Functions) });
      counts.l3Functions = data.l3Functions.length;
    }

    // Failure Effects
    if (data.failureEffects.length > 0) {
      await tx.failureEffect.createMany({ data: stripAll(data.failureEffects) });
      counts.failureEffects = data.failureEffects.length;
    }

    // Failure Modes
    if (data.failureModes.length > 0) {
      await tx.failureMode.createMany({ data: stripAll(data.failureModes) });
      counts.failureModes = data.failureModes.length;
    }

    // Failure Causes
    if (data.failureCauses.length > 0) {
      await tx.failureCause.createMany({ data: stripAll(data.failureCauses) });
      counts.failureCauses = data.failureCauses.length;
    }

    // Failure Links
    if (data.failureLinks.length > 0) {
      await tx.failureLink.createMany({ data: stripAll(data.failureLinks) });
      counts.failureLinks = data.failureLinks.length;
    }

    // Risk Analyses (SOD + DC/PC)
    if (data.riskAnalyses.length > 0) {
      const raData = stripAll(data.riskAnalyses).map((ra: any) => ({
        ...ra,
        severity: opts.copySOD ? ra.severity : 0,
        occurrence: opts.copySOD ? ra.occurrence : 0,
        detection: opts.copySOD ? ra.detection : 0,
        ap: opts.copySOD ? ra.ap : '',
        preventionControl: opts.copyDCPC ? ra.preventionControl : null,
        detectionControl: opts.copyDCPC ? ra.detectionControl : null,
      }));
      await tx.riskAnalysis.createMany({ data: raData });
      counts.riskAnalyses = data.riskAnalyses.length;
    }

    // Optimizations (선택적)
    if (opts.copyOptimization && data.optimizations.length > 0) {
      await tx.optimization.createMany({ data: stripAll(data.optimizations) });
      counts.optimizations = data.optimizations.length;
    }

    // ── VERIFY (트랜잭션 내 레코드 수 검증) ──
    const [dbL2, dbL3, dbFM, dbFC, dbFL, dbRA] = await Promise.all([
      tx.l2Structure.count({ where: { fmeaId } }),
      tx.l3Structure.count({ where: { fmeaId } }),
      tx.failureMode.count({ where: { fmeaId } }),
      tx.failureCause.count({ where: { fmeaId } }),
      tx.failureLink.count({ where: { fmeaId } }),
      tx.riskAnalysis.count({ where: { fmeaId } }),
    ]);

    const expected = {
      L2: data.l2Structures.length,
      L3: data.l3Structures.length,
      FM: data.failureModes.length,
      FC: data.failureCauses.length,
      FL: data.failureLinks.length,
      RA: data.riskAnalyses.length,
    };
    const actual = { L2: dbL2, L3: dbL3, FM: dbFM, FC: dbFC, FL: dbFL, RA: dbRA };

    const mismatches: string[] = [];
    for (const [key, exp] of Object.entries(expected)) {
      const act = actual[key as keyof typeof actual];
      if (act !== exp) {
        mismatches.push(`${key}: expected=${exp} actual=${act}`);
      }
    }

    if (mismatches.length > 0) {
      throw new Error(
        `[ROLLBACK] 레코드 수 불일치: ${mismatches.join(', ')}`
      );
    }
  }, { timeout: 30000, isolationLevel: 'Serializable' as any });

  return { counts };
}

