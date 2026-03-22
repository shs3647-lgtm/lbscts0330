/**
 * @file validate-import.ts
 * @description Excel Import 데이터 사전 검증 유틸리티
 *
 * Import 파싱 결과(ImportedFlatData[])를 DB 저장 전에 검증한다.
 * Rule 1.5 (자동생성 금지), Rule 1.7 (UUID/FK 설계 원칙) 준수 여부를 포함하여
 * 10가지 검증을 수행하고 ImportValidationReport를 반환한다.
 *
 * @version 1.0.0
 * @created 2026-03-21
 */

import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

// ══════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════

/** Individual check detail for items that failed a specific validation */
export interface CheckDetail {
  itemId?: string;
  processNo?: string;
  issue: string;
}

/** Result of a single validation check */
export interface CheckResult {
  /** Check identifier name */
  name: string;
  /** PASS = ok, FAIL = blocking error, WARN = non-blocking warning */
  status: 'PASS' | 'FAIL' | 'WARN';
  /** Human-readable summary of the check result */
  message: string;
  /** Per-item details when the check is not PASS (first 50 items max) */
  details?: CheckDetail[];
}

/** Overall validation report returned by validateImportData */
export interface ImportValidationReport {
  /** true only when every check is PASS */
  valid: boolean;
  /** Total number of checks executed */
  totalChecks: number;
  /** Number of checks that passed */
  passed: number;
  /** Number of checks that failed (FAIL status) */
  failed: number;
  /** Ordered list of check results */
  checks: CheckResult[];
}

// ══════════════════════════════════════════════
// Valid item codes & m4 codes
// ══════════════════════════════════════════════

const VALID_ITEM_CODES = new Set([
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
  'B1', 'B2', 'B3', 'B4', 'B5',
  'C1', 'C2', 'C3', 'C4',
]);

const VALID_M4_CODES = new Set(['MC', 'MT', 'MN', 'ME', 'EN']);

const B_LEVEL_CODES_REQUIRING_M4 = new Set(['B1', 'B2', 'B3', 'B4']);

/** Auto-generated text patterns forbidden by Rule 1.5 */
const FORBIDDEN_TEXT_PATTERNS = [
  '부적합', '불량', '관리 특성', '공정 품질 특성',
  '충족', '방지 기능', '설비가', '작업자가',
];

// ══════════════════════════════════════════════
// Helper: cap details array to avoid huge reports
// ══════════════════════════════════════════════

const MAX_DETAILS = 50;

function capDetails(details: CheckDetail[]): CheckDetail[] {
  if (details.length <= MAX_DETAILS) return details;
  return [
    ...details.slice(0, MAX_DETAILS),
    { issue: `... and ${details.length - MAX_DETAILS} more` },
  ];
}

// ══════════════════════════════════════════════
// Individual check functions
// ══════════════════════════════════════════════

/**
 * Check 1: processNoFormat
 * All A1 items must have a non-empty processNo string.
 */
function checkProcessNoFormat(flatData: ImportedFlatData[]): CheckResult {
  const a1Items = flatData.filter((d) => d.itemCode === 'A1');
  const bad: CheckDetail[] = [];

  for (const item of a1Items) {
    if (!item.processNo || item.processNo.trim() === '') {
      bad.push({ itemId: item.id, processNo: item.processNo, issue: 'Empty processNo on A1 item' });
    }
  }

  if (bad.length === 0) {
    return { name: 'processNoFormat', status: 'PASS', message: `All ${a1Items.length} A1 items have valid processNo` };
  }
  return {
    name: 'processNoFormat',
    status: 'FAIL',
    message: `${bad.length} A1 item(s) have empty/invalid processNo`,
    details: capDetails(bad),
  };
}

/**
 * Check 2: processNoUnique
 * No duplicate process numbers among A1 items.
 */
function checkProcessNoUnique(flatData: ImportedFlatData[]): CheckResult {
  const a1Items = flatData.filter((d) => d.itemCode === 'A1');
  const seen = new Map<string, number>();
  const dupes: CheckDetail[] = [];

  for (const item of a1Items) {
    const pno = item.processNo;
    const count = (seen.get(pno) ?? 0) + 1;
    seen.set(pno, count);
    if (count === 2) {
      dupes.push({ processNo: pno, issue: `Duplicate processNo '${pno}'` });
    }
  }

  if (dupes.length === 0) {
    return { name: 'processNoUnique', status: 'PASS', message: `All ${a1Items.length} process numbers are unique` };
  }
  return {
    name: 'processNoUnique',
    status: 'FAIL',
    message: `${dupes.length} duplicate processNo(s) found`,
    details: capDetails(dupes),
  };
}

