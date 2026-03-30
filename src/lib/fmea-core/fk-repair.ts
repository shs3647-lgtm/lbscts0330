/**
 * @status CODEFREEZE L4 (Pipeline Protection) u{1F512}
 * @freeze_level L4 (Critical - DFMEA Pre-Development Snapshot)
 * @frozen_date 2026-03-30
 * @snapshot_tag codefreeze-v5.0-pre-dfmea-20260330
 * @allowed_changes NONE ???ъ슜??紐낆떆???뱀씤 + full test pass ?꾩닔
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 */
/**
 * FK 수선 — rebuild-atomic 없이 결정론적으로만 정리
 * - 깨진 FM/FE/FC 참조 FL 삭제 (RA/Opt는 스키마 cascade 또는 별도 고아 삭제)
 * - 선택: 공정 교차 FL 삭제 (crossProcessFk)
 * - 선택: FM.productCharId 가리키는 PC 없음 → null
 * - 텍스트/유사도로 FK 재연결 금지 (ImportMapping 전용 재매핑은 별도 API)
 */

import type { ValidateFkResponse } from '@/app/api/fmea/validate-fk/route';
import { runValidation } from '@/app/api/fmea/validate-fk/route';

export interface FkRepairOptions {
  dryRun: boolean;
  /** FM.productCharId → 없는 ProcessProductChar 이면 null 로 정리 */
  clearInvalidProductCharOnFm: boolean;
  /** validate-fk crossProcessFk 해당 FailureLink 삭제 */
  deleteCrossProcessFailureLinks: boolean;
}

export interface FkRepairResult {
  dryRun: boolean;
  fmeaId: string;
  before: ValidateFkResponse;
  after: ValidateFkResponse | null;
  deletedFailureLinkIds: string[];
  deletedRiskAnalysisIds: string[];
  deletedOptimizationIds: string[];
  clearedFailureModeIds: string[];
  messages: string[];
}

function collectCrossProcessFailureLinkIds(
  prisma: any,
  links: Array<{ id: string; fmId: string; fcId: string }>,
): Promise<string[]> {
  return (async () => {
    const fms = await prisma.failureMode.findMany({
      select: { id: true, l2StructId: true },
    });
    const fmToL2 = new Map<string, string>();
    for (const fm of fms) {
      if (fm.l2StructId) fmToL2.set(fm.id, fm.l2StructId);
    }

    const fcs = await prisma.failureCause.findMany({
      select: { id: true, l3FuncId: true },
    });
    const l3Funcs = await prisma.l3Function.findMany({
      select: { id: true, l3StructId: true },
    });
    const l3Structs = await prisma.l3Structure.findMany({
      select: { id: true, l2Id: true },
    });

    const l3FuncToL3Struct = new Map<string, string>();
    for (const f of l3Funcs) {
      if (f.l3StructId) l3FuncToL3Struct.set(f.id, f.l3StructId);
    }
    const l3StructToL2 = new Map<string, string>();
    for (const s of l3Structs) {
      if (s.l2Id) l3StructToL2.set(s.id, s.l2Id);
    }

    const fcToL2 = new Map<string, string>();
    for (const fc of fcs) {
      if (fc.l3FuncId) {
        const l3sId = l3FuncToL3Struct.get(fc.l3FuncId);
        if (l3sId) {
          const l2Id = l3StructToL2.get(l3sId);
          if (l2Id) fcToL2.set(fc.id, l2Id);
        }
      }
    }

    const cross: string[] = [];
    for (const link of links) {
      if (!link.fmId || !link.fcId) continue;
      const fmL2 = fmToL2.get(link.fmId);
      const fcL2 = fcToL2.get(link.fcId);
      if (fmL2 && fcL2 && fmL2 !== fcL2) {
        cross.push(link.id);
      }
    }
    return cross;
  })();
}

/**
 * 프로젝트 스키마 Prisma 인스턴스로 FK 수선 (트랜잭션은 호출자가 선택)
 */
