/**
 * @file page.tsx
 * @description Control Plan 대시보드 페이지 - 실제 데이터 연동
 * @version 1.0.0
 * @created 2026-03-08
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from '@/lib/locale';
import { SidebarRouter } from '@/components/layout/SidebarRouter';
import CPTopNav from '@/components/layout/CPTopNav';

// recharts 번들을 lazy-load
const CpDashboardCharts = dynamic(
    () => import('./CpDashboardCharts'),
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
interface CpData {
    id: string;
    cpNo: string;
    subject?: string;
    customerName?: string;
    cpType?: string;
    confidentialityLevel?: string;
    cpResponsibleName?: string;
    processResponsibility?: string;
    fmeaId?: string | null;
    linkedPfdNo?: string | null;
    parentApqpNo?: string | null;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    _count?: {
        cftMembers: number;
        processes: number;
    };
}

interface StepProgress {
    name: string;
    count: number;
    color: string;
}

// CP 종류별 라벨과 색상 (teal 계열)
const CP_TYPE_LABELS = [
    { type: 'P', label: 'Prototype', color: '#14b8a6' },
    { type: 'L', label: 'Pre-Launch', color: '#0d9488' },
    { type: 'R', label: 'Production', color: '#0f766e' },
];

// 상태 색상
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

export default function CPDashboardPage() {
    const { t } = useLocale();
    const [cpList, setCpList] = useState<CpData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    // 데이터 로드
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/control-plan');
            const result = await response.json();

            if (result.success && result.data) {
                setCpList(result.data);
            } else {
                setCpList([]);
            }
        } catch (error) {
            console.error('[CP Dashboard] 데이터 로드 실패:', error);
            setCpList([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        setIsMounted(true);
        loadData();
    }, [loadData]);

    // 통계 계산
    const totalCPs = cpList.length;
    const draftCPs = cpList.filter(cp => cp.status === 'draft').length;
    const activeCPs = cpList.filter(cp => cp.status !== 'draft' && cp.status !== 'archived').length;
    const totalProcesses = cpList.reduce((sum, cp) => sum + (cp._count?.processes || 0), 0);

    // CP 종류별 분포 (파이 차트용)
    const typePieData = CP_TYPE_LABELS.map(({ type, label, color }) => ({
        name: label,
        value: cpList.filter(cp => (cp.cpType || 'P').toUpperCase() === type).length,
        color,
    })).filter(d => d.value > 0);

    // 기밀수준별 분포 (바 차트용)
    const confidentialityMap = new Map<string, number>();
    cpList.forEach(cp => {
        const level = cp.confidentialityLevel || '미지정';
        confidentialityMap.set(level, (confidentialityMap.get(level) || 0) + 1);
    });
    const CONF_COLORS = ['#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'];
    const confidentialityData: StepProgress[] = Array.from(confidentialityMap.entries()).map(([name, count], idx) => ({
        name,
        count,
        color: CONF_COLORS[idx % CONF_COLORS.length],
    }));

    // 연동 현황 계산
    const linkedToFmea = cpList.filter(cp => cp.fmeaId).length;
    const linkedToPfd = cpList.filter(cp => cp.linkedPfdNo).length;
    const linkedToApqp = cpList.filter(cp => cp.parentApqpNo).length;

    const linkageData = [
        { name: 'FMEA 연동', value: linkedToFmea, max: totalCPs },
        { name: 'PFD 연동', value: linkedToPfd, max: totalCPs },
        { name: 'APQP 연동', value: linkedToApqp, max: totalCPs },
    ];

    if (!isMounted) {
        return null;
    }

    return (
        <>
            <SidebarRouter />
            <CPTopNav />

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
                            📊 {t('CP 대시보드(Dashboard)')}
                            {isLoading && <span className="text-sm text-teal-400 animate-pulse">{t('로딩 중...')}</span>}
                        </h1>
                        <p className="text-gray-400 mt-1">{t('Control Plan 현황 및 분석 데이터')}</p>
                    </div>
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                    >
                        🔄 {t('새로고침(Refresh)')}
                    </button>
                </div>

                {/* 통계 카드 */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    <StatCard title={t('총 CP(Total)')} value={totalCPs} color="#14b8a6" icon="📋" />
                    <StatCard title={t('작성중(Draft)')} value={draftCPs} color="#eab308" icon="✏️" />
                    <StatCard title={t('활성(Active)')} value={activeCPs} color="#22c55e" icon="✅" />
                    <StatCard title={t('총 공정수(Process)')} value={totalProcesses} color="#3b82f6" icon="⚙️" />
                </div>

                {/* 차트 영역 */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <CpDashboardCharts
                        typePieData={typePieData}
                        confidentialityData={confidentialityData}
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
                                                background: 'linear-gradient(90deg, #14b8a6, #0d9488)'
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
                                { label: t('CP 등록(Register)'), href: '/control-plan/register', icon: '➕', color: '#14b8a6' },
                                { label: t('CP 리스트(List)'), href: '/control-plan/list', icon: '📋', color: '#10b981' },
                                { label: t('워크시트(Worksheet)'), href: '/control-plan/worksheet', icon: '📝', color: '#0d9488' },
                                { label: t('기초정보(Import)'), href: '/control-plan/import', icon: '📥', color: '#0f766e' },
                                { label: t('개정관리(Revision)'), href: '/control-plan/revision', icon: '📑', color: '#115e59' },
                                { label: t('Family CP'), href: '/control-plan/family', icon: '👨‍👩‍👧', color: '#134e4a' },
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

                {/* 최근 CP 테이블 */}
                <div
                    className="mt-5 rounded-2xl p-5 border border-gray-700"
                    style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                >
                    <h2 className="text-lg font-semibold text-white mb-4">📋 {t('최근 Control Plan')}</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left p-3 text-gray-400 font-medium">CP ID</th>
                                    <th className="text-left p-3 text-gray-400 font-medium">{t('CP명(Subject)')}</th>
                                    <th className="text-left p-3 text-gray-400 font-medium">{t('고객사(Customer)')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('종류(Type)')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('공정수(Process)')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('FMEA 연동')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('액션(Action)')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cpList.slice(0, 5).map((cp) => (
                                    <tr key={cp.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="p-3 text-teal-400 font-mono">{cp.cpNo}</td>
                                        <td className="p-3 text-white">{cp.subject || '-'}</td>
                                        <td className="p-3 text-gray-300">{cp.customerName || '-'}</td>
                                        <td className="p-3 text-center">
                                            <span
                                                className="px-2 py-1 rounded text-xs font-semibold"
                                                style={{
                                                    backgroundColor: '#14b8a630',
                                                    color: '#14b8a6'
                                                }}
                                            >
                                                {cp.cpType === 'L' ? 'Pre-Launch' : cp.cpType === 'R' ? 'Production' : 'Prototype'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center text-gray-300">{cp._count?.processes || 0}</td>
                                        <td className="p-3 text-center">
                                            {cp.fmeaId ?
                                                <span className="text-teal-400">✓ {cp.fmeaId}</span> :
                                                <span className="text-gray-500">-</span>
                                            }
                                        </td>
                                        <td className="p-3 text-center">
                                            <a
                                                href={`/control-plan/worksheet?cpNo=${cp.cpNo}`}
                                                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded transition-colors"
                                            >
                                                {t('열기(Open)')}
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                                {cpList.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500">
                                            {t('등록된 Control Plan이 없습니다.')}
                                            <a href="/control-plan/register" className="text-teal-400 ml-2 hover:underline">{t('새 CP 등록')} →</a>
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
