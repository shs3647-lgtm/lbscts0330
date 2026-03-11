/**
 * @file useDashboardStats.ts
 * @description FMEA 데이터에서 대시보드 통계 계산
 */

import { useMemo, useEffect, useState } from 'react';
import { DashboardStats, TopRPNItem, APDistribution, ImprovementStatus, SODComparison } from '../types';

// AP 등급 계산 (5단계 기준)
function calculateAP(s: number, o: number, d: number): 'H' | 'M' | 'L' {
  // High: S>=9 or (S>=7 and O>=4) or (S>=5 and O>=5 and D>=5)
  if (s >= 9) return 'H';
  if (s >= 7 && o >= 4) return 'H';
  if (s >= 5 && o >= 5 && d >= 5) return 'H';
  
  // Medium: S>=6 or (S>=4 and O>=4) or (O>=5 and D>=4)
  if (s >= 6) return 'M';
  if (s >= 4 && o >= 4) return 'M';
  if (o >= 5 && d >= 4) return 'M';
  
  return 'L';
}

// RPN 계산
function calculateRPN(s: number, o: number, d: number): number {
  return s * o * d;
}

export function useDashboardStats(): DashboardStats {
  const [fmeaProjects, setFmeaProjects] = useState<any[]>([]);

  // LocalStorage에서 FMEA 프로젝트 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pfmea_projects');
      if (saved) {
        setFmeaProjects(JSON.parse(saved));
      }
    } catch (e) {
      console.error('FMEA 데이터 로드 실패:', e);
    }
  }, []);

  const stats = useMemo<DashboardStats>(() => {
    const apDist: APDistribution = { high: 0, medium: 0, low: 0, total: 0 };
    const improvement: ImprovementStatus = { completed: 0, inProgress: 0, planned: 0, delayed: 0 };
    const topRPNItems: TopRPNItem[] = [];
    let totalS = 0, totalO = 0, totalD = 0;
    let improvedS = 0, improvedO = 0, improvedD = 0;
    let itemCount = 0;
    let improvedCount = 0;

    fmeaProjects.forEach((project) => {
      const riskData = project.riskData || {};
      const l2List = project.l2 || [];

      l2List.forEach((proc: any, procIdx: number) => {
        const processName = proc.name || `공정 ${procIdx + 1}`;
        const failures = proc.failures || [];

        failures.forEach((fm: any, fmIdx: number) => {
          const failureMode = fm.name || `FM ${fmIdx + 1}`;
          
          // S, O, D 값 추출
          const sKey = `S-fe-${procIdx}-${fmIdx}`;
          const oKey = `risk-${procIdx}-O`;
          const dKey = `risk-${procIdx}-D`;
          
          const s = Number(riskData[sKey]) || Number(riskData[`S-${procIdx}`]) || 5;
          const o = Number(riskData[oKey]) || 5;
          const d = Number(riskData[dKey]) || 5;
          
          // 개선 후 값
          const sAfter = Number(riskData[`${sKey}-after`]) || s;
          const oAfter = Number(riskData[`${oKey}-after`]) || o;
          const dAfter = Number(riskData[`${dKey}-after`]) || d;

          const rpn = calculateRPN(s, o, d);
          const ap = calculateAP(s, o, d);

          // AP 분포 집계
          if (ap === 'H') apDist.high++;
          else if (ap === 'M') apDist.medium++;
          else apDist.low++;
          apDist.total++;

          // S/O/D 합계
          totalS += s;
          totalO += o;
          totalD += d;
          improvedS += sAfter;
          improvedO += oAfter;
          improvedD += dAfter;
          itemCount++;

          // 개선 완료 여부
          if (sAfter < s || oAfter < o || dAfter < d) {
            improvement.completed++;
            improvedCount++;
          } else if (riskData[`action-${procIdx}-${fmIdx}`]) {
            improvement.inProgress++;
          } else if (ap === 'H') {
            improvement.planned++;
          }

          // Top RPN 후보
          topRPNItems.push({
            id: `${project.id}-${procIdx}-${fmIdx}`,
            name: `${processName} - ${failureMode}`,
            processName,
            failureMode,
            rpn,
            severity: s,
            occurrence: o,
            detection: d,
            ap,
          });
        });
      });
    });

    // Top 10 RPN 정렬
    topRPNItems.sort((a, b) => b.rpn - a.rpn);
    const top10 = topRPNItems.slice(0, 10);

    // S/O/D 평균 계산
    const count = Math.max(itemCount, 1);
    const sodComparison: SODComparison = {
      before: {
        s: Math.round((totalS / count) * 10) / 10,
        o: Math.round((totalO / count) * 10) / 10,
        d: Math.round((totalD / count) * 10) / 10,
      },
      after: {
        s: Math.round((improvedS / count) * 10) / 10,
        o: Math.round((improvedO / count) * 10) / 10,
        d: Math.round((improvedD / count) * 10) / 10,
      },
    };

    // 개선율 계산
    const improvementRate = itemCount > 0 ? Math.round((improvedCount / itemCount) * 100) : 0;

    // 평균 RPN
    const avgRPN = top10.length > 0
      ? Math.round(top10.reduce((sum, item) => sum + item.rpn, 0) / top10.length)
      : 0;

    return {
      apDistribution: apDist,
      improvementStatus: improvement,
      topRPNItems: top10,
      sodComparison,
      totalItems: apDist.total,
      avgRPN,
      highRiskCount: apDist.high,
      improvementRate,
    };
  }, [fmeaProjects]);

  return stats;
}

