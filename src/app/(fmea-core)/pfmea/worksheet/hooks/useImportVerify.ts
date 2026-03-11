/**
 * @file useImportVerify.ts
 * @description Import 데이터 기준 검증 훅 — Master DB flatData와 워크시트 현재 상태 비교
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { buildFailureChainsFromFlat } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';

export interface ImportCounts {
  processCount: number;
  l3Count: number;          // B1 작업요소
  l1FuncCount: number;      // C2 1L기능
  l2FuncCount: number;      // A3 2L기능
  productCharCount: number; // A4 제품특성
  l3FuncCount: number;      // B2 3L기능
  processCharCount: number; // B3 공정특성
  fmCount: number;          // A5 고장형태
  fcCount: number;          // B4 고장원인
  feCount: number;          // C4 고장영향
  dataCount: number;
  loaded: boolean;
}

export interface ImportVerifyItem {
  label: string;
  importCount: number;
  currentCount: number;
  diff: number;
  status: 'match' | 'over' | 'under' | 'unknown';
}

const EMPTY_COUNTS: ImportCounts = {
  processCount: 0,
  l3Count: 0,
  l1FuncCount: 0,
  l2FuncCount: 0,
  productCharCount: 0,
  l3FuncCount: 0,
  processCharCount: 0,
  fmCount: 0,
  fcCount: 0,
  feCount: 0,
  dataCount: 0,
  loaded: false,
};

/**
 * Master DB의 flatData에서 Import 기준 카운트를 계산
 */
/** flatItems 원본 타입 (양방향 매칭용) */
export interface FlatItem {
  processNo: string;
  category: string;
  itemCode: string;
  value: string;
  m4?: string;
}

function computeImportCounts(flatItems: FlatItem[]): ImportCounts {
  const processes = new Set<string>();
  const l3s = new Set<string>();         // B1 작업요소
  const l1Funcs = new Set<string>();     // C2 1L기능
  const l2Funcs = new Set<string>();     // A3 2L기능
  const productChars = new Set<string>();// A4 제품특성
  const l3Funcs = new Set<string>();     // B2 3L기능
  const processChars = new Set<string>();// B3 공정특성
  const fms = new Set<string>();         // A5 고장형태
  const fcs = new Set<string>();         // B4 고장원인
  const fes = new Set<string>();         // C4 고장영향
  let dataCount = 0;

  for (const item of flatItems) {
    const pno = item.processNo?.trim();
    const code = item.itemCode?.toUpperCase().trim();
    const val = item.value?.trim();
    if (!pno || !code || !val) continue;

    dataCount++;

    if (item.category !== 'C' && /^\d+$/.test(pno)) {
      processes.add(pno);
    }

    switch (code) {
      case 'B1': l3s.add(`${pno}|${val}`); break;
      case 'C2': l1Funcs.add(val); break;
      case 'A3': l2Funcs.add(`${pno}|${val}`); break;
      case 'A4': productChars.add(`${pno}|${val}`); break;
      case 'B2': l3Funcs.add(`${pno}|${val}`); break;
      case 'B3': processChars.add(`${pno}|${val}`); break;
      case 'A5': fms.add(`${pno}|${val}`); break;
      case 'B4': fcs.add(`${pno}|${val}`); break;
      case 'C4': fes.add(val); break;
    }
  }

  return {
    processCount: processes.size,
    l3Count: l3s.size,
    l1FuncCount: l1Funcs.size,
    l2FuncCount: l2Funcs.size,
    productCharCount: productChars.size,
    l3FuncCount: l3Funcs.size,
    processCharCount: processChars.size,
    fmCount: fms.size,
    fcCount: fcs.size,
    feCount: fes.size,
    dataCount,
    loaded: true,
  };
}

/**
 * Import 검증 훅 — fmeaId 기반으로 Master DB에서 flatData 로드 후 카운트 비교
 */
