/**
 * @file applyOccurrenceFromPrevention.ts
 * @description 예방관리(PC) 셀 + 산업DB(KrIndustryPrevention.defaultRating) + 키워드 기준으로 발생도(O) 보정
 *
 * - Import 기본값 O=1은 「미평가」로 보고 PC 텍스트가 있으면 재산정 (ALL 탭 autoFillOccurrence와 동일 정책)
 * - 1순위: 산업DB 예방관리 method ↔ PC 줄 단위 매칭 → defaultRating
 * - 2순위: correctOccurrence + recommendOccurrence (기존 AIAG-VDA 키워드)
 */

import { correctOccurrence } from '../tabs/all/hooks/pcOccurrenceMap';
import { recommendOccurrence } from '../tabs/all/hooks/occurrenceRecommendMap';

export interface FailureLinkRef {
  fmId: string;
  fcId: string;
}

/** O=2~10이면 사용자·이전 평가로 간주하고 덮어쓰지 않음 */
export function shouldReevaluateOccurrence(o: number): boolean {
  if (!Number.isFinite(o)) return true;
  if (o <= 0) return true;
  if (o === 1) return true;
  return false;
}

function stripPreventionLines(raw: string): string[] {
  return raw
    .split('\n')
    .map(l => l.replace(/^p[: ]\s*/i, '').replace(/^(mn|mc|im|en)_\s*/i, '').trim())
    .filter(Boolean);
}

/**
 * 산업DB method 키(소문자) → 기본 O
 * PC 여러 줄 중 exact 일치 → 부분 문자열(긴 키 우선)
 */
export function lookupIndustryOccurrence(
  pcCellText: string,
  map: Map<string, number>,
): number | undefined {
  if (!map.size || !pcCellText.trim()) return undefined;
  const lines = stripPreventionLines(pcCellText);

  for (const line of lines) {
    const low = line.toLowerCase();
    if (map.has(low)) return map.get(low);
  }

  let bestO: number | undefined;
  let bestLen = 0;
  for (const line of lines) {
    const low = line.toLowerCase();
    for (const [method, o] of map.entries()) {
      if (!method || o < 1 || o > 10) continue;
      if (low.includes(method) || method.includes(low)) {
        const len = Math.min(method.length, low.length);
        if (len > bestLen) {
          bestLen = len;
          bestO = o;
        }
      }
    }
  }
  return bestO;
}

function evaluateOUncapped(pcPlain: string): number | null {
  if (!pcPlain.trim()) return null;
  const { correctedO } = correctOccurrence(pcPlain);
  if (correctedO !== null && correctedO >= 2) return correctedO; // ★ O=1 금지
  const fallback = recommendOccurrence(pcPlain);
  if (fallback >= 2) return fallback; // ★ O=1 금지
  return null;
}

/** 산업DB defaultRating(O) 우선 → 키워드 매트릭스 */
export function resolveOccurrenceForPc(
  pcPlain: string,
  industryPreventionOByMethod?: Map<string, number>,
): number | null {
  if (!pcPlain.trim()) return null;
  if (industryPreventionOByMethod && industryPreventionOByMethod.size > 0) {
    const ind = lookupIndustryOccurrence(pcPlain, industryPreventionOByMethod);
    if (ind !== undefined && ind >= 2 && ind <= 10) return ind; // ★ O=1 금지
  }
  return evaluateOUncapped(pcPlain);
}

export interface ApplyOccurrenceFromPreventionResult {
  filledCount: number;
  /** riskData에 합치면 되는 변경분만 (risk-*-O, imported-O-*) */
  updates: Record<string, string | number>;
}

/**
 * @param riskData 현재 riskData
 * @param links FM-FC 목록
 * @param industryPreventionOByMethod method 소문자 → defaultRating(1~10), 없으면 키워드만 사용
 */
export function applyOccurrenceFromPrevention(
  riskData: Record<string, string | number>,
  links: FailureLinkRef[],
  industryPreventionOByMethod?: Map<string, number>,
): ApplyOccurrenceFromPreventionResult {
  const updates: Record<string, string | number> = {};
  let filledCount = 0;

  for (const link of links) {
    if (!link.fmId || !link.fcId) continue;
    const uk = `${link.fmId}-${link.fcId}`;
    const pcKey = `prevention-${uk}`;
    const oKey = `risk-${uk}-O`;
    const rawPc = riskData[pcKey];
    if (rawPc === undefined || rawPc === null || String(rawPc).trim() === '') continue;

    const currentO = Number(riskData[oKey]);
    if (!shouldReevaluateOccurrence(currentO)) continue;

    const pcPlain = String(rawPc);
    const o = resolveOccurrenceForPc(pcPlain, industryPreventionOByMethod);

    if (o !== null && o >= 2 && o !== currentO) { // ★ O=1 금지
      updates[oKey] = o;
      updates[`imported-O-${uk}`] = 'auto';
      filledCount++;
    }
  }

  return { filledCount, updates };
}

/** API 응답 prevention[] → Map */
export function buildIndustryPreventionOMap(
  prevention: Array<{ method?: string; defaultRating?: number | null }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of prevention) {
    const m = (entry.method || '').trim().toLowerCase();
    const r = entry.defaultRating;
    if (!m || r === null || r === undefined) continue;
    if (r >= 2 && r <= 10 && !map.has(m)) map.set(m, r); // ★ O=1 금지
  }
  return map;
}
