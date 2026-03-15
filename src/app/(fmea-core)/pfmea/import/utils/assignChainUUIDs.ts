/**
 * @file assignChainUUIDs.ts
 * @description chain에 엔티티 UUID FK를 할당하는 독립 유틸 (순환 import 방지)
 *
 * ★★★ 2026-03-15: 텍스트 매칭 완전 제거의 핵심 ★★★
 * buildWorksheetState가 생성한 FM/FC/FE 엔티티의 UUID를 chain에 할당.
 * 이후 모든 링크 생성은 UUID FK만 사용.
 *
 * ★★★ 2026-03-15 v2: NFKC 정규화 + FE scope 접두사 제거 + 고아 자동보충 ★★★
 * - Unicode NFKC 정규화 (Å↔Å, μ↔µ 등 통합)
 * - FE scope 접두사 제거 ("C3-4:효과명" → "효과명")
 * - 메인시트 FM/FC 중 FC시트 미포함 항목 자동보충 chain 생성
 *
 * @created 2026-03-15
 */

import type { MasterFailureChain } from '../types/masterFailureChain';
import type {
  WorksheetState,
} from '@/app/(fmea-core)/pfmea/worksheet/constants';

// ─── 정규화 함수 (NFKC 강화) ───

function normalizeText(s: string | undefined): string {
  return (s || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeNoSpaceText(s: string | undefined): string {
  return normalizeText(s).replace(/\s/g, '');
}

/** FE scope 접두사 제거: "C3-4:효과명" → "효과명", "Y6-3:설명" → "설명" */
function stripFeScopePrefix(s: string | undefined): string {
  if (!s) return '';
  return s.replace(/^[A-Za-z]+\d+[-:][\d]*[-:]?\s*/i, '').trim();
}

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

/**
 * chain에 엔티티 UUID FK 직접 할당
 *
 * buildWorksheetState가 생성한 FM/FC/FE 엔티티는 같은 flatData에서 생성됨.
 * 정규화된 텍스트 키로 Map.get() 1회 조회하면 100% 매칭 가능.
 *
 * 이 함수 실행 후 chain.fmId / chain.fcId / chain.feId가 설정됨.
 */
export function assignEntityUUIDsToChains(
  state: WorksheetState,
  chains: MasterFailureChain[],
): void {
  // ─── FE 인덱스: normalizedText → FE.id ───
  const feIdByText = new Map<string, string>();
  const feIdByNoSpace = new Map<string, string>();
  for (const fe of (state.l1?.failureScopes || [])) {
    const raw = fe.effect || fe.name;
    const text = normalizeText(raw);
    if (text && !feIdByText.has(text)) feIdByText.set(text, fe.id);
    const ns = normalizeNoSpaceText(raw);
    if (ns && !feIdByNoSpace.has(ns)) feIdByNoSpace.set(ns, fe.id);
    // scope 접두사 제거 버전도 등록 (FC시트에 "C3-4:효과명" 형태로 들어올 때 대응)
    const stripped = stripFeScopePrefix(raw);
    if (stripped) {
      const nStripped = normalizeText(stripped);
      if (nStripped && !feIdByText.has(nStripped)) feIdByText.set(nStripped, fe.id);
      const nsStripped = normalizeNoSpaceText(stripped);
      if (nsStripped && !feIdByNoSpace.has(nsStripped)) feIdByNoSpace.set(nsStripped, fe.id);
    }
  }

  // ─── FM 인덱스: processNo|fmName → FM.id ───
  const fmIdByKey = new Map<string, string>();
  for (const proc of (state.l2 || [])) {
    const npNo = normalizeProcessNo(proc.no);
    for (const fm of (proc.failureModes || [])) {
      const nfm = normalizeText(fm.name);
      const nsfm = normalizeNoSpaceText(fm.name);
      if (!fmIdByKey.has(`${proc.no}|${nfm}`)) fmIdByKey.set(`${proc.no}|${nfm}`, fm.id);
      if (npNo !== proc.no && !fmIdByKey.has(`${npNo}|${nfm}`)) fmIdByKey.set(`${npNo}|${nfm}`, fm.id);
      if (nsfm !== nfm) {
        if (!fmIdByKey.has(`${proc.no}|${nsfm}`)) fmIdByKey.set(`${proc.no}|${nsfm}`, fm.id);
        if (npNo !== proc.no && !fmIdByKey.has(`${npNo}|${nsfm}`)) fmIdByKey.set(`${npNo}|${nsfm}`, fm.id);
      }
    }
  }

  // ─── FC 인덱스: processNo|m4|fcName → FC.id ───
  const fcIdByKey = new Map<string, string>();
  for (const proc of (state.l2 || [])) {
    const npNo = normalizeProcessNo(proc.no);
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        const nfc = normalizeText(fc.name);
        const nsfc = normalizeNoSpaceText(fc.name);
        if (!fcIdByKey.has(`${proc.no}|${we.m4}|${nfc}`)) fcIdByKey.set(`${proc.no}|${we.m4}|${nfc}`, fc.id);
        if (npNo !== proc.no && !fcIdByKey.has(`${npNo}|${we.m4}|${nfc}`)) fcIdByKey.set(`${npNo}|${we.m4}|${nfc}`, fc.id);
        if (!fcIdByKey.has(`${proc.no}||${nfc}`)) fcIdByKey.set(`${proc.no}||${nfc}`, fc.id);
        if (npNo !== proc.no && !fcIdByKey.has(`${npNo}||${nfc}`)) fcIdByKey.set(`${npNo}||${nfc}`, fc.id);
        if (nsfc !== nfc) {
          if (!fcIdByKey.has(`${proc.no}||${nsfc}`)) fcIdByKey.set(`${proc.no}||${nsfc}`, fc.id);
          if (npNo !== proc.no && !fcIdByKey.has(`${npNo}||${nsfc}`)) fcIdByKey.set(`${npNo}||${nsfc}`, fc.id);
        }
      }
    }
    for (const fc of (proc.failureCauses || [])) {
      const nfc = normalizeText(fc.name);
      const nsfc = normalizeNoSpaceText(fc.name);
      if (!fcIdByKey.has(`${proc.no}||${nfc}`)) fcIdByKey.set(`${proc.no}||${nfc}`, fc.id);
      if (npNo !== proc.no && !fcIdByKey.has(`${npNo}||${nfc}`)) fcIdByKey.set(`${npNo}||${nfc}`, fc.id);
      if (nsfc !== nfc) {
        if (!fcIdByKey.has(`${proc.no}||${nsfc}`)) fcIdByKey.set(`${proc.no}||${nsfc}`, fc.id);
      }
    }
  }

  // ─── chain에 UUID 할당 ───
  let assignedFM = 0, assignedFC = 0, assignedFE = 0;
  for (const chain of chains) {
    const npNo = normalizeProcessNo(chain.processNo);

    if (!chain.feId && chain.feValue?.trim()) {
      const nfe = normalizeText(chain.feValue);
      const nsfe = normalizeNoSpaceText(chain.feValue);
      // 1차: 원본 정규화 매칭
      let feId = feIdByText.get(nfe) || feIdByNoSpace.get(nsfe);
      // 2차: scope 접두사 제거 후 재시도 ("C3-4:효과명" → "효과명")
      if (!feId) {
        const stripped = stripFeScopePrefix(chain.feValue);
        if (stripped) {
          const nStripped = normalizeText(stripped);
          const nsStripped = normalizeNoSpaceText(stripped);
          feId = feIdByText.get(nStripped) || feIdByNoSpace.get(nsStripped);
        }
      }
      if (feId) { chain.feId = feId; assignedFE++; }
    }

    if (!chain.fmId && chain.fmValue?.trim()) {
      const nfm = normalizeText(chain.fmValue);
      const nsfm = normalizeNoSpaceText(chain.fmValue);
      const fmId = fmIdByKey.get(`${chain.processNo}|${nfm}`)
        || fmIdByKey.get(`${npNo}|${nfm}`)
        || fmIdByKey.get(`${chain.processNo}|${nsfm}`)
        || fmIdByKey.get(`${npNo}|${nsfm}`);
      if (fmId) { chain.fmId = fmId; assignedFM++; }
    }

    if (!chain.fcId && chain.fcValue?.trim()) {
      const nfc = normalizeText(chain.fcValue);
      const nsfc = normalizeNoSpaceText(chain.fcValue);
      const m4 = chain.m4 || '';
      const fcId = fcIdByKey.get(`${chain.processNo}|${m4}|${nfc}`)
        || fcIdByKey.get(`${npNo}|${m4}|${nfc}`)
        || fcIdByKey.get(`${chain.processNo}||${nfc}`)
        || fcIdByKey.get(`${npNo}||${nfc}`)
        || fcIdByKey.get(`${chain.processNo}||${nsfc}`)
        || fcIdByKey.get(`${npNo}||${nsfc}`);
      if (fcId) { chain.fcId = fcId; assignedFC++; }
    }
  }

  if (assignedFM > 0 || assignedFC > 0 || assignedFE > 0) {
    console.info(
      `[assignChainUUIDs] UUID FK 할당: FM=${assignedFM}/${chains.length} FC=${assignedFC}/${chains.length} FE=${assignedFE}/${chains.length}`
    );
  }
}

