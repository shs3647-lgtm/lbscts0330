/**
 * RPNAnalysis - RPN 분석 뷰
 * 
 * RPN 통계 및 분석 정보 제공
 * @version 2.0.0 - 인라인 스타일 제거, Tailwind CSS 적용
 */

'use client';

import React, { useMemo } from 'react';

interface RPNAnalysisProps {
  state: any;
}

export default function RPNAnalysis({ state }: RPNAnalysisProps) {
  // RPN 통계 계산
  const stats = useMemo(() => {
    const rpnValues: number[] = [];
    
    // failureLinks에서 RPN 추출
    const failureLinks = (state as any).failureLinkUI?.savedLinks || [];
    failureLinks.forEach((link: any) => {
      if (link.severity && link.occurrence && link.detection) {
        rpnValues.push(link.severity * link.occurrence * link.detection);
      }
    });
    
    // L2 공정별 고장형태에서도 RPN 추출
    if (rpnValues.length === 0 && state.l2) {
      state.l2.forEach((proc: any) => {
        (proc.failureModes || []).forEach((fm: any) => {
          if (fm.severity && fm.occurrence && fm.detection) {
            rpnValues.push(fm.severity * fm.occurrence * fm.detection);
          }
        });
      });
    }
    
    if (rpnValues.length === 0) {
      return {
        count: 0,
        max: 0,
        min: 0,
        avg: 0,
        high: 0,    // RPN > 100
        medium: 0,  // 50 < RPN <= 100
        low: 0,     // RPN <= 50
      };
    }
    
    const sorted = [...rpnValues].sort((a, b) => b - a);
    
    return {
      count: rpnValues.length,
      max: sorted[0],
      min: sorted[sorted.length - 1],
      avg: Math.round(rpnValues.reduce((a, b) => a + b, 0) / rpnValues.length),
      high: rpnValues.filter(v => v > 100).length,
      medium: rpnValues.filter(v => v > 50 && v <= 100).length,
      low: rpnValues.filter(v => v <= 50).length,
    };
  }, [state]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* 헤더 */}
      <div className="bg-cyan-600 text-white py-2 px-3 text-xs font-bold shrink-0">
        📈 RPN 분석
      </div>

      {/* 통계 카드들 */}
      <div className="flex-1 overflow-auto p-3 flex flex-col gap-2.5">
        {stats.count === 0 ? (
          <div className="text-center text-gray-500 py-10 px-5 text-xs">
            <div className="text-[40px] mb-3">📈</div>
            <div className="font-semibold mb-2">분석할 RPN 데이터가 없습니다</div>
            <div className="text-[11px] text-gray-400">고장분석에서 S/O/D를 입력하세요</div>
          </div>
        ) : (
          <>
            {/* 개요 */}
            <div className="rounded-lg p-3 text-white bg-gradient-to-br from-indigo-400 to-purple-600">
              <div className="text-[10px] opacity-90 mb-1">총 RPN 분석 항목</div>
              <div className="text-2xl font-bold">{stats.count}건</div>
            </div>

            {/* 최대/최소/평균 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-red-600 rounded-md p-2.5 text-white text-center">
                <div className="text-[9px] opacity-90">최대</div>
                <div className="text-lg font-bold">{stats.max}</div>
              </div>
              <div className="bg-green-600 rounded-md p-2.5 text-white text-center">
                <div className="text-[9px] opacity-90">최소</div>
                <div className="text-lg font-bold">{stats.min}</div>
              </div>
              <div className="bg-gray-600 rounded-md p-2.5 text-white text-center">
                <div className="text-[9px] opacity-90">평균</div>
                <div className="text-lg font-bold">{stats.avg}</div>
              </div>
            </div>

            {/* 위험도 분포 */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-[11px] font-semibold mb-2.5 text-gray-800">
                위험도 분포
              </div>
              
              {/* 높음 (RPN > 100) */}
              <div className="mb-2">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-red-600 font-semibold">🔴 높음 (RPN &gt; 100)</span>
                  <span className="font-bold">{stats.high}건</span>
                </div>
                <div className="h-2 bg-gray-100 rounded overflow-hidden">
                  <div 
                    className="h-full bg-red-600 rounded transition-all duration-300"
                    style={{ width: `${(stats.high / stats.count) * 100}%` }}
                  />
                </div>
              </div>

              {/* 중간 (50 < RPN <= 100) */}
              <div className="mb-2">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-yellow-500 font-semibold">🟡 중간 (50 &lt; RPN ≤ 100)</span>
                  <span className="font-bold">{stats.medium}건</span>
                </div>
                <div className="h-2 bg-gray-100 rounded overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded transition-all duration-300"
                    style={{ width: `${(stats.medium / stats.count) * 100}%` }}
                  />
                </div>
              </div>

              {/* 낮음 (RPN <= 50) */}
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-green-600 font-semibold">🟢 낮음 (RPN ≤ 50)</span>
                  <span className="font-bold">{stats.low}건</span>
                </div>
                <div className="h-2 bg-gray-100 rounded overflow-hidden">
                  <div 
                    className="h-full bg-green-600 rounded transition-all duration-300"
                    style={{ width: `${(stats.low / stats.count) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 권장 조치 */}
            {stats.high > 0 && (
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-400">
                <div className="text-[11px] font-semibold text-yellow-700 mb-1.5">
                  ⚠️ 권장 조치
                </div>
                <div className="text-[10px] text-yellow-700">
                  높은 위험도 항목 {stats.high}건에 대해 <br/>
                  예방관리/검출관리 개선이 필요합니다.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