export async function repairFkIntegrity(
  prisma: any,
  fmeaId: string,
  options: FkRepairOptions,
): Promise<FkRepairResult> {
  const messages: string[] = [];
  const deletedFailureLinkIds: string[] = [];
  const deletedRiskAnalysisIds: string[] = [];
  const deletedOptimizationIds: string[] = [];
  const clearedFailureModeIds: string[] = [];

  const before = await runValidation(prisma, fmeaId);

  const [fms, fcs, fes, links] = await Promise.all([
    prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureLink.findMany({
      where: { fmeaId },
      select: { id: true, fmId: true, fcId: true, feId: true },
    }),
  ]);

  const fmSet = new Set(fms.map((r: { id: string }) => r.id));
  const fcSet = new Set(fcs.map((r: { id: string }) => r.id));
  const feSet = new Set(fes.map((r: { id: string }) => r.id));

  const invalidFlIds = new Set<string>();
  for (const lk of links) {
    const missingTriple = !lk.fmId || !lk.fcId || !lk.feId;
    const badFk =
      !fmSet.has(lk.fmId) || !fcSet.has(lk.fcId) || !feSet.has(lk.feId);
    if (missingTriple || badFk) {
      invalidFlIds.add(lk.id);
    }
  }

  if (options.deleteCrossProcessFailureLinks) {
    const crossIds = await collectCrossProcessFailureLinkIds(prisma, links);
    for (const id of crossIds) invalidFlIds.add(id);
    if (crossIds.length > 0) {
      messages.push(`공정 교차 FailureLink 대상 ${crossIds.length}건 (삭제 예정/처리)`);
    }
  }

  const flIdSet = new Set(links.map((l: { id: string }) => l.id));

  const ras = await prisma.riskAnalysis.findMany({
    where: { fmeaId },
    select: { id: true, linkId: true },
  });
  const orphanRaIds = ras
    .filter((ra: { linkId: string }) => ra.linkId && !flIdSet.has(ra.linkId))
    .map((ra: { id: string }) => ra.id);

  const raIds = new Set(ras.map((r: { id: string }) => r.id));
  const opts = await prisma.optimization.findMany({
    where: { fmeaId },
    select: { id: true, riskId: true },
  });
  const orphanOptIds = opts
    .filter((o: { riskId: string }) => !raIds.has(o.riskId))
    .map((o: { id: string }) => o.id);

  const runMutations = async (tx: any) => {
    if (orphanOptIds.length > 0) {
      await tx.optimization.deleteMany({ where: { id: { in: orphanOptIds } } });
      deletedOptimizationIds.push(...orphanOptIds);
      messages.push(`Optimization FK 고아 삭제 ${orphanOptIds.length}건`);
    }

    if (orphanRaIds.length > 0) {
      await tx.riskAnalysis.deleteMany({ where: { id: { in: orphanRaIds } } });
      deletedRiskAnalysisIds.push(...orphanRaIds);
      messages.push(`RiskAnalysis FK 고아 삭제 ${orphanRaIds.length}건`);
    }

    const toDeleteFl = [...invalidFlIds];
    if (toDeleteFl.length > 0) {
      await tx.failureLink.deleteMany({ where: { id: { in: toDeleteFl } } });
      deletedFailureLinkIds.push(...toDeleteFl);
      messages.push(
        `FailureLink 삭제 ${toDeleteFl.length}건 (무효 FK·누락 3요소·공정교차 옵션)`,
      );
    }

    if (options.clearInvalidProductCharOnFm) {
      const pcs = await tx.processProductChar.findMany({
        where: { fmeaId },
        select: { id: true },
      });
      const pcSet = new Set(pcs.map((p: { id: string }) => p.id));
      const fmRows = await tx.failureMode.findMany({
        where: { fmeaId },
        select: { id: true, productCharId: true },
      });
      const toClear = fmRows.filter(
        (fm: { productCharId: string | null }) =>
          fm.productCharId != null && !pcSet.has(fm.productCharId),
      );
      for (const fm of toClear) {
        await tx.failureMode.update({
          where: { id: fm.id },
          data: { productCharId: null },
        });
        clearedFailureModeIds.push(fm.id);
      }
      if (toClear.length > 0) {
        messages.push(`FM productCharId 무효 → null ${toClear.length}건`);
      }
    }
  };

  if (!options.dryRun) {
    await prisma.$transaction(async (tx: any) => {
      await runMutations(tx);
    }, { timeout: 30_000, maxWait: 10_000 });
  } else {
    if (orphanOptIds.length) messages.push(`[dryRun] Optimization 고아 삭제 예정 ${orphanOptIds.length}건`);
    if (orphanRaIds.length) messages.push(`[dryRun] RiskAnalysis 고아 삭제 예정 ${orphanRaIds.length}건`);
    if (invalidFlIds.size) messages.push(`[dryRun] FailureLink 삭제 예정 ${invalidFlIds.size}건`);
    if (options.clearInvalidProductCharOnFm) {
      const pcs = await prisma.processProductChar.findMany({
        where: { fmeaId },
        select: { id: true },
      });
      const pcSet = new Set(pcs.map((p: { id: string }) => p.id));
      const fmRows = await prisma.failureMode.findMany({
        where: { fmeaId },
        select: { id: true, productCharId: true },
      });
      const n = fmRows.filter(
        (fm: { productCharId: string | null }) =>
          fm.productCharId != null && !pcSet.has(fm.productCharId),
      ).length;
      if (n > 0) messages.push(`[dryRun] FM productCharId → null 예정 ${n}건`);
    }
  }

  const after = options.dryRun ? null : await runValidation(prisma, fmeaId);

  return {
    dryRun: options.dryRun,
    fmeaId,
    before,
    after,
    deletedFailureLinkIds,
    deletedRiskAnalysisIds,
    deletedOptimizationIds,
    clearedFailureModeIds,
    messages,
  };
}
