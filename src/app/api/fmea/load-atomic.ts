/**
 * @file load-atomic.ts
 * @description FMEA Atomic DB 로드 로직 (GET handler에서 추출)
 *
 * route.ts의 GET handler에서 비즈니스 로직만 분리한 모듈.
 * DB 조회 → FMEAWorksheetDB DTO 변환 담당.
 */
import type { FMEAWorksheetDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';
import { pickLegacyFcProcessCharId } from '@/app/(fmea-core)/pfmea/worksheet/atomicToLegacyAdapter';

/**
 * Atomic DB에서 전체 FMEA 데이터를 로드하여 FMEAWorksheetDB DTO로 변환
 */
export async function loadAtomicData(
  prisma: any,
  fmeaId: string,
): Promise<FMEAWorksheetDB | null> {
  // failureAnalysis는 별도 처리 (테이블이 없을 수 있음)
  let failureAnalyses: any[] = [];
  try {
    failureAnalyses = await prisma.failureAnalysis.findMany({
      where: { fmeaId },
      orderBy: { order: 'asc' },
    });
  } catch (e: any) {
    if (e?.code !== 'P2021' && !e?.message?.includes('does not exist')) {
      // 예상 외 에러만 경고
    }
  }

  const [
    l1Structure, l2Structures, l3Structures,
    l1Functions, l2Functions, l3Functions,
    failureEffects, failureModes, failureCauses,
    failureLinks, riskAnalyses, optimizations,
    processProductChars, confirmedState,
  ] = await Promise.all([
    prisma.l1Structure.findFirst({ where: { fmeaId } }),
    prisma.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    prisma.l3Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    prisma.l1Function.findMany({ where: { fmeaId } }),
    prisma.l2Function.findMany({ where: { fmeaId } }),
    prisma.l3Function.findMany({ where: { fmeaId } }),
    prisma.failureEffect.findMany({ where: { fmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId } }),
    prisma.failureCause.findMany({ where: { fmeaId } }),
    prisma.failureLink.findMany({
      where: { fmeaId, deletedAt: null },
      include: { failureMode: { select: { l2StructId: true, l2Structure: { select: { no: true, name: true } } } } },
    }),
    prisma.riskAnalysis.findMany({ where: { fmeaId } }),
    prisma.optimization.findMany({ where: { fmeaId } }),
    prisma.processProductChar.findMany({ where: { fmeaId }, orderBy: { orderIndex: 'asc' } }),
    prisma.fmeaConfirmedState.findUnique({ where: { fmeaId } }).catch(() => null),
  ]);

  // FC.processCharId 오염 방어
  const validL3FuncIds = new Set<string>(l3Functions.map((f: { id: string }) => f.id));

  // 데이터가 없으면 null 반환
  if (!l1Structure && l2Structures.length === 0) {
    return null;
  }

  // FMEAWorksheetDB DTO 변환
  const db: FMEAWorksheetDB = {
    fmeaId,
    savedAt: l1Structure?.updatedAt.toISOString() || new Date().toISOString(),
    l1Structure: l1Structure ? {
      id: l1Structure.id,
      fmeaId: l1Structure.fmeaId,
      name: l1Structure.name,
      confirmed: l1Structure.confirmed ?? false,
      createdAt: l1Structure.createdAt.toISOString(),
      updatedAt: l1Structure.updatedAt.toISOString(),
    } : null,
    l2Structures: l2Structures.map((l2: any) => ({
      id: l2.id, fmeaId: l2.fmeaId, l1Id: l2.l1Id, no: l2.no,
      name: l2.name, order: l2.order,
      createdAt: l2.createdAt.toISOString(), updatedAt: l2.updatedAt.toISOString(),
    })),
    l3Structures: l3Structures.map((l3: any) => ({
      id: l3.id, fmeaId: l3.fmeaId, l1Id: l3.l1Id, l2Id: l3.l2Id,
      m4: (l3.m4 as any) || '', name: l3.name, order: l3.order,
      createdAt: l3.createdAt.toISOString(), updatedAt: l3.updatedAt.toISOString(),
    })),
    l1Functions: l1Functions.map((f: any) => ({
      id: f.id, fmeaId: f.fmeaId, l1StructId: f.l1StructId,
      category: f.category as any, functionName: f.functionName, requirement: f.requirement,
      createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString(),
    })),
    l2Functions: l2Functions.map((f: any) => ({
      id: f.id, fmeaId: f.fmeaId, l2StructId: f.l2StructId,
      functionName: f.functionName, productChar: f.productChar,
      specialChar: f.specialChar || undefined,
      createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString(),
    })),
    l3Functions: l3Functions.map((f: any) => ({
      id: f.id, fmeaId: f.fmeaId, l3StructId: f.l3StructId, l2StructId: f.l2StructId,
      functionName: f.functionName, processChar: f.processChar,
      specialChar: f.specialChar || undefined,
      createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString(),
    })),
    processProductChars: processProductChars.map((pc: any) => ({
      id: pc.id, fmeaId: pc.fmeaId, l2StructId: pc.l2StructId,
      name: pc.name, specialChar: pc.specialChar || undefined,
      orderIndex: pc.orderIndex ?? 0,
      createdAt: pc.createdAt.toISOString(), updatedAt: pc.updatedAt.toISOString(),
    })),
    failureEffects: failureEffects.map((fe: any) => ({
      id: fe.id, fmeaId: fe.fmeaId, l1FuncId: fe.l1FuncId,
      category: fe.category as any, effect: fe.effect, severity: fe.severity,
      createdAt: fe.createdAt.toISOString(), updatedAt: fe.updatedAt.toISOString(),
    })),
    failureModes: failureModes.map((fm: any) => ({
      id: fm.id, fmeaId: fm.fmeaId, l2FuncId: fm.l2FuncId, l2StructId: fm.l2StructId,
      productCharId: fm.productCharId || undefined, mode: fm.mode,
      specialChar: fm.specialChar ?? false,
      createdAt: fm.createdAt.toISOString(), updatedAt: fm.updatedAt.toISOString(),
    })),
    failureCauses: failureCauses.map((fc: any) => {
      const pc = pickLegacyFcProcessCharId(
        { l3FuncId: fc.l3FuncId, processCharId: fc.processCharId },
        validL3FuncIds,
      );
      return {
        id: fc.id, fmeaId: fc.fmeaId, l3FuncId: fc.l3FuncId,
        l3StructId: fc.l3StructId, l2StructId: fc.l2StructId,
        processCharId: pc || undefined, cause: fc.cause,
        occurrence: fc.occurrence || undefined,
        createdAt: fc.createdAt.toISOString(), updatedAt: fc.updatedAt.toISOString(),
      };
    }),
    failureLinks: failureLinks.map((link: any) => ({
      id: link.id, fmeaId: link.fmeaId, fmId: link.fmId, feId: link.feId, fcId: link.fcId,
      fmText: link.fmText || '', feText: link.feText || '', fcText: link.fcText || '',
      fmProcessNo: link.failureMode?.l2Structure?.no || '',
      fmProcess: link.failureMode?.l2Structure?.name || link.fmProcess || '',
      feScope: link.feScope || '', fcM4: link.fcM4 || '', fcWorkElem: link.fcWorkElem || '',
      severity: link.severity || 0, feSeverity: link.severity || 0,
      fmSeq: link.fmSeq ?? undefined, feSeq: link.feSeq ?? undefined, fcSeq: link.fcSeq ?? undefined,
      fmPath: link.fmPath || undefined, fePath: link.fePath || undefined, fcPath: link.fcPath || undefined,
      createdAt: link.createdAt.toISOString(), updatedAt: link.updatedAt.toISOString(),
    })),
    failureAnalyses: (failureAnalyses || []).map((fa: any) => ({
      id: fa.id, fmeaId: fa.fmeaId, linkId: fa.linkId,
      fmId: fa.fmId, fmText: fa.fmText, fmProcessName: fa.fmProcessName,
      feId: fa.feId, feText: fa.feText, feCategory: fa.feCategory, feSeverity: fa.feSeverity,
      fcId: fa.fcId, fcText: fa.fcText, fcOccurrence: fa.fcOccurrence || undefined,
      fcWorkElementName: fa.fcWorkElementName, fcM4: fa.fcM4 || undefined,
      l1FuncId: fa.l1FuncId, l1Category: fa.l1Category, l1FuncName: fa.l1FuncName, l1Requirement: fa.l1Requirement,
      l2FuncId: fa.l2FuncId, l2FuncName: fa.l2FuncName, l2ProductChar: fa.l2ProductChar, l2SpecialChar: fa.l2SpecialChar || undefined,
      l3FuncId: fa.l3FuncId, l3FuncName: fa.l3FuncName, l3ProcessChar: fa.l3ProcessChar, l3SpecialChar: fa.l3SpecialChar || undefined,
      l1StructId: fa.l1StructId, l1StructName: fa.l1StructName,
      l2StructId: fa.l2StructId, l2StructNo: fa.l2StructNo, l2StructName: fa.l2StructName,
      l3StructId: fa.l3StructId, l3StructM4: fa.l3StructM4 || undefined, l3StructName: fa.l3StructName,
      order: fa.order, confirmed: fa.confirmed,
      createdAt: fa.createdAt.toISOString(), updatedAt: fa.updatedAt.toISOString(),
    })),
    riskAnalyses: riskAnalyses.map((risk: any) => ({
      id: risk.id, fmeaId: risk.fmeaId, linkId: risk.linkId,
      severity: risk.severity, occurrence: risk.occurrence, detection: risk.detection,
      ap: risk.ap as any,
      preventionControl: risk.preventionControl || undefined,
      detectionControl: risk.detectionControl || undefined,
      lldReference: risk.lldReference || undefined,
      createdAt: risk.createdAt.toISOString(), updatedAt: risk.updatedAt.toISOString(),
    })),
    optimizations: optimizations.map((opt: any) => ({
      id: opt.id, fmeaId: opt.fmeaId, riskId: opt.riskId,
      recommendedAction: opt.recommendedAction, responsible: opt.responsible, targetDate: opt.targetDate,
      newSeverity: opt.newSeverity || undefined, newOccurrence: opt.newOccurrence || undefined,
      newDetection: opt.newDetection || undefined, newAP: opt.newAP as any || undefined,
      status: opt.status as any, completedDate: opt.completedDate || undefined,
      remarks: opt.remarks || undefined, detectionAction: opt.detectionAction || undefined,
      lldOptReference: opt.lldOptReference || undefined,
      createdAt: opt.createdAt.toISOString(), updatedAt: opt.updatedAt.toISOString(),
    })),
    confirmed: {
      structure: confirmedState?.structureConfirmed ?? l1Structure?.confirmed ?? false,
      l1Function: confirmedState?.l1FunctionConfirmed ?? false,
      l2Function: confirmedState?.l2FunctionConfirmed ?? false,
      l3Function: confirmedState?.l3FunctionConfirmed ?? false,
      l1Failure: confirmedState?.failureL1Confirmed ?? false,
      l2Failure: confirmedState?.failureL2Confirmed ?? false,
      l3Failure: confirmedState?.failureL3Confirmed ?? false,
      failureLink: confirmedState?.failureLinkConfirmed ?? false,
      risk: confirmedState?.riskConfirmed ?? false,
      optimization: confirmedState?.optimizationConfirmed ?? false,
    },
  };

  return db;
}
