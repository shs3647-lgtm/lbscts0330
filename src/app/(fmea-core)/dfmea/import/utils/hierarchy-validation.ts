/**
 * @file hierarchy-validation.ts
 * @description DFMEA Import 상하관계 + 갯수 검증
 * @created 2026-02-17
 *
 * 핵심 원칙:
 * 1. 상하관계: L1/L2/L3 계층 간 부모-자식 관계 필수
 * 2. 갯수: 최소 1:1 — 상위 데이터마다 하위 데이터 1개 이상
 * 3. 불일치 시 Import 불가 (ERROR → Import 차단)
 * 4. processNo=00 예외 없음 (동일 규칙 적용)
 *
 * 검증 제외: A6(검출관리), B5(예방관리) = 리스크분석 단계
 */

import type { ParseResult, ProcessRelation, ProductRelation } from '../excel-parser';

// ─── 타입 정의 ──────────────────────────────────────────────────

export interface HierarchyIssue {
  rule: string;          // 'H1' | 'H2' | 'C1' | ... 'O1' | 'V1'
  severity: 'ERROR' | 'WARNING';
  processNo: string;
  m4?: string;
  message: string;
  parentCode: string;    // 상위 (예: 'B1')
  childCode: string;     // 하위 (예: 'B2')
  parentCount: number;
  childCount: number;
}

export interface HierarchyValidationResult {
  valid: boolean;                // ERROR 0개면 true
  errors: HierarchyIssue[];     // severity=ERROR
  warnings: HierarchyIssue[];   // severity=WARNING
  summary: {
    l1Count: number;   // C1 구분 수
    l2Count: number;   // A1 공정 수
    l3Count: number;   // B1 m4별 작업요소 수
  };
}

// ─── 헬퍼 ───────────────────────────────────────────────────────

function addIssue(
  issues: HierarchyIssue[],
  severity: 'ERROR' | 'WARNING',
  rule: string,
  processNo: string,
  m4: string | undefined,
  parentCode: string,
  childCode: string,
  parentCount: number,
  childCount: number,
  message: string,
): void {
  issues.push({ rule, severity, processNo, m4, message, parentCode, childCode, parentCount, childCount });
}

/** processNo별 B-level m4 세트 추출 */
function getM4Set(m4Array: string[]): Set<string> {
  return new Set(m4Array.filter(m => m).map(m => m.toUpperCase()));
}

/** processNo+m4별 갯수 계산 */
function countByM4(values: string[], m4Array: string[], targetM4: string): number {
  return values.filter((_, i) => (m4Array[i] || '').toUpperCase() === targetM4).length;
}

// ─── 메인 검증 함수 ─────────────────────────────────────────────

