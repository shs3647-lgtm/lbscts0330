/**
 * @file structureGuard.ts
 * @description 구조 불변성 보호 모듈 — 콘크리트 구조
 * @created 2026-02-17
 *
 * ★ 핵심 원칙:
 *   구조(뼈대) = L2 공정, L3 작업요소의 id/no/name/m4 → 절대 불변
 *   데이터(내용물) = functions, processChars, failureModes 등 → 교체 가능
 *
 * ★ 보호 메커니즘:
 *   1. L2 공정 수 줄어들면 → 거부 (원본 반환)
 *   2. L3 작업요소 수 줄어들면 → 거부
 *   3. L3의 id/m4 변경 감지 → 거부
 *   4. functions가 빈 배열이면 → placeholder 자동 삽입 (최소 1개 보장)
 *   5. 모든 검증 실패 시 → 원본 state 반환 (안전 폴백)
 *
 * ★ 사용처:
 *   - applyAutoMapping 후 반드시 실행
 *   - 향후 모든 자동 state 업데이트에 적용 가능
 */

import { uid } from '../constants';
import type { WorksheetState, Process, WorkElement } from '../constants';

// ============ 구조 스냅샷 (비교용) ============

/** L3 구조 스냅샷 — id + m4만 기록 (비교 최소 단위) */
interface L3Snapshot {
  id: string;
  m4: string;
}

/** L2 구조 스냅샷 — id + no + L3 배열 */
interface L2Snapshot {
  id: string;
  no: string;
  l3: L3Snapshot[];
}

/** 전체 구조 스냅샷 */
interface StructureSnapshot {
  l2: L2Snapshot[];
}

/** state에서 구조 스냅샷 추출 */
export function takeStructureSnapshot(state: WorksheetState): StructureSnapshot {
  return {
    l2: (state.l2 || []).map(proc => ({
      id: proc.id,
      no: (proc.no || '').trim(),
      l3: (proc.l3 || []).map(we => ({
        id: we.id,
        m4: (we.m4 || '').trim().toUpperCase(),
      })),
    })),
  };
}

// ============ 구조 검증 ============

export interface StructureViolation {
  type: 'L2_DELETED' | 'L2_MODIFIED' | 'L3_DELETED' | 'L3_MODIFIED';
  message: string;
}

/**
 * 구조 불변성 검증 — 변경 전후 스냅샷 비교
 * @returns 위반 목록 (빈 배열이면 안전)
 */
export function validateStructuralIntegrity(
  before: StructureSnapshot,
  after: StructureSnapshot,
): StructureViolation[] {
  const violations: StructureViolation[] = [];

  // 1. L2 수 줄어들면 위반
  if (after.l2.length < before.l2.length) {
    violations.push({
      type: 'L2_DELETED',
      message: `L2 공정 삭제 감지: ${before.l2.length} → ${after.l2.length}`,
    });
  }

  // 2. 기존 L2 공정의 id/no 변경 감지
  for (let i = 0; i < before.l2.length; i++) {
    const orig = before.l2[i];
    const curr = after.l2[i];
    if (!curr) continue; // L2 삭제는 위에서 이미 감지

    if (curr.id !== orig.id) {
      violations.push({
        type: 'L2_MODIFIED',
        message: `L2[${i}] ID 변경: ${orig.id} → ${curr.id}`,
      });
    }
    if (curr.no !== orig.no) {
      violations.push({
        type: 'L2_MODIFIED',
        message: `L2[${i}] 공정번호 변경: ${orig.no} → ${curr.no}`,
      });
    }

    // 3. L3 수 줄어들면 위반
    if (curr.l3.length < orig.l3.length) {
      violations.push({
        type: 'L3_DELETED',
        message: `L2[${i}](${orig.no}) L3 삭제: ${orig.l3.length} → ${curr.l3.length}`,
      });
    }

    // 4. L3의 id/m4 변경 감지
    for (let j = 0; j < orig.l3.length; j++) {
      const origWe = orig.l3[j];
      const currWe = curr.l3[j];
      if (!currWe) continue;

      if (currWe.id !== origWe.id) {
        violations.push({
          type: 'L3_MODIFIED',
          message: `L2[${i}].L3[${j}] ID 변경: ${origWe.id} → ${currWe.id}`,
        });
      }
      if (currWe.m4 !== origWe.m4) {
        violations.push({
          type: 'L3_MODIFIED',
          message: `L2[${i}].L3[${j}] m4 변경: ${origWe.m4} → ${currWe.m4}`,
        });
      }
    }
  }

  return violations;
}

