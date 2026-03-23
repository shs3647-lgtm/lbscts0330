/**
 * @file industry-plan-c-anchor.ts
 * @description Import FC 비교 **플랜C** — FK가 없을 때만 KrIndustry 시드 키워드로 기술적 앵커 키 생성
 * @remarks 자유 텍스트 3종 트리플 매칭 금지. 산업DB(시드)에 등록된 fmKeyword/fcKeyword가
 *          각각 FM/FC 문구에 포함될 때만 동일 앵커로 간주한다.
 */

import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import { INDUSTRY_DETECTION_ROWS, INDUSTRY_PREVENTION_ROWS } from './kr-industry-seed-rows';

export interface IndustryAnchorIndex {
  /** 긴 키워드 우선 (포함 검사) */
  fmNormsSorted: string[];
  fcNormsSorted: string[];
}

function norm(s: string | undefined): string {
  return (s || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
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

export function buildIndustryAnchorIndexFromKrPayload(
  detection: ReadonlyArray<{ fmKeyword: string }>,
  prevention: ReadonlyArray<{ fcKeyword: string }>,
): IndustryAnchorIndex {
  const fmSet = new Set<string>();
  for (const d of detection) {
    const k = norm(d.fmKeyword);
    if (k) fmSet.add(k);
  }
  const fcSet = new Set<string>();
  for (const p of prevention) {
    const k = norm(p.fcKeyword);
    if (k) fcSet.add(k);
  }
  return {
    fmNormsSorted: [...fmSet].sort((a, b) => b.length - a.length),
    fcNormsSorted: [...fcSet].sort((a, b) => b.length - a.length),
  };
}

let _defaultIndex: IndustryAnchorIndex | null = null;

export function getDefaultIndustryAnchorIndex(): IndustryAnchorIndex {
  if (!_defaultIndex) {
    _defaultIndex = buildIndustryAnchorIndexFromKrPayload(
      [...INDUSTRY_DETECTION_ROWS],
      [...INDUSTRY_PREVENTION_ROWS],
    );
  }
  return _defaultIndex;
}

/** FK(엔티티 UUID 또는 flatId 쌍)가 하나라도 확정이면 플랜C 대상 아님 */
export function chainHasPrimaryFK(c: MasterFailureChain): boolean {
  const fe = (c.feId || '').trim();
  const fm = (c.fmId || '').trim();
  const fc = (c.fcId || '').trim();
  if (fe && fm && fc) return true;
  if (fm && fc) return true;
  const fmf = (c.fmFlatId || '').trim();
  const fcf = (c.fcFlatId || '').trim();
  if (fmf && fcf) return true;
  const ff = (c.feFlatId || '').trim();
  if (ff && fmf && fcf) return true;
  return false;
}

/**
 * 플랜C 앵커 키 — FK 없고 FM·FC 각각 산업 키워드 히트 시에만 반환
 */
export function industryPlanCChainKey(c: MasterFailureChain, idx: IndustryAnchorIndex): string | null {
  if (chainHasPrimaryFK(c)) return null;
  const proc = normalizeProcessNo(c.processNo);
  const fm = norm(c.fmValue);
  const fc = norm(c.fcValue);
  if (!fm || !fc) return null;
  const fmHit = idx.fmNormsSorted.find(k => fm.includes(k) || k.includes(fm));
  const fcHit = idx.fcNormsSorted.find(k => fc.includes(k) || k.includes(fc));
  if (!fmHit || !fcHit) return null;
  return `planC:${proc}|${fmHit}|${fcHit}`;
}
