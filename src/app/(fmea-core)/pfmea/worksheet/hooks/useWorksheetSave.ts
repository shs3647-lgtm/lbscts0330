/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useWorksheetSave.ts
 * @description 워크시트 저장 — atomicDB 단일 데이터 소스
 *
 * 2026-03-27: 전면 정리
 * - 저장 경로 1개 (atomicDB → syncConfirmedFlags → POST /api/fmea)
 * - saveToLocalStorage = saveAtomicDB (동일 함수, 호환성 유지)
 * - 불필요한 가드/중복 코드 제거
 * - atomicDBRef로 항상 최신 값 참조
 */

'use client';

import { useCallback } from 'react';
import { WorksheetState, FMEAProject } from '../constants';
import { FMEAWorksheetDB } from '../schema';
import { saveAtomicDB as saveAtomicDBDirect } from './atomicDbSaver';
import { buildManualPositionData } from './manualStructureBuilder';

// ── 타입 ──

interface UseWorksheetSaveParams {
  selectedFmeaId: string | null;
  currentFmea: FMEAProject | null;
  atomicDB: FMEAWorksheetDB | null;
  setAtomicDB: React.Dispatch<React.SetStateAction<FMEAWorksheetDB | null>>;
  atomicDBRef: React.MutableRefObject<FMEAWorksheetDB | null>;
  stateRef: React.MutableRefObject<WorksheetState>;
  suppressAutoSaveRef: React.MutableRefObject<boolean>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setLastSaved: React.Dispatch<React.SetStateAction<string>>;
}

interface UseWorksheetSaveReturn {
  saveAtomicDB: (force?: boolean) => Promise<void>;
  saveToLocalStorage: (force?: boolean) => Promise<void>;
  saveToLocalStorageOnly: () => void;
}

// ══════════════════════════════════════════════════════════
// state → atomicDB 동기화 함수 (항목별 독립)
// ══════════════════════════════════════════════════════════

function syncL2Structures(db: FMEAWorksheetDB, state: WorksheetState): FMEAWorksheetDB['l2Structures'] {
  if (!Array.isArray(state.l2) || !Array.isArray(db.l2Structures)) return db.l2Structures;
  const stateL2Ids = new Set(state.l2.map((p: any) => p.id));
  const stateL2Map = new Map(state.l2.map((p: any) => [p.id, p]));
  return db.l2Structures.filter(l2 => stateL2Ids.has(l2.id)).map(l2 => {
    const edited = stateL2Map.get(l2.id);
    if (!edited) return l2;
    const changed = l2.name !== (edited.name || '') || l2.no !== (edited.no || '') || l2.order !== (edited.order ?? l2.order);
    return changed ? { ...l2, name: edited.name || '', no: edited.no || '', order: edited.order ?? l2.order } : l2;
  });
}

function syncL3Structures(db: FMEAWorksheetDB, state: WorksheetState): FMEAWorksheetDB['l3Structures'] {
  if (!Array.isArray(state.l2) || !Array.isArray(db.l3Structures)) return db.l3Structures;
  const stateL3Map = new Map<string, any>();
  for (const proc of state.l2) {
    for (const we of (proc as any).l3 || []) {
      if (we.id) stateL3Map.set(we.id, { ...we, l2Id: proc.id });
    }
  }
  const stateL3Ids = new Set(stateL3Map.keys());
  const synced = db.l3Structures.filter(l3 => stateL3Ids.has(l3.id)).map(l3 => {
    const edited = stateL3Map.get(l3.id);
    if (!edited) return l3;
    const changed = l3.name !== (edited.name || '') || l3.m4 !== (edited.m4 || '') || l3.order !== (edited.order ?? l3.order);
    return changed ? { ...l3, name: edited.name || '', m4: edited.m4 || '', order: edited.order ?? l3.order } : l3;
  });
  const existingL3Ids = new Set(db.l3Structures.map(l3 => l3.id));
  for (const [id, we] of stateL3Map) {
    if (!existingL3Ids.has(id) && we.name?.trim()) {
      synced.push({ id, fmeaId: db.fmeaId, l1Id: db.l1Structure?.id || '', l2Id: we.l2Id || '', m4: we.m4 || '', name: we.name || '', order: we.order ?? 0 } as any);
    }
  }
  return synced;
}

