/**
 * Atomic Risk Map — Direct Atomic DB access for risk data
 *
 * Replaces the legacy riskData dictionary pattern:
 *   OLD: riskData['risk-fmId-fcId-S'] → number
 *   NEW: riskMap.get(failureLinkId)?.severity → number
 *
 * This is the foundation for eliminating atomicToLegacy() dependency.
 * All lookups are Map.get() based (Rule 1.7 — ID-only FK matching).
 *
 * CODEFREEZE — Rule 0 DB 중앙 아키텍처 준수
 */

export interface AtomicRiskEntry {
  failureLinkId: string;
  fmId: string;
  fcId: string;
  feId: string;

  // SOD
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  ap: string;

  // Controls
  detectionControl: string;
  preventionControl: string;
  dcSourceType?: string;
  dcSourceId?: string;
  pcSourceType?: string;
  pcSourceId?: string;

  // Special Character
  specialChar?: string;

  // Optimization
  optRecommendedAction?: string;
  optResponsible?: string;
  optTargetDate?: string;
  optNewSeverity?: number;
  optNewOccurrence?: number;
  optNewDetection?: number;
  optNewRpn?: number;
  optNewAp?: string;

  // LLD
  lldReference?: string;
  lldApplyResult?: string;

  // Process context
  processNo: string;
  m4?: string;
}

export type AtomicRiskMap = Map<string, AtomicRiskEntry>;

// ── Internal index types ──

/** Secondary index: fmId|fcId → failureLinkId */
type FmFcIndex = Map<string, string>;

/** Secondary index: fmId → failureLinkId[] */
type FmIndex = Map<string, string[]>;

/** Secondary index: processNo → failureLinkId[] */
type ProcessIndex = Map<string, string[]>;

// Module-level secondary indexes (rebuilt with each buildAtomicRiskMap call)
let _fmFcIndex: FmFcIndex = new Map();
let _fmIndex: FmIndex = new Map();
let _processIndex: ProcessIndex = new Map();

// ── Helpers ──

function safeStr(v: any): string {
  if (v == null) return '';
  return String(v).trim();
}

function safeNum(v: any, fallback = 0): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function computeRpn(s: number, o: number, d: number): number {
  return s * o * d;
}

function computeAp(s: number, o: number, d: number): string {
  const rpn = s * o * d;
  if (s >= 9 || rpn >= 200) return 'H';
  if (rpn >= 80) return 'M';
  return 'L';
}

// ── Build ──

/**
 * Build an AtomicRiskMap from Atomic DB entities.
 *
 * Cross-references: FailureLink → RiskAnalysis → Optimization
 * Resolves processNo by: FM → l2StructureId → L2Structure.processNo
 *
 * All inputs are plain arrays (Prisma query results).
 */
