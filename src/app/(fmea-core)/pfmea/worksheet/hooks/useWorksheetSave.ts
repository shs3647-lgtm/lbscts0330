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
import { WorksheetState, FMEAProject, uid } from '../constants';
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

  // 수정 1: failureScopes가 비어있으면 DB FE를 보존하고 즉시 반환
  // (기존: failureScopes가 비어도 db.failureEffects가 있으면 syncedEffects=[]로 wipe했음)
  if (failureScopes.length === 0) return db;

  // 기존 FE를 ID 기준으로 맵핑
  const existingFeById = new Map((db.failureEffects || []).map((fe: any) => [fe.id, fe]));
  const l1FuncIdSet = new Set((db.l1Functions || []).map((f: any) => f.id));

  const validScopes = failureScopes.filter((fs) => !!(fs.effect || fs.name)); // 빈 FE 제외

  const syncedEffects = validScopes
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

      // 수정 2: 새 FE — l1FuncId를 못 찾아도 drop하지 않고 API에 전달
      // (API의 LAST RESORT 로직이 l1FuncId를 복구함)
      const l1FuncId = (fs.reqId && l1FuncIdSet.has(fs.reqId))
        ? fs.reqId
        : db.l1Functions?.length > 0 ? (db.l1Functions[0] as any).id : (fs.reqId || '');
      // l1FuncId가 비어있어도 drop 금지 — API LAST RESORT가 복구

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

  // 수정 3: 일부 FE가 제외된 경우 경고 로그
  if (syncedEffects.length !== validScopes.length) {
    console.warn('[syncFE] 일부 FE 제외:', {
      input: failureScopes.length,
      validInput: validScopes.length,
      output: syncedEffects.length,
    });
  }

  // ★ MERGE 방식: state에서 생성된 FE + DB에만 있는 FE 보존
  const syncedFeIds = new Set(syncedEffects.map((fe: any) => fe.id));
  const dbOnlyFEs = (db.failureEffects || []).filter((fe: any) => !syncedFeIds.has(fe.id));
  return { ...db, failureEffects: [...syncedEffects, ...dbOnlyFEs] as any[] };
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

  // ★★★ 2026-03-17 FIX: 3단계 매칭 + feId 보존 + FM+FC 키 매칭 (feId 불일치 허용)
  // 근본원인: (1) confirmLink이 id 없이 링크 생성 → DB link와 매칭 불가
  //          (2) API에서 feId 자동할당 → client feId='' vs DB feId='Y4' → 복합키 불일치
  //          (3) 매칭 실패 → 매번 새 UUID → DB에 old link 잔존 + new link 충돌

  // 인덱스 구축
  const dbLinkById = new Map(db.failureLinks.map((l: any) => [l.id, l]));
  const dbLinkByComposite = new Map<string, any>();
  const dbLinkByFmFc = new Map<string, any>(); // FM+FC 2중키 (feId 무관 매칭용)
  for (const l of db.failureLinks as any[]) {
    const key3 = `${l.fmId}|${l.feId || ''}|${l.fcId}`;
    if (!dbLinkByComposite.has(key3)) dbLinkByComposite.set(key3, l);
    const key2 = `${l.fmId}|${l.fcId}`;
    if (!dbLinkByFmFc.has(key2)) dbLinkByFmFc.set(key2, l);
  }

  const syncedLinks = stateLinks
    .filter((sl: any) => sl.fmId && sl.fcId)
    .map((sl: any) => {
      // 1순위: id로 기존 DB 링크 매칭
      const existingById = sl.id ? dbLinkById.get(sl.id) : null;
      if (existingById) {
        return {
          ...existingById,
          fmId: sl.fmId,
          feId: sl.feId || existingById.feId,
          fcId: sl.fcId,
          fmText: sl.fmText || existingById.fmText,
          feText: sl.feText || existingById.feText,
          fcText: sl.fcText || existingById.fcText,
          fmProcess: sl.fmProcess || existingById.fmProcess,
          feScope: sl.feScope || existingById.feScope,
          fcWorkElem: sl.fcWorkElem || existingById.fcWorkElem,
          fcM4: sl.fcM4 || existingById.fcM4,
          severity: sl.severity ?? existingById.severity,
        };
      }
      // 2순위: FM+FE+FC 3중 복합키로 매칭
      const compositeKey = `${sl.fmId}|${sl.feId || ''}|${sl.fcId}`;
      const existingByKey3 = dbLinkByComposite.get(compositeKey);
      if (existingByKey3) {
        return {
          ...existingByKey3,
          fmId: sl.fmId,
          feId: sl.feId || existingByKey3.feId,
          fcId: sl.fcId,
          fmText: sl.fmText || existingByKey3.fmText,
          feText: sl.feText || existingByKey3.feText,
          fcText: sl.fcText || existingByKey3.fcText,
          fmProcess: sl.fmProcess || existingByKey3.fmProcess,
          feScope: sl.feScope || existingByKey3.feScope,
          fcWorkElem: sl.fcWorkElem || existingByKey3.fcWorkElem,
          fcM4: sl.fcM4 || existingByKey3.fcM4,
          severity: sl.severity ?? existingByKey3.severity,
        };
      }
      // 3순위: FM+FC 2중키 매칭 (feId 불일치 허용 — API 자동할당으로 인한 차이 해결)
      const key2 = `${sl.fmId}|${sl.fcId}`;
      const existingByKey2 = dbLinkByFmFc.get(key2);
      if (existingByKey2) {
        return {
          ...existingByKey2,
          fmId: sl.fmId,
          feId: sl.feId || existingByKey2.feId, // DB의 feId 보존 (API 자동할당값)
          fcId: sl.fcId,
          fmText: sl.fmText || existingByKey2.fmText,
          feText: sl.feText || existingByKey2.feText,
          fcText: sl.fcText || existingByKey2.fcText,
          fmProcess: sl.fmProcess || existingByKey2.fmProcess,
          feScope: sl.feScope || existingByKey2.feScope,
          fcWorkElem: sl.fcWorkElem || existingByKey2.fcWorkElem,
          fcM4: sl.fcM4 || existingByKey2.fcM4,
          severity: sl.severity ?? existingByKey2.severity,
        };
      }
      // 4순위: 완전 새 링크 → 고유 UUID (이미 confirmLink에서 uid() 할당됨, 안전망)
      return {
        id: sl.id || uid(),
        fmId: sl.fmId,
        feId: sl.feId || '',
        fcId: sl.fcId,
        fmText: sl.fmText || null,
        feText: sl.feText || null,
        fcText: sl.fcText || null,
        fmProcess: sl.fmProcess || null,
        feScope: sl.feScope || null,
        fcWorkElem: sl.fcWorkElem || null,
        fcM4: sl.fcM4 || null,
        severity: sl.severity ?? null,
      };
    });

  // ★★★ 2026-03-17 FIX: FE severity → FL severity 전파 ★★★
  // FE에 심각도가 설정되어 있으면 해당 FE를 참조하는 모든 FL에 전파
  const feById = new Map((db.failureEffects || []).map((fe: any) => [fe.id, fe]));
  const feSevByScope = new Map<string, number>();
  for (const scope of ((state as any).l1?.failureScopes || []) as Array<{ id?: string; severity?: number }>) {
    if (scope.id && scope.severity && scope.severity > 0) {
      feSevByScope.set(scope.id, scope.severity);
    }
  }

  const linksWithSeverity = syncedLinks.map((link: any) => {
    if (link.severity && link.severity > 0) return link;
    // DB FE → state failureScope 순서로 severity 조회
    const feId = link.feId;
    if (!feId) return link;
    const feSev = feById.get(feId)?.severity || feSevByScope.get(feId) || 0;
    if (feSev > 0) {
      return { ...link, severity: feSev };
    }
    return link;
  });

  return { ...db, failureLinks: linksWithSeverity };
}

