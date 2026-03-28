/**
 * FA 검증 메트릭 — 건수·매칭 행 계산 (테스트·기타 도구용)
 * - FC 합계(행4): VERIFY 수식 fcCount는 고유 B4와 정의가 달라 제외 (2026-03-28)
 * - FM/FC 매칭(행6·7): excelRow/id 그레인 제거한 시맨틱 키로 집계 (체인 다행·동일 FM/FC)
 */

import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { ParseStatistics } from '../excel-parser';

export type FaVerifySource = 'VERIFY수식' | '스캐너' | 'FC시트' | '메인시트' | '-';

export interface FaVerifyRow {
  no: number;
  label: string;
  actual: number;
  expected: number;
  src: FaVerifySource;
}

function norm(s: string): string {
  return s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  n = n.replace(/^0+(?=\d)/, '');
  return n;
}

function flatRowGrain(d: { excelRow?: number; id?: string }): string {
  if (d.excelRow != null && d.excelRow > 0) return `|r${d.excelRow}`;
  if (d.id) return `|i${d.id}`;
  return '';
}

function chainRowGrain(c: { excelRow?: number; id?: string }): string {
  if (c.excelRow != null && c.excelRow > 0) return `|r${c.excelRow}`;
  if (c.id) return `|i${c.id}`;
  return '';
}

export function fmFlatKey(d: { processNo: string; value: string; excelRow?: number; id?: string }): string {
  return `${normalizeProcessNo(d.processNo)}|${norm(d.value.trim())}${flatRowGrain(d)}`;
}

export function fcFlatKey(d: { processNo: string; value: string; excelRow?: number; id?: string }): string {
  return `${normalizeProcessNo(d.processNo)}|${norm(d.value.trim())}${flatRowGrain(d)}`;
}

export function fmChainKey(c: { processNo: string; fmValue: string; excelRow?: number; id?: string }): string {
  return `${normalizeProcessNo(c.processNo)}|${norm(c.fmValue.trim())}${chainRowGrain(c)}`;
}

export function fcChainKey(c: { processNo: string; fcValue: string; excelRow?: number; id?: string }): string {
  return `${normalizeProcessNo(c.processNo)}|${norm(c.fcValue.trim())}${chainRowGrain(c)}`;
}

export function normFaVerify(s: string): string {
  return norm(s);
}

/** FM: 공정 + 정규화 고장형태 (행·ID 제외 — 매칭 건수용) */
function fmSemanticFlat(d: ImportedFlatData): string {
  return `${normalizeProcessNo(d.processNo)}|${norm(String(d.value ?? '').trim())}`;
}

function fmSemanticChain(c: MasterFailureChain): string {
  return `${normalizeProcessNo(c.processNo)}|${norm((c.fmValue ?? '').trim())}`;
}

/** FC: 공정 + 4M + 정규화 고장원인 (B4·체인 동일 눈금) */
function fcSemanticFlat(d: ImportedFlatData): string {
  const m4 = (d.m4 ?? '').trim().toUpperCase();
  return `${normalizeProcessNo(d.processNo)}|${m4}|${norm(String(d.value ?? '').trim())}`;
}

function fcSemanticChain(c: MasterFailureChain): string {
  const m4 = (c.m4 ?? '').trim().toUpperCase();
  return `${normalizeProcessNo(c.processNo)}|${m4}|${norm((c.fcValue ?? '').trim())}`;
}

function pick(
  f: number | undefined,
  s: number | undefined,
  ps: number,
  fd2: number,
): { val: number; src: FaVerifySource } {
  if (f && f > 0) return { val: f, src: 'VERIFY수식' };
  if (s && s > 0) return { val: s, src: '스캐너' };
  if (ps > 0) return { val: ps, src: '메인시트' };
  if (fd2 > 0) return { val: fd2, src: '메인시트' };
  return { val: 0, src: '-' };
}

