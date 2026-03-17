/**
 * @file atomicToFlatData.ts
 * @description Atomic DB → ImportedFlatData[] 역변환 (리버스엔지니어링)
 *
 * 비유: 완성된 요리(DB)의 레시피를 역으로 추출하는 함수.
 * 완벽히 연결된 DB 데이터를 flatData로 역변환하여,
 * buildWorksheetState에 넣으면 동일한 WorksheetState를 재구성할 수 있다.
 *
 * 핵심: flatData.id에 genXxx UUID를 그대로 넣어
 * buildWorksheetState의 `id?.startsWith('PF-')` 분기에서 UUID가 보존됨.
 *
 * @created 2026-03-17
 */

import type { ImportedFlatData } from '../types';
import type {
  FMEAWorksheetDB,
  L2Structure,
  L3Structure,
  L1Function as AtomicL1Function,
  L2Function as AtomicL2Function,
  L3Function as AtomicL3Function,
  FailureEffect,
  FailureMode,
  FailureCause,
  RiskAnalysis,
  FailureLink,
} from '@/app/(fmea-core)/pfmea/worksheet/schema';

// ─── 헬퍼: Map 기반 인덱스 빌더 (atomicToLegacyAdapter 패턴 재활용) ───

function groupBy<T>(items: readonly T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const arr = map.get(key);
    if (arr) arr.push(item);
    else map.set(key, [item]);
  }
  return map;
}

function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return map;
}

// ─── 메인 함수 ───

export interface AtomicToFlatConfig {
  fmeaId: string;
}

/**
 * Atomic DB → ImportedFlatData[] 역변환
 *
 * 모든 flatData.id는 Atomic 엔티티의 genXxx UUID를 그대로 사용하여
 * buildWorksheetState Phase 2에서 UUID가 보존된다.
 */
