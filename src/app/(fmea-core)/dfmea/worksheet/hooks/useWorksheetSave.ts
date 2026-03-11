// CODEFREEZE
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useWorksheetSave.ts
 * @description 워크시트 저장 관련 로직 분리 (P2)
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { WorksheetState, FMEAProject } from '../constants';
import { FMEAWorksheetDB } from '../schema';
import { migrateToAtomicDB } from '../migration';
import { saveWorksheetDB } from '../db-storage';
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
  // ★★★ 2026-02-23: buildFailureAnalyses 캐시 (구조 데이터 변경 없으면 재사용) ★★★
  const lastStructuralHashRef = useRef<string>('');
  const cachedFailureAnalysesRef = useRef<any[]>([]);

  // 원자성 DB 저장
  const saveAtomicDB = useCallback(async (force?: boolean) => {
    const targetFmeaId = atomicDB?.fmeaId || selectedFmeaId || currentFmea?.id;

    if (!targetFmeaId) {
      return;
    }

    if (!force && suppressAutoSaveRef.current) {
      return;
    }
    // force 모드 로그 생략 (성능)

    // ★ P0-3: 완전히 빈 데이터 DB 덮어쓰기 방지
    const preCheckState = stateRef.current;
    const preCheckL2Count = preCheckState.l2?.length || 0;
    const preCheckFMCount = preCheckState.l2?.reduce((acc: number, p: any) => acc + (p.failureModes?.length || 0), 0) || 0;
    const preCheckFECount = (preCheckState.l1 as any)?.failureScopes?.length || 0;
    const preCheckL1FuncCount = (preCheckState.l1 as any)?.types?.reduce(
      (acc: number, t: any) => acc + (t.functions?.length || 0), 0
    ) || 0;
    // ★★★ 2026-02-18: force=true(확정)이면 가드 스킵 + structureConfirmed면 허용 ★★★
    const preCheckStructConfirmed = (preCheckState as any).structureConfirmed === true;
    if (!force && !preCheckStructConfirmed && preCheckL2Count === 0 && preCheckFMCount === 0 && preCheckFECount === 0 && preCheckL1FuncCount === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const currentState = stateRef.current;

      const normalizedFailureLinks = normalizeFailureLinks((currentState as any).failureLinks || [], currentState);
      const legacyData = {
        fmeaId: targetFmeaId,
        l1: currentState.l1,
        l2: currentState.l2,
        failureLinks: normalizedFailureLinks,
        // ★★★ 2026-02-03: riskData 추가 (예방관리/검출관리 등 DB 저장) ★★★
        riskData: currentState.riskData || {},
        // ★★★ 2026-02-10: fmea4Rows 추가 (FMEA 4판 데이터 DB 저장) ★★★
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

      // ★★★ 2026-02-23: 구조 해시 기반 buildFailureAnalyses 캐시 (riskData만 변경 시 스킵) ★★★
      if (newAtomicDB.failureLinks.length > 0 && newAtomicDB.confirmed.failureLink) {
        const structuralHash = JSON.stringify({
          fl: newAtomicDB.failureLinks.length,
          fe: newAtomicDB.failureEffects.length,
          fm: newAtomicDB.failureModes.length,
          fc: newAtomicDB.failureCauses.length,
          l2: newAtomicDB.l2Structures.length,
          l3: newAtomicDB.l3Structures.length,
          flc: (newAtomicDB as any).confirmed?.failureLink,
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

      // ★★★ 2026-02-18: force=true(확정) 시 forceOverwrite 전달 → 서버 덮어쓰기 가드 우회 ★★★
      const dbToSave = force ? { ...newAtomicDB, forceOverwrite: true } : newAtomicDB;
      await saveWorksheetDB(dbToSave as any, legacyData);
      setAtomicDB(newAtomicDB);

      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
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
    // ★★★ 2026-02-18: 구조확정 상태면 무조건 저장 허용 (공정 1개도 유효) ★★★
    const isStructureConfirmed = (currentState as any).structureConfirmed === true;
    // ★ l2ProcessCount === 0 으로 완화 (기존 <= 1은 공정 1개 저장 차단 버그)
    if (!force && !isStructureConfirmed && l2ProcessCount === 0 && l2FMCount === 0 && feScopeCount === 0 && l1FuncCount === 0) {
      return;
    }

    setIsSaving(true);
    try {
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

      // DB 저장만 수행 (localStorage 제거)
      const newAtomicDB = migrateToAtomicDB(worksheetData);
      // ★★★ 2026-02-18: force=true(확정) 시 forceOverwrite 전달 ★★★
      const dbToSave = force ? { ...newAtomicDB, forceOverwrite: true } : newAtomicDB;
      saveWorksheetDB(dbToSave as any, worksheetData).catch(e => console.error('[저장] DB 저장 오류:', e));
      setAtomicDB(newAtomicDB);

      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
    } catch (e) {
      console.error('[저장] 오류:', e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedFmeaId, currentFmea?.id, setAtomicDB, stateRef, suppressAutoSaveRef, setIsSaving, setDirty, setLastSaved]);

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
      // ★★★ 2026-02-23: 이중 저장 제거 — saveAtomicDB만 호출 (saveToLocalStorage도 동일 DB POST하여 2회 중복) ★★★
      saveAtomicDB().catch(e => console.error('[자동저장] 원자성 DB 저장 오류:', e));
    }, 500);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [stateRef.current, selectedFmeaId, currentFmea?.id, saveAtomicDB, suppressAutoSaveRef]);

  return {
    saveAtomicDB,
    saveToLocalStorage,
    saveToLocalStorageOnly,
  };
}
