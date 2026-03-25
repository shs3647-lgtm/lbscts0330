/**
 * @file fillPCDCFromImport.ts
 * @description PC1/DC1 자동 채움 — v3.0
 *
 * ★ v3.0 핵심 (Import 우선 + m4 친화도):
 *   - Import 항목: O/D 상한 없이 직접 사용 (사용자 실제 FMEA 데이터)
 *   - Pool 항목: O≤4 / D≤4 상한 유지 (산업DB 추천)
 *   - m4 기반 PC 매칭: FC의 m4와 B5의 m4 우선 매칭 (MN→MN, MC→MC)
 *
 * @created 2026-02-25
 * @updated 2026-02-26 v3.0 Import 우선 + m4 친화도
 */

import { correctOccurrence } from '../tabs/all/hooks/pcOccurrenceMap';
import { recommendOccurrence } from '../tabs/all/hooks/occurrenceRecommendMap';
import { recommendDetection } from '../tabs/all/hooks/detectionRatingMap';
import {
  applyOccurrenceFromPrevention,
  resolveOccurrenceForPc,
  shouldReevaluateOccurrence,
} from './applyOccurrenceFromPrevention';

const O_CAP = 4;
const D_CAP = 4;

interface MasterItem {
  id?: string;       // v5.4: 소스 구분 (-tpl-, -fc-, -infer-)
  processNo: string;
  value: string;
  m4?: string;
}

interface FailureLinkLike {
  fmId: string;
  fcId: string;
  fcText?: string;          // ★ FC↔PC 1:1 매칭용 고장원인 텍스트
  processNo: string;
  m4?: string;
}

interface FailureChainLike {
  processNo?: string;
  fcValue?: string;
  pcValue?: string;
  dcValue?: string;
}

export interface FillPCDCResult {
  pcFilledCount: number;
  dcFilledCount: number;
  oEvaluatedCount: number;
  dEvaluatedCount: number;
  noRecommendPCCount: number;
  noRecommendDCCount: number;
  updatedRiskData: Record<string, string | number>;
}

// ── Import용: cap 없이 O/D 평가 ──

function evaluateOUncapped(pcText: string): number | null {
  if (!pcText || !pcText.trim()) return null;
  const { correctedO } = correctOccurrence(pcText);
  if (correctedO !== null && correctedO > 0) return correctedO;
  const fallback = recommendOccurrence(pcText);
  if (fallback > 0) return fallback;
  return null;
}

function evaluateDUncapped(dcText: string): number | null {
  if (!dcText || !dcText.trim()) return null;
  const d = recommendDetection(dcText);
  if (d > 0) return d;
  return null;
}

// ── Pool용: cap 적용 O/D 평가 ──

function evaluateOCapped(pcText: string): number | null {
  if (!pcText || !pcText.trim()) return null;
  const { correctedO } = correctOccurrence(pcText);
  if (correctedO !== null && correctedO > 0 && correctedO <= O_CAP) return correctedO;
  return null;
}

function evaluateDCapped(dcText: string): number | null {
  if (!dcText || !dcText.trim()) return null;
  const d = recommendDetection(dcText);
  if (d > 0 && d <= D_CAP) return d;
  return null;
}

// ── Import PC 선택: m4 우선, cap 없이, 점수 없어도 첫 항목 반환 ──

function findBestImportPC(
  candidates: MasterItem[],
  targetM4: string | undefined,
  industryPreventionOByMethod: Map<string, number> | undefined,
): { item: MasterItem; o: number } | null {
  if (candidates.length === 0) return null;

  const evalO = (v: string) => resolveOccurrenceForPc(v, industryPreventionOByMethod);

  // 1차: m4 매칭 + O 점수 있는 항목
  if (targetM4) {
    const m4Matched = candidates.filter(c => c.m4 === targetM4);
    if (m4Matched.length > 0) {
      let best: { item: MasterItem; o: number } | null = null;
      for (const c of m4Matched) {
        const o = evalO(c.value);
        if (o !== null) {
          if (!best || o < best.o) best = { item: c, o };
        }
      }
      if (best) return best;
      // m4 매칭 항목은 있지만 O 점수 없음 → 첫 번째 사용
      const oFallback = evalO(m4Matched[0].value);
      return { item: m4Matched[0], o: oFallback || 0 };
    }
  }

  // 2차: processNo 매칭 (m4 무시) + O 점수 있는 항목
  let best: { item: MasterItem; o: number } | null = null;
  for (const c of candidates) {
    const o = evalO(c.value);
    if (o !== null) {
      if (!best || o < best.o) best = { item: c, o };
    }
  }
  if (best) return best;

  // 3차: O 점수 없어도 첫 번째 항목 반환 (Import 데이터이므로)
  const oFallback = evalO(candidates[0].value);
  return { item: candidates[0], o: oFallback || 0 };
}

