/**
 * @file failureChainInjector.ts
 * @description MasterFailureChain[] → WorksheetState에 failureLinks + riskData 주입
 *
 * ★★★ 2026-03-15: UUID FK 기반 전면 교체 ★★★
 * - 텍스트유사도, contains, stripProcessPrefix, 퍼지매칭 완전 삭제
 * - chain.fmId / chain.fcId / chain.feId UUID FK로 직접 엔티티 조회
 * - 텍스트 유사도/임계값/연관성 매칭 없음
 *
 * 별도 함수 — useWorksheetDataLoader의 l2: 할당 라인은 절대 수정하지 않음 (Rule 10.5)
 * saveWorksheetFromImport에서 buildWorksheetState 결과에 후처리로 적용
 *
 * @created 2026-02-21
 */

import type { MasterFailureChain } from '../types/masterFailureChain';
import type {
  WorksheetState,
  L1FailureScope,
  L2FailureMode,
  L3FailureCauseExtended,
  Process,
} from '@/app/(fmea-core)/pfmea/worksheet/constants';
import { uid } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import { assignEntityUUIDsToChains } from './assignChainUUIDs';

// ─── Types ───

export interface FailureLinkEntry {
  id: string;
  fmId: string;
  feId: string;
  fcId: string;
  fmText?: string;
  feText?: string;
  fcText?: string;
  fcM4?: string;
  fmProcess?: string;
  fmProcessNo?: string;
  feScope?: string;
  severity?: number;
  pcText?: string;
  dcText?: string;
  fmSeq?: number;
  feSeq?: number;
  fcSeq?: number;
  fmPath?: string;
  fePath?: string;
  fcPath?: string;
  fmMergeSpan?: number;
  feMergeSpan?: number;
  productCharId?: string;
}

interface RiskDataEntry {
  [key: string]: number | string;
}

export interface InjectionResult {
  failureLinks: FailureLinkEntry[];
  riskData: RiskDataEntry;
  injectedCount: number;
  skippedCount: number;
  autoCreated: { fe: number; fm: number; fc: number };
}

// ─── 공정번호 정규화 (UUID 할당 전 processNo 매칭용) ───

function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  const lower = n.toLowerCase();
  if (lower === '0' || lower === '공통공정' || lower === '공통') return '00';
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  if (n !== '0' && n !== '00') n = n.replace(/^0+(?=\d)/, '');
  return n;
}

