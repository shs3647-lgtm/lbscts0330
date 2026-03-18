/**
 * @file cloneAtomicData.ts
 * @description FMEA 개정 — 원자성 테이블 전체 복제 + ID 리맵핑 + 최적화 승격
 *
 * 복제 순서 (FK 의존성):
 *   L1Structure → L2Structure → L3Structure
 *   → L1Function → L2Function → L3Function
 *   → FailureEffect → FailureMode → FailureCause
 *   → FailureLink → FailureAnalysis
 *   → RiskAnalysis (승격 적용) + Optimization 제외
 *
 * @created 2026-03-02
 */

import { randomUUID } from 'crypto';
import { promoteRiskAnalysis, type OptimizationSource } from './promotionLogic';

// ── 타입 ──

export interface IdRemapMap {
  [oldId: string]: string;
}

export interface PromotionEntry {
  oldLinkId: string;
  severity: number;
  occurrence: number;
  detection: number;
  ap: string;
  preventionControl: string | null;
  detectionControl: string | null;
}

export interface CloneResult {
  idMap: IdRemapMap;
  promotionMap: Map<string, PromotionEntry>;
  stats: {
    l1Structures: number;
    l2Structures: number;
    l3Structures: number;
    l1Functions: number;
    l2Functions: number;
    l3Functions: number;
    failureEffects: number;
    failureModes: number;
    failureCauses: number;
    failureLinks: number;
    failureAnalyses: number;
    riskAnalyses: number;
    promoted: number;
  };
}

// ── ID 리맵핑 유틸 ──

function remap(idMap: IdRemapMap, oldId: string): string {
  return idMap[oldId] || oldId;
}

function remapOptional(idMap: IdRemapMap, oldId: string | null | undefined): string | null {
  if (!oldId) return null;
  return idMap[oldId] || oldId;
}

// ── 메인 함수 ──

/**
 * 원자성 테이블 전체 복제 + 최적화 승격
 *
 * @param tx - Prisma 트랜잭션 클라이언트
 * @param sourceFmeaId - 원본 FMEA ID (리네임 된 후의 ID, e.g. "pfm-xxx-r00")
 * @param newFmeaId - 새 FMEA ID (e.g. "pfm-xxx-r01")
 * @returns 클론 결과 (ID맵, 승격맵, 통계)
 */