/**
 * stateRef(legacy)에서 변경된 failureCauses를 atomicDB.failureCauses에 반영.
 * 사용자가 3L고장분석 탭에서 FC를 추가/수정하면 state.l2[].failureCauses가 업데이트되지만
 * ATOMIC PATH는 migrateToAtomicDB를 호출하지 않으므로 별도 동기화 필요.
 * processCharId = l3FuncId (l3_functions.id가 processChar의 ID이므로 동일)
 *
 * ★★★ 2026-03-17 FIX: FC 103건 누락 근본 해결 — FM/FE와 동일 패턴 ★★★
 */
function syncFailureCausesFromState(
  db: FMEAWorksheetDB,
  state: WorksheetState,
): FMEAWorksheetDB {
  const l2Procs = (state as any).l2 || [];

  // l2StructId → 첫 번째 l3FuncId 매핑 (신규 FC의 FK 설정용)
  const structToL3FuncMap = new Map<string, { id: string; l3StructId: string }>();
  for (const fn of (db.l3Functions || [])) {
    if (fn.l2StructId && !structToL3FuncMap.has(fn.l2StructId)) {
      structToL3FuncMap.set(fn.l2StructId, { id: fn.id, l3StructId: fn.l3StructId });
    }
  }

  // state의 모든 의미있는 FC 수집
  const stateFcById = new Map<string, any>();
  for (const proc of l2Procs) {
    const procId = proc.id;
    for (const fc of (proc.failureCauses || [])) {
      if (!fc.id || !fc.name?.trim()) continue;
      stateFcById.set(fc.id, {
        id: fc.id,
        name: fc.name.trim(),
        processCharId: fc.processCharId || '',
        occurrence: fc.occurrence,
        l2StructId: procId,
      });
    }
  }

  // state에 FC가 없으면 DB FC 보존 (우발적 wipe 방지)
  if (stateFcById.size === 0) return db;

  // ★ MERGE 방식: DB 기존 FC 보존 + state 변경분 반영 + 신규 추가
  const mergedFCs: any[] = [];
  const processedIds = new Set<string>();

  // 1단계: DB 기존 FC를 순회하며 state 변경분 반영
  for (const dbFc of (db.failureCauses || [])) {
    processedIds.add(dbFc.id);
    const stateFc = stateFcById.get(dbFc.id);
    if (stateFc) {
      // DB에도 state에도 있음 → state 값으로 업데이트
      mergedFCs.push({
        ...dbFc,
        cause: stateFc.name,
        processCharId: stateFc.processCharId || dbFc.processCharId,
        occurrence: stateFc.occurrence ?? dbFc.occurrence,
      });
    } else {
      // DB에만 있고 state에 없음 → DB 값 보존 (삭제 방지)
      mergedFCs.push(dbFc);
    }
  }

  // 2단계: state에만 있는 신규 FC 추가
  for (const [id, sfc] of stateFcById) {
    if (processedIds.has(id)) continue;
    const resolved = structToL3FuncMap.get(sfc.l2StructId);
    const resolvedL3FuncId = resolved?.id || sfc.processCharId || '';
    const resolvedL3StructId = resolved?.l3StructId || '';
    mergedFCs.push({
      id: sfc.id,
      fmeaId: db.fmeaId,
      l2StructId: sfc.l2StructId,
      l3FuncId: resolvedL3FuncId,
      l3StructId: resolvedL3StructId,
      cause: sfc.name,
      occurrence: sfc.occurrence,
      processCharId: sfc.processCharId,
    });
  }

  return { ...db, failureCauses: mergedFCs as any[] };
}

