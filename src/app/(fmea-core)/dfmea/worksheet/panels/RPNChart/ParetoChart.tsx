/**
 * ParetoChart - 10 RPN 파레토 차트
 * 
 * RPN(Risk Priority Number) 상위 10개 항목을 파레토 차트로 표시
 * Chart.js + react-chartjs-2 사용
 */

'use client';

import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface RPNItem {
  id: string;
  processName: string;
  workElement: string;
  failureMode: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
}

interface ParetoChartProps {
  state: any;
}

export default function ParetoChart({ state }: ParetoChartProps) {
  // ★★★ 차트 모드 토글: 'pareto' | 'bar' ★★★
  const [chartMode, setChartMode] = useState<'pareto' | 'bar'>('pareto');

  // ★★★ 데이터 범위 선택: 'top10' | 'all' | 'top20p' ★★★
  const [dataRange, setDataRange] = useState<'top10' | 'all' | 'top20p'>('top10');

  // ★★★ 도움말 팝오버 토글 ★★★
  const [showHelp, setShowHelp] = useState(false);
  
  // state에서 전체 RPN 데이터 추출
  const allRpnData = useMemo(() => {
    const items: RPNItem[] = [];
    const riskData = state?.riskData || {};
    
    // ★★★ 1. riskData에서 RPN 추출 (가장 정확한 소스) ★★★
    // 모든 risk-*-O, risk-*-D 키에서 고유 ID 추출
    const allUniqueKeys = new Set<string>();
    Object.keys(riskData).forEach(key => {
      const match = key.match(/^risk-(.+)-(O|D)$/);
      if (match) {
        allUniqueKeys.add(match[1]);
      }
    });
    
    // 심각도 계산 (failureScopes 또는 failureLinks에서)
    let maxSeverity = 0;
    (state?.l1?.failureScopes || []).forEach((fs: any) => {
      if (fs.severity && fs.severity > maxSeverity) maxSeverity = fs.severity;
    });
    Object.keys(riskData).forEach(key => {
      if (key.startsWith('S-fe-') || key.startsWith('severity-')) {
        const val = Number(riskData[key]) || 0;
        if (val > maxSeverity) maxSeverity = val;
      }
    });
    
    // 고장연결 데이터 (ALL 화면 기준) - failureLinks 우선
    const savedLinks = state?.failureLinks || state?.failureLinkUI?.savedLinks || [];
    const linkByKey = new Map<string, { processName: string; failureMode: string; workElement: string; severity: number }>();
    savedLinks.forEach((link: any) => {
      const key = `${link.fmId}-${link.fcId}`;
      const processName = link.fmProcess || link.fmProcessName || link.processName || link.l2Name || '';
      const failureMode = link.fmText || '';
      const workElement = link.fcWorkElem || link.workElement || link.fcWe || '';
      const severity = Number(link.feSeverity || link.severity || 0) || 0;
      const existing = linkByKey.get(key);
      if (!existing || severity > existing.severity) {
        linkByKey.set(key, { processName, failureMode, workElement, severity });
      }
    });
    
    allUniqueKeys.forEach(uniqueKey => {
      const o = Number(riskData[`risk-${uniqueKey}-O`]) || 0;
      const d = Number(riskData[`risk-${uniqueKey}-D`]) || 0;
      const s = maxSeverity;
      
      if (s > 0 && o > 0 && d > 0) {
        const rpn = s * o * d;
        
        // uniqueKey에서 FM/FC 정보 매칭
        let processName = '';
        let failureMode = '';
        let workElement = '';
        let linkSeverity = 0;
        
        const linkInfo = linkByKey.get(uniqueKey);
        if (linkInfo) {
          processName = linkInfo.processName;
          failureMode = linkInfo.failureMode;
          workElement = linkInfo.workElement;
          linkSeverity = linkInfo.severity;
        }
        
        items.push({
          id: uniqueKey,
          processName,
          workElement,
          failureMode: failureMode || `항목 ${items.length + 1}`,
          severity: linkSeverity || s,
          occurrence: o,
          detection: d,
          rpn,
        });
      }
    });
    
    // ★★★ 2. failureLinks에서 RPN 추출 (백업) ★★★
    if (items.length === 0) {
      savedLinks.forEach((link: any) => {
        const s = link.severity || link.feSeverity || maxSeverity;
        const o = link.occurrence || 0;
        const d = link.detection || 0;
        
        if (s > 0 && o > 0 && d > 0) {
          const rpn = s * o * d;
          items.push({
            id: link.id || `${link.fmId}-${link.fcId}`,
            processName: link.processName || link.l2Name || '',
            workElement: link.workElement || link.fcWe || '',
            failureMode: link.fmText || '',
            severity: s,
            occurrence: o,
            detection: d,
            rpn,
          });
        }
      });
    }
    
    // ★★★ 3. L2 failureModes에서 추출 (레거시 백업) ★★★
    if (items.length === 0 && state.l2) {
      state.l2.forEach((proc: any) => {
        const failureModes = proc.failureModes || [];
        failureModes.forEach((fm: any) => {
          if (fm.severity && fm.occurrence && fm.detection) {
            const rpn = fm.severity * fm.occurrence * fm.detection;
            items.push({
              id: fm.id,
              processName: `${proc.no}. ${proc.name}`,
              workElement: '',
              failureMode: fm.name,
              severity: fm.severity,
              occurrence: fm.occurrence,
              detection: fm.detection,
              rpn,
            });
          }
        });
      });
    }
    
    
    // RPN 기준 내림차순 정렬 (전체 반환)
    return items.sort((a, b) => b.rpn - a.rpn);
  }, [state]);

  // ★★★ dataRange에 따라 필터링된 RPN 데이터 ★★★
  const rpnData = useMemo(() => {
    if (dataRange === 'all') {
      return allRpnData;
    } else if (dataRange === 'top20p') {
      const top20Count = Math.max(1, Math.ceil(allRpnData.length * 0.2));
      return allRpnData.slice(0, top20Count);
    } else {
      // top10
      return allRpnData.slice(0, 10);
    }
  }, [allRpnData, dataRange]);

  // 누적 백분율 계산
  const cumulativePercentage = useMemo(() => {
    const totalRPN = rpnData.reduce((sum, item) => sum + item.rpn, 0);
    if (totalRPN === 0) return [];
    
    let cumulative = 0;
    return rpnData.map(item => {
      cumulative += item.rpn;
      return (cumulative / totalRPN) * 100;
    });
  }, [rpnData]);

  // 차트 데이터 (chartMode에 따라 파레토 or 막대만)
  const chartData = useMemo(() => {
    const barDataset = {
      type: 'bar' as const,
      label: 'RPN',
      data: rpnData.map(item => item.rpn),
      backgroundColor: rpnData.map((_, idx) => {
        if (idx < 3) return 'rgba(220, 53, 69, 0.8)';
        if (idx < 6) return 'rgba(255, 193, 7, 0.8)';
        return 'rgba(40, 167, 69, 0.8)';
      }),
      borderColor: rpnData.map((_, idx) => {
        if (idx < 3) return '#dc3545';
        if (idx < 6) return '#ffc107';
        return '#28a745';
      }),
      borderWidth: 1,
      yAxisID: 'y',
    };
    
    const lineDataset = {
      type: 'line' as const,
      label: '누적 %',
      data: cumulativePercentage,
      borderColor: '#6c757d',
      backgroundColor: 'rgba(108, 117, 125, 0.1)',
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: '#6c757d',
      yAxisID: 'y1',
      tension: 0.3,
    };
    
    return {
      labels: rpnData.map((item, idx) => chartMode === 'bar' ? (item.failureMode || `#${idx + 1}`) : `#${idx + 1}`),
      datasets: chartMode === 'pareto' ? [barDataset, lineDataset] : [barDataset],
    };
  }, [rpnData, cumulativePercentage, chartMode]);

  // 차트 옵션 (chartMode에 따라 y1 축 표시/숨김)
  const chartOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: chartMode === 'bar' ? 'y' as const : 'x' as const, // bar 모드: 가로 막대
      plugins: {
        legend: {
          display: chartMode === 'pareto',
          position: 'top' as const,
          labels: {
            font: { size: 10 },
            padding: 8,
          },
        },
        title: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const idx = context.dataIndex;
              const item = rpnData[idx];
              if (!item) return '';
              if (context.dataset.label === 'RPN') {
                return `RPN: ${item.rpn} (S:${item.severity} × O:${item.occurrence} × D:${item.detection})`;
              }
              return `누적: ${cumulativePercentage[idx]?.toFixed(1)}%`;
            },
            afterLabel: (context: any) => {
              const idx = context.dataIndex;
              const item = rpnData[idx];
              if (!item || context.dataset.label !== 'RPN') return '';
              return [
                `공정: ${item.processName}`,
                `FM: ${item.failureMode}`,
              ];
            },
          },
        },
      },
      scales: chartMode === 'pareto' ? {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 } },
        },
        y: {
          type: 'linear' as const,
          position: 'left' as const,
          title: { display: true, text: 'RPN', font: { size: 10 } },
          ticks: { font: { size: 9 } },
          min: 0,
        },
        y1: {
          type: 'linear' as const,
          position: 'right' as const,
          title: { display: true, text: '누적 %', font: { size: 10 } },
          ticks: { font: { size: 9 }, callback: (value: number | string) => `${value}%` },
          min: 0,
          max: 100,
          grid: { drawOnChartArea: false },
        },
      } : {
        x: {
          type: 'linear' as const,
          position: 'bottom' as const,
          title: { display: true, text: 'RPN', font: { size: 10 } },
          ticks: { font: { size: 9 } },
          min: 0,
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 9 } },
        },
      },
    };
    return baseOptions;
  }, [chartMode, rpnData, cumulativePercentage]);

  // 데이터가 없을 때
  if (rpnData.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        background: '#f8fafc' 
      }}>
        <div style={{ 
          background: '#6c757d', 
          color: 'white', 
          padding: '8px 12px', 
          fontSize: '12px', 
          fontWeight: 700,
          flexShrink: 0 
        }}>
          📊 TOP 10 RPN 파레토(Pareto)
        </div>
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '20px',
          color: '#888',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          <div className="text-[40px] mb-3">📊</div>
          <div className="font-semibold mb-2">RPN 데이터가 없습니다</div>
          <div className="text-[11px] text-[#aaa]">
            고장분석에서 심각도(S), 발생도(O), 검출도(D)를<br/>
            입력하면 RPN 차트가 표시됩니다.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: '#f8fafc' 
    }}>
      {/* 헤더 */}
      <div className="bg-gray-600 text-white py-1 px-2 text-[10px] font-bold shrink-0" style={{ paddingRight: '24px', position: 'relative' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <span className="text-[10px]">📊 RPN {chartMode === 'pareto' ? '파레토' : '막대'}</span>
            <button
              onClick={() => setShowHelp(prev => !prev)}
              className="rounded-full text-[9px] font-bold leading-[14px] shrink-0"
              style={{
                width: 14, height: 14,
                background: showHelp ? '#fff' : 'rgba(255,255,255,0.25)',
                color: showHelp ? '#4b5563' : '#fff',
                border: 'none', cursor: 'pointer', textAlign: 'center',
              }}
              title="도움말"
            >?</button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-normal">{rpnData.length}/{allRpnData.length}건</span>
            <button
              onClick={() => setChartMode(prev => prev === 'pareto' ? 'bar' : 'pareto')}
              className="px-1.5 py-0 rounded text-[9px] font-semibold leading-[16px]"
              style={{ background: chartMode === 'pareto' ? '#4f46e5' : '#059669', color: '#fff' }}
            >
              {chartMode === 'pareto' ? '막대' : '파레토'}
            </button>
          </div>
        </div>
        {/* 데이터 범위 선택 버튼 */}
        <div className="flex gap-1 mt-1">
          {(['top10', 'top20p', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDataRange(range)}
              className="px-1.5 py-0 rounded text-[9px] font-semibold transition-colors leading-[16px]"
              style={{
                background: dataRange === range ? '#1e40af' : 'rgba(255,255,255,0.2)',
                color: '#fff',
              }}
            >
              {range === 'top10' ? 'TOP10' : range === 'top20p' ? 'TOP20%' : 'ALL'}
            </button>
          ))}
        </div>
        {/* 도움말 팝오버 */}
        {showHelp && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#1e293b', color: '#e2e8f0', fontSize: 10, lineHeight: 1.6,
              padding: '8px 10px', borderRadius: '0 0 6px 6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 11, color: '#fff' }}>RPN 파레토 차트 도움말</div>
            <div><b>RPN</b> = S(심각도) x O(발생도) x D(검출도)</div>
            <div style={{ marginTop: 3 }}>
              <span style={{ color: '#f87171' }}>■</span> 빨강: 상위 1~3위 (최우선 개선)&nbsp;
              <span style={{ color: '#facc15' }}>■</span> 노랑: 4~6위&nbsp;
              <span style={{ color: '#4ade80' }}>■</span> 초록: 7위 이하
            </div>
            <div style={{ marginTop: 3 }}>
              <b>파레토</b>: 막대(RPN) + 누적% 꺾은선 | <b>막대</b>: 가로 막대 비교
            </div>
            <div style={{ marginTop: 3 }}>
              <b>TOP10</b>: 상위 10개 | <b>TOP20%</b>: 상위 20% | <b>ALL</b>: 전체
            </div>
            <div style={{ marginTop: 3, color: '#94a3b8', fontSize: 9 }}>
              막대 위에 마우스를 올리면 S/O/D 상세값과 공정/FM 정보를 확인할 수 있습니다.
            </div>
          </div>
        )}
      </div>

      {/* 차트 영역 */}
      <div className="flex-1 p-2 min-h-[200px]">
        <Chart type="bar" data={chartData as any} options={chartOptions as any} />
      </div>

      {/* 상세 목록 */}
      <div className="shrink-0 max-h-[150px] overflow-auto border-t border-gray-300 bg-white">
        <table className="w-full border-collapse text-[9px]">
          <thead className="sticky top-0 bg-gray-100">
            <tr>
              <th className="p-1 border-b border-gray-300 text-center">#</th>
              <th className="p-1 border-b border-gray-300 text-left" title="Failure Mode">고장형태(FM)</th>
              <th className="p-1 border-b border-gray-300 text-center">S</th>
              <th className="p-1 border-b border-gray-300 text-center">O</th>
              <th className="p-1 border-b border-gray-300 text-center">D</th>
              <th className="p-1 border-b border-gray-300 text-center font-bold">RPN</th>
            </tr>
          </thead>
          <tbody>
            {rpnData.map((item, idx) => (
              <tr key={item.id} className={idx < 3 ? 'bg-red-50' : idx < 6 ? 'bg-yellow-50' : 'bg-green-50'}>
                <td className="py-0.5 px-1 border-b border-gray-200 text-center font-semibold">{idx + 1}</td>
                <td className="py-0.5 px-1 border-b border-gray-200 max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{item.failureMode || '-'}</td>
                <td className="py-0.5 px-1 border-b border-gray-200 text-center">{item.severity}</td>
                <td className="py-0.5 px-1 border-b border-gray-200 text-center">{item.occurrence}</td>
                <td className="py-0.5 px-1 border-b border-gray-200 text-center">{item.detection}</td>
                <td className={`py-0.5 px-1 border-b border-gray-200 text-center font-bold ${idx < 3 ? 'text-red-600' : idx < 6 ? 'text-yellow-700' : 'text-green-700'}`}>
                  {item.rpn}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
