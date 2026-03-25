// CODEFREEZE — 2026-03-18 au bump DB/UUID/FK 무결성 100% 검증 완료
/**
 * @file atomicToChains.ts
 * @description Atomic DB → MasterFailureChain[] 역변환 (리버스엔지니어링)
 *
 * 비유: 완성된 요리(DB)에서 "소스 레시피(고장사슬)"를 역으로 추출하되,
 * 재요리 시 같은 재료번호(genXxx UUID)를 사용하도록 번호를 재매핑하는 함수.
 *
 * 핵심: IdRemapTable을 받아 모든 chain의 fmId/fcId/feId를
 * genXxx 결정론적 ID로 설정 → assignChainUUIDs early return 동작
 * → 텍스트 매칭 완전 스킵.
 *
 * @created 2026-03-17
 */

import type { MasterFailureChain } from '../types/masterFailureChain';
import type {
  FMEAWorksheetDB,
  RiskAnalysis,
} from '@/app/(fmea-core)/pfmea/worksheet/schema';
import type { IdRemapTable } from './atomicToFlatData';

// ─── 헬퍼 ───

function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return map;
}

// ─── 메인 함수 ───

/**
 * Atomic DB → MasterFailureChain[] 역변환
 *
 * IdRemapTable을 사용하여 원본 DB ID를 genXxx ID로 재매핑.
 * 모든 chain에 fmId/fcId/feId가 genXxx 형식으로 설정되므로
 * assignChainUUIDs에서 텍스트 매칭이 완전히 스킵된다.
 */
export function atomicToChains(
  db: FMEAWorksheetDB,
  idRemap: IdRemapTable,
): MasterFailureChain[] {
  if (!db.failureLinks || db.failureLinks.length === 0) {
    return [];
  }

  // ─── 인덱스 빌드 ───
  const fmById = indexById(db.failureModes);
  const feById = indexById(db.failureEffects);
  const fcById = indexById(db.failureCauses);
  const l2ById = indexById(db.l2Structures);
  const l3ById = indexById(db.l3Structures);
  const l2FuncById = indexById(db.l2Functions);
  const l3FuncById = indexById(db.l3Functions);

  const riskByLink = new Map<string, RiskAnalysis>();
  for (const risk of db.riskAnalyses) {
    if (!riskByLink.has(risk.linkId)) riskByLink.set(risk.linkId, risk);
  }

  // ─── FailureLink → MasterFailureChain 변환 ───
  const chains: MasterFailureChain[] = [];

  for (const link of db.failureLinks) {
    const fm = fmById.get(link.fmId);
    const fe = feById.get(link.feId);
    const fc = fcById.get(link.fcId);

    if (!fm || !fe || !fc) continue;

    // 역전개
    const l2 = l2ById.get(fm.l2StructId);
    const processNo = l2?.no || '';
    const l3 = l3ById.get(fc.l3StructId);
    const m4 = l3?.m4 || '';
    const workElement = l3?.name || '';
    const risk = riskByLink.get(link.id);
    const l2Func = l2FuncById.get(fm.l2FuncId);
    const l3Func = l3FuncById.get(fc.l3FuncId);

    // ★★★ 핵심: genXxx ID로 재매핑 ★★★
    const remappedFmId = idRemap.fm.get(fm.id) || fm.id;
    const remappedFcId = idRemap.fc.get(fc.id) || fc.id;
    const remappedFeId = idRemap.fe.get(fe.id) || fe.id;

    chains.push({
      id: link.id,
      processNo,
      m4: m4 || undefined,
      workElement: workElement || undefined,

      // ★★★ genXxx 재매핑된 UUID FK ★★★
      fmValue: fm.mode,
      fmId: remappedFmId,
      fmFlatId: remappedFmId,

      fcValue: fc.cause,
      fcId: remappedFcId,
      fcFlatId: remappedFcId,

      feValue: fe.effect,
      feId: remappedFeId,
      feFlatId: remappedFeId,

      feSeverity: fe.severity,
      feScope: fe.category,

      severity: risk?.severity,
      occurrence: risk?.occurrence,
      detection: risk?.detection,

      pcValue: risk?.preventionControl || undefined,
      dcValue: risk?.detectionControl || undefined,

      l2Function: l2Func?.functionName || undefined,
      productChar: l2Func?.productChar || undefined,
      l3Function: l3Func?.functionName || undefined,
      processChar: l3Func?.processChar || undefined,

      specialChar: l2Func?.specialChar || l3Func?.specialChar || undefined,
      fmMergeSpan: link.rowSpan || undefined,
    });
  }

  return chains;
}
