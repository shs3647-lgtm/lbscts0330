'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler, ChartDataLabels);

interface TopRPNViewProps {
  visible: boolean;
}

// FMEA 워크시트 컬럼 인덱스 매핑
const FMEA_COL = {
  B_processName: 1,    // 공정명
  F_category: 5,       // 구분
  G_failureMode: 6,    // 고장형태
  H_failureEffect: 7,  // 고장영향
  I_severity: 8,       // 심각도 (개선 전)
  L_failureCause: 11,  // 고장원인
  M_prevention: 12,    // 예방관리
  N_occurrence: 13,    // 발생도 (개선 전)
  O_detection: 14,     // 검출관리
  P_detValue: 15,      // 검출도 값 (개선 전)
  Q_rpn: 16,           // RPN (개선 전)
  R_preventionImprove: 17, // 예방관리개선
  S_detectionImprove: 18,  // 검출관리개선
  X_sevAfter: 23,      // 심각도 (개선 후)
  Y_occAfter: 24,      // 발생도 (개선 후)
  Z_detAfter: 25,      // 검출도 (개선 후)
  AA_rpnAfter: 26,     // RPN (개선 후)
};

interface FMEARowData {
  processName: string;
  category: string;
  failureMode: string;
  failureEffect: string;
  severity: number;
  failureCause: string;
  prevention: string;
  occurrence: number;
  detectionControl: string;
  detection: number;
  rpn: number;
  preventionImprove: string;
  detectionImprove: string;
  severityAfter: number;
  occurrenceAfter: number;
  detectionAfter: number;
  rpnAfter: number;
  status: string;
}

