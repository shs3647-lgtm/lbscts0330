/**
 * @file /src/app/approval/approver-portal/page.tsx
 * @description 상위 결재자를 위한 결재 현황 포털 (실데이터 연동)
 * @fixed 2026-03-12 — 하드코딩 샘플 → /api/myjob/jobs 실데이터 연동
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FixedLayout, PFMEATopNav } from '@/components/layout';

interface JobItem {
    no: number;
    type: string;
    id: string;
    name: string;
    lead: string;
    client: string;
    start: string;
    end: string;
    status: string;
    createName: string;
    createStatus: string;
    reviewName: string;
    reviewStatus: string;
    approveName: string;
    approveStatus: string;
}

export default function ApproverPortalPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<JobItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/myjob/jobs');
                const data = await res.json();
                if (data.success && data.jobs) {
                    setJobs(data.jobs);
                }
            } catch (err) {
                console.error('[결재현황] 데이터 로드 실패:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const tableHeaderStyle = "bg-slate-100 p-2 border border-slate-300 text-[12px] font-bold text-slate-700 text-center";
    const tableCellStyle = "p-2 border border-slate-200 text-[12px] text-slate-600 text-center";

    const handleNavigate = (type: string, id: string) => {
        if (!id || id === '-') return;
        let path = '/';
        switch (type.toUpperCase()) {
            case 'PFMEA': path = `/pfmea/revision?id=${id}`; break;
            case 'CP': path = `/control-plan/revision?cpNo=${id}`; break;
            case 'PFD': path = `/pfd/revision?pfdNo=${id}`; break;
            default: path = '/welcomeboard';
        }
        router.push(path);
    };

    const counts = {
        pending: jobs.filter(j => j.status === '진행중').length,
        delayed: jobs.filter(j => j.status === '지연').length,
        done: jobs.filter(j => j.status === '완료').length,
    };

    const getStatusBadge = (status: string) => {
        if (status === '승인') return 'bg-green-100 text-green-700';
        if (status === '상신' || status === '진행') return 'bg-blue-100 text-blue-700';
        if (status === '반려') return 'bg-red-100 text-red-700';
        return 'bg-slate-100 text-slate-600';
    };

    return (
        <FixedLayout
            topNav={<PFMEATopNav />}
            showSidebar={true}
            contentPadding="p-6"
            bgColor="#f8fafc"
        >
            <div className="relative min-h-screen">
                <div className="flex items-center justify-between mb-8 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-black text-[#00587a] flex items-center gap-2">
                            <span className="text-3xl">💼</span> MyJob Portal
                        </h1>
                        <p className="text-[12px] text-slate-500 font-medium ml-10">나의 업무 및 프로젝트 결재 현황을 통합 관리합니다.</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[12px] font-bold border border-blue-100 shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            진행 {counts.pending}건
                        </div>
                        <div className="px-4 py-1.5 bg-red-50 text-red-700 rounded-lg text-[12px] font-bold border border-red-100 shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                            지연 {counts.delayed}건
                        </div>
                        <div className="px-4 py-1.5 bg-green-50 text-green-700 rounded-lg text-[12px] font-bold border border-green-100 shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            완료 {counts.done}건
                        </div>
                    </div>
                </div>

                <div className="space-y-8 max-w-[1600px] mx-auto">
                    {/* 1. 결재현황 */}
                    <section className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-[#00587a] to-[#007a9e] text-white flex justify-between items-center">
                            <h2 className="font-bold text-[14px]">1. 결재현황 <span className="text-[12px] font-normal opacity-80 ml-2">대상: 진행-{counts.pending}건, 지연-{counts.delayed}건, 완료-{counts.done}건</span></h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className={tableHeaderStyle}>NO</th>
                                        <th className={tableHeaderStyle}>구분</th>
                                        <th className={tableHeaderStyle}>프로젝트ID</th>
                                        <th className={tableHeaderStyle}>프로젝트명</th>
                                        <th className={tableHeaderStyle}>책임자</th>
                                        <th className={tableHeaderStyle}>고객사</th>
                                        <th className={tableHeaderStyle}>시작</th>
                                        <th className={tableHeaderStyle}>종료</th>
                                        <th className={tableHeaderStyle}>작성</th>
                                        <th className={tableHeaderStyle}>검토</th>
                                        <th className={tableHeaderStyle}>승인</th>
                                        <th className={tableHeaderStyle}>상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={12} className={`${tableCellStyle} py-8`}>데이터 로딩 중...</td></tr>
                                    ) : jobs.length === 0 ? (
                                        <tr><td colSpan={12} className={`${tableCellStyle} py-8 text-slate-400`}>등록된 프로젝트가 없습니다.</td></tr>
                                    ) : jobs.map((row) => (
                                        <tr key={`${row.type}-${row.id}`} className="hover:bg-slate-50 transition-colors">
                                            <td className={tableCellStyle}>{row.no}</td>
                                            <td className={tableCellStyle}>{row.type}</td>
                                            <td className={tableCellStyle}>{row.id}</td>
                                            <td className={`${tableCellStyle} text-left px-4 font-bold`}>
                                                <button onClick={() => handleNavigate(row.type, row.id)} className="hover:underline text-blue-700">
                                                    {row.name}
                                                </button>
                                            </td>
                                            <td className={tableCellStyle}>{row.lead}</td>
                                            <td className={tableCellStyle}>{row.client}</td>
                                            <td className={tableCellStyle}>{row.start}</td>
                                            <td className={tableCellStyle}>{row.end}</td>
                                            <td className={tableCellStyle}>
                                                {row.createStatus && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(row.createStatus)}`}>
                                                        {row.createStatus}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={tableCellStyle}>
                                                {row.reviewStatus && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(row.reviewStatus)}`}>
                                                        {row.reviewStatus}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={tableCellStyle}>
                                                {row.approveStatus && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(row.approveStatus)}`}>
                                                        {row.approveStatus}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={tableCellStyle}>
                                                <span className={`font-bold ${row.status === '진행중' ? 'text-blue-500' : row.status === '지연' ? 'text-red-500' : row.status === '완료' ? 'text-green-500' : ''}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 2. AP 개선대상 진행현황 */}
                    <section className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white">
                            <h2 className="font-bold text-[14px]">2. AP 개선대상 진행현황</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className={tableHeaderStyle}>NO</th>
                                        <th className={tableHeaderStyle}>구분</th>
                                        <th className={tableHeaderStyle}>프로젝트ID</th>
                                        <th className={tableHeaderStyle}>프로젝트명</th>
                                        <th className={tableHeaderStyle}>책임자</th>
                                        <th className={tableHeaderStyle}>고객사</th>
                                        <th className={tableHeaderStyle}>상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={7} className={`${tableCellStyle} py-8`}>데이터 로딩 중...</td></tr>
                                    ) : jobs.filter(j => j.type === 'PFMEA').length === 0 ? (
                                        <tr><td colSpan={7} className={`${tableCellStyle} py-8 text-slate-400`}>등록된 PFMEA 프로젝트가 없습니다.</td></tr>
                                    ) : jobs.filter(j => j.type === 'PFMEA').map((row) => (
                                        <tr key={`ap-${row.id}`} className="hover:bg-slate-50 transition-colors">
                                            <td className={tableCellStyle}>{row.no}</td>
                                            <td className={tableCellStyle}>{row.type}</td>
                                            <td className={tableCellStyle}>{row.id}</td>
                                            <td className={`${tableCellStyle} text-left px-4 font-bold`}>
                                                <button onClick={() => handleNavigate(row.type, row.id)} className="hover:underline text-blue-700">
                                                    {row.name}
                                                </button>
                                            </td>
                                            <td className={tableCellStyle}>{row.lead}</td>
                                            <td className={tableCellStyle}>{row.client}</td>
                                            <td className={tableCellStyle}>
                                                <span className={`font-bold ${row.status === '진행중' ? 'text-blue-500' : row.status === '지연' ? 'text-red-500' : 'text-green-500'}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <div className="mt-16 text-center text-slate-400 text-[11px] font-medium border-t border-slate-100 pt-8 pb-12">
                    <p>&copy; 2026 FMEA Management System MyJob Integrated Dashboard</p>
                    <p className="mt-1 text-slate-300">Smart Quality Intelligence Platform</p>
                </div>
            </div>
        </FixedLayout>
    );
}
