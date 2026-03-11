/**
 * @file page.tsx
 * @description FMEA Dashboard - 사이드바/메뉴 포함 레이아웃
 */

'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import { useDashboardStats, getDemoStats } from './hooks/useDashboardStats';

Chart.register(...registerables);

export default function DashboardPage() {
  const liveStats = useDashboardStats();
  const stats = useMemo(() => {
    return liveStats.totalItems > 0 ? liveStats : getDemoStats();
  }, [liveStats]);

  // 차트 레퍼런스
  const rpnDistRef = useRef<HTMLCanvasElement>(null);
  const improvementRef = useRef<HTMLCanvasElement>(null);
  const paretoRef = useRef<HTMLCanvasElement>(null);
  const severityRef = useRef<HTMLCanvasElement>(null);
  const occurrenceRef = useRef<HTMLCanvasElement>(null);
  const detectionRef = useRef<HTMLCanvasElement>(null);

  const chartsRef = useRef<Chart[]>([]);

  // 개선조치 데이터
  const improvementData = useMemo(() => {
    const { completed, inProgress, planned, delayed } = stats.improvementStatus;
    const total = completed + inProgress + planned + delayed || 1;
    return [
      { label: '완료', value: completed, pct: Math.round((completed / total) * 100), color: '#22c55e' },
      { label: '진행중', value: inProgress, pct: Math.round((inProgress / total) * 100), color: '#3b82f6' },
      { label: '계획', value: planned, pct: Math.round((planned / total) * 100), color: '#facc15' },
      { label: '지연', value: delayed, pct: Math.round((delayed / total) * 100), color: '#ef4444' },
    ];
  }, [stats.improvementStatus]);

  useEffect(() => {
    chartsRef.current.forEach(c => c.destroy());
    chartsRef.current = [];

    // 1. RPN 분포
    if (rpnDistRef.current) {
      const ctx = rpnDistRef.current.getContext('2d');
      if (ctx) {
        chartsRef.current.push(new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['낮음 (1-49)', '중간 (50-99)', '높음 (100-199)', '매우높음 (200+)'],
            datasets: [{
              data: [25, 45, 20, 10],
              backgroundColor: ['#22c55e', '#3b82f6', '#f97316', '#ef4444'],
              borderRadius: 4,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, max: 50, ticks: { stepSize: 10 } },
              x: { ticks: { font: { size: 10 } } }
            }
          }
        }));
      }
    }

    // 2. 개선조치 현황 (막대 그래프 + 숫자/%)
    if (improvementRef.current) {
      const ctx = improvementRef.current.getContext('2d');
      if (ctx) {
        chartsRef.current.push(new Chart(ctx, {
          type: 'bar',
          data: {
            labels: improvementData.map(d => d.label),
            datasets: [{
              data: improvementData.map(d => d.value),
              backgroundColor: improvementData.map(d => d.color),
              borderRadius: 4,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const d = improvementData[ctx.dataIndex];
                    return `${d.value}건 (${d.pct}%)`;
                  }
                }
              }
            },
            scales: {
              y: { beginAtZero: true, ticks: { stepSize: 10 } },
              x: { ticks: { font: { size: 11 } } }
            }
          }
        }));
      }
    }

    // 3. Top 10 RPN 파레토
    if (paretoRef.current) {
      const ctx = paretoRef.current.getContext('2d');
      if (ctx) {
        const labels = ['모터 노후', '전력 부족', '센서 오류', '계획 오류', '품질 편차', '온도 관리', '시간 초과', '재료 결함', '인원 부족', '유지보수'];
        const rpnData = [210, 195, 180, 165, 150, 135, 120, 105, 90, 75];
        const total = rpnData.reduce((a, b) => a + b, 0);
        let cum = 0;
        const cumPct = rpnData.map(v => { cum += v; return Math.round((cum / total) * 100); });

        chartsRef.current.push(new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label: 'RPN', data: rpnData, backgroundColor: '#3b82f6', borderRadius: 2, yAxisID: 'y', order: 2 },
              { label: '누적율 (%)', data: cumPct, type: 'line', borderColor: '#ef4444', backgroundColor: '#ef4444', borderWidth: 2, pointRadius: 3, tension: 0.3, yAxisID: 'y1', order: 1 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', align: 'end', labels: { font: { size: 9 }, padding: 6 } } },
            scales: {
              x: { ticks: { font: { size: 8 }, maxRotation: 45 } },
              y: { position: 'left', beginAtZero: true, max: 250, title: { display: true, text: 'RPN', font: { size: 9 } } },
              y1: { position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, title: { display: true, text: '누적률(%)', font: { size: 9 } } }
            }
          }
        }));
      }
    }

    // 4-6. S/O/D 개선 전후
    const sodConfigs = [
      { ref: severityRef, data: [stats.sodComparison.before.s, stats.sodComparison.after.s], colors: ['#f97316', '#22c55e'] },
      { ref: occurrenceRef, data: [stats.sodComparison.before.o, stats.sodComparison.after.o], colors: ['#facc15', '#22c55e'] },
      { ref: detectionRef, data: [stats.sodComparison.before.d, stats.sodComparison.after.d], colors: ['#a855f7', '#22c55e'] },
    ];

    sodConfigs.forEach(({ ref, data, colors }) => {
      if (ref.current) {
        const ctx = ref.current.getContext('2d');
        if (ctx) {
          chartsRef.current.push(new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['개선 전', '개선 후'],
              datasets: [{ data, backgroundColor: colors, borderRadius: 4, barThickness: 50 }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, max: 10, ticks: { stepSize: 2 } },
                x: { ticks: { font: { size: 11, weight: 'bold' } } }
              }
            }
          }));
        }
      }
    });

    return () => { chartsRef.current.forEach(c => c.destroy()); };
  }, [stats, improvementData]);

  const cardStyle = "bg-white rounded-lg shadow border border-slate-200 p-3 flex flex-col";
  const titleStyle = "text-xs font-bold text-slate-700 text-center mb-1";

  return (
    <div className="min-h-full bg-[#4a6fa5] p-3">
      {/* 차트 그리드 */}
      <div className="grid grid-cols-3 grid-rows-2 gap-3" style={{ height: 'calc(100vh - 72px)' }}>
          {/* Row 1 */}
          <div className={cardStyle}>
            <div className={titleStyle}>RPN 분포</div>
            <div className="flex-1 relative min-h-0">
              <canvas ref={rpnDistRef} />
            </div>
          </div>

          <div className={cardStyle}>
            <div className={titleStyle}>개선조치 현황</div>
            <div className="flex-1 relative min-h-0">
              <canvas ref={improvementRef} />
            </div>
            {/* 하단 수치 표시 */}
            <div className="flex justify-around text-[10px] mt-1 pt-1 border-t border-slate-100">
              {improvementData.map((d, i) => (
                <div key={i} className="text-center">
                  <div className="font-bold" style={{ color: d.color }}>{d.value}건</div>
                  <div className="text-slate-500">{d.pct}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className={cardStyle}>
            <div className={titleStyle}>📊 Top 10 RPN 파레토</div>
            <div className="flex-1 relative min-h-0">
              <canvas ref={paretoRef} />
            </div>
          </div>

          {/* Row 2 */}
          <div className={cardStyle}>
            <div className={titleStyle}>Severity (개선 전후)</div>
            <div className="flex-1 relative min-h-0">
              <canvas ref={severityRef} />
            </div>
          </div>

          <div className={cardStyle}>
            <div className={titleStyle}>Occurrence (개선 전후)</div>
            <div className="flex-1 relative min-h-0">
              <canvas ref={occurrenceRef} />
            </div>
          </div>

          <div className={cardStyle}>
            <div className={titleStyle}>Detection (개선 전후)</div>
            <div className="flex-1 relative min-h-0">
              <canvas ref={detectionRef} />
            </div>
          </div>
      </div>
    </div>
  );
}
