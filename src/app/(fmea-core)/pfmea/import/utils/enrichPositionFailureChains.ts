/**
 * 위치기반 Import: FC 시트 → MasterFailureChain 매핑 시 누락된 4M·작업요소 보강
 * - fcId → FailureCause.l3StructId → L3Structure(m4, name=B1) 조회만 사용 (텍스트 매칭 없음)
 */

import type { PositionAtomicData } from '@/types/position-import';
import type { MasterFailureChain } from '../types/masterFailureChain';

export function enrichPositionChainsFromAtomicData(
  chains: MasterFailureChain[],
  data: PositionAtomicData,
): MasterFailureChain[] {
  const causeById = new Map(data.failureCauses.map((c) => [c.id, c]));
  const l3ById = new Map(data.l3Structures.map((s) => [s.id, s]));

  return chains.map((ch) => {
    const fcId = ch.fcId?.trim();
    if (!fcId) return ch;

    const needM4 = !ch.m4?.trim();
    const needWe = !ch.workElement?.trim();
    if (!needM4 && !needWe) return ch;

    const cause = causeById.get(fcId);
    if (!cause) return ch;

    const l3 = l3ById.get(cause.l3StructId);
    if (!l3) return ch;

    const next: MasterFailureChain = { ...ch };
    if (needM4 && l3.m4?.trim()) next.m4 = l3.m4.trim();
    if (needWe && l3.name?.trim()) next.workElement = l3.name.trim();
    return next;
  });
}

/** 동일 fmId+fcId+feId FailureLink 중복 행(미리보기·마스터 JSON) 1건으로 정리 — FK만 사용 */
export function dedupeFailureChainsByFkTriplet(chains: MasterFailureChain[]): MasterFailureChain[] {
  if (chains.length <= 1) return chains;
  const seen = new Set<string>();
  const out: MasterFailureChain[] = [];
  for (const ch of chains) {
    const fcId = ch.fcId?.trim();
    const fmId = ch.fmId?.trim();
    const feId = ch.feId?.trim();
    if (fcId && fmId && feId) {
      const k = `${fcId}|${fmId}|${feId}`;
      if (seen.has(k)) continue;
      seen.add(k);
    }
    out.push(ch);
  }
  return out;
}
