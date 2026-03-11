/**
 * @file page.tsx
 * @description PFD 대시보드 페이지 - 실제 데이터 연동
 * @version 1.0.0
 * @created 2026-03-08
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from '@/lib/locale';
import { SidebarRouter } from '@/components/layout/SidebarRouter';
import PFDTopNav from '@/components/layout/PFDTopNav';

// recharts lazy-load
const PfdDashboardCharts = dynamic(
    () => import('./PfdDashboardCharts'),
    {
        ssr: false,
        loading: () => (
            <>
                <div className="rounded-xl p-3 border border-gray-700 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', minHeight: 200 }}>
                    <span className="text-gray-400 text-sm">차트 로딩 중...</span>
                </div>
                <div className="col-span-2 rounded-xl p-3 border border-gray-700 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', minHeight: 200 }}>
                    <span className="text-gray-400 text-sm">차트 로딩 중...</span>
                </div>
            </>
        )
    }
);

// 타입 정의
interface PfdData {
    id: string;
    pfdNo: string;
    subject?: string;
    partName?: string;
    customerName?: string;
    companyName?: string;
    processOwner?: string;
    fmeaId?: string | null;
    cpNo?: string | null;
    apqpProjectId?: string | null;
    linkedCpNos?: string[];
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    _count?: {
        items: number;
    };
}

interface ChartItem {
    name: string;
    count: number;
    color: string;
}

// 보라색/바이올렛 계열 색상 (PFD 테마)
const STATUS_COLORS = {
    active: '#22c55e',
    draft: '#eab308',
    archived: '#6b7280',
};

// 통계 카드 컴포넌트
function StatCard({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) {
    return (
        <div
            className="rounded-lg p-3 border transition-all duration-300 hover:scale-105 cursor-pointer"
            style={{
                background: `linear-gradient(135deg, ${color}15 0%, ${color}30 100%)`,
                borderColor: `${color}50`
            }}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-300 text-xs font-medium">{title}</p>
                    <p className="text-xl font-bold text-white mt-0.5">{value}</p>
                </div>
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${color}30` }}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default function PFDDashboardPage() {
    const { t } = useLocale();
    const [pfdList, setPfdList] = useState<PfdData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/pfd');
            const result = await response.json();

            if (result.success && result.data) {
                setPfdList(result.data);
            } else {
                setPfdList([]);
            }
        } catch (error) {
            console.error('[PFD Dashboard] 데이터 로드 실패:', error);
            setPfdList([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        setIsMounted(true);
        loadData();
    }, [loadData]);

    // 통계 계산
    const totalPFDs = pfdList.length;
    const draftPFDs = pfdList.filter(p => p.status === 'draft').length;
    const activePFDs = pfdList.filter(p => p.status !== 'draft' && p.status !== 'archived').length;
    const totalItems = pfdList.reduce((sum, p) => sum + (p._count?.items || 0), 0);

    // 상태별 분포 (파이 차트)
    const statusPieData = [
        { name: '활성(Active)', value: activePFDs, color: STATUS_COLORS.active },
        { name: '작성중(Draft)', value: draftPFDs, color: STATUS_COLORS.draft },
    ].filter(d => d.value > 0);

    // 공정 아이템 수 분포 (바 차트) — 공정수 구간별 PFD 수
    const itemRanges = [
        { label: '0건', min: 0, max: 0, color: '#8b5cf6' },
        { label: '1~10건', min: 1, max: 10, color: '#7c3aed' },
        { label: '11~30건', min: 11, max: 30, color: '#6d28d9' },
        { label: '31~50건', min: 31, max: 50, color: '#5b21b6' },
        { label: '51건+', min: 51, max: Infinity, color: '#4c1d95' },
    ];
    const itemDistribution: ChartItem[] = itemRanges.map(({ label, min, max, color }) => ({
        name: label,
        count: pfdList.filter(p => {
            const cnt = p._count?.items || 0;
            return cnt >= min && cnt <= max;
        }).length,
        color,
    }));

    // 연동 현황
    const linkedToFmea = pfdList.filter(p => p.fmeaId).length;
    const linkedToCp = pfdList.filter(p => {
        const cpNos = p.linkedCpNos;
        return cpNos && Array.isArray(cpNos) && cpNos.length > 0;
    }).length;
    const linkedToApqp = pfdList.filter(p => p.apqpProjectId).length;

    const linkageData = [
        { name: 'FMEA 연동', value: linkedToFmea, max: totalPFDs },
        { name: 'CP 연동', value: linkedToCp, max: totalPFDs },
        { name: 'APQP 연동', value: linkedToApqp, max: totalPFDs },
    ];

    if (!isMounted) {
        return null;
    }

    return (
        <>
            <SidebarRouter />
            <PFDTopNav />

            <div
                className="fixed top-9 left-[53px] right-0 bottom-0 overflow-auto"
                style={{
                    background: 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #0d1b2a 100%)',
                    padding: '12px'
                }}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            📊 {t('PFD 대시보드(Dashboard)')}
                            {isLoading && <span className="text-sm text-violet-400 animate-pulse">{t('로딩 중...')}</span>}
                        </h1>
                        <p className="text-gray-400 mt-1">{t('Process Flow Diagram 현황 및 분석 데이터')}</p>
                    </div>
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                    >
                        🔄 {t('새로고침(Refresh)')}
                    </button>
                </div>

                {/* 통계 카드 */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    <StatCard title={t('총 PFD(Total)')} value={totalPFDs} color="#8b5cf6" icon="📋" />
                    <StatCard title={t('작성중(Draft)')} value={draftPFDs} color="#eab308" icon="✏️" />
                    <StatCard title={t('활성(Active)')} value={activePFDs} color="#22c55e" icon="✅" />
                    <StatCard title={t('총 공정수(Items)')} value={totalItems} color="#6d28d9" icon="⚙️" />
                </div>

                {/* 차트 영역 */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <PfdDashboardCharts
                        statusPieData={statusPieData}
                        itemDistribution={itemDistribution}
                    />
                </div>

                {/* 하단 영역 */}
                <div className="grid grid-cols-2 gap-3">
                    {/* 연동 현황 */}
                    <div
                        className="rounded-xl p-3 border border-gray-700"
                        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                    >
                        <h2 className="text-sm font-semibold text-white mb-2">🔗 {t('모듈 연동 현황(Linkage)')}</h2>
                        <div className="space-y-2">
                            {linkageData.map((item) => (
                                <div key={item.name}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-300">{item.name}</span>
                                        <span className="text-sm text-gray-400">{item.value} / {item.max}</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-3">
                                        <div
                                            className="h-3 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${item.max > 0 ? (item.value / item.max) * 100 : 0}%`,
                                                background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 빠른 링크 */}
                    <div
                        className="rounded-xl p-3 border border-gray-700"
                        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                    >
                        <h2 className="text-sm font-semibold text-white mb-2">🚀 {t('빠른 작업(Quick Actions)')}</h2>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: t('PFD 등록(Register)'), href: '/pfd/register', icon: '➕', color: '#8b5cf6' },
                                { label: t('PFD 리스트(List)'), href: '/pfd/list', icon: '📋', color: '#7c3aed' },
                                { label: t('워크시트(Worksheet)'), href: '/pfd/worksheet', icon: '📝', color: '#6d28d9' },
                                { label: t('기초정보(Import)'), href: '/pfd/import', icon: '📥', color: '#5b21b6' },
                                { label: t('개정관리(Revision)'), href: '/pfd/revision', icon: '📑', color: '#4c1d95' },
                                { label: t('접속이력(Log)'), href: '/pfd/log', icon: '📊', color: '#3b0764' },
                            ].map((item) => (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-200 border border-gray-700 hover:border-gray-500 hover:scale-105"
                                >
                                    <span className="text-2xl mb-1">{item.icon}</span>
                                    <span className="text-xs text-gray-300 text-center">{item.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 최근 PFD 테이블 */}
                <div
                    className="mt-5 rounded-2xl p-5 border border-gray-700"
                    style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                >
                    <h2 className="text-lg font-semibold text-white mb-4">📋 {t('최근 PFD')}</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left p-3 text-gray-400 font-medium">PFD ID</th>
                                    <th className="text-left p-3 text-gray-400 font-medium">{t('PFD명(Subject)')}</th>
                                    <th className="text-left p-3 text-gray-400 font-medium">{t('고객사(Customer)')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('공정수(Items)')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('FMEA 연동')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('CP 연동')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('액션(Action)')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pfdList.slice(0, 5).map((pfd) => (
                                    <tr key={pfd.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="p-3 text-violet-400 font-mono">{pfd.pfdNo}</td>
                                        <td className="p-3 text-white">{pfd.subject || pfd.partName || '-'}</td>
                                        <td className="p-3 text-gray-300">{pfd.customerName || '-'}</td>
                                        <td className="p-3 text-center text-gray-300">{pfd._count?.items || 0}</td>
                                        <td className="p-3 text-center">
                                            {pfd.fmeaId ?
                                                <span className="text-violet-400">✓ {pfd.fmeaId}</span> :
                                                <span className="text-gray-500">-</span>
                                            }
                                        </td>
                                        <td className="p-3 text-center">
                                            {pfd.linkedCpNos && Array.isArray(pfd.linkedCpNos) && pfd.linkedCpNos.length > 0 ?
                                                <span className="text-teal-400">✓ {pfd.linkedCpNos[0]}</span> :
                                                <span className="text-gray-500">-</span>
                                            }
                                        </td>
                                        <td className="p-3 text-center">
                                            <a
                                                href={`/pfd/worksheet?pfdNo=${pfd.pfdNo}`}
                                                className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded transition-colors"
                                            >
                                                {t('열기(Open)')}
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                                {pfdList.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500">
                                            {t('등록된 PFD가 없습니다.')}
                                            <a href="/pfd/register" className="text-violet-400 ml-2 hover:underline">{t('새 PFD 등록')} →</a>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
