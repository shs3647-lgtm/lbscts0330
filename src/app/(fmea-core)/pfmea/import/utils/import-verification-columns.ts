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
  expected: number;    // UUID count from import
  actual: number;      // DB count from project schema
  match: boolean;
  status: VerifyStatus;
}

export interface ApiVerifyResult {
  expected: number;    // UUID count from import
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
// A1/A2: no parent (top-level L2Structure)
// A3: parent = A1 (L2Structure)
// A4: parent = A3 (L2Function) or A1 (L2Structure)
// A5: parent = A4 (ProductChar)
// A6: special (via riskData, no direct parentItemId)
// B1: parent = A1 (L2Structure processNo match)
// B2: parent = B1 (L3Structure)
// B3: parent = B1 (L3Structure)
// B4: parent = B3 (L3Function)
// B5: special (via riskData)
// C1: no parent (category marker)
// C2: parent = C1 (category)
// C3: parent = C2 (L1Function)
// C4: parent = C3 (requirement)

const FK_PARENT_RULES: Record<string, string[] | null> = {
  A1: null,           // no FK check
  A2: null,           // shares with A1
  A3: ['A1', 'A2'],   // parent should be L2Structure
  A4: ['A3', 'A1'],   // parent should be L2Function or L2Structure
  A5: ['A4', 'A3'],   // parent should be ProductChar or L2Function
  A6: null,           // special (riskData)
  B1: null,           // processNo-based, not parentItemId
  B2: ['B1'],         // parent should be L3Structure
  B3: ['B1'],         // parent should be L3Structure
  B4: ['B3', 'B2', 'B1'], // parent should be L3Function or L3Structure
  B5: null,           // special (riskData)
  C1: null,           // category marker, no parent
  C2: ['C1'],         // parent should be category
  C3: ['C2'],         // parent should be L1Function
  C4: ['C3', 'C2'],   // parent should be requirement or L1Function
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

  const ALL_CODES = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4'];

  for (const code of ALL_CODES) {
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

    for (const item of items) {
      const pid = item.parentItemId;
      if (!pid || !pid.trim()) {
        // No parentItemId set → orphan
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
    // Items without parentItemId count as orphans for strict FK check
    orphans += noParentId;

    result[code] = {
      total,
      valid,
      orphans,
      status: orphans === 0 ? 'pass' : orphans > total * 0.5 ? 'error' : 'warn',
    };
  }

  return result;
}

/**
 * pgsql 검증: DB 카운트를 UUID 카운트와 비교
 */
export function mapCountsToPgsql(
  dbCounts: Record<string, number>,
  uuidCounts: Record<string, number>
): Record<string, PgsqlVerifyResult> {
  const result: Record<string, PgsqlVerifyResult> = {};
  const ALL_CODES = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4'];

  for (const code of ALL_CODES) {
    const expected = uuidCounts[code] || 0;
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
  uuidCounts: Record<string, number>
): Record<string, ApiVerifyResult> {
  const result: Record<string, ApiVerifyResult> = {};

  // A6/B5: L3 커버리지 기반 — L2에 DC/PC 있으면 하위 L3 전부 커버
  // ★ 다중 폴백: FL.l2StructId → FC.l2StructId → L3Structure.l2Id 경로
  const l3Structs = (apiData.l3Structures || []) as any[];
  const l3ToL2 = new Map<string, string>(
    l3Structs.map((l3: any) => [l3.id, l3.l2Id]),
  );
  const fcToL2 = new Map<string, string>();
  for (const fc of (apiData.failureCauses || []) as any[]) {
    const l2 = fc.l2StructId || l3ToL2.get(fc.l3StructId);
    if (l2) fcToL2.set(fc.id, l2);
  }
  const flToL2 = new Map<string, string>();
  for (const fl of (apiData.failureLinks || []) as any[]) {
    const l2 = fl.l2StructId || fcToL2.get(fl.fcId) || '';
    if (l2) flToL2.set(fl.id, l2);
  }
  const l2WithDC = new Set<string>();
  const l2WithPC = new Set<string>();
  for (const ra of (apiData.riskAnalyses || []) as any[]) {
    const l2Id = flToL2.get(ra.linkId);
    if (l2Id && ra.detectionControl?.trim()) l2WithDC.add(l2Id);
    if (l2Id && ra.preventionControl?.trim()) l2WithPC.add(l2Id);
  }

  // Extract counts from API response (atomic format)
  const apiCounts: Record<string, number> = {
    A1: (apiData.l2Structures || []).length,
    A2: (apiData.l2Structures || []).length,
    A3: (apiData.l2Functions || []).length,
    A4: (apiData.processProductChars || []).length,
    A5: (apiData.failureModes || []).length,
    A6: l3Structs.filter((l3: any) => l2WithDC.has(l3.l2Id)).length,
    B1: l3Structs.length,
    B2: (apiData.l3Functions || []).filter((f: any) => f.functionName?.trim()).length,
    B3: (apiData.l3Functions || []).filter((f: any) => f.processChar?.trim()).length,
    B4: (apiData.failureCauses || []).length,
    B5: l3Structs.filter((l3: any) => l2WithPC.has(l3.l2Id)).length,
    C1: new Set((apiData.l1Functions || []).map((f: any) => f.category)).size,
    // C2 = 고유 (구분|제품기능) — flat atomicToFlatData C2 행 수와 동일 의미
    C2: new Set(
      (apiData.l1Functions || []).map((f: any) => `${f.category}|${String(f.functionName || '').trim()}`),
    ).size,
    C3: (apiData.l1Functions || []).filter((f: any) => f.requirement?.trim()).length,
    C4: (apiData.failureEffects || []).length,
  };

  const ALL_CODES = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4'];

  for (const code of ALL_CODES) {
    const expected = uuidCounts[code] || 0;
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
