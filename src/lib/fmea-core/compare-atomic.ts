/**
 * @status CODEFREEZE L4 (Pipeline Protection) u{1F512}
 * @freeze_level L4 (Critical - DFMEA Pre-Development Snapshot)
 * @frozen_date 2026-03-30
 * @snapshot_tag codefreeze-v5.0-pre-dfmea-20260330
 * @allowed_changes NONE ???ъ슜??紐낆떆???뱀씤 + full test pass ?꾩닔
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 */
/**
 * @file compare-atomic.ts
 * 역설계 Import 시스템 — Phase 2: 원본↔결과 비교 로직
 * 설계서: docs/REVERSE_ENGINEERING_IMPORT_SYSTEM.md §9.1 V01~V08
 */

import type { PrismaClient } from '@prisma/client';
import type { FullAtomicDB } from './guards';
import { reverseExtract } from './reverse-extract';

export interface CompareResult {
  allMatch: boolean;
  checks: CompareCheck[];
}

export interface CompareCheck {
  entity: string;
  sourceCount: number;
  targetCount: number;
  match: boolean;
  details?: string;
}

/** 두 FullAtomicDB 간 수량 비교 (V04) */
export function compareAtomicDBCounts(
  source: FullAtomicDB,
  target: FullAtomicDB
): CompareResult {
  const checks: CompareCheck[] = [];

  const pairs: [string, any[], any[]][] = [
    ['L2Structure', source.l2Structures, target.l2Structures],
    ['L3Structure', source.l3Structures, target.l3Structures],
    ['L1Function', source.l1Functions, target.l1Functions],
    ['L2Function', source.l2Functions, target.l2Functions],
    ['L3Function', source.l3Functions, target.l3Functions],
    ['ProcessProductChar', source.processProductChars, target.processProductChars],
    ['FailureEffect', source.failureEffects, target.failureEffects],
    ['FailureMode', source.failureModes, target.failureModes],
    ['FailureCause', source.failureCauses, target.failureCauses],
    ['FailureLink', source.failureLinks, target.failureLinks],
    ['RiskAnalysis', source.riskAnalyses, target.riskAnalyses],
  ];

  for (const [entity, src, tgt] of pairs) {
    checks.push({
      entity,
      sourceCount: src.length,
      targetCount: tgt.length,
      match: src.length === tgt.length,
    });
  }

  return {
    allMatch: checks.every(c => c.match),
    checks,
  };
}

/** UUID 일치 검증: 원본 ID 집합 ⊆ 대상 ID 집합 (fmeaId는 다르므로 제외) */
export function compareAtomicDBIds(
  source: FullAtomicDB,
  target: FullAtomicDB
): CompareResult {
  const checks: CompareCheck[] = [];

  const idPairs: [string, any[], any[]][] = [
    ['L2Structure', source.l2Structures, target.l2Structures],
    ['L3Structure', source.l3Structures, target.l3Structures],
    ['L1Function', source.l1Functions, target.l1Functions],
    ['L2Function', source.l2Functions, target.l2Functions],
    ['L3Function', source.l3Functions, target.l3Functions],
    ['FailureEffect', source.failureEffects, target.failureEffects],
    ['FailureMode', source.failureModes, target.failureModes],
    ['FailureCause', source.failureCauses, target.failureCauses],
    ['FailureLink', source.failureLinks, target.failureLinks],
  ];

  for (const [entity, src, tgt] of idPairs) {
    const srcIds = new Set(src.map((r: any) => r.id));
    const tgtIds = new Set(tgt.map((r: any) => r.id));
    const missing = [...srcIds].filter(id => !tgtIds.has(id));
    const extra = [...tgtIds].filter(id => !srcIds.has(id));

    checks.push({
      entity,
      sourceCount: srcIds.size,
      targetCount: tgtIds.size,
      match: missing.length === 0 && extra.length === 0,
      details: missing.length > 0 || extra.length > 0
        ? `missing=${missing.length} extra=${extra.length}`
        : undefined,
    });
  }

  return {
    allMatch: checks.every(c => c.match),
    checks,
  };
}

