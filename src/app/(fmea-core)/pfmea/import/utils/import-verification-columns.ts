/**
 * @file import-verification-columns.ts
 * @description Import 검증 테이블 FK/pgsql저장/API적합 컬럼 순수 함수
 * @created 2026-03-22
 */

import type { ImportedFlatData } from '../types';

// ── Types ──

export type VerifyStatus = 'pass' | 'warn' | 'error' | 'na' | 'pending';

export interface FKVerifyResult {
  total: number;       // items that should have parentItemId
  valid: number;       // items whose parentItemId references an existing parent
  orphans: number;     // items with broken/missing FK
  status: VerifyStatus;
}

export interface PgsqlVerifyResult {
  expected: number;    // 비교 기준 건수(통계 '고유' 우선, 없으면 flat UUID 행 수)
  actual: number;      // DB count from project schema
  match: boolean;
  status: VerifyStatus;
}

export interface ApiVerifyResult {
  expected: number;    // 비교 기준 건수(통계 '고유' 우선 — DB 엔티티와 동일 스케일)
  apiCount: number;    // count from GET API response
  match: boolean;
  status: VerifyStatus;
}

export interface VerificationData {
  fk: Record<string, FKVerifyResult>;
  pgsql: Record<string, PgsqlVerifyResult>;
  api: Record<string, ApiVerifyResult>;
}

// ── Item codes that need FK parent validation ──
// ★v5 parentId 체인 (지침서 Section 2-2):
// C1→C2→C3→C4: C4.parentId=C3 (고장영향→요구사항)
// A1→A4→A5→A6: A5.parentId=A4, A6.parentId=A5
// B1→B2→B3→B4→B5: B4.parentId=B3, B5.parentId=B4
//
// A1/A2: no parent (top-level L2Structure)
// A3: parent = A1 (L2Structure)
// A4: parent = A1 (L2Structure)
// A5: parent = A4 (ProductChar)
// A6: parent = A5 (FailureMode) — Phase2 독립엔티티
// B1: parent = A1 (L2Structure processNo match)
// B2: parent = B1 (L3Structure/WorkElement)
// B3: parent = B2 (L3Function)
// B4: parent = B3 (L3ProcessChar)
// B5: parent = B4 (FailureCause) — Phase2 독립엔티티
// C1: no parent (category marker)
// C2: parent = C1 (category)
// C3: parent = C2 (L1Function)
// C4: parent = C3 (L1Requirement)

const ALL_ITEM_CODES = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4'] as const;

/** Import 미리보기·★9와 동일 규칙: id + 비어있지 않은 value 만 행으로 센다 */
export function countFlatRowsByItemCode(flatData: ImportedFlatData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of flatData) {
    if (!item.itemCode || !item.id || !item.value?.trim()) continue;
    counts[item.itemCode] = (counts[item.itemCode] || 0) + 1;
  }
  return counts;
}

/** mapCountsToPgsql 결과 중 불일치 코드만 사람이 읽을 줄로 (이름매칭 없음) */
export function formatPgsqlCodeMismatchLines(
  pgsql: Record<string, PgsqlVerifyResult>,
  maxLines = 12,
): string[] {
  const lines: string[] = [];
  for (const code of ALL_ITEM_CODES) {
    const r = pgsql[code];
    if (!r || r.match) continue;
    lines.push(`${code}: flat·고유 기대 ${r.expected}건 / PG ${r.actual}건 (${r.status})`);
    if (lines.length >= maxLines) break;
  }
  return lines;
}

/** save-position-import 삼중 FK와 동일 기준 */
export function countTripleFkFailureLinks(
  links: ReadonlyArray<{ fmId?: string | null; feId?: string | null; fcId?: string | null }>,
): number {
  let n = 0;
  for (const fl of links) {
    const fm = fl.fmId?.trim();
    const fe = fl.feId?.trim();
    const fc = fl.fcId?.trim();
    if (fm && fe && fc) n++;
  }
  return n;
}

/**
 * pgsql/API 검증용 기대 건수: 통계표「고유」열이 있으면 DB·API(엔티티 수)와 같은 눈금으로 맞춤.
 * 없으면 Import「UUID」열(flat 행 수)과 동일하게 uuidCounts만 사용.
 */
export function mergeImportExpectedCounts(
  uuidCounts: Record<string, number>,
  uniqueByCode?: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const code of ALL_ITEM_CODES) {
    const raw = uuidCounts[code] || 0;
    const u = uniqueByCode?.[code];
    // 통계에 코드만 채워 넣고 고유=0인 placeholder는 무시 → UUID(행) 기준 유지
    if (u !== undefined && (u > 0 || raw === 0)) out[code] = u;
    else out[code] = raw;
  }
  return out;
}

const FK_PARENT_RULES: Record<string, string[] | null> = {
  A1: null,           // no FK check
  A2: null,           // shares with A1
  A3: ['A1', 'A2'],   // parent should be L2Structure
  A4: ['A1'],          // ★v5: A4.parentId = A1 (L2Structure)
  A5: ['A4', 'A3'],   // parent should be ProductChar or L2Function
  A6: null,           // ★v5: Phase2 — A6.parentId = A5 (독립엔티티 후 검증)
  B1: null,           // processNo-based, not parentItemId
  B2: ['B1'],         // parent should be L3Structure/WorkElement
  B3: ['B2', 'B1'],   // ★v5: B3.parentId = B2 (L3Function)
  B4: ['B3', 'B2'],   // ★v5: B4.parentId = B3 (L3ProcessChar)
  B5: null,           // ★v5: Phase2 — B5.parentId = B4 (독립엔티티 후 검증)
  C1: null,           // category marker, no parent
  C2: ['C1'],         // parent should be category
  C3: ['C2'],         // parent should be L1Function
  C4: ['C3', 'C2'],   // ★v5: C4.parentId = C3 (L1Requirement)
};

