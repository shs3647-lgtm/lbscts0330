// CODEFREEZE-LIFTED: 2026-03-15 migrateToAtomicDB 제거 + atomicDbSaver 연결
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useWorksheetSave.ts
 * @description 워크시트 저장 로직 — atomicDB가 있으면 직접 저장, 없으면 legacy 변환 폴백
 *
 * 핵심 변경 (2026-03-15):
 * - atomicDB가 이미 존재하면 migrateToAtomicDB를 호출하지 않음
 * - UUID가 매번 재생성되어 FailureAnalysis 187건 연쇄 삭제되던 버그 해결
 * - atomicDbSaver.saveAtomicDB()를 사용하여 기존 link ID 보존
 * - legacy-only 상태(atomicDB 미존재)에서는 기존 migrateToAtomicDB 경로 유지
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { WorksheetState, FMEAProject } from '../constants';
import { FMEAWorksheetDB } from '../schema';
import { migrateToAtomicDB } from '../migration';
import { saveWorksheetDB } from '../db-storage';
import { saveAtomicDB as saveAtomicDBDirect } from './atomicDbSaver';
import { normalizeFailureLinks } from './useFailureLinkUtils';

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
  return {
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
}

/**
 * stateRef(legacy)에서 변경된 failureScopes를 atomicDB.failureEffects에 반영.
 * 사용자가 1L고장분석 탭에서 FE를 추가/수정하면 state.l1.failureScopes가 업데이트되지만
 * ATOMIC PATH는 migrateToAtomicDB를 호출하지 않으므로 별도 동기화 필요.
 * l1FuncId 매핑: migration 패턴에 따라 req.id === l1FuncId (동일 ID)
 */
function syncFailureEffectsFromState(
  db: FMEAWorksheetDB,
  state: WorksheetState,
): FMEAWorksheetDB {
  const failureScopes: Array<{ id?: string; reqId?: string; effect?: string; name?: string; severity?: number; scope?: string }> =
    (state as any).l1?.failureScopes || [];

  if (failureScopes.length === 0 && db.failureEffects.length === 0) return db;

  // 기존 FE를 ID 기준으로 맵핑
  const existingFeById = new Map((db.failureEffects || []).map((fe: any) => [fe.id, fe]));
  const l1FuncIdSet = new Set((db.l1Functions || []).map((f: any) => f.id));

  const syncedEffects = failureScopes
    .filter((fs) => !!(fs.effect || fs.name)) // 빈 FE 제외
    .map((fs) => {
      const feId = fs.id || '';
      if (!feId) return null;

      const existing = existingFeById.get(feId);
      if (existing) {
        // 기존 FE 업데이트 (effect 텍스트 + severity만 변경)
        return {
          ...existing,
          effect: fs.effect || fs.name || existing.effect,
          severity: fs.severity ?? existing.severity,
        };
      }

      // 새 FE: l1FuncId = reqId (migration 패턴: req.id === l1FuncId)
      const l1FuncId = (fs.reqId && l1FuncIdSet.has(fs.reqId))
        ? fs.reqId
        : db.l1Functions?.length > 0 ? (db.l1Functions[0] as any).id : '';
      if (!l1FuncId) return null;

      const l1Func = (db.l1Functions || []).find((f: any) => f.id === l1FuncId);
      const category = (fs.scope as any) || (l1Func as any)?.category || 'Your Plant';

      return {
        id: feId,
        fmeaId: db.fmeaId,
        l1FuncId,
        category,
        effect: fs.effect || fs.name || '',
        severity: fs.severity ?? 0,
      };
    })
    .filter(Boolean);

  return { ...db, failureEffects: syncedEffects as any[] };
}

/**
 * stateRef(legacy)에서 변경된 failureLinks를 atomicDB.failureLinks에 반영.
 * legacy의 failureLinks는 풍부한 텍스트 필드를 가지지만,
 * atomicDB.failureLinks는 fmId/feId/fcId FK만 저장.
 * state에서 링크가 추가/제거되었을 수 있으므로 동기화 필요.
 */
