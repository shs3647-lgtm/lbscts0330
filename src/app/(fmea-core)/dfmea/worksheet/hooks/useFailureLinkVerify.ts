/**
 * @file useFailureLinkVerify.ts
 * @description Stage 3: 고장연결 파이프라인 검증 + 누락 자동복구 데이터 생성
 *
 * Import A5 각각에 대해 3단계 추적: inImport → inWorksheet → inLink
 * link_missing 진단 시 해결된 FM/FE/FC ID를 반환하여 자동 복구 가능하게 함
 *
 * ★ 읽기 전용 — 워크시트/DB를 수정하지 않습니다.
 *   복구 실행은 page.tsx에서 onRepair 콜백으로 처리합니다.
 *
 * @version 3.0.0 - repairableLinks 생성 + link_missing resolved IDs
 */

'use client';

import { useMemo } from 'react';
import type { ImportChain, FlatItem } from './useImportVerify';

// ─── 타입 ───

export type FailReason =
  | 'fm_not_found'        // FM이 워크시트에 없음
  | 'fm_cross_process'    // FM이 다른 공정에서 발견됨
  | 'fc_not_found'        // FC가 워크시트에 없음
  | 'fe_not_found'        // FE가 워크시트에 없음
  | 'fm_text_mismatch'    // FM 텍스트 유사하나 정확 불일치
  | 'fc_text_mismatch'    // FC 텍스트 유사하나 정확 불일치
  | 'fe_text_mismatch'    // FE 텍스트 유사하나 정확 불일치
  | 'link_missing'        // FM/FC/FE 모두 존재하나 Link 미생성
  | 'chain_empty';        // chain 데이터 자체가 빈 값

export interface FailedChainDetail {
  chainIndex: number;
  processNo: string;
  m4: string;
  fmValue: string;
  fcValue: string;
  feValue: string;
  failReason: FailReason;
  diagnostics: string;
  /** link_missing 진단 시 해결된 ID (복구용) */
  resolvedFmId?: string;
  resolvedFeId?: string;
  resolvedFcId?: string;
}

/** 자동 복구 가능한 Link 엔트리 */
export interface RepairableLink {
  fmId: string;
  feId: string;
  fcId: string;
  fmText: string;
  feText: string;
  fcText: string;
  fmProcessNo: string;
  fmProcess: string;   // 공정명
  feScope: string;
  severity: number;
  fcM4: string;
  fcWorkElem: string;
}

/** FM 단위 추적 결과 (A5 중심) */
export interface FMTraceItem {
  processNo: string;
  fmText: string;
  inImport: boolean;
  inWorksheet: boolean;
  inLink: boolean;
  missingAt: 'worksheet' | 'link' | null;
  bestSimilarity?: number;
  bestMatchText?: string;
  crossProcessMatch?: { processNo: string; processName: string; similarity: number };
}

/** 구조 항목 추적 (B1 작업요소 등) — Import↔WS 개별 매칭 */
export interface StructureTraceItem {
  processNo: string;
  value: string;
  inImport: boolean;
  inWorksheet: boolean;
}

export interface CountComparisonRow {
  label: string;
  itemCode: string;          // A2, B1, C1, ... (12개 아이템코드)
  importCount: number;
  worksheetCount: number;
  linkedCount: number;       // -1 = N/A (구조/기능 항목)
  coverageGap: number;       // -1=N/A, 0=OK, >0=미연결 건수
}

export interface LinkVerifyResult {
  chainCount: number;
  matchedCount: number;
  failedCount: number;
  failedChains: FailedChainDetail[];
  reasonSummary: Record<FailReason, number>;
  countComparison: CountComparisonRow[];
  fmTrace: FMTraceItem[];
  fmTraceStats: {
    total: number;
    inWorksheet: number;
    inLink: number;
    missingInWorksheet: number;
    missingInLink: number;
    wsOnlyCount: number;
  };
  /** ★ 워크시트 FailureLink 총 건수 (savedLinks.length) */
  wsLinkCount: number;
  /** ★ 자동 복구 가능한 Link 목록 (link_missing 건) */
  repairableLinks: RepairableLink[];
  /** ★ B1 작업요소 추적 — Import↔WS 개별 매칭 */
  b1Trace: StructureTraceItem[];
  b1TraceStats: { total: number; inWorksheet: number; missing: number; wsOnly: number };
  /** ★ A6/B5 재Import 필요 여부 (chains에 pcValue/dcValue 없을 때) */
  needsReimportPCDC: boolean;
}

// ─── 텍스트 정규화 ───

function norm(s: string): string {
  return s.trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u00A0\u3000]/g, ' ')
    .replace(/[–—―]/g, '-')
    .replace(/[""'']/g, '"')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s*[·•]\s*/g, ' ')
    .toLowerCase();
}

function normStrict(s: string): string {
  return norm(s).replace(/\s+/g, '');
}

function similarity(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(na);
  const bb = bigrams(nb);
  let inter = 0;
  ba.forEach(g => { if (bb.has(g)) inter++; });
  return (2 * inter) / (ba.size + bb.size);
}

function textMatch(a: string, b: string): { exact: boolean; strictExact: boolean; contains: boolean; sim: number } {
  const na = norm(a);
  const nb = norm(b);
  return {
    exact: na === nb,
    strictExact: normStrict(a) === normStrict(b),
    contains: na.length > 3 && nb.length > 3 && (na.includes(nb) || nb.includes(na)),
    sim: similarity(a, b),
  };
}

// ─── 워크시트 FM/FE/FC 추출 (★ AtomicUnit.name 필드) ───

