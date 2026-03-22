// CODEFREEZE-LIFTED: 2026-03-21 legacy round-trip 제거 — atomicDB 직접 저장
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useWorksheetSave.ts
 * @description 워크시트 저장 로직 — Atomic DB 직접 저장 (legacy round-trip 완전 제거)
 *
 * 핵심 변경 (2026-03-21):
 * - legacy round-trip 완전 제거: stateRef → migrateToAtomicDB → save 경로 삭제
 * - atomicDB를 DB에서 로드된 그대로 저장 (confirmed 플래그만 stateRef에서 동기화)
 * - syncFailureEffectsFromState/syncFailureLinksFromState 등 legacy→atomic 동기화 함수 제거
 * - 자동저장 useEffect 비활성화 (편집 파이프라인 atomic 전환 완료 후 재활성화 예정)
 *
 * 2026-03-20: Legacy fallback 경로 완전 제거 — Atomic DB만 사용
 */

'use client';

import { useCallback } from 'react';
import { WorksheetState, FMEAProject } from '../constants';
import { FMEAWorksheetDB } from '../schema';
import { saveAtomicDB as saveAtomicDBDirect } from './atomicDbSaver';

interface UseWorksheetSaveParams {
  selectedFmeaId: string | null;
  currentFmea: FMEAProject | null;
  atomicDB: FMEAWorksheetDB | null;
  setAtomicDB: React.Dispatch<React.SetStateAction<FMEAWorksheetDB | null>>;
  stateRef: React.MutableRefObject<WorksheetState>;
  suppressAutoSaveRef: React.MutableRefObject<boolean>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setLastSaved: React.Dispatch<React.SetStateAction<string>>;
}

interface UseWorksheetSaveReturn {
  saveAtomicDB: (force?: boolean) => Promise<void>;
  saveToLocalStorage: (force?: boolean) => void;  // ✅ 2026-01-22: force 파라미터 추가
  saveToLocalStorageOnly: () => void;
}

// ── 헬퍼: atomicDB에 현재 stateRef의 confirmed 상태 + riskData 반영 ──

function syncConfirmedFlags(db: FMEAWorksheetDB, state: WorksheetState): FMEAWorksheetDB {
  const result = {
    ...db,
    confirmed: {
      ...db.confirmed,
      structure: (state as any).structureConfirmed || false,
      l1Function: (state as any).l1Confirmed || false,
      l2Function: (state as any).l2Confirmed || false,
      l3Function: (state as any).l3Confirmed || false,
      l1Failure: (state as any).failureL1Confirmed || false,
      l2Failure: (state as any).failureL2Confirmed || false,
      l3Failure: (state as any).failureL3Confirmed || false,
      failureLink: (state as any).failureLinkConfirmed || false,
    },
  };

  // ★★★ 2026-03-22: L1Function 편집 내용을 atomicDB에 역동기화
  // state.l1.types → atomicDB.l1Functions (functionName, requirement, category)
  // 근본원인: 사용자 편집이 state에만 반영되고 atomicDB에 전파되지 않아 저장 시 편집 손실
  const types = (state.l1 as any)?.types;
  if (Array.isArray(types) && types.length > 0 && Array.isArray(db.l1Functions) && db.l1Functions.length > 0) {
    // state.l1.types에서 L1Function ID → {functionName, requirement, category} 매핑 구축
    const stateL1FMap = new Map<string, { functionName: string; requirement: string; category: string }>();
    for (const type of types) {
      const category = (type.name || '').trim();
      if (!category) continue;
      for (const func of (type.functions || [])) {
        const functionName = (func.name || '').trim();
        for (const req of (func.requirements || [])) {
          if (req.id) {
            stateL1FMap.set(req.id, { functionName, requirement: (req.name || '').trim(), category });
          }
        }
        // C2 without C3: function ID = L1Function ID
        if ((func.requirements || []).length === 0 && func.id) {
          stateL1FMap.set(func.id, { functionName, requirement: '', category });
        }
      }
    }

    // atomicDB.l1Functions에 편집 내용 반영 (ID 기반 매칭, FK 보존)
    if (stateL1FMap.size > 0) {
      result.l1Functions = db.l1Functions.map(f => {
        const edited = stateL1FMap.get(f.id);
        if (!edited) return f;
        // 값이 변경된 경우에만 업데이트 (불필요한 mutation 방지)
        const changed = f.functionName !== edited.functionName ||
          f.requirement !== edited.requirement ||
          f.category !== edited.category;
        return changed ? { ...f, functionName: edited.functionName, requirement: edited.requirement, category: edited.category } : f;
      });
    }
  }

  return result;
}

