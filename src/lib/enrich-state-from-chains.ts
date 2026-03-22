/**
 * @file enrich-state-from-chains.ts
 * @description 체인의 FM/FE/FC를 워크시트 상태에 보강
 *
 * 문제: injectFailureChains는 텍스트 매칭으로 FM/FE/FC를 찾지만,
 * 체인과 flat data의 FM/FE/FC 텍스트가 완전히 다를 수 있음.
 * 이 경우 39개 체인 전부 매칭 실패 → FailureLinks = 0
 *
 * 해결: injectFailureChains 호출 전에, 체인에 있는 FM/FE/FC 텍스트를
 * 워크시트 상태에 미리 추가하여 매칭률 극대화
 *
 * 안전성:
 * - 이미 존재하는 항목은 건너뜀 (중복 방지)
 * - processNo가 L2에 없는 체인은 건너뜀 (구조 변경 방지)
 * - 원본 flat data 기반 항목은 절대 수정하지 않음
 */

import type {
  WorksheetState,
  Process,
  L1FailureScope,
  L2FailureMode,
  L3FailureCauseExtended,
} from '@/app/(fmea-core)/pfmea/worksheet/constants';
import { SCOPE_LABEL_EN } from '@/lib/fmea/scope-constants';
import { uid } from '@/app/(fmea-core)/pfmea/worksheet/constants';

export interface ChainRecord {
  processNo?: string;
  fmValue?: string;
  fmId?: string;     // ★★★ 2026-03-21 FIX: FK-only — ID-based dedup용
  feValue?: string;
  feId?: string;     // ★★★ 2026-03-21 FIX: FK-only — ID-based dedup용
  fcValue?: string;
  fcId?: string;     // ★★★ 2026-03-21 FIX: FK-only — ID-based dedup용
  feScope?: string;
  m4?: string;
  severity?: number;
  [key: string]: unknown;
}

export interface EnrichStats {
  addedFM: number;
  addedFE: number;
  addedFC: number;
  addedPC: number;
  skippedNoProc: number;
}

// ★★★ 2026-03-21 FIX: FK-only — normalize/normalizeStrict/normalizeProcessNo fuzzy matching 삭제, exact matching only

/**
 * 체인의 FM/FE/FC 텍스트를 워크시트 상태에 추가
 *
 * - 이미 존재하는 항목은 건너뜀 (중복 방지)
 * - processNo가 L2에 없는 체인은 건너뜀 (구조 변경 방지)
 *
 * @returns 추가된 항목 수 통계
 */