/** 고장사슬(chain) 간소화 타입 */
export interface ImportChain {
  id: string;
  processNo: string;
  m4?: string;
  fmValue: string;
  fcValue: string;
  feValue: string;
  feScope?: string;
  pcValue?: string;   // B5 예방관리 (FC시트)
  dcValue?: string;   // A6 검출관리 (FC시트)
}

/** ★ FC검증용 — Import 원본 핑거프린트 (589 기준 데이터) */
export interface RawChainInfo {
  totalChainRows: number;       // 589 — FC시트 원본 행수 (FM+FC 존재)
  totalFM: number;              // 107
  totalFC: number;              // 251
  totalFE: number;              // 21
  processes: Array<{
    processNo: string;
    processName: string;
    fmCount: number;
    chainRows: number;
    fcByFm: Record<string, number>;
    feByFm: Record<string, number>;
  }>;
  excelFormulas?: {
    fmCount: number;
    fcCount: number;
    feCount: number;
    chainCount: number;
    processCount: number;
    hasVerifySheet: boolean;
  };
}

/**
 * ★ 폴백: rawFingerprint 미저장 시 chains + flatItems에서 RawChainInfo 동적 생성
 */
function deriveRawChainInfo(chains: ImportChain[], flatItems: FlatItem[]): RawChainInfo {
  const procMap = new Map<string, { processName: string; fms: Set<string>; chainRows: number; fcByFm: Record<string, number>; feByFm: Record<string, number> }>();
  const allFMs = new Set<string>();
  const allFCs = new Set<string>();
  const allFEs = new Set<string>();

  // flatItems에서 공정명 매핑 (A2)
  const procNames = new Map<string, string>();
  for (const fi of flatItems) {
    if (fi.itemCode?.toUpperCase() === 'A2' && fi.processNo && fi.value) {
      procNames.set(fi.processNo, fi.value);
    }
  }

  for (const c of chains) {
    const pno = c.processNo || '';
    if (!procMap.has(pno)) {
      procMap.set(pno, { processName: procNames.get(pno) || pno, fms: new Set(), chainRows: 0, fcByFm: {}, feByFm: {} });
    }
    const p = procMap.get(pno)!;
    p.chainRows++;
    const fm = c.fmValue?.trim() || '';
    const fc = c.fcValue?.trim() || '';
    const fe = c.feValue?.trim() || '';
    if (fm) { p.fms.add(fm); allFMs.add(`${pno}|${fm}`); }
    if (fc) { allFCs.add(`${pno}|${fc}`); p.fcByFm[fm] = (p.fcByFm[fm] || 0) + 1; }
    if (fe) { allFEs.add(fe); p.feByFm[fm] = (p.feByFm[fm] || 0) + 1; }
  }

  const processes = Array.from(procMap.entries()).map(([processNo, d]) => ({
    processNo,
    processName: d.processName,
    fmCount: d.fms.size,
    chainRows: d.chainRows,
    fcByFm: d.fcByFm,
    feByFm: d.feByFm,
  }));

  return {
    totalChainRows: chains.length,
    totalFM: allFMs.size,
    totalFC: allFCs.size,
    totalFE: allFEs.size,
    processes,
  };
}