export async function cloneAtomicData(
  tx: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  sourceFmeaId: string,
  newFmeaId: string
): Promise<CloneResult> {
  const idMap: IdRemapMap = {};
  const promotionMap = new Map<string, PromotionEntry>();
  const stats = {
    l1Structures: 0, l2Structures: 0, l3Structures: 0,
    l1Functions: 0, l2Functions: 0, l3Functions: 0,
    failureEffects: 0, failureModes: 0, failureCauses: 0,
    failureLinks: 0, failureAnalyses: 0, riskAnalyses: 0, promoted: 0,
  };

  // ── 1. 원본 데이터 로드 ──
  const [
    srcL1Structs, srcL2Structs, srcL3Structs,
    srcL1Funcs, srcL2Funcs, srcL3Funcs,
    srcFEs, srcFMs, srcFCs,
    srcLinks, srcFAs, srcRisks, srcOpts,
  ] = await Promise.all([
    tx.l1Structure.findMany({ where: { fmeaId: sourceFmeaId } }),
    tx.l2Structure.findMany({ where: { fmeaId: sourceFmeaId } }),
    tx.l3Structure.findMany({ where: { fmeaId: sourceFmeaId } }),
    tx.l1Function.findMany({ where: { fmeaId: sourceFmeaId } }),
    tx.l2Function.findMany({ where: { fmeaId: sourceFmeaId } }),
    tx.l3Function.findMany({ where: { fmeaId: sourceFmeaId } }),
    tx.failureEffect.findMany({ where: { fmeaId: sourceFmeaId } }),
    tx.failureMode.findMany({ where: { fmeaId: sourceFmeaId } }),
    tx.failureCause.findMany({ where: { fmeaId: sourceFmeaId } }),
    tx.failureLink.findMany({ where: { fmeaId: sourceFmeaId, deletedAt: null } }),
    tx.failureAnalysis.findMany({ where: { fmeaId: sourceFmeaId } }),
    tx.riskAnalysis.findMany({ where: { fmeaId: sourceFmeaId } }),
    tx.optimization.findMany({ where: { fmeaId: sourceFmeaId }, orderBy: { updatedAt: 'desc' } }),
  ]);

  // ── 2. ID 맵 생성 (모든 엔티티에 새 UUID) ──
  const allEntities = [
    ...srcL1Structs, ...srcL2Structs, ...srcL3Structs,
    ...srcL1Funcs, ...srcL2Funcs, ...srcL3Funcs,
    ...srcFEs, ...srcFMs, ...srcFCs,
    ...srcLinks, ...srcFAs, ...srcRisks,
  ];
  for (const entity of allEntities) {
    if (entity.id && !idMap[entity.id]) {
      idMap[entity.id] = randomUUID();
    }
  }

  // ── 3. 최적화 맵 구축 (riskId → 최신 완료 Optimization) ──
  const optByRiskId = new Map<string, OptimizationSource>();
  for (const opt of srcOpts) {
    // 이미 처리된 riskId는 스킵 (orderBy updatedAt desc이므로 첫 번째가 최신)
    if (!optByRiskId.has(opt.riskId)) {
      optByRiskId.set(opt.riskId, {
        recommendedAction: opt.recommendedAction || '',
        newSeverity: opt.newSeverity,
        newOccurrence: opt.newOccurrence,
        newDetection: opt.newDetection,
        status: opt.status || '',
      });
    }
  }

  // ── 4. 복제 (의존성 순서) ──

  // 4a. L1Structure
  if (srcL1Structs.length > 0) {
    await tx.l1Structure.createMany({
      data: srcL1Structs.map((s: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: remap(idMap, s.id),
        fmeaId: newFmeaId,
        name: s.name,
        confirmed: s.confirmed,
        rowIndex: s.rowIndex,
        colIndex: s.colIndex,
        parentId: remapOptional(idMap, s.parentId),
        mergeGroupId: remapOptional(idMap, s.mergeGroupId),
        rowSpan: s.rowSpan,
        colSpan: s.colSpan,
      })),
      skipDuplicates: true,
    });
    stats.l1Structures = srcL1Structs.length;
  }

  // 4b. L2Structure
  if (srcL2Structs.length > 0) {
    await tx.l2Structure.createMany({
      data: srcL2Structs.map((s: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: remap(idMap, s.id),
        fmeaId: newFmeaId,
        l1Id: remap(idMap, s.l1Id),
        no: s.no,
        name: s.name,
        order: s.order,
        rowIndex: s.rowIndex,
        colIndex: s.colIndex,
        parentId: remapOptional(idMap, s.parentId),
        mergeGroupId: remapOptional(idMap, s.mergeGroupId),
        rowSpan: s.rowSpan,
        colSpan: s.colSpan,
      })),
      skipDuplicates: true,
    });
    stats.l2Structures = srcL2Structs.length;
  }

  // 4c. L3Structure
  if (srcL3Structs.length > 0) {
    await tx.l3Structure.createMany({
      data: srcL3Structs.map((s: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: remap(idMap, s.id),
        fmeaId: newFmeaId,
        l1Id: remap(idMap, s.l1Id),
        l2Id: remap(idMap, s.l2Id),
        m4: s.m4,
        name: s.name,
        order: s.order,
        rowIndex: s.rowIndex,
        colIndex: s.colIndex,
        parentId: remapOptional(idMap, s.parentId),
        mergeGroupId: remapOptional(idMap, s.mergeGroupId),
        rowSpan: s.rowSpan,
        colSpan: s.colSpan,
      })),
      skipDuplicates: true,
    });
    stats.l3Structures = srcL3Structs.length;
  }

  // 4d. L1Function
  if (srcL1Funcs.length > 0) {
    await tx.l1Function.createMany({
      data: srcL1Funcs.map((f: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: remap(idMap, f.id),
        fmeaId: newFmeaId,
        l1StructId: remap(idMap, f.l1StructId),
        category: f.category,
        functionName: f.functionName,
        requirement: f.requirement,
        parentId: remapOptional(idMap, f.parentId),
        mergeGroupId: remapOptional(idMap, f.mergeGroupId),
        rowSpan: f.rowSpan,
        colSpan: f.colSpan,
      })),
      skipDuplicates: true,
    });
    stats.l1Functions = srcL1Funcs.length;
  }

  // 4e. L2Function
  if (srcL2Funcs.length > 0) {
    await tx.l2Function.createMany({
      data: srcL2Funcs.map((f: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: remap(idMap, f.id),
        fmeaId: newFmeaId,
        l2StructId: remap(idMap, f.l2StructId),
        functionName: f.functionName,
        productChar: f.productChar,
        specialChar: f.specialChar,
        parentId: remapOptional(idMap, f.parentId),
        mergeGroupId: remapOptional(idMap, f.mergeGroupId),
        rowSpan: f.rowSpan,
        colSpan: f.colSpan,
      })),
      skipDuplicates: true,
    });
    stats.l2Functions = srcL2Funcs.length;
  }

  // 4f. L3Function
  if (srcL3Funcs.length > 0) {
    await tx.l3Function.createMany({
      data: srcL3Funcs.map((f: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: remap(idMap, f.id),
        fmeaId: newFmeaId,
        l3StructId: remap(idMap, f.l3StructId),
        l2StructId: remap(idMap, f.l2StructId),
        functionName: f.functionName,
        processChar: f.processChar,
        specialChar: f.specialChar,
        parentId: remapOptional(idMap, f.parentId),
        mergeGroupId: remapOptional(idMap, f.mergeGroupId),
        rowSpan: f.rowSpan,
        colSpan: f.colSpan,
      })),
      skipDuplicates: true,
    });
    stats.l3Functions = srcL3Funcs.length;
  }

  // 4g. FailureEffect
  if (srcFEs.length > 0) {
    await tx.failureEffect.createMany({
      data: srcFEs.map((fe: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: remap(idMap, fe.id),
        fmeaId: newFmeaId,
        l1FuncId: remap(idMap, fe.l1FuncId),
        category: fe.category,
        effect: fe.effect,
        severity: fe.severity,
        parentId: remapOptional(idMap, fe.parentId),
        mergeGroupId: remapOptional(idMap, fe.mergeGroupId),
        rowSpan: fe.rowSpan,
        colSpan: fe.colSpan,
      })),
      skipDuplicates: true,
    });
    stats.failureEffects = srcFEs.length;
  }

  // 4h. FailureMode
  if (srcFMs.length > 0) {
    await tx.failureMode.createMany({
      data: srcFMs.map((fm: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: remap(idMap, fm.id),
        fmeaId: newFmeaId,
        l2FuncId: remap(idMap, fm.l2FuncId),
        l2StructId: remap(idMap, fm.l2StructId),
        productCharId: remapOptional(idMap, fm.productCharId),
        mode: fm.mode,
        specialChar: fm.specialChar,
        parentId: remapOptional(idMap, fm.parentId),
        mergeGroupId: remapOptional(idMap, fm.mergeGroupId),
        rowSpan: fm.rowSpan,
        colSpan: fm.colSpan,
      })),
      skipDuplicates: true,
    });
    stats.failureModes = srcFMs.length;
  }

  // 4i. FailureCause
  if (srcFCs.length > 0) {
    await tx.failureCause.createMany({
      data: srcFCs.map((fc: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: remap(idMap, fc.id),
        fmeaId: newFmeaId,
        l3FuncId: remap(idMap, fc.l3FuncId),
        l3StructId: remap(idMap, fc.l3StructId),
        l2StructId: remap(idMap, fc.l2StructId),
        processCharId: remapOptional(idMap, fc.processCharId),
        cause: fc.cause,
        occurrence: fc.occurrence,
        parentId: remapOptional(idMap, fc.parentId),
        mergeGroupId: remapOptional(idMap, fc.mergeGroupId),
        rowSpan: fc.rowSpan,
        colSpan: fc.colSpan,
      })),
      skipDuplicates: true,
    });
    stats.failureCauses = srcFCs.length;
  }

  // 4j. FailureLink (soft-deleted 제외됨 — 위에서 deletedAt: null 필터)
  if (srcLinks.length > 0) {
    await tx.failureLink.createMany({
      data: srcLinks.map((link: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: remap(idMap, link.id),
        fmeaId: newFmeaId,
        fmId: remap(idMap, link.fmId),
        feId: remap(idMap, link.feId),
        fcId: remap(idMap, link.fcId),
        fmText: link.fmText,
        fmProcess: link.fmProcess,
        feText: link.feText,
        feScope: link.feScope,
        fcText: link.fcText,
        fcWorkElem: link.fcWorkElem,
        fcM4: link.fcM4,
        severity: link.severity,
        fmSeq: link.fmSeq,
        feSeq: link.feSeq,
        fcSeq: link.fcSeq,
        fmPath: link.fmPath,
        fePath: link.fePath,
        fcPath: link.fcPath,
        parentId: remapOptional(idMap, link.parentId),
        mergeGroupId: remapOptional(idMap, link.mergeGroupId),
        rowSpan: link.rowSpan,
        colSpan: link.colSpan,
      })),
      skipDuplicates: true,
    });
    stats.failureLinks = srcLinks.length;
  }

  // 4k. FailureAnalysis
  if (srcFAs.length > 0) {
    await tx.failureAnalysis.createMany({
      data: srcFAs.map((fa: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: remap(idMap, fa.id),
        fmeaId: newFmeaId,
        linkId: remap(idMap, fa.linkId),
        fmId: remap(idMap, fa.fmId),
        fmText: fa.fmText,
        fmProcessName: fa.fmProcessName,
        feId: remap(idMap, fa.feId),
        feText: fa.feText,
        feCategory: fa.feCategory,
        feSeverity: fa.feSeverity,
        fcId: remap(idMap, fa.fcId),
        fcText: fa.fcText,
        fcOccurrence: fa.fcOccurrence,
        fcWorkElementName: fa.fcWorkElementName,
        fcM4: fa.fcM4,
        l1FuncId: remap(idMap, fa.l1FuncId),
        l1Category: fa.l1Category,
        l1FuncName: fa.l1FuncName,
        l1Requirement: fa.l1Requirement,
        l2FuncId: remap(idMap, fa.l2FuncId),
        l2FuncName: fa.l2FuncName,
        l2ProductChar: fa.l2ProductChar,
        l2SpecialChar: fa.l2SpecialChar,
        l3FuncId: remap(idMap, fa.l3FuncId),
        l3FuncName: fa.l3FuncName,
        l3ProcessChar: fa.l3ProcessChar,
        l3SpecialChar: fa.l3SpecialChar,
        l1StructId: remap(idMap, fa.l1StructId),
        l1StructName: fa.l1StructName,
        l2StructId: remap(idMap, fa.l2StructId),
        l2StructNo: fa.l2StructNo,
        l2StructName: fa.l2StructName,
        l3StructId: remap(idMap, fa.l3StructId),
        l3StructM4: fa.l3StructM4,
        l3StructName: fa.l3StructName,
        order: fa.order,
        confirmed: fa.confirmed,
      })),
      skipDuplicates: true,
    });
    stats.failureAnalyses = srcFAs.length;
  }

  // 4l. RiskAnalysis (★ 최적화 승격 적용)
  if (srcRisks.length > 0) {
    for (const risk of srcRisks) {
      const opt = optByRiskId.get(risk.id) || null;
      const promoted = promoteRiskAnalysis(
        {
          severity: risk.severity,
          occurrence: risk.occurrence,
          detection: risk.detection,
          ap: risk.ap,
          preventionControl: risk.preventionControl,
          detectionControl: risk.detectionControl,
        },
        opt
      );

      const newRiskId = remap(idMap, risk.id);
      const newLinkId = remap(idMap, risk.linkId);

      await tx.riskAnalysis.create({
        data: {
          id: newRiskId,
          fmeaId: newFmeaId,
          linkId: newLinkId,
          severity: promoted.severity,
          occurrence: promoted.occurrence,
          detection: promoted.detection,
          ap: promoted.ap,
          preventionControl: promoted.preventionControl,
          detectionControl: promoted.detectionControl,
          lldReference: (risk as any).lldReference || null,
        },
      });

      // 승격 맵 기록 (LegacyData 변환용)
      promotionMap.set(risk.linkId, {
        oldLinkId: risk.linkId,
        severity: promoted.severity,
        occurrence: promoted.occurrence,
        detection: promoted.detection,
        ap: promoted.ap,
        preventionControl: promoted.preventionControl,
        detectionControl: promoted.detectionControl,
      });

      if (opt && opt.status === '완료') {
        stats.promoted++;
      }
    }
    stats.riskAnalyses = srcRisks.length;
  }

  // ★ Optimization은 복제하지 않음 (새 개정에서 fresh start)

  return { idMap, promotionMap, stats };
}