// ── Import DC 선택: cap 없이, 점수 없어도 첫 항목 반환 ──

function findBestImportDC(
  candidates: MasterItem[],
): { item: MasterItem; d: number } | null {
  if (candidates.length === 0) return null;

  // D 점수 있는 항목 중 최선
  let best: { item: MasterItem; d: number } | null = null;
  for (const c of candidates) {
    const d = evaluateDUncapped(c.value);
    if (d !== null) {
      if (!best || d < best.d) best = { item: c, d };
    }
  }
  if (best) return best;

  // D 점수 없어도 첫 번째 항목 반환 (Import 데이터이므로)
  const dFallback = evaluateDUncapped(candidates[0].value);
  return { item: candidates[0], d: dFallback || 0 };
}

// ── Pool PC/DC 선택: cap 적용 ──

function findBestPoolPC(candidates: MasterItem[]): { item: MasterItem; o: number } | null {
  let best: { item: MasterItem; o: number } | null = null;
  for (const c of candidates) {
    const o = evaluateOCapped(c.value);
    if (o !== null) {
      if (!best || o < best.o) best = { item: c, o };
    }
  }
  return best;
}

function findBestPoolDC(candidates: MasterItem[]): { item: MasterItem; d: number } | null {
  let best: { item: MasterItem; d: number } | null = null;
  for (const c of candidates) {
    const d = evaluateDCapped(c.value);
    if (d !== null) {
      if (!best || d < best.d) best = { item: c, d };
    }
  }
  return best;
}

/**
 * Import B5/A6 + 풀(산업DB 포함)에서 최적 PC1/DC1 선택
 *
 * v3.0: Import 항목은 cap 없이 직접 사용, Pool 항목만 cap 적용
 *
 * @param riskData 현재 riskData
 * @param links FM-FC-processNo-m4 매핑 배열
 * @param b5Items 마스터 B5(설계검증 예방) 항목 (import 원본)
 * @param a6Items 마스터 A6(설계검증 검출) 항목 (import 원본)
 * @param b5Pool 전체 PC 후보 풀 (산업DB) — 없으면 import만
 * @param a6Pool 전체 DC 후보 풀 (산업DB) — 없으면 import만
 * @param failureChains Import 고장사슬 (FC↔PC 1:1 매칭용)
 * @param industryPreventionOByMethod KrIndustryPrevention.method(소문자) → defaultRating(O), 선택
 */