// 데모 데이터 (FMEA 데이터가 없을 때)
export function getDemoStats(): DashboardStats {
  return {
    apDistribution: { high: 12, medium: 28, low: 45, total: 85 },
    improvementStatus: { completed: 18, inProgress: 8, planned: 5, delayed: 2 },
    topRPNItems: [
      { id: '1', name: '모터 과열', processName: '조립', failureMode: '과열', rpn: 280, severity: 8, occurrence: 7, detection: 5, ap: 'H' },
      { id: '2', name: '용접 불량', processName: '용접', failureMode: '크랙', rpn: 245, severity: 7, occurrence: 7, detection: 5, ap: 'H' },
      { id: '3', name: '치수 불량', processName: '가공', failureMode: '치수초과', rpn: 216, severity: 6, occurrence: 6, detection: 6, ap: 'H' },
      { id: '4', name: '표면 스크래치', processName: '도장', failureMode: '스크래치', rpn: 192, severity: 8, occurrence: 4, detection: 6, ap: 'M' },
      { id: '5', name: '누유 발생', processName: '조립', failureMode: '누유', rpn: 180, severity: 9, occurrence: 4, detection: 5, ap: 'H' },
      { id: '6', name: '체결 불량', processName: '조립', failureMode: '풀림', rpn: 168, severity: 7, occurrence: 6, detection: 4, ap: 'M' },
      { id: '7', name: '이물 혼입', processName: '검사', failureMode: '이물', rpn: 150, severity: 5, occurrence: 6, detection: 5, ap: 'M' },
      { id: '8', name: '경도 부족', processName: '열처리', failureMode: '경도미달', rpn: 140, severity: 7, occurrence: 5, detection: 4, ap: 'M' },
      { id: '9', name: '도금 벗겨짐', processName: '도금', failureMode: '박리', rpn: 126, severity: 6, occurrence: 7, detection: 3, ap: 'M' },
      { id: '10', name: '라벨 오인쇄', processName: '포장', failureMode: '오인쇄', rpn: 108, severity: 4, occurrence: 6, detection: 4.5, ap: 'L' },
    ],
    sodComparison: {
      before: { s: 6.8, o: 5.9, d: 5.2 },
      after: { s: 5.1, o: 4.2, d: 3.8 },
    },
    totalItems: 85,
    avgRPN: 180,
    highRiskCount: 12,
    improvementRate: 72,
  };
}