function syncL2Functions(db: FMEAWorksheetDB, state: WorksheetState): FMEAWorksheetDB['l2Functions'] {
  if (!Array.isArray(state.l2) || !Array.isArray(db.l2Functions)) return db.l2Functions;
  // L2 기능 저장은 "함수 x 제품특성" 행 단위가 원자성 기준.
  // 기존 구현은 신규 행 append를 하지 않아(A3 선택 모달에서) 새로고침 시 소실될 수 있었다.
  const byId = new Map(db.l2Functions.map((f: any) => [f.id, f]));
  const next: FMEAWorksheetDB['l2Functions'] = [];

  for (const proc of state.l2 as any[]) {
    const l2StructId = proc.id || '';
    if (!l2StructId) continue;

    for (const func of (proc.functions || [])) {
      const functionName = (func.name || '').trim();
      const pcs = Array.isArray(func.productChars) ? func.productChars : [];

      if (pcs.length === 0) {
        const id = func.id || '';
        if (!id) continue;
        const prev = byId.get(id) as any;
        next.push({
          ...(prev || {}),
          id,
          fmeaId: db.fmeaId,
          l2StructId,
          functionName: functionName || '',
          productChar: '',
          specialChar: prev?.specialChar || '',
        } as any);
        continue;
      }

      // ★ 2026-03-28: productChars 배열을 첫 번째 행에 첨부 → save API step 4.5에서 PPC 생성 가능
      const pcEntries = pcs.map(pc => ({
        id: pc.id || '',
        name: (pc.name || '').trim(),
        specialChar: pc.specialChar || '',
      })).filter(p => p.id);

      for (let i = 0; i < pcs.length; i++) {
        const pc = pcs[i];
        const id = pc.id || func.id || '';
        if (!id) continue;
        const prev = byId.get(id) as any;
        const row: any = {
          ...(prev || {}),
          id,
          fmeaId: db.fmeaId,
          l2StructId,
          functionName: functionName || '',
          productChar: (pc.name || '').trim(),
          specialChar: pc.specialChar || prev?.specialChar || '',
        };
        // 첫 번째 pc 행에 전체 productChars 배열 첨부 (save API가 PPC 생성에 사용)
        if (i === 0) row.productChars = pcEntries;
        next.push(row);
      }
    }
  }

  return next;
}

function syncL3Functions(db: FMEAWorksheetDB, state: WorksheetState): FMEAWorksheetDB['l3Functions'] {
  if (!Array.isArray(state.l2) || !Array.isArray(db.l3Functions)) return db.l3Functions;
  // ★ 2026-03-28: state 기반 재구성 — 새로 추가된 B2도 포함 (syncL2Functions와 동일 패턴)
  const byId = new Map(db.l3Functions.map((f: any) => [f.id, f]));
  const next: FMEAWorksheetDB['l3Functions'] = [];

  for (const proc of state.l2 as any[]) {
    const l2StructId = proc.id || '';
    if (!l2StructId) continue;

    for (const we of (proc.l3 || [])) {
      const l3StructId = we.id || '';
      if (!l3StructId) continue;

      for (const func of (we.functions || [])) {
        const id = func.id || '';
        if (!id) continue;
        const functionName = (func.name || '').trim();
        const pcs = Array.isArray(func.processChars) ? func.processChars : [];

        if (pcs.length === 0) {
          const prev = byId.get(id) as any;
          next.push({
            ...(prev || {}),
            id,
            fmeaId: db.fmeaId,
            l3StructId,
            l2StructId,
            functionName,
            processChar: '',
            specialChar: prev?.specialChar || '',
          } as any);
          continue;
        }

        for (const pc of pcs) {
          const pcId = pc.id || id;
          const prev = byId.get(pcId) as any;
          next.push({
            ...(prev || {}),
            id: pcId,
            fmeaId: db.fmeaId,
            l3StructId,
            l2StructId,
            functionName,
            processChar: (pc.name || '').trim(),
            specialChar: pc.specialChar || prev?.specialChar || '',
          } as any);
        }
      }
    }
  }

  return next;
}