/** FK 참조 무결성 검증 (V02) */
export function verifyFKIntegrity(data: FullAtomicDB): CompareResult {
  const checks: CompareCheck[] = [];
  const fmeaId = data.fmeaId;

  // L2Structure.l1Id → L1Structure
  const l1Id = data.l1Structure?.id;
  if (l1Id) {
    const broken = data.l2Structures.filter((s: any) => s.l1Id !== l1Id);
    checks.push({
      entity: 'L2.l1Id → L1',
      sourceCount: data.l2Structures.length,
      targetCount: data.l2Structures.length - broken.length,
      match: broken.length === 0,
      details: broken.length > 0 ? `orphan=${broken.length}` : undefined,
    });
  }

  // L3Structure.l2Id → L2Structure
  const l2Ids = new Set(data.l2Structures.map((s: any) => s.id));
  const l3OrphanL2 = data.l3Structures.filter((s: any) => !l2Ids.has(s.l2Id));
  checks.push({
    entity: 'L3.l2Id → L2',
    sourceCount: data.l3Structures.length,
    targetCount: data.l3Structures.length - l3OrphanL2.length,
    match: l3OrphanL2.length === 0,
  });

  // FailureLink FK
  const fmIds = new Set(data.failureModes.map((m: any) => m.id));
  const feIds = new Set(data.failureEffects.map((e: any) => e.id));
  const fcIds = new Set(data.failureCauses.map((c: any) => c.id));

  let brokenFM = 0, brokenFE = 0, brokenFC = 0;
  for (const link of data.failureLinks) {
    if (!fmIds.has(link.fmId)) brokenFM++;
    if (!feIds.has(link.feId)) brokenFE++;
    if (!fcIds.has(link.fcId)) brokenFC++;
  }
  checks.push({
    entity: 'FL.fmId → FM',
    sourceCount: data.failureLinks.length,
    targetCount: data.failureLinks.length - brokenFM,
    match: brokenFM === 0,
  });
  checks.push({
    entity: 'FL.feId → FE',
    sourceCount: data.failureLinks.length,
    targetCount: data.failureLinks.length - brokenFE,
    match: brokenFE === 0,
  });
  checks.push({
    entity: 'FL.fcId → FC',
    sourceCount: data.failureLinks.length,
    targetCount: data.failureLinks.length - brokenFC,
    match: brokenFC === 0,
  });

  // RiskAnalysis.linkId → FailureLink
  const flIds = new Set(data.failureLinks.map((l: any) => l.id));
  const raOrphan = data.riskAnalyses.filter((r: any) => !flIds.has(r.linkId));
  checks.push({
    entity: 'RA.linkId → FL',
    sourceCount: data.riskAnalyses.length,
    targetCount: data.riskAnalyses.length - raOrphan.length,
    match: raOrphan.length === 0,
  });

  // orphanPC: L3Function without FailureCause
  const fcL3FuncIds = new Set(data.failureCauses.map((c: any) => c.l3FuncId));
  const orphanPC = data.l3Functions.filter((f: any) => !fcL3FuncIds.has(f.id));
  checks.push({
    entity: 'orphanPC (FC없는 L3F)',
    sourceCount: data.l3Functions.length,
    targetCount: orphanPC.length,
    match: orphanPC.length === 0,
    details: orphanPC.length > 0 ? `${orphanPC.length}건` : undefined,
  });

  // processCharId = l3FuncId (V08)
  const pcMismatch = data.failureCauses.filter(
    (c: any) => c.l3FuncId && c.processCharId && c.processCharId !== c.l3FuncId
  );
  checks.push({
    entity: 'FC.processCharId=l3FuncId',
    sourceCount: data.failureCauses.length,
    targetCount: pcMismatch.length,
    match: pcMismatch.length === 0,
    details: pcMismatch.length > 0 ? `mismatch=${pcMismatch.length}` : undefined,
  });

  return {
    allMatch: checks.every(c => c.match),
    checks,
  };
}

/** DB에서 두 프로젝트를 로드하여 전체 비교 수행 */
export async function compareProjects(
  sourcePrisma: PrismaClient,
  sourceFmeaId: string,
  targetPrisma: PrismaClient,
  targetFmeaId: string
): Promise<{
  counts: CompareResult;
  ids: CompareResult;
  sourceFk: CompareResult;
  targetFk: CompareResult;
}> {
  const sourceData = await reverseExtract(sourcePrisma, sourceFmeaId);
  const targetData = await reverseExtract(targetPrisma, targetFmeaId);

  return {
    counts: compareAtomicDBCounts(sourceData, targetData),
    ids: compareAtomicDBIds(sourceData, targetData),
    sourceFk: verifyFKIntegrity(sourceData),
    targetFk: verifyFKIntegrity(targetData),
  };
}
