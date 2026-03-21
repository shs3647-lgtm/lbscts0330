/**
 * @file parseResultToStepBData.ts
 * @description ParseResult(excel-parser 출력) → StepBBuildData 변환
 *
 * handleFileSelect에서 parseMultiSheetExcel() 결과를 convertToImportFormat()에
 * 전달하기 위한 중간 변환 유틸리티.
 *
 * ParseResult.processes/products → StepBBuildData 구조 매핑
 * ParseResult.failureChains(MasterFailureChain[]) → StepBFCChain[] 변환
 *
 * @created 2026-03-21
 */

import type { ParseResult } from '../excel-parser';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type {
  StepBBuildData, StepBMasterChain,
  StepBA4Item, StepBB1Item, StepBB2Item, StepBB3Item, StepBB4Item, StepBB5Item,
  StepBC4Item, StepBFCChain,
} from '../stepb-parser/types';

/** 값을 문자열로 변환 */
function ensureStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if ('name' in (val as Record<string, unknown>)) return String((val as Record<string, unknown>).name || '');
    if (Array.isArray(val)) return val.map(v => ensureStr(v)).filter(Boolean).join(', ');
    return '';
  }
  return String(val);
}

/** C1 카테고리 정규화 */
const C1_CATEGORY_MAP: Record<string, string> = {
  'your plant': 'YP', 'ship to plant': 'SP', 'user': 'USER',
  'end user': 'USER', '자사공장': 'YP', '고객사': 'SP', '최종사용자': 'USER',
};
function normalizeC1(name: string): string {
  return C1_CATEGORY_MAP[name.toLowerCase()] || name;
}

/**
 * ParseResult → StepBBuildData 변환
 *
 * excel-parser의 ProcessRelation/ProductRelation 구조를
 * import-builder의 StepBBuildData 구조(Map 기반)로 변환한다.
 */