export function useImportVerify(fmeaId: string | null) {
  const [importCounts, setImportCounts] = useState<ImportCounts>(EMPTY_COUNTS);
  const [flatItems, setFlatItems] = useState<FlatItem[]>([]);
  const [chains, setChains] = useState<ImportChain[]>([]);
  const [rawChainInfo, setRawChainInfo] = useState<RawChainInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fmeaId) {
      setImportCounts(EMPTY_COUNTS);
      setFlatItems([]);
      setChains([]);
      setRawChainInfo(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`/api/pfmea/master?fmeaId=${encodeURIComponent(fmeaId)}&includeItems=true`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;

        // ★ rawFingerprint 추출 (relationData에서 — FC검증 589 기준)
        const relData = json.dataset?.relationData as Record<string, unknown> | null;
        const rfp = relData?.rawFingerprint as RawChainInfo | null;

        const items: FlatItem[] = json.dataset?.flatItems || [];
        const rawChains: ImportChain[] = (json.dataset?.failureChains || []).map((c: Record<string, unknown>) => ({
          id: (c.id as string) || '',
          processNo: (c.processNo as string) || '',
          m4: (c.m4 as string) || '',
          fmValue: (c.fmValue as string) || '',
          fcValue: (c.fcValue as string) || '',
          feValue: (c.feValue as string) || '',
          feScope: (c.feScope as string) || '',
          pcValue: (c.pcValue as string) || '',   // B5 예방관리
          dcValue: (c.dcValue as string) || '',   // A6 검출관리
        }));

        // ★ chains 폴백: DB에 failureChains 미저장 시 flatItems에서 동적 빌드
        let effectiveChains = rawChains;
        if (rawChains.length === 0 && items.length > 0) {
          try {
            const dummyCrossTab = { aRows: [] as never[], bRows: [] as never[], cRows: [] as never[], total: 0 };
            const built = buildFailureChainsFromFlat(items as never[], dummyCrossTab);
            effectiveChains = built.map(c => ({
              id: String(c.id || ''), processNo: String(c.processNo || ''),
              m4: String(c.m4 || ''), fmValue: String(c.fmValue || ''),
              fcValue: String(c.fcValue || ''), feValue: String(c.feValue || ''),
              feScope: String(c.feScope || ''),
            }));
          } catch { /* 빌드 실패 시 빈 배열 유지 */ }
        }

        if (rfp && typeof rfp.totalChainRows === 'number') {
          setRawChainInfo(rfp);
        } else if (effectiveChains.length > 0) {
          // ★ 폴백: rawFingerprint 미저장(기존 Import) — chains에서 동적 생성
          setRawChainInfo(deriveRawChainInfo(effectiveChains, items));
        } else {
          setRawChainInfo(null);
        }

        if (items.length === 0) {
          setImportCounts(EMPTY_COUNTS);
          setFlatItems([]);
          setChains(effectiveChains);
          return;
        }

        const counts = computeImportCounts(items);
        if (!cancelled) {
          setImportCounts(counts);
          setFlatItems(items);
          setChains(effectiveChains);
        }
      } catch {
        if (!cancelled) {
          setImportCounts(EMPTY_COUNTS);
          setFlatItems([]);
          setChains([]);
          setRawChainInfo(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fmeaId]);

  return { importCounts, flatItems, chains, rawChainInfo, loading };
}

/**
 * Import 카운트와 현재 워크시트 카운트를 비교하여 검증 항목 생성
 */
export function buildVerifyItems(
  importCounts: ImportCounts,
  currentCounts: {
    processCount?: number;
    productCharCount?: number;
    fmCount?: number;
    processCharCount?: number;
    fcCount?: number;
    feCount?: number;
  },
): ImportVerifyItem[] {
  const items: ImportVerifyItem[] = [];

  const add = (label: string, imp: number, cur: number | undefined) => {
    const current = cur ?? 0;
    const diff = current - imp;
    let status: ImportVerifyItem['status'] = 'unknown';
    if (imp === 0) status = 'unknown';
    else if (diff === 0) status = 'match';
    else if (diff > 0) status = 'over';
    else status = 'under';
    items.push({ label, importCount: imp, currentCount: current, diff, status });
  };

  add('공정 수', importCounts.processCount, currentCounts.processCount);
  add('제품특성', importCounts.productCharCount, currentCounts.productCharCount);
  add('FM(고장형태)', importCounts.fmCount, currentCounts.fmCount);
  add('공정특성', importCounts.processCharCount, currentCounts.processCharCount);
  add('FC(고장원인)', importCounts.fcCount, currentCounts.fcCount);

  return items;
}

export { computeImportCounts };