interface WsFM { processNo: string; processName: string; text: string; id: string }
interface WsFE { text: string; scope: string; id: string; severity: number }
interface WsFC { processNo: string; m4: string; text: string; id: string; workElem: string }

function extractWorksheetFMs(state: Record<string, unknown>): WsFM[] {
  const result: WsFM[] = [];
  const l2 = (state.l2 || []) as Array<Record<string, unknown>>;
  for (const proc of l2) {
    const pno = String(proc.no || '');
    const pname = String(proc.name || '');
    const modes = (proc.failureModes || []) as Array<Record<string, unknown>>;
    for (const fm of modes) {
      const text = String(fm.name || '').trim();
      if (!text) continue;
      result.push({ processNo: pno, processName: pname, text, id: String(fm.id || '') });
    }
  }
  return result;
}

function extractWorksheetFEs(state: Record<string, unknown>): WsFE[] {
  const result: WsFE[] = [];
  const l1 = state.l1 as Record<string, unknown> | undefined;
  if (!l1) return result;
  const scopes = (l1.failureScopes || []) as Array<Record<string, unknown>>;
  for (const fe of scopes) {
    const text = String(fe.name || '').trim();
    if (!text) continue;
    result.push({
      text,
      scope: String(fe.scope || ''),
      id: String(fe.id || ''),
      severity: Number(fe.severity) || 0,
    });
  }
  return result;
}

function extractWorksheetFCs(state: Record<string, unknown>): WsFC[] {
  const result: WsFC[] = [];
  const l2 = (state.l2 || []) as Array<Record<string, unknown>>;
  for (const proc of l2) {
    const pno = String(proc.no || '');
    const l2Causes = (proc.failureCauses || []) as Array<Record<string, unknown>>;
    for (const fc of l2Causes) {
      const text = String(fc.name || '').trim();
      if (!text) continue;
      result.push({ processNo: pno, m4: String(fc.m4 || ''), text, id: String(fc.id || ''), workElem: '' });
    }
    const l3s = (proc.l3 || []) as Array<Record<string, unknown>>;
    for (const we of l3s) {
      const m4 = String(we.m4 || '');
      const weName = String(we.name || '');
      const causes = (we.failureCauses || []) as Array<Record<string, unknown>>;
      for (const fc of causes) {
        const text = String(fc.name || '').trim();
        if (!text) continue;
        result.push({ processNo: pno, m4, text, id: String(fc.id || ''), workElem: weName });
      }
    }
  }
  return result;
}

// ─── 7단계 파이프라인 검증용 추출 함수 ───

function extractWorksheetL2Count(state: Record<string, unknown>): number {
  return ((state.l2 || []) as Array<unknown>).length;
}

function extractWorksheetL1FuncCount(state: Record<string, unknown>): number {
  const l1 = state.l1 as Record<string, unknown> | undefined;
  if (!l1) return 0;
  const types = (l1.types || []) as Array<Record<string, unknown>>;
  let count = 0;
  for (const t of types) {
    count += ((t.functions || []) as Array<unknown>).length;
  }
  return count;
}

function extractWorksheetL2FuncCount(state: Record<string, unknown>): number {
  const l2 = (state.l2 || []) as Array<Record<string, unknown>>;
  let count = 0;
  for (const proc of l2) {
    count += ((proc.functions || []) as Array<unknown>).length;
  }
  return count;
}

function extractWorksheetL3FuncCount(state: Record<string, unknown>): number {
  // ★ 2026-03-02: DISTINCT(l3Id, functionName) 기준 — DB verify-counts API와 동일
  // L3Function은 (functionName, processChar) 조합당 1행이므로
  // 같은 functionName이 다른 processChar와 짝지어 여러 행 존재 가능.
  // DISTINCT(l3Id, functionName)으로 고유 조합만 카운트해야 DB·Import와 일치.
  const l2 = (state.l2 || []) as Array<Record<string, unknown>>;
  const seen = new Set<string>();
  for (const proc of l2) {
    const l3s = (proc.l3 || []) as Array<Record<string, unknown>>;
    for (const we of l3s) {
      const l3Id = String(we.id || '');
      for (const fn of (we.functions || []) as Array<Record<string, unknown>>) {
        const funcName = String(fn.name || '').trim();
        if (funcName) {
          seen.add(`${l3Id}:${funcName}`);
        }
      }
    }
  }
  return seen.size;
}

// ─── 12항목 워크시트 추출 (추가 5개) ───

function extractWorksheetL1TypeCount(state: Record<string, unknown>): number {
  const l1 = state.l1 as Record<string, unknown> | undefined;
  if (!l1) return 0;
  return ((l1.types || []) as Array<Record<string, unknown>>).filter(t => String(t.name || '').trim()).length;
}

function extractWorksheetL1ReqCount(state: Record<string, unknown>): number {
  const l1 = state.l1 as Record<string, unknown> | undefined;
  if (!l1) return 0;
  let count = 0;
  for (const t of (l1.types || []) as Array<Record<string, unknown>>) {
    for (const fn of (t.functions || []) as Array<Record<string, unknown>>) {
      // ★ 2026-03-01: requirements(복수, 배열) 체크 — 이전: requirement(단수, 문자열) → 항상 0
      const reqs = fn.requirements as Array<Record<string, unknown>> | undefined;
      if (reqs && Array.isArray(reqs)) {
        count += reqs.filter(r => String(r.name || '').trim()).length;
      } else if (String(fn.requirement || '').trim()) {
        // DB 로드 직후 (미변환 상태) fallback
        count++;
      }
    }
  }
  return count;
}

