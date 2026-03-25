/**
 * @file fcComparison.ts
 * @description FC(고장사슬) 비교/검증 유틸
 *
 * 매칭 우선순위 (Rule 1.7):
 * - 플랜A: feId+fmId+fcId 전부 확정
 * - 플랜B: fmId+fcId (레거시 호환)
 * - 플랜B2: flatId (feFlat+fmFlat+fcFlat 또는 fmFlat+fcFlat)
 * - 플랜C: **FK 없을 때만** — KrIndustry 시드 fmKeyword/fcKeyword 동시 히트 시에만 동일 앵커
 *
 * 자유 텍스트(processNo+fm+fc) 1:1 매칭·커버리지 매칭 제거.
 */

import type { MasterFailureChain } from '../types/masterFailureChain';
import { calculateAP } from '../types/masterFailureChain';
import {
  type IndustryAnchorIndex,
  getDefaultIndustryAnchorIndex,
  industryPlanCChainKey,
} from '@/lib/fmea/industry-plan-c-anchor';

// ─── 타입 ───

export interface FCMatchEntry {
  derived: MasterFailureChain;
  existing: MasterFailureChain;
  sodMatch: boolean;
}

/** FE 매칭 통계 (assignChainUUIDs 3단계 결과 집계) */
export interface FEMatchStats {
  total: number;
  matched: number;
  chainsWithFeId: number;
  chainsTotal: number;
  method: {
    text: number;
    fmGroup: number;
    scope: number;
    carry: number;
  };
}

export interface FCComparisonOptions {
  /**
   * 플랜C(산업DB 앵커) 인덱스.
   * - undefined: 기본 시드(`kr-industry-seed-rows`) 기반 인덱스
   * - null: 플랜C 비활성 (FK 없는 행은 매칭 실패)
   */
  industryAnchors?: IndustryAnchorIndex | null;
}

export interface FCComparisonResult {
  matched: FCMatchEntry[];
  missing: MasterFailureChain[];
  extra: MasterFailureChain[];
  incomplete: MasterFailureChain[];
  apMismatch: { chain: MasterFailureChain; expected: string; actual: string }[];
  stats: {
    matchRate: number;
    completenessRate: number;
    total: number;
  };
  feStats?: FEMatchStats;
}

export interface FCCompletenessResult {
  isComplete: boolean;
  incompleteCount: number;
  details: string[];
}