/**
 * Check 3: processNoOrder
 * Process numbers (parsed as integers) should be in ascending order.
 */
function checkProcessNoOrder(flatData: ImportedFlatData[]): CheckResult {
  const a1Items = flatData
    .filter((d) => d.itemCode === 'A1')
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const bad: CheckDetail[] = [];
  let prevNum = -Infinity;

  for (const item of a1Items) {
    const num = parseInt(item.processNo, 10);
    if (isNaN(num)) {
      bad.push({ itemId: item.id, processNo: item.processNo, issue: `Non-numeric processNo '${item.processNo}'` });
      continue;
    }
    if (num <= prevNum) {
      bad.push({
        itemId: item.id,
        processNo: item.processNo,
        issue: `processNo ${num} is not greater than previous ${prevNum}`,
      });
    }
    prevNum = num;
  }

  if (bad.length === 0) {
    return { name: 'processNoOrder', status: 'PASS', message: `${a1Items.length} process numbers are in ascending order` };
  }
  return {
    name: 'processNoOrder',
    status: 'WARN',
    message: `${bad.length} process number ordering issue(s)`,
    details: capDetails(bad),
  };
}

/**
 * Check 4: parentItemIdChain
 * - Every B4's parentItemId should point to a B3 (not B1)
 * - Every B3's parentItemId should point to a B1
 * - Every A5's parentItemId should point to an A4
 */
function checkParentItemIdChain(flatData: ImportedFlatData[]): CheckResult {
  const byId = new Map<string, ImportedFlatData>();
  for (const item of flatData) {
    byId.set(item.id, item);
  }

  const bad: CheckDetail[] = [];

  // B4 -> B3
  for (const item of flatData) {
    if (item.itemCode !== 'B4') continue;
    if (!item.parentItemId) {
      bad.push({ itemId: item.id, processNo: item.processNo, issue: 'B4 has no parentItemId' });
      continue;
    }
    const parent = byId.get(item.parentItemId);
    if (!parent) {
      bad.push({ itemId: item.id, processNo: item.processNo, issue: `B4 parentItemId '${item.parentItemId}' not found` });
    } else if (parent.itemCode !== 'B3') {
      bad.push({
        itemId: item.id,
        processNo: item.processNo,
        issue: `B4 parentItemId points to ${parent.itemCode} instead of B3`,
      });
    }
  }

  // B3 -> B1
  for (const item of flatData) {
    if (item.itemCode !== 'B3') continue;
    if (!item.parentItemId) {
      bad.push({ itemId: item.id, processNo: item.processNo, issue: 'B3 has no parentItemId' });
      continue;
    }
    const parent = byId.get(item.parentItemId);
    if (!parent) {
      bad.push({ itemId: item.id, processNo: item.processNo, issue: `B3 parentItemId '${item.parentItemId}' not found` });
    } else if (parent.itemCode !== 'B1') {
      bad.push({
        itemId: item.id,
        processNo: item.processNo,
        issue: `B3 parentItemId points to ${parent.itemCode} instead of B1`,
      });
    }
  }

  // A5 -> A4
  for (const item of flatData) {
    if (item.itemCode !== 'A5') continue;
    if (!item.parentItemId) {
      bad.push({ itemId: item.id, processNo: item.processNo, issue: 'A5 has no parentItemId' });
      continue;
    }
    const parent = byId.get(item.parentItemId);
    if (!parent) {
      bad.push({ itemId: item.id, processNo: item.processNo, issue: `A5 parentItemId '${item.parentItemId}' not found` });
    } else if (parent.itemCode !== 'A4') {
      bad.push({
        itemId: item.id,
        processNo: item.processNo,
        issue: `A5 parentItemId points to ${parent.itemCode} instead of A4`,
      });
    }
  }

  if (bad.length === 0) {
    return { name: 'parentItemIdChain', status: 'PASS', message: 'All parent-child item chains are correct' };
  }
  return {
    name: 'parentItemIdChain',
    status: 'FAIL',
    message: `${bad.length} parent-child chain violation(s)`,
    details: capDetails(bad),
  };
}

/**
 * Check 5: dedupKeyUnique
 * No duplicate dedup keys within the same entity type.
 * - A4: pno|char
 * - A5: pno|fm
 * - B4: pno|m4|we|fm|fc
 * - C4: procNo|scope|fe
 */
