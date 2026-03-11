/**
 * @file useArrayGuard.ts
 * @description WorksheetState 배열 구조 무결성 안전망 (2026-03-07)
 *
 * 비유: 건물의 스프링클러 시스템. 화재(배열 깨짐)가 발생하면 자동으로 작동하여
 * 피해를 최소화한다. 평소에는 아무것도 안 하지만, 위기 시 구조를 자동 복구한다.
 *
 * 방어 대상:
 * - l2 배열이 null/undefined/빈배열 → placeholder 공정 자동 생성
 * - l2[].l3 배열이 null/undefined → 빈 배열로 복구
 * - l3[].functions 배열이 null/undefined → placeholder 기능 생성
 * - functions[].processChars 배열이 null/undefined → placeholder 특성 생성
 * - failureModes/failureCauses 배열이 null → 빈 배열로 복구
 *
 * 사용법:
 *   useArrayGuard(state, setState, setStateSynced);
 *   // 또는 단발성 검증:
 *   const repaired = repairWorksheetState(state);
 */

import { useEffect, useRef } from 'react';
import { WorksheetState } from '../constants';

/** uid 생성 (constants.ts의 uid와 동일 패턴) */
const guardUid = () => `guard_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * WorksheetState의 L1 + L2 배열 구조를 검증하고, 깨진 부분을 복구한다.
 * 원본을 변경하지 않고 새 객체를 반환한다 (불변성 준수).
 *
 * 보호 대상 (2026-03-07 확장):
 * - L1: types 배열 (최소 1개 타입 보장), failureScopes (null→빈배열)
 * - L1 types[].functions (최소 1개 기능 보장)
 * - L1 functions[].requirements (빈 배열 허용, null/undefined 복구)
 * - L2: l2, l3, functions, productChars, processChars, failureModes, failureCauses
 *
 * @returns { repaired: boolean, state: WorksheetState } - 복구 여부 + 복구된 상태
 */
export function repairWorksheetState(state: WorksheetState): { repaired: boolean; state: WorksheetState } {
  let repaired = false;
  const repairs: string[] = [];
  let newState = state;

  // ═══════════════════════════════════════════
  // 0. L1 구조 보호 (완제품공정명 = 최상위 구조)
  //    L1이 깨지면 전체 워크시트 렌더링이 붕괴한다.
  // ═══════════════════════════════════════════
  if (state.l1) {
    let l1Repaired = false;
    let newL1 = state.l1;

    // 0a. types 배열이 없거나 빈 경우 → 기본 3개 구분 복구
    if (!newL1.types || !Array.isArray(newL1.types) || newL1.types.length === 0) {
      repairs.push('l1.types 없음 → 기본 YP/SP/USER 복구');
      newL1 = {
        ...newL1,
        types: [
          { id: guardUid(), name: 'YP', functions: [{ id: guardUid(), name: '', requirements: [] }] },
          { id: guardUid(), name: 'SP', functions: [{ id: guardUid(), name: '', requirements: [] }] },
          { id: guardUid(), name: 'USER', functions: [{ id: guardUid(), name: '', requirements: [] }] },
        ],
      };
      l1Repaired = true;
    } else {
      // 0b. 각 type의 functions 배열 검증
      const newTypes = newL1.types.map((t: any, tIdx: number) => {
        if (!t.functions || !Array.isArray(t.functions) || t.functions.length === 0) {
          repairs.push(`l1.types[${tIdx}].functions 없음 → placeholder 기능 생성`);
          l1Repaired = true;
          return { ...t, functions: [{ id: guardUid(), name: '', requirements: [] }] };
        }
        // 0c. 각 function의 requirements 배열 검증 (null→빈배열)
        const newFuncs = t.functions.map((f: any, fIdx: number) => {
          if (f.requirements !== undefined && !Array.isArray(f.requirements)) {
            repairs.push(`l1.types[${tIdx}].functions[${fIdx}].requirements non-array → 빈 배열`);
            l1Repaired = true;
            return { ...f, requirements: [] };
          }
          return f;
        });
        if (l1Repaired) return { ...t, functions: newFuncs };
        return t;
      });
      if (l1Repaired) {
        newL1 = { ...newL1, types: newTypes };
      }
    }

    // 0d. failureScopes 배열 검증 (null/undefined→빈배열, non-array→빈배열)
    if (newL1.failureScopes !== undefined && !Array.isArray(newL1.failureScopes)) {
      repairs.push('l1.failureScopes non-array → 빈 배열');
      newL1 = { ...newL1, failureScopes: [] };
      l1Repaired = true;
    }

    if (l1Repaired) {
      repaired = true;
      newState = { ...newState, l1: newL1 };
    }
  }

  // ═══════════════════════════════════════════
  // 1. l2 배열 자체가 없거나 빈 경우
  // ═══════════════════════════════════════════
  if (!newState.l2 || !Array.isArray(newState.l2) || newState.l2.length === 0) {
    repairs.push('l2 배열 없음 → placeholder 공정 생성');
    const repairedState: WorksheetState = {
      ...newState,
      l2: [{
        id: guardUid(), no: '', name: '', order: 0,
        l3: [{ id: guardUid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
        functions: [], failureModes: [], failureCauses: [],
      }],
    };
    console.error('[ArrayGuard] l2 배열 복구:', repairs.join(', '));
    return { repaired: true, state: repairedState };
  }

  // ═══════════════════════════════════════════
  // 2. 각 공정(l2) 내부 검증
  // ═══════════════════════════════════════════
  const newL2 = newState.l2.map((proc, pIdx) => {
    let procRepaired = false;
    let newProc = proc;

    // 2a. l3 배열 검증
    if (!proc.l3 || !Array.isArray(proc.l3)) {
      repairs.push(`l2[${pIdx}].l3 null → 빈 placeholder 생성`);
      newProc = {
        ...newProc,
        l3: [{ id: guardUid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
      };
      procRepaired = true;
    } else if (proc.l3.length === 0) {
      repairs.push(`l2[${pIdx}].l3 빈배열 → placeholder 추가`);
      newProc = {
        ...newProc,
        l3: [{ id: guardUid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
      };
      procRepaired = true;
    } else {
      // 2b. 각 작업요소(l3) 내부 검증
      const newL3 = proc.l3.map((we, wIdx) => {
        let weRepaired = false;
        let newWe = we;

        // functions 배열 검증
        if (!we.functions || !Array.isArray(we.functions)) {
          repairs.push(`l2[${pIdx}].l3[${wIdx}].functions null → 빈 배열`);
          newWe = { ...newWe, functions: [] };
          weRepaired = true;
        } else {
          // 각 function의 processChars 검증
          const newFuncs = we.functions.map((f: any, fIdx: number) => {
            if (!f.processChars || !Array.isArray(f.processChars)) {
              repairs.push(`l2[${pIdx}].l3[${wIdx}].functions[${fIdx}].processChars null → 빈 배열`);
              weRepaired = true;
              return { ...f, processChars: [] };
            }
            return f;
          });
          if (weRepaired) {
            newWe = { ...newWe, functions: newFuncs };
          }
        }

        if (weRepaired) { procRepaired = true; return newWe; }
        return we;
      });

      if (procRepaired) {
        newProc = { ...newProc, l3: newL3 };
      }
    }

    // 2c. functions 배열 검증 (L2 레벨)
    if (!proc.functions || !Array.isArray(proc.functions)) {
      repairs.push(`l2[${pIdx}].functions null → 빈 배열`);
      newProc = { ...newProc, functions: [] };
      procRepaired = true;
    }

    // 2d. failureModes 검증
    if (proc.failureModes !== undefined && !Array.isArray(proc.failureModes)) {
      repairs.push(`l2[${pIdx}].failureModes non-array → 빈 배열`);
      newProc = { ...newProc, failureModes: [] };
      procRepaired = true;
    }

    // 2e. failureCauses 검증
    if (proc.failureCauses !== undefined && !Array.isArray(proc.failureCauses)) {
      repairs.push(`l2[${pIdx}].failureCauses non-array → 빈 배열`);
      newProc = { ...newProc, failureCauses: [] };
      procRepaired = true;
    }

    if (procRepaired) { repaired = true; return newProc; }
    return proc;
  });

  if (repaired) {
    console.error('[ArrayGuard] 구조 복구 실행:', repairs.join(' | '));
    return { repaired: true, state: { ...newState, l2: newL2 } };
  }

  return { repaired: false, state: newState };
}

/**
 * 워크시트 상태의 배열 구조를 실시간 감시하고 자동 복구하는 훅.
 * state.l2가 변경될 때마다 구조를 검증하여, 깨진 부분이 있으면 자동 복구한다.
 *
 * 정상 상태에서는 아무 작업도 하지 않는다 (성능 영향 최소).
 */
export function useArrayGuard(
  state: WorksheetState,
  setState: (fn: (prev: WorksheetState) => WorksheetState) => void,
  setStateSynced?: (fn: (prev: WorksheetState) => WorksheetState) => void,
) {
  const lastRepairRef = useRef<number>(0);

  useEffect(() => {
    // 빈번한 복구 루프 방지: 최소 1초 간격
    const now = Date.now();
    if (now - lastRepairRef.current < 1000) return;

    const { repaired, state: repairedState } = repairWorksheetState(state);

    if (repaired) {
      lastRepairRef.current = now;
      console.error('[ArrayGuard] 자동 복구 적용');
      const updateFn = () => repairedState;
      if (setStateSynced) setStateSynced(updateFn);
      else setState(updateFn);
    }
  }, [state.l1, state.l2, setState, setStateSynced]); // eslint-disable-line react-hooks/exhaustive-deps
}
