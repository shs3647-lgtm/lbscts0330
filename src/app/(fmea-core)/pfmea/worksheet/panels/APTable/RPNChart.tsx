/**
 * RPNChart - FM별 RPN 가로 막대 그래프
 * 
 * 고장형태(FM)별 RPN 상위 10개 표시
 * RPN = S × O × D
 */

'use client';

import React, { useMemo, useState } from 'react';
import { WorksheetState } from '../../constants';
import { RIGHT_PANEL_WIDTH } from '@/styles/layout';

interface RPNChartProps {
  state: WorksheetState;
}

interface FMData {
  idx: number;
  fmText: string;
  s: number;
  o: number;
  d: number;
  rpn: number;
  ap: 'H' | 'M' | 'L';
}

/** RPN에 따른 색상 */
function getRPNColor(rpn: number): { bg: string; text: string } {
  if (rpn >= 200) return { bg: '#ef4444', text: '#fff' }; // 빨강 (High)
  if (rpn >= 100) return { bg: '#f97316', text: '#fff' }; // 주황 (Medium)
  return { bg: '#22c55e', text: '#fff' }; // 녹색 (Low)
}

/** AP 계산 */
function calculateAP(s: number, o: number, d: number): 'H' | 'M' | 'L' {
  // 간단한 AP 로직 (실제 AIAG 기준 적용 가능)
  if (s >= 9 && o >= 4) return 'H';
  if (s >= 7 && o >= 6) return 'H';
  if (s >= 5 && o >= 8) return 'H';
  if (s >= 7 || o >= 6 || d >= 7) return 'M';
  return 'L';
}

