/**
 * @file MyJobClient.tsx
 * @description MyJob 대시보드 — 컴팩트 디자인 + 15초 폴링 실시간 업데이트
 * @created 2026-02-02
 * @updated 2026-03-12 컴팩트 UI + 실시간 폴링 (stats 클라이언트 계산)
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FixedLayout, CommonTopNav } from '@/components/layout';

const MYJOB_MENU = [
  { label: '나의 업무(My Job)', path: '/myjob', icon: '📋' },
  { label: '결재현황(Approval)', path: '/approval/approver-portal', icon: '💼' },
  { label: 'PFMEA 리스트(List)', path: '/pfmea/list', icon: '📊' },
  { label: 'AP 개선(Improve)', path: '/pfmea/ap-improvement', icon: '🚀' },
];

const POLL_INTERVAL = 15_000;

interface JobItem {
  no: number;
  type: string;
  id: string;
  name: string;
  lead: string;
  client?: string;
  start: string;
  end: string;
  status: string;
  createName?: string;
  createStatus?: string;
  reviewName?: string;
  reviewStatus?: string;
  approveName?: string;
  approveStatus?: string;
}

interface JobStats {
  total: number;
  inprogress: number;
  done: number;
  delayed: number;
}

function getApprovalBadge(status: string): { color: string; label: string } {
  switch (status) {
    case '상신': return { color: 'bg-blue-500 text-white', label: '상신' };
    case '승인': return { color: 'bg-green-500 text-white', label: '승인' };
    case '반려': return { color: 'bg-red-500 text-white', label: '반려' };
    case '진행': return { color: 'bg-amber-400 text-white', label: '진행' };
    case '확정': return { color: 'bg-blue-600 text-white', label: '확정' };
    case '대기': return { color: 'bg-gray-200 text-gray-500', label: '대기' };
    default: return { color: 'bg-gray-100 text-gray-400', label: '-' };
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case '진행중': return 'text-blue-600 bg-blue-50 border-blue-200';
    case '지연': return 'text-white bg-red-500 border-red-500 font-bold';
    case '완료': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function getDisplayStatus(status: string, endDate: string): string {
  if (status === '완료') return '완료';
  if (endDate && endDate !== '-') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(endDate) < today) return '지연';
  }
  return status;
}

function calcStats(jobs: JobItem[]): JobStats {
  let inprogress = 0, done = 0, delayed = 0;
  for (const j of jobs) {
    const ds = getDisplayStatus(j.status, j.end);
    if (ds === '완료') done++;
    else if (ds === '지연') delayed++;
    else inprogress++;
  }
  return { total: jobs.length, inprogress, done, delayed };
}

type SortKey = 'no' | 'type' | 'id' | 'name' | 'lead' | 'client' | 'start' | 'end' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'inprogress' | 'done' | 'delayed';

const STAT_CARDS: { key: StatusFilter; label: string; badge: string; badgeLabel: string; color: string }[] = [
  { key: 'all', label: '총 업무', badge: 'bg-blue-500', badgeLabel: 'ALL', color: 'text-slate-800' },
  { key: 'inprogress', label: '진행중', badge: 'bg-green-500', badgeLabel: 'OK', color: 'text-blue-600' },
  { key: 'done', label: '완료', badge: 'bg-amber-500', badgeLabel: 'DONE', color: 'text-green-600' },
  { key: 'delayed', label: '지연', badge: 'bg-red-500', badgeLabel: 'DELAY', color: 'text-red-600' },
];

const TH = 'bg-[#00587a] text-white px-1 py-1 text-[11px] font-semibold text-center cursor-pointer hover:bg-[#006d8e] select-none whitespace-nowrap';
const TD = 'px-1 py-0.5 text-[11px] text-slate-600 text-center border-b border-slate-100';

export default function MyJobClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobData, setJobData] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('사용자');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('no');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filterParam = searchParams.get('filter');
  const initialFilter: StatusFilter = (['all', 'inprogress', 'done', 'delayed'] as const).includes(filterParam as StatusFilter)
    ? (filterParam as StatusFilter) : 'all';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter);

  const fetchJobs = useCallback(async (isInitial = false) => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch('/api/myjob/jobs', { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      const data = await res.json();
      if (data.jobs) {
        setJobData(data.jobs.filter((j: JobItem) => j.type !== 'DFMEA'));
      }
      setLastUpdated(new Date());
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        console.error('[MyJob] fetch error:', err);
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const session = localStorage.getItem('user_session');
    if (session) {
      try {
        const user = JSON.parse(session);
        setUserName(user.name || '사용자');
        setUserPhoto(user.photoUrl || localStorage.getItem('fmea_user_photo') || null);
      } catch (e) {
        console.error('Failed to parse user session:', e);
      }
    }
    fetchJobs(true);
    pollRef.current = setInterval(() => fetchJobs(false), POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchJobs]);

  const stats = React.useMemo(() => calcStats(jobData), [jobData]);

  const handleNavigate = useCallback((type: string, id: string) => {
    if (!id || id === '-') return;
    const paths: Record<string, string> = { PFMEA: '/pfmea/revision', CP: '/control-plan/revision', PFD: '/pfd/revision' };
    router.push(`${paths[type.toUpperCase()] || '/welcomeboard'}?id=${id}`);
  }, [router]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return prev; }
      setSortDir('asc');
      return key;
    });
  }, []);

  const filteredAndSortedData = React.useMemo(() => {
    const filtered = statusFilter === 'all'
      ? jobData
      : jobData.filter(row => {
        const ds = getDisplayStatus(row.status, row.end);
        if (statusFilter === 'inprogress') return ds === '진행중';
        if (statusFilter === 'done') return ds === '완료';
        if (statusFilter === 'delayed') return ds === '지연';
        return true;
      });
    return [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortKey) {
        case 'no': aVal = a.no; bVal = b.no; break;
        case 'type': aVal = a.type; bVal = b.type; break;
        case 'id': aVal = a.id; bVal = b.id; break;
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'lead': aVal = a.lead; bVal = b.lead; break;
        case 'client': aVal = a.client || ''; bVal = b.client || ''; break;
        case 'start': aVal = a.start; bVal = b.start; break;
        case 'end': aVal = a.end; bVal = b.end; break;
        case 'status': aVal = getDisplayStatus(a.status, a.end); bVal = getDisplayStatus(b.status, b.end); break;
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      const cmp = String(aVal).localeCompare(String(bVal), 'ko');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [jobData, statusFilter, sortKey, sortDir]);

  const sortIcon = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
  const statValue = (key: StatusFilter): number => {
    if (key === 'all') return stats.total;
    if (key === 'inprogress') return stats.inprogress;
    if (key === 'done') return stats.done;
    return stats.delayed;
  };

  return (
    <FixedLayout
      topNav={<CommonTopNav title="My Job" menuItems={MYJOB_MENU} gradientFrom="#1a237e" gradientTo="#3949ab" />}
      showSidebar={true}
      contentPadding="p-0"
      bgColor="#f1f5f9"
    >
      <div className="px-2 pt-1">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex items-center gap-2 bg-gradient-to-r from-[#1a237e] to-[#3949ab] px-3 py-1.5 rounded-lg shadow shrink-0">
            {userPhoto
              ? <img src={userPhoto} alt={userName} className="w-7 h-7 rounded-full object-cover border border-white/30" />
              : <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm border border-white/30">👤</div>}
            <div className="leading-tight">
              <span className="text-[11px] font-bold text-white">{userName}님의 MyJob</span>
              {lastUpdated && (
                <span className="text-[8px] text-white/40 ml-1.5">
                  {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 갱신
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 flex-1">
            {STAT_CARDS.map(card => (
              <button key={card.key} onClick={() => setStatusFilter(card.key)}
                className={`flex items-center gap-1.5 bg-white rounded-md px-2.5 py-1 shadow-sm border transition-all flex-1 ${
                  statusFilter === card.key ? 'border-blue-500 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}>
                <span className={`text-lg font-black leading-none ${card.color}`}>{statValue(card.key)}</span>
                <div className="flex flex-col items-start">
                  <span className="text-[9px] text-slate-400 leading-none">{card.label}</span>
                  <span className={`px-1.5 py-px ${card.badge} text-white text-[8px] font-bold rounded-full mt-0.5`}>{card.badgeLabel}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-2 py-1 bg-gradient-to-r from-[#00587a] to-[#007a9e] text-white flex justify-between items-center">
            <h2 className="font-bold text-[11px]">나의 업무 목록 ({filteredAndSortedData.length})</h2>
            <div className="flex gap-1">
              <Link href="/approval/approver-portal" className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[9px] font-semibold transition-colors">결재 현황 →</Link>
              <Link href="/pfmea/ap-improvement" className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[9px] font-semibold transition-colors">AP 개선 현황 →</Link>
            </div>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 155px)' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={TH} style={{ width: '3%' }} onClick={() => toggleSort('no')}>NO{sortIcon('no')}</th>
                  <th className={TH} style={{ width: '4%' }} onClick={() => toggleSort('type')}>구분{sortIcon('type')}</th>
                  <th className={TH} style={{ width: '13%' }} onClick={() => toggleSort('id')}>프로젝트ID{sortIcon('id')}</th>
                  <th className={TH} style={{ width: '17%' }} onClick={() => toggleSort('name')}>프로젝트명{sortIcon('name')}</th>
                  <th className={TH} style={{ width: '5%' }} onClick={() => toggleSort('lead')}>책임자{sortIcon('lead')}</th>
                  <th className={TH} style={{ width: '6%' }} onClick={() => toggleSort('client')}>고객사{sortIcon('client')}</th>
                  <th className={TH} style={{ width: '7%' }} onClick={() => toggleSort('start')}>시작{sortIcon('start')}</th>
                  <th className={TH} style={{ width: '7%' }} onClick={() => toggleSort('end')}>종료{sortIcon('end')}</th>
                  <th className={TH} style={{ width: '6%' }}>담당자</th>
                  <th className={TH} style={{ width: '6%' }}>검토자</th>
                  <th className={TH} style={{ width: '6%' }}>승인자</th>
                  <th className={TH} style={{ width: '4%' }} onClick={() => toggleSort('status')}>상태{sortIcon('status')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} className={`${TD} py-4 text-gray-400`}>데이터 로딩 중...</td></tr>
                ) : filteredAndSortedData.length === 0 ? (
                  <tr><td colSpan={12} className={`${TD} py-4 text-gray-400`}>
                    {statusFilter === 'all' ? '등록된 업무가 없습니다' : '해당 상태의 업무가 없습니다'}
                  </td></tr>
                ) : filteredAndSortedData.map((row, idx) => (
                  <JobRow key={`${row.type}-${row.id}`} row={row} idx={idx} onNavigate={handleNavigate} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FixedLayout>
  );
}

const JobRow = React.memo(function JobRow({ row, idx, onNavigate }: { row: JobItem; idx: number; onNavigate: (type: string, id: string) => void }) {
  const ds = getDisplayStatus(row.status, row.end);
  const cb = getApprovalBadge(row.createStatus || '-');
  const rb = getApprovalBadge(row.reviewStatus || '-');
  const ab = getApprovalBadge(row.approveStatus || '-');
  return (
    <tr className={`hover:bg-blue-50/60 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`} style={{ height: 24 }}>
      <td className={TD}>{row.no}</td>
      <td className={TD}><span className="font-bold text-indigo-700 text-[10px]">{row.type}</span></td>
      <td className={`${TD} text-[10px]`}>{row.id}</td>
      <td className={`${TD} text-left px-1.5 font-semibold`}>
        <button onClick={() => onNavigate(row.type, row.id)} className="hover:underline text-blue-700 text-[11px] truncate max-w-[200px] block">{row.name}</button>
      </td>
      <td className={TD}>{row.lead}</td>
      <td className={TD}>{row.client}</td>
      <td className={`${TD} text-[10px]`}>{row.start}</td>
      <td className={`${TD} text-[10px]`}>{row.end}</td>
      <td className={TD}><ApprovalCell name={row.createName} badge={cb} /></td>
      <td className={TD}><ApprovalCell name={row.reviewName} badge={rb} /></td>
      <td className={TD}><ApprovalCell name={row.approveName} badge={ab} /></td>
      <td className={TD}><span className={`px-1 py-px rounded text-[9px] font-bold border ${getStatusColor(ds)}`}>{ds}</span></td>
    </tr>
  );
});

function ApprovalCell({ name, badge }: { name?: string; badge: { color: string; label: string } }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      <span className="text-[9px] text-gray-500 truncate max-w-[40px]">{name || '-'}</span>
      <span className={`px-1 rounded text-[8px] font-bold leading-tight ${badge.color}`}>{badge.label}</span>
    </div>
  );
}
