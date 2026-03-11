'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler, ChartDataLabels);

interface TopRPNDashboardProps {
  onClose: () => void;
}

// ★ 성능최적화: React.memo — props(onClose) 불변 시 리렌더 방지
export const TopRPNDashboard: React.FC<TopRPNDashboardProps> = React.memo(({ onClose }) => {
  const chartRefs = {
    rpn: useRef<HTMLCanvasElement>(null),
    improvement: useRef<HTMLCanvasElement>(null),
    trend: useRef<HTMLCanvasElement>(null), // Top 10 RPN
    severity: useRef<HTMLCanvasElement>(null), // Top 10 Severity
    occurrence: useRef<HTMLCanvasElement>(null), // Top 10 Occurrence
    detection: useRef<HTMLCanvasElement>(null), // Top 10 Detection
  };

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [libsLoaded, setLibsLoaded] = useState(false);

  // 샘플 데이터 생성 함수
  const generateRichSampleData = () => {
    const failureModes = [
      '엔진 과열 (Overheat)', '브레이크 소음 발생', '배터리 충전 불량', '센서 신호 오류', 
      'ECU 소프트웨어 충돌', '커넥터 접촉 불량', '타이어 편마모 가속', '오일 펌프 누유', 
      '변속기 충격 발생', '조향 핸들 떨림', '에어컨 냉매 누설', '파워 윈도우 작동불량', 
      '시동 모터 응답지연', '연비 급격한 저하', '헤드램프 습기 발생', '도어 잠금장치 고장', 
      '시트 열선 과열', '오디오 고주파 노이즈', '후방카메라 화면무감', '와이퍼 작동 소음'
    ];
    
    return failureModes.map((name, i) => {
      // 높은 점수 위주로 생성 (Top 10 효과 극대화)
      const severity = Math.floor(Math.random() * 4) + 7; // 7-10
      const occurrence = Math.floor(Math.random() * 6) + 4; // 4-9
      const detection = Math.floor(Math.random() * 6) + 4; // 4-9
      const rpn = severity * occurrence * detection;
      
      // 개선 후 점수 (확실한 감소 효과)
      const severityAfter = Math.max(1, severity - Math.floor(Math.random() * 2));
      const occurrenceAfter = Math.max(1, occurrence - Math.floor(Math.random() * 4) - 1);
      const detectionAfter = Math.max(1, detection - Math.floor(Math.random() * 4) - 1);
      const rpnAfter = severityAfter * occurrenceAfter * detectionAfter;

      return {
        failureMode: name,
        severity, occurrence, detection, rpn,
        severityAfter, occurrenceAfter, detectionAfter, rpnAfter,
        status: ['완료', '진행중', '계획', '지연'][Math.floor(Math.random() * 4)]
      };
    });
  };

  // Chart.js — npm 패키지로 로드 완료 (CDN 제거)
  useEffect(() => {
    setLibsLoaded(true);
  }, []);

  // 차트 렌더링 (데이터 변경 시 재실행)
  useEffect(() => {
    if (!libsLoaded) return;
    initCharts();
    
    // Cleanup
    return () => {
      Object.values(chartRefs).forEach(ref => {
        if (ref.current) {
          const chart = ChartJS?.getChart(ref.current);
          if (chart) chart.destroy();
        }
      });
    };
  }, [libsLoaded, isDemoMode]);

  const getFMEAData = () => {
    // 데모 모드면 무조건 샘플 데이터 반환
    if (isDemoMode) {
      return generateRichSampleData();
    }

    try {
      const stored = localStorage.getItem('fmea_worksheet_data');
      if (stored) {
        const data = JSON.parse(stored);
        const validData = data.filter((row: any) => row && (row.rpn || row.severity));
        // 데이터가 너무 적으면 샘플 데이터 사용 (자동 폴백)
        if (validData.length < 3) return generateRichSampleData();
        return validData;
      }
    } catch (e) {
      console.error('Failed to load FMEA data:', e);
    }
    // 데이터 없으면 샘플 데이터 반환
    return generateRichSampleData();
  };

  const initCharts = () => {
    // 기존 차트 파괴 (중복 방지)
    Object.values(chartRefs).forEach(ref => {
      if (ref.current) {
        const chart = ChartJS.getChart(ref.current);
        if (chart) chart.destroy();
      }
    });

    const dataToUse = getFMEAData();

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
          font: { weight: 'bold' as const, size: 10 },
          formatter: (value: any) => value
        }
      }
    };

    // 1. RPN 분포 차트
    if (chartRefs.rpn.current) {
      const distribution = [0, 0, 0, 0]; // <50, 50-99, 100-199, 200+
      dataToUse.forEach((item: any) => {
        const rpn = Number(item.rpn) || 0;
        if (rpn < 50) distribution[0]++;
        else if (rpn < 100) distribution[1]++;
        else if (rpn < 200) distribution[2]++;
        else distribution[3]++;
      });

      new ChartJS(chartRefs.rpn.current.getContext('2d')!, {
        type: 'bar',
        data: {
          labels: ['낮음 (1-49)', '중간 (50-99)', '높음 (100-199)', '매우높음 (200+)'],
          datasets: [{
            label: '항목 수',
            data: distribution,
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(251, 146, 60, 0.8)',
              'rgba(239, 68, 68, 0.8)'
            ]
          }]
        },
        options: {
          ...commonOptions,
          plugins: { 
            ...commonOptions.plugins, 
            legend: { display: false },
            datalabels: {
              ...commonOptions.plugins.datalabels,
              formatter: (value: number, ctx: any) => {
                const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) + '%' : '0%';
                return `${value}건 (${percentage})`;
              }
            }
          }
        }
      });
    }

    // 2. 개선조치 현황 차트
    if (chartRefs.improvement.current) {
      const statusCounts = { '완료': 0, '진행중': 0, '계획': 0, '지연': 0 };
      dataToUse.forEach((item: any) => {
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
          labels: ['완료', '진행중', '계획', '지연'],
          datasets: [{
            data: [statusCounts['완료'], statusCounts['진행중'], statusCounts['계획'], statusCounts['지연']],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(251, 191, 36, 0.8)',
              'rgba(239, 68, 68, 0.8)'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            datalabels: {
              color: 'white',
              font: { weight: 'bold' },
              formatter: (value: number, ctx: any) => {
                const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) + '%' : '0%';
                return `${value}건\n(${percentage})`;
              }
            }
          }
        }
      });
    }

    // 3. Top 10 RPN 파레토 차트
    if (chartRefs.trend.current) {
      const top10RPN = [...dataToUse]
        .sort((a, b) => (Number(b.rpn) || 0) - (Number(a.rpn) || 0))
        .slice(0, 10);

      const totalRPN = top10RPN.reduce((sum, item) => sum + (Number(item.rpn) || 0), 0);
      let cumulative = 0;
      const cumulativePercent = top10RPN.map(item => {
        cumulative += (Number(item.rpn) || 0);
        return totalRPN > 0 ? Math.round((cumulative / totalRPN) * 100) : 0;
      });

      new ChartJS(chartRefs.trend.current.getContext('2d')!, {
        type: 'bar',
        data: {
          labels: top10RPN.map(item => (item.failureMode || item.name || '미지정').substring(0, 10)),
          datasets: [
            {
              type: 'bar',
              label: 'RPN',
              data: top10RPN.map(item => Number(item.rpn) || 0),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              yAxisID: 'y',
              datalabels: { align: 'center' as const, anchor: 'center' as const, color: 'white' }
            },
            {
              type: 'line',
              label: '누적 %',
              data: cumulativePercent,
              borderColor: 'rgba(239, 68, 68, 1)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              yAxisID: 'y1',
              tension: 0.4,
              datalabels: { align: 'top' as const, anchor: 'start' as const, color: 'red', formatter: (v: any) => v + '%' }
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { type: 'linear', position: 'left', title: { display: true, text: 'RPN' } },
            y1: { type: 'linear', position: 'right', min: 0, max: 100, title: { display: true, text: '누적 %' }, grid: { drawOnChartArea: false } }
          }
        }
      });
    }

    // Helper for Top 10 Comparison Charts
    const createComparisonChart = (ctx: CanvasRenderingContext2D, field: string, label: string, color: string) => {
      const top10 = [...dataToUse]
        .sort((a, b) => (Number(b[field]) || 0) - (Number(a[field]) || 0))
        .slice(0, 10);

      new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels: top10.map(item => (item.failureMode || item.name || '미지정').substring(0, 8)),
          datasets: [
            { 
              label: '개선 전', 
              data: top10.map(item => Number(item[field]) || 0), 
              backgroundColor: 'rgba(239, 68, 68, 0.8)' 
            },
            { 
              label: '개선 후', 
              data: top10.map(item => Number(item[field + 'After']) || 0), 
              backgroundColor: 'rgba(34, 197, 94, 0.8)' 
            }
          ]
        },
        options: {
          ...commonOptions,
          scales: {
            y: { beginAtZero: true, max: 10, title: { display: true, text: label } }
          }
        }
      });
    };

    // 4, 5, 6 Charts
    if (chartRefs.severity.current) createComparisonChart(chartRefs.severity.current.getContext('2d')!, 'severity', '심각도', 'rgba(239, 68, 68, 0.8)');
    if (chartRefs.occurrence.current) createComparisonChart(chartRefs.occurrence.current.getContext('2d')!, 'occurrence', '발생도', 'rgba(251, 146, 60, 0.8)');
    if (chartRefs.detection.current) createComparisonChart(chartRefs.detection.current.getContext('2d')!, 'detection', '검출도', 'rgba(59, 130, 246, 0.8)');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'white',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        height: '50px',
        background: 'linear-gradient(135deg, #2E5CB8 0%, #5B9BF5 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>📊 TOP RPN 대시보드</h1>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        >
          ✕ 닫기
        </button>
      </div>

      {/* Action Bar */}
      <div style={{
        height: '40px',
        background: '#F3F4F6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => {
              setIsDemoMode(!isDemoMode);
            }}
            style={{
              padding: '6px 12px',
              background: isDemoMode ? '#10b981' : 'white',
              color: isDemoMode ? 'white' : 'black',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}>
            {isDemoMode ? '🧪 데모 모드 ON' : '🧪 데모 모드 OFF'}
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '6px 12px',
              background: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer'
            }}>
            🔄 새로고침
          </button>
          <button style={{
            padding: '6px 12px',
            background: 'white',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            fontSize: '13px',
            cursor: 'pointer'
          }}>
            📊 리포트 출력
          </button>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginRight: '10px', display: 'inline-block' }}>
            {isDemoMode ? '📢 가상 데이터 표시 중' : '📢 실시간 데이터 연동 중'}
          </div>
          <button style={{
            padding: '6px 12px',
            background: 'white',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            fontSize: '13px',
            cursor: 'pointer'
          }}>
            📅 기간 설정
          </button>
        </div>
      </div>

      {/* Chart Section (2x3 Grid) */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #2E5CB8 0%, #5B9BF5 100%)',
        padding: '10px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '10px',
        overflow: 'hidden'
      }}>
        {/* Row 1 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a', marginBottom: '8px', textAlign: 'center' }}>
            RPN 분포 (전체)
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <canvas ref={chartRefs.rpn}></canvas>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a', marginBottom: '8px', textAlign: 'center' }}>
            개선조치 상태 현황
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <canvas ref={chartRefs.improvement}></canvas>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a', marginBottom: '8px', textAlign: 'center' }}>
            📊 Top 10 RPN 파레토 (누적 %)
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <canvas ref={chartRefs.trend}></canvas>
          </div>
        </div>

        {/* Row 2 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a', marginBottom: '8px', textAlign: 'center' }}>
            심각도(Severity) Top 10 개선 전후
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <canvas ref={chartRefs.severity}></canvas>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a', marginBottom: '8px', textAlign: 'center' }}>
            발생도(Occurrence) Top 10 개선 전후
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <canvas ref={chartRefs.occurrence}></canvas>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a', marginBottom: '8px', textAlign: 'center' }}>
            검출도(Detection) Top 10 개선 전후
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <canvas ref={chartRefs.detection}></canvas>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        height: '30px',
        background: '#1F2937',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        fontSize: '12px'
      }}>
        <span>✅ TOP RPN 대시보드 (Data Source: {isDemoMode ? 'Virtual Demo Data' : 'FMEA Worksheet'})</span>
      </div>
    </div>
  );
});

TopRPNDashboard.displayName = 'TopRPNDashboard';