export function buildAtomicRiskMap(
  failureLinks: any[],
  riskAnalyses: any[],
  optimizations: any[],
  failureModes: any[],
  failureCauses: any[],
  failureEffects: any[],
  l2Structures: any[]
): AtomicRiskMap {
  const riskMap: AtomicRiskMap = new Map();

  // Reset secondary indexes
  _fmFcIndex = new Map();
  _fmIndex = new Map();
  _processIndex = new Map();

  // Build lookup maps — all Map.get() based (Rule 1.7)
  const raByFlId = new Map<string, any>();
  for (const ra of riskAnalyses) {
    if (ra.failureLinkId) {
      raByFlId.set(ra.failureLinkId, ra);
    }
  }

  const optByFlId = new Map<string, any>();
  for (const opt of optimizations) {
    const flId = opt.failureLinkId ?? opt.failureAnalysisId;
    if (flId) {
      optByFlId.set(flId, opt);
    }
  }

  const fmById = new Map<string, any>();
  for (const fm of failureModes) {
    if (fm.id) fmById.set(fm.id, fm);
  }

  const fcById = new Map<string, any>();
  for (const fc of failureCauses) {
    if (fc.id) fcById.set(fc.id, fc);
  }

  const feById = new Map<string, any>();
  for (const fe of failureEffects) {
    if (fe.id) feById.set(fe.id, fe);
  }

  const l2ById = new Map<string, any>();
  for (const l2 of l2Structures) {
    if (l2.id) l2ById.set(l2.id, l2);
  }

  // Build entries from FailureLinks
  for (const fl of failureLinks) {
    if (!fl.id || !fl.fmId || !fl.fcId || !fl.feId) continue;

    const ra = raByFlId.get(fl.id);
    const opt = optByFlId.get(fl.id);
    const fm = fmById.get(fl.fmId);

    // Resolve processNo: FM → l2StructureId → L2Structure
    let processNo = '';
    let m4 = '';
    if (fm) {
      const l2 = l2ById.get(fm.l2StructureId);
      if (l2) {
        processNo = safeStr(l2.processNo ?? l2.stepNo ?? l2.no);
        m4 = safeStr(l2.name);
      }
    }

    const severity = safeNum(ra?.severity, 0);
    const occurrence = safeNum(ra?.occurrence, 0);
    const detection = safeNum(ra?.detection, 0);
    const rpn = severity && occurrence && detection ? computeRpn(severity, occurrence, detection) : 0;
    const ap = severity && occurrence && detection ? computeAp(severity, occurrence, detection) : '';

    const optNewS = safeNum(opt?.newSeverity ?? opt?.optNewSeverity, 0);
    const optNewO = safeNum(opt?.newOccurrence ?? opt?.optNewOccurrence, 0);
    const optNewD = safeNum(opt?.newDetection ?? opt?.optNewDetection, 0);

    const entry: AtomicRiskEntry = {
      failureLinkId: fl.id,
      fmId: fl.fmId,
      fcId: fl.fcId,
      feId: fl.feId,

      severity,
      occurrence,
      detection,
      rpn,
      ap,

      detectionControl: safeStr(ra?.detectionControl),
      preventionControl: safeStr(ra?.preventionControl),
      dcSourceType: safeStr(ra?.dcSourceType) || undefined,
      dcSourceId: safeStr(ra?.dcSourceId) || undefined,
      pcSourceType: safeStr(ra?.pcSourceType) || undefined,
      pcSourceId: safeStr(ra?.pcSourceId) || undefined,

      specialChar: safeStr(ra?.specialChar) || undefined,

      optRecommendedAction: safeStr(opt?.recommendedAction ?? opt?.optRecommendedAction) || undefined,
      optResponsible: safeStr(opt?.responsible ?? opt?.optResponsible) || undefined,
      optTargetDate: safeStr(opt?.targetDate ?? opt?.optTargetDate) || undefined,
      optNewSeverity: optNewS || undefined,
      optNewOccurrence: optNewO || undefined,
      optNewDetection: optNewD || undefined,
      optNewRpn: optNewS && optNewO && optNewD ? computeRpn(optNewS, optNewO, optNewD) : undefined,
      optNewAp: optNewS && optNewO && optNewD ? computeAp(optNewS, optNewO, optNewD) : undefined,

      lldReference: safeStr(opt?.lldReference ?? ra?.lldReference) || undefined,
      lldApplyResult: safeStr(opt?.lldApplyResult ?? ra?.lldApplyResult) || undefined,

      processNo,
      m4: m4 || undefined,
    };

    riskMap.set(fl.id, entry);

    // Build secondary indexes
    const fmFcKey = `${fl.fmId}|${fl.fcId}`;
    _fmFcIndex.set(fmFcKey, fl.id);

    const fmList = _fmIndex.get(fl.fmId) ?? [];
    fmList.push(fl.id);
    _fmIndex.set(fl.fmId, fmList);

    if (processNo) {
      const pList = _processIndex.get(processNo) ?? [];
      pList.push(fl.id);
      _processIndex.set(processNo, pList);
    }
  }

  return riskMap;
}

// ── Lookup helpers ──

/**
 * Find risk entry by FM + FC pair.
 * Uses secondary index (fmId|fcId → failureLinkId).
 */
export function getRiskByFmFc(
  riskMap: AtomicRiskMap,
  fmId: string,
  fcId: string
): AtomicRiskEntry | undefined {
  const key = `${fmId}|${fcId}`;
  const flId = _fmFcIndex.get(key);
  if (!flId) return undefined;
  return riskMap.get(flId);
}