function extractWorksheetL3NameCount(state: Record<string, unknown>): number {
  let count = 0;
  for (const proc of (state.l2 || []) as Array<Record<string, unknown>>) {
    for (const we of (proc.l3 || []) as Array<Record<string, unknown>>) {
      if (String(we.name || '').trim()) count++;
    }
  }
  return count;
}

function extractWorksheetProductCharCount(state: Record<string, unknown>): number {
  let count = 0;
  for (const proc of (state.l2 || []) as Array<Record<string, unknown>>) {
    for (const fn of (proc.functions || []) as Array<Record<string, unknown>>) {
      const pc = fn.productChars ?? fn.productChar;
      if (Array.isArray(pc)) count += (pc as string[]).filter(v => String(v || '').trim()).length;
      else if (typeof pc === 'string' && pc.trim()) count++;
    }
  }
  return count;
}

function extractWorksheetProcessCharCount(state: Record<string, unknown>): number {
  let count = 0;
  for (const proc of (state.l2 || []) as Array<Record<string, unknown>>) {
    for (const we of (proc.l3 || []) as Array<Record<string, unknown>>) {
      for (const fn of (we.functions || []) as Array<Record<string, unknown>>) {
        const pc = fn.processChars ?? fn.processChar;
        if (Array.isArray(pc)) count += (pc as string[]).filter(v => String(v || '').trim()).length;
        else if (typeof pc === 'string' && pc.trim()) count++;
      }
    }
  }
  return count;
}

// ─── B1 작업요소 추적 (Import↔WS 개별 매칭) ───

function extractWorksheetB1Map(state: Record<string, unknown>): Map<string, string> {
  const result = new Map<string, string>();
  for (const proc of (state.l2 || []) as Array<Record<string, unknown>>) {
    const pno = String(proc.no || '');
    for (const we of (proc.l3 || []) as Array<Record<string, unknown>>) {
      const name = String(we.name || '').trim();
      if (name) result.set(`${pno}|${name}`, name);
    }
  }
  return result;
}

function computeB1Trace(
  flatItems: FlatItem[],
  state: Record<string, unknown>,
): { trace: StructureTraceItem[]; stats: { total: number; inWorksheet: number; missing: number; wsOnly: number } } {
  const wsB1Map = extractWorksheetB1Map(state);

  // Import B1 (distinct by processNo|value)
  const importB1 = new Map<string, { processNo: string; value: string }>();
  for (const d of flatItems) {
    if (d.itemCode === 'B1' && d.value?.trim()) {
      const key = `${d.processNo}|${d.value.trim()}`;
      if (!importB1.has(key)) {
        importB1.set(key, { processNo: d.processNo, value: d.value.trim() });
      }
    }
  }

  const trace: StructureTraceItem[] = [];
  const matchedWsKeys = new Set<string>();

  for (const [, item] of importB1) {
    const exactKey = `${item.processNo}|${item.value}`;
    let inWorksheet = wsB1Map.has(exactKey);

    if (inWorksheet) {
      matchedWsKeys.add(exactKey);
    } else {
      // norm 매칭
      for (const [wsKey, wsName] of wsB1Map) {
        const wsPno = wsKey.split('|')[0];
        if (wsPno === item.processNo && norm(wsName) === norm(item.value)) {
          inWorksheet = true;
          matchedWsKeys.add(wsKey);
          break;
        }
      }
    }

    if (!inWorksheet) {
      // normStrict 매칭
      for (const [wsKey, wsName] of wsB1Map) {
        const wsPno = wsKey.split('|')[0];
        if (wsPno === item.processNo && normStrict(wsName) === normStrict(item.value)) {
          inWorksheet = true;
          matchedWsKeys.add(wsKey);
          break;
        }
      }
    }

    if (!inWorksheet) {
      // similarity > 0.85
      for (const [wsKey, wsName] of wsB1Map) {
        const wsPno = wsKey.split('|')[0];
        if (wsPno === item.processNo && similarity(wsName, item.value) > 0.85) {
          inWorksheet = true;
          matchedWsKeys.add(wsKey);
          break;
        }
      }
    }

    trace.push({ processNo: item.processNo, value: item.value, inImport: true, inWorksheet });
  }

  // WS-only
  for (const [wsKey, wsName] of wsB1Map) {
    if (matchedWsKeys.has(wsKey)) continue;
    const processNo = wsKey.split('|')[0];
    trace.push({ processNo, value: wsName, inImport: false, inWorksheet: true });
  }

  trace.sort((a, b) => (parseInt(a.processNo) || 9999) - (parseInt(b.processNo) || 9999));

  const importOnly = trace.filter(t => t.inImport);
  const wsOnly = trace.filter(t => !t.inImport);

  return {
    trace,
    stats: {
      total: importOnly.length,
      inWorksheet: importOnly.filter(t => t.inWorksheet).length,
      missing: importOnly.filter(t => !t.inWorksheet).length,
      wsOnly: wsOnly.length,
    },
  };
}

// ─── FM/FE/FC 탐색 헬퍼 (4단계 cascade) ───

function findFM(wsFMs: WsFM[], processNo: string, fmVal: string): WsFM | null {
  // 1) 같은 공정 + norm 정확
  let found = wsFMs.find(fm => fm.processNo === processNo && norm(fm.text) === norm(fmVal));
  if (found) return found;
  // 2) 같은 공정 + normStrict
  found = wsFMs.find(fm => fm.processNo === processNo && normStrict(fm.text) === normStrict(fmVal));
  if (found) return found;
  // 3) 같은 공정 + contains
  found = wsFMs.find(fm => fm.processNo === processNo && textMatch(fm.text, fmVal).contains);
  if (found) return found;
  // 4) 같은 공정 + similarity > 0.85
  found = wsFMs.find(fm => fm.processNo === processNo && similarity(fm.text, fmVal) > 0.85);
  return found || null;
}

