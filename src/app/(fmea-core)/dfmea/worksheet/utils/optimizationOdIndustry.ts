/**
 * @file optimizationOdIndustry.ts
 * @description 6ST 최적화용 O/D 산출 — AIAG-VDA + 산업DB defaultRating, 목표 상한 4 (§12)
 *
 * 규칙:
 *   newO = min(currentO, min(candidateO, 4)), candidateO = industry defaultRating 우선, 없으면 키워드 O
 *   newD 동일 (검출도)
 *   단조: 결과는 항상 ≤ current (개선으로 악화 없음)
 */

export const OPT_OD_TARGET_CAP = 4;

function clampSod(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(1, Math.round(n)));
}

/**
 * 산업DB 기본 O + (폴백) 키워드 O로 개선 후 발생도 산출
 */
export function computeOptimizedOccurrence(
  currentO: number,
  industryDefaultO?: number | null,
  fallbackKeywordO?: number | null,
): number {
  const c = clampSod(currentO);
  const ind =
    industryDefaultO != null && industryDefaultO >= 1 && industryDefaultO <= 10
      ? Math.round(industryDefaultO)
      : null;
  const kw =
    fallbackKeywordO != null && fallbackKeywordO >= 1 && fallbackKeywordO <= 10
      ? Math.round(fallbackKeywordO)
      : null;
  const candidate = ind ?? kw;
  if (candidate === null) {
    return Math.min(c, OPT_OD_TARGET_CAP);
  }
  return Math.min(c, Math.min(candidate, OPT_OD_TARGET_CAP));
}

/**
 * 산업DB 기본 D + (폴백) 키워드 D로 개선 후 검출도 산출
 */
export function computeOptimizedDetection(
  currentD: number,
  industryDefaultD?: number | null,
  fallbackKeywordD?: number | null,
): number {
  const c = clampSod(currentD);
  const ind =
    industryDefaultD != null && industryDefaultD >= 1 && industryDefaultD <= 10
      ? Math.round(industryDefaultD)
      : null;
  const kw =
    fallbackKeywordD != null && fallbackKeywordD >= 1 && fallbackKeywordD <= 10
      ? Math.round(fallbackKeywordD)
      : null;
  const candidate = ind ?? kw;
  if (candidate === null) {
    return Math.min(c, OPT_OD_TARGET_CAP);
  }
  return Math.min(c, Math.min(candidate, OPT_OD_TARGET_CAP));
}

export interface ScoredPCIndustry {
  method: string;
  industryO: number | null;
  keywordO: number | null;
}

export interface ScoredDCIndustry {
  method: string;
  industryD: number | null;
  keywordD: number | null;
}

/**
 * AP 경로 목표 O 이하를 만족하는 산업 PC 후보 중, §12 규칙으로 가장 낮은 newO를 주는 method 선택
 */
export function findBestPcForSixStep(
  currentO: number,
  scored: ScoredPCIndustry[],
  apPathTargetO: number,
): { method: string; newO: number } | null {
  if (scored.length === 0) return null;
  const rows = scored.map(c => ({
    method: c.method,
    proposed: computeOptimizedOccurrence(currentO, c.industryO, c.keywordO),
  }));
  const feasible = rows.filter(r => r.proposed <= apPathTargetO);
  const pool = feasible.length > 0 ? feasible : rows;
  pool.sort((a, b) => a.proposed - b.proposed || a.method.localeCompare(b.method));
  const pick = pool[0];
  return { method: pick.method, newO: Math.min(pick.proposed, apPathTargetO) };
}

/**
 * AP 경로 목표 D 이하를 만족하는 산업 DC 후보 중, §12 규칙으로 가장 낮은 newD를 주는 method 선택
 */
export function findBestDcForSixStep(
  currentD: number,
  scored: ScoredDCIndustry[],
  apPathTargetD: number,
): { method: string; newD: number } | null {
  if (scored.length === 0) return null;
  const rows = scored.map(c => ({
    method: c.method,
    proposed: computeOptimizedDetection(currentD, c.industryD, c.keywordD),
  }));
  const feasible = rows.filter(r => r.proposed <= apPathTargetD);
  const pool = feasible.length > 0 ? feasible : rows;
  pool.sort((a, b) => a.proposed - b.proposed || a.method.localeCompare(b.method));
  const pick = pool[0];
  return { method: pick.method, newD: Math.min(pick.proposed, apPathTargetD) };
}
