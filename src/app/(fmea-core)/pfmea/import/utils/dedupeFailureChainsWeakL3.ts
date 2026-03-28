/**
 * 4M·작업요소(B1)가 비어 있을 때 동일 (공정|FM|FC|FE) 체인이 반복 생성되는 경우
 * 미리보기/검증에서 중복 행으로 보이므로, 구분 정보 없는 약한 L3 맥락만 안전하게 병합한다.
 * (4M 또는 작업요소가 있는 행은 서로 다른 L3 실체로 간주해 유지)
 */

import type { MasterFailureChain } from '../types/masterFailureChain';

function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  n = n.replace(/^0+(?=\d)/, '');
  return n;
}

function normText(s: string): string {
  return s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isWeakL3Context(c: MasterFailureChain): boolean {
  return !(c.m4?.trim()) && !(c.workElement?.trim());
}

/** FM+FC가 모두 있을 때만 사중 키 (FM-only / FC-only / FE-only는 그대로 유지) */
function quartetKey(c: MasterFailureChain): string | null {
  const fm = c.fmValue?.trim();
  const fc = c.fcValue?.trim();
  if (!fm || !fc) return null;
  const p = normalizeProcessNo(c.processNo);
  return `${p}|${normText(fm)}|${normText(fc)}|${normText(c.feValue || '')}`;
}

export function dedupeFailureChainsWeakL3(chains: MasterFailureChain[]): MasterFailureChain[] {
  if (chains.length <= 1) return chains;
  const weakSeen = new Set<string>();
  const out: MasterFailureChain[] = [];
  for (const c of chains) {
    if (!isWeakL3Context(c)) {
      out.push(c);
      continue;
    }
    const k = quartetKey(c);
    if (k == null) {
      out.push(c);
      continue;
    }
    if (weakSeen.has(k)) continue;
    weakSeen.add(k);
    out.push(c);
  }
  return out;
}