/** 텍스트 정규화 (공백 통일 + 소문자) — specialChar 전파용 */
function normalizeText(s: string | undefined): string {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// ─── 메인 함수 ───

/**
 * ★★★ UUID FK 기반 고장연결 — 텍스트 매칭 없음 ★★★
 *
 * chain.fmId / chain.fcId / chain.feId가 이미 할당된 상태.
 * UUID로 엔티티를 직접 조회하여 failureLink + riskData 생성.
 *
 * Phase 2.5(assignEntityUUIDsToChains)에서 UUID가 할당되지 않은 경우에도
 * 텍스트 매칭은 하지 않음 — UUID 없으면 스킵.
 */
export function injectFailureChains(
  state: WorksheetState,
  chains: MasterFailureChain[],
): InjectionResult {
  if (!chains || chains.length === 0) {
    return { failureLinks: [], riskData: {}, injectedCount: 0, skippedCount: 0, autoCreated: { fe: 0, fm: 0, fc: 0 } };
  }

  const autoCreated = { fe: 0, fm: 0, fc: 0 };

  // ★ UUID FK 미할당 체인 자동 할당 (Phase 2.5와 동일 로직)
  // buildWorksheetState를 거치지 않는 호출 경로(resave, 테스트)에서도 UUID 보장
  const needsAssignment = chains.some(c => !c.fmId && !c.fcId && !c.feId && (c.fmValue?.trim() || c.fcValue?.trim()));
  if (needsAssignment) {
    assignEntityUUIDsToChains(state, chains);
  }

  // ─── UUID → 엔티티 인덱스 ───
  const feById = new Map<string, L1FailureScope>();
  for (const fe of (state.l1?.failureScopes || [])) {
    feById.set(fe.id, fe);
  }

  const fmById = new Map<string, L2FailureMode & { processNo?: string }>();
  const procByNo = new Map<string, Process>();
  for (const proc of (state.l2 || [])) {
    if (proc.no) {
      procByNo.set(proc.no, proc);
      const normalized = normalizeProcessNo(proc.no);
      if (normalized && normalized !== proc.no && !procByNo.has(normalized)) {
        procByNo.set(normalized, proc);
      }
    }
    for (const fm of (proc.failureModes || [])) {
      fmById.set(fm.id, { ...fm, processNo: proc.no });
    }
  }

  const fcById = new Map<string, L3FailureCauseExtended & { processNo?: string; m4?: string }>();
  for (const proc of (state.l2 || [])) {
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        fcById.set(fc.id, { ...fc, processNo: proc.no, m4: we.m4 });
      }
    }
    for (const fc of (proc.failureCauses || [])) {
      if (!fcById.has(fc.id)) {
        fcById.set(fc.id, { ...fc, processNo: proc.no });
      }
    }
  }

  // ─── FM→FE 매핑: chain의 feId가 1종류뿐이면 FM 순서 기반 FE 할당 ───
  const enrichedChains: MasterFailureChain[] = chains.map(c => ({ ...c }));
  const allFEs = state.l1?.failureScopes || [];
  const uniqueFeIds = new Set(enrichedChains.filter(c => c.feId).map(c => c.feId));

  if (uniqueFeIds.size <= 1 && allFEs.length > 1) {
    // ★ FE가 1종류 이하 → FM 순서 기반 FE 순환 할당
    const fmIds = [...new Set(enrichedChains.filter(c => c.fmId).map(c => c.fmId!))];
    const fmToFeId = new Map<string, string>();
    fmIds.forEach((fmId, i) => {
      fmToFeId.set(fmId, allFEs[i % allFEs.length].id);
    });
    for (const c of enrichedChains) {
      if (c.fmId) {
        const mapped = fmToFeId.get(c.fmId);
        if (mapped) c.feId = mapped;
      }
    }
  } else {
    // ★ 기존 FE carry-forward
    const fmIdToFeId = new Map<string, string>();
    for (const c of enrichedChains) {
      if (c.feId && c.fmId && !fmIdToFeId.has(c.fmId)) {
        fmIdToFeId.set(c.fmId, c.feId);
      }
    }
    // Same-FM FE 복구만 허용, Cross-FM carry-forward 제거 (의미적 오류 방지)
    for (const c of enrichedChains) {
      if (!c.feId && c.fmId) {
        const fromFm = fmIdToFeId.get(c.fmId);
        if (fromFm) {
          c.feId = fromFm;
        }
      }
    }
  }

  // ─── 체인 매칭 (UUID FK 직접 조회) ───
  const failureLinks: FailureLinkEntry[] = [];
  const riskData: RiskDataEntry = {};
  let injectedCount = 0;
  let skippedCount = 0;

  for (const chain of enrichedChains) {
    // UUID FK 미할당 체인 스킵
    if (!chain.fmId && !chain.fcId && !chain.feId) {
      skippedCount++;
      continue;
    }

    // UUID로 엔티티 직접 조회
    const fe = chain.feId ? feById.get(chain.feId) : undefined;
    const fm = chain.fmId ? fmById.get(chain.fmId) : undefined;
    let fc = chain.fcId ? fcById.get(chain.fcId) : undefined;

    // fcId 없는 체인: 같은 FM의 기존 링크에서 FC 재사용
    if (!fc && fe && fm) {
      const existingLink = failureLinks.find(l => l.fmId === fm.id && l.fcId);
      if (existingLink) {
        fc = fcById.get(existingLink.fcId);
      }
    }

    // 공정 찾기
    let proc = fm?.processNo ? procByNo.get(fm.processNo) : undefined;
    if (!proc && chain.processNo) {
      proc = procByNo.get(chain.processNo) || procByNo.get(normalizeProcessNo(chain.processNo));
    }
    const actualProcessNo = proc?.no || chain.processNo || '';
    const m4 = chain.m4 || '';

    // 3개 모두 존재 시 링크 생성
    if (fe && fm && fc) {
      const linkId = uid();
      const feScope = chain.feScope || undefined;
      const feText = chain.feValue || (fe as L1FailureScope).effect || (fe as L1FailureScope).name;
      const fmText = chain.fmValue || fm.name;
      const fcText = chain.fcValue || fc.name;

      failureLinks.push({
        id: linkId,
        fmId: fm.id,
        feId: fe.id,
        fcId: fc.id,
        fmText,
        feText,
        fcText,
        fcM4: m4 || undefined,
        fmProcess: actualProcessNo,
        fmProcessNo: actualProcessNo,
        feScope,
        severity: chain.severity || (fe as L1FailureScope).severity || undefined,
        pcText: chain.pcValue || undefined,
        dcText: chain.dcValue || undefined,
        fmPath: `${actualProcessNo}/${fmText}`,
        fePath: feScope ? `${feScope}/${feText}` : feText,
        fcPath: m4 ? `${actualProcessNo}/${m4}/${fcText}` : `${actualProcessNo}/${fcText}`,
        fmMergeSpan: chain.fmMergeSpan || undefined,
        feMergeSpan: chain.feMergeSpan || undefined,
        productCharId: (fm as { productCharId?: string }).productCharId || undefined,
      });

      // riskData
      const uniqueKey = `${fm.id}-${fc.id}`;
      if (chain.severity) riskData[`risk-${uniqueKey}-S`] = chain.severity;
      if (chain.occurrence) riskData[`risk-${uniqueKey}-O`] = chain.occurrence;
      if (chain.detection) riskData[`risk-${uniqueKey}-D`] = chain.detection;
      if (chain.pcValue) riskData[`prevention-${uniqueKey}`] = chain.pcValue;
      if (chain.dcValue) riskData[`detection-${uniqueKey}`] = chain.dcValue;
      if (chain.specialChar) {
        riskData[`specialChar-${fm.id}-${fc.id}`] = chain.specialChar;
      }

      injectedCount++;
    } else {
      skippedCount++;
    }
  }

  // ─── specialChar 전파: chain → productChars/processChars ───
  for (const chain of enrichedChains) {
    if (!chain.specialChar || !chain.processNo) continue;
    const proc = (state.l2 || []).find(p => p.no === chain.processNo);
    if (!proc) continue;
    if (chain.productChar) {
      for (const func of (proc.functions || [])) {
        for (const pc of (func.productChars || [])) {
          if (normalizeText(pc.name) === normalizeText(chain.productChar) && !pc.specialChar) {
            pc.specialChar = chain.specialChar;
          }
        }
      }
    }
    if (chain.processChar) {
      for (const we of (proc.l3 || [])) {
        for (const weFunc of (we.functions || [])) {
          for (const prc of (weFunc.processChars || [])) {
            if (normalizeText(prc.name) === normalizeText(chain.processChar) && !prc.specialChar) {
              prc.specialChar = chain.specialChar;
            }
          }
        }
      }
    }
  }

  // ─── seq 필드 계산 ───
  computeSeqFields(failureLinks);

  return { failureLinks, riskData, injectedCount, skippedCount, autoCreated };
}