/**
 * FK 검증: flatData의 parentItemId 체인 유효성 검사
 * 각 itemCode별로 parentItemId가 존재하는 부모 ID를 참조하는지 확인
 */
export function verifyFK(flatData: ImportedFlatData[]): Record<string, FKVerifyResult> {
  const result: Record<string, FKVerifyResult> = {};

  // Build ID set per itemCode
  const idsByCode = new Map<string, Set<string>>();
  const allIds = new Set<string>();
  for (const item of flatData) {
    if (!item.id || !item.itemCode) continue;
    allIds.add(item.id);
    if (!idsByCode.has(item.itemCode)) idsByCode.set(item.itemCode, new Set());
    idsByCode.get(item.itemCode)!.add(item.id);
  }

  // Group items by itemCode
  const byCode = new Map<string, ImportedFlatData[]>();
  for (const item of flatData) {
    if (!item.itemCode) continue;
    if (!byCode.has(item.itemCode)) byCode.set(item.itemCode, []);
    byCode.get(item.itemCode)!.push(item);
  }

  for (const code of ALL_ITEM_CODES) {
    const items = byCode.get(code) || [];
    const parentRule = FK_PARENT_RULES[code];

    if (!parentRule || items.length === 0) {
      result[code] = { total: items.length, valid: items.length, orphans: 0, status: items.length === 0 ? 'na' : 'pass' };
      continue;
    }

    // Build parent ID set from allowed parent codes
    const parentIds = new Set<string>();
    for (const parentCode of parentRule) {
      const ids = idsByCode.get(parentCode);
      if (ids) ids.forEach(id => parentIds.add(id));
    }

    let valid = 0;
    let orphans = 0;
    let noParentId = 0;
    /** 자동 보충(inherited) 행은 parentItemId 없이 들어올 수 있음 — 저장/원자DB에서 정합; FK 표시만 과대 실패 방지 */
    let inheritedSkipped = 0;

    for (const item of items) {
      if (item.inherited === true) {
        inheritedSkipped++;
        valid++;
        continue;
      }
      const pid = item.parentItemId;
      if (!pid || !pid.trim()) {
        noParentId++;
        continue;
      }
      if (parentIds.has(pid) || allIds.has(pid)) {
        valid++;
      } else {
        orphans++;
      }
    }

    const total = items.length;
    orphans += noParentId;

    result[code] = {
      total,
      valid,
      orphans,
      status: orphans === 0 ? 'pass' : orphans > (total - inheritedSkipped) * 0.5 ? 'error' : 'warn',
    };
  }

  return result;
}

/**
 * pgsql 검증: DB 카운트를 UUID 카운트와 비교
 */
export function mapCountsToPgsql(
  dbCounts: Record<string, number>,
  expectedCounts: Record<string, number>,
): Record<string, PgsqlVerifyResult> {
  const result: Record<string, PgsqlVerifyResult> = {};
  for (const code of ALL_ITEM_CODES) {
    const expected = expectedCounts[code] || 0;
    const actual = dbCounts[code] ?? -1;

    if (actual === -1) {
      result[code] = { expected, actual: 0, match: false, status: 'pending' };
    } else {
      const match = actual >= expected || (expected > 0 && actual > 0);
      result[code] = { expected, actual, match: actual === expected, status: actual === expected ? 'pass' : actual > 0 ? 'warn' : 'error' };
    }
  }

  return result;
}

/**
 * API 검증: API 응답 카운트를 UUID 카운트와 비교
 */
export function mapApiToVerification(
  apiData: any,
  expectedCounts: Record<string, number>,
): Record<string, ApiVerifyResult> {
  const result: Record<string, ApiVerifyResult> = {};

  // Extract counts from API response (atomic format)
  const apiCounts: Record<string, number> = {
    A1: (apiData.l2Structures || []).length,
    A2: (apiData.l2Structures || []).length,
    A3: (apiData.l2Functions || []).length,
    A4: (apiData.processProductChars || []).length,
    A5: (apiData.failureModes || []).length,
    A6: (apiData.riskAnalyses || []).filter((r: any) => r.detectionControl?.trim()).length,
    B1: (apiData.l3Structures || []).length,
    B2: (apiData.l3Functions || []).filter((f: any) => f.functionName?.trim()).length,
    B3: (apiData.l3Functions || []).filter((f: any) => f.processChar?.trim()).length,
    B4: (apiData.failureCauses || []).length,
    B5: (apiData.riskAnalyses || []).filter((r: any) => r.preventionControl?.trim()).length,
    C1: new Set((apiData.l1Functions || []).map((f: any) => f.category)).size,
    // C2 = 고유 (구분|제품기능) — flat atomicToFlatData C2 행 수와 동일 의미
    C2: new Set(
      (apiData.l1Functions || []).map((f: any) => `${f.category}|${String(f.functionName || '').trim()}`),
    ).size,
    C3: (apiData.l1Functions || []).filter((f: any) => f.requirement?.trim()).length,
    C4: (apiData.failureEffects || []).length,
  };

  for (const code of ALL_ITEM_CODES) {
    const expected = expectedCounts[code] || 0;
    const apiCount = apiCounts[code] || 0;
    result[code] = {
      expected,
      apiCount,
      match: apiCount === expected,
      status: apiCount === expected ? 'pass' : apiCount > 0 ? 'warn' : expected === 0 ? 'na' : 'error',
    };
  }

  return result;
}
