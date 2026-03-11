/**
 * @file /src/app/myjob/MyJobClient.tsx
 * @description MyJob 클라이언트 컴포넌트 - 나의 업무 현황 통합 대시보드
 * @created 2026-02-02
 * @updated 2026-03-07 Suspense 분리 (빌드 오류 해결)
 *
 * @status CODE_FREEZE 🔒
 * @freeze_level L2 (Important)
 * @frozen_date 2026-02-05
 * @allowed_changes 버그 수정, 주석 추가만 허용
 *
 * ⚠️ 이 파일은 코드프리즈 상태입니다.
 * 수정이 필요한 경우 docs/HARDCODING.md 참고
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FixedLayout, PFMEATopNav } from '@/components/layout';

interface JobStats {
    total: number;
    inprogress: number;
    done: number;
    delayed: number;
}

interface JobItem {
    no: number;
    type: string;
    id: string;
    name: string;
    lead: string;
    client?: string;
    role?: string;
    start: string;
    end: string;
    step?: string;
    status: string;
    // 결재 진행상황
    createName?: string;
    createStatus?: string;
    reviewName?: string;
    reviewStatus?: string;
    approveName?: string;
    approveStatus?: string;
}

/** 결재 상태 뱃지 색상 */
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

type SortKey = 'no' | 'type' | 'id' | 'name' | 'lead' | 'client' | 'start' | 'end' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'inprogress' | 'done' | 'delayed';

