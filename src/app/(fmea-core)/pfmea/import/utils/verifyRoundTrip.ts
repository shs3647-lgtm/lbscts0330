/**
 * @file verifyRoundTrip.ts
 * @description 라운드트립 검증: DB → flatData+chains → buildWorksheetState → 비교
 *
 * 비유: "같은 레시피로 다시 요리한 결과가 원본과 동일한지 맛 비교하는 심사위원".
 * 원본 DB의 uid ID를 genXxx ID로 재매핑(idRemap)한 후 비교한다.
 *
 * @created 2026-03-17
 */

import type {
  FMEAWorksheetDB,
} from '@/app/(fmea-core)/pfmea/worksheet/schema';
import type {
  WorksheetState,
} from '@/app/(fmea-core)/pfmea/worksheet/constants';
import type { IdRemapTable } from './atomicToFlatData';

// ─── 결과 타입 ───

export interface RoundTripResult {
  success: boolean;
  matchRate: {
    l2Structure: number;
    l3Structure: number;
    failureModes: number;
    failureCauses: number;
    failureEffects: number;
    failureLinks: number;
  };
  summary: string;
  mismatches: Array<{
    entity: string;
    expected: string;
    actual: string;
  }>;
}

// ─── 메인 함수 ───

/**
 * 원본 Atomic DB와 재구성된 WorksheetState를 비교.
 * idRemap을 사용하여 원본 uid ID를 genXxx ID로 변환 후 비교.
 */
export function verifyRoundTrip(
  originalDB: FMEAWorksheetDB,
  rebuiltState: WorksheetState,
  idRemap?: IdRemapTable,
): RoundTripResult {
  const mismatches: RoundTripResult['mismatches'] = [];

  // ─── L2 Structure (공정) 비교 — 내용 기반 (processNo) ───
  const originalL2Set = new Set(
    originalDB.l2Structures.map(s => idRemap?.l2.get(s.id) || s.id)
  );
  const rebuiltL2Set = new Set((rebuiltState.l2 || []).map(p => p.id));
  const l2Match = computeSetMatch(originalL2Set, rebuiltL2Set, 'L2Structure', mismatches);

  // ─── L3 Structure (작업요소) 비교 ───
  const originalL3Set = new Set(
    originalDB.l3Structures.map(s => idRemap?.l3.get(s.id) || s.id)
  );
  const rebuiltL3Set = new Set<string>();
  for (const proc of (rebuiltState.l2 || [])) {
    for (const we of (proc.l3 || [])) {
      rebuiltL3Set.add(we.id);
    }
  }
  const l3Match = computeSetMatch(originalL3Set, rebuiltL3Set, 'L3Structure', mismatches);

  // ─── FailureMode (고장형태) 비교 ───
  const originalFmSet = new Set(
    originalDB.failureModes.map(fm => idRemap?.fm.get(fm.id) || fm.id)
  );
  const rebuiltFmSet = new Set<string>();
  for (const proc of (rebuiltState.l2 || [])) {
    for (const fm of (proc.failureModes || [])) {
      rebuiltFmSet.add(fm.id);
    }
  }
  const fmMatch = computeSetMatch(originalFmSet, rebuiltFmSet, 'FailureMode', mismatches);

  // ─── FailureCause (고장원인) 비교 ───
  const originalFcSet = new Set(
    originalDB.failureCauses.map(fc => idRemap?.fc.get(fc.id) || fc.id)
  );
  const rebuiltFcSet = new Set<string>();
  for (const proc of (rebuiltState.l2 || [])) {
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) rebuiltFcSet.add(fc.id);
    }
    for (const fc of (proc.failureCauses || [])) rebuiltFcSet.add(fc.id);
  }
  const fcMatch = computeSetMatch(originalFcSet, rebuiltFcSet, 'FailureCause', mismatches);

  // ─── FailureEffect (고장영향) 비교 ───
  const originalFeSet = new Set(
    originalDB.failureEffects.map(fe => idRemap?.fe.get(fe.id) || fe.id)
  );
  const rebuiltFeSet = new Set<string>();
  for (const fe of (rebuiltState.l1?.failureScopes || [])) {
    rebuiltFeSet.add(fe.id);
  }
  const feMatch = computeSetMatch(originalFeSet, rebuiltFeSet, 'FailureEffect', mismatches);

  // ─── FailureLink (고장연결) 비교 ───
  // 원본 link의 (fmId, feId, fcId)를 genXxx로 재매핑하여 비교
  const originalLinkSet = new Set(
    originalDB.failureLinks.map(l => {
      const fmNew = idRemap?.fm.get(l.fmId) || l.fmId;
      const feNew = idRemap?.fe.get(l.feId) || l.feId;
      const fcNew = idRemap?.fc.get(l.fcId) || l.fcId;
      return `${fmNew}|${feNew}|${fcNew}`;
    })
  );
  const rebuiltLinkSet = new Set<string>();
  const rebuiltLinks = (rebuiltState as { failureLinks?: Array<{ fmId: string; feId: string; fcId: string }> }).failureLinks || [];
  for (const link of rebuiltLinks) {
    rebuiltLinkSet.add(`${link.fmId}|${link.feId}|${link.fcId}`);
  }
  const linkMatch = computeSetMatch(originalLinkSet, rebuiltLinkSet, 'FailureLink', mismatches);

  // ─── 결과 산출 ───
  const matchRate = {
    l2Structure: l2Match,
    l3Structure: l3Match,
    failureModes: fmMatch,
    failureCauses: fcMatch,
    failureEffects: feMatch,
    failureLinks: linkMatch,
  };

  const allRates = Object.values(matchRate);
  const avgRate = allRates.length > 0
    ? allRates.reduce((sum, r) => sum + r, 0) / allRates.length
    : 0;

  const success = avgRate >= 0.90;

  const summary = [
    `L2=${(l2Match * 100).toFixed(0)}%`,
    `L3=${(l3Match * 100).toFixed(0)}%`,
    `FM=${(fmMatch * 100).toFixed(0)}%`,
    `FC=${(fcMatch * 100).toFixed(0)}%`,
    `FE=${(feMatch * 100).toFixed(0)}%`,
    `Links=${(linkMatch * 100).toFixed(0)}%`,
    `평균=${(avgRate * 100).toFixed(1)}%`,
  ].join(' | ');

  return {
    success,
    matchRate,
    summary,
    mismatches: mismatches.slice(0, 20),
  };
}

// ─── 집합 비교 헬퍼 ───

function computeSetMatch(
  expected: Set<string>,
  actual: Set<string>,
  entityName: string,
  mismatches: RoundTripResult['mismatches'],
): number {
  if (expected.size === 0 && actual.size === 0) return 1.0;
  if (expected.size === 0) return 0.0;

  let matched = 0;
  for (const id of expected) {
    if (actual.has(id)) {
      matched++;
    } else {
      mismatches.push({ entity: entityName, expected: id, actual: '(missing)' });
    }
  }

  for (const id of actual) {
    if (!expected.has(id)) {
      mismatches.push({ entity: entityName, expected: '(none)', actual: id });
    }
  }

  return matched / expected.size;
}