// ── REMOVED: syncFailureEffectsFromState, syncFailureLinksFromState ──
// These functions synced FROM legacy state TO atomicDB (reverse direction).
// This round-trip (Atomic → legacy → Atomic) destroyed data because legacy
// cannot represent all FK relationships (e.g., Cu Target FC merged with Ti Target FC).
// AtomicDB is now saved directly without going through stateRef/legacy.

// ── REMOVED: syncFailureCausesFromState, syncFailureModesFromState ──
// These functions synced FROM legacy state TO atomicDB (reverse direction).
// Removed as part of legacy round-trip elimination (2026-03-21).

// ── REMOVED: syncRiskAnalysesFromState, _calcSimpleAP, _AP_TABLE, syncOptimizationsFromState ──
// These functions synced FROM legacy riskData TO atomicDB (reverse direction).
// Removed as part of legacy round-trip elimination (2026-03-21).

export function useWorksheetSave({
  selectedFmeaId,
  currentFmea,
  atomicDB,
  setAtomicDB,
  stateRef,
  suppressAutoSaveRef,
  setIsSaving,
  setDirty,
  setLastSaved,
}: UseWorksheetSaveParams): UseWorksheetSaveReturn {

  // autoSaveTimeoutRef/lastAutoSaveHashRef removed — auto-save disabled (2026-03-21)

  // ── 원자성 DB 저장 ──
  const saveAtomicDBCallback = useCallback(async (force?: boolean) => {
    const targetFmeaId = atomicDB?.fmeaId || selectedFmeaId || currentFmea?.id;

    if (!targetFmeaId) {
      return;
    }

    if (!force && suppressAutoSaveRef.current) {
      return;
    }

    // ★ P0-3: 완전히 빈 데이터 DB 덮어쓰기 방지
    const preCheckState = stateRef.current;
    const preCheckL2Count = preCheckState.l2?.length || 0;
    const preCheckFMCount = preCheckState.l2?.reduce((acc: number, p: any) => acc + (p.failureModes?.length || 0), 0) || 0;
    const preCheckFECount = (preCheckState.l1 as any)?.failureScopes?.length || 0;
    const preCheckL1FuncCount = (preCheckState.l1 as any)?.types?.reduce(
      (acc: number, t: any) => acc + (t.functions?.length || 0), 0
    ) || 0;
    const preCheckStructConfirmed = (preCheckState as any).structureConfirmed === true;
    if (!force && !preCheckStructConfirmed && preCheckL2Count === 0 && preCheckFMCount === 0 && preCheckFECount === 0 && preCheckL1FuncCount === 0) {
      return;
    }

    // ★★★ 2026-03-22: atomicDB 빈 데이터 보호 — L1Function/L2Structure 등 핵심 데이터가 비어있으면 저장 차단
    // 근본원인: loadAtomicDB() 실패 → emptyDB → autoSave → DELETE ALL → 데이터 소실
    if (!force && atomicDB) {
      const atomicL1FCount = atomicDB.l1Functions?.length || 0;
      const atomicL2Count = atomicDB.l2Structures?.length || 0;
      if (atomicL1FCount === 0 && atomicL2Count === 0) {
        console.warn('[useWorksheetSave] atomicDB 빈 데이터 저장 차단 — L1F=0, L2=0');
        return;
      }
    }

    setIsSaving(true);
    try {
      // ★★★ 2026-03-21: atomicDB 직접 저장 — legacy round-trip 완전 제거 ★★★
      // atomicDB는 useWorksheetDataLoader에서 DB로부터 로드된 상태 그대로 사용.
      // confirmed 플래그만 stateRef에서 동기화 (안전 — boolean 값만 복사).
      if (atomicDB && Array.isArray(atomicDB.l2Structures)) {
        let dbToSave = syncConfirmedFlags(atomicDB, stateRef.current);

        // force 모드(확정) 시 forceOverwrite 전달
        if (force) {
          dbToSave = { ...dbToSave, forceOverwrite: true } as any;
        }

        const result = await saveAtomicDBDirect(dbToSave, false);
        if (result.success) {
          setAtomicDB(dbToSave);
          setDirty(false);
          setLastSaved(new Date().toLocaleTimeString('ko-KR'));
        }
      }
    } catch (e) {
      console.error('[원자성 DB 저장] 오류:', e);
    } finally {
      setIsSaving(false);
    }
  }, [atomicDB, selectedFmeaId, currentFmea, setAtomicDB, stateRef, suppressAutoSaveRef, setIsSaving, setDirty, setLastSaved]);

  // ★★★ 2026-02-16: DB Only 정책 - saveToLocalStorageOnly는 saveAtomicDB로 대체 ★★★
  const saveToLocalStorageOnly = useCallback(() => {
    // localStorage 저장 제거 - DB 저장은 saveAtomicDB 사용
  }, []);

  // ★★★ 2026-02-16: DB Only 정책 - localStorage 쓰기/읽기 완전 제거 ★★★
  // DB 저장만 수행 (saveAtomicDB와 동일 경로)
  const saveToLocalStorage = useCallback((force?: boolean) => {
    const targetId = selectedFmeaId || currentFmea?.id;
    if (!targetId) {
      return;
    }
    if (!force && suppressAutoSaveRef.current) {
      return;
    }

    const currentState = stateRef.current;

    // 빈 데이터 DB 덮어쓰기 방지
    const l2ProcessCount = currentState.l2?.length || 0;
    const l2FMCount = currentState.l2?.flatMap((p: any) => p.failureModes || []).length || 0;
    const feScopeCount = (currentState.l1 as any).failureScopes?.length || 0;
    const l1FuncCount = (currentState.l1 as any)?.types?.reduce(
      (acc: number, t: any) => acc + (t.functions?.length || 0), 0
    ) || 0;
    const isStructureConfirmed = (currentState as any).structureConfirmed === true;
    if (!force && !isStructureConfirmed && l2ProcessCount === 0 && l2FMCount === 0 && feScopeCount === 0 && l1FuncCount === 0) {
      return;
    }

    // ★★★ 2026-03-22: atomicDB 빈 데이터 보호 (saveToLocalStorage 경로)
    if (!force && atomicDB) {
      const atomicL1FCount = atomicDB.l1Functions?.length || 0;
      const atomicL2Count = atomicDB.l2Structures?.length || 0;
      if (atomicL1FCount === 0 && atomicL2Count === 0) {
        console.warn('[useWorksheetSave] saveToLocalStorage: atomicDB 빈 데이터 저장 차단');
        return;
      }
    }

    setIsSaving(true);
    try {
      // ★★★ 2026-03-21: atomicDB 직접 저장 — legacy round-trip 완전 제거 ★★★
      if (atomicDB && Array.isArray(atomicDB.l2Structures)) {
        let dbToSave = syncConfirmedFlags(atomicDB, currentState);
        if (force) {
          dbToSave = { ...dbToSave, forceOverwrite: true } as any;
        }
        saveAtomicDBDirect(dbToSave, false).then(result => {
          if (result.success) {
            setAtomicDB(dbToSave);
          }
        }).catch(e => console.error('[저장] DB 저장 오류:', e));
      }

      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
    } catch (e) {
      console.error('[저장] 오류:', e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedFmeaId, currentFmea?.id, atomicDB, setAtomicDB, stateRef, suppressAutoSaveRef, setIsSaving, setDirty, setLastSaved]);

  // ★★★ 2026-03-21: 자동저장 useEffect 비활성화 ★★★
  // 이유: legacy round-trip 제거 후, stateRef 변경으로 자동저장을 트리거하면 안 됨.
  // atomicDB는 DB에서 로드된 그대로 보존해야 하며, 편집 파이프라인이 완전히
  // atomic으로 전환된 후에 atomicDB 변경 기반 자동저장을 재활성화할 예정.
  // 수동 저장(saveAtomicDB(true))은 여전히 정상 동작함.

  return {
    saveAtomicDB: saveAtomicDBCallback,
    saveToLocalStorage,
    saveToLocalStorageOnly,
  };
}
