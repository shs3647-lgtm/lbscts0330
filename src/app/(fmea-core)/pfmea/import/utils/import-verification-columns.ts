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
  expected: number;    // 비교 기준: 복합키 고유·flat 행·파이프라인 척도 병합(값만 dedup 고유는 보조)
  actual: number;      // DB count from project schema
  match: boolean;
  status: VerifyStatus;
}

export interface ApiVerifyResult {
  expected: number;    // 비교 기준: 복합키·flat 행·파이프라인 척도 병합(DB 엔티티 스케일)
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

const ALL_ITEM_CODES = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4', 'D5'] as const;

/**
 * 통계「파싱」·UUID·PG/API 기대와 동일 스케일로 flat 행을 센다.
 * - id 필수
 * - B3: 빈 processChar도 PG l3_functions 1행
 * - C3·B2: verify-counts와 동일 — 비어 있으면 제외(requirement / functionName)
 */
export function flatRowCountsForVerification(item: ImportedFlatData): boolean {
  if (!item.itemCode || !String(item.id ?? '').trim()) return false;
  const code = item.itemCode;
  // B3: 빈 processChar도 PG l3_functions 1행과 맞출 수 있음
  if (code === 'B3') return true;
  // 그 외(A1~C4 등): 공백만인 행은 통계·PG 기대에서 제외 (★9 post-save 정합)
  return Boolean(item.value?.trim());
}

/** Import 미리보기 UUID 열 — flatRowCountsForVerification과 동일 */
export function countFlatRowsByItemCode(flatData: ImportedFlatData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of flatData) {
    if (!flatRowCountsForVerification(item)) continue;
    counts[item.itemCode] = (counts[item.itemCode] || 0) + 1;
  }
  return counts;
}

/** 통계표「파싱」열 rawCount — countFlatRows와 동일(드리프트 방지) */
export function countAllFlatRowsByItemCode(flatData: ImportedFlatData[]): Record<string, number> {
  return countFlatRowsByItemCode(flatData);
}

/**
 * 항목코드별 복합키 고유 개수 (flat 기준, ID-only).
 * 키 = processNo + itemCode + value + m4 + parentItemId (각 trim) — 동일 문구라도 부모·공정·4M이 다르면 별도 키.
 * 통계「고유」가 값 텍스트만 보거나 파서 dedup 척도와 다를 때 누락·중복을 짚기 위함.
 */