function findFE(wsFEs: WsFE[], feVal: string): WsFE | null {
  let found = wsFEs.find(fe => norm(fe.text) === norm(feVal));
  if (found) return found;
  found = wsFEs.find(fe => normStrict(fe.text) === normStrict(feVal));
  if (found) return found;
  found = wsFEs.find(fe => textMatch(fe.text, feVal).contains);
  if (found) return found;
  found = wsFEs.find(fe => similarity(fe.text, feVal) > 0.85);
  return found || null;
}

function findFC(wsFCs: WsFC[], processNo: string, fcVal: string): WsFC | null {
  let found = wsFCs.find(fc => fc.processNo === processNo && norm(fc.text) === norm(fcVal));
  if (found) return found;
  found = wsFCs.find(fc => fc.processNo === processNo && normStrict(fc.text) === normStrict(fcVal));
  if (found) return found;
  found = wsFCs.find(fc => fc.processNo === processNo && textMatch(fc.text, fcVal).contains);
  if (found) return found;
  found = wsFCs.find(fc => fc.processNo === processNo && similarity(fc.text, fcVal) > 0.85);
  return found || null;
}

// ─── 누락 원인 진단 (v3: resolved IDs 반환) ───

interface DiagnoseResult {
  reason: FailReason;
  diagnostics: string;
  resolvedFm?: WsFM;
  resolvedFe?: WsFE;
  resolvedFc?: WsFC;
}

function diagnoseChain(
  chain: ImportChain,
  wsFMs: WsFM[],
  wsFEs: WsFE[],
  wsFCs: WsFC[],
): DiagnoseResult {
  const fmVal = chain.fmValue?.trim();
  const fcVal = chain.fcValue?.trim();
  const feVal = chain.feValue?.trim();

  if (!fmVal && !fcVal && !feVal) {
    return { reason: 'chain_empty', diagnostics: '빈 chain (FM/FC/FE 모두 없음)' };
  }

  // ── FM ──
  const foundFM = findFM(wsFMs, chain.processNo, fmVal);
  if (!foundFM) {
    // cross-process
    const crossFM = wsFMs.find(fm =>
      fm.processNo !== chain.processNo && (norm(fm.text) === norm(fmVal) || normStrict(fm.text) === normStrict(fmVal))
    );
    if (crossFM) {
      return {
        reason: 'fm_cross_process',
        diagnostics: `FM="${fmVal}" → 공정${chain.processNo}에 없음, 공정${crossFM.processNo}(${crossFM.processName})에서 발견`,
      };
    }
    // 유사 매칭
    const similarFM = wsFMs.find(fm => fm.processNo === chain.processNo && similarity(fm.text, fmVal) > 0.6);
    if (similarFM) {
      return {
        reason: 'fm_text_mismatch',
        diagnostics: `공정${chain.processNo} FM 유사: "${fmVal}" vs "${similarFM.text}" (${(similarity(similarFM.text, fmVal) * 100).toFixed(0)}%)`,
      };
    }
    const sameProcCount = wsFMs.filter(fm => fm.processNo === chain.processNo).length;
    return {
      reason: 'fm_not_found',
      diagnostics: `공정${chain.processNo}에 FM="${fmVal}" 없음 (해당 공정 FM: ${sameProcCount}건)`,
    };
  }

  // ── FC ──
  const foundFC = findFC(wsFCs, chain.processNo, fcVal);
  if (!foundFC) {
    const similarFC = wsFCs.find(fc => fc.processNo === chain.processNo && similarity(fc.text, fcVal) > 0.6);
    if (similarFC) {
      return {
        reason: 'fc_text_mismatch',
        diagnostics: `공정${chain.processNo} FC 유사: "${fcVal}" vs "${similarFC.text}" (${(similarity(similarFC.text, fcVal) * 100).toFixed(0)}%)`,
      };
    }
    return { reason: 'fc_not_found', diagnostics: `공정${chain.processNo}/${chain.m4}에 FC="${fcVal}" 없음` };
  }

  // ── FE ──
  const foundFE = findFE(wsFEs, feVal);
  if (!foundFE) {
    const similarFE = wsFEs.find(fe => similarity(fe.text, feVal) > 0.6);
    if (similarFE) {
      return {
        reason: 'fe_text_mismatch',
        diagnostics: `FE 유사: "${feVal}" vs "${similarFE.text}" (${(similarity(similarFE.text, feVal) * 100).toFixed(0)}%)`,
      };
    }
    return { reason: 'fe_not_found', diagnostics: `FE="${feVal}" 없음 (scope=${chain.feScope})` };
  }

  // ── 모두 있으나 Link 미생성 → 복구 가능 ──
  return {
    reason: 'link_missing',
    diagnostics: `FM/FC/FE 모두 존재 → 복구 가능. fm="${foundFM.text}", fe="${foundFE.text}", fc="${foundFC.text}"`,
    resolvedFm: foundFM,
    resolvedFe: foundFE,
    resolvedFc: foundFC,
  };
}

// ─── 메인 훅 ───

interface SavedLink {
  fmText?: string;
  fcText?: string;
  feText?: string;
  fmId?: string;
  feId?: string;
  fcId?: string;
  fmProcess?: string;
  fmProcessNo?: string;
  fmPath?: string;
}

interface UseFailureLinkVerifyProps {
  chains: ImportChain[];
  flatItems: FlatItem[];
  state: Record<string, unknown>;
  savedLinks: SavedLink[];
}

