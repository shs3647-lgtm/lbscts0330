/**
 * @file /src/app/approval/approver-portal/page.tsx
 * @description 상위 결재자를 위한 간단 결재 메뉴 (프로젝트 결재 & FMEA 조회)
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FixedLayout, PFMEATopNav } from '@/components/layout';

export default function ApproverPortalPage() {
    const router = useRouter();

    const tableHeaderStyle = "bg-slate-100 p-2 border border-slate-300 text-[12px] font-bold text-slate-700 text-center";
    const tableCellStyle = "p-2 border border-slate-200 text-[12px] text-slate-600 text-center";

    // 프로젝트로 이동하는 핸들러
    const handleNavigate = (type: string, id: string) => {
        if (!id || id === '-') return;
        let path = '/';
        switch (type.toUpperCase()) {
            case 'PFMEA': path = '/pfmea/worksheet'; break;
            case 'CP': path = '/control-plan/worksheet'; break;
            case 'PFD': path = '/pfd/worksheet'; break;
            default: path = '/welcomeboard';
        }
        router.push(`${path}?id=${id}`);
    };

    return (
        <FixedLayout
            topNav={<PFMEATopNav />}
            showSidebar={true}
            contentPadding="p-6"
            bgColor="#f8fafc"
        >
            <div className="relative min-h-screen">
                {/* Header Section */}
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
                            진행 0건
                        </div>
                        <div className="px-4 py-1.5 bg-red-50 text-red-700 rounded-lg text-[12px] font-bold border border-red-100 shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                            지연 0건
                        </div>
                        <div className="px-4 py-1.5 bg-green-50 text-green-700 rounded-lg text-[12px] font-bold border border-green-100 shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            완료 0건
                        </div>
                    </div>
                </div>

                <div className="space-y-8 max-w-[1600px] mx-auto">
                    {/* 1. 결제현황 */}
                    <section className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-[#00587a] to-[#007a9e] text-white flex justify-between items-center">
                            <h2 className="font-bold text-[14px]">1. 결제현황 <span className="text-[12px] font-normal opacity-80 ml-2">대상: 진행-0건, 지연-0건, 완료-0건</span></h2>
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
                                        <th className={tableHeaderStyle}>결제단계</th>
                                        <th className={tableHeaderStyle}>결제상태</th>
                                        <th className={tableHeaderStyle}>비고</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { no: 1, type: 'PFMEA', id: 'PFM-2026-004', name: '배터리 팩 조립 공정', lead: '이영희', client: 'LG엔솔', start: '2026-01-10', end: '2026-04-15', step: '검토', status: '지연' },
                                        { no: 2, type: 'CP', id: 'CP-2026-021', name: '모터 코어 브라켓', lead: '박민수', client: '모비스', start: '2025-12-01', end: '2026-02-28', step: '승인', status: '완료' },
                                        { no: 3, type: 'PFD', id: '-', name: '-', lead: '-', client: '-', start: '-', end: '-', step: '-', status: '-' },
                                    ].map((row) => (
                                        <tr key={row.no} className="hover:bg-slate-50 transition-colors">
                                            <td className={tableCellStyle}>{row.no}</td>
                                            <td className={tableCellStyle}>{row.type}</td>
                                            <td className={tableCellStyle}>{row.id}</td>
                                            <td className={`${tableCellStyle} text-left px-4 font-bold color-[#00587a]`}>
                                                <button onClick={() => handleNavigate(row.type, row.id)} className="hover:underline text-blue-700">
                                                    {row.name}
                                                </button>
                                            </td>
                                            <td className={tableCellStyle}>{row.lead}</td>
                                            <td className={tableCellStyle}>{row.client}</td>
                                            <td className={tableCellStyle}>{row.start}</td>
                                            <td className={tableCellStyle}>{row.end}</td>
                                            <td className={tableCellStyle}>
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.step === '승인' ? 'bg-purple-100 text-purple-700' :
                                                    row.step === '검토' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {row.step}
                                                </span>
                                            </td>
                                            <td className={tableCellStyle}>
                                                <span className={`font-bold ${row.status === '진행중' ? 'text-blue-500' :
                                                    row.status === '지연' ? 'text-red-500' :
                                                        row.status === '완료' ? 'text-green-500' : ''
                                                    }`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className={tableCellStyle}>-</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 2. 프로젝트 진행현황 */}
                    <section className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-[#2c3e50] to-[#4ca1af] text-white">
                            <h2 className="font-bold text-[14px]">2. 프로젝트 진행현황</h2>
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
                                        <th className={tableHeaderStyle}>나의역할</th>
                                        <th className={tableHeaderStyle}>시작</th>
                                        <th className={tableHeaderStyle}>종료</th>
                                        <th className={tableHeaderStyle}>진행현황</th>
                                        <th className={tableHeaderStyle}>결제상태</th>
                                        <th className={tableHeaderStyle}>비고</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { no: 1, type: 'PFMEA', id: 'PFM-2026-004', name: '배터리 팩 조립 공정', lead: '이영희', role: '리더', start: '2026-01-10', end: '2026-04-15', progress: '2단계', status: '지연' },
                                        { no: 2, type: 'CP', id: 'CP-2026-021', name: '모터 코어 브라켓', lead: '박민수', role: 'PM', start: '2025-12-01', end: '2026-02-28', progress: '3단계', status: '완료' },
                                        { no: 3, type: 'PFD', id: '-', name: '-', lead: '-', role: '-', start: '-', end: '-', progress: '-', status: '-' },
                                    ].map((row) => (
                                        <tr key={row.no} className="hover:bg-slate-50 transition-colors">
                                            <td className={tableCellStyle}>{row.no}</td>
                                            <td className={tableCellStyle}>{row.type}</td>
                                            <td className={tableCellStyle}>{row.id}</td>
                                            <td className={`${tableCellStyle} text-left px-4 font-bold`}>
                                                <button onClick={() => handleNavigate(row.type, row.id)} className="hover:underline text-blue-700">
                                                    {row.name}
                                                </button>
                                            </td>
                                            <td className={tableCellStyle}>{row.lead}</td>
                                            <td className={tableCellStyle}>
                                                <span className="font-bold text-slate-800">{row.role}</span>
                                            </td>
                                            <td className={tableCellStyle}>{row.start}</td>
                                            <td className={tableCellStyle}>{row.end}</td>
                                            <td className={tableCellStyle}>{row.progress}</td>
                                            <td className={tableCellStyle}>
                                                <span className={`font-bold ${row.status === '진행중' ? 'text-blue-500' :
                                                    row.status === '지연' ? 'text-red-500' :
                                                        row.status === '완료' ? 'text-green-500' : ''
                                                    }`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className={tableCellStyle}>-</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 3. AP 개선대상 진행현황 */}
                    <section className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white">
                            <h2 className="font-bold text-[14px]">3. AP 개선대상 진행현황</h2>
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
                                        <th className={tableHeaderStyle}>나의역할</th>
                                        <th className={tableHeaderStyle}>개선대상건수</th>
                                        <th className={tableHeaderStyle}>완료건수</th>
                                        <th className={tableHeaderStyle}>진행건수</th>
                                        <th className={tableHeaderStyle}>지연건수</th>
                                        <th className={tableHeaderStyle}>비고</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { no: 1, type: 'PFMEA', id: 'PFM-2026-004', name: '배터리 팩 조립 공정', lead: '이영희', role: '리더', total: 8, done: 2, ing: 6, delay: 0 },
                                        { no: 2, type: 'CP', id: 'CP-2026-021', name: '모터 코어 브라켓', lead: '박민수', role: 'PM', total: 5, done: 5, ing: 0, delay: 0 },
                                        { no: 3, type: 'PFD', id: '-', name: '-', lead: '-', role: '-', total: '-', done: '-', ing: '-', delay: '-' },
                                    ].map((row) => (
                                        <tr key={row.no} className="hover:bg-slate-50 transition-colors">
                                            <td className={tableCellStyle}>{row.no}</td>
                                            <td className={tableCellStyle}>{row.type}</td>
                                            <td className={tableCellStyle}>{row.id}</td>
                                            <td className={`${tableCellStyle} text-left px-4 font-bold`}>
                                                <button onClick={() => handleNavigate(row.type, row.id)} className="hover:underline text-blue-700">
                                                    {row.name}
                                                </button>
                                            </td>
                                            <td className={tableCellStyle}>{row.lead}</td>
                                            <td className={tableCellStyle}>{row.role}</td>
                                            <td className={`${tableCellStyle} font-bold text-slate-800`}>{row.total}</td>
                                            <td className={`${tableCellStyle} font-bold text-green-600`}>{row.done}</td>
                                            <td className={`${tableCellStyle} font-bold text-blue-600`}>{row.ing}</td>
                                            <td className={`${tableCellStyle} font-bold text-red-600`}>{row.delay}</td>
                                            <td className={tableCellStyle}>-</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* Footer Section */}
                <div className="mt-16 text-center text-slate-400 text-[11px] font-medium border-t border-slate-100 pt-8 pb-12">
                    <p>© 2026 FMEA Management System MyJob Integrated Dashboard</p>
                    <p className="mt-1 text-slate-300">Smart Quality Intelligence Platform</p>
                </div>
            </div>
        </FixedLayout>
    );
}