export function atomicToFlatData(
  db: FMEAWorksheetDB,
  config: AtomicToFlatConfig,
): ImportedFlatData[] {
  const result: ImportedFlatData[] = [];
  const now = new Date();

  // ─── 인덱스 빌드 ───
  const l2ById = indexById(db.l2Structures);
  const l3ById = indexById(db.l3Structures);
  const l2FuncsByL2 = groupBy(db.l2Functions, f => f.l2StructId);
  const l3FuncsByL3 = groupBy(db.l3Functions, f => f.l3StructId);
  const fmsByL2 = groupBy(db.failureModes, fm => fm.l2StructId);
  const fcsByL3 = groupBy(db.failureCauses, fc => fc.l3StructId);
  const fcsByL2 = groupBy(db.failureCauses, fc => fc.l2StructId);
  const riskByLink = new Map<string, RiskAnalysis>();
  for (const risk of db.riskAnalyses) {
    if (!riskByLink.has(risk.linkId)) riskByLink.set(risk.linkId, risk);
  }

  // ─── C 계열: L1 (완제품 공정) ───
  // C1: 구분 (category)
  const l1FuncsByCategory = groupBy(db.l1Functions, f => f.category);
  const categories = [...l1FuncsByCategory.keys()];

  for (const category of categories) {
    // C1: 구분
    result.push(makeFlatItem({
      id: `C1-${category}`,
      processNo: category,
      category: 'C',
      itemCode: 'C1',
      value: category,
      createdAt: now,
    }));

    const funcs = l1FuncsByCategory.get(category) || [];
    // functionName별 그룹핑 (C2 = 기능, C3 = 요구사항)
    const funcsByName = groupBy(funcs, f => f.functionName);
    const funcNames = [...funcsByName.keys()];

    for (let fi = 0; fi < funcNames.length; fi++) {
      const funcName = funcNames[fi];
      const funcGroup = funcsByName.get(funcName) || [];
      const firstFunc = funcGroup[0];

      // C2: 기능
      const c2Id = firstFunc.id;
      result.push(makeFlatItem({
        id: c2Id,
        processNo: category,
        category: 'C',
        itemCode: 'C2',
        value: funcName,
        createdAt: now,
      }));

      // C3: 요구사항 (각 L1Function = 1 요구사항)
      for (let ri = 0; ri < funcGroup.length; ri++) {
        const req = funcGroup[ri];
        result.push(makeFlatItem({
          id: req.id,
          processNo: category,
          category: 'C',
          itemCode: 'C3',
          value: req.requirement,
          parentItemId: c2Id,
          createdAt: now,
        }));
      }
    }
  }

  // C4: 고장영향 (FailureEffect)
  // FE → L1Function FK → category + requirement 역추적
  const l1FuncById = indexById(db.l1Functions);
  for (const fe of db.failureEffects) {
    const l1Func = l1FuncById.get(fe.l1FuncId);
    result.push(makeFlatItem({
      id: fe.id,
      processNo: l1Func?.category || fe.category || 'Your Plant',
      category: 'C',
      itemCode: 'C4',
      value: fe.effect,
      parentItemId: fe.l1FuncId,
      createdAt: now,
    }));
  }

  // ─── A 계열: L2 (공정) ───
  // L2Structures를 순서대로 처리
  const sortedL2 = [...db.l2Structures].sort((a, b) => a.order - b.order);

  for (const l2 of sortedL2) {
    // A1: 공정번호
    result.push(makeFlatItem({
      id: `${l2.id}-A1`,
      processNo: l2.no,
      category: 'A',
      itemCode: 'A1',
      value: l2.no,
      createdAt: now,
    }));

    // A2: 공정명
    result.push(makeFlatItem({
      id: `${l2.id}-A2`,
      processNo: l2.no,
      category: 'A',
      itemCode: 'A2',
      value: l2.name,
      createdAt: now,
    }));

    // A3: 공정기능 (L2Function.functionName)
    const l2Funcs = l2FuncsByL2.get(l2.id) || [];
    // functionName 중복 제거 (같은 functionName의 여러 L2Function = 같은 A3)
    const seenFuncNames = new Set<string>();
    const uniqueL2Funcs: AtomicL2Function[] = [];
    for (const f of l2Funcs) {
      if (!seenFuncNames.has(f.functionName)) {
        seenFuncNames.add(f.functionName);
        uniqueL2Funcs.push(f);
      }
    }

    for (const l2Func of uniqueL2Funcs) {
      result.push(makeFlatItem({
        id: l2Func.id,
        processNo: l2.no,
        category: 'A',
        itemCode: 'A3',
        value: l2Func.functionName,
        createdAt: now,
      }));
    }

    // A4: 제품특성 (L2Function.productChar — 공정 단위 중복 제거)
    const seenPC = new Set<string>();
    for (const l2Func of l2Funcs) {
      if (l2Func.productChar && !seenPC.has(l2Func.productChar)) {
        seenPC.add(l2Func.productChar);
        // A4의 id = 기존 L2Function의 id에서 파생 (또는 productCharId)
        const pcId = l2Func.id;
        result.push(makeFlatItem({
          id: pcId,
          processNo: l2.no,
          category: 'A',
          itemCode: 'A4',
          value: l2Func.productChar,
          specialChar: l2Func.specialChar || undefined,
          createdAt: now,
        }));
      }
    }

    // A5: 고장형태 (FailureMode)
    const fms = fmsByL2.get(l2.id) || [];
    for (const fm of fms) {
      result.push(makeFlatItem({
        id: fm.id,
        processNo: l2.no,
        category: 'A',
        itemCode: 'A5',
        value: fm.mode,
        parentItemId: fm.productCharId || undefined,
        createdAt: now,
      }));
    }

    // A6: 검출관리 (RiskAnalysis.detectionControl — 공정별 수집)
    const procLinkIds = new Set<string>();
    for (const link of db.failureLinks) {
      const linkFm = db.failureModes.find(fm => fm.id === link.fmId);
      if (linkFm && linkFm.l2StructId === l2.id) {
        procLinkIds.add(link.id);
      }
    }
    const dcValues = new Set<string>();
    for (const linkId of procLinkIds) {
      const risk = riskByLink.get(linkId);
      if (risk?.detectionControl?.trim() && !dcValues.has(risk.detectionControl.trim())) {
        dcValues.add(risk.detectionControl.trim());
        result.push(makeFlatItem({
          id: `${l2.id}-A6-${dcValues.size}`,
          processNo: l2.no,
          category: 'A',
          itemCode: 'A6',
          value: risk.detectionControl.trim(),
          createdAt: now,
        }));
      }
    }

    // ─── B 계열: L3 (작업요소) ───
    const l3sForL2 = db.l3Structures
      .filter(l3 => l3.l2Id === l2.id)
      .sort((a, b) => a.order - b.order);

    for (const l3 of l3sForL2) {
      // B1: 작업요소명
      result.push(makeFlatItem({
        id: l3.id,
        processNo: l2.no,
        category: 'B',
        itemCode: 'B1',
        value: l3.name,
        m4: l3.m4 || undefined,
        createdAt: now,
      }));

      // B2: 요소기능 (L3Function.functionName)
      const l3Funcs = l3FuncsByL3.get(l3.id) || [];
      const seenL3FuncNames = new Set<string>();
      for (const l3Func of l3Funcs) {
        if (!seenL3FuncNames.has(l3Func.functionName)) {
          seenL3FuncNames.add(l3Func.functionName);
          result.push(makeFlatItem({
            id: l3Func.id,
            processNo: l2.no,
            category: 'B',
            itemCode: 'B2',
            value: l3Func.functionName,
            m4: l3.m4 || undefined,
            parentItemId: l3.id,
            createdAt: now,
          }));
        }
      }

      // B3: 공정특성 (L3Function.processChar)
      const seenProcessChar = new Set<string>();
      for (const l3Func of l3Funcs) {
        if (l3Func.processChar && !seenProcessChar.has(l3Func.processChar)) {
          seenProcessChar.add(l3Func.processChar);
          result.push(makeFlatItem({
            id: `${l3Func.id}-B3`,
            processNo: l2.no,
            category: 'B',
            itemCode: 'B3',
            value: l3Func.processChar,
            m4: l3.m4 || undefined,
            specialChar: l3Func.specialChar || undefined,
            parentItemId: l3.id,
            createdAt: now,
          }));
        }
      }

      // B4: 고장원인 (FailureCause)
      const fcs = fcsByL3.get(l3.id) || [];
      for (const fc of fcs) {
        result.push(makeFlatItem({
          id: fc.id,
          processNo: l2.no,
          category: 'B',
          itemCode: 'B4',
          value: fc.cause,
          m4: l3.m4 || undefined,
          createdAt: now,
        }));
      }

      // B5: 예방관리 (RiskAnalysis.preventionControl — l3별 수집)
      const l3FcIds = new Set(fcs.map(fc => fc.id));
      const pcValues = new Set<string>();
      for (const link of db.failureLinks) {
        if (l3FcIds.has(link.fcId)) {
          const risk = riskByLink.get(link.id);
          if (risk?.preventionControl?.trim() && !pcValues.has(risk.preventionControl.trim())) {
            pcValues.add(risk.preventionControl.trim());
            result.push(makeFlatItem({
              id: `${l3.id}-B5-${pcValues.size}`,
              processNo: l2.no,
              category: 'B',
              itemCode: 'B5',
              value: risk.preventionControl.trim(),
              m4: l3.m4 || undefined,
              createdAt: now,
            }));
          }
        }
      }
    }

    // ★ L2 직속 FC (l3에 속하지 않는 FC) — B4로 변환
    const l3FcIdSet = new Set<string>();
    for (const l3 of l3sForL2) {
      for (const fc of (fcsByL3.get(l3.id) || [])) {
        l3FcIdSet.add(fc.id);
      }
    }
    const l2DirectFcs = (fcsByL2.get(l2.id) || []).filter(fc => !l3FcIdSet.has(fc.id));
    for (const fc of l2DirectFcs) {
      result.push(makeFlatItem({
        id: fc.id,
        processNo: l2.no,
        category: 'B',
        itemCode: 'B4',
        value: fc.cause,
        createdAt: now,
      }));
    }
  }

  return result;
}

// ─── flatData 팩토리 ───

function makeFlatItem(params: {
  id: string;
  processNo: string;
  category: 'A' | 'B' | 'C';
  itemCode: string;
  value: string;
  m4?: string;
  specialChar?: string;
  parentItemId?: string;
  createdAt: Date;
}): ImportedFlatData {
  return {
    id: params.id,
    processNo: params.processNo,
    category: params.category as 'A' | 'B' | 'C',
    itemCode: params.itemCode,
    value: params.value,
    m4: params.m4,
    specialChar: params.specialChar,
    parentItemId: params.parentItemId,
    createdAt: params.createdAt,
  };
}
