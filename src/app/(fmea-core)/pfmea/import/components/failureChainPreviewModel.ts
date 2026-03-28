/**
 * 고장사슬 FC 미리보기 테이블 모델 — 공정번호 순, FM 중심 n(FE):1(FM):n(FC) 병합
 * (실제 FailureLink 1행=1체인과 동일 순서·그룹으로 워크시트 고장연결과 비교 가능)
 */

import type { MasterFailureChain } from '../types/masterFailureChain';

/** FC 시트 / 미리보기 공통 정렬: 공정 → FM → FE구분 → FE → FC */
export function compareChainsForFcDisplay(
  a: MasterFailureChain,
  b: MasterFailureChain,
): number {
  const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
  if (pCmp !== 0) return pCmp;
  const fmCmp = (a.fmValue || '').localeCompare(b.fmValue || '');
  if (fmCmp !== 0) return fmCmp;
  const sCmp = (a.feScope || '').localeCompare(b.feScope || '');
  if (sCmp !== 0) return sCmp;
  const feCmp = (a.feValue || '').localeCompare(b.feValue || '');
  if (feCmp !== 0) return feCmp;
  return (a.fcValue || '').localeCompare(b.fcValue || '');
}

export interface FailureChainFlatRow {
  fe: { scope: string; text: string };
  fm: { processNo: string; text: string };
  fc: { m4: string; workElement: string; text: string };
}

export interface FailureChainPreviewRenderRow extends FailureChainFlatRow {
  scopeRowSpan: number;
  showScope: boolean;
  feRowSpan: number;
  showFe: boolean;
  processRowSpan: number;
  showProcess: boolean;
  fmRowSpan: number;
  showFm: boolean;
}

function calcSpans(len: number, keyFn: (i: number) => string): number[] {
  const spans = new Array<number>(len).fill(0);
  let i = 0;
  while (i < len) {
    const key = keyFn(i);
    let span = 1;
    while (i + span < len && keyFn(i + span) === key) span++;
    spans[i] = span;
    i += span;
  }
  return spans;
}

/** FM 그룹 키 — 동일 공정+동일 FM 행은 공정/FM 열만 세로 병합 */
function fmGroupKey(r: FailureChainFlatRow): string {
  return `${r.fm.processNo}\0${r.fm.text}`;
}

/** 동일 FM 블록 안에서만 FE구분 병합 */
function scopeMergeKey(r: FailureChainFlatRow): string {
  return `${fmGroupKey(r)}\0${r.fe.scope}`;
}

/** 동일 FM 블록 안에서 동일 FE만 병합(대부분 1행) */
function feMergeKey(r: FailureChainFlatRow): string {
  return `${fmGroupKey(r)}\0${r.fe.scope}\0${r.fe.text}`;
}

export function buildFailureChainPreviewRenderRows(
  chains: MasterFailureChain[],
): FailureChainPreviewRenderRow[] {
  const sorted = [...chains].sort(compareChainsForFcDisplay);

  const flatRows: FailureChainFlatRow[] = sorted.map((c) => ({
    fe: { scope: c.feScope || '', text: c.feValue || '' },
    fm: { processNo: c.processNo || '', text: c.fmValue || '' },
    fc: { m4: c.m4 || '', workElement: c.workElement || '', text: c.fcValue || '' },
  }));

  const len = flatRows.length;
  const fmSpans = calcSpans(len, (i) => fmGroupKey(flatRows[i]));
  const scopeSpans = calcSpans(len, (i) => scopeMergeKey(flatRows[i]));
  const feSpans = calcSpans(len, (i) => feMergeKey(flatRows[i]));

  return flatRows.map((row, idx) => ({
    ...row,
    scopeRowSpan: scopeSpans[idx],
    showScope: scopeSpans[idx] > 0,
    feRowSpan: feSpans[idx],
    showFe: feSpans[idx] > 0,
    processRowSpan: fmSpans[idx],
    showProcess: fmSpans[idx] > 0,
    fmRowSpan: fmSpans[idx],
    showFm: fmSpans[idx] > 0,
  }));
}
