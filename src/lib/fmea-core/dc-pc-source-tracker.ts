/**
 * DC/PC Source Tracker — FK-based source traceability for Detection/Prevention Controls
 *
 * Replaces plain text dcSourceId/pcSourceId strings with validated FK references.
 * Ensures Living DB integrity by tracking where each DC/PC value came from.
 *
 * CODEFREEZE — Rule 1.7 UUID/FK 설계 원칙 준수
 */

export type SourceType = 'manual' | 'master' | 'industry' | 'lld' | 'keyword';

export interface SourceReference {
  sourceType: SourceType;
  sourceId: string;
  sourceTable: string;
  value: string;
  defaultRating?: number;
}

export interface DcPcValidationResult {
  valid: boolean;
  orphanDcSources: Array<{ riskAnalysisId: string; dcSourceId: string; dcSourceType: string }>;
  orphanPcSources: Array<{ riskAnalysisId: string; pcSourceId: string; pcSourceType: string }>;
  missingDcValues: Array<{ riskAnalysisId: string; failureLinkId: string }>;
  missingPcValues: Array<{ riskAnalysisId: string; failureLinkId: string }>;
}

const SOURCE_TABLE_MAP: Record<SourceType, string> = {
  manual: '',
  master: 'master_fmea_reference',
  industry: 'kr_industry_detection', // or kr_industry_prevention — resolved per DC/PC context
  lld: 'lld_filter_code',
  keyword: '',
};

/**
 * Get the source table name for a given sourceType.
 * For 'industry', defaults to detection table — caller should use context to pick prevention.
 */
export function getSourceTable(sourceType: SourceType): string {
  return SOURCE_TABLE_MAP[sourceType] ?? '';
}

/**
 * Resolve a source reference to verify it exists in the corresponding table.
 * Returns null if sourceType is 'manual'/'keyword' (no FK to validate) or if entity not found.
 */
export async function resolveSourceReference(
  prisma: any,
  sourceType: SourceType,
  sourceId: string
): Promise<SourceReference | null> {
  if (!sourceId || !sourceType) return null;

  // manual and keyword have no backing table — always valid if sourceId is set
  if (sourceType === 'manual' || sourceType === 'keyword') {
    return null;
  }

  try {
    if (sourceType === 'master') {
      const row = await prisma.masterFmeaReference.findUnique({ where: { id: sourceId } });
      if (!row) return null;
      return {
        sourceType,
        sourceId,
        sourceTable: 'master_fmea_reference',
        value: row.detectionControl ?? row.preventionControl ?? '',
        defaultRating: undefined,
      };
    }

    if (sourceType === 'industry') {
      // Try detection first, then prevention
      const dc = await prisma.krIndustryDetection.findUnique({ where: { id: sourceId } }).catch(() => null);
      if (dc) {
        return {
          sourceType,
          sourceId,
          sourceTable: 'kr_industry_detection',
          value: dc.method ?? dc.name ?? '',
          defaultRating: dc.defaultRating ?? undefined,
        };
      }
      const pc = await prisma.krIndustryPrevention.findUnique({ where: { id: sourceId } }).catch(() => null);
      if (pc) {
        return {
          sourceType,
          sourceId,
          sourceTable: 'kr_industry_prevention',
          value: pc.method ?? pc.name ?? '',
          defaultRating: pc.defaultRating ?? undefined,
        };
      }
      return null;
    }

    if (sourceType === 'lld') {
      const row = await prisma.lldFilterCode.findUnique({ where: { id: sourceId } }).catch(() => null);
      if (!row) {
        // fallback to lessonsLearned
        const ll = await prisma.lessonsLearned.findUnique({ where: { id: sourceId } }).catch(() => null);
        if (!ll) return null;
        return {
          sourceType,
          sourceId,
          sourceTable: 'lessons_learned',
          value: ll.description ?? ll.title ?? '',
        };
      }
      return {
        sourceType,
        sourceId,
        sourceTable: 'lld_filter_code',
        value: row.description ?? row.filterName ?? '',
      };
    }
  } catch (err) {
    console.error(`[dc-pc-source-tracker] resolveSourceReference error: sourceType=${sourceType}, sourceId=${sourceId}`, err);
  }

  return null;
}

/**
 * Validate all DC/PC source references for a given fmeaId.
 * Checks that every dcSourceId/pcSourceId in risk_analyses points to a real entity.
 * Also finds RiskAnalysis rows missing DC/PC values entirely.
 */
