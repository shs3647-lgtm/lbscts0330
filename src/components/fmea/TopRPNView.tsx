'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement, Filler
);

interface TopRPNViewProps {
  visible: boolean;
}

interface RPNItem {
  id: string; fmeaId: string; processName: string; failureMode: string;
  failureEffect: string; failureCause: string;
  severity: number; occurrence: number; detection: number; rpn: number; ap: string;
  preventionControl: string; detectionControl: string;
  severityAfter: number; occurrenceAfter: number; detectionAfter: number;
  rpnAfter: number; apAfter: string; status: string;
}

interface ProjectOption {
  fmeaId: string; label: string; fmeaType: string;
}



export default function TopRPNView({ visible }: TopRPNViewProps) {
  const [data, setData] = useState<RPNItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedFmeaId, setSelectedFmeaId] = useState('');
  const [loading, setLoading] = useState(false);
  
  const loadFromDB = useCallback(async (fmeaId?: string) => {
    setLoading(true);
    try {
      const url = fmeaId ? `/api/rpn-analysis?fmeaId=${encodeURIComponent(fmeaId)}` : '/api/rpn-analysis';
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setProjects(result.projects || []);
        if (result.items?.length > 0) {
          setData(result.items);
          if (!fmeaId && result.fmeaId) setSelectedFmeaId(result.fmeaId);
        } else {
          setData([]);
          if (!fmeaId && result.fmeaId) setSelectedFmeaId(result.fmeaId);
        }
      } else {
        setData([]);
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    loadFromDB(selectedFmeaId || undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, loadFromDB]); // selectedFmeaId 의존성 제거 (무한루프 방지)

  const handleProjectChange = useCallback((fmeaId: string) => {
    setSelectedFmeaId(fmeaId);
    loadFromDB(fmeaId);
  }, [loadFromDB]);

  const handleExport = useCallback(() => {
    if (data.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }
    const exportData = data.map((item, idx) => ({
      'No.': idx + 1,
      '공정명': item.processName || '',
      '고장형태(FM)': item.failureMode || '',
      '고장원인(FC)': item.failureCause || '',
      '개선전 S': item.severity || '',
      '개선전 O': item.occurrence || '',
      '개선전 D': item.detection || '',
      '개선전 RPN': item.rpn || '',
      '개선전 AP': item.ap || '',
      '개선대책(예방/검출)': item.preventionControl ? item.preventionControl : (item.detectionControl ? `검출: ${item.detectionControl}` : ''),
      '개선후 S': item.severityAfter || '',
      '개선후 O': item.occurrenceAfter || '',
      '개선후 D': item.detectionAfter || '',
      '개선후 RPN': item.rpnAfter || '',
      '개선후 AP': item.apAfter || '',
      '상태': item.status || '대기'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RPN_Analysis');
    XLSX.writeFile(wb, `RPN_Analysis_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [data]);



  // Chart Data
  const rpnChartData = useMemo(() => {
    const top10 = [...data].filter(i => i.rpn > 0).sort((a, b) => b.rpn - a.rpn).slice(0, 10);
    const totalRPN = top10.reduce((s, i) => s + i.rpn, 0);
    let cum = 0;
    const cumPct = top10.map(i => { cum += i.rpn; return totalRPN > 0 ? Math.round((cum / totalRPN) * 100) : 0; });
    return {
      labels: top10.map(i => (i.failureMode || i.processName).substring(0, 6)),
      datasets: [
        { type: 'bar' as const, label: 'RPN(전)', data: top10.map(i => i.rpn), backgroundColor: 'rgba(25,118,210,0.9)', borderColor: 'rgba(25,118,210,1)', borderWidth: 1, yAxisID: 'y' },
        { type: 'line' as const, label: '누적%', data: cumPct, borderColor: 'rgba(239,68,68,1)', backgroundColor: 'rgba(239,68,68,0.1)', yAxisID: 'y1', tension: 0.4, pointRadius: 2 }
      ]
    };
  }, [data]);

  const improveChartData = useMemo(() => {
    const counts: Record<string, number> = { '완료': 0, '진행중': 0, '계획': 0, '미완료': 0 };
    data.forEach(i => { const s = i.status || '미완료'; counts[s] = (counts[s] || 0) + 1; });
    return {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(59,130,246,0.8)', 'rgba(251,191,36,0.8)', 'rgba(156,163,175,0.8)'] }]
    };
  }, [data]);

  const trendChartData = useMemo(() => {
    const top10After = [...data].filter(i => (i.rpnAfter || 0) > 0).sort((a, b) => (b.rpnAfter || 0) - (a.rpnAfter || 0)).slice(0, 10);
    const totalAfter = top10After.reduce((s, i) => s + (i.rpnAfter || 0), 0);
    let cum2 = 0;
    const cumPct2 = top10After.map(i => { cum2 += (i.rpnAfter || 0); return totalAfter > 0 ? Math.round((cum2 / totalAfter) * 100) : 0; });
    return {
      labels: top10After.map(i => (i.failureMode || i.processName).substring(0, 6)),
      datasets: [
        { type: 'bar' as const, label: 'RPN(후)', data: top10After.map(i => i.rpnAfter || 0), backgroundColor: 'rgba(67,160,71,0.9)', borderColor: 'rgba(67,160,71,1)', borderWidth: 1, yAxisID: 'y' },
        { type: 'line' as const, label: '누적%', data: cumPct2, borderColor: 'rgba(239,68,68,1)', backgroundColor: 'rgba(239,68,68,0.1)', yAxisID: 'y1', tension: 0.4, pointRadius: 2 }
      ]
    };
  }, [data]);

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' as const, labels: { font: { size: 8 }, boxWidth: 10 } } },
    scales: { x: { ticks: { font: { size: 7 } } }, y: { type: 'linear' as const, position: 'left' as const, beginAtZero: true }, y1: { type: 'linear' as const, position: 'right' as const, min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { font: { size: 7 } } } }
  };

  const donutOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom' as const, labels: { font: { size: 9 } } } } };

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const rpnValues = data.map(i => i.rpn).filter(v => v > 0);
    const rpnAfterValues = data.map(i => i.rpnAfter).filter(v => v > 0);
    const avgBefore = rpnValues.length > 0 ? Math.round(rpnValues.reduce((a, b) => a + b, 0) / rpnValues.length) : 0;
    const avgAfter = rpnAfterValues.length > 0 ? Math.round(rpnAfterValues.reduce((a, b) => a + b, 0) / rpnAfterValues.length) : 0;
    const improvementRate = avgBefore > 0 ? Math.round(((avgBefore - avgAfter) / avgBefore) * 100) : 0;
    return { avgBefore, avgAfter, maxBefore: rpnValues.length > 0 ? Math.max(...rpnValues) : 0, improvementRate, highCount: data.filter(i => i.ap === 'H').length, mediumCount: data.filter(i => i.ap === 'M').length, lowCount: data.filter(i => i.ap === 'L').length, total: data.length };
  }, [data]);

  if (!visible) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', overflow: 'hidden' }}>
      <div style={{ height: '36px', minHeight: '36px', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select value={selectedFmeaId} onChange={e => handleProjectChange(e.target.value)} style={{ padding: '2px 6px', border: '1px solid #D1D5DB', borderRadius: '3px', fontSize: '11px', maxWidth: '200px' }}>
            {projects.length === 0 && <option value="">프로젝트 없음</option>}
            {projects.map(p => (<option key={p.fmeaId} value={p.fmeaId}>{p.label} ({p.fmeaType})</option>))}
          </select>
          <button onClick={() => loadFromDB(selectedFmeaId || undefined)} style={{ padding: '3px 8px', background: 'white', border: '1px solid #D1D5DB', borderRadius: '3px', fontSize: '11px', cursor: 'pointer' }}>🔄 새로고침</button>
          <div style={{ width: '1px', height: '16px', background: '#D1D5DB', margin: '0 4px' }} />
          <button onClick={handleExport} style={{ padding: '3px 8px', background: '#16A34A', color: 'white', border: '1px solid #15803D', borderRadius: '3px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><span>📤</span> Export</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {loading && <span style={{ fontSize: '11px', color: '#f59e0b' }}>⏳ 로딩중...</span>}
          <span style={{ fontSize: '11px', color: '#666' }}>📊 <strong>DB</strong> ({data.length}건)</span>
        </div>
      </div>
      {stats && (
        <div style={{ height: '28px', minHeight: '28px', background: '#EFF6FF', display: 'flex', alignItems: 'center', gap: '16px', padding: '0 12px', borderBottom: '1px solid #DBEAFE', fontSize: '11px' }}>
          <span style={{ fontWeight: 'bold', color: '#1e3a8a' }}>📈 요약</span>
          <span>총 <b>{stats.total}</b>건</span>
          <span>평균RPN(전): <b style={{ color: '#dc2626' }}>{stats.avgBefore}</b></span>
          <span>평균RPN(후): <b style={{ color: '#16a34a' }}>{stats.avgAfter}</b></span>
          <span>개선율: <b style={{ color: stats.improvementRate > 0 ? '#16a34a' : '#dc2626' }}>{stats.improvementRate}%</b></span>
          <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}><span style={{ color: '#ef4444' }}>H:{stats.highCount}</span>{' '}<span style={{ color: '#f97316' }}>M:{stats.mediumCount}</span>{' '}<span style={{ color: '#22c55e' }}>L:{stats.lowCount}</span></span>
        </div>
      )}
      <div style={{ flex: '0 0 55%', background: 'linear-gradient(135deg, #2E5CB8 0%, #5B9BF5 100%)', padding: '6px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '6px', overflow: 'hidden', minHeight: '300px' }}>
        <ChartCard title="개선 전 RPN 분포 (파레토)">{data.length > 0 && <Chart type="bar" data={rpnChartData as any} options={chartOptions as any} />}</ChartCard>
        <ChartCard title="개선조치 현황">{data.length > 0 && <Chart type="doughnut" data={improveChartData as any} options={donutOptions as any} />}</ChartCard>
        <ChartCard title="개선 후 RPN 분포 (파레토)">{data.length > 0 && <Chart type="bar" data={trendChartData as any} options={chartOptions as any} />}</ChartCard>
        <ChartCard title="심각도 개선 전후"><ComparisonBarChart data={data} field="severity" /></ChartCard>
        <ChartCard title="발생도 개선 전후"><ComparisonBarChart data={data} field="occurrence" /></ChartCard>
        <ChartCard title="검출도 개선 전후"><ComparisonBarChart data={data} field="detection" /></ChartCard>
      </div>

      {/* 데이터 테이블 섹션 */}
      <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', minHeight: '200px', borderTop: '2px solid #2E5CB8', background: 'white' }}>
        <div style={{ padding: '6px 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0F172A' }}>📑 RPN 상세 현황 및 개선 내역</span>
          <span style={{ fontSize: '10px', color: '#64748B' }}>* 스크롤하여 전체 목록을 확인할 수 있습니다</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center', minWidth: '800px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: '#F1F5F9', color: '#334155', borderBottom: '1px solid #CBD5E1' }}>
                <th rowSpan={2} style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #CBD5E1', background: '#F1F5F9' }}>#</th>
                <th rowSpan={2} style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #CBD5E1', background: '#F1F5F9' }}>공정명</th>
                <th rowSpan={2} style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #CBD5E1', background: '#F1F5F9', maxWidth: '140px' }}>고장형태(FM)</th>
                <th rowSpan={2} style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #CBD5E1', background: '#F1F5F9', maxWidth: '140px' }}>고장원인(FC)</th>
                <th colSpan={5} style={{ padding: '4px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #CBD5E1', background: '#DBEAFE', color: '#1E3A8A' }}>개선 전</th>
                <th rowSpan={2} style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #CBD5E1', background: '#F1F5F9', maxWidth: '140px' }}>개선대책</th>
                <th colSpan={5} style={{ padding: '4px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #CBD5E1', background: '#DCFCE7', color: '#14532D' }}>개선 후</th>
                <th rowSpan={2} style={{ padding: '6px 4px', borderBottom: '1px solid #CBD5E1', background: '#F1F5F9' }}>상태</th>
              </tr>
              <tr style={{ background: '#F8FAFC', color: '#475569' }}>
                <th style={{ padding: '4px', borderRight: '1px dotted #CBD5E1', borderBottom: '1px solid #CBD5E1', background: '#EFF6FF', width: '30px' }}>S</th>
                <th style={{ padding: '4px', borderRight: '1px dotted #CBD5E1', borderBottom: '1px solid #CBD5E1', background: '#EFF6FF', width: '30px' }}>O</th>
                <th style={{ padding: '4px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', background: '#EFF6FF', width: '30px' }}>D</th>
                <th style={{ padding: '4px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', background: '#BFDBFE', fontWeight: 'bold', width: '40px' }}>RPN</th>
                <th style={{ padding: '4px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #CBD5E1', background: '#EFF6FF', width: '35px' }}>AP</th>
                
                <th style={{ padding: '4px', borderRight: '1px dotted #CBD5E1', borderBottom: '1px solid #CBD5E1', background: '#F0FDF4', width: '30px' }}>S</th>
                <th style={{ padding: '4px', borderRight: '1px dotted #CBD5E1', borderBottom: '1px solid #CBD5E1', background: '#F0FDF4', width: '30px' }}>O</th>
                <th style={{ padding: '4px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', background: '#F0FDF4', width: '30px' }}>D</th>
                <th style={{ padding: '4px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', background: '#BBF7D0', fontWeight: 'bold', width: '40px' }}>RPN</th>
                <th style={{ padding: '4px', borderBottom: '1px solid #CBD5E1', background: '#F0FDF4', width: '35px' }}>AP</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? 'white' : '#F8FAFC' }}>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', color: '#64748B' }}>{idx + 1}</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', textAlign: 'left', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.processName}>{row.processName}</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', textAlign: 'left', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.failureMode}>{row.failureMode}</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', textAlign: 'left', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.failureCause}>{row.failureCause}</td>
                  
                  <td style={{ padding: '6px 4px', borderRight: '1px dotted #E2E8F0' }}>{row.severity || '-'}</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px dotted #E2E8F0' }}>{row.occurrence || '-'}</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0' }}>{row.detection || '-'}</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', fontWeight: 'bold', color: row.rpn > 100 ? '#DC2626' : (row.rpn >= 50 ? '#EA580C' : '#1E293B'), background: '#EFF6FF' }}>{row.rpn || '-'}</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0' }}>
                    <span style={{ display: 'inline-block', width: '18px', height: '18px', borderRadius: '50%', background: row.ap === 'H' ? '#EF4444' : (row.ap === 'M' ? '#F97316' : (row.ap === 'L' ? '#22C55E' : '#94A3B8')), color: 'white', fontSize: '10px', lineHeight: '18px', fontWeight: 'bold' }}>{row.ap || (row.rpn ? (row.rpn > 200 ? 'H' : row.rpn > 100 ? 'M' : 'L') : '-')}</span>
                  </td>
                  
                  <td style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', textAlign: 'left', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.preventionControl || row.detectionControl}>{row.preventionControl ? row.preventionControl : (row.detectionControl ? `검출: ${row.detectionControl}` : '-')}</td>
                  
                  <td style={{ padding: '6px 4px', borderRight: '1px dotted #E2E8F0', color: row.severityAfter ? '#334155' : '#CBD5E1' }}>{row.severityAfter || '-'}</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px dotted #E2E8F0', color: row.occurrenceAfter ? '#334155' : '#CBD5E1' }}>{row.occurrenceAfter || '-'}</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', color: row.detectionAfter ? '#334155' : '#CBD5E1' }}>{row.detectionAfter || '-'}</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0', fontWeight: 'bold', color: row.rpnAfter && row.rpnAfter > 100 ? '#DC2626' : '#16A34A', background: '#F0FDF4' }}>{row.rpnAfter || '-'}</td>
                  <td style={{ padding: '6px 4px', borderRight: '1px solid #E2E8F0' }}>
                    {row.apAfter ? (
                      <span style={{ display: 'inline-block', width: '18px', height: '18px', borderRadius: '50%', background: row.apAfter === 'H' ? '#EF4444' : (row.apAfter === 'M' ? '#F97316' : (row.apAfter === 'L' ? '#22C55E' : '#94A3B8')), color: 'white', fontSize: '10px', lineHeight: '18px', fontWeight: 'bold' }}>{row.apAfter}</span>
                    ) : '-'}
                  </td>
                  
                  <td style={{ padding: '6px 4px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                      background: row.status === '완료' ? '#DCFCE7' : (row.status === '진행중' ? '#DBEAFE' : '#F1F5F9'),
                      color: row.status === '완료' ? '#16A34A' : (row.status === '진행중' ? '#2563EB' : '#64748B')
                    }}>
                      {row.status || '대기'}
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={16} style={{ padding: '20px', color: '#94A3B8', textAlign: 'center' }}>데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '6px', padding: '4px 6px', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e3a8a', marginBottom: '2px', textAlign: 'center' }}>{title}</div>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>{children}</div>
    </div>
  );
}

function ComparisonBarChart({ data, field }: { data: RPNItem[]; field: 'severity' | 'occurrence' | 'detection' }) {
  const afterField = (field + 'After') as keyof RPNItem;
  const top10 = [...data].filter(i => (i[field] as number) > 0).sort((a, b) => (b[field] as number) - (a[field] as number)).slice(0, 10);
  if (top10.length === 0) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '11px' }}>데이터 없음</div>;
  const maxVal = 10;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: '2px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '9px', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{ width: '10px', height: '10px', background: '#1976d2', borderRadius: '2px' }} /><span>개선전</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><div style={{ width: '10px', height: '10px', background: '#43a047', borderRadius: '2px' }} /><span>개선후</span></div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {top10.map((item, idx) => {
          const before = item[field] as number; const after = (item[afterField] as number) || 0;
          const label = (item.failureMode || item.processName).substring(0, 8);
          return (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: '4px', alignItems: 'center', padding: '2px 4px', borderBottom: idx < top10.length - 1 ? '1px dashed #e0e0e0' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ position: 'relative', flex: 1, height: '14px', background: '#e0e0e0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: 0, width: `${(before / maxVal) * 100}%`, background: '#1976d2', height: '100%' }}></div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: 'bold', color: '#333' }}>{label}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ position: 'relative', flex: 1, height: '14px', background: '#e0e0e0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, width: `${(after / maxVal) * 100}%`, background: after < before ? '#43a047' : '#1976d2', height: '100%' }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
