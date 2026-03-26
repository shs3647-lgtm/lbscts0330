/**
 * @file useAllTabStats.ts
 * @description ALL 탭 통계 계산 hook (5AP/6AP H/M/L 통계)
 * @version 1.1.0 — 성능 최적화: Map 사전 인덱싱으로 O(n²) → O(n)
 *
 * AllTabEmpty.tsx에서 분리된 통계 계산 로직
 * - globalMaxSeverity: 전체 최대 심각도
 * - apStats: 5AP H/M/L 통계
 * - apStats6: 6AP H/M/L 통계
 */

import { useMemo } from 'react';
import { calculateAP } from '../apCalculator';
import { findMinCostToL } from './apMinCostMap';
import { ProcessedFMGroup, FailureLinkRow } from '../processFailureLinks';
import type { WorksheetState } from '../../../constants';

interface APItem {
  id: string;
  processName: string;
  failureMode: string;
  failureCause: string;
  severity: number;
  occurrence: number;
  detection: number;
  ap: 'H' | 'M' | 'L';
  fmId: string;
  fcId: string;
  globalRowIdx: number;
}

interface UseAllTabStatsProps {
  state?: WorksheetState;
  failureLinks: FailureLinkRow[];
  processedFMGroups: ProcessedFMGroup[];
}

/** SRP(SOD Reduction Path) 경로별 통계 */
export interface SrpStats {
  oOnly: number;   // O만 개선하면 L 도달
  dOnly: number;   // D만 개선하면 L 도달
  both: number;    // O&D 둘 다 개선 필요
  unreachable: number; // O=2,D=2에서도 L 미달
  total: number;   // H+M 전체
}

interface UseAllTabStatsReturn {
  globalMaxSeverity: number;
  apStats: {
    hCount: number;
    mCount: number;
    lCount: number;
    total: number;
    hItems: APItem[];
  };
  apStats6: {
    hCount: number;
    mCount: number;
    lCount: number;
    total: number;
    hItems: APItem[];
  };
  srpStats: SrpStats;
}

/**
 * ALL 탭 통계 계산 hook
 */