// ─── seq 필드 계산 ───

function computeSeqFields(links: FailureLinkEntry[]): void {
  if (links.length === 0) return;

  // fcSeq: 같은 fmId 내 FC 순서
  const fmGroupFcCount = new Map<string, number>();
  for (const link of links) {
    const count = (fmGroupFcCount.get(link.fmId) || 0) + 1;
    fmGroupFcCount.set(link.fmId, count);
    link.fcSeq = count;
  }

  // fmSeq: 같은 feId 내 FM 순서
  const feGroupFmOrder = new Map<string, Map<string, number>>();
  for (const link of links) {
    if (!feGroupFmOrder.has(link.feId)) {
      feGroupFmOrder.set(link.feId, new Map());
    }
    const fmOrder = feGroupFmOrder.get(link.feId)!;
    if (!fmOrder.has(link.fmId)) {
      fmOrder.set(link.fmId, fmOrder.size + 1);
    }
    link.fmSeq = fmOrder.get(link.fmId)!;
  }

  // feSeq: 같은 공정(fmProcessNo) 내 FE 순서
  const procFeOrder = new Map<string, Map<string, number>>();
  for (const link of links) {
    const pNo = link.fmProcessNo || '';
    if (!procFeOrder.has(pNo)) {
      procFeOrder.set(pNo, new Map());
    }
    const feOrder = procFeOrder.get(pNo)!;
    if (!feOrder.has(link.feId)) {
      feOrder.set(link.feId, feOrder.size + 1);
    }
    link.feSeq = feOrder.get(link.feId)!;
  }
}
