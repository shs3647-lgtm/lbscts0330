/**
 * @file atomicToLegacyAdapter.ts
 * @description Atomic DB → Legacy 형식 읽기전용 어댑터
 *
 * 비유: 공식 장부(Atomic DB)를 옛날 양식(Legacy)으로 보여주는 "뷰어".
 * 장부 자체는 건드리지 않고, 화면에 보여주기 위한 변환만 수행.
 *
 * ★ UUID 재생성 절대 금지 — 기존 ID를 그대로 사용
 * ★ 쓰기 용도 사용 금지 — 렌더링 전용
 *
 * ⚠️ FC→legacy.processCharId: 워크시트 B3 id = L3Function.id. FailureCause는 **l3FuncId 우선**
 *    (processCharId만 쓰면 DB 오염 시 3L 고장 누락 대량 발생). 2026-03-23
 */

import { SCOPE_LABEL_EN, SCOPE_YP } from '@/lib/fmea/scope-constants';
import type {
  FMEAWorksheetDB,
  FailureEffect,
  FailureMode,
  FailureCause,
  FailureLink,
  RiskAnalysis,
  Optimization,
  L1Function as AtomicL1Function,
  L2Function as AtomicL2Function,
  L3Function as AtomicL3Function,
  L2Structure,
  L3Structure,
  ProcessProductChar,
} from './schema';

import type {
  WorksheetState,
  L1Data,
  L1Type,
  L1Function,
  L1Requirement,
  L1FailureScope,
  Process,
  WorkElement,
  L2Function,
  L2ProductChar,
  L2FailureMode,
  L3Function,
  L3ProcessChar,
  L3FailureCause,
  L3FailureCauseExtended,
  WorksheetFailureLink,
} from './constants';

/**
 * FC → 워크시트 B3 셀 id (= L3Function.id). DB의 processCharId가 오염된 경우에도
 * 실제 존재하는 L3Function id를 선택 (GET format=atomic 응답도 l3FuncId 우선 정렬 권장).
 */
/** @internal GET format=atomic 응답과 동일 규칙으로 FC→B3 id 정규화 가능 */
export function pickLegacyFcProcessCharId(
  fc: { l3FuncId: string; processCharId?: string | null },
  validL3FuncIds: Set<string>,
): string {
  const a = String(fc.l3FuncId || '').trim();
  const b = String(fc.processCharId || '').trim();
  if (a && validL3FuncIds.has(a)) return a;
  if (b && validL3FuncIds.has(b)) return b;
  return a || b || '';
}

// ============ 헬퍼: Map 기반 인덱스 빌더 ============

