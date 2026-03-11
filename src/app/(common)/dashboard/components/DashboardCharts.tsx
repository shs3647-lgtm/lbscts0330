/**
 * @file DashboardCharts.tsx
 * @description chart.js 기반 차트 렌더링 컴포넌트 (dynamic import 최적화용)
 * - ImprovementChart: 개선조치 현황 도넛 차트
 * - RpnParetoChart: Top 10 RPN 파레토 차트
 * chart.js 번들이 이 파일에만 포함되어 lazy-load됨
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// ===== 타입 정의 =====

export interface ImprovementDataItem {
  key: string;
  label: string;
  value: number;
  pct: number;
  color: string;
}

export interface TopRPNItem {
  id: string;
  failureMode: string;
  processName: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  ap: string;
}

// ===== 개선조치 현황 도넛 차트 =====

export function ImprovementChart({ data }: { data: ImprovementDataItem[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => `${d.label} (${d.value}건)`),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.color),
          borderWidth: 2,
          borderColor: '#fff',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 11 },
              padding: 15
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data]);

  return <canvas ref={canvasRef} />;
}

// ===== Top 10 RPN 파레토 차트 =====

export function RpnParetoChart({ topRPNItems }: { topRPNItems: TopRPNItem[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = topRPNItems.map((item, idx) => `${idx + 1}. ${item.failureMode}`);
    const rpnData = topRPNItems.map(item => item.rpn);
    const total = rpnData.reduce((a, b) => a + b, 0) || 1;
    let cum = 0;
    const cumPct = rpnData.map(v => { cum += v; return Math.round((cum / total) * 100); });

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'RPN',
            data: rpnData,
            backgroundColor: rpnData.map(v => v >= 200 ? '#ef4444' : v >= 100 ? '#f97316' : '#3b82f6'),
            borderRadius: 4,
            yAxisID: 'y',
            order: 2
          },
          {
            label: '누적률(%)',
            data: cumPct,
            type: 'line',
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#10b981',
            tension: 0.3,
            yAxisID: 'y1',
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 10, font: { size: 10 }, padding: 8 }
          }
        },
        scales: {
          x: { ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 30 } },
          y: { position: 'left', beginAtZero: true, max: rpnData.length > 0 ? Math.max(...rpnData) * 1.2 : 100, ticks: { font: { size: 9 } }, title: { display: true, text: 'RPN', font: { size: 10 } } },
          y1: { position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { font: { size: 9 } }, title: { display: true, text: '누적(%)', font: { size: 10 } } }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [topRPNItems]);

  return <canvas ref={canvasRef} />;
}