function checkDedupKeyUnique(flatData: ImportedFlatData[]): CheckResult {
  const byId = new Map<string, ImportedFlatData>();
  for (const item of flatData) {
    byId.set(item.id, item);
  }

  const bad: CheckDetail[] = [];

  /**
   * Finds the ancestor value by walking up parentItemId until we find the
   * target itemCode, then returns its value.
   */
  function findAncestorValue(item: ImportedFlatData, targetCode: string): string {
    let current: ImportedFlatData | undefined = item;
    const visited = new Set<string>();
    while (current?.parentItemId && !visited.has(current.parentItemId)) {
      visited.add(current.parentItemId);
      current = byId.get(current.parentItemId);
      if (current?.itemCode === targetCode) return current.value;
    }
    return '';
  }

  // Helper to check duplicates within a group
  function checkGroup(itemCode: string, keyFn: (item: ImportedFlatData) => string): void {
    const items = flatData.filter((d) => d.itemCode === itemCode);
    const seen = new Map<string, ImportedFlatData>();
    for (const item of items) {
      const key = keyFn(item);
      if (!key) continue;
      const existing = seen.get(key);
      if (existing) {
        bad.push({
          itemId: item.id,
          processNo: item.processNo,
          issue: `Duplicate ${itemCode} dedup key '${key}' (conflicts with id=${existing.id})`,
        });
      } else {
        seen.set(key, item);
      }
    }
  }

  // A4: pno|char
  checkGroup('A4', (item) => `${item.processNo}|${item.value}`);

  // A5: pno|fm
  checkGroup('A5', (item) => `${item.processNo}|${item.value}`);

  // B4: pno|m4|we|fm|fc
  checkGroup('B4', (item) => {
    const we = findAncestorValue(item, 'B1');
    const fm = findAncestorValue(item, 'A5');
    return `${item.processNo}|${item.m4 ?? ''}|${we}|${fm}|${item.value}`;
  });

  // C4: procNo|scope|fe
  checkGroup('C4', (item) => {
    const scope = findAncestorValue(item, 'C1');
    return `${item.processNo}|${scope}|${item.value}`;
  });

  if (bad.length === 0) {
    return { name: 'dedupKeyUnique', status: 'PASS', message: 'All dedup keys are unique within entity types' };
  }
  return {
    name: 'dedupKeyUnique',
    status: 'FAIL',
    message: `${bad.length} duplicate dedup key(s) found`,
    details: capDetails(bad),
  };
}

/**
 * Check 6: requiredFields
 * FM (A5) count > 0, FC (B4) count > 0, FE (C4) count > 0
 */
function checkRequiredFields(flatData: ImportedFlatData[]): CheckResult {
  const fmCount = flatData.filter((d) => d.itemCode === 'A5').length;
  const fcCount = flatData.filter((d) => d.itemCode === 'B4').length;
  const feCount = flatData.filter((d) => d.itemCode === 'C4').length;

  const bad: CheckDetail[] = [];
  if (fmCount === 0) bad.push({ issue: 'FM (A5) count is 0 — no failure modes found' });
  if (fcCount === 0) bad.push({ issue: 'FC (B4) count is 0 — no failure causes found' });
  if (feCount === 0) bad.push({ issue: 'FE (C4) count is 0 — no failure effects found' });

  if (bad.length === 0) {
    return {
      name: 'requiredFields',
      status: 'PASS',
      message: `Required fields present: FM=${fmCount}, FC=${fcCount}, FE=${feCount}`,
    };
  }
  return {
    name: 'requiredFields',
    status: 'FAIL',
    message: `Missing required failure data: ${bad.map((b) => b.issue).join('; ')}`,
    details: bad,
  };
}

/**
 * Check 7: noAutoGenText
 * No auto-generated text patterns that violate Rule 1.5.
 * Patterns: "부적합", "불량", "관리 특성", "공정 품질 특성", "충족", "방지 기능", "설비가", "작업자가"
 */
function checkNoAutoGenText(flatData: ImportedFlatData[]): CheckResult {
  const bad: CheckDetail[] = [];

  for (const item of flatData) {
    const val = item.value;
    if (!val) continue;
    for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
      if (val.includes(pattern)) {
        bad.push({
          itemId: item.id,
          processNo: item.processNo,
          issue: `${item.itemCode} value contains forbidden auto-gen pattern '${pattern}': "${val.substring(0, 60)}"`,
        });
        break; // one match per item is enough
      }
    }
  }

  if (bad.length === 0) {
    return { name: 'noAutoGenText', status: 'PASS', message: 'No auto-generated text patterns detected' };
  }
  return {
    name: 'noAutoGenText',
    status: 'WARN',
    message: `${bad.length} item(s) contain auto-generated text patterns (Rule 1.5 violation)`,
    details: capDetails(bad),
  };
}

/**
 * Check 8: m4Codes
 * All B1/B2/B3/B4 items must have a valid m4 code (MC/MT/MN/ME/EN).
 */