/**
 * stateRef(legacy)에서 변경된 failureModes를 atomicDB.failureModes에 반영.
 * 사용자가 2L고장분석 탭에서 FM을 추가/수정하면 state.l2[].failureModes가 업데이트되지만
 * ATOMIC PATH는 migrateToAtomicDB를 호출하지 않으므로 별도 동기화 필요.
 * productCharId = l2FuncId (l2_functions.id가 productChar의 ID이므로 동일)
 */
function syncFailureModesFromState(
  db: FMEAWorksheetDB,
  state: WorksheetState,
): FMEAWorksheetDB {
  const l2Procs = (state as any).l2 || [];

  // l2StructId → 첫 번째 l2FuncId 매핑 (신규 FM의 FK 설정용)
  const structToFuncMap = new Map<string, string>();
  for (const fn of (db.l2Functions || [])) {
    if (fn.l2StructId && !structToFuncMap.has(fn.l2StructId)) {
      structToFuncMap.set(fn.l2StructId, fn.id);
    }
  }

  // state의 모든 의미있는 FM 수집
  const stateFmById = new Map<string, any>();
  for (const proc of l2Procs) {
    const procId = proc.id;
    for (const fm of (proc.failureModes || [])) {
      if (!fm.id || !fm.name?.trim()) continue;
      stateFmById.set(fm.id, {
        id: fm.id,
        name: fm.name.trim(),
        productCharId: fm.productCharId || '',
        sc: fm.sc ?? (fm.specialChar ?? false),
        l2StructId: procId,
      });
    }
  }

  // state에 FM이 없으면 DB FM 보존 (우발적 wipe 방지)
  if (stateFmById.size === 0) return db;

  // ★ MERGE 방식: DB 기존 FM 보존 + state 변경분 반영 + 신규 추가
  const mergedFMs: any[] = [];
  const processedIds = new Set<string>();

  // 1단계: DB 기존 FM을 순회하며 state 변경분 반영
  for (const dbFm of (db.failureModes || [])) {
    processedIds.add(dbFm.id);
    const stateFm = stateFmById.get(dbFm.id);
    if (stateFm) {
      // DB에도 state에도 있음 → state 값으로 업데이트
      mergedFMs.push({
        ...dbFm,
        mode: stateFm.name,
        productCharId: stateFm.productCharId || dbFm.productCharId,
        specialChar: stateFm.sc,
      });
    } else {
      // DB에만 있고 state에 없음 → DB 값 보존 (삭제 방지)
      mergedFMs.push(dbFm);
    }
  }

  // 2단계: state에만 있는 신규 FM 추가
  for (const [id, sfm] of stateFmById) {
    if (processedIds.has(id)) continue;
    const resolvedL2FuncId = structToFuncMap.get(sfm.l2StructId) || '';
    mergedFMs.push({
      id: sfm.id,
      fmeaId: db.fmeaId,
      l2StructId: sfm.l2StructId,
      l2FuncId: resolvedL2FuncId,
      productCharId: sfm.productCharId,
      mode: sfm.name,
      specialChar: sfm.sc ?? false,
    });
  }

  return { ...db, failureModes: mergedFMs as any[] };
}