/**
 * Get all risk entries for a given FM.
 */
export function getRisksByFm(
  riskMap: AtomicRiskMap,
  fmId: string
): AtomicRiskEntry[] {
  const flIds = _fmIndex.get(fmId);
  if (!flIds) return [];
  const results: AtomicRiskEntry[] = [];
  for (const flId of flIds) {
    const entry = riskMap.get(flId);
    if (entry) results.push(entry);
  }
  return results;
}

/**
 * Get all risk entries for a given processNo.
 */
export function getRisksByProcess(
  riskMap: AtomicRiskMap,
  processNo: string
): AtomicRiskEntry[] {
  const flIds = _processIndex.get(processNo);
  if (!flIds) return [];
  const results: AtomicRiskEntry[] = [];
  for (const flId of flIds) {
    const entry = riskMap.get(flId);
    if (entry) results.push(entry);
  }
  return results;
}

// ── Migration helpers ──

/**
 * Convert legacy riskData dictionary to AtomicRiskMap.
 *
 * Legacy keys follow patterns like:
 *   risk-{fmId}-{fcId}-S  → severity
 *   risk-{fmId}-{fcId}-O  → occurrence
 *   risk-{fmId}-{fcId}-D  → detection
 *   detection-{fmId}-{fcId} → detectionControl text
 *   prevention-{fmId}-{fcId} → preventionControl text
 *   specialChar-{fmId}-{fcId} → special character
 *
 * Requires failureLinks to resolve failureLinkId and feId.
 */
export function legacyRiskDataToAtomicMap(
  riskData: Record<string, any>,
  failureLinks: any[]
): AtomicRiskMap {
  const riskMap: AtomicRiskMap = new Map();
  _fmFcIndex = new Map();
  _fmIndex = new Map();
  _processIndex = new Map();

  if (!riskData || typeof riskData !== 'object') return riskMap;

  // Build FL lookup: fmId|fcId → FL
  const flByFmFc = new Map<string, any>();
  for (const fl of failureLinks) {
    if (fl.fmId && fl.fcId) {
      const key = `${fl.fmId}|${fl.fcId}`;
      // Keep first occurrence (deterministic — Rule 1.7)
      if (!flByFmFc.has(key)) {
        flByFmFc.set(key, fl);
      }
    }
  }

  // Extract unique fmId-fcId pairs from riskData keys
  const pairSet = new Set<string>();
  const riskKeyPattern = /^risk-(.+?)-(.+?)-(S|O|D)$/;
  const detKeyPattern = /^detection-(.+?)-(.+?)$/;
  const prevKeyPattern = /^prevention-(.+?)-(.+?)$/;

  for (const key of Object.keys(riskData)) {
    let match = key.match(riskKeyPattern);
    if (match) {
      pairSet.add(`${match[1]}|${match[2]}`);
      continue;
    }
    match = key.match(detKeyPattern);
    if (match) {
      pairSet.add(`${match[1]}|${match[2]}`);
      continue;
    }
    match = key.match(prevKeyPattern);
    if (match) {
      pairSet.add(`${match[1]}|${match[2]}`);
    }
  }

  for (const pair of pairSet) {
    const [fmId, fcId] = pair.split('|');
    if (!fmId || !fcId) continue;

    const fl = flByFmFc.get(pair);
    const flId = fl?.id ?? `legacy-${fmId}-${fcId}`;
    const feId = fl?.feId ?? '';

    const severity = safeNum(riskData[`risk-${fmId}-${fcId}-S`]);
    const occurrence = safeNum(riskData[`risk-${fmId}-${fcId}-O`]);
    const detection = safeNum(riskData[`risk-${fmId}-${fcId}-D`]);
    const rpn = severity && occurrence && detection ? computeRpn(severity, occurrence, detection) : 0;
    const ap = severity && occurrence && detection ? computeAp(severity, occurrence, detection) : '';

    const entry: AtomicRiskEntry = {
      failureLinkId: flId,
      fmId,
      fcId,
      feId,

      severity,
      occurrence,
      detection,
      rpn,
      ap,

      detectionControl: safeStr(riskData[`detection-${fmId}-${fcId}`]),
      preventionControl: safeStr(riskData[`prevention-${fmId}-${fcId}`]),

      specialChar: safeStr(riskData[`specialChar-${fmId}-${fcId}`]) || undefined,

      optRecommendedAction: safeStr(riskData[`opt-action-${fmId}-${fcId}`]) || undefined,
      optResponsible: safeStr(riskData[`opt-responsible-${fmId}-${fcId}`]) || undefined,
      optTargetDate: safeStr(riskData[`opt-targetDate-${fmId}-${fcId}`]) || undefined,
      optNewSeverity: safeNum(riskData[`opt-newS-${fmId}-${fcId}`]) || undefined,
      optNewOccurrence: safeNum(riskData[`opt-newO-${fmId}-${fcId}`]) || undefined,
      optNewDetection: safeNum(riskData[`opt-newD-${fmId}-${fcId}`]) || undefined,
      optNewRpn: undefined,
      optNewAp: undefined,

      lldReference: safeStr(riskData[`lld-ref-${fmId}-${fcId}`]) || undefined,
      lldApplyResult: safeStr(riskData[`lld-result-${fmId}-${fcId}`]) || undefined,

      processNo: '',
      m4: undefined,
    };

    // Compute opt RPN/AP if all three opt SOD present
    if (entry.optNewSeverity && entry.optNewOccurrence && entry.optNewDetection) {
      entry.optNewRpn = computeRpn(entry.optNewSeverity, entry.optNewOccurrence, entry.optNewDetection);
      entry.optNewAp = computeAp(entry.optNewSeverity, entry.optNewOccurrence, entry.optNewDetection);
    }

    riskMap.set(flId, entry);

    // Build secondary indexes
    _fmFcIndex.set(pair, flId);
    const fmList = _fmIndex.get(fmId) ?? [];
    fmList.push(flId);
    _fmIndex.set(fmId, fmList);
  }

  return riskMap;
}

