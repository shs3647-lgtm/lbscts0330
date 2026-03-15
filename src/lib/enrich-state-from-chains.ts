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
import { uid } from '@/app/(fmea-core)/pfmea/worksheet/constants';

export interface ChainRecord {
  processNo?: string;
  fmValue?: string;
  feValue?: string;
  fcValue?: string;
  feScope?: string;
  m4?: string;
  severity?: number;
  [key: string]: unknown;
}

export interface EnrichStats {
  addedFM: number;
  addedFE: number;
  addedFC: number;
  skippedNoProc: number;
}

function normalize(s: string | undefined): string {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

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
  const stats: EnrichStats = { addedFM: 0, addedFE: 0, addedFC: 0, skippedNoProc: 0 };

  if (!chains || chains.length === 0) return stats;

  // Process index
  const procByNo = new Map<string, Process>();
  for (const proc of (state.l2 || [])) {
    if (proc.no) procByNo.set(proc.no, proc);
  }

  // Existing FE index (normalized text → true)
  const existingFE = new Set<string>();
  for (const fe of (state.l1?.failureScopes || [])) {
    const text = normalize(fe.effect || fe.name);
    if (text) existingFE.add(text);
  }

  // Existing FM index per process (processNo|normalizedName → true)
  const existingFM = new Set<string>();
  for (const proc of (state.l2 || [])) {
    for (const fm of (proc.failureModes || [])) {
      existingFM.add(`${proc.no}|${normalize(fm.name)}`);
    }
  }

  // Existing FC index per process
  const existingFC = new Set<string>();
  for (const proc of (state.l2 || [])) {
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        existingFC.add(`${proc.no}|${normalize(fc.name)}`);
      }
    }
    for (const fc of (proc.failureCauses || [])) {
      existingFC.add(`${proc.no}|${normalize(fc.name)}`);
    }
  }

  for (const chain of chains) {
    const { processNo, fmValue, feValue, fcValue, feScope, m4 } = chain;
    if (!processNo) continue;

    // ★ FE(고장영향)는 L1-level(scope 기반) → L2 processNo 매칭과 무관하게 추가
    // 이전: proc 매칭 실패 시 FE까지 skip → C4=0 원인
    if (feValue?.trim()) {
      const nfe = normalize(feValue);
      if (!existingFE.has(nfe)) {
        const newFE: L1FailureScope = {
          id: uid(),
          name: feValue.trim(),
          scope: feScope || 'Your Plant',
          effect: feValue.trim(),
          severity: chain.severity || 0,
        };
        if (!state.l1.failureScopes) state.l1.failureScopes = [];
        state.l1.failureScopes.push(newFE);
        existingFE.add(nfe);
        stats.addedFE++;
      }
    }

    const proc = procByNo.get(processNo);
    if (!proc) {
      stats.skippedNoProc++;
      continue;
    }

    // Add FM if not exists
    if (fmValue?.trim()) {
      const nfm = normalize(fmValue);
      const fmKey = `${proc.no}|${nfm}`;
      if (!existingFM.has(fmKey)) {
        const newFM: L2FailureMode = {
          id: uid(),
          name: fmValue.trim(),
        };
        if (!proc.failureModes) proc.failureModes = [];
        proc.failureModes.push(newFM);
        existingFM.add(fmKey);
        stats.addedFM++;
      }
    }

    // Add FC if not exists
    if (fcValue?.trim()) {
      const nfc = normalize(fcValue);
      const fcKey = `${proc.no}|${nfc}`;
      if (!existingFC.has(fcKey)) {
        const newFC: L3FailureCauseExtended = {
          id: uid(),
          name: fcValue.trim(),
        };
        // Add to matching L3 work element or first available
        if (proc.l3 && proc.l3.length > 0) {
          const targetWe = m4
            ? proc.l3.find(we => we.m4 === m4) || proc.l3[0]
            : proc.l3[0];
          if (!targetWe.failureCauses) targetWe.failureCauses = [];
          targetWe.failureCauses.push(newFC);
        } else {
          if (!proc.failureCauses) proc.failureCauses = [];
          proc.failureCauses.push(newFC);
        }
        existingFC.add(fcKey);
        stats.addedFC++;
      }
    }
  }

  return stats;
}