/**
 * ★★★ 2026-03-17 FIX: riskData(state) ↔ riskAnalyses(atomicDB) 동기화 ★★★
 *
 * 근본 원인: Atomic Path에서 riskData S/O/D 변경이 atomicDB.riskAnalyses에 반영되지 않아
 * DB에 severity=0으로 저장됨. 특히 FE.severity가 설정되어도 RiskAnalysis에 전파되지 않음.
 *
 * 동작:
 * 1. 기존 riskAnalyses 보존 (ID 유지)
 * 2. riskData에서 S/O/D 값 → riskAnalyses에 반영
 * 3. riskAnalyses 없는 link → FE severity 기반으로 신규 생성
 */
function syncRiskAnalysesFromState(
  db: FMEAWorksheetDB,
  state: WorksheetState,
): FMEAWorksheetDB {
  const riskData: Record<string, unknown> = (state as any).riskData || {};
  const links = db.failureLinks || [];
  if (links.length === 0) return db;

  // FE severity 맵: feId → severity
  const feById = new Map((db.failureEffects || []).map((fe: any) => [fe.id, fe.severity as number || 0]));
  // state의 failureScopes에서도 수집
  for (const scope of ((state as any).l1?.failureScopes || []) as Array<{ id?: string; severity?: number }>) {
    if (scope.id && scope.severity && scope.severity > 0) {
      if (!feById.has(scope.id) || feById.get(scope.id) === 0) {
        feById.set(scope.id, scope.severity);
      }
    }
  }
  // state failureLinks에서도 severity 수집 (auto-recommend가 여기에 설정)
  const linkSevMap = new Map<string, number>();
  for (const sl of ((state as any).failureLinks || []) as Array<{ fmId?: string; feId?: string; fcId?: string; severity?: number; feSeverity?: number }>) {
    if (sl.fmId && sl.fcId) {
      const sev = sl.severity || sl.feSeverity || 0;
      if (sev > 0) linkSevMap.set(`${sl.fmId}-${sl.fcId}`, sev);
    }
  }

  // 기존 riskAnalyses를 linkId 기준으로 맵핑
  const existingByLinkId = new Map<string, any>();
  for (const ra of (db.riskAnalyses || [])) {
    existingByLinkId.set((ra as any).linkId, ra);
  }

  const syncedRisks: any[] = [];

  for (const link of links as any[]) {
    const uniqueKey = `${link.fmId}-${link.fcId}`;
    const sFromRiskData = Number(riskData[`risk-${uniqueKey}-S`]) || 0;
    const oFromRiskData = Number(riskData[`risk-${uniqueKey}-O`]) || 0;
    const dFromRiskData = Number(riskData[`risk-${uniqueKey}-D`]) || 0;
    const pcFromRiskData = (riskData[`prevention-${uniqueKey}`] as string) || '';
    const dcFromRiskData = (riskData[`detection-${uniqueKey}`] as string) || '';
    const lldRefFromRiskData = (riskData[`lesson-${uniqueKey}`] as string) || '';

    // severity 결정: riskData 우선 → link.severity → FE severity
    const feSev = feById.get(link.feId) || 0;
    const linkSev = linkSevMap.get(uniqueKey) || link.severity || 0;
    const severity = sFromRiskData || linkSev || feSev;

    const existing = existingByLinkId.get(link.id);
    if (existing) {
      // 기존 RiskAnalysis 업데이트
      const updatedS = severity || existing.severity || 0;
      const updatedO = oFromRiskData || existing.occurrence || 0;
      const updatedD = dFromRiskData || existing.detection || 0;
      syncedRisks.push({
        ...existing,
        linkId: link.id,
        severity: updatedS,
        occurrence: updatedO,
        detection: updatedD,
        ap: _calcSimpleAP(updatedS, updatedO, updatedD),
        preventionControl: pcFromRiskData || existing.preventionControl || null,
        detectionControl: dcFromRiskData || existing.detectionControl || null,
        lldReference: lldRefFromRiskData || existing.lldReference || null,
      });
    } else if (severity > 0 || oFromRiskData > 0 || dFromRiskData > 0) {
      // 신규 RiskAnalysis 생성 (FE severity 또는 riskData 값이 있을 때만)
      syncedRisks.push({
        id: uid(),
        fmeaId: db.fmeaId,
        linkId: link.id,
        severity,
        occurrence: oFromRiskData,
        detection: dFromRiskData,
        ap: _calcSimpleAP(severity, oFromRiskData, dFromRiskData),
        preventionControl: pcFromRiskData || null,
        detectionControl: dcFromRiskData || null,
        lldReference: lldRefFromRiskData || null,
      });
    }
  }

  return { ...db, riskAnalyses: syncedRisks };
}

