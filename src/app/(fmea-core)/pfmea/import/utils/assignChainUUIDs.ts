/**
 * @file assignChainUUIDs.ts
 * @description chain에 엔티티 UUID FK를 할당하는 독립 유틸 (순환 import 방지)
 *
 * ★★★ 2026-03-15: 텍스트 매칭 완전 제거의 핵심 ★★★
 * buildWorksheetState가 생성한 FM/FC/FE 엔티티의 UUID를 chain에 할당.
 * 이후 모든 링크 생성은 UUID FK만 사용.
 *
 * @created 2026-03-15
 */

import type { MasterFailureChain } from '../types/masterFailureChain';
import type {
  WorksheetState,
} from '@/app/(fmea-core)/pfmea/worksheet/constants';

// ─── 정규화 함수 (buildWorksheetState와 동일) ───

function normalizeText(s: string | undefined): string {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeNoSpaceText(s: string | undefined): string {
  return normalizeText(s).replace(/\s/g, '');
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
    const text = normalizeText(fe.effect || fe.name);
    if (text && !feIdByText.has(text)) feIdByText.set(text, fe.id);
    const ns = normalizeNoSpaceText(fe.effect || fe.name);
    if (ns && !feIdByNoSpace.has(ns)) feIdByNoSpace.set(ns, fe.id);
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
      const feId = feIdByText.get(nfe) || feIdByNoSpace.get(nsfe);
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
