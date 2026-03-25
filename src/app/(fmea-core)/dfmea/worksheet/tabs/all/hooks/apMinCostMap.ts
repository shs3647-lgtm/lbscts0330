/**
 * @file apMinCostMap.ts
 * @description AP 등급 L 달성 최단거리 개선 알고리즘
 *
 *   S(심각도)는 고정 — 공정 고유 특성으로 변경 불가
 *   O(발생도)와 D(검출도)만 개선 가능 (최소 O=2, D=2)
 *   Cost = |ΔO| + |ΔD| — 총 이동 점수가 최소인 경로 선택
 *
 * @created 2026-02-05
 */

import { calculateAP } from '../apCalculator';

export type ImprovePath = 'O_ONLY' | 'D_ONLY' | 'BOTH';

export interface APImproveResult {
  currentAP: 'H' | 'M' | 'L' | '';
  targetAP: 'L';
  s: number;
  currentO: number;
  currentD: number;
  targetO: number;
  targetD: number;
  deltaO: number;
  deltaD: number;
  cost: number;
  path: ImprovePath;
  reachable: boolean;
}

const MIN_O = 2;
const MIN_D = 2;

/**
 * 주어진 (S, O, D)에서 AP=L로 가는 최소 cost 경로를 계산
 * Cost = |ΔO| + |ΔD|, O와 D는 줄이기만 가능 (최소 2)
 */
export function findMinCostToL(s: number, o: number, d: number): APImproveResult {
  const currentAP = calculateAP(s, o, d);

  const base: Omit<APImproveResult, 'targetO' | 'targetD' | 'deltaO' | 'deltaD' | 'cost' | 'path' | 'reachable'> = {
    currentAP,
    targetAP: 'L',
    s,
    currentO: o,
    currentD: d,
  };

  if (currentAP === 'L' || currentAP === '') {
    return { ...base, targetO: o, targetD: d, deltaO: 0, deltaD: 0, cost: 0, path: 'BOTH', reachable: true };
  }

  let bestO = o;
  let bestD = d;
  let bestCost = Infinity;
  let bestPath: ImprovePath = 'BOTH';
  let found = false;

  for (let newO = MIN_O; newO <= o; newO++) {
    for (let newD = MIN_D; newD <= d; newD++) {
      const ap = calculateAP(s, newO, newD);
      if (ap === 'L') {
        const cost = (o - newO) + (d - newD);
        if (cost < bestCost) {
          bestCost = cost;
          bestO = newO;
          bestD = newD;
          found = true;

          if (newO === o) bestPath = 'D_ONLY';
          else if (newD === d) bestPath = 'O_ONLY';
          else bestPath = 'BOTH';
        }
      }
    }
  }

  return {
    ...base,
    targetO: bestO,
    targetD: bestD,
    deltaO: o - bestO,
    deltaD: d - bestD,
    cost: bestCost === Infinity ? -1 : bestCost,
    path: bestPath,
    reachable: found,
  };
}

/**
 * 최소 M 등급으로 가는 경로 (L 불가능 시 fallback)
 */
export function findMinCostToM(s: number, o: number, d: number): APImproveResult {
  const currentAP = calculateAP(s, o, d);

  const base: Omit<APImproveResult, 'targetO' | 'targetD' | 'deltaO' | 'deltaD' | 'cost' | 'path' | 'reachable'> = {
    currentAP,
    targetAP: 'L',
    s,
    currentO: o,
    currentD: d,
  };

  if (currentAP === 'M' || currentAP === 'L' || currentAP === '') {
    return { ...base, targetO: o, targetD: d, deltaO: 0, deltaD: 0, cost: 0, path: 'BOTH', reachable: true };
  }

  let bestO = o;
  let bestD = d;
  let bestCost = Infinity;
  let bestPath: ImprovePath = 'BOTH';
  let found = false;

  for (let newO = MIN_O; newO <= o; newO++) {
    for (let newD = MIN_D; newD <= d; newD++) {
      const ap = calculateAP(s, newO, newD);
      if (ap === 'M' || ap === 'L') {
        const cost = (o - newO) + (d - newD);
        if (cost < bestCost) {
          bestCost = cost;
          bestO = newO;
          bestD = newD;
          found = true;

          if (newO === o) bestPath = 'D_ONLY';
          else if (newD === d) bestPath = 'O_ONLY';
          else bestPath = 'BOTH';
        }
      }
    }
  }

  return {
    ...base,
    targetO: bestO,
    targetD: bestD,
    deltaO: o - bestO,
    deltaD: d - bestD,
    cost: bestCost === Infinity ? -1 : bestCost,
    path: bestPath,
    reachable: found,
  };
}

/**
 * 워크시트 전체 데이터에서 H/M 항목의 개선안 자동 적용
 * riskData의 O, D 값을 최소 cost 경로로 보정
 *
 * @param severity — 전체 FMEA의 심각도 (globalMaxSeverity)
 *   5AP에서는 모든 항목에 동일 S가 적용됨
 */
export function applyAPImprovement(
  riskData: Record<string, unknown>,
  uniqueKeys: string[],
  severity: number,
  targetLevel: 'L' | 'M' = 'L',
): { updatedData: Record<string, unknown>; stats: APImproveStats } {
  const updatedData = { ...riskData };
  const stats: APImproveStats = { total: 0, improved: 0, hToL: 0, hToM: 0, mToL: 0, unreachable: 0, details: [] };

  if (severity === 0) return { updatedData, stats };

  for (const uk of uniqueKeys) {
    const s = severity;
    const o = Number(riskData[`risk-${uk}-O`]) || 0;
    const d = Number(riskData[`risk-${uk}-D`]) || 0;

    if (o === 0 || d === 0) continue;

    const currentAP = calculateAP(s, o, d);
    if (currentAP !== 'H' && currentAP !== 'M') continue;
    if (targetLevel === 'M' && currentAP === 'M') continue;

    stats.total++;

    const result = targetLevel === 'L' ? findMinCostToL(s, o, d) : findMinCostToM(s, o, d);

    if (!result.reachable) {
      stats.unreachable++;
      stats.details.push({ uk, s, o, d, currentAP, result });
      continue;
    }

    if (result.cost === 0) continue;

    if (result.deltaO > 0) {
      updatedData[`risk-${uk}-O`] = result.targetO;
    }
    if (result.deltaD > 0) {
      updatedData[`risk-${uk}-D`] = result.targetD;
    }

    stats.improved++;
    if (currentAP === 'H' && targetLevel === 'L') stats.hToL++;
    if (currentAP === 'H' && targetLevel === 'M') stats.hToM++;
    if (currentAP === 'M') stats.mToL++;
    stats.details.push({ uk, s, o, d, currentAP, result });
  }

  return { updatedData, stats };
}

export interface APImproveStats {
  total: number;
  improved: number;
  hToL: number;
  hToM: number;
  mToL: number;
  unreachable: number;
  details: { uk: string; s: number; o: number; d: number; currentAP: string; result: APImproveResult }[];
}