// ★ 2026-03-18 FIX: AIAG-VDA FMEA 1st Edition 공식 20행 테이블 (apCalculator.ts와 동일)
// 기존 _calcSimpleAP 휴리스틱 → 테이블 기반으로 교체하여 AP 불일치 재발 방지
const _AP_TABLE: { s: string; o: string; d: readonly ('H'|'M'|'L')[] }[] = [
  { s: '9-10', o: '8-10', d: ['H','H','H','H'] }, { s: '9-10', o: '6-7', d: ['H','H','H','H'] },
  { s: '9-10', o: '4-5', d: ['H','H','H','M'] }, { s: '9-10', o: '2-3', d: ['H','M','L','L'] },
  { s: '9-10', o: '1', d: ['L','L','L','L'] },
  { s: '7-8', o: '8-10', d: ['H','H','H','H'] }, { s: '7-8', o: '6-7', d: ['H','H','H','M'] },
  { s: '7-8', o: '4-5', d: ['H','M','M','M'] }, { s: '7-8', o: '2-3', d: ['M','M','L','L'] },
  { s: '7-8', o: '1', d: ['L','L','L','L'] },
  { s: '4-6', o: '8-10', d: ['H','H','M','M'] }, { s: '4-6', o: '6-7', d: ['M','M','M','L'] },
  { s: '4-6', o: '4-5', d: ['M','L','L','L'] }, { s: '4-6', o: '2-3', d: ['L','L','L','L'] },
  { s: '4-6', o: '1', d: ['L','L','L','L'] },
  { s: '2-3', o: '8-10', d: ['M','M','L','L'] }, { s: '2-3', o: '6-7', d: ['L','L','L','L'] },
  { s: '2-3', o: '4-5', d: ['L','L','L','L'] }, { s: '2-3', o: '2-3', d: ['L','L','L','L'] },
  { s: '2-3', o: '1', d: ['L','L','L','L'] },
];