function syncL1Functions(db: FMEAWorksheetDB, state: WorksheetState): FMEAWorksheetDB['l1Functions'] {
  const types = (state.l1 as any)?.types;
  if (!Array.isArray(types) || types.length === 0) return db.l1Functions || [];
  
  // state에서 모든 L1Function 정보 수집
  const stateMap = new Map<string, { functionName: string; requirement: string; category: string }>();
  const stateIds = new Set<string>();
  
  for (const type of types) {
    const category = (type.name || '').trim();
    if (!category) continue; // 빈 구분(타입)은 스킵
    
    const funcs = type.functions || [];
    
    // ★ 2026-03-27: 기능이 전혀 없는 경우만 type.id로 placeholder 저장
    if (funcs.length === 0 && type.id) {
      stateIds.add(type.id);
      stateMap.set(type.id, { functionName: '', requirement: '', category });
      continue; // 기능이 없으므로 아래 루프 스킵
    }
    
    for (const func of funcs) {
      const functionName = (func.name || '').trim();
      
      // ★ 2026-03-27: 기능 ID는 항상 저장 (요구사항 유무와 관계없이)
      if (func.id) {
        stateIds.add(func.id);
        stateMap.set(func.id, { functionName, requirement: '', category });
      }
      
      // ★ 요구사항 저장 — 작업요소(L3)와 동일 패턴: 빈 행도 ID 기반 유지
      for (const req of (func.requirements || [])) {
        if (!req.id) continue;
        const reqName = (req.name || '').trim();
        if (req.id === func.id && !reqName) continue; // 기능 ID와 같고 빈값이면 스킵 (중복 방지)
        stateIds.add(req.id);
        stateMap.set(req.id, { functionName, requirement: reqName, category });
      }
    }
  }
  
  if (stateMap.size === 0) return db.l1Functions || [];
  
  // 1. 기존 DB 항목 업데이트
  const existingIds = new Set((db.l1Functions || []).map(f => f.id));
  const updatedExisting = (db.l1Functions || [])
    .filter(f => stateIds.has(f.id)) // state에 있는 것만 유지
    .map(f => {
      const edited = stateMap.get(f.id);
      if (!edited) return f;
      const changed = f.functionName !== edited.functionName || f.requirement !== edited.requirement || f.category !== edited.category;
      return changed ? { ...f, ...edited } : f;
    });
  
  // 2. 새 항목 추가 (DB에 없는 것)
  const l1StructId = db.l1Structure?.id || '';
  const newItems: FMEAWorksheetDB['l1Functions'] = [];
  for (const [id, data] of stateMap.entries()) {
    if (!existingIds.has(id)) {
      newItems.push({
        id,
        fmeaId: db.fmeaId || '',
        l1StructId,
        category: data.category,
        functionName: data.functionName,
        requirement: data.requirement,
      });
    }
  }
  
  return [...updatedExisting, ...newItems];
}

function syncFailureModes(db: FMEAWorksheetDB, state: WorksheetState): FMEAWorksheetDB['failureModes'] {
  if (!Array.isArray(state.l2) || !Array.isArray(db.failureModes)) return db.failureModes;
  const map = new Map<string, any>();
  for (const proc of state.l2) {
    for (const fm of ((proc as any).failureModes || [])) {
      if (fm.id) map.set(fm.id, fm);
    }
  }
  return db.failureModes.filter(fm => map.size === 0 || map.has(fm.id)).map(fm => {
    const edited = map.get(fm.id);
    if (!edited) return fm;
    const newMode = edited.name || edited.mode || '';
    const changed = fm.mode !== newMode || fm.specialChar !== (edited.specialChar || edited.sc || '');
    return changed ? { ...fm, mode: newMode, specialChar: edited.specialChar || edited.sc || '' } : fm;
  });
}