// ============ 최소 함수 보장 (Minimum Function Guarantee) ============

/**
 * 모든 L3 작업요소에 최소 1개의 function placeholder 보장
 * functions가 빈 배열([])이면 placeholder 삽입
 *
 * ★ 이것이 "콘크리트 구조"의 핵심:
 *   - L3가 존재하면 반드시 functions[0]이 있음
 *   - 렌더링 시 빈 행이 될 수 없음
 *   - rowSpan 계산이 0이 될 수 없음
 */
export function ensureMinimumFunctions(state: WorksheetState): WorksheetState {
  let repaired = false;

  const newL2 = (state.l2 || []).map((proc: Process) => {
    const newL3 = (proc.l3 || []).map((we: WorkElement) => {
      if (!we.functions || we.functions.length === 0) {
        repaired = true;
        return {
          ...we,
          functions: [{
            id: uid(),
            name: '',
            processChars: [{ id: uid(), name: '', specialChar: '' }],
          }],
        };
      }

      // functions 내부의 processChars도 최소 1개 보장
      const repairedFuncs = we.functions.map(fn => {
        if (!fn.processChars || fn.processChars.length === 0) {
          repaired = true;
          return {
            ...fn,
            processChars: [{ id: uid(), name: '', specialChar: '' }],
          };
        }
        return fn;
      });

      if (repairedFuncs !== we.functions) {
        return { ...we, functions: repairedFuncs };
      }
      return we;
    });

    if (newL3 !== proc.l3) {
      return { ...proc, l3: newL3 };
    }
    return proc;
  });

  if (repaired) {
    return { ...state, l2: newL2 };
  }
  return state;
}

// ============ L2 최소 함수 보장 ============

/**
 * 모든 L2 공정에 최소 1개의 function placeholder 보장
 */
export function ensureMinimumL2Functions(state: WorksheetState): WorksheetState {
  let repaired = false;

  const newL2 = (state.l2 || []).map((proc: Process) => {
    if (!proc.functions || proc.functions.length === 0) {
      repaired = true;
      return {
        ...proc,
        functions: [{
          id: uid(),
          name: '',
          productChars: [{ id: uid(), name: '', specialChar: '' }],
        }],
      };
    }

    // functions 내부의 productChars도 최소 1개 보장
    let funcRepaired = false;
    const repairedFuncs = proc.functions.map(fn => {
      if (!fn.productChars || fn.productChars.length === 0) {
        funcRepaired = true;
        return {
          ...fn,
          productChars: [{ id: uid(), name: '', specialChar: '' }],
        };
      }
      return fn;
    });

    if (funcRepaired) {
      repaired = true;
      return { ...proc, functions: repairedFuncs };
    }
    return proc;
  });

  if (repaired) {
    return { ...state, l2: newL2 };
  }
  return state;
}

// ============ 통합 보호 함수 ============

/**
 * 자동매핑 후 구조 불변성 보호 실행
 *
 * @param originalState - 변경 전 state (원본)
 * @param newState - 변경 후 state (자동매핑 적용 결과)
 * @returns 보호된 state (위반 시 원본 반환, 정상이면 빈 함수 보정 후 반환)
 */
export function protectStructure(
  originalState: WorksheetState,
  newState: WorksheetState,
): WorksheetState {
  const before = takeStructureSnapshot(originalState);
  const after = takeStructureSnapshot(newState);

  const violations = validateStructuralIntegrity(before, after);

  if (violations.length > 0) {
    // ★ 구조 위반 감지 → 원본 반환 (안전 폴백)
    console.error('[StructureGuard] ❌ 구조 불변성 위반 감지! 원본 state 복원.');
    violations.forEach(v => console.error(`  - [${v.type}] ${v.message}`));
    alert(
      '❌ 구조 보호 위반 감지!\n\n' +
      '자동매핑이 워크시트 구조를 변경하려 했습니다.\n' +
      '구조 보호를 위해 변경을 취소합니다.\n\n' +
      '위반 내용:\n' +
      violations.map(v => `• ${v.message}`).join('\n'),
    );
    return originalState;
  }

  // 구조 OK → 빈 함수 보정
  return ensureMinimumFunctions(newState);
}