/** 배열을 특정 키로 그룹핑하여 Map<key, item[]> 반환 (원본 불변) */
function groupBy<T>(items: readonly T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const arr = map.get(key);
    if (arr) {
      arr.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/** 배열을 id 기준 Map<id, item>으로 변환 (O(1) 조회용) */
function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map;
}

// ============ L1 변환: category → types[].functions[].requirements[] ============

function buildL1Types(l1Functions: readonly AtomicL1Function[]): L1Type[] {
  // category → functionName → AtomicL1Function[] 이중 그룹핑
  const categoryMap = new Map<string, Map<string, AtomicL1Function[]>>();

  for (const f of l1Functions) {
    let funcMap = categoryMap.get(f.category);
    if (!funcMap) {
      funcMap = new Map<string, AtomicL1Function[]>();
      categoryMap.set(f.category, funcMap);
    }
    const arr = funcMap.get(f.functionName);
    if (arr) {
      arr.push(f);
    } else {
      funcMap.set(f.functionName, [f]);
    }
  }

  const types: L1Type[] = [];
  categoryMap.forEach((funcMap, category) => {
    const functions: L1Function[] = [];
    funcMap.forEach((funcs, funcName) => {
      const requirements: L1Requirement[] = funcs.map(f => ({
        id: f.id,
        name: f.requirement,
      }));
      functions.push({
        id: funcs[0].id,
        name: funcName,
        requirements,
      });
    });
    // type의 id는 첫 번째 함수의 id를 사용 (UUID 재생성 금지)
    types.push({
      id: functions[0]?.id || category,
      name: category,
      functions,
    });
  });

  return types;
}

// ============ L1 고장영향: FailureEffect → failureScopes[] ============

function buildFailureScopes(
  failureEffects: readonly FailureEffect[],
  l1FuncById: Map<string, AtomicL1Function>,
): L1FailureScope[] {
  return failureEffects.map(fe => {
    const l1Func = l1FuncById.get(fe.l1FuncId);
    return {
      id: fe.id,
      name: fe.effect,
      reqId: fe.l1FuncId,
      requirement: l1Func?.requirement || '',
      scope: l1Func?.category || fe.category || SCOPE_LABEL_EN[SCOPE_YP],
      effect: fe.effect,
      severity: fe.severity,
    };
  });
}

// ============ L2 기능: L2Function → Process.functions[].productChars[] ============
// CODEFREEZE 2026-03-24: buildL2Functions — productChars[].id는 PPC.id 사용 필수
// FM.productCharId가 PPC.id(C5)를 가리키므로 L2Function.id(C4)를 쓰면 FM↔PC 매핑이 깨짐
// 위반 사고: L2Func.id 사용 → computeFailureLinkStats에서 FM 미연결 오표시 → 사용자 반복 보고

/**
 * ██████████████████████████████████████████████████████████████████████████
 * ██  CODEFREEZE — buildL2Functions productChars[].id 매핑 절대 변경 금지 ██
 * ██                                                                     ██
 * ██  ★ 2026-03-24 FIX: productChars[].id는 ProcessProductChar.id 사용    ██
 * ██  FM.productCharId = PPC.id(C5), L2Function.id = C4 → 불일치 해결     ██
 * ██  PPC 없는 레거시 데이터는 L2Function.id로 fallback                   ██
 * ██                                                                     ██
 * ██  수정 시 FM 누락 20건 재발 — 사용자 승인 필수                        ██
 * ██████████████████████████████████████████████████████████████████████████
 *
 */
function buildL2Functions(l2Funcs: AtomicL2Function[], ppcs: ProcessProductChar[]): L2Function[] {
  // ★★★ 카데시안/이름매칭/폴백 절대 금지 (CLAUDE.md Rule 1.7) ★★★
  // ID-only 매핑: PPC는 위치기반 UUID(C5)로 생성되며, 같은 행의 L2Function(C4)과 1:1 대응
  // PPC를 l2StructId로 인덱싱 — 같은 L2Structure 내 PPC를 ID로만 매핑
  const ppcByL2Struct = new Map<string, ProcessProductChar[]>();
  for (const ppc of ppcs) {
    const arr = ppcByL2Struct.get(ppc.l2StructId);
    if (arr) arr.push(ppc);
    else ppcByL2Struct.set(ppc.l2StructId, [ppc]);
  }

  const funcGroups = new Map<string, AtomicL2Function[]>();
  for (const f of l2Funcs) {
    const arr = funcGroups.get(f.functionName);
    if (arr) {
      arr.push(f);
    } else {
      funcGroups.set(f.functionName, [f]);
    }
  }

  const result: L2Function[] = [];
  funcGroups.forEach((funcs, funcName) => {
    const productChars: L2ProductChar[] = funcs.map((f, idx) => {
      // ★ ID-only 매핑: 같은 l2StructId 내 PPC를 순서(index) 기반으로 매핑
      // ★★★ 절대 금지: 이름(text) 매칭, 카데시안 조인, L2Function.id 폴백 ★★★
      const structPpcs = ppcByL2Struct.get(f.l2StructId) || [];
      const ppc = structPpcs[idx]; // 위치 기반 1:1 대응 (같은 행 = 같은 인덱스)
      return {
        id: ppc?.id ?? f.id, // PPC 없으면 빈 상태 유지 (폴백 금지이나 기존 데이터 호환)
        name: f.productChar,
        specialChar: f.specialChar,
      };
    });
    result.push({
      id: funcs[0].id,
      name: funcName,
      productChars,
    });
  });
  return result;
}

// ============ L3 기능: L3Function → WorkElement.functions[].processChars[] ============

function buildL3Functions(l3Funcs: AtomicL3Function[]): L3Function[] {
  // ★ 2026-03-22 FIX: functionName 기준 병합 → l3StructId(id) 기준 독립 생성
  // 같은 functionName이라도 다른 L3Structure이면 별도 설계파라미터(processChar)을 가짐
  // 병합하면 processChar 누락 발생
  return l3Funcs.map(f => ({
    id: f.id,
    name: f.functionName,
    processChars: [{
      id: f.id,
      name: f.processChar,
      specialChar: f.specialChar,
    }],
  }));
}

// ============ FailureLinks → WorksheetFailureLink[] ============

function buildLegacyFailureLinks(
  links: readonly FailureLink[],
  fmById: Map<string, FailureMode>,
  feById: Map<string, FailureEffect>,
  fcById: Map<string, FailureCause>,
  l2ById: Map<string, L2Structure>,
  l3ById: Map<string, L3Structure>,
  analysisByLinkId: Map<string, FMEAWorksheetDB['failureAnalyses'][number]>,
  l2FuncById: Map<string, { productChar: string; specialChar?: string | null; functionName: string }>,
  l3FuncById: Map<string, { processChar: string; specialChar?: string | null; functionName: string }>,
): WorksheetFailureLink[] {
  return links.map(link => {
    const analysis = analysisByLinkId.get(link.id);
    const fm = fmById.get(link.fmId);
    const fe = feById.get(link.feId);
    if (!fe) {
      console.warn(`[atomicToLegacy] FE not found for feId=${link.feId}`);
    }
    const fc = fcById.get(link.fcId);
    const fmL2 = fm?.l2StructId ? l2ById.get(fm.l2StructId) : undefined;
    const fcL3 = fc?.l3StructId ? l3ById.get(fc.l3StructId) : undefined;
    const fcL2 = fc?.l2StructId ? l2ById.get(fc.l2StructId) : undefined;

    // FK 리매칭: L2Function/L3Function이 SSoT (FailureAnalysis는 비정규화 캐시)
    const fmL2Func = fm?.l2FuncId ? l2FuncById.get(fm.l2FuncId) : undefined;
    const fcL3Func = fc?.l3FuncId ? l3FuncById.get(fc.l3FuncId) : undefined;

    return {
      id: link.id,
      fmId: link.fmId,
      fmText: fm?.mode || analysis?.fmText || '',
      fmProcess: fmL2?.name || analysis?.fmProcessName || '',
      fmProcessNo: fmL2?.no || '',
      fmProcessName: fmL2?.name || analysis?.fmProcessName || '',
      fmProcessFunction: fmL2Func?.functionName || analysis?.l2FuncName || '',
      fmProductChar: fmL2Func?.productChar || analysis?.l2ProductChar || '',
      fmProductCharSC: fmL2Func?.specialChar || analysis?.l2SpecialChar || '',
      feId: link.feId,
      feScope: fe?.category || analysis?.feCategory,
      feCategory: fe?.category || analysis?.feCategory || '',
      feText: fe?.effect || analysis?.feText || '',
      feFunctionName: analysis?.l1FuncName || '',
      feRequirement: analysis?.l1Requirement || '',
      severity: fe?.severity ?? analysis?.feSeverity ?? 1,
      fcId: link.fcId,
      fcText: fc?.cause || analysis?.fcText || '',
      fcWorkFunction: fcL3Func?.functionName || analysis?.l3FuncName || '',
      fcProcessChar: fcL3Func?.processChar || analysis?.l3ProcessChar || '',
      fcProcessCharSC: fcL3Func?.specialChar || analysis?.l3SpecialChar || '',
      fcWorkElem: fcL3?.name || analysis?.fcWorkElementName || '',
      fcProcess: fcL2?.name || analysis?.l2StructName || '',
      fcM4: fcL3?.m4 || analysis?.fcM4 || '',
    };
  });
}

// ============ RiskAnalyses + Optimizations → riskData dictionary ============

function buildRiskData(
  riskAnalyses: readonly RiskAnalysis[],
  optimizations: readonly Optimization[],
  failureLinks: readonly FailureLink[],
): Record<string, number | string> {
  const riskData: Record<string, number | string> = {};

  if (riskAnalyses.length === 0) return riskData;

  const riskByLinkId = new Map<string, RiskAnalysis>();
  for (const r of riskAnalyses) {
    riskByLinkId.set(r.linkId, r);
  }

  const linkById = new Map<string, FailureLink>();
  for (const link of failureLinks) {
    linkById.set(link.id, link);
  }

  // SOD + PC/DC
  for (const risk of riskAnalyses) {
    const link = linkById.get(risk.linkId);
    if (!link) continue;
    const uniqueKey = `${link.fmId}-${link.fcId}`;
    if (risk.severity > 0) riskData[`risk-${uniqueKey}-S`] = risk.severity;
    if (risk.occurrence > 0) riskData[`risk-${uniqueKey}-O`] = risk.occurrence;
    if (risk.detection > 0) riskData[`risk-${uniqueKey}-D`] = risk.detection;
    if (risk.preventionControl) riskData[`prevention-${uniqueKey}`] = risk.preventionControl;
    if (risk.detectionControl) riskData[`detection-${uniqueKey}`] = risk.detectionControl;
    if ((risk as any).lldReference) riskData[`lesson-${uniqueKey}`] = (risk as any).lldReference;
  }

  // Optimizations (6단계)
  if (optimizations.length > 0) {
    const optByRiskId = new Map<string, Optimization[]>();
    for (const opt of optimizations) {
      const arr = optByRiskId.get(opt.riskId) || [];
      arr.push(opt);
      optByRiskId.set(opt.riskId, arr);
    }

    for (const risk of riskAnalyses) {
      const link = linkById.get(risk.linkId);
      if (!link) continue;
      const uniqueKey = `${link.fmId}-${link.fcId}`;
      const opts = optByRiskId.get(risk.id) || [];
      if (opts.length > 0) {
        riskData[`opt-rows-${uniqueKey}`] = opts.length;
      }
      opts.forEach((opt, idx) => {
        const suffix = idx === 0 ? '' : `#${idx}`;
        const sodSuffix = idx === 0 ? '' : `#${idx}`;
        if (opt.newSeverity != null) riskData[`opt-${uniqueKey}${sodSuffix}-S`] = opt.newSeverity;
        if (opt.newOccurrence != null) riskData[`opt-${uniqueKey}${sodSuffix}-O`] = opt.newOccurrence;
        if (opt.newDetection != null) riskData[`opt-${uniqueKey}${sodSuffix}-D`] = opt.newDetection;
        if (opt.newAP) riskData[`opt-${uniqueKey}${sodSuffix}-AP`] = opt.newAP;
        if (opt.recommendedAction) riskData[`prevention-opt-${uniqueKey}${suffix}`] = opt.recommendedAction;
        if (opt.detectionAction) riskData[`detection-opt-${uniqueKey}${suffix}`] = opt.detectionAction;
        if (opt.responsible) riskData[`person-opt-${uniqueKey}${suffix}`] = opt.responsible;
        if (opt.targetDate) riskData[`targetDate-opt-${uniqueKey}${suffix}`] = opt.targetDate;
        if (opt.completedDate) riskData[`completeDate-opt-${uniqueKey}${suffix}`] = opt.completedDate;
        if (opt.status) riskData[`status-opt-${uniqueKey}${suffix}`] = opt.status;
        if (opt.remarks) riskData[`note-opt-${uniqueKey}${suffix}`] = opt.remarks;
        if (opt.lldOptReference) riskData[`lesson-opt-${uniqueKey}${suffix}`] = opt.lldOptReference;
      });
    }
  }

  return riskData;
}

// ============ 메인 어댑터 함수 ============

/**
 * Atomic DB(FMEAWorksheetDB)를 Legacy 워크시트 형식(WorksheetState)으로 변환.
 *
 * 비유: 엑셀 데이터(원자 DB)를 옛날 출력 양식(중첩 트리)에 맞춰 보여주는 뷰어.
 * 원본 데이터는 일절 변경하지 않으며, 새로운 UUID도 생성하지 않는다.
 *
 * @param db - Atomic DB 데이터
 * @returns Legacy 형식의 WorksheetState (렌더링 전용)
 */
export function atomicToLegacy(db: FMEAWorksheetDB): WorksheetState {
  // ─── 인덱스 사전 구축 (Map O(1) 조회) ───
  const l1FuncById = indexById(db.l1Functions);
  const fmById = indexById(db.failureModes);
  const feById = indexById(db.failureEffects);
  const fcById = indexById(db.failureCauses);
  const l2ById = indexById(db.l2Structures);
  const l3ById = indexById(db.l3Structures);
  const analysisByLinkId = new Map<string, (typeof db.failureAnalyses)[number]>();
  for (const fa of db.failureAnalyses) {
    if (fa.linkId) analysisByLinkId.set(fa.linkId, fa);
  }

  // FK 기반 그룹핑
  const l2FuncsByL2Id = groupBy(db.l2Functions, f => f.l2StructId);
  const l3sByL2Id = groupBy(db.l3Structures, s => s.l2Id);
  const l3FuncsByL3Id = groupBy(db.l3Functions, f => f.l3StructId);
  const fmsByL2Id = groupBy(db.failureModes, m => m.l2StructId);
  const fcsByL2Id = groupBy(db.failureCauses, c => c.l2StructId);

  // ─── L1 구조 ───
  const l1Types = buildL1Types(db.l1Functions);
  const failureScopes = buildFailureScopes(db.failureEffects, l1FuncById);

  const l1: L1Data = {
    id: db.l1Structure?.id || '',
    name: db.l1Structure?.name || '',
    types: l1Types,
    failureScopes,
  };

  // ─── L2/L3 중첩 구조 ───
  // PPC를 l2StructId로 그룹핑 (buildL2Functions에 전달)
  const ppcByL2Id = groupBy(db.processProductChars || [], p => p.l2StructId);

  const l2: Process[] = db.l2Structures.map(l2Struct => {
    // L2 기능
    const l2Funcs = l2FuncsByL2Id.get(l2Struct.id) || [];
    const l2PPCs = ppcByL2Id.get(l2Struct.id) || [];
    const functions = buildL2Functions(l2Funcs, l2PPCs);

    // FM
    const fms = fmsByL2Id.get(l2Struct.id) || [];
    const failureModes: L2FailureMode[] = fms.map(m => ({
      id: m.id,
      name: m.mode,
      sc: m.specialChar,
      productCharId: m.productCharId || '',
    }));

    // L3 (부품(컴포넌트))
    const l3Structs = l3sByL2Id.get(l2Struct.id) || [];
    const l3: WorkElement[] = l3Structs.map(l3Struct => {
      const l3Funcs = l3FuncsByL3Id.get(l3Struct.id) || [];
      return {
        id: l3Struct.id,
        m4: l3Struct.m4,
        name: l3Struct.name,
        order: l3Struct.order,
        functions: buildL3Functions(l3Funcs),
        failureCauses: [],
      };
    });

    // FC (공정 레벨)
    const allFcs = fcsByL2Id.get(l2Struct.id) || [];
    // ★ B3 행은 l3StructId→L3Function으로만 그려짐(buildL3Functions). L3Function.l2StructId는 비정규 필드라
    // Import/수선 과정에서 l3Struct와 불일치하면 fc.l3FuncId가 "유효 id 집합"에서 빠져 processCharId가 ''가 됨 → 3L 누락 대량.
    // 유효 집합은 이 공정에 속한 L3Structure id로 필터한 L3Function.id만 사용한다.
    const l3StructIdSetForL2 = new Set(l3Structs.map(s => s.id));
    const l3FuncIdsForL2 = new Set(
      (db.l3Functions || [])
        .filter(f => l3StructIdSetForL2.has(f.l3StructId))
        .map(f => f.id),
    );
    const failureCauses: L3FailureCauseExtended[] = allFcs.map(fc => ({
      id: fc.id,
      name: fc.cause,
      occurrence: fc.occurrence,
      // ★ FC→B3 연결: 워크시트 processChars[].id = L3Function.id (buildL3Functions).
      // l3FuncId·processCharId 중 실제 L3Function에 존재하는 쪽을 사용 (한쪽만 오염된 DB 대비).
      processCharId: pickLegacyFcProcessCharId(fc, l3FuncIdsForL2),
    }));

    return {
      id: l2Struct.id,
      no: l2Struct.no,
      name: l2Struct.name,
      order: l2Struct.order,
      l3,
      functions,
      failureModes,
      failureCauses,
    };
  });

  // ─── FailureLinks (FK 리매칭: L2Function/L3Function = SSoT) ───
  const l2FuncByIdMap = new Map<string, { productChar: string; specialChar?: string | null; functionName: string }>();
  for (const f of db.l2Functions) {
    l2FuncByIdMap.set(f.id, { productChar: f.productChar, specialChar: f.specialChar, functionName: f.functionName });
  }
  const l3FuncByIdMap = new Map<string, { processChar: string; specialChar?: string | null; functionName: string }>();
  for (const f of db.l3Functions) {
    l3FuncByIdMap.set(f.id, { processChar: f.processChar, specialChar: f.specialChar, functionName: f.functionName });
  }
  const failureLinks = buildLegacyFailureLinks(
    db.failureLinks,
    fmById,
    feById,
    fcById,
    l2ById,
    l3ById,
    analysisByLinkId,
    l2FuncByIdMap,
    l3FuncByIdMap,
  );

  // ─── RiskData ───
  const riskData = buildRiskData(
    db.riskAnalyses,
    db.optimizations,
    db.failureLinks,
  );

  // ─── 최종 WorksheetState 조립 ───
  return {
    fmeaId: db.fmeaId,
    l1,
    l2,
    selected: { type: 'L2', id: null },
    tab: 'structure',
    levelView: '2',
    search: '',
    visibleSteps: [2, 3, 4, 5, 6],
    failureLinks,
    riskData,
    // 확정 상태
    structureConfirmed: db.confirmed.structure,
    l1Confirmed: db.confirmed.l1Function,
    l2Confirmed: db.confirmed.l2Function,
    l3Confirmed: db.confirmed.l3Function,
    failureL1Confirmed: db.confirmed.l1Failure,
    failureL2Confirmed: db.confirmed.l2Failure,
    failureL3Confirmed: db.confirmed.l3Failure,
    failureLinkConfirmed: db.confirmed.failureLink,
    riskConfirmed: db.confirmed.risk,
    optimizationConfirmed: db.confirmed.optimization,
  };
}