function _calcSimpleAP(s: number, o: number, d: number): 'H' | 'M' | 'L' {
  if (s <= 0 || o <= 0 || d <= 0) return 'L';
  if (s === 1) return 'L';
  const sR = s >= 9 ? '9-10' : s >= 7 ? '7-8' : s >= 4 ? '4-6' : '2-3';
  const oR = o >= 8 ? '8-10' : o >= 6 ? '6-7' : o >= 4 ? '4-5' : o >= 2 ? '2-3' : '1';
  const dI = d >= 7 ? 0 : d >= 5 ? 1 : d >= 2 ? 2 : 3;
  const row = _AP_TABLE.find(r => r.s === sR && r.o === oR);
  return row ? row.d[dI] : 'L';
}

/**
 * ★★★ 2026-03-18 FIX: riskData opt 키 → atomicDB.optimizations 동기화 ★★★
 *
 * 근본 원인: 워크시트에서 6ST 최적화 데이터를 편집하면 riskData에만 저장되고
 * atomicDB.optimizations에 반영되지 않아 DB에 0건이 저장됨.
 *
 * riskData 키 매핑:
 *   prevention-opt-{uk}[#N] → recommendedAction
 *   person-opt-{uk}[#N]     → responsible
 *   targetDate-opt-{uk}[#N] → targetDate
 *   completeDate-opt-{uk}[#N] 또는 completionDate-opt-{uk}[#N] → completedDate
 *   status-opt-{uk}[#N]     → status
 *   note-opt-{uk}[#N]       → remarks
 *   opt-{uk}[#N]-S          → newSeverity
 *   opt-{uk}[#N]-O          → newOccurrence
 *   opt-{uk}[#N]-D          → newDetection
 *   opt-{uk}[#N]-AP         → newAP
 */