export function validateHierarchy(result: ParseResult): HierarchyValidationResult {
  const errors: HierarchyIssue[] = [];
  const warnings: HierarchyIssue[] = [];

  const { processes, products } = result;

  // ─── summary 계산 ─────────────────────────────────────────
  let totalL3 = 0;
  for (const proc of processes) {
    const m4Set = getM4Set(proc.workElements4M);
    totalL3 += m4Set.size || (proc.workElements.length > 0 ? 1 : 0);
  }

  const summary = {
    l1Count: products.length,
    l2Count: processes.length,
    l3Count: totalL3,
  };

  // ═══════════════════════════════════════════════════════════
  // L2 검증 (공정 레벨 — A items)
  // ═══════════════════════════════════════════════════════════

  // B4 조건부 판정: 전체 B4 데이터가 1건이라도 있으면 전 공정 필수
  const totalB4Count = processes.reduce((sum, p) => sum + p.failureCauses.length, 0);
  const b4Required = totalB4Count > 0;

  for (const proc of processes) {
    const pNo = proc.processNo;

    // [C2] A1 당 A3 (공정기능) ≥1
    if (proc.processDesc.length === 0) {
      addIssue(errors, 'ERROR', 'C2', pNo, undefined, 'A1', 'A3', 1, 0,
        `공정 "${pNo}": 공정기능(A3)이 없습니다. (최소 1개 필요)`);
    }

    // [C7] A1 당 A5 (고장형태) ≥1 — 무조건 필수
    if (proc.failureModes.length === 0) {
      addIssue(errors, 'ERROR', 'C7', pNo, undefined, 'A1', 'A5', 1, 0,
        `공정 "${pNo}": 고장형태(A5)가 없습니다. (필수 항목)`);
    }

    // [H1] L2→L3: A1에 대해 B1 존재 ≥1
    if (proc.workElements.length === 0) {
      addIssue(errors, 'ERROR', 'H1', pNo, undefined, 'A1', 'B1', 1, 0,
        `공정 "${pNo}": 작업요소(B1)가 없습니다. (L2→L3 관계 필수)`);
      continue; // B1이 없으면 B2/B3/B4 검증 불가
    }

    // ── B-level m4별 검증 ────────────────────────────────────

    const b1M4Set = getM4Set(proc.workElements4M);
    const b2M4Set = getM4Set(proc.elementFuncs4M);
    const b3M4Set = getM4Set(proc.processChars4M);
    const b4M4Set = getM4Set(proc.failureCauses4M);

    // B1에 4M 정보가 없는 경우 (레거시 데이터) → m4="" 기준으로 검증
    if (b1M4Set.size === 0) {
      // B2 갯수 검증 (m4 없이)
      if (proc.elementFuncs.length === 0) {
        addIssue(errors, 'ERROR', 'C3', pNo, undefined, 'B1', 'B2',
          proc.workElements.length, 0,
          `공정 "${pNo}": 요소기능(B2) ${proc.elementFuncs.length}개 — 작업요소(B1) ${proc.workElements.length}개에 대해 최소 1개 필요`);
      }
      if (proc.processChars.length === 0) {
        addIssue(errors, 'ERROR', 'C4', pNo, undefined, 'B1', 'B3',
          proc.workElements.length, 0,
          `공정 "${pNo}": 공정특성(B3) ${proc.processChars.length}개 — 작업요소(B1) ${proc.workElements.length}개에 대해 최소 1개 필요`);
      }
      if (b4Required && proc.failureCauses.length === 0) {
        addIssue(errors, 'ERROR', 'C5', pNo, undefined, 'B1', 'B4',
          proc.workElements.length, 0,
          `공정 "${pNo}": 고장원인(B4) ${proc.failureCauses.length}개 — 작업요소(B1) ${proc.workElements.length}개에 대해 최소 1개 필요`);
      }
      continue;
    }

    // 4M별 검증 (B1 m4 각각에 대해 B2/B3/B4 존재 확인)
    for (const m4 of b1M4Set) {
      const b1Count = countByM4(proc.workElements, proc.workElements4M, m4);
      const b2Count = countByM4(proc.elementFuncs, proc.elementFuncs4M, m4);
      const b3Count = countByM4(proc.processChars, proc.processChars4M, m4);
      const b4Count = countByM4(proc.failureCauses, proc.failureCauses4M, m4);

      // [C3/H2] B1 m4 당 B2 ≥1
      if (b2Count === 0) {
        addIssue(errors, 'ERROR', 'C3', pNo, m4, 'B1', 'B2', b1Count, 0,
          `공정 "${pNo}" ${m4}: 작업요소(B1) ${b1Count}개 → 요소기능(B2) 0개 (최소 1개 필요)`);
      }

      // [C4/H3] B1 m4 당 B3 ≥1
      if (b3Count === 0) {
        addIssue(errors, 'ERROR', 'C4', pNo, m4, 'B1', 'B3', b1Count, 0,
          `공정 "${pNo}" ${m4}: 작업요소(B1) ${b1Count}개 → 공정특성(B3) 0개 (최소 1개 필요)`);
      }

      // [C5/H4] B1 m4 당 B4 ≥1 (조건부: 전체 B4 > 0일 때만)
      if (b4Required && b4Count === 0) {
        addIssue(errors, 'ERROR', 'C5', pNo, m4, 'B1', 'B4', b1Count, 0,
          `공정 "${pNo}" ${m4}: 작업요소(B1) ${b1Count}개 → 고장원인(B4) 0개 (최소 1개 필요)`);
      }
    }

    // ── Orphan 검증 (O1): B2에 m4가 있는데 B1에 해당 m4가 없음 ──
    for (const m4 of b2M4Set) {
      if (!b1M4Set.has(m4)) {
        const orphanCount = countByM4(proc.elementFuncs, proc.elementFuncs4M, m4);
        addIssue(warnings, 'WARNING', 'O1', pNo, m4, 'B1', 'B2', 0, orphanCount,
          `공정 "${pNo}" ${m4}: 요소기능(B2) ${orphanCount}개가 있지만 해당 m4의 작업요소(B1)가 없습니다 (고아 데이터)`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // L1 검증 (완제품 레벨 — C items)
  // ═══════════════════════════════════════════════════════════

  for (const prod of products) {
    const cat = prod.productProcessName || '(미지정)';

    // [C6/H5] C1 당 C2 ≥1
    if (prod.productFuncs.length === 0) {
      addIssue(errors, 'ERROR', 'C6', cat, undefined, 'C1', 'C2', 1, 0,
        `구분 "${cat}": 완제품기능(C2)이 없습니다. (최소 1개 필요)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}
