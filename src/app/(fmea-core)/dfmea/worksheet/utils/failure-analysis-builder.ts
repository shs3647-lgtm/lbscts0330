/**
 * @file failure-analysis-builder.ts
 * @description 고장분석 통합 데이터 생성 유틸리티
 *
 * 고장연결(FailureLink) 결과를 기반으로 역전개 정보를 조합하여
 * All 화면 렌더링용 FailureAnalysis 데이터를 생성합니다.
 *
 * 생성 데이터:
 * - 고장연결 정보 (FM, FE, FC)
 * - 역전개 기능분석 (L1/L2/L3 Function)
 * - 역전개 구조분석 (L1/L2/L3 Structure)
 */

import {
  FMEAWorksheetDB,
  FailureAnalysis,
  FailureLink,
  FailureMode,
  FailureEffect,
  FailureCause,
  L1Function,
  L2Function,
  L3Function,
  L2Structure,
  L3Structure,
  uid,
} from '../schema';

/**
 * 고장연결 데이터를 기반으로 고장분석 통합 데이터 생성
 *
 * @param db - FMEA 워크시트 DB
 * @returns FailureAnalysis[] - 고장분석 통합 데이터 배열
 */
export function buildFailureAnalyses(db: FMEAWorksheetDB): FailureAnalysis[] {
  const { failureLinks, failureModes, failureEffects, failureCauses } = db;
  const { l1Functions, l2Functions, l3Functions } = db;
  const { l1Structure, l2Structures, l3Structures } = db;

  if (!failureLinks || failureLinks.length === 0) {
    return [];
  }


  const failureAnalyses: FailureAnalysis[] = [];
  let order = 0;

  failureLinks.forEach((link: FailureLink) => {
    // ========== 고장 데이터 조회 ==========
    const fm = failureModes.find((m: FailureMode) => m.id === link.fmId);
    const fe = failureEffects.find((e: FailureEffect) => e.id === link.feId);
    const fc = failureCauses.find((c: FailureCause) => c.id === link.fcId);

    if (!fm) {
      return;
    }

    // ========== 역전개: 구조분석 데이터 조회 ==========
    // L2 Structure (FM -> l2StructId)
    const l2Struct = l2Structures.find((s: L2Structure) => s.id === fm.l2StructId);
    // L3 Structure (FC -> l3StructId)
    const l3Struct = fc ? l3Structures.find((s: L3Structure) => s.id === fc.l3StructId) : null;

    // ========== 역전개: 기능분석 데이터 조회 ==========
    // L2 Function (FM -> l2FuncId)
    const l2Func = l2Functions.find((f: L2Function) => f.id === fm.l2FuncId);
    // L1 Function (FE -> l1FuncId)
    const l1Func = fe ? l1Functions.find((f: L1Function) => f.id === fe.l1FuncId) : null;
    // L3 Function (FC -> l3FuncId)
    const l3Func = fc ? l3Functions.find((f: L3Function) => f.id === fc.l3FuncId) : null;

    // ========== 고장분석 통합 데이터 생성 ==========
    const analysis: FailureAnalysis = {
      id: uid(),
      fmeaId: db.fmeaId,
      linkId: link.id,

      // 고장연결 정보
      fmId: fm.id,
      fmText: fm.mode || '',
      fmProcessName: l2Struct?.name || link.cache?.fmProcess || '',

      feId: fe?.id || link.feId || '',
      feText: fe?.effect || link.cache?.feText || '',
      feCategory: fe?.category || link.cache?.feCategory || '',
      feSeverity: fe?.severity ?? link.cache?.feSeverity ?? 0,

      fcId: fc?.id || link.fcId || '',
      fcText: fc?.cause || link.cache?.fcText || '',
      fcOccurrence: fc?.occurrence ?? 0,
      fcWorkElementName: l3Struct?.name || link.cache?.fcWorkElem || '',
      fcM4: l3Struct?.m4 || '',

      // 역전개 기능분석
      l1FuncId: l1Func?.id || '',
      l1Category: l1Func?.category || fe?.category || '',
      l1FuncName: l1Func?.functionName || '',
      l1Requirement: l1Func?.requirement || '',

      l2FuncId: l2Func?.id || '',
      l2FuncName: l2Func?.functionName || '',
      l2ProductChar: l2Func?.productChar || '',
      l2SpecialChar: l2Func?.specialChar || '',

      l3FuncId: l3Func?.id || '',
      l3FuncName: l3Func?.functionName || '',
      l3ProcessChar: l3Func?.processChar || '',
      l3SpecialChar: l3Func?.specialChar || '',

      // 역전개 구조분석
      l1StructId: l1Structure?.id || '',
      l1StructName: l1Structure?.name || '',

      l2StructId: l2Struct?.id || '',
      l2StructNo: l2Struct?.no || '',
      l2StructName: l2Struct?.name || '',

      l3StructId: l3Struct?.id || '',
      l3StructM4: l3Struct?.m4 || '',
      l3StructName: l3Struct?.name || '',

      // 메타데이터
      order: order++,
      confirmed: db.confirmed?.failureLink || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    failureAnalyses.push(analysis);
  });

  return failureAnalyses;
}

/**
 * 기존 고장분석 데이터 업데이트 (링크 기준으로 매칭)
 * - 이미 존재하는 분석은 업데이트
 * - 새로운 링크는 추가
 * - 삭제된 링크는 제거
 */
export function updateFailureAnalyses(
  existingAnalyses: FailureAnalysis[],
  db: FMEAWorksheetDB
): FailureAnalysis[] {
  const newAnalyses = buildFailureAnalyses(db);

  // linkId 기준으로 매칭
  const linkIdMap = new Map<string, FailureAnalysis>();
  existingAnalyses.forEach(a => {
    if (a.linkId) linkIdMap.set(a.linkId, a);
  });

  return newAnalyses.map(newA => {
    const existing = linkIdMap.get(newA.linkId);
    if (existing) {
      // 기존 ID 유지, 나머지 업데이트
      return {
        ...newA,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
    }
    return newA;
  });
}

/**
 * 고장분석 데이터 유효성 검증
 */
export function validateFailureAnalyses(analyses: FailureAnalysis[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  analyses.forEach((a, idx) => {
    // 필수 필드 검증
    if (!a.fmId) errors.push(`[${idx}] FM ID 누락`);
    if (!a.fmText) warnings.push(`[${idx}] FM 텍스트 누락`);
    if (!a.feId && !a.fcId) warnings.push(`[${idx}] FE/FC 둘 다 누락`);

    // 역전개 데이터 검증
    if (!a.l2StructId) warnings.push(`[${idx}] L2 구조 ID 누락 (역전개 불완전)`);
    if (!a.l2FuncId) warnings.push(`[${idx}] L2 기능 ID 누락 (역전개 불완전)`);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