export default function TopRPNView({ visible }: TopRPNViewProps) {
  const chartRefs = {
    rpn: useRef<HTMLCanvasElement>(null),
    improvement: useRef<HTMLCanvasElement>(null),
    trend: useRef<HTMLCanvasElement>(null),
    severity: useRef<HTMLCanvasElement>(null),
    occurrence: useRef<HTMLCanvasElement>(null),
    detection: useRef<HTMLCanvasElement>(null),
  };

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [libsLoaded, setLibsLoaded] = useState(false);
  const [fmeaData, setFmeaData] = useState<FMEARowData[]>([]);
  const [dataSource, setDataSource] = useState<'fmea' | 'improvement' | 'demo'>('fmea');

  // FMEA 워크시트에서 데이터 추출
  const extractFMEAData = useCallback((): FMEARowData[] => {
    try {
      const stored = localStorage.getItem('fmea_worksheet_data');
      if (!stored) return [];
      
      const rawData = JSON.parse(stored);
      if (!Array.isArray(rawData)) return [];

      return rawData
        .filter((row: any[]) => row && row[FMEA_COL.B_processName]) // 공정명이 있는 행만
        .map((row: any[]) => ({
          processName: row[FMEA_COL.B_processName] || '',
          category: row[FMEA_COL.F_category] || '',
          failureMode: row[FMEA_COL.G_failureMode] || '',
          failureEffect: row[FMEA_COL.H_failureEffect] || '',
          severity: Number(row[FMEA_COL.I_severity]) || 0,
          failureCause: row[FMEA_COL.L_failureCause] || '',
          prevention: row[FMEA_COL.M_prevention] || '',
          occurrence: Number(row[FMEA_COL.N_occurrence]) || 0,
          detectionControl: row[FMEA_COL.O_detection] || '',
          detection: Number(row[FMEA_COL.P_detValue]) || 0,
          rpn: Number(row[FMEA_COL.Q_rpn]) || 0,
          preventionImprove: row[FMEA_COL.R_preventionImprove] || '',
          detectionImprove: row[FMEA_COL.S_detectionImprove] || '',
          severityAfter: Number(row[FMEA_COL.X_sevAfter]) || 0,
          occurrenceAfter: Number(row[FMEA_COL.Y_occAfter]) || 0,
          detectionAfter: Number(row[FMEA_COL.Z_detAfter]) || 0,
          rpnAfter: Number(row[FMEA_COL.AA_rpnAfter]) || 0,
          status: row[FMEA_COL.AA_rpnAfter] ? '완료' : '진행중',
        }));
    } catch (e) {
      console.error('FMEA 데이터 추출 실패:', e);
      return [];
    }
  }, []);

  // 개선결과 시트에서 데이터 추출
  const extractImprovementData = useCallback((): FMEARowData[] => {
    try {
      const stored = localStorage.getItem('improvement_results_data');
      if (!stored) return [];
      
      const rawData = JSON.parse(stored);
      if (!Array.isArray(rawData)) return [];

      return rawData
        .filter((row: any[]) => row && (row[0] || row[1])) // 공정 또는 고장형태가 있는 행만
        .map((row: any[]) => ({
          processName: row[0] || '',
          category: '',
          failureMode: row[1] || '',
          failureEffect: '',
          severity: 0,
          failureCause: '',
          prevention: '',
          occurrence: 0,
          detectionControl: '',
          detection: 0,
          rpn: Number(row[2]) || 0, // 개선 전 RPN
          preventionImprove: '',
          detectionImprove: row[6] || '', // 개선내용
          severityAfter: 0,
          occurrenceAfter: 0,
          detectionAfter: 0,
          rpnAfter: Number(row[3]) || 0, // 개선 후 RPN
          status: row[7] || '진행중',
        }));
    } catch (e) {
      console.error('개선결과 데이터 추출 실패:', e);
      return [];
    }
  }, []);

  // 샘플 데이터 생성
  const generateDemoData = useCallback((): FMEARowData[] => {
    const failureModes = [
      { process: '프레스', mode: '금형 파손', effect: '외관불량' },
      { process: '용접', mode: '용접 불량', effect: '강도 저하' },
      { process: '도장', mode: '도막 불량', effect: '내식성 저하' },
      { process: '조립', mode: '조립 불량', effect: '기능 저하' },
      { process: '검사', mode: '검사 누락', effect: '불량 유출' },
      { process: '가공', mode: '치수 불량', effect: '조립 불가' },
      { process: '열처리', mode: '경도 미달', effect: '내구성 저하' },
      { process: '세척', mode: '이물질 잔류', effect: '품질 불량' },
      { process: '포장', mode: '포장 파손', effect: '운송 불량' },
      { process: '출하', mode: '라벨 오류', effect: '배송 오류' },
      { process: '입고', mode: '검수 누락', effect: '불량 입고' },
      { process: '보관', mode: '보관 불량', effect: '품질 저하' },
      { process: '이송', mode: '이송 손상', effect: '제품 파손' },
      { process: '성형', mode: '성형 불량', effect: '형상 불량' },
      { process: '절단', mode: '절단 오차', effect: '치수 불량' },
    ];
    
    return failureModes.map((item) => {
      const severity = Math.floor(Math.random() * 4) + 6; // 6-9
      const occurrence = Math.floor(Math.random() * 5) + 4; // 4-8
      const detection = Math.floor(Math.random() * 5) + 4; // 4-8
      const rpn = severity * occurrence * detection;
      
      const severityAfter = Math.max(1, severity - Math.floor(Math.random() * 2));
      const occurrenceAfter = Math.max(1, occurrence - Math.floor(Math.random() * 3) - 1);
      const detectionAfter = Math.max(1, detection - Math.floor(Math.random() * 3) - 1);
      const rpnAfter = severityAfter * occurrenceAfter * detectionAfter;

      return {
        processName: item.process,
        category: 'P',
        failureMode: item.mode,
        failureEffect: item.effect,
        severity,
        failureCause: '작업 실수',
        prevention: '정기 점검',
        occurrence,
        detectionControl: '검사',
        detection,
        rpn,
        preventionImprove: '개선 조치',
        detectionImprove: '자동 검사',
        severityAfter,
        occurrenceAfter,
        detectionAfter,
        rpnAfter,
        status: ['완료', '진행중', '계획'][Math.floor(Math.random() * 3)],
      };
    });
  }, []);

  // 데이터 로드
  const loadData = useCallback(() => {
    if (isDemoMode) {
      setFmeaData(generateDemoData());
      setDataSource('demo');
      return;
    }

    // 1. FMEA 워크시트 데이터 우선
    const fmea = extractFMEAData();
    if (fmea.length >= 3) {
      setFmeaData(fmea);
      setDataSource('fmea');
      return;
    }

    // 2. 개선결과 데이터 확인
    const improvement = extractImprovementData();
    if (improvement.length >= 3) {
      setFmeaData(improvement);
      setDataSource('improvement');
      return;
    }

    // 3. 데이터 없으면 데모 데이터
    setFmeaData(generateDemoData());
    setDataSource('demo');
  }, [isDemoMode, extractFMEAData, extractImprovementData, generateDemoData]);

  // Chart.js — npm 패키지로 로드 완료 (CDN 제거)
  useEffect(() => {
    setLibsLoaded(true);
  }, []);

  // 데이터 로드 및 차트 렌더링
  useEffect(() => {
    if (!visible || !libsLoaded) return;
    loadData();
  }, [visible, libsLoaded, isDemoMode, loadData]);

  // 차트 렌더링
  useEffect(() => {
    if (!visible || !libsLoaded || fmeaData.length === 0) return;
    initCharts();
    
    return () => {
      Object.values(chartRefs).forEach(ref => {
        if (ref.current) {
          const chart = ChartJS?.getChart(ref.current);
          if (chart) chart.destroy();
        }
      });
    };
  }, [visible, libsLoaded, fmeaData]);

  const initCharts = () => {
    if (fmeaData.length === 0) return;

    // 기존 차트 파괴
    Object.values(chartRefs).forEach(ref => {
      if (ref.current) {
        const chart = ChartJS.getChart(ref.current);
        if (chart) chart.destroy();
      }
    });

    const commonOptions = {
            responsive: true,
      maintainAspectRatio: false,
      plugins: {
        datalabels: {
          display: true,
          color: 'black',
          anchor: 'end' as const,
          align: 'top' as const,
          offset: -2,
          font: { weight: 'bold' as const, size: 9 },
        }
      }
    };

    // 1. 개선 전 RPN 분포 (파레토 차트)
    if (chartRefs.rpn.current) {
      // 개선 전 RPN 기준 Top 10
      const top10Before = [...fmeaData]
        .filter(item => item.rpn > 0)
        .sort((a, b) => b.rpn - a.rpn)
        .slice(0, 10);

      const totalRPNBefore = top10Before.reduce((sum, item) => sum + item.rpn, 0);
      let cumulativeBefore = 0;
      const cumulativePercentBefore = top10Before.map(item => {
        cumulativeBefore += item.rpn;
        return totalRPNBefore > 0 ? Math.round((cumulativeBefore / totalRPNBefore) * 100) : 0;
      });

      new ChartJS(chartRefs.rpn.current.getContext('2d')!, {
          type: 'bar',
          data: {
          labels: top10Before.map(item => (item.failureMode || item.processName).substring(0, 6)),
            datasets: [
              {
              type: 'bar',
              label: 'RPN(전)',
              data: top10Before.map(item => item.rpn),
              backgroundColor: 'rgba(25, 118, 210, 0.9)',  // 파란색
              borderColor: 'rgba(25, 118, 210, 1)',
              borderWidth: 1,
                yAxisID: 'y',
              datalabels: { align: 'center' as const, anchor: 'center' as const, color: 'white', font: { size: 8 } }
              },
              {
              type: 'line',
              label: '누적%',
              data: cumulativePercentBefore,
                borderColor: 'rgba(239, 68, 68, 1)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                yAxisID: 'y1',
                tension: 0.4,
              pointRadius: 2,
              datalabels: { display: false }
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
            legend: { display: true, position: 'top', labels: { font: { size: 8 }, boxWidth: 10 } },
            datalabels: {
              display: true,
              color: 'white',
              font: { size: 8, weight: 'bold' }
            }
            },
            scales: {
            x: { ticks: { font: { size: 7 } } },
            y: { type: 'linear', position: 'left', beginAtZero: true, title: { display: false } },
            y1: { type: 'linear', position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { font: { size: 7 } } }
            }
          }
        });
      }

    // 2. 개선조치 현황 차트
    if (chartRefs.improvement.current) {
      const statusCounts = { '완료': 0, '진행중': 0, '계획': 0 };
      fmeaData.forEach((item) => {
        const status = item.status || '계획';
        if (statusCounts[status as keyof typeof statusCounts] !== undefined) {
          statusCounts[status as keyof typeof statusCounts]++;
        } else {
          statusCounts['계획']++;
        }
      });

      new ChartJS(chartRefs.improvement.current.getContext('2d')!, {
          type: 'doughnut',
          data: {
          labels: ['완료', '진행중', '계획'],
            datasets: [{
            data: [statusCounts['완료'], statusCounts['진행중'], statusCounts['계획']],
              backgroundColor: [
                'rgba(34, 197, 94, 0.8)',
                'rgba(59, 130, 246, 0.8)',
              'rgba(251, 191, 36, 0.8)'
              ]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          plugins: {
            datalabels: {
              color: 'white',
              font: { weight: 'bold', size: 10 },
              formatter: (value: number, ctx: any) => {
                const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                return value > 0 ? `${value}건\n(${pct}%)` : '';
              }
            }
          }
          }
        });
      }

    // 3. 개선 후 RPN 분포 (파레토 차트)
    if (chartRefs.trend.current) {
      // 개선 후 RPN 기준 Top 10
      const top10After = [...fmeaData]
        .filter(item => (item.rpnAfter || 0) > 0)
        .sort((a, b) => (b.rpnAfter || 0) - (a.rpnAfter || 0))
        .slice(0, 10);

      const totalRPNAfter = top10After.reduce((sum, item) => sum + (item.rpnAfter || 0), 0);
      let cumulativeAfter = 0;
      const cumulativePercentAfter = top10After.map(item => {
        cumulativeAfter += (item.rpnAfter || 0);
        return totalRPNAfter > 0 ? Math.round((cumulativeAfter / totalRPNAfter) * 100) : 0;
      });

      new ChartJS(chartRefs.trend.current.getContext('2d')!, {
          type: 'bar',
          data: {
          labels: top10After.map(item => (item.failureMode || item.processName).substring(0, 6)),
          datasets: [
            {
              type: 'bar',
              label: 'RPN(후)',
              data: top10After.map(item => item.rpnAfter || 0),
              backgroundColor: 'rgba(67, 160, 71, 0.9)',  // 녹색
              borderColor: 'rgba(67, 160, 71, 1)',
              borderWidth: 1,
              yAxisID: 'y',
              datalabels: { align: 'center' as const, anchor: 'center' as const, color: 'white', font: { size: 8 } }
            },
            {
              type: 'line',
              label: '누적%',
              data: cumulativePercentAfter,
              borderColor: 'rgba(239, 68, 68, 1)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              yAxisID: 'y1',
              tension: 0.4,
              pointRadius: 2,
              datalabels: { display: false }
            }
          ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          plugins: { 
            legend: { display: true, position: 'top', labels: { font: { size: 8 }, boxWidth: 10 } },
            datalabels: {
              display: true,
              color: 'white',
              font: { size: 8, weight: 'bold' }
            }
          },
          scales: {
            x: { ticks: { font: { size: 7 } } },
            y: { type: 'linear', position: 'left', beginAtZero: true, title: { display: false } },
            y1: { type: 'linear', position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { font: { size: 7 } } }
          }
          }
        });
      }

    // 심각도, 발생도, 검출도는 HTML 기반 커스텀 차트로 렌더링 (Canvas 사용 안함)
    // 아래 renderCustomComparisonChart 함수 참조
  };

  const getDataSourceLabel = () => {
    switch (dataSource) {
      case 'fmea': return 'FMEA 워크시트';
      case 'improvement': return '개선결과 시트';
      case 'demo': return '데모 데이터';
      default: return '';
    }
  };

  if (!visible) return null;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      background: 'white', 
      overflow: 'hidden' 
    }}>
      {/* Action Bar */}
      <div style={{
        height: '32px',
        minHeight: '32px',
        background: '#F3F4F6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={() => setIsDemoMode(!isDemoMode)}
            style={{
              padding: '3px 8px',
              background: isDemoMode ? '#10b981' : 'white',
              color: isDemoMode ? 'white' : 'black',
              border: '1px solid #D1D5DB',
              borderRadius: '3px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}>
            {isDemoMode ? '🧪 데모ON' : '🧪 데모OFF'}
          </button>
          <button 
            onClick={() => loadData()}
            style={{
              padding: '3px 8px',
              background: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: '3px',
              fontSize: '11px',
              cursor: 'pointer'
            }}>
            🔄 새로고침
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#666' }}>
            📊 데이터: <strong>{getDataSourceLabel()}</strong> ({fmeaData.length}건)
          </span>
        </div>
      </div>

      {/* Chart Section (2x3 Grid) */}
      <div style={{ 
        flex: 1, 
        background: 'linear-gradient(135deg, #2E5CB8 0%, #5B9BF5 100%)', 
        padding: '6px',
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gridTemplateRows: 'repeat(2, 1fr)', 
        gap: '6px',
        overflow: 'hidden',
        minHeight: 0
      }}>
        {/* Row 1 */}
        <ChartCard title="개선 전 RPN 분포 (파레토)">
          <canvas ref={chartRefs.rpn}></canvas>
        </ChartCard>
        <ChartCard title="개선조치 현황">
          <canvas ref={chartRefs.improvement}></canvas>
        </ChartCard>
        <ChartCard title="개선 후 RPN 분포 (파레토)">
          <canvas ref={chartRefs.trend}></canvas>
        </ChartCard>

        {/* Row 2 - HTML 기반 커스텀 비교 차트 */}
        <ChartCard title="심각도 개선 전후">
          <ComparisonBarChart data={fmeaData} field="severity" />
        </ChartCard>
        <ChartCard title="발생도 개선 전후">
          <ComparisonBarChart data={fmeaData} field="occurrence" />
        </ChartCard>
        <ChartCard title="검출도 개선 전후">
          <ComparisonBarChart data={fmeaData} field="detection" />
        </ChartCard>
      </div>

      {/* Status Bar */}
      <div style={{
        height: '22px',
        minHeight: '22px',
        background: '#1F2937',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        fontSize: '10px'
      }}>
        <span>✅ TOP RPN 대시보드 | 데이터 소스: {getDataSourceLabel()}</span>
        <span>FMEA 컬럼: B,F,G,H,I,L,M,N,O,P,Q,R,S,X,Y,Z,AA</span>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.95)', 
      borderRadius: '6px', 
      padding: '4px 6px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.15)', 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: 0,
      overflow: 'hidden' 
    }}>
      <div style={{ 
        fontSize: '11px', 
        fontWeight: 700, 
        color: '#1e3a8a', 
        marginBottom: '2px', 
        textAlign: 'center' 
      }}>{title}</div>
      <div style={{ 
        flex: 1, 
        position: 'relative', 
        minHeight: 0 
      }}>
        {children}
      </div>
    </div>
  );
}

// 커스텀 비교 막대 차트 컴포넌트 (HTML 기반)
interface ComparisonBarChartProps {
  data: FMEARowData[];
  field: 'severity' | 'occurrence' | 'detection';
}

function ComparisonBarChart({ data, field }: ComparisonBarChartProps) {
  const afterField = (field + 'After') as keyof FMEARowData;
  
  // Top 10 데이터 추출
  const top10 = [...data]
    .filter(item => item[field] > 0)
    .sort((a, b) => (b[field] as number) - (a[field] as number))
    .slice(0, 10);

  if (top10.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#999',
        fontSize: '11px'
      }}>
        데이터 없음
      </div>
    );
  }

  // 최대값 계산 (10점 만점)
  const maxValue = 10;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'auto',
      padding: '2px 0'
    }}>
      {/* 범례 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '10px', 
        fontSize: '9px',
        marginBottom: '4px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{ width: '10px', height: '10px', background: '#1976d2', borderRadius: '2px' }}></div>
          <span>개선 전</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{ width: '10px', height: '10px', background: '#1976d2', borderRadius: '2px' }}></div>
          <span>동일</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <div style={{ width: '10px', height: '10px', background: '#43a047', borderRadius: '2px' }}></div>
          <span>개선</span>
        </div>
      </div>

      {/* 차트 행들 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {top10.map((item, idx) => {
          const beforeValue = item[field] as number;
          const afterValue = (item[afterField] as number) || 0;
          const beforeWidth = (beforeValue / maxValue) * 100;
          const afterWidth = (afterValue / maxValue) * 100;
          const label = (item.failureMode || item.processName).substring(0, 8);

          return (
            <div 
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 60px 1fr',
                gap: '4px',
                alignItems: 'center',
                padding: '2px 4px',
                borderBottom: idx < top10.length - 1 ? '1px dashed #e0e0e0' : 'none'
              }}
            >
              {/* 좌측: 개선 전 (파란색) - 오른쪽 정렬 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-end',
                gap: '4px'
              }}>
                <div style={{ 
                  position: 'relative',
                  flex: 1,
                  height: '14px',
                  background: '#e0e0e0',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: `${beforeWidth}%`,
                    background: '#1976d2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {beforeValue > 0 && (
                      <span style={{ color: 'white', fontSize: '9px', fontWeight: 'bold' }}>
                        {beforeValue}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 중앙: RPN ID / 고장형태 */}
              <div style={{ 
                textAlign: 'center',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                {label}
              </div>

              {/* 우측: 개선 후 - 왼쪽 정렬 */}
              {/* 색상: 개선 전과 같으면 파란색, 작아졌으면 녹색 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-start',
                gap: '4px'
              }}>
                <div style={{ 
                  position: 'relative',
                  flex: 1,
                  height: '14px',
                  background: '#e0e0e0',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${afterWidth}%`,
                    background: afterValue < beforeValue ? '#43a047' : '#1976d2',  // 개선되면 녹색, 동일하면 파란색
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {afterValue > 0 && (
                      <span style={{ color: 'white', fontSize: '9px', fontWeight: 'bold' }}>
                        {afterValue}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
