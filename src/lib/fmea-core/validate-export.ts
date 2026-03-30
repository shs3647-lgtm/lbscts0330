/**
 * @status CODEFREEZE L4 (Pipeline Protection) u{1F512}
 * @freeze_level L4 (Critical - DFMEA Pre-Development Snapshot)
 * @frozen_date 2026-03-30
 * @snapshot_tag codefreeze-v5.0-pre-dfmea-20260330
 * @allowed_changes NONE ???ъ슜??紐낆떆???뱀씤 + full test pass ?꾩닔
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 */
/**
 * @file validate-export.ts
 * @description Pre-export integrity validation for FMEA Atomic DB.
 *
 * Runs 7 structural checks before export-master writes the master JSON:
 *   1. FailureLink FK validity (fmId/fcId/feId all non-null and referencing existing records)
 *   2. RiskAnalysis FK validity (failureLinkId references existing FailureLink)
 *   3. No orphan L3Functions (every L3Function has a parent L3Structure)
 *   4. No orphan FailureCauses (every FC has a parent L3Function via l3FunctionId)
 *   5. DC/PC null check in RiskAnalysis (warn-level, not blocking)
 *   6. FailureLink count matches RiskAnalysis count (1:1 relationship)
 *   7. No duplicate UUIDs in any Atomic DB table
 *
 * Usage:
 *   const report = await validateBeforeExport(prisma, fmeaId);
 *   if (!report.valid) { // block export or warn user }
 */

// ══════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════

export interface ExportValidationCheck {
  /** Human-readable check name */
  name: string;
  /** PASS = ok, FAIL = blocking error, WARN = non-blocking warning */
  status: 'PASS' | 'FAIL' | 'WARN';
  /** Relevant count (e.g. number of broken FKs, orphan records, etc.) */
  count: number;
  /** Descriptive message for logs / UI */
  message: string;
}

export interface ExportValidationReport {
  /** true only if zero FAIL checks */
  valid: boolean;
  /** The fmeaId that was validated */
  fmeaId: string;
  /** Individual check results */
  checks: ExportValidationCheck[];
}

// ══════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════

/** Build a Set of IDs from an array of records that have an `id` field. */
function idSet(records: Array<{ id: string }>): Set<string> {
  return new Set(records.map(r => r.id));
}

/** Find duplicate IDs in an array of records. Returns the duplicated IDs. */
function findDuplicateIds(records: Array<{ id: string }>): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const r of records) {
    if (seen.has(r.id)) {
      dupes.add(r.id);
    }
    seen.add(r.id);
  }
  return [...dupes];
}

// ══════════════════════════════════════════════════════
// Main validation function
// ══════════════════════════════════════════════════════

/**
 * Run all pre-export integrity checks against the project's Atomic DB.
 *
 * @param prisma - Prisma client scoped to the project schema
 *                 (obtained via `getPrismaForSchema(schema)`)
 * @param fmeaId - The FMEA project identifier (e.g. "pfm26-m002")
 * @returns An ExportValidationReport summarising all checks
 */
