/**
 * @file useAtomicLookup.ts
 * @description DB 다이렉트 조회 헬퍼 — FK 기반 O(1) 룩업
 *
 * WorksheetState.atomicDB (FMEAWorksheetDB)에서 직접 데이터 조회.
 * riskData 딕셔너리, 중첩 트리 접근을 모두 대체.
 *
 * 사용:
 *   const lookup = useAtomicLookup(state);
 *   const l3s = lookup.getL3sForL2(l2Id);
 *   const risk = lookup.getRisk(linkId);
 *   const fm = lookup.fmMap.get(fmId);
 */

'use client';

import { useMemo } from 'react';
import type { WorksheetState } from '../constants';
import type {
  FMEAWorksheetDB,
  L1Structure,
  L2Structure,
  L3Structure,
  L1Function,
  L2Function,
  L3Function,
  ProcessProductChar,
  FailureEffect,
  FailureMode,
  FailureCause,
  FailureLink,
  FailureAnalysis,
  RiskAnalysis,
  Optimization,
} from '../schema';

function indexById<T extends { id: string }>(arr: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of arr) map.set(item.id, item);
  return map;
}

function indexByField<T>(arr: T[], field: keyof T): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of arr) {
    const key = String(item[field]);
    if (key) map.set(key, item);
  }
  return map;
}

function groupByField<T>(arr: T[], field: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const key = String(item[field]);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) existing.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export interface AtomicLookup {
  db: FMEAWorksheetDB | null;
  hasData: boolean;

  l1Structure: L1Structure | null;
  l2Structures: L2Structure[];
  l3Structures: L3Structure[];
  l1Functions: L1Function[];
  l2Functions: L2Function[];
  l3Functions: L3Function[];
  processProductChars: ProcessProductChar[];
  failureEffects: FailureEffect[];
  failureModes: FailureMode[];
  failureCauses: FailureCause[];
  failureLinks: FailureLink[];
  failureAnalyses: FailureAnalysis[];
  riskAnalyses: RiskAnalysis[];
  optimizations: Optimization[];

  l2Map: Map<string, L2Structure>;
  l3Map: Map<string, L3Structure>;
  l1FuncMap: Map<string, L1Function>;
  l2FuncMap: Map<string, L2Function>;
  l3FuncMap: Map<string, L3Function>;
  pcMap: Map<string, ProcessProductChar>;
  feMap: Map<string, FailureEffect>;
  fmMap: Map<string, FailureMode>;
  fcMap: Map<string, FailureCause>;
  linkMap: Map<string, FailureLink>;
  faMap: Map<string, FailureAnalysis>;
  riskByLinkId: Map<string, RiskAnalysis>;
  riskMap: Map<string, RiskAnalysis>;
  optsByRiskId: Map<string, Optimization[]>;

  getL3sForL2: (l2Id: string) => L3Structure[];
  getL2FuncsForL2: (l2Id: string) => L2Function[];
  getL3FuncsForL3: (l3StructId: string) => L3Function[];
  getL3FuncsForL2: (l2StructId: string) => L3Function[];
  getPCsForL2: (l2StructId: string) => ProcessProductChar[];
  getFMsForL2: (l2StructId: string) => FailureMode[];
  getFCsForL2: (l2StructId: string) => FailureCause[];
  getFCsForL3: (l3StructId: string) => FailureCause[];
  getLinksForFM: (fmId: string) => FailureLink[];
  getLinksForFC: (fcId: string) => FailureLink[];
  getFAsForLink: (linkId: string) => FailureAnalysis[];
  getRisk: (linkId: string) => RiskAnalysis | undefined;
  getOptsForRisk: (riskId: string) => Optimization[];

  getSeverity: (linkId: string) => number;
  getOccurrence: (linkId: string) => number;
  getDetection: (linkId: string) => number;
  getAP: (linkId: string) => string;
  getPreventionControl: (linkId: string) => string;
  getDetectionControl: (linkId: string) => string;
}

const EMPTY_ARR: never[] = [];