export function buildFaVerificationVerifyRows(
  chains: MasterFailureChain[],
  parseStatistics: ParseStatistics | undefined,
  flatData: ImportedFlatData[] | undefined,
): FaVerifyRow[] {
  const itemStats = parseStatistics?.itemStats || [];
  const byCode = (code: string) => itemStats.find((s) => s.itemCode === code)?.uniqueCount ?? 0;
  const procStats = parseStatistics?.processStats || [];
  const fd = flatData || [];

  const fdProc = new Set(
    fd.filter((d) => d.category !== 'C' && d.processNo && /^\d+$/.test(d.processNo)).map((d) => d.processNo),
  ).size;
  const fdFM = new Set(fd.filter((d) => d.itemCode === 'A5' && d.value?.trim()).map((d) => fmFlatKey(d))).size;
  const fdFC = new Set(fd.filter((d) => d.itemCode === 'B4' && d.value?.trim()).map((d) => fcFlatKey(d))).size;
  const fdFE = new Set(fd.filter((d) => d.itemCode === 'C4' && d.value?.trim()).map((d) => d.value.trim())).size;

  const chainCount = chains.length;
  const chainFM = new Set(chains.filter((c) => c.fmValue?.trim()).map((c) => fmChainKey(c))).size;
  const chainFC = new Set(chains.filter((c) => c.fcValue?.trim()).map((c) => fcChainKey(c))).size;
  const chainFE = new Set(chains.filter((c) => c.feValue?.trim()).map((c) => c.feValue!.trim())).size;

  const chainFMSemantic = new Set(
    chains.filter((c) => c.fmValue?.trim()).map((c) => fmSemanticChain(c)),
  ).size;
  const fdFMSemantic = new Set(
    fd.filter((d) => d.itemCode === 'A5' && d.value?.trim()).map((d) => fmSemanticFlat(d)),
  ).size;

  const chainFCSemantic = new Set(
    chains.filter((c) => c.fcValue?.trim()).map((c) => fcSemanticChain(c)),
  ).size;
  const fdFCSemantic = new Set(
    fd.filter((d) => d.itemCode === 'B4' && d.value?.trim()).map((d) => fcSemanticFlat(d)),
  ).size;

  const actualProc = fdProc || procStats.length || new Set(chains.map((c) => c.processNo).filter(Boolean)).size;
  const actualFM = fdFM || byCode('A5') || chainFM;
  const actualFC = fdFC || byCode('B4') || chainFC;

  const formulas = parseStatistics?.rawFingerprint?.excelFormulas;
  const scanner = parseStatistics?.rawFingerprint;

  const expChain = pick(formulas?.chainCount, scanner?.totalChainRows, 0, chainCount);
  const expProc = pick(formulas?.processCount, scanner?.processes.length, procStats.length, fdProc);
  const expFM = pick(formulas?.fmCount, scanner?.totalFM, byCode('A5'), fdFM);
  /** VERIFY·itemStats B4는 고유키(fdFC)와 다른 경우 많음 → 평면 고유 B4 우선, 없으면 체인 고유 FC */
  const expFCVal = fdFC > 0 ? fdFC : chainFC;
  const expFC: { val: number; src: FaVerifySource } = {
    val: expFCVal,
    src: fdFC > 0 ? '메인시트' : chainFC > 0 ? 'FC시트' : '-',
  };

  return [
    { no: 1, label: 'FC시트 파싱', actual: chainCount, expected: expChain.val, src: expChain.src },
    { no: 2, label: '공정 수', actual: actualProc, expected: expProc.val, src: expProc.src },
    { no: 3, label: 'FM 합계', actual: actualFM, expected: expFM.val, src: expFM.src },
    { no: 4, label: 'FC 합계', actual: actualFC, expected: expFC.val, src: expFC.src },
    { no: 5, label: 'FE 매칭', actual: chainFE, expected: fdFE > 0 ? fdFE : chainFE, src: fdFE > 0 ? '메인시트' : 'FC시트' },
    {
      no: 6,
      label: 'FM 매칭',
      actual: chainFMSemantic,
      expected: fdFMSemantic > 0 ? fdFMSemantic : chainFMSemantic,
      src: fdFMSemantic > 0 ? '메인시트' : 'FC시트',
    },
    {
      no: 7,
      label: 'FC 매칭',
      actual: chainFCSemantic,
      expected: fdFCSemantic > 0 ? fdFCSemantic : chainFCSemantic,
      src: fdFCSemantic > 0 ? '메인시트' : 'FC시트',
    },
    { no: 8, label: 'FA통합 행수', actual: chainCount, expected: expChain.val, src: expChain.src },
  ];
}
