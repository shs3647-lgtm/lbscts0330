/**
 * @file page.tsx
 * @description DB 통계 페이지 (테이블별 레코드 수, 용량)
 * @created 2026-01-26
 */

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { RefreshCw, BarChart3 } from 'lucide-react';
import { FixedLayout, AdminTopNav } from '@/components/layout';
import { AdminBackToHome } from '@/components/admin/AdminBackToHome';
import { useLocale } from '@/lib/locale';

interface TableStat {
    tableName: string;
    recordCount: number;
    lastUpdated?: string;
}

export default function DBStatsPage() {
    const { t } = useLocale();
    const [stats, setStats] = useState<TableStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);

    const loadStats = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/db-stats');
            const data = await res.json();
            if (data.success) {
                setStats(data.stats || []);
                setTotalRecords(data.stats?.reduce((sum: number, s: TableStat) => sum + s.recordCount, 0) || 0);
            }
        } catch (err) {
            console.error('통계 로드 실패:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const getBarWidth = (count: number) => {
        const max = Math.max(...stats.map(s => s.recordCount), 1);
        return Math.max((count / max) * 100, 2);
    };

    return (
        <FixedLayout topNav={<AdminTopNav />} showSidebar={true}>
        <div className="p-6 max-w-6xl mx-auto">
                <div className="mb-4">
                    <AdminBackToHome />
                </div>
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-orange-600" />
                            {t('DB 통계')}
                        </h1>
                        <p className="text-sm text-gray-600">{t('테이블별 레코드 수 및 데이터 현황')}</p>
                    </div>
                    <button
                        onClick={loadStats}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('새로고침')}
                    </button>
                </div>

                {/* 요약 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                        <div className="text-sm opacity-90">{t('총 테이블 수')}</div>
                        <div className="text-2xl font-bold">{stats.length}</div>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                        <div className="text-sm opacity-90">{t('총 레코드 수')}</div>
                        <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                        <div className="text-sm opacity-90">{t('상태')}</div>
                        <div className="text-2xl font-bold">{loading ? t('로딩 중...') : `✅ ${t('정상')}`}</div>
                    </div>
                </div>

                {/* 테이블 목록 */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-gray-700">#</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-700">{t('테이블명')}</th>
                                    <th className="px-4 py-3 text-right font-bold text-gray-700">{t('레코드 수')}</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-700">{t('분포')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                            로딩 중...
                                        </td>
                                    </tr>
                                ) : stats.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                            데이터가 없습니다.
                                        </td>
                                    </tr>
                                ) : stats.map((stat, idx) => (
                                    <tr key={stat.tableName} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                                        <td className="px-4 py-3 font-mono text-blue-600">{stat.tableName}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-800">
                                            {stat.recordCount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 w-1/3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
                                                        style={{ width: `${getBarWidth(stat.recordCount)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500 w-12 text-right">
                                                    {((stat.recordCount / totalRecords) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
        </div>
        </FixedLayout>
    );
}