export default function MyJobClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [stats, setStats] = useState<JobStats>({ total: 0, inprogress: 0, done: 0, delayed: 0 });
    const [jobData, setJobData] = useState<JobItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('사용자');
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('no');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // URL 쿼리에서 초기 필터 설정
    const filterParam = searchParams.get('filter');
    const initialFilter: StatusFilter = (['all', 'inprogress', 'done', 'delayed'] as const).includes(filterParam as StatusFilter)
        ? (filterParam as StatusFilter) : 'all';
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter);

    useEffect(() => {
        // 사용자 정보 로드
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

        // ★ 실데이터 API 호출 (타임아웃 8초)
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const opts = { signal: ctrl.signal };

        Promise.all([
            fetch('/api/myjob/stats', opts).then(r => r.json()).catch(() => ({ total: 0, inprogress: 0, done: 0, delayed: 0 })),
            fetch('/api/myjob/jobs', opts).then(r => r.json()).catch(() => ({ jobs: [] })),
        ]).then(([statsData, jobsData]) => {
            clearTimeout(timer);
            setStats(statsData);
            if (jobsData.jobs && jobsData.jobs.length > 0) {
                // DFMEA 제외 (비활성화 모듈)
                setJobData(jobsData.jobs.filter((j: JobItem) => j.type !== 'DFMEA'));
            }
            setLoading(false);
        });
    }, []);

    const handleNavigate = (type: string, id: string) => {
        if (!id || id === '-') return;
        let path = '/';
        switch (type.toUpperCase()) {
            case 'PFMEA': path = '/pfmea/revision'; break;
            case 'CP': path = '/control-plan/revision'; break;
            case 'PFD': path = '/pfd/revision'; break;
            default: path = '/welcomeboard';
        }
        router.push(`${path}?id=${id}`);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case '진행중': return 'text-blue-600 bg-blue-50 border-blue-200';
            case '지연': return 'text-white bg-red-500 border-red-500 font-bold';
            case '완료': return 'text-green-600 bg-green-50 border-green-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    // ★ 날짜 초과 확인 함수 (지연 여부)
    const isDelayed = (endDate: string, status: string): boolean => {
        if (status === '완료') return false;  // 완료는 지연 아님
        if (!endDate || endDate === '-') return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        return end < today;
    };

    // ★ 상태 표시 함수 (지연 시 자동 변경)
    const getDisplayStatus = (status: string, endDate: string): string => {
        if (isDelayed(endDate, status)) return '지연';
        return status;
    };

    // 정렬 토글
    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    // 상태 필터 + 정렬 적용
    const filteredAndSortedData = React.useMemo(() => {
        const filtered = statusFilter === 'all'
            ? jobData
            : jobData.filter(row => {
                const displayStatus = getDisplayStatus(row.status, row.end);
                switch (statusFilter) {
                    case 'inprogress': return displayStatus === '진행중';
                    case 'done': return displayStatus === '완료';
                    case 'delayed': return displayStatus === '지연';
                    default: return true;
                }
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
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const cmp = String(aVal).localeCompare(String(bVal), 'ko');
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [jobData, statusFilter, sortKey, sortDir]);

    const sortIcon = (key: SortKey) =>
        sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

    const tableHeaderStyle = "bg-slate-100 p-3 border border-slate-300 text-[12px] font-bold text-slate-700 text-center cursor-pointer hover:bg-slate-200 select-none transition-colors";
    const tableCellStyle = "p-3 border border-slate-200 text-[12px] text-slate-600 text-center";

    return (
        <FixedLayout
            topNav={<PFMEATopNav />}
            showSidebar={true}
            contentPadding="p-6"
            bgColor="#f1f5f9"
        >
            <div className="max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-[#1a237e] to-[#3949ab] p-6 rounded-2xl shadow-lg">
                    <div className="flex items-center gap-4">
                        {userPhoto ? (
                            <img src={userPhoto} alt={userName} className="w-16 h-16 rounded-full object-cover border-4 border-white/30 shadow-lg" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl border-4 border-white/30">
                                👤
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-black text-white flex items-center gap-2">
                                💼 {userName}님의 MyJob
                            </h1>
                            <p className="text-white/70 text-sm mt-1">나의 업무 현황을 한눈에 확인하세요</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards — 클릭 시 필터 */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {([
                        { key: 'all' as StatusFilter, label: '총 업무', value: stats.total, color: 'text-slate-800', badge: 'bg-blue-500', badgeLabel: 'ALL' },
                        { key: 'inprogress' as StatusFilter, label: '진행중', value: stats.inprogress, color: 'text-blue-600', badge: 'bg-green-500', badgeLabel: 'OK' },
                        { key: 'done' as StatusFilter, label: '완료', value: stats.done, color: 'text-green-600', badge: 'bg-amber-500', badgeLabel: 'DONE' },
                        { key: 'delayed' as StatusFilter, label: '지연', value: stats.delayed, color: 'text-red-600', badge: 'bg-red-500', badgeLabel: 'DELAY' },
                    ]).map(card => (
                        <button
                            key={card.key}
                            onClick={() => setStatusFilter(card.key)}
                            className={`bg-white rounded-xl p-5 shadow-md border-2 hover:shadow-lg transition-all text-left ${
                                statusFilter === card.key ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                            }`}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-slate-500 text-xs font-medium mb-1">{card.label}</p>
                                    <p className={`text-3xl font-black ${card.color}`}>{card.value}</p>
                                </div>
                                <span className={`px-3 py-1 ${card.badge} text-white text-xs font-bold rounded-full`}>{card.badgeLabel}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* 업무 목록 테이블 */}
                <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-[#00587a] to-[#007a9e] text-white flex justify-between items-center">
                        <h2 className="font-bold text-[15px] flex items-center gap-2">
                            📋 나의 업무 목록
                        </h2>
                        <div className="flex gap-2">
                            <Link href="/pfmea/revision" className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors">
                                결재 현황 →
                            </Link>
                            <Link href="/pfmea/ap-improvement" className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors">
                                AP 개선 현황 →
                            </Link>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className={tableHeaderStyle} onClick={() => toggleSort('no')}>NO{sortIcon('no')}</th>
                                    <th className={tableHeaderStyle} onClick={() => toggleSort('type')}>구분{sortIcon('type')}</th>
                                    <th className={tableHeaderStyle} onClick={() => toggleSort('id')}>프로젝트ID{sortIcon('id')}</th>
                                    <th className={tableHeaderStyle} onClick={() => toggleSort('name')}>프로젝트명{sortIcon('name')}</th>
                                    <th className={tableHeaderStyle} onClick={() => toggleSort('lead')}>책임자{sortIcon('lead')}</th>
                                    <th className={tableHeaderStyle} onClick={() => toggleSort('client')}>고객사{sortIcon('client')}</th>
                                    <th className={tableHeaderStyle} onClick={() => toggleSort('start')}>시작{sortIcon('start')}</th>
                                    <th className={tableHeaderStyle} onClick={() => toggleSort('end')}>종료{sortIcon('end')}</th>
                                    <th className={tableHeaderStyle}>담당자</th>
                                    <th className={tableHeaderStyle}>검토자</th>
                                    <th className={tableHeaderStyle}>승인자</th>
                                    <th className={tableHeaderStyle} onClick={() => toggleSort('status')}>상태{sortIcon('status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={12} className={`${tableCellStyle} text-center py-8`}>
                                            데이터 로딩 중...
                                        </td>
                                    </tr>
                                ) : filteredAndSortedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className={`${tableCellStyle} text-center py-8 text-gray-400`}>
                                            {statusFilter === 'all' ? '등록된 업무가 없습니다' : '해당 상태의 업무가 없습니다'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSortedData.map((row) => {
                                        const createBadge = getApprovalBadge(row.createStatus || '-');
                                        const reviewBadge = getApprovalBadge(row.reviewStatus || '-');
                                        const approveBadge = getApprovalBadge(row.approveStatus || '-');
                                        return (
                                            <tr key={`${row.type}-${row.id}`} className="hover:bg-slate-50 transition-colors">
                                                <td className={tableCellStyle}>{row.no}</td>
                                                <td className={tableCellStyle}>
                                                    <span className="font-bold text-indigo-700">{row.type}</span>
                                                </td>
                                                <td className={tableCellStyle}>{row.id}</td>
                                                <td className={`${tableCellStyle} text-left px-4 font-semibold`}>
                                                    <button
                                                        onClick={() => handleNavigate(row.type, row.id)}
                                                        className="hover:underline text-blue-700"
                                                    >
                                                        {row.name}
                                                    </button>
                                                </td>
                                                <td className={tableCellStyle}>{row.lead}</td>
                                                <td className={tableCellStyle}>{row.client}</td>
                                                <td className={tableCellStyle}>{row.start}</td>
                                                <td className={tableCellStyle}>{row.end}</td>
                                                {/* 결재 진행상황: 담당자/검토자/승인자 */}
                                                <td className={tableCellStyle}>
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className="text-[10px] text-gray-500 truncate max-w-[60px]">{row.createName || '-'}</span>
                                                        <span className={`px-1.5 py-0 rounded text-[9px] font-bold ${createBadge.color}`}>
                                                            {createBadge.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={tableCellStyle}>
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className="text-[10px] text-gray-500 truncate max-w-[60px]">{row.reviewName || '-'}</span>
                                                        <span className={`px-1.5 py-0 rounded text-[9px] font-bold ${reviewBadge.color}`}>
                                                            {reviewBadge.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={tableCellStyle}>
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className="text-[10px] text-gray-500 truncate max-w-[60px]">{row.approveName || '-'}</span>
                                                        <span className={`px-1.5 py-0 rounded text-[9px] font-bold ${approveBadge.color}`}>
                                                            {approveBadge.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={tableCellStyle}>
                                                    <span className={`px-2 py-1 rounded text-[11px] font-bold border ${getStatusColor(getDisplayStatus(row.status, row.end))}`}>
                                                        {getDisplayStatus(row.status, row.end)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-slate-400 text-[11px] font-medium">
                    <p>© 2026 FMEA Management System - MyJob Dashboard</p>
                </div>
            </div>
        </FixedLayout>
    );
}
