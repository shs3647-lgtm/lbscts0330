/**
 * @file fcComparison.ts
 * @description FC(고장사슬) 비교/검증 유틸
 *
 * ★★★ 2026-03-15: UUID FK 기반 비교로 전환 ★★★
 * - 텍스트 기반 chainKey 매칭 삭제
 * - chain.fmId / chain.fcId UUID FK로 직접 비교
 * - UUID 미할당 시 processNo + fmValue + fcValue 정규화 키로 fallback
 *
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
    matchRate: number;
    completenessRate: number;
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

/** processNo 정규화 */
function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  const lower = n.toLowerCase();
  if (lower === '0' || lower === '공통공정' || lower === '공통') return '00';
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  if (n !== '0' && n !== '00') n = n.replace(/^0+(?=\d)/, '');
  return n;
}

/** UUID 기반 비교 키 (우선) */
function chainKeyByUUID(c: MasterFailureChain): string | null {
  if (c.fmId && c.fcId) return `uuid:${c.fmId}|${c.fcId}`;
  return null;
}

/** 텍스트 fallback 비교 키 (UUID 미할당 시) */
function chainKeyByText(c: MasterFailureChain): string {
  return `${normalizeProcessNo(c.processNo)}|${normalize(c.fmValue)}|${normalize(c.fcValue)}`;
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
 * ★★★ UUID FK 기반 비교 ★★★
 *
 * 1순위: fmId+fcId UUID 키로 매칭
 * 2순위: processNo+fmValue+fcValue 정규화 키로 매칭 (UUID 미할당 시)
 */
export function compareFCChains(
  derived: MasterFailureChain[],
  existing: MasterFailureChain[],
): FCComparisonResult {
  const matched: FCMatchEntry[] = [];
  const missing: MasterFailureChain[] = [];
  const incomplete: MasterFailureChain[] = [];
  const apMismatch: { chain: MasterFailureChain; expected: string; actual: string }[] = [];

  // fcValue 빈 derived 제외
  const effectiveDerived = derived.filter(d => normalize(d.fcValue) !== '');

  // existing 인덱싱 (UUID 키 + 텍스트 키)
  const existingByUUID = new Map<string, MasterFailureChain>();
  const existingByText = new Map<string, MasterFailureChain>();
  for (const e of existing) {
    const uuidKey = chainKeyByUUID(e);
    if (uuidKey && !existingByUUID.has(uuidKey)) existingByUUID.set(uuidKey, e);
    const textKey = chainKeyByText(e);
    if (!existingByText.has(textKey)) existingByText.set(textKey, e);
  }

  const matchedKeys = new Set<string>();

  for (const d of effectiveDerived) {
    let e: MasterFailureChain | undefined;
    let matchKey = '';

    // 1순위: UUID FK 매칭
    const dUuidKey = chainKeyByUUID(d);
    if (dUuidKey) {
      e = existingByUUID.get(dUuidKey);
      if (e) matchKey = dUuidKey;
    }

    // 2순위: 텍스트 fallback
    if (!e) {
      const dTextKey = chainKeyByText(d);
      e = existingByText.get(dTextKey);
      if (e && !matchedKeys.has(chainKeyByText(e))) {
        matchKey = chainKeyByText(e);
      } else {
        e = undefined;
      }
    }

    if (e) {
      const sodMatch = hasCompleteSOD(e);
      matched.push({ derived: d, existing: e, sodMatch });
      matchedKeys.add(matchKey);
      const eUuidKey = chainKeyByUUID(e);
      if (eUuidKey) matchedKeys.add(eUuidKey);
      matchedKeys.add(chainKeyByText(e));

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

  // extra: 기존에 있지만 매칭되지 않은 것
  const extra: MasterFailureChain[] = [];
  for (const e of existing) {
    const eUuidKey = chainKeyByUUID(e);
    const eTextKey = chainKeyByText(e);
    if ((eUuidKey && matchedKeys.has(eUuidKey)) || matchedKeys.has(eTextKey)) continue;
    extra.push(e);
  }

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