export function enrichStateFromChains(
  state: WorksheetState,
  chains: ChainRecord[],
): EnrichStats {
  const stats: EnrichStats = { addedFM: 0, addedFE: 0, addedFC: 0, addedPC: 0, skippedNoProc: 0 };

  if (!chains || chains.length === 0) return stats;

  // ★★★ 2026-03-21 FIX: FK-only — exact processNo matching only (fuzzy normalizeProcessNo 삭제)
  const procByNo = new Map<string, Process>();
  for (const proc of (state.l2 || [])) {
    if (proc.no) {
      procByNo.set(proc.no, proc);
    }
  }

  // ★★★ 2026-03-21 FIX: FK-only — FE ID-based dedup (텍스트 dedup 삭제)
  const existingFE = new Set<string>();
  for (const fe of (state.l1?.failureScopes || [])) {
    if (fe.id) existingFE.add(fe.id);
  }

  // ★★★ 2026-03-21 FIX: FK-only — FM ID-based dedup (텍스트 dedup 삭제)
  const existingFM = new Set<string>();
  for (const proc of (state.l2 || [])) {
    for (const fm of (proc.failureModes || [])) {
      if (fm.id) existingFM.add(fm.id);
    }
  }

  // ★★★ 2026-03-21 FIX: FK-only — FC ID-based dedup (텍스트 dedup 삭제)
  const existingFC = new Set<string>();
  for (const proc of (state.l2 || [])) {
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        if (fc.id) existingFC.add(fc.id);
      }
    }
    for (const fc of (proc.failureCauses || [])) {
      if (fc.id) existingFC.add(fc.id);
    }
  }

  // ★★★ 2026-03-21 FIX: FK-only — productChars ID-based dedup (텍스트 dedup 삭제)
  const existingPCByProc = new Map<string, Set<string>>();
  for (const proc of (state.l2 || [])) {
    const pcIds = new Set<string>();
    for (const fn of (proc.functions || [])) {
      for (const pc of (fn.productChars || [])) {
        if (pc.id) pcIds.add(pc.id);
      }
    }
    existingPCByProc.set(proc.no, pcIds);
  }

  let addedPC = 0;
  for (const chain of chains) {
    const pcName = (chain as Record<string, unknown>).productChar as string | undefined;
    const pcId = (chain as Record<string, unknown>).productCharId as string | undefined;
    if (!pcName?.trim() || !chain.processNo) continue;

    const proc = procByNo.get(chain.processNo); // ★★★ 2026-03-21 FIX: FK-only — exact processNo only
    if (!proc) continue;

    // ★★★ 2026-03-21 FIX: FK-only — ID-based dedup
    if (pcId) {
      const existing = existingPCByProc.get(proc.no);
      if (existing?.has(pcId)) continue;
    }

    // placeholder 교체: 첫 번째 빈 이름 productChar를 찾아 교체
    let replaced = false;
    for (const fn of (proc.functions || [])) {
      for (const pc of (fn.productChars || [])) {
        if (!pc.name || !pc.name.trim()) {
          pc.name = pcName.trim();
          replaced = true;
          break;
        }
      }
      if (replaced) break;
    }

    if (!replaced && proc.functions && proc.functions.length > 0) {
      const targetFn = proc.functions[0];
      if (!targetFn.productChars) (targetFn as unknown as { productChars: Array<{ id: string; name: string; specialChar?: string }> }).productChars = [];
      targetFn.productChars.push({
        id: uid(), name: pcName.trim(), specialChar: '',
      });
    }

    const trackId = pcId || uid();
    const existingSet = existingPCByProc.get(proc.no);
    if (!existingSet) existingPCByProc.set(proc.no, new Set([trackId]));
    else existingSet.add(trackId);
    addedPC++;
  }

  for (const chain of chains) {
    const { processNo, fmValue, feValue, fcValue, feScope, m4 } = chain;
    if (!processNo) continue;

    // ★★★ 2026-03-21 FIX: FK-only — FE ID-based dedup (chain.feId로 중복체크)
    if (feValue?.trim()) {
      const feIdVal = chain.feId || '';
      if (feIdVal && !existingFE.has(feIdVal)) {
        const newFE: L1FailureScope = {
          id: feIdVal,
          name: feValue.trim(),
          scope: feScope || SCOPE_LABEL_EN.YP,
          effect: feValue.trim(),
          severity: chain.severity || 0,
        };
        if (!state.l1.failureScopes) state.l1.failureScopes = [];
        state.l1.failureScopes.push(newFE);
        existingFE.add(feIdVal);
        stats.addedFE++;
      } else if (!feIdVal) {
        console.warn('[enrich-state] FE skipped — no feId for feValue:', feValue);
      }
    }

    const proc = procByNo.get(processNo); // ★★★ 2026-03-21 FIX: FK-only — exact processNo only
    if (!proc) {
      stats.skippedNoProc++;
      continue;
    }

    // ★★★ 2026-03-21 FIX: FK-only — FM ID-based dedup (chain.fmId로 중복체크)
    if (fmValue?.trim()) {
      const fmIdVal = chain.fmId || '';
      if (fmIdVal && !existingFM.has(fmIdVal)) {
        const newFM: L2FailureMode = {
          id: fmIdVal,
          name: fmValue.trim(),
        };
        if (!proc.failureModes) proc.failureModes = [];
        proc.failureModes.push(newFM);
        existingFM.add(fmIdVal);
        stats.addedFM++;
      } else if (!fmIdVal) {
        console.warn('[enrich-state] FM skipped — no fmId for fmValue:', fmValue);
      }
    }

    // ★★★ 2026-03-21 FIX: FK-only — FC ID-based dedup (chain.fcId로 중복체크)
    if (fcValue?.trim()) {
      const fcIdVal = chain.fcId || '';
      if (fcIdVal && !existingFC.has(fcIdVal)) {
        const newFC: L3FailureCauseExtended = {
          id: fcIdVal,
          name: fcValue.trim(),
        };
        if (proc.l3 && proc.l3.length > 0) {
          const targetWe = m4
            ? proc.l3.find(we => we.m4 === m4)
            : undefined;
          if (targetWe) {
            // ★★★ 2026-03-21 FIX: FK-only — proc.l3[0] fallback 삭제, 매칭 실패시 스킵 (console.warn)
            if (!targetWe.failureCauses) targetWe.failureCauses = [];
            targetWe.failureCauses.push(newFC);
          } else {
            console.warn('[enrich-state] FC skipped — no matching L3 for m4:', m4, 'processNo:', processNo);
            if (!proc.failureCauses) proc.failureCauses = [];
            proc.failureCauses.push(newFC);
          }
        } else {
          if (!proc.failureCauses) proc.failureCauses = [];
          proc.failureCauses.push(newFC);
        }
        existingFC.add(fcIdVal);
        stats.addedFC++;
      } else if (!fcIdVal) {
        console.warn('[enrich-state] FC skipped — no fcId for fcValue:', fcValue);
      }
    }
  }

  stats.addedPC = addedPC;
  return stats;
}