export function convertParseResultToStepBBuildData(result: ParseResult): StepBBuildData {
  const procMaster = new Map<string, string>();
  const a3Map = new Map<string, { func: string; auto: boolean }>();
  const a4Map = new Map<string, StepBA4Item[]>();
  const a5Map = new Map<string, string[]>();
  const a5ParentA4 = new Map<string, string>();
  const a6Map = new Map<string, string[]>();
  const b1Map = new Map<string, StepBB1Item[]>();
  const b2Map = new Map<string, StepBB2Item[]>();
  const b3Map = new Map<string, StepBB3Item[]>();
  const b4Map = new Map<string, StepBB4Item[]>();
  const b5Map = new Map<string, StepBB5Item[]>();

  // dedup sets
  const seen = {
    a4: new Set<string>(),
    a5: new Set<string>(),
    b1: new Set<string>(),
    b2: new Set<string>(),
    b3: new Set<string>(),
    b4: new Set<string>(),
    b5: new Set<string>(),
    a6: new Set<string>(),
  };

  for (const p of result.processes) {
    const pno = ensureStr(p.processNo);
    if (!pno) continue;

    // Skip empty '공통' process
    if (pno === '공통') {
      const has = (arr: string[]) => arr.some(v => v.trim() !== '');
      const hasReal = (p.processName?.trim()) || has(p.processDesc) || has(p.productChars)
        || has(p.failureModes) || has(p.workElements)
        || has(p.elementFuncs) || has(p.processChars) || has(p.failureCauses);
      if (!hasReal) continue;
    }

    // A1/A2
    if (!procMaster.has(pno)) {
      procMaster.set(pno, ensureStr(p.processName));
    }

    // A3 — first processDesc as function
    if (!a3Map.has(pno) && p.processDesc.length > 0) {
      const funcVal = ensureStr(p.processDesc[0]);
      if (funcVal.trim()) {
        a3Map.set(pno, { func: funcVal, auto: false });
      }
    }

    // A4 — product characteristics
    const a4Items = a4Map.get(pno) || [];
    for (let i = 0; i < p.productChars.length; i++) {
      const charVal = ensureStr(p.productChars[i]).trim();
      if (!charVal) continue;
      const key = `${pno}|${charVal}`;
      if (seen.a4.has(key)) continue;
      seen.a4.add(key);
      a4Items.push({
        char: charVal,
        sc: p.productCharsSpecialChar?.[i] || '',
      });
    }
    if (a4Items.length > 0) a4Map.set(pno, a4Items);

    // A5 — failure modes
    const a5Items = a5Map.get(pno) || [];
    for (let i = 0; i < p.failureModes.length; i++) {
      const fm = ensureStr(p.failureModes[i]).trim();
      if (!fm) continue;
      const key = `${pno}|${fm}`;
      if (seen.a5.has(key)) continue;
      seen.a5.add(key);
      a5Items.push(fm);
      // A5→A4 parent mapping (positional)
      if (i < p.productChars.length) {
        const a4Char = ensureStr(p.productChars[i]).trim();
        if (a4Char) a5ParentA4.set(`${pno}|${fm}`, a4Char);
      }
    }
    if (a5Items.length > 0) a5Map.set(pno, a5Items);

    // A6 — detection controls
    const a6Items = a6Map.get(pno) || [];
    if (p.detectionCtrls) {
      for (const dc of p.detectionCtrls) {
        const dcVal = ensureStr(dc).trim();
        if (!dcVal) continue;
        const key = `${pno}|${dcVal}`;
        if (seen.a6.has(key)) continue;
        seen.a6.add(key);
        a6Items.push(dcVal);
      }
    }
    if (a6Items.length > 0) a6Map.set(pno, a6Items);

    // B1 — work elements
    const b1Items = b1Map.get(pno) || [];
    for (let i = 0; i < p.workElements.length; i++) {
      const we = ensureStr(p.workElements[i]).trim();
      if (!we) continue;
      const m4 = p.workElements4M?.[i] || 'MC';
      const key = `${pno}|${m4}|${we}`;
      if (seen.b1.has(key)) continue;
      seen.b1.add(key);
      b1Items.push({ m4, we });
    }
    if (b1Items.length > 0) b1Map.set(pno, b1Items);

    // B2 — element functions
    const b2Items = b2Map.get(pno) || [];
    for (let i = 0; i < p.elementFuncs.length; i++) {
      const func = ensureStr(p.elementFuncs[i]).trim();
      if (!func) continue;
      const m4 = p.elementFuncs4M?.[i] || 'MC';
      const we = p.elementFuncsWE?.[i] || '';
      const key = `${pno}|${m4}|${we}|${func}`;
      if (seen.b2.has(key)) continue;
      seen.b2.add(key);
      b2Items.push({ m4, we, func });
    }
    if (b2Items.length > 0) b2Map.set(pno, b2Items);

    // B3 — process characteristics
    const b3Items = b3Map.get(pno) || [];
    for (let i = 0; i < p.processChars.length; i++) {
      const charVal = ensureStr(p.processChars[i]).trim();
      if (!charVal) continue;
      const m4 = p.processChars4M?.[i] || 'MC';
      const we = p.processCharsWE?.[i] || '';
      const sc = p.processCharsSpecialChar?.[i] || '';
      const key = `${pno}|${m4}|${we}|${charVal}`;
      if (seen.b3.has(key)) continue;
      seen.b3.add(key);
      b3Items.push({ m4, we, char: charVal, sc });
    }
    if (b3Items.length > 0) b3Map.set(pno, b3Items);

    // B4 — failure causes
    const b4Items = b4Map.get(pno) || [];
    for (let i = 0; i < p.failureCauses.length; i++) {
      const fc = ensureStr(p.failureCauses[i]).trim();
      if (!fc) continue;
      const m4 = p.failureCauses4M?.[i] || 'MC';
      const we = p.failureCausesWE?.[i] || '';
      // Find associated FM for this FC (best effort: use first FM of the process)
      const fm = (p.failureModes.length > 0) ? ensureStr(p.failureModes[0]).trim() : '';
      const key = `${pno}|${m4}|${we}|${fm}|${fc}`;
      if (seen.b4.has(key)) continue;
      seen.b4.add(key);
      b4Items.push({ m4, we, fc, fm });
    }
    if (b4Items.length > 0) b4Map.set(pno, b4Items);

    // B5 — prevention controls
    const b5Items = b5Map.get(pno) || [];
    if (p.preventionCtrls) {
      for (let i = 0; i < p.preventionCtrls.length; i++) {
        const pc = ensureStr(p.preventionCtrls[i]).trim();
        if (!pc) continue;
        const m4 = p.preventionCtrls4M?.[i] || 'MC';
        const key = `${pno}|${m4}|${pc}`;
        if (seen.b5.has(key)) continue;
        seen.b5.add(key);
        b5Items.push({ m4, pc });
      }
    }
    if (b5Items.length > 0) b5Map.set(pno, b5Items);
  }

  // C-level (products)
  const c1Set = new Set<string>();
  const c2Map = new Map<string, string[]>();
  const c3Map = new Map<string, string[]>();
  const c4Items: StepBC4Item[] = [];

  for (const p of result.products) {
    const scope = normalizeC1(ensureStr(p.productProcessName)) || 'YP';
    c1Set.add(scope);

    // C2
    const c2List = c2Map.get(scope) || [];
    for (const func of p.productFuncs) {
      const v = ensureStr(func).trim();
      if (v && !c2List.includes(v)) c2List.push(v);
    }
    if (c2List.length > 0) c2Map.set(scope, c2List);

    // C3
    const c3List = c3Map.get(scope) || [];
    for (const req of p.requirements) {
      const v = ensureStr(req).trim();
      if (v && !c3List.includes(v)) c3List.push(v);
    }
    if (c3List.length > 0) c3Map.set(scope, c3List);

    // C4
    for (const fe of p.failureEffects) {
      const feVal = ensureStr(fe).trim();
      if (!feVal) continue;
      if (!c4Items.some(c => c.scope === scope && c.fe === feVal)) {
        c4Items.push({ procNo: '', scope, fe: feVal, s: null });
      }
    }
  }

  // ── Chain-based gap-fill: 체인에 있지만 시트에 없는 항목 보충 ──
  const chains = result.failureChains || [];
  if (chains.length > 0) {
    // A3 gap-fill
    for (const ch of chains) {
      if (!ch.l2Function?.trim() || !ch.processNo) continue;
      if (a3Map.has(ch.processNo)) continue;
      a3Map.set(ch.processNo, { func: ch.l2Function.trim(), auto: false });
    }

    // A4 gap-fill (공정별로 A4 없는 경우만)
    for (const ch of chains) {
      if (!ch.productChar?.trim() || !ch.processNo) continue;
      if (a4Map.has(ch.processNo)) continue; // 이미 A4 있으면 skip
      const key = `${ch.processNo}|${ch.productChar.trim()}`;
      if (seen.a4.has(key)) continue;
      seen.a4.add(key);
      const items = a4Map.get(ch.processNo) || [];
      items.push({ char: ch.productChar.trim(), sc: ch.specialChar || '' });
      a4Map.set(ch.processNo, items);
    }

    // B2 gap-fill
    for (const ch of chains) {
      if (!ch.l3Function?.trim() || !ch.processNo) continue;
      const m4 = ch.m4 || 'MC';
      const we = ch.workElement || '';
      const key = `${ch.processNo}|${m4}|${we}|${ch.l3Function.trim()}`;
      if (seen.b2.has(key)) continue;
      seen.b2.add(key);
      const items = b2Map.get(ch.processNo) || [];
      items.push({ m4, we, func: ch.l3Function.trim() });
      b2Map.set(ch.processNo, items);
    }

    // B3 gap-fill
    for (const ch of chains) {
      if (!ch.processChar?.trim() || !ch.processNo) continue;
      const m4 = ch.m4 || 'MC';
      const we = ch.workElement || '';
      const key = `${ch.processNo}|${m4}|${we}|${ch.processChar.trim()}`;
      if (seen.b3.has(key)) continue;
      seen.b3.add(key);
      const items = b3Map.get(ch.processNo) || [];
      items.push({ m4, we, char: ch.processChar.trim(), sc: ch.specialChar || '' });
      b3Map.set(ch.processNo, items);
    }

    // B4 gap-fill
    for (const ch of chains) {
      if (!ch.fcValue?.trim() || !ch.processNo) continue;
      const m4 = ch.m4 || 'MC';
      const we = ch.workElement || '';
      const fm = ch.fmValue?.trim() || '';
      const key = `${ch.processNo}|${m4}|${we}|${fm}|${ch.fcValue.trim()}`;
      if (seen.b4.has(key)) continue;
      seen.b4.add(key);
      const items = b4Map.get(ch.processNo) || [];
      items.push({ m4, we, fc: ch.fcValue.trim(), fm });
      b4Map.set(ch.processNo, items);
    }

    // A6 gap-fill (FC체인 dcValue — 전용시트 미커버 공정만)
    for (const ch of chains) {
      if (!ch.dcValue?.trim() || !ch.processNo) continue;
      if (a6Map.has(ch.processNo)) continue; // 전용시트 A6 있으면 skip
      const key = `${ch.processNo}|${ch.dcValue.trim()}`;
      if (seen.a6.has(key)) continue;
      seen.a6.add(key);
      const items = a6Map.get(ch.processNo) || [];
      items.push(ch.dcValue.trim());
      a6Map.set(ch.processNo, items);
    }

    // B5 gap-fill (FC체인 pcValue — 전용시트 미커버 공정만)
    for (const ch of chains) {
      if (!ch.pcValue?.trim() || !ch.processNo) continue;
      if (b5Map.has(ch.processNo)) continue; // 전용시트 B5 있으면 skip
      const m4 = ch.m4 || 'MC';
      const key = `${ch.processNo}|${m4}|${ch.pcValue.trim()}`;
      if (seen.b5.has(key)) continue;
      seen.b5.add(key);
      const items = b5Map.get(ch.processNo) || [];
      items.push({ m4, pc: ch.pcValue.trim() });
      b5Map.set(ch.processNo, items);
    }
  }

  // Build fcChains from result.failureChains (MasterFailureChain[])
  const fcChains = convertChainsToStepBFCChain(chains);

  return {
    procMaster,
    c1: [...c1Set],
    c2: c2Map,
    c3: c3Map,
    c4: c4Items,
    a3: a3Map,
    a4: a4Map,
    a5: a5Map,
    a5ParentA4,
    a6: a6Map,
    b1: b1Map,
    b2: b2Map,
    b3: b3Map,
    b4: b4Map,
    b5: b5Map,
    fcChains,
  };
}