export function useAtomicLookup(state: WorksheetState): AtomicLookup {
  const db = state.atomicDB ?? null;

  const l1Structure = db?.l1Structure ?? null;
  const l2Structures = db?.l2Structures ?? EMPTY_ARR;
  const l3Structures = db?.l3Structures ?? EMPTY_ARR;
  const l1Functions = db?.l1Functions ?? EMPTY_ARR;
  const l2Functions = db?.l2Functions ?? EMPTY_ARR;
  const l3Functions = db?.l3Functions ?? EMPTY_ARR;
  const processProductChars = db?.processProductChars ?? EMPTY_ARR;
  const failureEffects = db?.failureEffects ?? EMPTY_ARR;
  const failureModes = db?.failureModes ?? EMPTY_ARR;
  const failureCauses = db?.failureCauses ?? EMPTY_ARR;
  const failureLinks = db?.failureLinks ?? EMPTY_ARR;
  const failureAnalyses = db?.failureAnalyses ?? EMPTY_ARR;
  const riskAnalyses = db?.riskAnalyses ?? EMPTY_ARR;
  const optimizations = db?.optimizations ?? EMPTY_ARR;

  const l2Map = useMemo(() => indexById(l2Structures), [l2Structures]);
  const l3Map = useMemo(() => indexById(l3Structures), [l3Structures]);
  const l1FuncMap = useMemo(() => indexById(l1Functions), [l1Functions]);
  const l2FuncMap = useMemo(() => indexById(l2Functions), [l2Functions]);
  const l3FuncMap = useMemo(() => indexById(l3Functions), [l3Functions]);
  const pcMap = useMemo(() => indexById(processProductChars), [processProductChars]);
  const feMap = useMemo(() => indexById(failureEffects), [failureEffects]);
  const fmMap = useMemo(() => indexById(failureModes), [failureModes]);
  const fcMap = useMemo(() => indexById(failureCauses), [failureCauses]);
  const linkMap = useMemo(() => indexById(failureLinks), [failureLinks]);
  const faMap = useMemo(() => indexByField(failureAnalyses, 'linkId'), [failureAnalyses]);
  const riskByLinkId = useMemo(() => indexByField(riskAnalyses, 'linkId'), [riskAnalyses]);
  const riskMap = useMemo(() => indexById(riskAnalyses), [riskAnalyses]);
  const optsByRiskId = useMemo(() => groupByField(optimizations, 'riskId'), [optimizations]);

  const l3sByL2 = useMemo(() => groupByField(l3Structures, 'l2Id'), [l3Structures]);
  const l2FuncsByL2 = useMemo(() => groupByField(l2Functions, 'l2StructId'), [l2Functions]);
  const l3FuncsByL3 = useMemo(() => groupByField(l3Functions, 'l3StructId'), [l3Functions]);
  const l3FuncsByL2 = useMemo(() => groupByField(l3Functions, 'l2StructId'), [l3Functions]);
  const pcsByL2 = useMemo(() => groupByField(processProductChars, 'l2StructId'), [processProductChars]);
  const fmsByL2 = useMemo(() => groupByField(failureModes, 'l2StructId'), [failureModes]);
  const fcsByL2 = useMemo(() => groupByField(failureCauses, 'l2StructId'), [failureCauses]);
  const fcsByL3 = useMemo(() => groupByField(failureCauses, 'l3StructId'), [failureCauses]);
  const linksByFM = useMemo(() => groupByField(failureLinks, 'fmId'), [failureLinks]);
  const linksByFC = useMemo(() => groupByField(failureLinks, 'fcId'), [failureLinks]);

  return useMemo(() => ({
    db,
    hasData: !!db && (l2Structures.length > 0 || !!l1Structure),

    l1Structure, l2Structures, l3Structures,
    l1Functions, l2Functions, l3Functions,
    processProductChars, failureEffects, failureModes,
    failureCauses, failureLinks, failureAnalyses,
    riskAnalyses, optimizations,

    l2Map, l3Map, l1FuncMap, l2FuncMap, l3FuncMap,
    pcMap, feMap, fmMap, fcMap, linkMap, faMap,
    riskByLinkId, riskMap, optsByRiskId,

    getL3sForL2: (l2Id: string) => l3sByL2.get(l2Id) ?? EMPTY_ARR,
    getL2FuncsForL2: (l2Id: string) => l2FuncsByL2.get(l2Id) ?? EMPTY_ARR,
    getL3FuncsForL3: (l3StructId: string) => l3FuncsByL3.get(l3StructId) ?? EMPTY_ARR,
    getL3FuncsForL2: (l2StructId: string) => l3FuncsByL2.get(l2StructId) ?? EMPTY_ARR,
    getPCsForL2: (l2StructId: string) => pcsByL2.get(l2StructId) ?? EMPTY_ARR,
    getFMsForL2: (l2StructId: string) => fmsByL2.get(l2StructId) ?? EMPTY_ARR,
    getFCsForL2: (l2StructId: string) => fcsByL2.get(l2StructId) ?? EMPTY_ARR,
    getFCsForL3: (l3StructId: string) => fcsByL3.get(l3StructId) ?? EMPTY_ARR,
    getLinksForFM: (fmId: string) => linksByFM.get(fmId) ?? EMPTY_ARR,
    getLinksForFC: (fcId: string) => linksByFC.get(fcId) ?? EMPTY_ARR,
    getFAsForLink: (linkId: string) => {
      const fa = faMap.get(linkId);
      return fa ? [fa] : EMPTY_ARR;
    },
    getRisk: (linkId: string) => riskByLinkId.get(linkId),
    getOptsForRisk: (riskId: string) => optsByRiskId.get(riskId) ?? EMPTY_ARR,

    getSeverity: (linkId: string) => riskByLinkId.get(linkId)?.severity ?? 0,
    getOccurrence: (linkId: string) => riskByLinkId.get(linkId)?.occurrence ?? 0,
    getDetection: (linkId: string) => riskByLinkId.get(linkId)?.detection ?? 0,
    getAP: (linkId: string) => riskByLinkId.get(linkId)?.ap ?? '',
    getPreventionControl: (linkId: string) => riskByLinkId.get(linkId)?.preventionControl ?? '',
    getDetectionControl: (linkId: string) => riskByLinkId.get(linkId)?.detectionControl ?? '',
  }), [
    db, l1Structure, l2Structures, l3Structures,
    l1Functions, l2Functions, l3Functions,
    processProductChars, failureEffects, failureModes,
    failureCauses, failureLinks, failureAnalyses,
    riskAnalyses, optimizations,
    l2Map, l3Map, l1FuncMap, l2FuncMap, l3FuncMap,
    pcMap, feMap, fmMap, fcMap, linkMap, faMap,
    riskByLinkId, riskMap, optsByRiskId,
    l3sByL2, l2FuncsByL2, l3FuncsByL3, l3FuncsByL2,
    pcsByL2, fmsByL2, fcsByL2, fcsByL3, linksByFM, linksByFC,
  ]);
}