/**
 * Convert AtomicRiskMap back to legacy riskData dictionary.
 * Used for backwards compatibility during gradual migration.
 */
export function atomicMapToLegacyRiskData(riskMap: AtomicRiskMap): Record<string, any> {
  const riskData: Record<string, any> = {};

  for (const entry of riskMap.values()) {
    const { fmId, fcId } = entry;
    if (!fmId || !fcId) continue;

    const prefix = `${fmId}-${fcId}`;

    // SOD
    if (entry.severity) riskData[`risk-${prefix}-S`] = entry.severity;
    if (entry.occurrence) riskData[`risk-${prefix}-O`] = entry.occurrence;
    if (entry.detection) riskData[`risk-${prefix}-D`] = entry.detection;

    // Controls
    if (entry.detectionControl) riskData[`detection-${prefix}`] = entry.detectionControl;
    if (entry.preventionControl) riskData[`prevention-${prefix}`] = entry.preventionControl;

    // Special char
    if (entry.specialChar) riskData[`specialChar-${prefix}`] = entry.specialChar;

    // Optimization
    if (entry.optRecommendedAction) riskData[`opt-action-${prefix}`] = entry.optRecommendedAction;
    if (entry.optResponsible) riskData[`opt-responsible-${prefix}`] = entry.optResponsible;
    if (entry.optTargetDate) riskData[`opt-targetDate-${prefix}`] = entry.optTargetDate;
    if (entry.optNewSeverity) riskData[`opt-newS-${prefix}`] = entry.optNewSeverity;
    if (entry.optNewOccurrence) riskData[`opt-newO-${prefix}`] = entry.optNewOccurrence;
    if (entry.optNewDetection) riskData[`opt-newD-${prefix}`] = entry.optNewDetection;

    // LLD
    if (entry.lldReference) riskData[`lld-ref-${prefix}`] = entry.lldReference;
    if (entry.lldApplyResult) riskData[`lld-result-${prefix}`] = entry.lldApplyResult;

    // Lesson/detection opt keys (6ST compatibility)
    if (entry.lldReference) riskData[`lesson-opt-${prefix}`] = entry.lldReference;
    if (entry.detectionControl) riskData[`detection-opt-${prefix}`] = entry.detectionControl;
  }

  return riskData;
}