/**
 * MasterFailureChain[] → StepBFCChain[] 변환
 */
function convertChainsToStepBFCChain(chains: MasterFailureChain[]): StepBFCChain[] {
  return chains.map(ch => ({
    procNo: ch.processNo || '',
    m4: ch.m4 || '',
    we: ch.workElement || '',
    fe: ch.feValue || '',
    fm: ch.fmValue || '',
    fc: ch.fcValue || '',
    pc: ch.pcValue || '',
    dc: ch.dcValue || '',
    s: ch.severity ?? ch.feSeverity ?? null,
    o: ch.occurrence ?? null,
    d: ch.detection ?? null,
    ap: ch.ap || '',
    sc: '',
    // preserve existing IDs if any
    id: ch.id,
    fmId: ch.fmId,
    feId: ch.feId,
    fcId: ch.fcId,
    fmFlatId: ch.fmFlatId,
    fcFlatId: ch.fcFlatId,
    feFlatId: ch.feFlatId,
  }));
}

/**
 * convertToImportFormat 결과의 StepBMasterChain[] → MasterFailureChain[] 변환
 *
 * handleFileSelect에서 setMasterChains에 전달하기 위해
 * import-builder 출력을 MasterFailureChain 인터페이스로 변환한다.
 */
export function convertStepBChainsToMasterChains(
  stepBChains: StepBMasterChain[],
  originalChains: MasterFailureChain[],
): MasterFailureChain[] {
  return stepBChains.map((ch, idx) => {
    // Preserve original chain metadata (excelRow, mergeSpan, isRevised, etc.)
    const orig = idx < originalChains.length ? originalChains[idx] : undefined;
    return {
      id: ch.id || orig?.id || '',
      processNo: ch.processNo,
      m4: ch.m4,
      workElement: ch.workElement || orig?.workElement,
      feValue: ch.feValue,
      feSeverity: ch.s ?? orig?.feSeverity,
      feScope: ch.feScope || orig?.feScope,
      fmValue: ch.fmValue,
      fcValue: ch.fcValue,
      pcValue: ch.pcValue,
      dcValue: ch.dcValue,
      severity: ch.s ?? orig?.severity,
      occurrence: ch.o ?? orig?.occurrence,
      detection: ch.d ?? orig?.detection,
      ap: ch.ap || orig?.ap,
      l2Function: orig?.l2Function,
      productChar: orig?.productChar,
      l3Function: ch.l3Function || orig?.l3Function,
      processChar: ch.processChar || orig?.processChar,
      specialChar: orig?.specialChar,
      // Excel metadata
      excelRow: orig?.excelRow,
      parentChainId: orig?.parentChainId,
      mergeGroupId: orig?.mergeGroupId,
      fmMergeSpan: orig?.fmMergeSpan,
      feMergeSpan: orig?.feMergeSpan,
      isRevised: orig?.isRevised,
      // Deterministic flat IDs (from convertToImportFormat)
      fmFlatId: ch.fmFlatId,
      fcFlatId: ch.fcFlatId,
      feFlatId: ch.feFlatId,
      fmId: ch.fmId,
      fcId: ch.fcId,
      feId: ch.feId,
    };
  });
}
