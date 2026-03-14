/**
 * @file fcComparison.ts
 * @description FC(고장사슬) 비교/검증 유틸
 * - 자동도출 chains vs 기존(DB/Excel) chains 비교
 * - SOD 완전성 검증, AP 정확성 검증
 * @created 2026-02-21
 */

import type { MasterFailureChain } from '../types/masterFailureChain';
import { calculateAP } from '../types/masterFailureChain';

// ─── 타입 ───

export interface FCMatchEntry {
  derived: MasterFailureChain;
  existing: MasterFailureChain;
  sodMatch: boolean;
}

export interface FCComparisonResult {
  matched: FCMatchEntry[];
  missing: MasterFailureChain[];      // 자동도출에 있는데 기존FC에 없음
  extra: MasterFailureChain[];        // 기존FC에 있는데 자동도출에 없음
  incomplete: MasterFailureChain[];   // SOD 누락 체인 (매칭된 것 중)
  apMismatch: { chain: MasterFailureChain; expected: string; actual: string }[];
  stats: {
    matchRate: number;        // 매칭률 (%)
    completenessRate: number; // SOD 완전성률 (%)
    total: number;
  };
}

export interface FCCompletenessResult {
  isComplete: boolean;
  incompleteCount: number;
  details: string[];
}

// ─── 유틸 ───

/** 비교용 정규화 (공백/대소문자 무시) */
function normalize(s: string | undefined): string {
  return (s || '').trim().toLowerCase();
}

/** 정확 비교 키: processNo + fmValue + fcValue */
function chainKey(c: MasterFailureChain): string {
  return `${c.processNo}|${normalize(c.fmValue)}|${normalize(c.fcValue)}`;
}

/** 완화 비교 키: processNo + fcValue (FM 무시 — SA 자동도출의 FM 할당 오류 대응) */
function chainKeyRelaxed(c: MasterFailureChain): string {
  return `${c.processNo}|${normalize(c.fcValue)}`;
}

/** SOD 완전 여부 */
function hasCompleteSOD(c: MasterFailureChain): boolean {
  return (
    typeof c.severity === 'number' && c.severity > 0 &&
    typeof c.occurrence === 'number' && c.occurrence > 0 &&
    typeof c.detection === 'number' && c.detection > 0
  );
}

// ─── 비교 함수 ───

/**
 * 자동도출 chains vs 기존 chains 비교
 * @param derived  - buildFailureChainsFromFlat()으로 자동 도출된 체인
 * @param existing - DB 또는 Excel에서 가져온 기존 체인
 */
export function compareFCChains(
  derived: MasterFailureChain[],
  existing: MasterFailureChain[],
): FCComparisonResult {
  const matched: FCMatchEntry[] = [];
  const missing: MasterFailureChain[] = [];
  const incomplete: MasterFailureChain[] = [];
  const apMismatch: { chain: MasterFailureChain; expected: string; actual: string }[] = [];

  // ★ v5.9: fcValue 빈 derived chain 제외 — FM만 있고 B4 원인 미식별된 스텁은 매칭 대상 아님
  // 원인: buildFailureChainsFromFlat에서 A5/B4 excelRow가 다른 시트 기준이라 행 기반 매칭 오류 발생
  const effectiveDerived = derived.filter(d => normalize(d.fcValue) !== '');

  // 기존 체인을 키로 인덱싱 (정확 + 완화)
  const existingExactMap = new Map<string, MasterFailureChain>();
  // ★ CRITICAL-3: relaxed map을 배열로 변경 — 동일 processNo+FC에 여러 FM 모두 보존
  const existingRelaxedMap = new Map<string, MasterFailureChain[]>();
  for (const e of existing) {
    existingExactMap.set(chainKey(e), e);
    const rKey = chainKeyRelaxed(e);
    const arr = existingRelaxedMap.get(rKey) || [];
    arr.push(e);
    existingRelaxedMap.set(rKey, arr);
  }

  // derived → existing 매칭 (2단계: 정확 → 완화)
  const matchedExactKeys = new Set<string>();
  const matchedRelaxedKeys = new Set<string>();

  for (const d of effectiveDerived) {
    const exactKey = chainKey(d);
    const relaxedKey = chainKeyRelaxed(d);

    // 1단계: 정확 매칭 (processNo + FM + FC)
    let e = existingExactMap.get(exactKey);
    // 2단계: 완화 매칭 — 동일 processNo+FC의 기존 체인 중 미매칭된 첫 번째 선택
    if (!e) {
      const candidates = existingRelaxedMap.get(relaxedKey) || [];
      e = candidates.find(c => !matchedExactKeys.has(chainKey(c))) || undefined;
    }

    if (e) {
      const sodMatch = hasCompleteSOD(e);
      matched.push({ derived: d, existing: e, sodMatch });
      matchedExactKeys.add(chainKey(e));
      matchedRelaxedKeys.add(chainKeyRelaxed(e));

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

  // extra: 기존에 있지만 자동도출에 없는 것 (정확+완화 모두 미매칭)
  const extra: MasterFailureChain[] = [];
  for (const e of existing) {
    if (!matchedExactKeys.has(chainKey(e)) && !matchedRelaxedKeys.has(chainKeyRelaxed(e))) {
      extra.push(e);
    }
  }

  // 통계 — effectiveDerived 기준 (빈 fcValue 스텁 제외)
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

// ─── 완전성 검증 ───

/**
 * 체인 리스트의 SOD 완전성 검증
 * @param chains - 검증 대상 체인
 */
export function validateFCCompleteness(chains: MasterFailureChain[]): FCCompletenessResult {
  const details: string[] = [];

  for (const c of chains) {
    if (!hasCompleteSOD(c)) {
      const missing: string[] = [];
      if (!c.severity || c.severity <= 0) missing.push('S');
      if (!c.occurrence || c.occurrence <= 0) missing.push('O');
      if (!c.detection || c.detection <= 0) missing.push('D');
      details.push(`[${c.processNo}] ${c.fcValue} — ${missing.join(',')} 누락`);
    }
  }

  return {
    isComplete: details.length === 0,
    incompleteCount: details.length,
    details,
  };
}