export function useFailureLinkVerify({ chains, flatItems, state, savedLinks }: UseFailureLinkVerifyProps): LinkVerifyResult | null {
  return useMemo(() => {
    if (chains.length === 0) return null;

    const wsFMs = extractWorksheetFMs(state);
    const wsFEs = extractWorksheetFEs(state);
    const wsFCs = extractWorksheetFCs(state);

    // ── savedLinks 매칭 키 구축 ──
    const linkByFmId = new Set<string>();
    const linkKeySet = new Set<string>();
    const linkFmTextSet = new Set<string>();

    for (const link of savedLinks) {
      if (link.fmId) linkByFmId.add(link.fmId);
      if (link.fmText?.trim()) {
        linkKeySet.add(`${norm(link.fmText || '')}|${norm(link.feText || '')}|${norm(link.fcText || '')}`);
        linkFmTextSet.add(norm(link.fmText));
      }
    }

    const failedChains: FailedChainDetail[] = [];
    const repairableLinks: RepairableLink[] = [];
    let matchedCount = 0;

    // ★ chain 중복제거 (processNo+fcValue 기준 — 고유 고장원인)
    // FC시트에서 같은 FC가 여러 FM×FE 조합으로 중복 등장 → FC 기준으로 dedup
    // 기존 buildFailureChainsFromFlat(flatItems 기반)과 동일 기준: B4(FC) 고유 조합
    const chainDedupMap = new Map<string, ImportChain>();
    for (const c of chains) {
      const key = `${c.processNo}|${(c.fcValue||'').trim()}`;
      if (!chainDedupMap.has(key)) chainDedupMap.set(key, c);
    }
    const dedupedChains = [...chainDedupMap.values()];

    // 중복 복구 방지 (같은 FM+FE+FC 조합)
    const repairKeySet = new Set<string>();

    for (let i = 0; i < dedupedChains.length; i++) {
      const chain = dedupedChains[i];
      const fmVal = chain.fmValue?.trim() || '';
      const fcVal = chain.fcValue?.trim() || '';
      const feVal = chain.feValue?.trim() || '';

      if (!fmVal) {
        failedChains.push({
          chainIndex: i, processNo: chain.processNo, m4: chain.m4 || '',
          fmValue: fmVal, fcValue: fcVal, feValue: feVal,
          failReason: 'chain_empty', diagnostics: 'FM값 없음',
        });
        continue;
      }

      // ── chain→link 매칭 (3중 시도) ──
      const key = `${norm(fmVal)}|${norm(feVal)}|${norm(fcVal)}`;
      if (linkKeySet.has(key)) { matchedCount++; continue; }

      // normStrict 3중 키
      const strictKey = `${normStrict(fmVal)}|${normStrict(feVal)}|${normStrict(fcVal)}`;
      let strictMatched = false;
      for (const lk of linkKeySet) {
        const parts = lk.split('|');
        if (`${parts[0]?.replace(/\s+/g, '')}|${parts[1]?.replace(/\s+/g, '')}|${parts[2]?.replace(/\s+/g, '')}` === strictKey) {
          strictMatched = true; break;
        }
      }
      if (strictMatched) { matchedCount++; continue; }

      // FM ID 기반
      const wsFm = findFM(wsFMs, chain.processNo, fmVal);
      if (wsFm && linkByFmId.has(wsFm.id)) { matchedCount++; continue; }

      // 매칭 실패 → 진단
      const diag = diagnoseChain(chain, wsFMs, wsFEs, wsFCs);
      const detail: FailedChainDetail = {
        chainIndex: i, processNo: chain.processNo, m4: chain.m4 || '',
        fmValue: fmVal, fcValue: fcVal, feValue: feVal,
        failReason: diag.reason, diagnostics: diag.diagnostics,
      };

      // ★ link_missing → 복구 가능 데이터 생성
      if (diag.reason === 'link_missing' && diag.resolvedFm && diag.resolvedFe && diag.resolvedFc) {
        detail.resolvedFmId = diag.resolvedFm.id;
        detail.resolvedFeId = diag.resolvedFe.id;
        detail.resolvedFcId = diag.resolvedFc.id;

        const repairKey = `${diag.resolvedFm.id}|${diag.resolvedFe.id}|${diag.resolvedFc.id}`;
        if (!repairKeySet.has(repairKey)) {
          repairKeySet.add(repairKey);
          repairableLinks.push({
            fmId: diag.resolvedFm.id,
            feId: diag.resolvedFe.id,
            fcId: diag.resolvedFc.id,
            fmText: diag.resolvedFm.text,
            feText: diag.resolvedFe.text,
            fcText: diag.resolvedFc.text,
            fmProcessNo: diag.resolvedFm.processNo,
            fmProcess: diag.resolvedFm.processName,
            feScope: diag.resolvedFe.scope,
            severity: diag.resolvedFe.severity,
            fcM4: diag.resolvedFc.m4,
            fcWorkElem: diag.resolvedFc.workElem,
          });
        }
      }

      failedChains.push(detail);
    }

    // 원인별 카운트
    const reasonSummary: Record<FailReason, number> = {
      fm_not_found: 0, fm_cross_process: 0,
      fc_not_found: 0, fe_not_found: 0,
      fm_text_mismatch: 0, fc_text_mismatch: 0, fe_text_mismatch: 0,
      link_missing: 0, chain_empty: 0,
    };
    for (const f of failedChains) reasonSummary[f.failReason]++;

    // ─── 14항목 Import 카운트 (flatItems 기반 + chains의 A6/B5) ───
    // ★ 2026-03-02: B2는 DISTINCT(processNo, value) 기준 — DB verify-counts API와 동일
    const countByCode = (code: string) => flatItems.filter(d => d.itemCode === code && d.value?.trim()).length;
    const countByCodeDistinct = (code: string) => {
      const set = new Set<string>();
      for (const d of flatItems) {
        if (d.itemCode === code && d.value?.trim()) set.add(`${d.processNo}|${d.value.trim()}`);
      }
      return set.size;
    };
    const importFmSet = new Set(flatItems.filter(d => d.itemCode === 'A5' && d.value?.trim()).map(d => `${d.processNo}|${d.value.trim()}`));
    // ★ A6(검출관리)/B5(예방관리): dedupedChains 기반 DISTINCT(processNo, value)
    // WS도 dedup된 FC 기준으로 PC/DC가 채워지므로 dedupedChains 사용 (ALL chains=30, deduped=27, WS=27 일치)
    const importA6Count = new Set(dedupedChains.map(c => {
      const v = (c.dcValue || '').trim().replace(/^D:/, '').trim();
      return v ? `${c.processNo}|${v}` : '';
    }).filter(Boolean)).size;
    const importB5Count = new Set(dedupedChains.map(c => {
      const v = (c.pcValue || '').trim().replace(/^P:/, '').trim();
      return v ? `${c.processNo}|${v}` : '';
    }).filter(Boolean)).size;

    // ─── 12항목 Worksheet 카운트 ───
    const wsL2Count = extractWorksheetL2Count(state);
    const wsL3NameCount = extractWorksheetL3NameCount(state);
    const wsL1TypeCount = extractWorksheetL1TypeCount(state);
    const wsL1FuncCount = extractWorksheetL1FuncCount(state);
    const wsL1ReqCount = extractWorksheetL1ReqCount(state);
    const wsL2FuncCount = extractWorksheetL2FuncCount(state);
    const wsProductCharCount = extractWorksheetProductCharCount(state);
    const wsL3FuncCount = extractWorksheetL3FuncCount(state);
    const wsProcessCharCount = extractWorksheetProcessCharCount(state);

    const linkedFmIds = new Set(savedLinks.map(l => l.fmId).filter(Boolean));
    const linkedFeIds = new Set(savedLinks.map(l => l.feId).filter(Boolean));
    const linkedFcIds = new Set(savedLinks.map(l => l.fcId).filter(Boolean));
    const fmWithFe = new Set(savedLinks.filter(l => l.fmId && l.feId).map(l => l.fmId));
    const fmWithFc = new Set(savedLinks.filter(l => l.fmId && l.fcId).map(l => l.fmId));
    const totalFMs = wsFMs.length;

    // ★ A6/B5 워크시트 카운트: DISTINCT(processNo, value) — Import/DB와 동일 기준
    // ★★★ 2026-03-02 FIX: fmProcess(공정명) → processNo(공정번호) 키 사용
    // 근본원인: Import/DB는 processNo("10","20")로 키를 만들지만,
    //          WS는 fmProcess(공정명 "사출","조립")를 사용 → 같은 공정명의 다른 공정이 병합되어 -3건 차이
    const fmIdToProcessNo = new Map<string, string>();
    for (const proc of (state.l2 || []) as Array<Record<string, unknown>>) {
      const pno = String(proc.no || '');
      for (const fm of (proc.failureModes || []) as Array<Record<string, unknown>>) {
        const fmId = String(fm.id || '');
        if (fmId) fmIdToProcessNo.set(fmId, pno);
      }
    }

    const riskData = (state.riskData || {}) as Record<string, string | number>;
    const wsPcSet = new Set<string>();
    const wsDcSet = new Set<string>();
    for (const link of savedLinks) {
      if (!link.fmId || !link.fcId) continue;
      const uk = `${link.fmId}-${link.fcId}`;
      // ★ processNo 기반 키 (Import/DB와 동일) — fmProcess(공정명) 사용 금지
      const pNo = fmIdToProcessNo.get(link.fmId) || link.fmProcessNo || (link.fmProcess || '').trim();
      // B5 예방관리
      const pcVal = String(riskData[`prevention-${uk}`] ?? '').trim();
      if (pcVal) {
        for (const line of pcVal.split('\n')) {
          const text = line.trim().replace(/^P:/, '').trim();
          if (text) wsPcSet.add(`${pNo}|${text}`);
        }
      }
      // A6 검출관리
      const dcVal = String(riskData[`detection-${uk}`] ?? '').trim();
      if (dcVal) {
        for (const line of dcVal.split('\n')) {
          const text = line.trim().replace(/^D:/, '').trim();
          if (text) wsDcSet.add(`${pNo}|${text}`);
        }
      }
    }
    const wsPcCount = wsPcSet.size;
    const wsDcCount = wsDcSet.size;

    // ★ B1 작업요소 추적 — Import↔WS 개별 매칭
    const b1Result = computeB1Trace(flatItems, state);

    // ★ 14행 countComparison — 사실 기반 카운트 (DB verify-counts API와 대응)
    const countComparison: CountComparisonRow[] = [
      { label: '공정명',       itemCode: 'A2', importCount: countByCode('A2'), worksheetCount: wsL2Count,          linkedCount: -1, coverageGap: -1 },
      { label: '작업요소명',   itemCode: 'B1', importCount: countByCodeDistinct('B1'), worksheetCount: wsL3NameCount,      linkedCount: -1, coverageGap: b1Result.stats.missing },
      { label: '구분',         itemCode: 'C1', importCount: countByCode('C1'), worksheetCount: wsL1TypeCount,      linkedCount: -1, coverageGap: -1 },
      { label: '완제품기능',   itemCode: 'C2', importCount: countByCode('C2'), worksheetCount: wsL1FuncCount,      linkedCount: -1, coverageGap: -1 },
      { label: '요구사항',     itemCode: 'C3', importCount: countByCode('C3'), worksheetCount: wsL1ReqCount,       linkedCount: -1, coverageGap: -1 },
      { label: '공정기능',     itemCode: 'A3', importCount: countByCode('A3'), worksheetCount: wsL2FuncCount,      linkedCount: -1, coverageGap: -1 },
      { label: '제품특성',     itemCode: 'A4', importCount: countByCode('A4'), worksheetCount: wsProductCharCount,  linkedCount: -1, coverageGap: -1 },
      { label: '작업요소기능', itemCode: 'B2', importCount: countByCode('B2'), worksheetCount: wsL3FuncCount,      linkedCount: -1, coverageGap: -1 },
      { label: '공정특성',     itemCode: 'B3', importCount: countByCode('B3'), worksheetCount: wsProcessCharCount,  linkedCount: -1, coverageGap: -1 },
      { label: '고장영향',     itemCode: 'C4', importCount: countByCode('C4'), worksheetCount: wsFEs.length,       linkedCount: linkedFeIds.size, coverageGap: totalFMs - fmWithFe.size },
      { label: '고장형태',     itemCode: 'A5', importCount: countByCode('A5'), worksheetCount: wsFMs.length,       linkedCount: linkedFmIds.size, coverageGap: totalFMs - linkedFmIds.size },
      { label: '고장원인',     itemCode: 'B4', importCount: countByCode('B4'), worksheetCount: wsFCs.length,       linkedCount: linkedFcIds.size, coverageGap: totalFMs - fmWithFc.size },
      // ★ A6(검출관리)/B5(예방관리) — riskData에서 고유 텍스트 카운트
      { label: '검출관리',     itemCode: 'A6', importCount: importA6Count,     worksheetCount: wsDcCount,          linkedCount: -1, coverageGap: -1 },
      { label: '예방관리',     itemCode: 'B5', importCount: importB5Count,     worksheetCount: wsPcCount,          linkedCount: -1, coverageGap: -1 },
    ];

    // ★ FM 중심 추적
    const fmTrace: FMTraceItem[] = [];

    for (const fmKey of importFmSet) {
      const [processNo, ...rest] = fmKey.split('|');
      const fmText = rest.join('|');

      const wsMatch = findFM(wsFMs, processNo, fmText);
      const isLinked = (wsMatch && linkByFmId.has(wsMatch.id))
        || linkFmTextSet.has(norm(fmText))
        || linkFmTextSet.has(normStrict(fmText));

      let missingAt: FMTraceItem['missingAt'] = null;
      let bestSimilarity: number | undefined;
      let bestMatchText: string | undefined;
      let crossProcessMatch: FMTraceItem['crossProcessMatch'];

      if (!wsMatch) {
        missingAt = 'worksheet';
        const crossFM = wsFMs.find(fm =>
          fm.processNo !== processNo && (norm(fm.text) === norm(fmText) || normStrict(fm.text) === normStrict(fmText))
        );
        if (crossFM) {
          crossProcessMatch = { processNo: crossFM.processNo, processName: crossFM.processName, similarity: 1.0 };
        }
        let best = 0; let bestText = ''; let bestProc = ''; let bestProcName = '';
        for (const fm of wsFMs) {
          const sim = similarity(fm.text, fmText);
          if (sim > best) { best = sim; bestText = fm.text; bestProc = fm.processNo; bestProcName = fm.processName; }
        }
        if (best > 0.5) {
          bestSimilarity = best; bestMatchText = bestText;
          if (bestProc !== processNo && !crossProcessMatch) {
            crossProcessMatch = { processNo: bestProc, processName: bestProcName, similarity: best };
          }
        }
      } else if (!isLinked) {
        missingAt = 'link';
      }

      fmTrace.push({ processNo, fmText, inImport: true, inWorksheet: !!wsMatch, inLink: isLinked, missingAt, bestSimilarity, bestMatchText, crossProcessMatch });
    }

    // WS 전용 FM
    for (const wsFm of wsFMs) {
      if (importFmSet.has(`${wsFm.processNo}|${wsFm.text}`)) continue;
      let foundInImport = false;
      for (const fmKey of importFmSet) {
        const [pno, ...rest] = fmKey.split('|');
        if (pno === wsFm.processNo && normStrict(rest.join('|')) === normStrict(wsFm.text)) { foundInImport = true; break; }
      }
      if (foundInImport) continue;
      const isLinked = linkByFmId.has(wsFm.id) || linkFmTextSet.has(norm(wsFm.text));
      fmTrace.push({ processNo: wsFm.processNo, fmText: wsFm.text, inImport: false, inWorksheet: true, inLink: isLinked, missingAt: null });
    }

    fmTrace.sort((a, b) => {
      const pA = parseInt(a.processNo) || 9999;
      const pB = parseInt(b.processNo) || 9999;
      return pA !== pB ? pA - pB : a.fmText.localeCompare(b.fmText);
    });

    const importOnly = fmTrace.filter(t => t.inImport);
    const wsOnly = fmTrace.filter(t => !t.inImport);

    // ★ A6/B5 재Import 필요 여부: chains에 pcValue/dcValue가 하나도 없으면 true
    const hasPCDC = chains.some(c => (c.pcValue || '').trim() || (c.dcValue || '').trim());
    const needsReimportPCDC = chains.length > 0 && !hasPCDC;

    return {
      chainCount: dedupedChains.length,
      matchedCount,
      failedCount: failedChains.length,
      failedChains,
      reasonSummary,
      countComparison,
      fmTrace,
      fmTraceStats: {
        total: importOnly.length,
        inWorksheet: importOnly.filter(t => t.inWorksheet).length,
        inLink: importOnly.filter(t => t.inLink).length,
        missingInWorksheet: importOnly.filter(t => t.missingAt === 'worksheet').length,
        missingInLink: importOnly.filter(t => t.missingAt === 'link').length,
        wsOnlyCount: wsOnly.length,
      },
      wsLinkCount: savedLinks.length,
      repairableLinks,
      b1Trace: b1Result.trace,
      b1TraceStats: b1Result.stats,
      needsReimportPCDC,
    };
  }, [chains, flatItems, state, savedLinks]);
}

