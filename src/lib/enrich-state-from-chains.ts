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
  addedPC: number;
  skippedNoProc: number;
}

function normalize(s: string | undefined): string {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** 공백 완전 제거 정규화 — 미세 차이(띄어쓰기, 전각/반각) 흡수 */
function normalizeStrict(s: string | undefined): string {
  return (s || '').trim().replace(/\s+/g, '').toLowerCase();
}

/** processNo 정규화 — buildWorksheetState.ts와 동일 로직 */
function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  const lower = n.toLowerCase();
  if (lower === '0' || lower === '공통공정' || lower === '공통') return '00';
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/^0+(\d)/, '$1');
  return n;
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
  const stats: EnrichStats = { addedFM: 0, addedFE: 0, addedFC: 0, addedPC: 0, skippedNoProc: 0 };

  if (!chains || chains.length === 0) return stats;

  // Process index — 정규화된 processNo로도 조회 가능하게 dual-key 등록
  const procByNo = new Map<string, Process>();
  for (const proc of (state.l2 || [])) {
    if (proc.no) {
      procByNo.set(proc.no, proc);
      const normalized = normalizeProcessNo(proc.no);
      if (normalized && normalized !== proc.no) {
        procByNo.set(normalized, proc);
      }
    }
  }

  // Existing FE index (normalized text → true)
  const existingFE = new Set<string>();
  for (const fe of (state.l1?.failureScopes || [])) {
    const text = normalize(fe.effect || fe.name);
    if (text) existingFE.add(text);
  }

  // Existing FM index — dual-key: normal + strict(공백제거) 매칭으로 중복 FM 추가 방지
  const existingFM = new Set<string>();
  const existingFMStrict = new Set<string>();
  for (const proc of (state.l2 || [])) {
    for (const fm of (proc.failureModes || [])) {
      existingFM.add(`${proc.no}|${normalize(fm.name)}`);
      existingFMStrict.add(`${proc.no}|${normalizeStrict(fm.name)}`);
    }
  }

  // Existing FC index — dual-key
  const existingFC = new Set<string>();
  const existingFCStrict = new Set<string>();
  for (const proc of (state.l2 || [])) {
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        existingFC.add(`${proc.no}|${normalize(fc.name)}`);
        existingFCStrict.add(`${proc.no}|${normalizeStrict(fc.name)}`);
      }
    }
    for (const fc of (proc.failureCauses || [])) {
      existingFC.add(`${proc.no}|${normalize(fc.name)}`);
      existingFCStrict.add(`${proc.no}|${normalizeStrict(fc.name)}`);
    }
  }

  // ★★★ 2026-03-15 FIX: productChars 보충 — placeholder(name='') 교체 + 신규 추가 ★★★
  const existingPCByProc = new Map<string, Set<string>>();
  for (const proc of (state.l2 || [])) {
    const pcNames = new Set<string>();
    for (const fn of (proc.functions || [])) {
      for (const pc of (fn.productChars || [])) {
        const n = normalize(pc.name);
        if (n) pcNames.add(n);
      }
    }
    existingPCByProc.set(proc.no, pcNames);
    const normalized = normalizeProcessNo(proc.no);
    if (normalized && normalized !== proc.no) existingPCByProc.set(normalized, pcNames);
  }

  let addedPC = 0;
  for (const chain of chains) {
    const pcName = (chain as Record<string, unknown>).productChar as string | undefined;
    if (!pcName?.trim() || !chain.processNo) continue;

    const proc = procByNo.get(chain.processNo) || procByNo.get(normalizeProcessNo(chain.processNo));
    if (!proc) continue;

    const npc = normalize(pcName);
    const existing = existingPCByProc.get(proc.no);
    if (existing?.has(npc)) continue;

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

    if (!existing) existingPCByProc.set(proc.no, new Set([npc]));
    else existing.add(npc);
    addedPC++;
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
          id: (chain as { feId?: string }).feId || uid(),
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

    const proc = procByNo.get(processNo) || procByNo.get(normalizeProcessNo(processNo));
    if (!proc) {
      stats.skippedNoProc++;
      continue;
    }

    // Add FM if not exists — strict(공백제거) 매칭으로 "Au Bump 높이 부적합" ≈ "Au Bump 높이부적합" 중복 방지
    if (fmValue?.trim()) {
      const nfm = normalize(fmValue);
      const fmKey = `${proc.no}|${nfm}`;
      const fmKeyStrict = `${proc.no}|${normalizeStrict(fmValue)}`;
      if (!existingFM.has(fmKey) && !existingFMStrict.has(fmKeyStrict)) {
        const newFM: L2FailureMode = {
          id: (chain as { fmId?: string }).fmId || uid(),
          name: fmValue.trim(),
        };
        if (!proc.failureModes) proc.failureModes = [];
        proc.failureModes.push(newFM);
        existingFM.add(fmKey);
        existingFMStrict.add(fmKeyStrict);
        stats.addedFM++;
      }
    }

    // Add FC if not exists — strict 매칭 적용
    if (fcValue?.trim()) {
      const nfc = normalize(fcValue);
      const fcKey = `${proc.no}|${nfc}`;
      const fcKeyStrict = `${proc.no}|${normalizeStrict(fcValue)}`;
      if (!existingFC.has(fcKey) && !existingFCStrict.has(fcKeyStrict)) {
        const newFC: L3FailureCauseExtended = {
          id: (chain as { fcId?: string }).fcId || uid(),
          name: fcValue.trim(),
        };
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
        existingFCStrict.add(fcKeyStrict);
        stats.addedFC++;
      }
    }
  }

  stats.addedPC = addedPC;
  return stats;
}
