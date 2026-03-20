/**
 * @file useWorksheetDB.ts
 * @description 워크시트 DB 저장/로드 Hook (PFMEA/DFMEA 공용)
 * @version 1.0.0
 *
 * 담당 기능:
 * - localStorage 저장/로드
 * - 원자성 DB 저장 (saveAtomicDB)
 * - failureLinks 정규화
 * - 자동 저장 트리거
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: any 타입은 Atomic DB 데이터 구조 호환성을 위해 의도적으로 사용됨

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { WorksheetState, FailureLink } from '@/shared/types/worksheet';

interface UseWorksheetDBOptions {
  fmeaType: 'PFMEA' | 'DFMEA';
  selectedFmeaId: string | null;
  currentFmeaId: string | null;
  stateRef: React.MutableRefObject<WorksheetState>;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced: (updater: React.SetStateAction<WorksheetState>) => void;
  dirty: boolean;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setLastSaved: React.Dispatch<React.SetStateAction<string>>;
  suppressAutoSaveRef: React.MutableRefObject<boolean>;
  atomicDB: any | null;
  setAtomicDB: React.Dispatch<React.SetStateAction<any | null>>;
  // DB 함수들 (외부 주입)
  migrateToAtomicDB: (data: any) => any;
  saveWorksheetDB: (db: any) => Promise<void>;
  loadWorksheetDBAtomic: (fmeaId: string) => Promise<any>;
  createEmptyDB: (fmeaId: string) => any;
}

interface UseWorksheetDBReturn {
  saveToLocalStorage: () => void;
  saveToLocalStorageOnly: () => void;
  saveAtomicDB: (force?: boolean) => Promise<void>;
  normalizeFailureLinks: (links: FailureLink[], stateSnapshot: WorksheetState) => FailureLink[];
}

export function useWorksheetDB(options: UseWorksheetDBOptions): UseWorksheetDBReturn {
  const {
    fmeaType,
    selectedFmeaId,
    currentFmeaId,
    stateRef,
    setState,
    setStateSynced,
    dirty,
    setDirty,
    setIsSaving,
    setLastSaved,
    suppressAutoSaveRef,
    atomicDB,
    setAtomicDB,
    migrateToAtomicDB,
    saveWorksheetDB,
    loadWorksheetDBAtomic,
    createEmptyDB,
  } = options;

  const prefix = fmeaType.toLowerCase();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveHashRef = useRef<string>('');

  /**
   * 고장연결 데이터 정규화 (ID 누락 방지)
   */
  const normalizeFailureLinks = useCallback((links: FailureLink[], stateSnapshot: WorksheetState): FailureLink[] => {
    if (!links || links.length === 0) return links || [];

    const normalizeKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

    const fmTextToId = new Map<string, string>();
    const fmTextProcessToId = new Map<string, string>();
    const fmIdToText = new Map<string, string>();
    const fmIdToProcess = new Map<string, string>();

    const feTextToId = new Map<string, string>();
    const feScopeTextToId = new Map<string, string>();
    const feIdToText = new Map<string, string>();

    const fcTextToId = new Map<string, string>();
    const fcTextProcessToId = new Map<string, string>();
    const fcIdToText = new Map<string, string>();

    (stateSnapshot.l2 || []).forEach((proc: any) => {
      const procName = String(proc?.name || '').trim();
      const procKey = normalizeKey(procName);

      (proc.failureModes || []).forEach((fm: any) => {
        const text = String(fm.mode || fm.name || '').trim();
        if (fm.id) {
          fmIdToText.set(fm.id, text);
          fmIdToProcess.set(fm.id, procName);
        }
        if (text && fm.id) {
          const textKey = normalizeKey(text);
          if (!fmTextToId.has(textKey)) {
            fmTextToId.set(textKey, fm.id);
          }
          if (procKey) {
            const scopedKey = `${procKey}||${textKey}`;
            if (!fmTextProcessToId.has(scopedKey)) {
              fmTextProcessToId.set(scopedKey, fm.id);
            }
          }
        }
      });

      (proc.failureCauses || []).forEach((fc: any) => {
        const text = String(fc.cause || fc.name || '').trim();
        if (fc.id) {
          fcIdToText.set(fc.id, text);
        }
        if (text && fc.id) {
          const textKey = normalizeKey(text);
          if (!fcTextToId.has(textKey)) {
            fcTextToId.set(textKey, fc.id);
          }
          if (procKey) {
            const scopedKey = `${procKey}||${textKey}`;
            if (!fcTextProcessToId.has(scopedKey)) {
              fcTextProcessToId.set(scopedKey, fc.id);
            }
          }
        }
      });
    });

    ((stateSnapshot.l1 as any)?.failureScopes || []).forEach((fe: any) => {
      const text = String(fe.effect || fe.name || '').trim();
      const scope = String(fe.scope || fe.category || '').trim();
      if (fe.id) {
        feIdToText.set(fe.id, text);
      }
      if (text && fe.id) {
        const textKey = normalizeKey(text);
        if (!feTextToId.has(textKey)) {
          feTextToId.set(textKey, fe.id);
        }
        if (scope) {
          const scopedKey = `${normalizeKey(scope)}||${textKey}`;
          if (!feScopeTextToId.has(scopedKey)) {
            feScopeTextToId.set(scopedKey, fe.id);
          }
        }
      }
    });

    return links.map((link: any) => {
      const originalFmText = String(link.fmText || '').trim();
      const originalFeText = String(link.feText || '').trim();
      const originalFcText = String(link.fcText || '').trim();
      const originalFmProcess = String(link.fmProcess || '').trim();
      const originalFeScope = String(link.feScope || '').trim();
      const originalFcProcess = String(link.fcProcess || '').trim();

      const fmText = originalFmText || String(link.cache?.fmText || '').trim();
      const feText = originalFeText || String(link.cache?.feText || '').trim();
      const fcText = originalFcText || String(link.cache?.fcText || '').trim();
      const fmProcess = originalFmProcess;
      const feScope = originalFeScope || String(link.cache?.feCategory || '').trim();
      const fcProcess = originalFcProcess;

      const fmTextKey = normalizeKey(fmText);
      const feTextKey = normalizeKey(feText);
      const fcTextKey = normalizeKey(fcText);
      const fmScopedKey = fmProcess ? `${normalizeKey(fmProcess)}||${fmTextKey}` : '';
      const feScopedKey = feScope ? `${normalizeKey(feScope)}||${feTextKey}` : '';
      const fcScopedKey = fcProcess ? `${normalizeKey(fcProcess)}||${fcTextKey}` : '';

      const hasFmId = link.fmId && fmIdToText.has(link.fmId);
      const hasFeId = link.feId && feIdToText.has(link.feId);
      const hasFcId = link.fcId && fcIdToText.has(link.fcId);

      const fmId =
        (hasFmId ? link.fmId : '') ||
        (fmScopedKey ? fmTextProcessToId.get(fmScopedKey) : '') ||
        (fmTextKey ? fmTextToId.get(fmTextKey) : '') ||
        link.fmId || '';

      const feId =
        (hasFeId ? link.feId : '') ||
        (feScopedKey ? feScopeTextToId.get(feScopedKey) : '') ||
        (feTextKey ? feTextToId.get(feTextKey) : '') ||
        link.feId || '';

      const fcId =
        (hasFcId ? link.fcId : '') ||
        (fcScopedKey ? fcTextProcessToId.get(fcScopedKey) : '') ||
        (fcTextKey ? fcTextToId.get(fcTextKey) : '') ||
        link.fcId || '';

      return {
        ...link,
        fmId,
        fmText: fmText || fmIdToText.get(fmId) || originalFmText || link.fmText || '',
        fmProcess: fmProcess || fmIdToProcess.get(fmId) || originalFmProcess || link.fmProcess || '',
        feId,
        feText: feText || feIdToText.get(feId) || originalFeText || link.feText || '',
        feScope: feScope || originalFeScope || link.feScope || '',
        fcId,
        fcText: fcText || fcIdToText.get(fcId) || originalFcText || link.fcText || '',
        fcProcess: fcProcess || originalFcProcess || link.fcProcess || '',
      };
    });
  }, []);

  /**
   * localStorage 전용 저장 (DB 저장 없음)
   */
  const saveToLocalStorageOnly = useCallback(() => {
    const targetId = selectedFmeaId || currentFmeaId;
    if (!targetId) {
      return;
    }
    if (suppressAutoSaveRef.current) {
      return;
    }

    const currentState = stateRef.current;
    setIsSaving(true);
    try {
      // l1.name 유실 방지
      let preservedL1Name: string | null = null;
      try {
        const existingRaw = localStorage.getItem(`${prefix}_worksheet_${targetId}`);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw) as any;
          const existingName = existing?.l1?.name;
          if (typeof existingName === 'string' && existingName.trim() !== '') {
            preservedL1Name = existingName;
          }
        }
      } catch { /* ignore */ }

      const l1ToSave =
        (!currentState?.l1?.name || String(currentState.l1.name).trim() === '') && preservedL1Name
          ? { ...currentState.l1, name: preservedL1Name }
          : currentState.l1;

      const normalizedFailureLinks = normalizeFailureLinks((currentState as any).failureLinks || [], currentState);
      const worksheetData = {
        fmeaId: targetId,
        l1: l1ToSave,
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
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(`${prefix}_worksheet_${targetId}`, JSON.stringify(worksheetData));
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
      setDirty(false);
    } catch (e) {
      console.error(`[${fmeaType}] 저장(local-only) 오류:`, e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedFmeaId, currentFmeaId, stateRef, suppressAutoSaveRef, setIsSaving, setLastSaved, setDirty, normalizeFailureLinks, prefix, fmeaType]);

  /**
   * 기본 저장 함수 (Atomic DB 저장)
   */
  const saveToLocalStorage = useCallback(() => {
    const targetId = selectedFmeaId || currentFmeaId;
    if (!targetId) {
      return;
    }
    if (suppressAutoSaveRef.current) {
      return;
    }

    const currentState = stateRef.current;
    setIsSaving(true);
    try {
      // l1.name 유실 방지
      let preservedL1Name: string | null = null;
      try {
        const existingRaw = localStorage.getItem(`${prefix}_worksheet_${targetId}`);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw) as any;
          const existingName = existing?.l1?.name;
          if (typeof existingName === 'string' && existingName.trim() !== '') {
            preservedL1Name = existingName;
          }
        }
      } catch { /* ignore */ }

      const l1ToSave =
        (!currentState?.l1?.name || String(currentState.l1.name).trim() === '') && preservedL1Name
          ? { ...currentState.l1, name: preservedL1Name }
          : currentState.l1;

      const normalizedFailureLinks = normalizeFailureLinks((currentState as any).failureLinks || [], currentState);
      const worksheetData = {
        fmeaId: targetId,
        l1: l1ToSave,
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
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(`${prefix}_worksheet_${targetId}`, JSON.stringify(worksheetData));

      // 원자성 DB로도 저장
      const newAtomicDB = migrateToAtomicDB(worksheetData);
      saveWorksheetDB(newAtomicDB).catch(e => console.error(`[${fmeaType}] DB 저장 오류:`, e));
      setAtomicDB(newAtomicDB);

      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
    } catch (e) {
      console.error(`[${fmeaType}] 저장 오류:`, e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedFmeaId, currentFmeaId, stateRef, suppressAutoSaveRef, setIsSaving, setLastSaved, setDirty, setAtomicDB, normalizeFailureLinks, migrateToAtomicDB, saveWorksheetDB, prefix, fmeaType]);

  /**
   * 원자성 DB 저장
   */
  const saveAtomicDB = useCallback(async (force?: boolean) => {
    const targetFmeaId = atomicDB?.fmeaId || selectedFmeaId || currentFmeaId;

    if (!targetFmeaId) {
      return;
    }

    if (!force && suppressAutoSaveRef.current) {
      return;
    }

    if (force) {
    }


    setIsSaving(true);
    try {
      const currentState = stateRef.current;

      const normalizedFailureLinks = normalizeFailureLinks((currentState as any).failureLinks || [], currentState);
      const stateInput = {
        fmeaId: targetFmeaId,
        l1: currentState.l1,
        l2: currentState.l2,
        failureLinks: normalizedFailureLinks,
        structureConfirmed: (currentState as any).structureConfirmed || false,
        l1Confirmed: (currentState as any).l1Confirmed || false,
        l2Confirmed: (currentState as any).l2Confirmed || false,
        l3Confirmed: (currentState as any).l3Confirmed || false,
        failureL1Confirmed: (currentState as any).failureL1Confirmed || false,
        failureL2Confirmed: (currentState as any).failureL2Confirmed || false,
        failureL3Confirmed: (currentState as any).failureL3Confirmed || false,
        failureLinkConfirmed: (currentState as any).failureLinkConfirmed || false,
      };

      const newAtomicDB = migrateToAtomicDB(stateInput);

      // 고장연결 확정 시 고장분석 통합 데이터 생성
      if (newAtomicDB.failureLinks.length > 0 && newAtomicDB.confirmed.failureLink) {
        try {
          const { buildFailureAnalyses } = await import('@/app/(fmea-core)/pfmea/worksheet/utils/failure-analysis-builder');
          newAtomicDB.failureAnalyses = buildFailureAnalyses(newAtomicDB);
        } catch {
          newAtomicDB.failureAnalyses = [];
        }
      } else {
        newAtomicDB.failureAnalyses = [];
      }

      await saveWorksheetDB(newAtomicDB);
      setAtomicDB(newAtomicDB);


      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString('ko-KR'));
    } catch (e) {
      console.error(`[${fmeaType}] 원자성 DB 저장 오류:`, e);
    } finally {
      setIsSaving(false);
    }
  }, [atomicDB, selectedFmeaId, currentFmeaId, stateRef, suppressAutoSaveRef, setIsSaving, setDirty, setLastSaved, setAtomicDB, normalizeFailureLinks, migrateToAtomicDB, saveWorksheetDB, fmeaType]);

  // 자동 저장 트리거
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToLocalStorage();
      saveAtomicDB();
    }, 500);
  }, [saveToLocalStorage, saveAtomicDB, fmeaType]);

  useEffect(() => {
    if (dirty) triggerAutoSave();
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [dirty, triggerAutoSave]);

  // 구조~고장원인까지 변경 시 원자성 DB 자동 저장
  useEffect(() => {
    if (suppressAutoSaveRef.current) return;
    if (!selectedFmeaId && !currentFmeaId) return;

    const currentState = stateRef.current;
    const snapshot = {
      l1: currentState.l1,
      l2: currentState.l2,
      failureLinks: (currentState as any).failureLinks || [],
      confirmed: {
        structureConfirmed: (currentState as any).structureConfirmed || false,
        l1Confirmed: (currentState as any).l1Confirmed || false,
        l2Confirmed: (currentState as any).l2Confirmed || false,
        l3Confirmed: (currentState as any).l3Confirmed || false,
        failureL1Confirmed: (currentState as any).failureL1Confirmed || false,
        failureL2Confirmed: (currentState as any).failureL2Confirmed || false,
        failureL3Confirmed: (currentState as any).failureL3Confirmed || false,
        failureLinkConfirmed: (currentState as any).failureLinkConfirmed || false,
      },
      riskData: currentState.riskData || {},
    };

    const hash = JSON.stringify(snapshot);
    if (lastAutoSaveHashRef.current && hash === lastAutoSaveHashRef.current) return;
    lastAutoSaveHashRef.current = hash;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveAtomicDB().catch(e => console.error(`[${fmeaType}] 자동저장 오류:`, e));
    }, 800);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [stateRef.current, selectedFmeaId, currentFmeaId, saveAtomicDB, suppressAutoSaveRef, fmeaType]);

  return {
    saveToLocalStorage,
    saveToLocalStorageOnly,
    saveAtomicDB,
    normalizeFailureLinks,
  };
}