// ─── 테스트용 순수 함수 (훅 외부에서 직접 호출 가능) ───

interface SavedLinkMinimal {
  fmId?: string;
  feId?: string;
  fcId?: string;
}

/**
 * countComparison 12항목 계산 — 테스트에서 직접 호출 가능한 순수 함수
 */
export function computeCountComparison(
  flatItems: { processNo: string; category: string; itemCode: string; value: string }[],
  state: Record<string, unknown>,
  savedLinks: SavedLinkMinimal[],
): CountComparisonRow[] {
  const wsFMs = extractWorksheetFMs(state);
  const wsFEs = extractWorksheetFEs(state);
  const wsFCs = extractWorksheetFCs(state);

  const countByCode = (code: string) => flatItems.filter(d => d.itemCode === code && d.value?.trim()).length;
  // ★ 2026-03-02: B2는 DISTINCT(processNo, value) 기준 — DB verify-counts API와 동일
  const countByCodeDistinctPure = (code: string) => {
    const set = new Set<string>();
    for (const d of flatItems) {
      if (d.itemCode === code && d.value?.trim()) set.add(`${d.processNo}|${d.value.trim()}`);
    }
    return set.size;
  };

  // 12항목 Worksheet 카운트
  const wsL2Count = extractWorksheetL2Count(state);
  const wsL3NameCount = extractWorksheetL3NameCount(state);
  const wsL1TypeCount = extractWorksheetL1TypeCount(state);
  const wsL1FuncCount = extractWorksheetL1FuncCount(state);
  const wsL1ReqCount = extractWorksheetL1ReqCount(state);
  const wsL2FuncCount = extractWorksheetL2FuncCount(state);
  const wsProductCharCount = extractWorksheetProductCharCount(state);
  const wsL3FuncCount = extractWorksheetL3FuncCount(state);
  const wsProcessCharCount = extractWorksheetProcessCharCount(state);

  // Link 카운트 + FM 커버리지
  const linkedFmIds = new Set(savedLinks.map(l => l.fmId).filter(Boolean));
  const linkedFeIds = new Set(savedLinks.map(l => l.feId).filter(Boolean));
  const linkedFcIds = new Set(savedLinks.map(l => l.fcId).filter(Boolean));
  const fmWithFe = new Set(savedLinks.filter(l => l.fmId && l.feId).map(l => l.fmId));
  const fmWithFc = new Set(savedLinks.filter(l => l.fmId && l.fcId).map(l => l.fmId));
  const totalFMs = wsFMs.length;

  return [
    { label: '공정명',       itemCode: 'A2', importCount: countByCode('A2'), worksheetCount: wsL2Count,          linkedCount: -1, coverageGap: -1 },
    { label: '작업요소명',   itemCode: 'B1', importCount: countByCodeDistinctPure('B1'), worksheetCount: wsL3NameCount,      linkedCount: -1, coverageGap: -1 },
    { label: '구분',         itemCode: 'C1', importCount: countByCode('C1'), worksheetCount: wsL1TypeCount,      linkedCount: -1, coverageGap: -1 },
    { label: '완제품기능',   itemCode: 'C2', importCount: countByCode('C2'), worksheetCount: wsL1FuncCount,      linkedCount: -1, coverageGap: -1 },
    { label: '요구사항',     itemCode: 'C3', importCount: countByCode('C3'), worksheetCount: wsL1ReqCount,       linkedCount: -1, coverageGap: -1 },
    { label: '공정기능',     itemCode: 'A3', importCount: countByCode('A3'), worksheetCount: wsL2FuncCount,      linkedCount: -1, coverageGap: -1 },
    { label: '제품특성',     itemCode: 'A4', importCount: countByCode('A4'), worksheetCount: wsProductCharCount,  linkedCount: -1, coverageGap: -1 },
    { label: '작업요소기능', itemCode: 'B2', importCount: countByCode('B2'), worksheetCount: wsL3FuncCount,      linkedCount: -1, coverageGap: -1 },
    { label: '공정특성',     itemCode: 'B3', importCount: countByCode('B3'), worksheetCount: wsProcessCharCount,  linkedCount: -1, coverageGap: -1 },
    { label: '고장영향',     itemCode: 'C4', importCount: countByCode('C4'), worksheetCount: wsFEs.length,       linkedCount: linkedFeIds.size, coverageGap: totalFMs - fmWithFe.size },
    { label: '고장형태',     itemCode: 'A5', importCount: countByCode('A5'), worksheetCount: wsFMs.length,       linkedCount: linkedFmIds.size, coverageGap: totalFMs - linkedFmIds.size },
    { label: '고장원인',     itemCode: 'B4', importCount: countByCode('B4'), worksheetCount: wsFCs.length,       linkedCount: linkedFcIds.size, coverageGap: totalFMs - fmWithFc.size },
  ];
}