export async function validateDcPcSources(
  prisma: any,
  fmeaId: string
): Promise<DcPcValidationResult> {
  const result: DcPcValidationResult = {
    valid: true,
    orphanDcSources: [],
    orphanPcSources: [],
    missingDcValues: [],
    missingPcValues: [],
  };

  // Load all RiskAnalysis rows for this fmeaId (via FailureLink → fmeaId)
  const riskAnalyses: Array<{
    id: string;
    failureLinkId: string;
    detectionControl: string | null;
    preventionControl: string | null;
    dcSourceType: string | null;
    dcSourceId: string | null;
    pcSourceType: string | null;
    pcSourceId: string | null;
  }> = await prisma.riskAnalysis.findMany({
    where: { failureLink: { fmeaId } },
    select: {
      id: true,
      failureLinkId: true,
      detectionControl: true,
      preventionControl: true,
      dcSourceType: true,
      dcSourceId: true,
      pcSourceType: true,
      pcSourceId: true,
    },
  });

  for (const ra of riskAnalyses) {
    // Check DC
    const dcVal = ra.detectionControl?.trim();
    if (!dcVal) {
      result.missingDcValues.push({ riskAnalysisId: ra.id, failureLinkId: ra.failureLinkId });
      result.valid = false;
    }

    if (ra.dcSourceType && ra.dcSourceId && ra.dcSourceType !== 'manual' && ra.dcSourceType !== 'keyword') {
      const ref = await resolveSourceReference(prisma, ra.dcSourceType as SourceType, ra.dcSourceId);
      if (!ref) {
        result.orphanDcSources.push({
          riskAnalysisId: ra.id,
          dcSourceId: ra.dcSourceId,
          dcSourceType: ra.dcSourceType,
        });
        result.valid = false;
      }
    }

    // Check PC
    const pcVal = ra.preventionControl?.trim();
    if (!pcVal) {
      result.missingPcValues.push({ riskAnalysisId: ra.id, failureLinkId: ra.failureLinkId });
      result.valid = false;
    }

    if (ra.pcSourceType && ra.pcSourceId && ra.pcSourceType !== 'manual' && ra.pcSourceType !== 'keyword') {
      const ref = await resolveSourceReference(prisma, ra.pcSourceType as SourceType, ra.pcSourceId);
      if (!ref) {
        result.orphanPcSources.push({
          riskAnalysisId: ra.id,
          pcSourceId: ra.pcSourceId,
          pcSourceType: ra.pcSourceType,
        });
        result.valid = false;
      }
    }
  }

  return result;
}

/**
 * Update DC (Detection Control) with a validated source reference.
 */
export async function updateDcWithSource(
  prisma: any,
  riskAnalysisId: string,
  dc: { value: string; sourceType: SourceType; sourceId: string; rating?: number }
): Promise<void> {
  if (!riskAnalysisId) {
    console.error('[dc-pc-source-tracker] updateDcWithSource: missing riskAnalysisId');
    return;
  }

  // Validate source exists (skip for manual/keyword)
  if (dc.sourceType !== 'manual' && dc.sourceType !== 'keyword' && dc.sourceId) {
    const ref = await resolveSourceReference(prisma, dc.sourceType, dc.sourceId);
    if (!ref) {
      console.error(
        `[dc-pc-source-tracker] updateDcWithSource: source not found — type=${dc.sourceType}, id=${dc.sourceId}`
      );
      return;
    }
  }

  const updateData: Record<string, any> = {
    detectionControl: dc.value,
    dcSourceType: dc.sourceType,
    dcSourceId: dc.sourceId,
  };

  if (typeof dc.rating === 'number' && dc.rating >= 1 && dc.rating <= 10) {
    updateData.detection = dc.rating;
  }

  await prisma.riskAnalysis.update({
    where: { id: riskAnalysisId },
    data: updateData,
  });
}

/**
 * Update PC (Prevention Control) with a validated source reference.
 */
export async function updatePcWithSource(
  prisma: any,
  riskAnalysisId: string,
  pc: { value: string; sourceType: SourceType; sourceId: string; rating?: number }
): Promise<void> {
  if (!riskAnalysisId) {
    console.error('[dc-pc-source-tracker] updatePcWithSource: missing riskAnalysisId');
    return;
  }

  // Validate source exists (skip for manual/keyword)
  if (pc.sourceType !== 'manual' && pc.sourceType !== 'keyword' && pc.sourceId) {
    const ref = await resolveSourceReference(prisma, pc.sourceType, pc.sourceId);
    if (!ref) {
      console.error(
        `[dc-pc-source-tracker] updatePcWithSource: source not found — type=${pc.sourceType}, id=${pc.sourceId}`
      );
      return;
    }
  }

  const updateData: Record<string, any> = {
    preventionControl: pc.value,
    pcSourceType: pc.sourceType,
    pcSourceId: pc.sourceId,
  };

  if (typeof pc.rating === 'number' && pc.rating >= 1 && pc.rating <= 10) {
    updateData.occurrence = pc.rating;
  }

  await prisma.riskAnalysis.update({
    where: { id: riskAnalysisId },
    data: updateData,
  });
}