function syncFailureCauses(db: FMEAWorksheetDB, state: WorksheetState): FMEAWorksheetDB['failureCauses'] {
  if (!Array.isArray(state.l2) || !Array.isArray(db.failureCauses)) return db.failureCauses;
  const map = new Map<string, any>();
  for (const proc of state.l2) {
    for (const fc of ((proc as any).failureCauses || [])) { if (fc.id) map.set(fc.id, fc); }
    for (const we of ((proc as any).l3 || [])) {
      for (const fc of ((we as any).failureCauses || [])) { if (fc.id) map.set(fc.id, fc); }
    }
  }
  return db.failureCauses.filter(fc => map.size === 0 || map.has(fc.id)).map(fc => {
    const edited = map.get(fc.id);
    if (!edited) return fc;
    const newCause = edited.name || edited.cause || '';
    return fc.cause !== newCause ? { ...fc, cause: newCause } : fc;
  });
}

function syncFailureLinks(db: FMEAWorksheetDB, state: WorksheetState): { links: FMEAWorksheetDB['failureLinks']; changed: boolean } {
  const stateLinks = (state as any).failureLinks;
  if (!Array.isArray(stateLinks) || stateLinks.length === 0) return { links: db.failureLinks, changed: false };
  if (stateLinks.length !== db.failureLinks?.length || (stateLinks[0]?.id && stateLinks[0].id !== db.failureLinks?.[0]?.id)) {
    return { links: stateLinks, changed: true };
  }
  return { links: db.failureLinks, changed: false };
}

function syncFailureEffects(db: FMEAWorksheetDB, state: WorksheetState): FMEAWorksheetDB['failureEffects'] {
  const scopes = (state.l1 as any)?.failureScopes as Array<{ id?: string; effect?: string; severity?: number }> | undefined;
  if (!Array.isArray(scopes) || scopes.length === 0 || !Array.isArray(db.failureEffects) || db.failureEffects.length === 0) return db.failureEffects;
  const byId = new Map(scopes.filter((s): s is { id: string; effect?: string; severity?: number } => Boolean(s.id)).map(s => [s.id, s]));
  return db.failureEffects.map(fe => {
    const sc = byId.get(fe.id);
    if (!sc) return fe;
    let next = fe;
    if (typeof sc.severity === 'number' && sc.severity !== fe.severity) next = { ...next, severity: sc.severity };
    const eff = (sc.effect || '').trim();
    if (eff && eff !== fe.effect) next = { ...next, effect: eff };
    return next;
  });
}

function syncRiskAnalyses(db: FMEAWorksheetDB, state: WorksheetState, links: any[]): FMEAWorksheetDB['riskAnalyses'] {
  const rd = (state as any).riskData;
  if (!rd || typeof rd !== 'object' || !Array.isArray(db.riskAnalyses) || db.riskAnalyses.length === 0) return db.riskAnalyses;
  return db.riskAnalyses.map(ra => {
    const link = (links || []).find((fl: any) => fl.id === ra.linkId);
    if (!link) return ra;
    const uk = `${link.fmId}-${link.fcId}`;
    let next = { ...ra }, changed = false;
    const s = rd[`risk-${uk}-S`]; if (typeof s === 'number' && s !== ra.severity) { next.severity = s; changed = true; }
    const o = rd[`risk-${uk}-O`]; if (typeof o === 'number' && o !== ra.occurrence) { next.occurrence = o; changed = true; }
    const d = rd[`risk-${uk}-D`]; if (typeof d === 'number' && d !== ra.detection) { next.detection = d; changed = true; }
    const pc = rd[`prevention-${uk}`]; if (typeof pc === 'string' && pc !== ra.preventionControl) { next.preventionControl = pc; changed = true; }
    const dc = rd[`detection-${uk}`]; if (typeof dc === 'string' && dc !== ra.detectionControl) { next.detectionControl = dc; changed = true; }
    return changed ? next : ra;
  });
}