export default function RPNChart({ state }: RPNChartProps) {
  const [selectedFM, setSelectedFM] = useState<FMData | null>(null);
  
  // 현재 탭에 따라 5단계/6단계 구분
  // opt 탭이면 6단계, 그 외는 5단계
  const stage = state.tab === 'opt' ? 6 : 5;
  
  // FM별 RPN 데이터 추출
  const fmDataList = useMemo(() => {
    const items: FMData[] = [];
    const riskData = state.riskData || {};
    const failureLinks = (state as any).failureLinks || [];
    
    // failureLinks에서 FM 정보 추출
    const fmMap = new Map<string, { idx: number; fmText: string }>();
    failureLinks.forEach((link: any, idx: number) => {
      if (link.fmText && !fmMap.has(link.fmText)) {
        fmMap.set(link.fmText, { idx, fmText: link.fmText });
      }
    });
    
    if (stage === 6) {
      // 6단계: opt-{idx}-S/O/D 패턴
      const allIndices = new Set<number>();
      Object.keys(riskData).forEach(key => {
        const match = key.match(/^opt-(\d+)-(S|O|D)$/);
        if (match) allIndices.add(parseInt(match[1]));
      });
      
      allIndices.forEach(idx => {
        const s = Number(riskData[`opt-${idx}-S`]) || 0;
        const o = Number(riskData[`opt-${idx}-O`]) || 0;
        const d = Number(riskData[`opt-${idx}-D`]) || 0;
        
        if (s > 0 && o > 0 && d > 0) {
          const rpn = s * o * d;
          const ap = calculateAP(s, o, d);
          const link = failureLinks[idx];
          const fmText = link?.fmText || `FM #${idx + 1}`;
          
          items.push({ idx, fmText, s, o, d, rpn, ap });
        }
      });
    } else {
      // 5단계: risk-*-O/D + 심각도 패턴
      // ★★★ 근본 원인 수정: 모든 risk-*-O/D 패턴을 찾도록 개선 ★★★
      let maxSeverity = 0;
      
      // 1. riskData에서 S-fe-* 패턴 찾기
      Object.keys(riskData).forEach(key => {
        if (key.startsWith('S-fe-') || key.startsWith('S-fm-') || key.startsWith('S-')) {
          const val = Number(riskData[key]) || 0;
          if (val > maxSeverity) maxSeverity = val;
        }
      });
      
      // 2. l1.failureScopes에서 심각도 찾기
      (state.l1?.failureScopes || []).forEach((fs: any) => {
        const val = Number(fs.severity) || 0;
        if (val > maxSeverity) maxSeverity = val;
      });
      
      // 3. failureLinks에서 심각도 찾기
      failureLinks.forEach((link: any) => {
        const val = Number(link.feSeverity || link.severity) || 0;
        if (val > maxSeverity) maxSeverity = val;
      });
      
      // ★★★ 모든 uniqueKey 추출 (숫자 + fmId-fcId 형식 모두) ★★★
      const allUniqueKeys = new Set<string>();
      Object.keys(riskData).forEach(key => {
        // 패턴 1: risk-{숫자}-O/D (레거시)
        const numericMatch = key.match(/^risk-(\d+)-(O|D)$/);
        if (numericMatch) {
          allUniqueKeys.add(numericMatch[1]);
          return;
        }
        // 패턴 2: risk-{fmId}-{fcId}-O/D (새 형식)
        const compositeMatch = key.match(/^risk-(.+)-(O|D)$/);
        if (compositeMatch) {
          allUniqueKeys.add(compositeMatch[1]);
        }
      });
      
      let idx = 0;
      allUniqueKeys.forEach(uniqueKey => {
        const o = Number(riskData[`risk-${uniqueKey}-O`]) || 0;
        const d = Number(riskData[`risk-${uniqueKey}-D`]) || 0;
        const s = maxSeverity;
        
        if (s > 0 && o > 0 && d > 0) {
          const rpn = s * o * d;
          const ap = calculateAP(s, o, d);
          // failureLinks에서 fmText 찾기
          const link = failureLinks.find((l: any) => `${l.fmId}-${l.fcId}` === uniqueKey) || failureLinks[idx];
          const fmText = link?.fmText || `FM #${idx + 1}`;
          
          items.push({ idx: idx++, fmText, s, o, d, rpn, ap });
        }
      });
    }
    
    // RPN 높은순 정렬, 상위 10개
    return items.sort((a, b) => b.rpn - a.rpn).slice(0, 10);
  }, [state.riskData, state, stage]);
  
  // 통계
  const stats = useMemo(() => {
    const total = fmDataList.length;
    const hCount = fmDataList.filter(f => f.ap === 'H').length;
    const mCount = fmDataList.filter(f => f.ap === 'M').length;
    const lCount = fmDataList.filter(f => f.ap === 'L').length;
    const avgRPN = total > 0 ? Math.round(fmDataList.reduce((s, f) => s + f.rpn, 0) / total) : 0;
    const maxRPN = total > 0 ? Math.max(...fmDataList.map(f => f.rpn)) : 0;
    return { total, hCount, mCount, lCount, avgRPN, maxRPN };
  }, [fmDataList]);
  
  // 막대 너비 계산 (최대 RPN 기준)
  const getBarWidth = (rpn: number) => {
    if (stats.maxRPN === 0) return 0;
    return Math.round((rpn / stats.maxRPN) * 100);
  };
  
  return (
    <div className="flex flex-col h-full" style={{ width: RIGHT_PANEL_WIDTH }}>
      {/* 헤더 */}
      <div 
        className="text-white py-2 px-3 text-xs font-bold flex justify-between items-center"
        style={{ background: stage === 6 ? '#2e7d32' : '#7c3aed' }}
      >
        <span>📊 {stage}단계 RPN (상위10)</span>
        <span className="text-[10px] font-normal">
          <span className="text-red-300">H:{stats.hCount}</span>{' '}
          <span className="text-yellow-300">M:{stats.mCount}</span>{' '}
          <span className="text-green-300">L:{stats.lCount}</span>
        </span>
      </div>
      
      {/* 데이터 없음 안내 */}
      {fmDataList.length === 0 && (
        <div className="bg-yellow-50 text-yellow-700 text-[10px] p-2 text-center">
          ⚠️ RPN 데이터가 없습니다. All 탭에서 S/O/D를 입력하세요.
        </div>
      )}
      
      {/* 선택된 FM 상세 */}
      {selectedFM && (
        <div className="bg-purple-50 border-b border-purple-200 p-2">
          <div className="text-[11px] font-bold text-purple-700 mb-1">
            📋 {selectedFM.fmText}
          </div>
          <div className="flex gap-2 text-[10px]">
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">S:{selectedFM.s}</span>
            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded">O:{selectedFM.o}</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">D:{selectedFM.d}</span>
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">RPN:{selectedFM.rpn}</span>
          </div>
          <button 
            onClick={() => setSelectedFM(null)}
            className="mt-1 text-[9px] text-gray-500 hover:text-gray-700"
          >
            ✕ 닫기
          </button>
        </div>
      )}
      
      {/* 차트 영역 */}
      <div className="flex-1 overflow-auto p-2 bg-white">
        {fmDataList.map((fm, idx) => {
          const color = getRPNColor(fm.rpn);
          const barWidth = getBarWidth(fm.rpn);
          
          return (
            <div 
              key={fm.idx}
              className="mb-1.5 cursor-pointer hover:bg-gray-50 rounded p-1 transition-all"
              onClick={() => setSelectedFM(fm)}
              title={`${fm.fmText}: S=${fm.s}, O=${fm.o}, D=${fm.d}, RPN=${fm.rpn}`}
            >
              {/* FM 이름 */}
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[9px] text-gray-700 truncate max-w-[120px]">
                  {idx + 1}. {fm.fmText}
                </span>
                <div className="flex items-center gap-1">
                  <span 
                    className="text-[8px] font-bold px-1 rounded"
                    style={{ backgroundColor: color.bg, color: '#fff' }}
                  >
                    {fm.ap}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: color.bg }}>
                    {fm.rpn}
                  </span>
                </div>
              </div>
              {/* 막대 그래프 */}
              <div className="h-3 bg-gray-100 rounded overflow-hidden relative">
                <div 
                  className="h-full rounded transition-all duration-300 flex items-center justify-end pr-1"
                  style={{ 
                    width: `${barWidth}%`,
                    backgroundColor: color.bg,
                  }}
                >
                  {barWidth > 30 && (
                    <span className="text-[8px] text-white font-semibold">
                      {fm.rpn}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* RPN 기준선 */}
        {fmDataList.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="flex justify-between text-[8px] text-gray-400 mb-1">
              <span>0</span>
              <span className="text-orange-500">100</span>
              <span className="text-red-500">200</span>
              <span>{stats.maxRPN}</span>
            </div>
            <div className="h-1 bg-gray-100 rounded relative">
              <div 
                className="absolute h-full w-0.5 bg-orange-400" 
                style={{ left: `${(100 / stats.maxRPN) * 100}%` }}
                title="M/L 경계 (RPN=100)"
              />
              <div 
                className="absolute h-full w-0.5 bg-red-400" 
                style={{ left: `${(200 / stats.maxRPN) * 100}%` }}
                title="H/M 경계 (RPN=200)"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* 통계 */}
      <div className="bg-gray-100 p-2 text-[10px] flex justify-between items-center border-t">
        <span>총 {stats.total}개</span>
        <div className="flex gap-2">
          <span className="text-red-600">H:{stats.hCount}</span>
          <span className="text-orange-600">M:{stats.mCount}</span>
          <span className="text-green-600">L:{stats.lCount}</span>
        </div>
      </div>
    </div>
  );
}