// ═══════════════════════════════════════════════════════
// 고아 FM/FC 자동보충: 메인시트에 있지만 FC시트에 없는 항목 → 합성 chain 생성
// ═══════════════════════════════════════════════════════

/**
 * 메인시트(state) 엔티티 중 FC시트(chains)에 매칭되지 않은 FM/FC를 자동보충.
 * 합성 chain을 생성하여 chains 배열에 push → UUID 할당 + 링크 생성 가능.
 *
 * 호출 시점: assignEntityUUIDsToChains 직후, buildFailureLinksDBCentric 직전
 */
export function supplementOrphanChains(
  state: WorksheetState,
  chains: MasterFailureChain[],
): { addedFM: number; addedFC: number } {
  let addedFM = 0;
  let addedFC = 0;

  // 이미 매칭된 FM/FC ID 수집
  const matchedFmIds = new Set(chains.filter(c => c.fmId).map(c => c.fmId!));
  const matchedFcIds = new Set(chains.filter(c => c.fcId).map(c => c.fcId!));

  for (const proc of (state.l2 || [])) {
    // ── 고아 FM 보충 ──
    for (const fm of (proc.failureModes || [])) {
      if (matchedFmIds.has(fm.id)) continue;

      // 같은 공정의 첫 번째 FC를 짝으로 사용
      let pairedFcId: string | undefined;
      let pairedFcValue = '';
      let pairedM4 = '';
      for (const we of (proc.l3 || [])) {
        if (pairedFcId) break;
        for (const fc of (we.failureCauses || [])) {
          pairedFcId = fc.id;
          pairedFcValue = fc.name;
          pairedM4 = we.m4 || '';
          break;
        }
      }
      if (!pairedFcId) {
        for (const fc of (proc.failureCauses || [])) {
          pairedFcId = fc.id;
          pairedFcValue = fc.name;
          break;
        }
      }

      const synthetic: MasterFailureChain = {
        id: `auto-fm-${fm.id}`,
        processNo: proc.no,
        m4: pairedM4 || undefined,
        fmValue: fm.name,
        fmId: fm.id,
        fcValue: pairedFcValue,
        fcId: pairedFcId,
        feValue: '',
        // feId will be assigned by round-robin in buildFailureLinksDBCentric
      };
      chains.push(synthetic);
      matchedFmIds.add(fm.id);
      if (pairedFcId) matchedFcIds.add(pairedFcId);
      addedFM++;
    }

    // ── 고아 FC 보충 ──
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        if (matchedFcIds.has(fc.id)) continue;

        // 같은 공정의 첫 번째 FM을 짝으로 사용
        const pairedFm = (proc.failureModes || [])[0];
        if (!pairedFm) continue;

        const synthetic: MasterFailureChain = {
          id: `auto-fc-${fc.id}`,
          processNo: proc.no,
          m4: we.m4 || undefined,
          fcValue: fc.name,
          fcId: fc.id,
          fmValue: pairedFm.name,
          fmId: pairedFm.id,
          feValue: '',
          // feId will be assigned by round-robin
        };
        chains.push(synthetic);
        matchedFcIds.add(fc.id);
        addedFC++;
      }
    }
    // process-level FCs
    for (const fc of (proc.failureCauses || [])) {
      if (matchedFcIds.has(fc.id)) continue;
      const pairedFm = (proc.failureModes || [])[0];
      if (!pairedFm) continue;
      const synthetic: MasterFailureChain = {
        id: `auto-fc-${fc.id}`,
        processNo: proc.no,
        fcValue: fc.name,
        fcId: fc.id,
        fmValue: pairedFm.name,
        fmId: pairedFm.id,
        feValue: '',
      };
      chains.push(synthetic);
      matchedFcIds.add(fc.id);
      addedFC++;
    }
  }

  if (addedFM > 0 || addedFC > 0) {
    console.info(`[supplementOrphanChains] 고아 보충: FM+${addedFM} FC+${addedFC}`);
  }

  return { addedFM, addedFC };
}
