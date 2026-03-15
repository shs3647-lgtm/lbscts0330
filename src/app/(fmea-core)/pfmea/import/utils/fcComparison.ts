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

/** 비교용 정규화 (NFKC + 공백 통일 + 소문자) */
function normalize(s: string | undefined): string {
  return (s || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
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

/** FM 커버리지 키: processNo|fmValue (해당 FM이 FC시트에 존재하는지) */
function fmCoverageKey(c: MasterFailureChain): string {
  return `${normalizeProcessNo(c.processNo)}|${normalize(c.fmValue)}`;
}

/** FC 커버리지 키: processNo|fcValue (해당 FC가 FC시트에 존재하는지) */
function fcCoverageKey(c: MasterFailureChain): string {
  return `${normalizeProcessNo(c.processNo)}|${normalize(c.fcValue)}`;
}

/** FM 커버리지 키 (processNo 없이, 글로벌 매칭) */
function fmGlobalKey(c: MasterFailureChain): string {
  return normalize(c.fmValue);
}

/** FC 커버리지 키 (processNo 없이, 글로벌 매칭) */
function fcGlobalKey(c: MasterFailureChain): string {
  return normalize(c.fcValue);
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
 * ★★★ UUID FK 기반 비교 + 유연 fallback ★★★
 *
 * 1순위: fmId+fcId UUID 키로 매칭
 * 2순위: processNo+fmValue+fcValue 정규화 키로 매칭 (UUID 미할당 시)
 * 3순위: processNo+fmValue 단독 매칭 (FC 페어링 무관, FM 존재 확인)
 * 4순위: processNo+fcValue 단독 매칭 (FM 페어링 무관, FC 존재 확인)
 *
 * 3/4순위 추가 이유: derived(메인시트 자동도출)와 existing(FC시트)의
 * FM↔FC 페어링 순서가 다를 수 있으므로, 개별 FM/FC 존재 여부로 매칭.
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

  // ─── 1:1 매칭 인덱스 (UUID + 텍스트 트리플) ───
  const existingByUUID = new Map<string, MasterFailureChain>();
  const existingByText = new Map<string, MasterFailureChain>();
  for (const e of existing) {
    const uuidKey = chainKeyByUUID(e);
    if (uuidKey && !existingByUUID.has(uuidKey)) existingByUUID.set(uuidKey, e);
    const textKey = chainKeyByText(e);
    if (!existingByText.has(textKey)) existingByText.set(textKey, e);
  }

  // ─── 커버리지 인덱스 (FM/FC 개별 존재 여부 — N:M 대응) ───
  const existingFMSet = new Set<string>();       // processNo|fmValue
  const existingFCSet = new Set<string>();       // processNo|fcValue
  const existingFMGlobal = new Set<string>();    // fmValue (공정 무관)
  const existingFCGlobal = new Set<string>();    // fcValue (공정 무관)
  const existingByFMKey = new Map<string, MasterFailureChain>();
  for (const e of existing) {
    if (normalize(e.fmValue)) {
      existingFMSet.add(fmCoverageKey(e));
      existingFMGlobal.add(fmGlobalKey(e));
      if (!existingByFMKey.has(fmCoverageKey(e))) existingByFMKey.set(fmCoverageKey(e), e);
    }
    if (normalize(e.fcValue)) {
      existingFCSet.add(fcCoverageKey(e));
      existingFCGlobal.add(fcGlobalKey(e));
    }
  }

  const matchedKeys = new Set<string>();

  for (const d of effectiveDerived) {
    let e: MasterFailureChain | undefined;
    let matchKey = '';

    // 1순위: UUID FK 매칭 (정확한 1:1)
    const dUuidKey = chainKeyByUUID(d);
    if (dUuidKey) {
      e = existingByUUID.get(dUuidKey);
      if (e) matchKey = dUuidKey;
    }

    // 2순위: processNo+fmValue+fcValue 정규화 키 (정확한 1:1)
    if (!e) {
      const dTextKey = chainKeyByText(d);
      e = existingByText.get(dTextKey);
      if (e && !matchedKeys.has(chainKeyByText(e))) {
        matchKey = chainKeyByText(e);
      } else {
        e = undefined;
      }
    }

    // 3순위: 커버리지 매칭 — derived의 FM과 FC가 모두 existing에 존재하면 매칭
    // (N:M 대응: 1:1이 아니어도 FM/FC 모두 FC시트에 있으면 "커버됨")
    if (!e) {
      const dFm = normalize(d.fmValue);
      const dFc = normalize(d.fcValue);
      const fmExists = dFm
        ? (existingFMSet.has(fmCoverageKey(d)) || existingFMGlobal.has(fmGlobalKey(d)))
        : true; // FM 비어있으면 FM 조건 무시
      const fcExists = dFc
        ? (existingFCSet.has(fcCoverageKey(d)) || existingFCGlobal.has(fcGlobalKey(d)))
        : true; // FC 비어있으면 FC 조건 무시

      if (fmExists && fcExists) {
        // 커버리지 매칭 성공 — existing에서 대표 chain 하나를 참조
        e = existingByFMKey.get(fmCoverageKey(d));
        if (!e && dFm) {
          // 글로벌 FM 키로 찾기
          for (const ex of existing) {
            if (fmGlobalKey(ex) === fmGlobalKey(d)) { e = ex; break; }
          }
        }
        if (!e) e = existing[0]; // 최소 1개 있으므로 fallback
        matchKey = `cov:${fmCoverageKey(d)}|${fcCoverageKey(d)}`;
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
  // 커버리지 매칭에서는 derived의 FM/FC가 existing에 존재하면 매칭이므로,
  // extra = existing chain 중 자기 FM이 derived에 전혀 없고 FC도 없는 것
  const derivedFMSet = new Set(effectiveDerived.filter(d => normalize(d.fmValue)).map(d => fmCoverageKey(d)));
  const derivedFCSet = new Set(effectiveDerived.filter(d => normalize(d.fcValue)).map(d => fcCoverageKey(d)));
  const derivedFMGlobal = new Set(effectiveDerived.filter(d => normalize(d.fmValue)).map(d => fmGlobalKey(d)));
  const derivedFCGlobal = new Set(effectiveDerived.filter(d => normalize(d.fcValue)).map(d => fcGlobalKey(d)));
  const extra: MasterFailureChain[] = [];
  for (const e of existing) {
    const eUuidKey = chainKeyByUUID(e);
    const eTextKey = chainKeyByText(e);
    if ((eUuidKey && matchedKeys.has(eUuidKey)) || matchedKeys.has(eTextKey)) continue;
    // 커버리지 체크: FM 또는 FC가 derived에 있으면 extra 아님
    const eFm = normalize(e.fmValue);
    const eFc = normalize(e.fcValue);
    const fmCovered = eFm && (derivedFMSet.has(fmCoverageKey(e)) || derivedFMGlobal.has(fmGlobalKey(e)));
    const fcCovered = eFc && (derivedFCSet.has(fcCoverageKey(e)) || derivedFCGlobal.has(fcGlobalKey(e)));
    if (fmCovered || fcCovered) continue;
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