export function fillPCDCFromImport(
  riskData: Record<string, string | number>,
  links: FailureLinkLike[],
  b5Items: MasterItem[],
  a6Items: MasterItem[],
  b5Pool?: MasterItem[],
  a6Pool?: MasterItem[],
  failureChains?: FailureChainLike[],
  industryPreventionOByMethod?: Map<string, number>,
): FillPCDCResult {
  const updated: Record<string, string | number> = { ...riskData };
  let pcFilledCount = 0;
  let dcFilledCount = 0;
  let oEvaluatedCount = 0;
  let dEvaluatedCount = 0;
  let noRecommendPCCount = 0;
  let noRecommendDCCount = 0;

  // ★ FC↔PC/DC 1:1 직접 매칭 맵 (Import 원본)
  const fcToPcMap = new Map<string, string[]>(); // "processNo|fcValue" → pcValue[]
  const fcToDcMap = new Map<string, string>();   // "processNo|fcValue" → dcValue
  if (failureChains && failureChains.length > 0) {
    for (const ch of failureChains) {
      const fc = (ch.fcValue || '').trim();
      const pNo = (ch.processNo || '').trim();
      if (!fc) continue;
      const key = `${pNo}|${fc}`;
      // PC 매칭
      const pc = (ch.pcValue || '').trim().replace(/^P:/, '').trim();
      if (pc) {
        const list = fcToPcMap.get(key) || [];
        if (!list.includes(pc)) list.push(pc);
        fcToPcMap.set(key, list);
      }
      // DC 매칭
      const dc = (ch.dcValue || '').trim().replace(/^D:/, '').trim();
      if (dc && !fcToDcMap.has(key)) {
        fcToDcMap.set(key, dc);
      }
    }
  }

  // Import B5 → processNo 기준 그룹핑
  const b5ByProcess = new Map<string, MasterItem[]>();
  for (const item of b5Items) {
    if (!item.value || !item.processNo) continue;
    const pNo = item.processNo.trim();
    const list = b5ByProcess.get(pNo) || [];
    if (!list.some(e => e.value === item.value)) list.push(item);
    b5ByProcess.set(pNo, list);
  }

  // Import A6 → processNo 기준 그룹핑
  const a6ByProcess = new Map<string, MasterItem[]>();
  for (const item of a6Items) {
    if (!item.value || !item.processNo) continue;
    const pNo = item.processNo.trim();
    const list = a6ByProcess.get(pNo) || [];
    if (!list.some(e => e.value === item.value)) list.push(item);
    a6ByProcess.set(pNo, list);
  }

  // ★ v5.4: 전용시트(tpl) 아이템이 있는 공정 추적 — FC 1:1 매칭보다 우선
  const tplB5Processes = new Set<string>();
  const tplA6Processes = new Set<string>();
  for (const item of b5Items) {
    if (item.id?.includes('-tpl-') && item.processNo) tplB5Processes.add(item.processNo.trim());
  }
  for (const item of a6Items) {
    if (item.id?.includes('-tpl-') && item.processNo) tplA6Processes.add(item.processNo.trim());
  }

  for (const link of links) {
    if (!link.fmId || !link.fcId) continue;
    const uk = `${link.fmId}-${link.fcId}`;
    const pcKey = `prevention-${uk}`;
    const dcKey = `detection-${uk}`;
    const oKey = `risk-${uk}-O`;
    const dKey = `risk-${uk}-D`;
    const pNo = link.processNo.trim();

    // ── PC1 선택: ★ v5.5 항목 단위 병합 (공정 단위 배타 제거) ──
    // ① FC↔PC 1:1 직접 매칭 (FC 레벨, 가장 구체적) → ② 전용시트 B5 (공정 레벨) → ③ Pool
    const existingPC = updated[pcKey];
    const existPcStr = existingPC ? String(existingPC).trim() : '';
    const fcText = (link.fcText || '').trim();
    const hasTplB5 = tplB5Processes.has(pNo);

    const isAutoPC = !existPcStr ||
      existPcStr.split('\n').every(line => {
        const t = line.trim();
        return !t || t.startsWith('P:') || t.startsWith('P ');
      });

    let pcFilled = false;

    // ① FC↔PC 1:1 직접 매칭 (FC 레벨 — 가장 구체적이므로 최우선)
    if (!pcFilled) {
      const directKey = fcText ? `${pNo}|${fcText}` : '';
      const directPcList = directKey ? fcToPcMap.get(directKey) : undefined;
      if (directPcList && directPcList.length > 0 && isAutoPC) {
        const pcValue = directPcList.map(pc => `P:${pc}`).join('\n');
        updated[pcKey] = pcValue;
        updated[`imported-prevention-${uk}`] = 'auto';
        pcFilledCount++;
        pcFilled = true;
        if (shouldReevaluateOccurrence(Number(updated[oKey]))) {
          const o = resolveOccurrenceForPc(`P:${directPcList[0]}`, industryPreventionOByMethod);
          if (o !== null && o > 0) {
            updated[oKey] = o;
            updated[`imported-O-${uk}`] = 'auto';
            oEvaluatedCount++;
          }
        }
      }
    }

    // ② 전용시트 B5 (공정 레벨 — FC 매칭 실패 시 fallback)
    if (!pcFilled && hasTplB5 && isAutoPC) {
      const importCandidates = b5ByProcess.get(pNo) || [];
      const bestImport = findBestImportPC(importCandidates, link.m4, industryPreventionOByMethod);
      if (bestImport) {
        updated[pcKey] = `P:${bestImport.item.value}`;
        updated[`imported-prevention-${uk}`] = 'auto';
        updated[`inferred-prevention-${uk}`] = 'inferred';  // ★ P-1: 추론 플래그
        pcFilledCount++;
        pcFilled = true;
        if (shouldReevaluateOccurrence(Number(updated[oKey])) && bestImport.o > 0) {
          updated[oKey] = bestImport.o;
          updated[`imported-O-${uk}`] = 'auto';
          oEvaluatedCount++;
        }
      }
    }

    // ③ Process-based fallback + Pool (빈 셀만)
    if (!pcFilled && !existPcStr) {
      const importCandidates = b5ByProcess.get(pNo) || [];
      const bestImport = findBestImportPC(importCandidates, link.m4, industryPreventionOByMethod);
      let bestPool: { item: MasterItem; o: number } | null = null;
      if (b5Pool && b5Pool.length > 0) {
        bestPool = findBestPoolPC(b5Pool);
      }
      const chosen = bestImport || bestPool;
      if (chosen && (chosen.o > 0 || bestImport)) {
        updated[pcKey] = `P:${chosen.item.value}`;
        updated[`imported-prevention-${uk}`] = 'auto';
        updated[`inferred-prevention-${uk}`] = 'inferred';  // ★ P-1: 추론 플래그
        pcFilledCount++;
        if (shouldReevaluateOccurrence(Number(updated[oKey])) && chosen.o > 0) {
          updated[oKey] = chosen.o;
          updated[`imported-O-${uk}`] = 'auto';
          oEvaluatedCount++;
        }
      } else if (importCandidates.length > 0 || (b5Pool && b5Pool.length > 0)) {
        noRecommendPCCount++;
      }
    }

    // ── DC1 선택: ★ v5.5 항목 단위 병합 (공정 단위 배타 제거) ──
    // ① FC↔DC 1:1 직접 매칭 (FC 레벨, 가장 구체적) → ② 전용시트 A6 (공정 레벨) → ③ Pool
    const existingDC = updated[dcKey];
    const existDcStr = existingDC ? String(existingDC).trim() : '';
    const hasTplA6 = tplA6Processes.has(pNo);

    const isAutoDC = !existDcStr ||
      existDcStr.split('\n').every(line => {
        const t = line.trim();
        return !t || t.startsWith('D:') || t.startsWith('D ');
      });

    let dcFilled = false;

    // ① FC↔DC 1:1 직접 매칭 (FC 레벨 — 가장 구체적이므로 최우선)
    if (!dcFilled) {
      const directKeyDC = fcText ? `${pNo}|${fcText}` : '';
      const directDc = directKeyDC ? fcToDcMap.get(directKeyDC) : undefined;
      if (directDc && isAutoDC) {
        updated[dcKey] = `D:${directDc}`;
        updated[`imported-detection-${uk}`] = 'auto';
        dcFilledCount++;
        dcFilled = true;
        const existingD = Number(updated[dKey]) || 0;
        if (existingD === 0) {
          const d = evaluateDUncapped(directDc);
          if (d !== null && d > 0) {
            updated[dKey] = d;
            updated[`imported-D-${uk}`] = 'auto';
            dEvaluatedCount++;
          }
        }
      }
    }

    // ② 전용시트 A6 (공정 레벨 — FC 매칭 실패 시 fallback)
    if (!dcFilled && hasTplA6 && isAutoDC) {
      const importCandidates = a6ByProcess.get(pNo) || [];
      const bestImport = findBestImportDC(importCandidates);
      if (bestImport) {
        updated[dcKey] = `D:${bestImport.item.value}`;
        updated[`imported-detection-${uk}`] = 'auto';
        updated[`inferred-detection-${uk}`] = 'inferred';  // ★ P-1: 추론 플래그
        dcFilledCount++;
        dcFilled = true;
        const existingD = Number(updated[dKey]) || 0;
        if (existingD === 0 && bestImport.d > 0) {
          updated[dKey] = bestImport.d;
          updated[`imported-D-${uk}`] = 'auto';
          dEvaluatedCount++;
        }
      }
    }

    // ③ Process-based fallback + Pool (빈 셀만)
    if (!dcFilled && !existDcStr) {
      const importCandidates = a6ByProcess.get(pNo) || [];
      const bestImport = findBestImportDC(importCandidates);
      let bestPool: { item: MasterItem; d: number } | null = null;
      if (a6Pool && a6Pool.length > 0) {
        bestPool = findBestPoolDC(a6Pool);
      }
      const chosen = bestImport || bestPool;
      if (chosen && (chosen.d > 0 || bestImport)) {
        updated[dcKey] = `D:${chosen.item.value}`;
        updated[`imported-detection-${uk}`] = 'auto';
        updated[`inferred-detection-${uk}`] = 'inferred';  // ★ P-1: 추론 플래그
        dcFilledCount++;
        const existingD = Number(updated[dKey]) || 0;
        if (existingD === 0 && chosen.d > 0) {
          updated[dKey] = chosen.d;
          updated[`imported-D-${uk}`] = 'auto';
          dEvaluatedCount++;
        }
      } else if (importCandidates.length > 0 || (a6Pool && a6Pool.length > 0)) {
        noRecommendDCCount++;
      }
    }
  }

  // ★ PC는 있는데 O만 Import 기본(1)인 행 — DC 매칭만 한 경우 등 전체 스캔 후 O 보정
  const linkRefs = links.filter(l => l.fmId && l.fcId).map(l => ({ fmId: l.fmId, fcId: l.fcId }));
  const oPass = applyOccurrenceFromPrevention(updated, linkRefs, industryPreventionOByMethod);
  for (const [k, v] of Object.entries(oPass.updates)) {
    updated[k] = v;
  }
  oEvaluatedCount += oPass.filledCount;

  return {
    pcFilledCount, dcFilledCount, oEvaluatedCount, dEvaluatedCount,
    noRecommendPCCount, noRecommendDCCount, updatedRiskData: updated,
  };
}