// ══════════════════════════════════════════════════════════
// 통합 동기화 함수
// ══════════════════════════════════════════════════════════

export function syncConfirmedFlags(db: FMEAWorksheetDB, state: WorksheetState): FMEAWorksheetDB {
  const result: FMEAWorksheetDB = {
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
    l2Structures: syncL2Structures(db, state),
    l3Structures: syncL3Structures(db, state),
    l2Functions: syncL2Functions(db, state),
    l3Functions: syncL3Functions(db, state),
    l1Functions: syncL1Functions(db, state),
    failureModes: syncFailureModes(db, state),
    failureCauses: syncFailureCauses(db, state),
    failureEffects: syncFailureEffects(db, state),
  };

  const { links, changed } = syncFailureLinks(db, state);
  result.failureLinks = links;
  if (changed) result.confirmed = { ...result.confirmed, failureLink: true };
  result.riskAnalyses = syncRiskAnalyses(db, state, result.failureLinks);

  return result;
}

// ══════════════════════════════════════════════════════════
// Hook
// ══════════════════════════════════════════════════════════

export function useWorksheetSave({
  selectedFmeaId, currentFmea, atomicDB, setAtomicDB, atomicDBRef,
  stateRef, suppressAutoSaveRef, setIsSaving, setDirty, setLastSaved,
}: UseWorksheetSaveParams): UseWorksheetSaveReturn {

  const save = useCallback(async (force?: boolean) => {
    const db = atomicDBRef.current; // ★ ref에서 최신 값 (setAtomicDB 시 즉시 갱신됨)
    const fmeaId = db?.fmeaId || selectedFmeaId || currentFmea?.id;
    if (!fmeaId) return;
    if (!force && suppressAutoSaveRef.current) return;

    setIsSaving(true);
    try {
      if (db && Array.isArray(db.l2Structures) && db.l2Structures.length > 0) {
        // atomicDB 있음 → sync + 저장
        let dbToSave = syncConfirmedFlags(db, stateRef.current);
        if (force) dbToSave = { ...dbToSave, forceOverwrite: true } as any;
        const result = await saveAtomicDBDirect(dbToSave, false);
        if (result.success) {
          setAtomicDB(dbToSave);
          setDirty(false);
          setLastSaved(new Date().toLocaleTimeString('ko-KR'));
        }
      } else {
        // atomicDB 없음 → 수동모드 저장
        const manualL2 = (stateRef.current.l2 || []).filter((p: any) => p.name?.trim() || p.no?.trim());
        if (manualL2.length > 0) {
          const l1Name =
            (currentFmea as any)?.fmeaInfo?.partName ||
            (currentFmea as any)?.fmeaInfo?.subject ||
            (stateRef.current.l1 as any)?.name || '';
          const posData = buildManualPositionData(fmeaId, l1Name, manualL2);
          if (posData) {
            const res = await fetch('/api/fmea/save-position-import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fmeaId, atomicData: posData, manualMode: true }),
            });
            if (res.ok) {
              setDirty(false);
              setLastSaved(new Date().toLocaleTimeString('ko-KR'));
            }
          }
        }
      }
    } catch (e) {
      console.error('[useWorksheetSave] 저장 오류:', e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedFmeaId, currentFmea, setAtomicDB, stateRef, suppressAutoSaveRef, setIsSaving, setDirty, setLastSaved]);

  return {
    saveAtomicDB: save,
    saveToLocalStorage: save,       // 동일 함수 (호환성)
    saveToLocalStorageOnly: () => {},  // no-op (호환성)
  };
}
