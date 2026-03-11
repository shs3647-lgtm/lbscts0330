/**
 * @file page.tsx
 * @description PFMEA 대시보드 페이지 - 실제 데이터 연동
 * @version 2.0.0
 * @created 2026-02-02
 * @updated 2026-02-02 실제 API 데이터 연동 최적화
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from '@/lib/locale';
import { SidebarRouter } from '@/components/layout/SidebarRouter';
import PFMEATopNav from '@/components/layout/PFMEATopNav';

// recharts 번들을 lazy-load (약 300KB+ 절감)
const PfmeaDashboardCharts = dynamic(
    () => import('./PfmeaDashboardCharts'),
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
interface ProjectData {
    id: string;
    step?: number;
    project?: {
        projectName?: string;
        customer?: string;
    };
    fmeaInfo?: {
        subject?: string;
        createdAt?: string;
        updatedAt?: string;
    };
    linkedCpNo?: string;
    linkedPfdNo?: string;
    parentApqpNo?: string;
}

interface StepProgress {
    name: string;
    count: number;
    color: string;
}

// 상수 - 파란색/청록색 계열
const STEP_LABELS = [
    { step: 1, label: '1단계: 계획 및 준비', color: '#60a5fa' },
    { step: 2, label: '2단계: 구조분석', color: '#3b82f6' },
    { step: 3, label: '3단계: 기능분석', color: '#2563eb' },
    { step: 4, label: '4단계: 고장분석', color: '#1d4ed8' },
    { step: 5, label: '5단계: 위험분석', color: '#0ea5e9' },
    { step: 6, label: '6단계: 최적화', color: '#06b6d4' },
    { step: 7, label: '7단계: 문서화', color: '#14b8a6' },
];

// 신호등 색상: G(초록), Y(노랑), R(연한 빨강)
const STATUS_COLORS = {
    완료: '#22c55e',      // Green
    진행중: '#eab308',    // Yellow
    지연: '#f87171',      // Light Red
};

// 통계 카드 컴포넌트 - 컴팩트
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

export default function PFMEADashboardPage() {
    const { t } = useLocale();
    const [projects, setProjects] = useState<ProjectData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    // 데이터 로드
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // PFMEA 프로젝트 목록 가져오기
            const response = await fetch('/api/fmea/projects?type=P');
            const result = await response.json();

            if (result.success && result.projects) {
                const pfmeaProjects = result.projects;
                setProjects(pfmeaProjects);
            } else {
                // ★ 온프레미스: fake 데이터 주입 금지 → 빈 목록 유지
                setProjects([]);
            }
        } catch (error) {
            console.error('[PFMEA Dashboard] 데이터 로드 실패:', error);
            // ★ 네트워크/DB 실패 시 빈 목록 (fake 데이터 금지)
            setProjects([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        setIsMounted(true);
        loadData();
    }, [loadData]);

    // 통계 계산
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => (p.step || 0) >= 7).length;
    const inProgressProjects = projects.filter(p => (p.step || 0) >= 3 && (p.step || 0) < 7).length;
    const delayedProjects = projects.filter(p => (p.step || 0) < 3).length;
    const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

    // 단계별 진행 현황 데이터
    const stepProgressData: StepProgress[] = STEP_LABELS.map(({ step, label, color }) => ({
        name: label.split(':')[0], // "1단계"
        count: projects.filter(p => (p.step || 1) === step).length,
        color,
    }));

    // 상태별 프로젝트 수 (파이 차트용)
    const statusPieData = [
        { name: '완료', value: completedProjects, color: STATUS_COLORS.완료 },
        { name: '진행중', value: inProgressProjects, color: STATUS_COLORS.진행중 },
        { name: '지연', value: delayedProjects, color: STATUS_COLORS.지연 },
    ].filter(d => d.value > 0);

    // 연동 현황 계산
    const linkedToCp = projects.filter(p => p.linkedCpNo).length;
    const linkedToPfd = projects.filter(p => p.linkedPfdNo).length;
    const linkedToApqp = projects.filter(p => p.parentApqpNo).length;

    const linkageData = [
        { name: 'CP 연동', value: linkedToCp, max: totalProjects },
        { name: 'PFD 연동', value: linkedToPfd, max: totalProjects },
        { name: 'APQP 연동', value: linkedToApqp, max: totalProjects },
    ];

    if (!isMounted) {
        return null;
    }

    return (
        <>
            {/* 사이드바 */}
            <SidebarRouter />

            {/* 상단 네비게이션 */}
            <PFMEATopNav />

            {/* 메인 레이아웃 */}
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
                            📊 {t('PFMEA 대시보드')}
                            {isLoading && <span className="text-sm text-blue-400 animate-pulse">{t('로딩 중...')}</span>}
                        </h1>
                        <p className="text-gray-400 mt-1">{t('프로젝트 현황 및 분석 데이터')}</p>
                    </div>
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        🔄 {t('새로고침')}
                    </button>
                </div>

                {/* 통계 카드 - 파란색 테마 + 신호등 색상 */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    <StatCard title={t('총 프로젝트')} value={totalProjects} color="#3b82f6" icon="📋" />
                    <StatCard title={t('완료')} value={completedProjects} color="#22c55e" icon="✅" />
                    <StatCard title={t('진행중')} value={inProgressProjects} color="#eab308" icon="🔄" />
                    <StatCard title={t('지연')} value={delayedProjects} color="#f87171" icon="⏰" />
                </div>

                {/* 메인 차트 영역 (recharts lazy-loaded) */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <PfmeaDashboardCharts
                        statusPieData={statusPieData}
                        stepProgressData={stepProgressData}
                    />
                </div>

                {/* 하단 영역 */}
                <div className="grid grid-cols-2 gap-3">
                    {/* 연동 현황 */}
                    <div
                        className="rounded-xl p-3 border border-gray-700"
                        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                    >
                        <h2 className="text-sm font-semibold text-white mb-2">🔗 {t('모듈 연동 현황')}</h2>
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
                                                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
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
                        <h2 className="text-sm font-semibold text-white mb-2">🚀 {t('빠른 작업')}</h2>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: t('프로젝트 등록'), href: '/pfmea/register', icon: '➕', color: '#3b82f6' },
                                { label: t('PFMEA 리스트'), href: '/pfmea/list', icon: '📋', color: '#10b981' },
                                { label: t('워크시트 작성'), href: '/pfmea/worksheet', icon: '📝', color: '#8b5cf6' },
                                { label: t('AP 개선관리'), href: '/pfmea/ap-improvement', icon: '🔧', color: '#f59e0b' },
                                { label: t('LLD(필터코드)'), href: '/pfmea/lld', icon: '📋', color: '#ef4444' },
                                { label: t('개정관리'), href: '/pfmea/revision', icon: '📑', color: '#06b6d4' },
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

                {/* 최근 프로젝트 테이블 */}
                <div
                    className="mt-5 rounded-2xl p-5 border border-gray-700"
                    style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                >
                    <h2 className="text-lg font-semibold text-white mb-4">📋 {t('최근 프로젝트')}</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left p-3 text-gray-400 font-medium">ID</th>
                                    <th className="text-left p-3 text-gray-400 font-medium">{t('프로젝트명')}</th>
                                    <th className="text-left p-3 text-gray-400 font-medium">{t('고객사')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('단계')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('CP 연동')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('PFD 연동')}</th>
                                    <th className="text-center p-3 text-gray-400 font-medium">{t('액션')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.slice(0, 5).map((project) => (
                                    <tr key={project.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="p-3 text-blue-400 font-mono">{project.id}</td>
                                        <td className="p-3 text-white">{project.fmeaInfo?.subject || project.project?.projectName || '-'}</td>
                                        <td className="p-3 text-gray-300">{project.project?.customer || '-'}</td>
                                        <td className="p-3 text-center">
                                            <span
                                                className="px-2 py-1 rounded text-xs font-semibold"
                                                style={{
                                                    backgroundColor: STEP_LABELS[(project.step || 1) - 1]?.color + '30',
                                                    color: STEP_LABELS[(project.step || 1) - 1]?.color
                                                }}
                                            >
                                                {project.step || 1}{t('단계')}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            {project.linkedCpNo ?
                                                <span className="text-teal-400">✓ {project.linkedCpNo}</span> :
                                                <span className="text-gray-500">-</span>
                                            }
                                        </td>
                                        <td className="p-3 text-center">
                                            {project.linkedPfdNo ?
                                                <span className="text-violet-400">✓ {project.linkedPfdNo}</span> :
                                                <span className="text-gray-500">-</span>
                                            }
                                        </td>
                                        <td className="p-3 text-center">
                                            <a
                                                href={`/pfmea/worksheet?id=${project.id}`}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                                            >
                                                {t('열기')}
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                                {projects.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500">
                                            {t('등록된 PFMEA 프로젝트가 없습니다.')}
                                            <a href="/pfmea/register" className="text-blue-400 ml-2 hover:underline">{t('새 프로젝트 등록')} →</a>
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