function syncOptimizationsFromState(
  db: FMEAWorksheetDB,
  state: WorksheetState,
): FMEAWorksheetDB {
  const riskData: Record<string, unknown> = (state as any).riskData || {};
  const links = db.failureLinks || [];
  const risks = db.riskAnalyses || [];

  if (links.length === 0 || risks.length === 0) return db;

  const riskByLinkId = new Map<string, any>();
  for (const ra of risks) {
    riskByLinkId.set((ra as any).linkId, ra);
  }

  const existingOptsById = new Map<string, any>();
  for (const opt of (db.optimizations || [])) {
    existingOptsById.set(opt.id, opt);
  }

  const syncedOpts: any[] = [];

  for (const link of links as any[]) {
    const uniqueKey = `${link.fmId}-${link.fcId}`;
    const ra = riskByLinkId.get(link.id);
    if (!ra) continue;
    const riskId = (ra as any).id;

    const rowCountVal = riskData[`opt-rows-${uniqueKey}`];
    let rowCount = 1;
    if (typeof rowCountVal === 'number' && rowCountVal >= 1) rowCount = Math.floor(rowCountVal);
    else if (typeof rowCountVal === 'string' && !isNaN(Number(rowCountVal)) && Number(rowCountVal) >= 1) rowCount = Math.floor(Number(rowCountVal));

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const suffix = rowIdx === 0 ? '' : `#${rowIdx}`;

      // ★ APTable6 호환: improvement-opt-{uk}-O/D 키 폴백 (rowIdx=0 only)
      const recAction = String(riskData[`prevention-opt-${uniqueKey}${suffix}`] || (rowIdx === 0 ? riskData[`improvement-opt-${uniqueKey}-O`] : '') || '').trim();
      const detAction = String(riskData[`detection-opt-${uniqueKey}${suffix}`] || (rowIdx === 0 ? riskData[`improvement-opt-${uniqueKey}-D`] : '') || '').trim();
      const responsible = String(riskData[`person-opt-${uniqueKey}${suffix}`] || '').trim();
      const targetDate = String(riskData[`targetDate-opt-${uniqueKey}${suffix}`] || '').trim();
      const completedDate = String(
        riskData[`completeDate-opt-${uniqueKey}${suffix}`] ||
        riskData[`completionDate-opt-${uniqueKey}${suffix}`] || ''
      ).trim();
      const status = String(riskData[`status-opt-${uniqueKey}${suffix}`] || '').trim();
      const remarks = String(riskData[`note-opt-${uniqueKey}${suffix}`] || '').trim();
      const lldOptRef = String(riskData[`lesson-opt-${uniqueKey}${suffix}`] || '').trim();

      const sodSuffix = rowIdx === 0 ? '' : `#${rowIdx}`;
      const newS = Number(riskData[`opt-${uniqueKey}${sodSuffix}-S`]) || null;
      const newO = Number(riskData[`opt-${uniqueKey}${sodSuffix}-O`]) || null;
      const newD = Number(riskData[`opt-${uniqueKey}${sodSuffix}-D`]) || null;
      const newAP = String(riskData[`opt-${uniqueKey}${sodSuffix}-AP`] || '').trim() || null;

      if (!recAction && !detAction && !responsible && !targetDate && !status && !remarks && !completedDate && !lldOptRef && !newS && !newO && !newD) {
        continue;
      }

      const existingOpt = (db.optimizations || []).find((o: any) =>
        o.riskId === riskId && (
          (rowIdx === 0 && !o._rowIdx) ||
          o._rowIdx === rowIdx
        )
      );

      syncedOpts.push({
        id: existingOpt?.id || uid(),
        fmeaId: db.fmeaId,
        riskId,
        recommendedAction: recAction || '',
        responsible: responsible || '',
        targetDate: targetDate || '',
        completedDate: completedDate || null,
        status: status || 'open',
        remarks: remarks || null,
        detectionAction: detAction || null,
        lldOptReference: lldOptRef || null,
        newSeverity: newS,
        newOccurrence: newO,
        newDetection: newD,
        newAP: newAP || (newS && newO && newD ? _calcSimpleAP(newS, newO, newD) : null),
      });
    }
  }

  return { ...db, optimizations: syncedOpts };
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
        // ★★★ 2026-03-19 FIX: 구조/기능을 legacy state에서 재변환하여 동기화 ★★★
        // ATOMIC PATH에서 구조(L2/L3) 추가/삭제가 반영되지 않는 버그 수정
        const currentState = stateRef.current;
        const legacyForMigrate = {
          fmeaId: targetFmeaId,
          l1: currentState.l1,
          l2: currentState.l2,
          failureLinks: (currentState as any).failureLinks || [],
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
        const freshAtomicDB = migrateToAtomicDB(legacyForMigrate);
        // 기존 atomicDB의 riskAnalyses/optimizations/failureAnalyses 보존
        freshAtomicDB.riskAnalyses = atomicDB.riskAnalyses || [];
        freshAtomicDB.optimizations = atomicDB.optimizations || [];
        freshAtomicDB.failureAnalyses = atomicDB.failureAnalyses || [];

        let dbToSave = syncConfirmedFlags(freshAtomicDB, stateRef.current);
        dbToSave = syncFailureLinksFromState(dbToSave, stateRef.current);
        // ★ FE 동기화: 1L고장분석에서 추가/수정된 FE를 atomicDB.failureEffects에 반영
        dbToSave = syncFailureEffectsFromState(dbToSave, stateRef.current);
        // ★ FM 동기화: 2L고장분석에서 추가/수정된 FM을 atomicDB.failureModes에 반영
        dbToSave = syncFailureModesFromState(dbToSave, stateRef.current);
        // ★ FC 동기화: 3L고장분석에서 추가/수정된 FC를 atomicDB.failureCauses에 반영
        dbToSave = syncFailureCausesFromState(dbToSave, stateRef.current);
        // ★ RiskAnalyses 동기화: riskData S/O/D + FE severity → riskAnalyses 반영
        dbToSave = syncRiskAnalysesFromState(dbToSave, stateRef.current);
        // ★ Optimizations 동기화: riskData opt 키 → optimizations 반영
        dbToSave = syncOptimizationsFromState(dbToSave, stateRef.current);

        // force 모드(확정) 시 forceOverwrite 전달
        if (force) {
          dbToSave = { ...dbToSave, forceOverwrite: true } as any;
        }

        // ★★★ 2026-03-17 FIX: legacyState 동시 전송 — FmeaLegacyData 동기화 ★★★
        const currentStateForLegacy = stateRef.current;
        const legacyStateForSync: Record<string, unknown> = {
          fmeaId: targetFmeaId,
          l1: currentStateForLegacy.l1,
          l2: currentStateForLegacy.l2,
          failureLinks: (currentStateForLegacy as any).failureLinks || [],
          riskData: currentStateForLegacy.riskData || {},
          fmea4Rows: (currentStateForLegacy as any).fmea4Rows || [],
          structureConfirmed: (currentStateForLegacy as any).structureConfirmed || false,
          l1Confirmed: (currentStateForLegacy as any).l1Confirmed || false,
          l2Confirmed: (currentStateForLegacy as any).l2Confirmed || false,
          l3Confirmed: (currentStateForLegacy as any).l3Confirmed || false,
          failureL1Confirmed: (currentStateForLegacy as any).failureL1Confirmed || false,
          failureL2Confirmed: (currentStateForLegacy as any).failureL2Confirmed || false,
          failureL3Confirmed: (currentStateForLegacy as any).failureL3Confirmed || false,
          failureLinkConfirmed: (currentStateForLegacy as any).failureLinkConfirmed || false,
        };

        const result = await saveAtomicDBDirect(dbToSave, false, legacyStateForSync);
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
        // ★ FM 동기화
        dbToSave = syncFailureModesFromState(dbToSave, currentState);
        // ★ FC 동기화
        dbToSave = syncFailureCausesFromState(dbToSave, currentState);
        // ★ RiskAnalyses 동기화
        dbToSave = syncRiskAnalysesFromState(dbToSave, currentState);
        // ★ Optimizations 동기화 (6ST LLD/개선추천 포함)
        dbToSave = syncOptimizationsFromState(dbToSave, currentState);
        if (force) {
          dbToSave = { ...dbToSave, forceOverwrite: true } as any;
        }
        // ★★★ 2026-03-17 FIX: saveTemp에서도 legacyState 동시 전송 ★★★
        const legacySyncData: Record<string, unknown> = {
          fmeaId: targetId,
          l1: currentState.l1,
          l2: currentState.l2,
          failureLinks: (currentState as any).failureLinks || [],
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
        saveAtomicDBDirect(dbToSave, false, legacySyncData).then(result => {
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