export async function validateBeforeExport(
  prisma: any,
  fmeaId: string,
): Promise<ExportValidationReport> {
  const checks: ExportValidationCheck[] = [];

  // ── Load all relevant tables in parallel ──
  const [
    failureLinks,
    riskAnalyses,
    failureModes,
    failureCauses,
    failureEffects,
    l3Structures,
    l3Functions,
    l2Structures,
    l2Functions,
    l1Functions,
  ] = await Promise.all([
    prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true, fmId: true, fcId: true, feId: true } }),
    prisma.riskAnalysis.findMany({ where: { fmeaId }, select: { id: true, failureLinkId: true, detectionControl: true, preventionControl: true } }),
    prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, l3FunctionId: true } }),
    prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true, l3StructureId: true } }),
    prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.l2Function.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.l1Function.findMany({ where: { fmeaId }, select: { id: true } }),
  ]);

  const fmIdSet = idSet(failureModes);
  const fcIdSet = idSet(failureCauses);
  const feIdSet = idSet(failureEffects);
  const flIdSet = idSet(failureLinks);
  const l3StructIdSet = idSet(l3Structures);
  const l3FuncIdSet = idSet(l3Functions);

  // ────────────────────────────────────────────────────
  // Check 1: FailureLink FK validity
  // Every FL must have non-null fmId/fcId/feId pointing to existing records
  // ────────────────────────────────────────────────────
  {
    let brokenCount = 0;
    const details: string[] = [];

    for (const fl of failureLinks) {
      const broken: string[] = [];
      if (!fl.fmId || !fmIdSet.has(fl.fmId)) broken.push(`fmId=${fl.fmId ?? 'null'}`);
      if (!fl.fcId || !fcIdSet.has(fl.fcId)) broken.push(`fcId=${fl.fcId ?? 'null'}`);
      if (!fl.feId || !feIdSet.has(fl.feId)) broken.push(`feId=${fl.feId ?? 'null'}`);
      if (broken.length > 0) {
        brokenCount++;
        if (details.length < 5) {
          details.push(`FL[${fl.id}]: ${broken.join(', ')}`);
        }
      }
    }

    checks.push({
      name: 'FailureLink FK validity',
      status: brokenCount === 0 ? 'PASS' : 'FAIL',
      count: brokenCount,
      message: brokenCount === 0
        ? `All ${failureLinks.length} FailureLinks have valid fmId/fcId/feId`
        : `${brokenCount} FailureLink(s) have broken FK references. ${details.join('; ')}`,
    });
  }

  // ────────────────────────────────────────────────────
  // Check 2: RiskAnalysis FK validity
  // Every RA must reference an existing FailureLink
  // ────────────────────────────────────────────────────
  {
    let brokenCount = 0;
    for (const ra of riskAnalyses) {
      if (!ra.failureLinkId || !flIdSet.has(ra.failureLinkId)) {
        brokenCount++;
      }
    }

    checks.push({
      name: 'RiskAnalysis failureLinkId validity',
      status: brokenCount === 0 ? 'PASS' : 'FAIL',
      count: brokenCount,
      message: brokenCount === 0
        ? `All ${riskAnalyses.length} RiskAnalysis records reference valid FailureLinks`
        : `${brokenCount} RiskAnalysis record(s) reference non-existent FailureLink`,
    });
  }

  // ────────────────────────────────────────────────────
  // Check 3: No orphan L3Functions
  // Every L3Function must have a parent L3Structure that exists
  // ────────────────────────────────────────────────────
  {
    let orphanCount = 0;
    for (const l3f of l3Functions) {
      if (!l3f.l3StructureId || !l3StructIdSet.has(l3f.l3StructureId)) {
        orphanCount++;
      }
    }

    checks.push({
      name: 'Orphan L3Functions',
      status: orphanCount === 0 ? 'PASS' : 'FAIL',
      count: orphanCount,
      message: orphanCount === 0
        ? `All ${l3Functions.length} L3Functions have valid parent L3Structure`
        : `${orphanCount} L3Function(s) have no valid parent L3Structure`,
    });
  }

  // ────────────────────────────────────────────────────
  // Check 4: No orphan FailureCauses
  // Every FC must reference an existing L3Function via l3FunctionId
  // ────────────────────────────────────────────────────
  {
    let orphanCount = 0;
    for (const fc of failureCauses) {
      if (!fc.l3FunctionId || !l3FuncIdSet.has(fc.l3FunctionId)) {
        orphanCount++;
      }
    }

    checks.push({
      name: 'Orphan FailureCauses',
      status: orphanCount === 0 ? 'PASS' : 'FAIL',
      count: orphanCount,
      message: orphanCount === 0
        ? `All ${failureCauses.length} FailureCauses have valid parent L3Function`
        : `${orphanCount} FailureCause(s) have no valid parent L3Function`,
    });
  }

  // ────────────────────────────────────────────────────
  // Check 5: DC/PC not null in RiskAnalysis (warn level)
  // ────────────────────────────────────────────────────
  {
    let nullDcCount = 0;
    let nullPcCount = 0;
    for (const ra of riskAnalyses) {
      if (!ra.detectionControl || ra.detectionControl.trim() === '') nullDcCount++;
      if (!ra.preventionControl || ra.preventionControl.trim() === '') nullPcCount++;
    }

    const totalNull = nullDcCount + nullPcCount;
    checks.push({
      name: 'RiskAnalysis DC/PC completeness',
      status: totalNull === 0 ? 'PASS' : 'WARN',
      count: totalNull,
      message: totalNull === 0
        ? `All ${riskAnalyses.length} RiskAnalysis records have DC and PC values`
        : `DC null: ${nullDcCount}, PC null: ${nullPcCount} out of ${riskAnalyses.length} RiskAnalysis records`,
    });
  }

  // ────────────────────────────────────────────────────
  // Check 6: FailureLink count matches RiskAnalysis count (1:1)
  // ────────────────────────────────────────────────────
  {
    const flCount = failureLinks.length;
    const raCount = riskAnalyses.length;
    const diff = Math.abs(flCount - raCount);

    checks.push({
      name: 'FailureLink-RiskAnalysis 1:1 match',
      status: diff === 0 ? 'PASS' : 'FAIL',
      count: diff,
      message: diff === 0
        ? `FailureLink (${flCount}) and RiskAnalysis (${raCount}) counts match`
        : `Count mismatch: FailureLink=${flCount}, RiskAnalysis=${raCount} (diff=${diff})`,
    });
  }

  // ────────────────────────────────────────────────────
  // Check 7: No duplicate UUIDs in any Atomic DB table
  // ────────────────────────────────────────────────────
  {
    const tablesToCheck: Array<{ name: string; records: Array<{ id: string }> }> = [
      { name: 'L2Structure', records: l2Structures },
      { name: 'L3Structure', records: l3Structures },
      { name: 'L1Function', records: l1Functions },
      { name: 'L2Function', records: l2Functions },
      { name: 'L3Function', records: l3Functions },
      { name: 'FailureMode', records: failureModes },
      { name: 'FailureEffect', records: failureEffects },
      { name: 'FailureCause', records: failureCauses },
      { name: 'FailureLink', records: failureLinks },
      { name: 'RiskAnalysis', records: riskAnalyses },
    ];

    let totalDupes = 0;
    const dupeDetails: string[] = [];

    for (const { name, records } of tablesToCheck) {
      const dupes = findDuplicateIds(records);
      if (dupes.length > 0) {
        totalDupes += dupes.length;
        dupeDetails.push(`${name}: ${dupes.length} duplicate(s)`);
      }
    }

    checks.push({
      name: 'Duplicate UUID check',
      status: totalDupes === 0 ? 'PASS' : 'FAIL',
      count: totalDupes,
      message: totalDupes === 0
        ? 'No duplicate UUIDs found across 10 Atomic DB tables'
        : `Duplicate UUIDs found: ${dupeDetails.join(', ')}`,
    });
  }

  // ── Build final report ──
  const hasFailure = checks.some(c => c.status === 'FAIL');

  return {
    valid: !hasFailure,
    fmeaId,
    checks,
  };
}