export function countCompositeKeysByItemCode(flatData: ImportedFlatData[]): Record<string, number> {
  const byCode = new Map<string, Set<string>>();
  for (const item of flatData) {
    if (!item.itemCode || !item.id) continue;
    if (!flatRowCountsForVerification(item)) continue;
    const code = item.itemCode;
    const processNo = String(item.processNo ?? '').trim();
    const v = code === 'B3' ? String(item.value ?? '').trim() : (item.value?.trim() ?? '');
    const m4 = String(item.m4 ?? '').trim();
    const pid = String(item.parentItemId ?? '').trim();
    const key = `${processNo}\x1f${code}\x1f${v}\x1f${m4}\x1f${pid}`;
    if (!byCode.has(code)) byCode.set(code, new Set());
    byCode.get(code)!.add(key);
  }
  const out: Record<string, number> = {};
  for (const code of ALL_ITEM_CODES) {
    out[code] = byCode.get(code)?.size ?? 0;
  }
  return out;
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

/** 위치기반 position-parser `stats`의 excelC1…excelB5 → 항목코드 (엑셀 시트 비어있지 않은 셀 수) */
const ITEM_CODE_TO_POSITION_EXCEL_STAT: Record<string, string> = {
  C1: 'excelC1',
  C2: 'excelC2',
  C3: 'excelC3',
  C4: 'excelC4',
  A1: 'excelA1',
  A2: 'excelA2',
  A3: 'excelA3',
  A4: 'excelA4',
  A5: 'excelA5',
  A6: 'excelA6',
  B1: 'excelB1',
  B2: 'excelB2',
  B3: 'excelB3',
  B4: 'excelB4',
  B5: 'excelB5',
  // ★ MBD-26-009: FC 레벨 — FC시트 참조 기준 distinct (파서 verifyD* stats)
  D1: 'verifyD1FcFe',
  D2: 'verifyD2FcProcess',
  D3: 'verifyD3FcFm',
  D4: 'verifyD4FcWorkElem',
  D5: 'verifyD5FcFc',
};

/**
 * 위치기반 Import — 통계표「원본」열: `position-parser`가 L1/L2/L3 물리 시트를 훑어
 * 항목별 비어있지 않은 셀 수(excelC1…excelB5)를 집계한 값. (flat/파싱 행 수와 별개)
 */
export function countsFromPositionExcelStats(
  stats: Record<string, number> | null | undefined,
): Record<string, number> | null {
  if (!stats || typeof stats !== 'object') return null;
  const out: Record<string, number> = {};
  for (const code of ALL_ITEM_CODES) {
    const sk = ITEM_CODE_TO_POSITION_EXCEL_STAT[code];
    const v = sk != null ? stats[sk] : undefined;
    out[code] = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  }
  return out;
}

/** 별칭 — 통계「엑셀 원본」건수 (위와 동일). */
export const excelSourceItemCountsFromParserStats = countsFromPositionExcelStats;

/** ★ MBD-26-009: excelTotalX* → 항목코드 (엑셀 시트 총 행수, non-distinct) */
const ITEM_CODE_TO_POSITION_EXCEL_TOTAL_STAT: Record<string, string> = {
  C1: 'excelTotalC1', C2: 'excelTotalC2', C3: 'excelTotalC3', C4: 'excelTotalC4',
  A1: 'excelTotalA1', A2: 'excelTotalA2', A3: 'excelTotalA3', A4: 'excelTotalA4',
  A5: 'excelTotalA5', A6: 'excelTotalA6',
  B1: 'excelTotalB1', B2: 'excelTotalB2', B3: 'excelTotalB3', B4: 'excelTotalB4', B5: 'excelTotalB5',
  // FC 레벨: total = distinct와 동일 (참조 엔티티 기준)
  D1: 'verifyD1FcFe', D2: 'verifyD2FcProcess', D3: 'verifyD3FcFm',
  D4: 'verifyD4FcWorkElem', D5: 'verifyD5FcFc',
};

/** 위치기반 Import — 엑셀 총 행수 (non-distinct countNonEmpty). DB 115개의 근거 확인용. */
export function countsFromPositionExcelTotalStats(
  stats: Record<string, number> | null | undefined,
): Record<string, number> | null {
  if (!stats || typeof stats !== 'object') return null;
  const out: Record<string, number> = {};
  for (const code of ALL_ITEM_CODES) {
    const sk = ITEM_CODE_TO_POSITION_EXCEL_TOTAL_STAT[code];
    const v = sk != null ? stats[sk] : undefined;
    out[code] = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  }
  return out;
}

/**
 * 레거시 Import — 통계표「원본」열 참고: 파서가 1차 산출한 rawCount(별도 엑셀 스캔 없을 때).
 * 위치기반은 `countsFromPositionExcelStats`가 엑셀 직접 집계.
 */
export function countsFromParseStatisticsItemRaw(
  st: { itemStats: ReadonlyArray<{ itemCode: string; rawCount: number }> } | null | undefined,
): Record<string, number> | null {
  if (!st?.itemStats?.length) return null;
  const out: Record<string, number> = {};
  for (const code of ALL_ITEM_CODES) out[code] = 0;
  for (const row of st.itemStats) {
    if (row.itemCode && row.itemCode in out) out[row.itemCode] = row.rawCount ?? 0;
  }
  return out;
}

/**
 * 위치기반 `position-parser`의 `stats` → `/api/fmea/verify-counts`와 동일한 항목코드 척도.
 * 통계표「원본」「파싱」과 DB(pgsql) 기대값을 맞출 때 사용한다.
 * (엑셀 비어있지 않은 셀 수 excelC1…excelB5 는 병합·중복·RA 전개와 스케일이 달라 별도)
 */
export function countsVerifyAlignedFromPipelineStats(
  stats: Record<string, number> | null | undefined,
): Record<string, number> | null {
  if (!stats || typeof stats !== 'object') return null;
  if (typeof stats.l2Structures !== 'number' || !Number.isFinite(stats.l2Structures)) return null;
  // 신규 verify* 필드 없으면 레거시 stats — 엑셀 셀 척도로 되돌림
  if (
    typeof stats.verifyC1DistinctCategories !== 'number' ||
    typeof stats.verifyA6RiskWithDc !== 'number' ||
    typeof stats.verifyB5RiskWithPc !== 'number'
  ) {
    return null;
  }

  const l2 = stats.l2Structures;
  const a6 = stats.verifyA6RiskWithDc;
  const b5 = stats.verifyB5RiskWithPc;
  const c1 = stats.verifyC1DistinctCategories;
  const c3 =
    typeof stats.verifyC3L1FuncWithRequirement === 'number' && Number.isFinite(stats.verifyC3L1FuncWithRequirement)
      ? stats.verifyC3L1FuncWithRequirement
      : stats.l1Requirements ?? 0;
  const b2 =
    typeof stats.verifyB2L3FuncNamed === 'number' && Number.isFinite(stats.verifyB2L3FuncNamed)
      ? stats.verifyB2L3FuncNamed
      : stats.l3Functions ?? 0;

  const out: Record<string, number> = {};
  for (const code of ALL_ITEM_CODES) out[code] = 0;
  out.C1 = c1;
  out.C2 = stats.l1Functions ?? 0;
  out.C3 = c3;
  out.C4 = stats.failureEffects ?? 0;
  out.A1 = l2;
  out.A2 = l2;
  out.A3 = stats.l2Functions ?? 0;
  out.A4 = stats.processProductChars ?? 0;
  out.A5 = stats.failureModes ?? 0;
  out.A6 = a6;
  out.B1 = stats.l3Structures ?? 0;
  out.B2 = b2;
  out.B3 = stats.l3Functions ?? 0;
  out.B4 = stats.failureCauses ?? 0;
  out.B5 = b5;
  // ★ MBD-26-009: FC 레벨 (D1~D5) — FC시트 참조 엔티티 distinct (파서 verifyD* 사용)
  out.D1 = stats.verifyD1FcFe ?? stats.failureEffects ?? 0;
  out.D2 = stats.verifyD2FcProcess ?? stats.l2Structures ?? 0;
  out.D3 = stats.verifyD3FcFm ?? stats.failureModes ?? 0;
  out.D4 = stats.verifyD4FcWorkElem ?? stats.l3Structures ?? 0;
  out.D5 = stats.verifyD5FcFc ?? stats.failureCauses ?? 0;
  return out;
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
/**
 * PG/API 기대 건수 병합.
 * - **B1–B5**: 복합키가 있으면 `max(flat행, 복합키)` — parentId 생략으로 복합키만 작아진 경우 행 수가 저장 척도.
 * - A·C 계열: 복합키 고유 = 엔티티 척도(C4 등 flat>고유 시 복합키로 DB 스케일 맞춤).
 * - B에서 통계 고유 < flat 행이면 값·4M만 본 dedup으로 보고 flat 행 수 사용.
 * - `verifyScaleOverride`: 파이프라인 척도; 항목별 blended가 더 크면 상향(과소 기대 방지).
 */
export function mergeImportExpectedCounts(
  uuidCounts: Record<string, number>,
  uniqueByCode?: Record<string, number>,
  compositeByCode?: Record<string, number>,
  verifyScaleOverride?: Record<string, number> | null,
): Record<string, number> {
  const blended: Record<string, number> = {};
  for (const code of ALL_ITEM_CODES) {
    const raw = uuidCounts[code] || 0;
    const comp = compositeByCode?.[code];
    const u = uniqueByCode?.[code];
    const isB = code.startsWith('B');

    let chosen = raw;
    // B: 복합키가 parent·m4를 포함 — 행 수보다 작으면 flat 행(저장 단위) 우선. A/C: 복합키 고유 = 엔티티 척도.
    if (comp !== undefined && comp > 0) {
      chosen = isB ? Math.max(raw, comp) : comp;
    } else if (isB && u !== undefined && raw > 0 && u < raw) {
      chosen = raw;
    } else if (u !== undefined && (u > 0 || raw === 0)) {
      chosen = u;
    }
    blended[code] = chosen;
  }

  // ★ MBD-26-009: verifyScaleOverride(distinct)가 있으면 그대로 사용
  // verify-counts가 distinct를 반환하므로 expected도 distinct로 통일
  if (verifyScaleOverride && typeof verifyScaleOverride.A1 === 'number') {
    return { ...verifyScaleOverride };
  }
  return blended;
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
  D1: null,           // FC 레벨: C4(고장영향) — feId ref
  D2: null,           // FC 레벨: A2(공정명) — fmProcess ref
  D3: null,           // FC 레벨: A5(고장형태) — fmId ref
  D4: null,           // FC 레벨: B1(작업요소) — l3StructId ref
  D5: null,           // FC 레벨: B4(고장원인) — fcId ref
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
      // ★ 2026-03-29: DB >= expected → pass (DB superset 정상), DB < expected → warn/error
      const isMatch = actual >= expected;
      result[code] = { expected, actual, match: isMatch, status: isMatch ? 'pass' : actual > 0 ? 'warn' : 'error' };
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

  // ★ 2026-03-29: 엔티티 수(총 레코드)로 통일 — verify-counts API와 동일 척도
  const entityCount = (arr: any[]) => (arr || []).length;

  const apiCounts: Record<string, number> = {
    A1: entityCount(apiData.l2Structures),
    A2: entityCount(apiData.l2Structures),
    A3: entityCount(apiData.l2Functions),
    A4: entityCount(apiData.processProductChars),
    A5: entityCount(apiData.failureModes),
    A6: (apiData.riskAnalyses || []).filter((r: any) => r.detectionControl?.trim()).length,
    B1: entityCount(apiData.l3Structures),
    B2: entityCount(apiData.l3Functions),
    B3: (apiData.l3Functions || []).filter((r: any) => ((r.processChar ?? '') as string).trim() !== '').length,
    B4: entityCount(apiData.failureCauses),
    // B5 = preventionControl 보유 RA 수 (총 건수)
    B5: (apiData.riskAnalyses || []).filter((r: any) => r.preventionControl?.trim()).length,
    C1: new Set((apiData.l1Functions || []).map((f: any) => f.category)).size,
    C2: entityCount(apiData.l1Functions),
    C3: (apiData.l1Functions || []).filter((f: any) => f.requirement?.trim()).length,
    C4: entityCount(apiData.failureEffects),
    // FC 레벨 (D1~D3: FL distinct, D4~D5: 엔티티 수)
    D1: new Set((apiData.failureLinks || []).map((fl: any) => fl.feId).filter(Boolean)).size,
    D2: new Set((apiData.failureLinks || []).map((fl: any) => (fl.fmProcess ?? '').trim()).filter(Boolean)).size,
    D3: new Set((apiData.failureLinks || []).map((fl: any) => fl.fmId).filter(Boolean)).size,
    D4: entityCount(apiData.l3Structures),
    D5: entityCount(apiData.failureCauses),
  };

  for (const code of ALL_ITEM_CODES) {
    const expected = expectedCounts[code] || 0;
    const apiCount = apiCounts[code] || 0;
    // ★ 2026-03-29: API >= expected → pass (superset 정상)
    const isMatch = apiCount >= expected;
    result[code] = {
      expected,
      apiCount,
      match: isMatch,
      status: isMatch ? 'pass' : apiCount > 0 ? 'warn' : expected === 0 ? 'na' : 'error',
    };
  }

  return result;
}