function checkM4Codes(flatData: ImportedFlatData[]): CheckResult {
  const bad: CheckDetail[] = [];

  for (const item of flatData) {
    if (!B_LEVEL_CODES_REQUIRING_M4.has(item.itemCode)) continue;
    if (!item.m4 || !VALID_M4_CODES.has(item.m4)) {
      bad.push({
        itemId: item.id,
        processNo: item.processNo,
        issue: `${item.itemCode} has invalid/missing m4 code: '${item.m4 ?? '(undefined)'}'`,
      });
    }
  }

  if (bad.length === 0) {
    const total = flatData.filter((d) => B_LEVEL_CODES_REQUIRING_M4.has(d.itemCode)).length;
    return { name: 'm4Codes', status: 'PASS', message: `All ${total} B-level items have valid m4 codes` };
  }
  return {
    name: 'm4Codes',
    status: 'FAIL',
    message: `${bad.length} B-level item(s) have invalid/missing m4 code`,
    details: capDetails(bad),
  };
}

/**
 * Check 9: crossProcessParent
 * No item's parentItemId references an item from a different processNo.
 */
function checkCrossProcessParent(flatData: ImportedFlatData[]): CheckResult {
  const byId = new Map<string, ImportedFlatData>();
  for (const item of flatData) {
    byId.set(item.id, item);
  }

  const bad: CheckDetail[] = [];

  for (const item of flatData) {
    if (!item.parentItemId) continue;
    // C-level items use scope (YP/SP/USER) as processNo, skip cross-check for them
    if (item.category === 'C') continue;

    const parent = byId.get(item.parentItemId);
    if (!parent) continue; // missing parent is caught by parentItemIdChain check
    if (parent.category === 'C') continue; // parent is C-level, different processNo semantics

    if (item.processNo !== parent.processNo) {
      bad.push({
        itemId: item.id,
        processNo: item.processNo,
        issue: `${item.itemCode} (pno=${item.processNo}) references parent ${parent.itemCode} (pno=${parent.processNo}) from different process`,
      });
    }
  }

  if (bad.length === 0) {
    return { name: 'crossProcessParent', status: 'PASS', message: 'No cross-process parent references found' };
  }
  return {
    name: 'crossProcessParent',
    status: 'FAIL',
    message: `${bad.length} item(s) reference parents from a different process`,
    details: capDetails(bad),
  };
}

/**
 * Check 10: itemCodeConsistency
 * Each item has a valid itemCode from the known set (A1-A6, B1-B5, C1-C4).
 */
function checkItemCodeConsistency(flatData: ImportedFlatData[]): CheckResult {
  const bad: CheckDetail[] = [];

  for (const item of flatData) {
    if (!VALID_ITEM_CODES.has(item.itemCode)) {
      bad.push({
        itemId: item.id,
        processNo: item.processNo,
        issue: `Invalid itemCode '${item.itemCode}'`,
      });
    }
  }

  if (bad.length === 0) {
    return {
      name: 'itemCodeConsistency',
      status: 'PASS',
      message: `All ${flatData.length} items have valid itemCodes`,
    };
  }
  return {
    name: 'itemCodeConsistency',
    status: 'FAIL',
    message: `${bad.length} item(s) have invalid itemCode`,
    details: capDetails(bad),
  };
}

// ══════════════════════════════════════════════
// Main validation function
// ══════════════════════════════════════════════

/**
 * Validates Excel import data (ImportedFlatData[]) BEFORE processing.
 *
 * Runs 10 checks covering format, uniqueness, parent-child chains,
 * dedup key integrity, required fields, forbidden auto-gen text,
 * m4 codes, cross-process references, and itemCode consistency.
 *
 * @param flatData - Array of imported flat data items from Excel parsing
 * @returns ImportValidationReport with per-check results
 *
 * @example
 * ```typescript
 * const report = validateImportData(parsedItems);
 * if (!report.valid) {
 *   console.error('Import validation failed:', report.checks.filter(c => c.status === 'FAIL'));
 * }
 * ```
 */
export function validateImportData(flatData: ImportedFlatData[]): ImportValidationReport {
  const checks: CheckResult[] = [
    checkProcessNoFormat(flatData),
    checkProcessNoUnique(flatData),
    checkProcessNoOrder(flatData),
    checkParentItemIdChain(flatData),
    checkDedupKeyUnique(flatData),
    checkRequiredFields(flatData),
    checkNoAutoGenText(flatData),
    checkM4Codes(flatData),
    checkCrossProcessParent(flatData),
    checkItemCodeConsistency(flatData),
  ];

  const passed = checks.filter((c) => c.status === 'PASS').length;
  const failed = checks.filter((c) => c.status === 'FAIL').length;

  return {
    valid: failed === 0,
    totalChecks: checks.length,
    passed,
    failed,
    checks,
  };
}