export function useAllTabStats({ state, failureLinks, processedFMGroups }: UseAllTabStatsProps): UseAllTabStatsReturn {

  // ★ 성능 최적화: fmId → fmGroup 인덱스 Map (O(1) 조회)
  const fmGroupIndex = useMemo(() => {
    const map = new Map<string, ProcessedFMGroup>();
    processedFMGroups.forEach(g => map.set(g.fmId, g));
    return map;
  }, [processedFMGroups]);

  // ★ 성능 최적화: fmId+fcId 조합 키 → row 인덱스 Map (O(1) 조회)
  const fcRowIndex = useMemo(() => {
    const map = new Map<string, { processName: string; failureMode: string; failureCause: string }>();
    processedFMGroups.forEach(g => {
      g.rows.forEach(r => {
        const key = `${g.fmId}-${r.fcId}`;
        map.set(key, {
          processName: g.fmProcessName || '',
          failureMode: g.fmText || '',
          failureCause: r.fcText || '',
        });
      });
    });
    return map;
  }, [processedFMGroups]);

  // ★ 성능 최적화: uniqueKey → {fmId, fcId} 파싱용 fmId prefix Set
  const fmIdSet = useMemo(() => {
    const set = new Set<string>();
    processedFMGroups.forEach(g => set.add(g.fmId));
    return set;
  }, [processedFMGroups]);

  // ★★★ 심각도를 모든 소스에서 찾기 ★★★
  const globalMaxSeverity = useMemo(() => {
    let maxS = 0;
    const riskData = state?.riskData || {};

    // 1. failureScopes에서 심각도 찾기
    (state?.l1?.failureScopes || []).forEach((fs) => {
      if (fs.severity && fs.severity > maxS) maxS = fs.severity;
    });

    // 2. riskData의 S-fe-* 키에서 심각도 찾기
    Object.keys(riskData).forEach(key => {
      if (key.startsWith('S-fe-') || key.startsWith('severity-')) {
        const val = Number(riskData[key]) || 0;
        if (val > maxS) maxS = val;
      }
    });

    // 3. processedFMGroups에서 심각도 찾기
    processedFMGroups.forEach(fmGroup => {
      if (fmGroup.maxSeverity > maxS) maxS = fmGroup.maxSeverity;
    });

    return maxS;
  }, [state?.l1?.failureScopes, state?.riskData, processedFMGroups]);

  /**
   * uniqueKey → { fmId, fcId } 파싱 (최적화 버전)
   * ★ O(n) 순회 대신 fmIdSet으로 O(1) prefix 매칭
   */
  const parseUniqueKey = (uniqueKey: string): { fmId: string; fcId: string } => {
    // fmIdSet에서 prefix 매칭 (대부분 1-2회 비교로 종료)
    for (const fmId of fmIdSet) {
      if (uniqueKey.startsWith(fmId + '-')) {
        return { fmId, fcId: uniqueKey.substring(fmId.length + 1) };
      }
      if (uniqueKey === fmId) {
        return { fmId, fcId: '' };
      }
    }
    return { fmId: uniqueKey, fcId: '' };
  };

  // ★★★ 5AP H/M/L 통계 계산 ★★★
  const apStats = useMemo(() => {
    let hCount = 0, mCount = 0, lCount = 0;
    const hItems: APItem[] = [];

    const riskData = state?.riskData || {};

    // ★ 성능 최적화: 정규식 매칭을 단순 문자열 체크로 변환
    const allUniqueKeys = new Set<string>();
    const riskKeys = Object.keys(riskData);
    for (let i = 0; i < riskKeys.length; i++) {
      const key = riskKeys[i];
      if (!key.startsWith('risk-')) continue;
      // risk-{uniqueKey}-O 또는 risk-{uniqueKey}-D
      if (key.endsWith('-O') || key.endsWith('-D')) {
        const middle = key.substring(5, key.length - 2); // 'risk-' = 5, '-O' = 2
        if (middle) allUniqueKeys.add(middle);
      }
    }

    const maxSeverity = globalMaxSeverity;

    let idx = 0;
    allUniqueKeys.forEach(uniqueKey => {
      const o = Number(riskData[`risk-${uniqueKey}-O`]) || 0;
      const d = Number(riskData[`risk-${uniqueKey}-D`]) || 0;

      if (o > 0 && d > 0 && maxSeverity > 0) {
        const ap = calculateAP(maxSeverity, o, d);
        if (ap === 'H') {
          hCount++;
          const { fmId, fcId } = parseUniqueKey(uniqueKey);
          // ★ O(1) 조회 (Map 인덱스)
          const info = fcRowIndex.get(uniqueKey) || fcRowIndex.get(`${fmId}-${fcId}`);

          hItems.push({
            id: uniqueKey,
            processName: info?.processName || '',
            failureMode: info?.failureMode || '',
            failureCause: info?.failureCause || '',
            severity: maxSeverity,
            occurrence: o,
            detection: d,
            ap: 'H',
            fmId,
            fcId,
            globalRowIdx: idx,
          });
        } else if (ap === 'M') {
          mCount++;
        } else if (ap === 'L') {
          lCount++;
        }
      }
      idx++;
    });

    return { hCount, mCount, lCount, total: hCount + mCount + lCount, hItems };
  }, [state?.riskData, globalMaxSeverity, fcRowIndex, fmIdSet]);

  // ★★★ 6AP H/M/L 통계 계산 ★★★
  const apStats6 = useMemo(() => {
    let hCount = 0, mCount = 0, lCount = 0;
    const hItems: APItem[] = [];

    const riskData = state?.riskData || {};

    // ★ 성능 최적화: 정규식 매칭을 단순 문자열 체크로 변환
    const allUniqueKeys = new Set<string>();
    const riskKeys = Object.keys(riskData);
    for (let i = 0; i < riskKeys.length; i++) {
      const key = riskKeys[i];
      if (!key.startsWith('opt6-')) continue;
      if (key.endsWith('-O') || key.endsWith('-D')) {
        const middle = key.substring(5, key.length - 2);
        if (middle) allUniqueKeys.add(middle);
      }
    }

    const maxSeverity = globalMaxSeverity;

    let idx = 0;
    allUniqueKeys.forEach(uniqueKey => {
      const o = Number(riskData[`opt6-${uniqueKey}-O`]) || 0;
      const d = Number(riskData[`opt6-${uniqueKey}-D`]) || 0;

      if (o > 0 && d > 0 && maxSeverity > 0) {
        const ap = calculateAP(maxSeverity, o, d);
        if (ap === 'H') {
          hCount++;
          const { fmId, fcId } = parseUniqueKey(uniqueKey);
          const info = fcRowIndex.get(uniqueKey) || fcRowIndex.get(`${fmId}-${fcId}`);

          hItems.push({
            id: uniqueKey,
            processName: info?.processName || '',
            failureMode: info?.failureMode || '',
            failureCause: info?.failureCause || '',
            severity: maxSeverity,
            occurrence: o,
            detection: d,
            ap: 'H',
            fmId,
            fcId,
            globalRowIdx: idx,
          });
        } else if (ap === 'M') {
          mCount++;
        } else if (ap === 'L') {
          lCount++;
        }
      }
      idx++;
    });

    return { hCount, mCount, lCount, total: hCount + mCount + lCount, hItems };
  }, [state?.riskData, globalMaxSeverity, fcRowIndex, fmIdSet]);

  // ★★★ SRP(SOD Reduction Path) 통계: H/M → L 최소경로 유형별 건수 ★★★
  const srpStats = useMemo<SrpStats>(() => {
    let oOnly = 0, dOnly = 0, both = 0, unreachable = 0;
    const riskData = state?.riskData || {};
    const s = globalMaxSeverity;
    if (s === 0) return { oOnly: 0, dOnly: 0, both: 0, unreachable: 0, total: 0 };

    const seen = new Set<string>();
    const riskKeys = Object.keys(riskData);
    for (const key of riskKeys) {
      if (!key.startsWith('risk-') || (!key.endsWith('-O') && !key.endsWith('-D'))) continue;
      const uk = key.substring(5, key.length - 2);
      if (!uk || seen.has(uk)) continue;
      seen.add(uk);

      const o = Number(riskData[`risk-${uk}-O`]) || 0;
      const d = Number(riskData[`risk-${uk}-D`]) || 0;
      if (o === 0 || d === 0) continue;

      const ap = calculateAP(s, o, d);
      if (ap !== 'H' && ap !== 'M') continue;

      const result = findMinCostToL(s, o, d);
      if (!result.reachable) { unreachable++; continue; }
      if (result.path === 'O_ONLY') oOnly++;
      else if (result.path === 'D_ONLY') dOnly++;
      else both++;
    }

    return { oOnly, dOnly, both, unreachable, total: oOnly + dOnly + both + unreachable };
  }, [state?.riskData, globalMaxSeverity]);

  return {
    globalMaxSeverity,
    apStats,
    apStats6,
    srpStats,
  };
}

export default useAllTabStats;