function syncFailureLinksFromState(
  db: FMEAWorksheetDB,
  state: WorksheetState,
): FMEAWorksheetDB {
  const stateLinks = (state as any).failureLinks || [];
  if (stateLinks.length === 0 && db.failureLinks.length === 0) return db;

  // state의 failureLinks에 id가 있으면 그대로, 없으면 기존 DB에서 조회
  const dbLinkById = new Map(db.failureLinks.map((l: any) => [l.id, l]));

  const syncedLinks = stateLinks
    .filter((sl: any) => sl.fmId && sl.fcId) // 최소 FK 필요
    .map((sl: any) => {
      const existing = dbLinkById.get(sl.id);
      if (existing) {
        // 기존 링크 유지 (FK만 갱신)
        return {
          ...existing,
          fmId: sl.fmId,
          feId: sl.feId || existing.feId,
          fcId: sl.fcId,
        };
      }
      // 새로 추가된 링크
      return {
        id: sl.id || '',
        fmId: sl.fmId,
        feId: sl.feId || '',
        fcId: sl.fcId,
      };
    });

  return { ...db, failureLinks: syncedLinks };
}

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

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveHashRef = useRef<string>('');
  // ★ Legacy fallback 전용 캐시 (atomic 경로는 atomicDbSaver 내부에서 캐시)
  const lastStructuralHashRef = useRef<string>('');
  const cachedFailureAnalysesRef = useRef<any[]>([]);

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

    setIsSaving(true);
    try {
      // ★★★ 2026-03-15: DUAL PATH — atomicDB 존재하면 직접 저장, 없으면 legacy 변환 ★★★
      if (atomicDB && Array.isArray(atomicDB.l2Structures)) {
        // ── ATOMIC PATH: UUID 보존, migrateToAtomicDB 호출 없음 ──
        let dbToSave = syncConfirmedFlags(atomicDB, stateRef.current);
        dbToSave = syncFailureLinksFromState(dbToSave, stateRef.current);
        // ★ FE 동기화: 1L고장분석에서 추가/수정된 FE를 atomicDB.failureEffects에 반영
        dbToSave = syncFailureEffectsFromState(dbToSave, stateRef.current);

        // force 모드(확정) 시 forceOverwrite 전달
        if (force) {
          dbToSave = { ...dbToSave, forceOverwrite: true } as any;
        }

        const result = await saveAtomicDBDirect(dbToSave);
        if (result.success) {
          setAtomicDB(dbToSave);
          setDirty(false);
          setLastSaved(new Date().toLocaleTimeString('ko-KR'));
        }
      } else {
        // ── LEGACY FALLBACK: atomicDB가 아직 없는 경우 (첫 로드 직후 등) ──
        const currentState = stateRef.current;
        const normalizedFailureLinks = normalizeFailureLinks((currentState as any).failureLinks || [], currentState);
        const legacyData = {
          fmeaId: targetFmeaId,
          l1: currentState.l1,
          l2: currentState.l2,
          failureLinks: normalizedFailureLinks,
          riskData: currentState.riskData || {},
          fmea4Rows: (currentState as any).fmea4Rows || [],
          structureConfirmed: (currentState as any).structureConfirmed || false,
          l1Confirmed: (currentState as any).l1Confirmed || false,
          l2Confirmed: (currentState as any).l2Confirmed || false,
          l3Confirmed: (currentState as any).l3Confirmed || false,
          failureL1Confirmed: (currentState as any).failureL1Confirmed || false,
          failureL2Confirmed: (currentState as any).failureL2Confirmed || false,
          failureL3Confirmed: (currentState as any).failureL3Confirmed || false,
          failureLinkConfirmed: (currentState as any).failureLinkConfirmed || false,
        };

        const newAtomicDB = migrateToAtomicDB(legacyData);

        // failureAnalyses 캐시 (legacy path만 — atomic path는 atomicDbSaver 내부 캐시)
        if (newAtomicDB.failureLinks.length > 0 && newAtomicDB.confirmed.failureLink) {
          const structuralHash = JSON.stringify({
            fl: newAtomicDB.failureLinks.length,
            fe: newAtomicDB.failureEffects.length,
            fm: newAtomicDB.failureModes.length,
            fc: newAtomicDB.failureCauses.length,
            l2: newAtomicDB.l2Structures.length,
            l3: newAtomicDB.l3Structures.length,
            flc: (newAtomicDB as any).confirmed?.failureLink,
            lk0: newAtomicDB.failureLinks[0]?.id || '',
          });
          if (structuralHash !== lastStructuralHashRef.current || cachedFailureAnalysesRef.current.length === 0) {
            const { buildFailureAnalyses } = await import('../utils/failure-analysis-builder');
            newAtomicDB.failureAnalyses = buildFailureAnalyses(newAtomicDB);
            lastStructuralHashRef.current = structuralHash;
            cachedFailureAnalysesRef.current = newAtomicDB.failureAnalyses;
          } else {
            newAtomicDB.failureAnalyses = cachedFailureAnalysesRef.current;
          }
        } else {
          newAtomicDB.failureAnalyses = [];
        }

        const dbToSave = force ? { ...newAtomicDB, forceOverwrite: true } : newAtomicDB;
        await saveWorksheetDB(dbToSave as any, legacyData);
        setAtomicDB(newAtomicDB);
        setDirty(false);
        setLastSaved(new Date().toLocaleTimeString('ko-KR'));
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

    setIsSaving(true);
    try {
      // ★★★ 2026-03-15: DUAL PATH — atomicDB 직접 저장 / legacy 변환 폴백 ★★★
      if (atomicDB && Array.isArray(atomicDB.l2Structures)) {
        // ── ATOMIC PATH ──
        let dbToSave = syncConfirmedFlags(atomicDB, currentState);
        dbToSave = syncFailureLinksFromState(dbToSave, currentState);
        // ★ FE 동기화
        dbToSave = syncFailureEffectsFromState(dbToSave, currentState);
        if (force) {
          dbToSave = { ...dbToSave, forceOverwrite: true } as any;
        }
        saveAtomicDBDirect(dbToSave).then(result => {
          if (result.success) {
            setAtomicDB(dbToSave);
          }
        }).catch(e => console.error('[저장] DB 저장 오류:', e));
      } else {
        // ── LEGACY FALLBACK ──
        const normalizedFailureLinks = normalizeFailureLinks((currentState as any).failureLinks || [], currentState);
        const worksheetData = {
          fmeaId: targetId,
          l1: currentState.l1,
          l2: currentState.l2,
          tab: currentState.tab,
          structureConfirmed: (currentState as any).structureConfirmed || false,
          l1Confirmed: (currentState as any).l1Confirmed || false,
          l2Confirmed: (currentState as any).l2Confirmed || false,
          l3Confirmed: (currentState as any).l3Confirmed || false,
          failureL1Confirmed: (currentState as any).failureL1Confirmed || false,
          failureL2Confirmed: (currentState as any).failureL2Confirmed || false,
          failureL3Confirmed: (currentState as any).failureL3Confirmed || false,
          failureLinkConfirmed: (currentState as any).failureLinkConfirmed || false,
          failureLinks: normalizedFailureLinks,
          riskData: currentState.riskData || {},
          fmea4Rows: (currentState as any).fmea4Rows || [],
          savedAt: new Date().toISOString(),
        };

        const newAtomicDB = migrateToAtomicDB(worksheetData);
        const dbToSave = force ? { ...newAtomicDB, forceOverwrite: true } : newAtomicDB;
        saveWorksheetDB(dbToSave as any, worksheetData).catch(e => console.error('[저장] DB 저장 오류:', e));
        setAtomicDB(newAtomicDB);
      }

      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
    } catch (e) {
      console.error('[저장] 오류:', e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedFmeaId, currentFmea?.id, atomicDB, setAtomicDB, stateRef, suppressAutoSaveRef, setIsSaving, setDirty, setLastSaved]);

  // 자동저장 useEffect
  useEffect(() => {
    if (suppressAutoSaveRef.current) return;
    if (!selectedFmeaId && !currentFmea?.id) return;

    const snapshot = {
      l1: stateRef.current.l1,
      l2: stateRef.current.l2,
      failureLinks: (stateRef.current as any).failureLinks || [],
      confirmed: {
        structureConfirmed: (stateRef.current as any).structureConfirmed || false,
        l1Confirmed: (stateRef.current as any).l1Confirmed || false,
        l2Confirmed: (stateRef.current as any).l2Confirmed || false,
        l3Confirmed: (stateRef.current as any).l3Confirmed || false,
        failureL1Confirmed: (stateRef.current as any).failureL1Confirmed || false,
        failureL2Confirmed: (stateRef.current as any).failureL2Confirmed || false,
        failureL3Confirmed: (stateRef.current as any).failureL3Confirmed || false,
        failureLinkConfirmed: (stateRef.current as any).failureLinkConfirmed || false,
      },
      riskData: stateRef.current.riskData || {},
      // ★★★ 2026-02-10: fmea4Rows 추가 (FMEA 4판 자동저장) ★★★
      fmea4Rows: (stateRef.current as any).fmea4Rows || [],
    };

    const hash = JSON.stringify(snapshot);
    if (lastAutoSaveHashRef.current && hash === lastAutoSaveHashRef.current) return;
    lastAutoSaveHashRef.current = hash;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      // ★★★ 2026-02-18: 타이머 발동 시점에도 suppress 재확인 (레이스컨디션 방지) ★★★
      if (suppressAutoSaveRef.current) return;
      // ★★★ 2026-02-23: 이중 저장 제거 — saveAtomicDB만 호출 ★★★
      saveAtomicDBCallback().catch(e => console.error('[자동저장] 원자성 DB 저장 오류:', e));
    }, 500);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [stateRef.current, selectedFmeaId, currentFmea?.id, saveAtomicDBCallback, suppressAutoSaveRef]);

  return {
    saveAtomicDB: saveAtomicDBCallback,
    saveToLocalStorage,
    saveToLocalStorageOnly,
  };
}