function normalize(s: string | undefined): string {
  return (s || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function hasCompleteSOD(c: MasterFailureChain): boolean {
  return (
    typeof c.severity === 'number' && c.severity > 0 &&
    typeof c.occurrence === 'number' && c.occurrence > 0 &&
    typeof c.detection === 'number' && c.detection > 0
  );
}

/** 플랜A/B/B2 단일 문자열 키 */
function primaryChainKey(c: MasterFailureChain): string | null {
  const fe = (c.feId || '').trim();
  const fm = (c.fmId || '').trim();
  const fc = (c.fcId || '').trim();
  if (fe && fm && fc) return `fk3:${fe}|${fm}|${fc}`;
  if (fm && fc) return `fk2:${fm}|${fc}`;
  const ff = (c.feFlatId || '').trim();
  const fmf = (c.fmFlatId || '').trim();
  const fcf = (c.fcFlatId || '').trim();
  if (ff && fmf && fcf) return `flt3:${ff}|${fmf}|${fcf}`;
  if (fmf && fcf) return `flt2:${fmf}|${fcf}`;
  return null;
}

// ─── 비교 함수 ───

export function compareFCChains(
  derived: MasterFailureChain[],
  existing: MasterFailureChain[],
  options?: FCComparisonOptions,
): FCComparisonResult {
  const matched: FCMatchEntry[] = [];
  const missing: MasterFailureChain[] = [];
  const incomplete: MasterFailureChain[] = [];
  const apMismatch: { chain: MasterFailureChain; expected: string; actual: string }[] = [];

  const anchors: IndustryAnchorIndex | null =
    options?.industryAnchors === undefined
      ? getDefaultIndustryAnchorIndex()
      : options.industryAnchors;

  const effectiveDerived = derived.filter(d => normalize(d.fcValue) !== '');

  const existingByPrimary = new Map<string, MasterFailureChain>();
  for (const e of existing) {
    const pk = primaryChainKey(e);
    if (pk && !existingByPrimary.has(pk)) existingByPrimary.set(pk, e);
  }

  type PlanCBucket = { list: MasterFailureChain[]; consumed: number };
  const planCBuckets = new Map<string, PlanCBucket>();
  if (anchors) {
    for (const e of existing) {
      const ik = industryPlanCChainKey(e, anchors);
      if (!ik) continue;
      if (!planCBuckets.has(ik)) planCBuckets.set(ik, { list: [], consumed: 0 });
      planCBuckets.get(ik)!.list.push(e);
    }
  }

  const matchedExistingIds = new Set<string>();

  for (const d of effectiveDerived) {
    let e: MasterFailureChain | undefined;

    const pk = primaryChainKey(d);
    if (pk) {
      e = existingByPrimary.get(pk);
    }

    if (!e && anchors) {
      const ik = industryPlanCChainKey(d, anchors);
      if (ik) {
        const bucket = planCBuckets.get(ik);
        if (bucket && bucket.consumed < bucket.list.length) {
          e = bucket.list[bucket.consumed];
          bucket.consumed++;
        }
      }
    }

    if (e) {
      const sodMatch = hasCompleteSOD(e);
      matched.push({ derived: d, existing: e, sodMatch });
      matchedExistingIds.add(e.id);

      if (!hasCompleteSOD(e)) {
        incomplete.push(e);
      }

      if (hasCompleteSOD(e) && e.ap) {
        const expectedAP = calculateAP(e.severity!, e.occurrence!, e.detection!);
        if (e.ap !== expectedAP) {
          apMismatch.push({ chain: e, expected: expectedAP, actual: e.ap });
        }
      }
    } else {
      missing.push(d);
    }
  }

  const extra = existing.filter(ex => !matchedExistingIds.has(ex.id));

  const total = effectiveDerived.length;
  const matchRate = total > 0 ? Math.round((matched.length / total) * 100) : 0;
  const withSOD = existing.filter(hasCompleteSOD).length;
  const completenessRate = existing.length > 0 ? Math.round((withSOD / existing.length) * 100) : 0;

  return {
    matched,
    missing,
    extra,
    incomplete,
    apMismatch,
    stats: { matchRate, completenessRate, total },
  };
}

export function validateFCCompleteness(chains: MasterFailureChain[]): FCCompletenessResult {
  const details: string[] = [];

  for (const c of chains) {
    if (!hasCompleteSOD(c)) {
      const missingFields: string[] = [];
      if (!c.severity || c.severity <= 0) missingFields.push('S');
      if (!c.occurrence || c.occurrence <= 0) missingFields.push('O');
      if (!c.detection || c.detection <= 0) missingFields.push('D');
      details.push(`[${c.processNo}] ${c.fcValue} — ${missingFields.join(',')} 누락`);
    }
  }

  return {
    isComplete: details.length === 0,
    incompleteCount: details.length,
    details,
  };
}

export function computeFEMatchStats(
  chains: MasterFailureChain[],
  totalFEs: number,
  methodCounts?: { text: number; fmGroup: number; scope: number; carry: number },
): FEMatchStats {
  const chainsWithFeId = chains.filter(c => !!c.feId);
  const uniqueFeIds = new Set(chainsWithFeId.map(c => c.feId!));

  return {
    total: totalFEs,
    matched: uniqueFeIds.size,
    chainsWithFeId: chainsWithFeId.length,
    chainsTotal: chains.length,
    method: methodCounts ?? { text: 0, fmGroup: 0, scope: 0, carry: 0 },
  };
}
